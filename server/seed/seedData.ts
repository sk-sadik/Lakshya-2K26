import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { Event } from '../models/Event';
import { EVENTS_DATA } from '../../src/data/lakshyaData';

export async function seedDatabase(): Promise<void> {
  try {
    // 1. Ensure all existing users have roles synchronized
    const allUsers = await User.find({});
    for (const u of allUsers) {
      let updated = false;
      const raw: any = u.toObject();
      if (!u.roles || u.roles.length === 0) {
        u.roles = [u.role || 'student'];
        updated = true;
      }
      if ((u.email === 'sksadik45264@gmail.com' || raw.role === 'admin') && !u.roles.includes('admin')) {
        u.roles = ['admin', 'coordinator', 'student'];
        updated = true;
      }
      if (updated) {
        await u.save();
      }
    }

    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('[Seed] Seeding initial users into MongoDB...');

      const adminPass = await bcrypt.hash('admin123', 10);
      const coordPass = await bcrypt.hash('coord123', 10);
      const studentPass = await bcrypt.hash('student123', 10);
      const sadikPass = await bcrypt.hash('123456', 10);

      await User.create([
        {
          name: 'Sk Sadik (Admin)',
          email: 'sksadik45264@gmail.com',
          passwordHash: sadikPass,
          roles: ['admin', 'coordinator', 'student'],
          college: 'Lakireddy Bali Reddy College of Engineering (Autonomous)',
          department: 'Central Administration',
          phone: '+91 98765 43210',
          rollNo: 'ADMIN-SADIK',
          status: 'active',
          isEmailVerified: true,
        },
        {
          name: 'Dr. K. Hariprasad',
          email: 'admin@lbrce.ac.in',
          passwordHash: adminPass,
          roles: ['admin', 'coordinator'],
          college: 'Lakireddy Bali Reddy College of Engineering (Autonomous)',
          department: 'Central Administration',
          phone: '+91 86592 22933',
          rollNo: 'ADMIN-CONVENER',
          status: 'active',
          isEmailVerified: true,
        },
        {
          name: 'Dr. Rajesh Kumar',
          email: 'rajesh.cse@lbrce.ac.in',
          passwordHash: coordPass,
          roles: ['coordinator', 'student'],
          college: 'Lakireddy Bali Reddy College of Engineering (Autonomous)',
          department: 'cse',
          phone: '+91 98765 00001',
          rollNo: 'FAC-CSE-042',
          status: 'active',
          isEmailVerified: true,
        },
        {
          name: 'Prof. Arun Reddy',
          email: 'arun.it@lbrce.ac.in',
          passwordHash: coordPass,
          roles: ['coordinator', 'student'],
          college: 'Lakireddy Bali Reddy College of Engineering (Autonomous)',
          department: 'it',
          phone: '+91 98765 00015',
          rollNo: 'FAC-IT-019',
          status: 'active',
          isEmailVerified: true,
        },
        {
          name: 'Rahul Varma (Verified Student)',
          email: 'student@lbrce.ac.in',
          passwordHash: studentPass,
          roles: ['student'],
          college: 'Lakireddy Bali Reddy College of Engineering (Autonomous)',
          department: 'cse',
          phone: '+91 98765 11223',
          rollNo: '23LBRCE-001',
          status: 'active',
          isEmailVerified: true,
        },
      ]);
      console.log('[Seed] Users seeded successfully.');
    }

    // 2. Seed Events if not present
    const eventCount = await Event.countDocuments();
    if (eventCount === 0) {
      console.log('[Seed] Seeding symposium events into MongoDB...');

      const eventsToInsert = EVENTS_DATA.map((item) => {
        const cleanFee = item.entryFee.replace(/[^0-9.]/g, '');
        const amount = parseFloat(cleanFee) || 0;
        const isFree = item.entryFee.toLowerCase().includes('free') || amount === 0;

        return {
          customId: item.id,
          title: item.title,
          eventName: item.title,
          department: item.deptId,
          category: item.category,
          description: item.description,
          coordinatorName: item.coordinators[0]?.name || 'Faculty Coordinator',
          coordinatorEmail: `${item.deptId}.coord@lbrce.ac.in`,
          date: 'Feb 20-21, 2026',
          time: item.timing || '10:00 AM - 01:00 PM',
          venue: item.venue || 'LBRCE Campus',
          registrationDeadline: '2026-12-31T23:59:59Z',
          entryFee: item.entryFee,
          feeAmount: isFree ? 0 : amount,
          isPaid: !isFree && amount > 0,
          maxParticipants: 100,
          registeredCount: 0,
          teamSize: item.teamSize,
          prizes: item.prizes,
          status: 'upcoming',
          approvalStatus: 'approved',
          rules: item.rules,
          rounds: item.rounds,
          coordinators: item.coordinators,
          accentColor: item.accentColor,
          featured: item.featured ?? true,
        };
      });

      // Also ensure at least one explicit FREE event and one explicit PAID event
      eventsToInsert.push({
        customId: 'event-free-hackathon',
        title: 'Open Source Hackathon (Free Entry)',
        eventName: 'Open Source Hackathon (Free Entry)',
        department: 'cse',
        category: 'coding',
        description: '24-hour open-source national hackathon with complimentary registration for all university students.',
        coordinatorName: 'Dr. Rajesh Kumar',
        coordinatorEmail: 'rajesh.cse@lbrce.ac.in',
        date: 'Feb 20, 2026',
        time: '09:00 AM - 05:00 PM',
        venue: 'LBRCE Central Auditorium',
        registrationDeadline: '2026-12-31T23:59:59Z',
        entryFee: 'Free',
        feeAmount: 0,
        isPaid: false,
        maxParticipants: 200,
        registeredCount: 0,
        teamSize: '1-4 Members',
        prizes: { first: '₹25,000', second: '₹15,000', third: '₹10,000' },
        status: 'upcoming',
        approvalStatus: 'approved',
        rules: ['Open to all branches', 'Valid student college ID required'],
        rounds: [{ name: 'Round 1: Idea Pitch', description: 'Pitch to judges' }],
        coordinators: [{ name: 'Dr. Rajesh Kumar', role: 'Lead', phone: '+91 98765 00001' }],
        accentColor: '#10b981',
        featured: true,
      });

      await Event.insertMany(eventsToInsert);
      console.log(`[Seed] Successfully seeded ${eventsToInsert.length} symposium events.`);
    }
  } catch (error) {
    console.error('[Seed Error]', error);
  }
}
