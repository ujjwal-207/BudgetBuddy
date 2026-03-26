declare namespace Express {
  interface UserPayload {
    id: number;
    username: string;
    role: string;
  }

  interface Request {
    user?: UserPayload;
  }
}
