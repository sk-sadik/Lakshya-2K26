import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { Event } from '../models/Event';
import { Registration } from '../models/Registration';
import { Notification } from '../models/Notification';
import { SupportReport } from '../models/SupportReport';
import { AuthenticatedRequest, AuthUser } from '../middleware/auth';

// GET /api/admin/users
export async function getAllUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { role } = req.query;
    const filter: any = { isEmailVerified: true };
    if (role && role !== 'all') {
      filter.roles = role;
    }

    const users = await User.find(filter).sort({ createdAt: -1 });
    const events = await Event.find({});
    const registrations = await Registration.find({});

    // Attach coordinator and student registration metrics to each user
    const usersWithStats = users.map((u) => {
      const uJson = u.toJSON();
      const userEmail = (u.email || '').toLowerCase();
      const userIdStr = u._id ? u._id.toString() : '';

      // Find events coordinated by this user
      const managedEvents = events.filter((e) => {
        const coordId = e.coordinator ? e.coordinator.toString() : '';
        const coordEmail = (e.coordinatorEmail || '').toLowerCase();
        return coordId === userIdStr || (coordEmail && coordEmail === userEmail);
      });

      // Find registrations for events coordinated by this user
      const managedEventIds = new Set(managedEvents.map(e => (e._id ? e._id.toString() : '')));
      const managedEventCustomIds = new Set(managedEvents.map(e => e.customId).filter(Boolean));
      const eventRegistrations = registrations.filter((r) => {
        const regEvId = r.event ? r.event.toString() : (r.eventId || '');
        return managedEventIds.has(regEvId) || managedEventCustomIds.has(regEvId);
      });

      // Find student registrations submitted by this user
      const studentRegistrations = registrations.filter((r) => {
        const regStudentId = r.student ? r.student.toString() : (r.studentId || '');
        const regStudentEmail = (r.studentEmail || '').toLowerCase();
        return regStudentId === userIdStr || (regStudentEmail && regStudentEmail === userEmail);
      });

      return {
        ...uJson,
        managedEventsCount: managedEvents.length,
        managedEvents: managedEvents.map(e => ({
          id: e._id ? e._id.toString() : e.customId,
          eventName: e.eventName || e.title,
          department: e.department,
          registeredCount: e.registeredCount || 0,
          maxParticipants: e.maxParticipants || 100,
          status: e.status,
        })),
        coordinatorRegistrationsCount: eventRegistrations.length,
        studentRegistrationsCount: studentRegistrations.length,
      };
    });

    res.status(200).json({
      success: true,
      users: usersWithStats,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch users.' });
  }
}

