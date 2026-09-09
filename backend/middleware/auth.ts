import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: { id: string };
}

export const verifyToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.slice('Bearer '.length);

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as unknown as { id: string };
    req.user = verified;
    next();
  } catch {
    res.status(403).json({ error: 'Invalid or expired token' });
  }
};