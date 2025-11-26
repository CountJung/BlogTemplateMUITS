// 권한 관리 유틸리티 함수
import { getUser } from './users';
import type { UserPermissions } from '../types/roles';
import { UserRole } from '../types/roles';

export { UserRole };
export type { UserPermissions };

// 관리자 권한 확인 (env 기반)
export function isAdminFromEnv(userEmail: string | null | undefined): boolean {
  if (!userEmail) return false;
  
  const adminEmails = process.env.ADMIN_EMAILS;
  if (!adminEmails) return false;
  
  const adminList = adminEmails.split(',').map(email => email.trim().toLowerCase());
  return adminList.includes(userEmail.toLowerCase());
}

// 관리자 권한 확인 (users.json 또는 env 참조)
export function isAdmin(userEmail: string | null | undefined): boolean {
  if (!userEmail) return false;
  
  // 먼저 env를 확인 (초기 관리자 설정용)
  if (isAdminFromEnv(userEmail)) return true;
  
  // users.json에서 확인
  const user = getUser(userEmail);
  return user?.role === UserRole.ADMIN;
}

// 글쓰기 권한 확인 (users.json 참조)
export function isWriter(userEmail: string | null | undefined): boolean {
  if (!userEmail) return false;
  
  // users.json에서 확인
  const user = getUser(userEmail);
  return user?.role === UserRole.WRITER || user?.role === UserRole.ADMIN;
}

// 사용자 역할 확인 (users.json 우선, env 폴백)
export function getUserRole(userEmail: string | null | undefined): UserRole {
  if (!userEmail) return UserRole.READER;
  
  // users.json에서 먼저 확인
  const user = getUser(userEmail);
  if (user?.role) return user.role;
  
  // users.json에 없으면 env에서 확인 (초기 관리자 설정용)
  if (isAdminFromEnv(userEmail)) return UserRole.ADMIN;
  
  return UserRole.READER;
}

// 사용자 권한 확인
export function getUserPermissions(userEmail: string | null | undefined): UserPermissions {
  const role = getUserRole(userEmail);
  
  switch (role) {
    case UserRole.ADMIN:
      return {
        canRead: true,
        canWrite: true,
        canDelete: true,
        canComment: true,
        role: UserRole.ADMIN
      };
    case UserRole.WRITER:
      return {
        canRead: true,
        canWrite: true,
        canDelete: false,
        canComment: true,
        role: UserRole.WRITER
      };
    case UserRole.READER:
      return {
        canRead: true,
        canWrite: false,
        canDelete: false,
        canComment: true,
        role: UserRole.READER
      };
    case UserRole.BANNED:
      return {
        canRead: true,
        canWrite: false,
        canDelete: false,
        canComment: false,
        role: UserRole.BANNED
      };
    default:
      return {
        canRead: true,
        canWrite: false,
        canDelete: false,
        canComment: true,
        role: UserRole.READER
      };
  }
}

// 권한별 이메일 목록 반환
export function getAdminEmails(): string[] {
  // env에서 초기 관리자 목록 반환
  const adminEmails = process.env.ADMIN_EMAILS;
  if (!adminEmails) return [];
  return adminEmails.split(',').map(email => email.trim());
}

export function getWriterEmails(): string[] {
  // users.json에서 WRITER 권한을 가진 사용자 목록 반환
  const { getAllUsers } = require('./users');
  const users = getAllUsers();
  return users
    .filter((user: any) => user.role === UserRole.WRITER)
    .map((user: any) => user.email);
}

// 클라이언트에서 사용할 수 있는 권한 확인 함수들
export function hasWritePermission(userRole: UserRole): boolean {
  return userRole === UserRole.WRITER || userRole === UserRole.ADMIN;
}

export function hasDeletePermission(userRole: UserRole): boolean {
  return userRole === UserRole.ADMIN;
}