// POST /api/admin/users (Add or Grant Access to User by Admin)
export async function addUserAdmin(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { name, email, password, role, roles, college, department, phone, rollNo, facultyId, designation, status } = req.body;

    if (!email) {
      res.status(400).json({ success: false, message: 'Email address is required.' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });

    // Determine target roles
    let targetRoles: string[] = [];
    if (Array.isArray(roles) && roles.length > 0) {
      targetRoles = [...new Set(roles)];
    } else if (role) {
      targetRoles = [role];
    } else {
      targetRoles = ['student'];
    }

    let user;
    if (existing) {
      // User already exists! DO NOT throw "mail already exist" alert. Gracefully merge/update roles
      if (Array.isArray(roles) && roles.length > 0) {
        existing.roles = targetRoles as any;
      } else {
        for (const r of targetRoles) {
          if (!existing.roles.includes(r as any)) {
            existing.roles.push(r as any);
          }
        }
      }

      if (name && name.trim()) existing.name = name.trim();
      if (college) existing.college = college;
      if (department) existing.department = department;
      if (phone !== undefined) existing.phone = phone;
      if (rollNo !== undefined) existing.rollNo = rollNo;
      if (facultyId !== undefined) existing.facultyId = facultyId;
      if (designation !== undefined) existing.designation = designation;
      if (status) existing.status = status;
      if (password && password.trim()) {
        const salt = await bcrypt.genSalt(10);
        existing.passwordHash = await bcrypt.hash(password.trim(), salt);
      }
      await existing.save();
      user = existing;
    } else {
      // Create new user with selected roles
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password || 'welcome123', salt);
      user = await User.create({
        name: name ? name.trim() : normalizedEmail.split('@')[0],
        email: normalizedEmail,
        passwordHash,
        roles: targetRoles as any,
        college: college || 'Lakireddy Bali Reddy College of Engineering (Autonomous)',
        department: department || 'cse',
        phone: phone || '',
        rollNo: rollNo || '',
        facultyId: facultyId || '',
        designation: designation || (targetRoles.includes('coordinator') ? 'Faculty Coordinator' : undefined),
        status: status || 'active',
        isEmailVerified: true, // Accounts created directly by Admin are pre-verified
      });
    }

    res.status(existing ? 200 : 201).json({
      success: true,
      message: existing 
        ? `Access privileges updated for ${normalizedEmail}. Roles: ${user.roles.join(', ')}` 
        : `User account created successfully for ${normalizedEmail}.`,
      user: (user as any).toJSON(),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to save user access.' });
  }
}

// PUT /api/admin/users/:id
export async function updateUserAdmin(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    if (updates.password || updates.newPassword) {
      const pwd = updates.password || updates.newPassword;
      const salt = await bcrypt.genSalt(10);
      updates.passwordHash = await bcrypt.hash(pwd, salt);
      delete updates.password;
      delete updates.newPassword;
    }

    if (updates.role && !updates.roles) {
      updates.roles = [updates.role];
    }

    // Gracefully handle email changes without duplicate key errors
    if (updates.email) {
      const normalizedEmail = updates.email.toLowerCase().trim();
      const duplicate = await User.findOne({ email: normalizedEmail, _id: { $ne: id } });
      if (duplicate) {
        if (updates.roles && Array.isArray(updates.roles)) {
          for (const r of updates.roles) {
            if (!duplicate.roles.includes(r)) duplicate.roles.push(r);
          }
          await duplicate.save();
        }
        res.status(200).json({
          success: true,
          message: `Access privileges merged into existing account ${normalizedEmail}.`,
          user: duplicate.toJSON(),
        });
        return;
      }
      updates.email = normalizedEmail;
    }

    const updated = await User.findByIdAndUpdate(id, updates, { new: true });
    if (!updated) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'User updated successfully.',
      user: updated.toJSON(),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to update user.' });
  }
}

// DELETE /api/admin/users/:id
export async function deleteUserAdmin(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const primaryAdmins = ['sksadik45264@gmail.com', 'admin@lbrce.ac.in'];

    const target = await User.findById(id);
    if (!target) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    const targetEmail = (target.email || '').toLowerCase();
    const roles = Array.isArray(target.roles) ? target.roles.map(String) : [target.role].filter(Boolean);
    if (targetEmail === req.user?.email?.toLowerCase()) {
      res.status(400).json({ success: false, message: 'You cannot delete your own account.' });
      return;
    }
    if (primaryAdmins.includes(targetEmail) || roles.includes('admin')) {
      res.status(400).json({ success: false, message: 'Cannot delete admin accounts. Remove admin access first or keep the account.' });
      return;
    }

    await User.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: 'User removed.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to delete user.' });
  }
}

