import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';

type TokenPayload = {
  uid: number;
  usr: string;
  role: string;
  exp: number;
};

const AUTH_SECRET = process.env.AUTH_SECRET || 'personalfinance-dev-secret';
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;

const base64UrlEncode = (value: string) => Buffer.from(value).toString('base64url');
const base64UrlDecode = (value: string) => Buffer.from(value, 'base64url').toString('utf8');

const sign = (value: string) =>
  crypto.createHmac('sha256', AUTH_SECRET).update(value).digest('base64url');

export const hashPassword = (password: string) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
};

export const verifyPassword = (password: string, passwordHash: string) => {
  const [salt, hash] = passwordHash.split(':');
  if (!salt || !hash) return false;
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(derived, 'hex'));
};

export const createToken = (user: { id: number; username: string; role: string }) => {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64UrlEncode(
    JSON.stringify({
      uid: user.id,
      usr: user.username,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS
    } satisfies TokenPayload)
  );
  const signature = sign(`${header}.${payload}`);
  return `${header}.${payload}.${signature}`;
};

export const verifyToken = (token: string) => {
  const [header, payload, signature] = token.split('.');
  if (!header || !payload || !signature) {
    throw new Error('Invalid token');
  }

  const expectedSignature = sign(`${header}.${payload}`);
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    throw new Error('Invalid token signature');
  }

  const decoded = JSON.parse(base64UrlDecode(payload)) as TokenPayload;
  if (decoded.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired');
  }

  return decoded;
};

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const authorization = req.header('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const payload = verifyToken(authorization.slice(7));
    req.user = {
      id: payload.uid,
      username: payload.usr,
      role: payload.role
    };
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const getUserId = (req: Request) => {
  if (!req.user) {
    throw new Error('Authenticated user missing');
  }

  return req.user.id;
};
