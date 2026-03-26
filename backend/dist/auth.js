"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserId = exports.requireAuth = exports.verifyToken = exports.createToken = exports.verifyPassword = exports.hashPassword = void 0;
const crypto_1 = __importDefault(require("crypto"));
const AUTH_SECRET = process.env.AUTH_SECRET || 'personalfinance-dev-secret';
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;
const base64UrlEncode = (value) => Buffer.from(value).toString('base64url');
const base64UrlDecode = (value) => Buffer.from(value, 'base64url').toString('utf8');
const sign = (value) => crypto_1.default.createHmac('sha256', AUTH_SECRET).update(value).digest('base64url');
const hashPassword = (password) => {
    const salt = crypto_1.default.randomBytes(16).toString('hex');
    const hash = crypto_1.default.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
};
exports.hashPassword = hashPassword;
const verifyPassword = (password, passwordHash) => {
    const [salt, hash] = passwordHash.split(':');
    if (!salt || !hash)
        return false;
    const derived = crypto_1.default.scryptSync(password, salt, 64).toString('hex');
    return crypto_1.default.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(derived, 'hex'));
};
exports.verifyPassword = verifyPassword;
const createToken = (user) => {
    const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = base64UrlEncode(JSON.stringify({
        uid: user.id,
        usr: user.username,
        role: user.role,
        exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS
    }));
    const signature = sign(`${header}.${payload}`);
    return `${header}.${payload}.${signature}`;
};
exports.createToken = createToken;
const verifyToken = (token) => {
    const [header, payload, signature] = token.split('.');
    if (!header || !payload || !signature) {
        throw new Error('Invalid token');
    }
    const expectedSignature = sign(`${header}.${payload}`);
    if (!crypto_1.default.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        throw new Error('Invalid token signature');
    }
    const decoded = JSON.parse(base64UrlDecode(payload));
    if (decoded.exp < Math.floor(Date.now() / 1000)) {
        throw new Error('Token expired');
    }
    return decoded;
};
exports.verifyToken = verifyToken;
const requireAuth = (req, res, next) => {
    const authorization = req.header('authorization');
    if (!authorization?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }
    try {
        const payload = (0, exports.verifyToken)(authorization.slice(7));
        req.user = {
            id: payload.uid,
            username: payload.usr,
            role: payload.role
        };
        next();
    }
    catch (error) {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
};
exports.requireAuth = requireAuth;
const getUserId = (req) => {
    if (!req.user) {
        throw new Error('Authenticated user missing');
    }
    return req.user.id;
};
exports.getUserId = getUserId;
//# sourceMappingURL=auth.js.map