// GET /api/admin/registrations
export async function getAllRegistrationsAdmin(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { eventId, status, paymentStatus } = req.query;
    const filter: any = {};

    if (eventId && eventId !== 'all') {
      filter.$or = [{ event: eventId }, { eventId }];
    }
    if (status && status !== 'all') {
      filter.registrationStatus = status.toString().toUpperCase();
    }
    if (paymentStatus && paymentStatus !== 'all') {
      filter.paymentStatus = paymentStatus.toString().toUpperCase();
    }

    // Coordinators (non-admin) only see registrations of events they own.
    const userRoles = (req.user as AuthUser)?.roles || [];
    if (!userRoles.includes('admin')) {
      const userEmail = ((req.user as AuthUser)?.email || '').toLowerCase().trim();
      const ownEvents = await Event.find({
        $or: [{ coordinator: (req.user as AuthUser)?._id }, { coordinatorEmail: userEmail }],
      }).select('_id customId');
      const ownIds = new Set<string>();
      for (const e of ownEvents) {
        ownIds.add(e._id.toString());
        if ((e as any).customId) ownIds.add((e as any).customId);
      }
      if (eventId && eventId !== 'all') {
        // Resolve the requested event and confirm ownership (no ID probing).
        const idStr = String(eventId);
        const idConds: any[] = [{ customId: eventId }];
        if (idStr.match(/^[0-9a-fA-F]{24}$/)) idConds.push({ _id: eventId });
        const requested: any = await Event.findOne({ $or: idConds }).select('_id');
        if (!requested || !ownIds.has(requested._id.toString())) {
          res.status(403).json({ success: false, message: 'Forbidden. You can only view registrations of your own events.' });
          return;
        }
        filter.$or = [{ event: requested._id }, { eventId: requested._id.toString() }];
      } else {
        filter.$or = [
          { eventId: { $in: Array.from(ownIds) } },
          { event: { $in: Array.from(ownIds).filter((k) => k.match(/^[0-9a-fA-F]{24}$/)) } },
        ];
      }
    }

    const registrations = await Registration.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: registrations.length,
      registrations,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch registrations.' });
  }
}

