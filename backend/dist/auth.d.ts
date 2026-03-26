import { NextFunction, Request, Response } from 'express';
type TokenPayload = {
    uid: number;
    usr: string;
    role: string;
    exp: number;
};
export declare const hashPassword: (password: string) => string;
export declare const verifyPassword: (password: string, passwordHash: string) => boolean;
export declare const createToken: (user: {
    id: number;
    username: string;
    role: string;
}) => string;
export declare const verifyToken: (token: string) => TokenPayload;
export declare const requireAuth: (req: Request, res: Response, next: NextFunction) => void;
export declare const getUserId: (req: Request) => number;
export {};
//# sourceMappingURL=auth.d.ts.map