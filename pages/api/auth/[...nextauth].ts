import NextAuth from 'next-auth';
import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { getUserRole, getUserPermissions } from '../../../lib/admin';
import { UserRole } from '../../../types/roles';
import { createOrUpdateUser } from '../../../lib/users';
import { logAction } from '../../../lib/logger';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          scope: 'openid email profile',
          prompt: 'select_account',
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      try {
        logAction({
          action: 'auth.login',
          outcome: 'success',
          actor: {
            email: user?.email || undefined,
            name: user?.name || null,
          },
          target: {
            type: 'session',
          },
          meta: {
            provider: account?.provider,
          },
        });
      } catch {
        // logging must never block auth
      }
      return true;
    },
    async jwt({ token, account, profile, user }) {
      // JWT 토큰에 추가 정보 저장
      if (account) {
        token.accessToken = account.access_token;
      }
      
      // 사용자 권한 정보 추가 및 데이터베이스에 저장
      if (token.email) {
        // 사용자 정보 저장/업데이트
        createOrUpdateUser({
          email: token.email,
          name: token.name || null,
          image: token.picture || null,
        });
        
        const userRole = getUserRole(token.email);
        const permissions = getUserPermissions(token.email);
        
        token.userRole = userRole;
        token.permissions = permissions;
        
        // 기존 호환성을 위해 유지
        token.isAdmin = userRole === UserRole.ADMIN;
      }
      
      return token;
    },
    async session({ session, token }) {
      // 세션에 추가 정보 포함
      (session as any).accessToken = token.accessToken;
      (session as any).userRole = token.userRole || UserRole.READER;
      (session as any).permissions = token.permissions;
      (session as any).isAdmin = token.isAdmin || false;
      return session;
    },
    async redirect({ url, baseUrl }) {
      // 안전한 리디렉션 처리
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
      } else if (new URL(url).origin === baseUrl) {
        return url;
      }
      return baseUrl;
    },
  },
  events: {
    async signOut(message) {
      try {
        logAction({
          action: 'auth.logout',
          outcome: 'success',
          actor: {
            email: (message as any)?.token?.email || (message as any)?.session?.user?.email,
          },
          target: { type: 'session' },
        });
      } catch {
        // no-op
      }
    },
  },
  logger: {
    error(code, metadata) {
      try {
        logAction({
          action: 'auth.error',
          outcome: 'error',
          target: { type: 'auth' },
          meta: { code, metadata },
        });
      } catch {
        // no-op
      }
    },
    warn(code) {
      try {
        logAction({
          action: 'auth.warn',
          outcome: 'success',
          target: { type: 'auth' },
          meta: { code },
        });
      } catch {
        // no-op
      }
    },
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
  },
};

export default NextAuth(authOptions);