// GET /api/admin/analytics — every number below is a live database aggregate.
// Registration-derived metrics (colleges, departments, events) use CONFIRMED
// registrations only, deduplicated per student where counting people.
export async function getSystemAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const totalUsers = await User.countDocuments();
    const totalStudents = await User.countDocuments({ roles: 'student' });
    const totalCoordinators = await User.countDocuments({ roles: 'coordinator' });
    const totalAdmins = await User.countDocuments({ roles: 'admin' });
    const totalEvents = await Event.countDocuments();
    const upcomingEvents = await Event.countDocuments({ status: 'upcoming' });
    const ongoingEvents = await Event.countDocuments({ status: 'ongoing' });
    const completedEvents = await Event.countDocuments({ status: 'completed' });
    const cancelledEvents = await Event.countDocuments({ status: 'cancelled' });
    const approvedEvents = await Event.countDocuments({ approvalStatus: 'approved' });
    const pendingEvents = await Event.countDocuments({ approvalStatus: 'pending' });
    const totalRegistrations = await Registration.countDocuments();
    const confirmedRegistrations = await Registration.countDocuments({ registrationStatus: 'CONFIRMED' });
    const pendingRegistrations = await Registration.countDocuments({ registrationStatus: 'PENDING' });
    const paidRegistrations = await Registration.countDocuments({ paymentStatus: 'PAID' });
    const checkedInRegistrations = await Registration.countDocuments({ checkedIn: true });

    const confirmedRegs = await Registration.find({ registrationStatus: 'CONFIRMED' }).select(
      'studentId studentEmail college department eventId eventName'
    );

    const isLbrceCollege = (college: any) =>
      /Lakireddy Bali Reddy|LBRCE/i.test((college || '').toString());
    // Unique students (one person in 3 events counts once as a participant,
    // but 3 times across event/department/college registration totals).
    const studentKey = (r: any) => String(r.studentId || r.studentEmail || '').toLowerCase();
    const uniqueStudents = new Set(confirmedRegs.map(studentKey));
    const lbrceRegs = confirmedRegs.filter((r) => isLbrceCollege(r.college));
    const otherRegs = confirmedRegs.filter((r) => !isLbrceCollege(r.college));
    const lbrceStudents = new Set(lbrceRegs.map(studentKey)).size;
    const otherCollegeStudents = new Set(otherRegs.map(studentKey)).size;

    const collegeMap = new Map<string, { fullName: string; count: number }>();
    for (const r of confirmedRegs) {
      const fullName = (r.college || 'Other Institution').toString().trim() || 'Other Institution';
      const entry = collegeMap.get(fullName) || { fullName, count: 0 };
      entry.count += 1;
      collegeMap.set(fullName, entry);
    }
    const collegeStats = Array.from(collegeMap.values())
      .map((c) => ({
        college: c.fullName.replace(' (Autonomous)', '').replace(', Vijayawada', '').replace(', Guntur', ''),
        fullName: c.fullName,
        count: c.count,
      }))
      .sort((a, b) => b.count - a.count);
    const participatingColleges = collegeStats.length;

    const deptMap = new Map<string, number>();
    for (const r of confirmedRegs) {
      const dept = ((r.department || 'other') as string).toUpperCase();
      deptMap.set(dept, (deptMap.get(dept) || 0) + 1);
    }
    const deptStats = Array.from(deptMap.entries())
      .map(([name, registrations]) => ({ name, registrations }))
      .sort((a, b) => b.registrations - a.registrations);

    const events = await Event.find({}).select('_id eventName department maxParticipants');
    const eventRegCounts = new Map<string, number>();
    for (const r of confirmedRegs) {
      const key = String((r as any).eventId || (r as any).event || '');
      if (key) eventRegCounts.set(key, (eventRegCounts.get(key) || 0) + 1);
    }
    const popularEvents = events
      .map((e: any) => ({
        id: e._id.toString(),
        title: e.eventName,
        department: e.department,
        capacity: e.maxParticipants,
        registrations: eventRegCounts.get(e._id.toString()) || 0,
      }))
      .sort((a, b) => b.registrations - a.registrations);

    const deptEventMap = new Map<string, number>();
    for (const e of events as any[]) {
      deptEventMap.set(String(e.department).toUpperCase(), (deptEventMap.get(String(e.department).toUpperCase()) || 0) + 1);
    }
    const deptWise: Record<string, number> = {};
    deptEventMap.forEach((v, k) => {
      deptWise[k] = v;
    });

    // Aggregate paid revenue
    const revenueAgg = await Registration.aggregate([
      { $match: { paymentStatus: 'PAID' } },
      { $group: { _id: null, totalRevenue: { $sum: '$paymentAmount' } } },
    ]);
    const totalRevenue = revenueAgg[0]?.totalRevenue || 0;

    res.status(200).json({
      success: true,
      analytics: {
        totalUsers,
        totalStudents,
        totalCoordinators,
        totalAdmins,
        lbrceStudents,
        otherCollegeStudents,
        participatingColleges,
        totalEvents,
        upcomingEvents,
        ongoingEvents,
        completedEvents,
        cancelledEvents,
        approvedEvents,
        pendingEvents,
        totalRegistrations,
        confirmedRegistrations,
        pendingRegistrations,
        paidRegistrations,
        participatingStudents: uniqueStudents.size,
        lbrceRegistrations: lbrceRegs.length,
        otherCollegeRegistrations: otherRegs.length,
        multiEventStudentsCount: Math.max(confirmedRegs.length - uniqueStudents.size, 0),
        collegeStats,
        deptStats,
        popularEvents,
        deptWise,
        checkedInRegistrations,
        totalRevenue: `₹${totalRevenue.toLocaleString()}`,
        totalRevenueAmount: totalRevenue,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch analytics.' });
  }
}

// Notifications: GET, POST, DELETE
export async function getNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    // Identity comes from the JWT, never from query parameters: callers must
    // not read another user's targeted notifications via userId, nor subscribe
    // to another role's broadcasts via role.
    const callerRoles: string[] = Array.isArray((req.user as any)?.roles)
      ? (req.user as any).roles
      : [((req.user as any)?.role as string)].filter(Boolean);
    const requestedRole = typeof req.query.role === 'string' ? req.query.role : undefined;
    const role = requestedRole && callerRoles.includes(requestedRole) ? requestedRole : callerRoles[0];
    const ownUserId = (req.user as AuthUser)?._id.toString();
    const filter: any = {};

    if (role) {
      filter.$or = [
        { targetRole: 'all' },
        { targetRole: role },
        { userId: 'all' },
        { userId: ownUserId },
      ];
    }

    const notifications = await Notification.find(filter).sort({ createdAt: -1 }).limit(50);
    res.status(200).json({ success: true, notifications });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error fetching notifications.' });
  }
}

