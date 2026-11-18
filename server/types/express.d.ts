declare global {
  namespace Express {
    interface Request {
      id: string;
      auth?: {
        userId: string;
        sessionId: string;
        roles: import('../models/user.model.js').UserRole[];
        /** Permissions from a custom staff role, on top of the roles' own. */
        extraPermissions?: string[];
      };
    }
  }
}

export {};
