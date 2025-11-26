import { UserRole } from './roles';
import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    } & DefaultSession['user'];
    userRole?: UserRole;
    permissions?: {
      canRead: boolean;
      canWrite: boolean;
      canDelete: boolean;
      canComment: boolean;
    };
    isAdmin?: boolean; // 레거시 호환성을 위해 유지
  }

  interface JWT {
    userRole?: UserRole;
    permissions?: {
      canRead: boolean;
      canWrite: boolean;
      canDelete: boolean;
      canComment: boolean;
    };
    isAdmin?: boolean;
  }
}