export async function sendNotification(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { targetRole, title, message, type, userId } = req.body;
    const allowedTargets = ['all', 'student', 'coordinator', 'admin'];
    const allowedTypes = ['info', 'success', 'warning', 'alert'];
    if (!title?.toString().trim() || !message?.toString().trim()) {
      res.status(400).json({ success: false, message: 'Title and message are required.' });
      return;
    }
    const notif = await Notification.create({
      targetRole: allowedTargets.includes(targetRole) ? targetRole : 'all',
      userId: typeof userId === 'string' && userId.trim() ? userId.trim().slice(0, 64) : 'all',
      title: title.toString().trim().slice(0, 200),
      message: message.toString().trim().slice(0, 5000),
      type: allowedTypes.includes(type) ? type : 'info',
      read: false,
      senderName: req.user?.name || 'Administrator',
      senderRole: (((req.user as AuthUser)?.roles?.[0]) as 'admin' | 'coordinator' | 'student') || 'admin',
      senderEmail: (req.user as AuthUser)?.email,
    });
    res.status(201).json({ success: true, notification: notif.toJSON() });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to send notification.' });
  }
}

export async function deleteNotification(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    await Notification.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: 'Notification deleted.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to delete notification.' });
  }
}

// Announcements history: notifications dispatched by an administrator
export async function getAdminAnnouncements(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const announcements = await Notification.find({ senderRole: 'admin' }).sort({ createdAt: -1 }).limit(100);
    res.status(200).json({ success: true, announcements });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch announcements.' });
  }
}

// Support Reports: GET, POST, PUT, DELETE
export async function getSupportReports(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const filter: any = {};
    const userRoles = (req.user as AuthUser)?.roles || [];
    if (userRoles.includes('student') || userRoles.includes('coordinator')) {
      filter.senderEmail = req.user?.email?.toLowerCase();
    }
    const reports = await SupportReport.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ success: true, reports });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error fetching reports.' });
  }
}

export async function createSupportReport(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    // Whitelist client-settable fields; identity and workflow state always
    // come from the server (no impersonation, no self-resolving reports).
    const { subject, message, category, priority } = req.body || {};
    if (!subject?.toString().trim() || !message?.toString().trim()) {
      res.status(400).json({ success: false, message: 'Subject and message are required.' });
      return;
    }
    const allowedCategories = ['issue', 'query', 'requisition', 'feedback', 'emergency'];
    const allowedPriorities = ['low', 'medium', 'high', 'urgent'];
    const report: any = await SupportReport.create({
      senderId: req.user?._id.toString(),
      senderName: req.user?.name,
      senderEmail: (req.user?.email || '').toLowerCase().trim(),
      senderPhone: (req.user as any)?.phone,
      senderCollege: (req.user as any)?.college,
      senderDepartment: (req.user as any)?.department,
      senderRole: (((req.user as any)?.roles?.[0] || 'student') as 'student' | 'coordinator' | 'admin'),
      subject: subject.toString().trim().slice(0, 200),
      message: message.toString().trim().slice(0, 5000),
      category: allowedCategories.includes(category) ? category : 'query',
      priority: allowedPriorities.includes(priority) ? priority : 'medium',
      status: 'unread',
    });
    res.status(201).json({ success: true, report: report.toJSON() });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error submitting report.' });
  }
}

export async function updateSupportReport(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const updated = await SupportReport.findByIdAndUpdate(id, req.body, { new: true });
    res.status(200).json({ success: true, report: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error updating report.' });
  }
}

export async function deleteSupportReport(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    await SupportReport.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: 'Report deleted.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error deleting report.' });
  }
}
