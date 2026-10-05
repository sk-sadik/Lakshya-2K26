import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { Coordinator, ICoordinator } from '../models/Coordinator';
import { getJwtSecret } from '../config/env';

export type AuthUser = IUser | ICoordinator;

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export async function protect(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  let token: string | undefined;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] }) as { id: string; roles: string[] };

    // Check if it's a coordinator or regular user
    let user: AuthUser | null;
    
    // Try User first, then Coordinator
    user = await User.findById(decoded.id) as AuthUser;
    if (!user) {
      user = await Coordinator.findById(decoded.id) as AuthUser;
    }

    if (!user) {
      res.status(401).json({ success: false, message: 'User belonging to this token no longer exists.' });
      return;
    }

    if (user.status === 'disabled') {
      res.status(403).json({ success: false, message: 'Account has been deactivated. Contact administration.' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid or expired session token. Please log in again.' });
  }
}

export function authorize(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const rawUser: any = req.user;
    const userRoles: string[] = Array.isArray(rawUser.roles) && rawUser.roles.length > 0
      ? [...rawUser.roles]
      : [rawUser.role].filter(Boolean);

    if (rawUser.role && !userRoles.includes(rawUser.role)) {
      userRoles.push(rawUser.role);
    }

    // Always ensure primary admin accounts retain admin privileges
    if (rawUser.email && (rawUser.email === 'sksadik45264@gmail.com' || rawUser.email === 'admin@lbrce.ac.in')) {
      if (!userRoles.includes('admin')) userRoles.push('admin');
    }

    const hasRequiredRole = roles.some(role => userRoles.includes(role));

    if (!hasRequiredRole) {
      res.status(403).json({
        success: false,
        message: `Forbidden. You need one of these roles: ${roles.join(', ')}.`,
      });
      return;
    }

    next();
  };
}

// Simple authentication middleware (no role check)
export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Not authenticated.' });
    return;
  }
  next();
}

// Optional authentication middleware (populates req.user if valid token provided)
export async function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> {
  let token: string | undefined;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] }) as { id: string; roles: string[] };

    let user: AuthUser | null = await User.findById(decoded.id) as AuthUser;
    if (!user) {
      user = await Coordinator.findById(decoded.id) as AuthUser;
    }

    if (user && user.status !== 'disabled') {
      req.user = user;
    }
  } catch {
    // Ignore optional auth failure
  }
  next();
}
