import path from 'path';
import { randomUUID } from 'crypto';
import { User } from '../types/user';
import { UserRole } from '../types/roles';
import { atomicWriteJson, readJsonFile, withStoreLock } from './storage';

const usersFilePath = path.join(process.cwd(), 'data', 'users.json');

export function getAllUsers(): User[] {
  const users = readJsonFile<User[]>(usersFilePath, () => []);
  if (!Array.isArray(users)) throw new Error('Invalid users database');
  return users;
}

export function getUserByEmail(email: string): User | null {
  return getAllUsers().find(user => user.email === email) || null;
}
export const getUser = getUserByEmail;

export function createOrUpdateUser(userData: { email: string; name: string | null; image: string | null }): User {
  return withStoreLock(() => {
    const users = getAllUsers();
    const index = users.findIndex(user => user.email === userData.email);
    const existing = users[index];
    const admins = (process.env.ADMIN_EMAILS || '').split(',').map(email => email.trim().toLowerCase());
    const role = existing?.role || (admins.includes(userData.email.toLowerCase()) ? UserRole.ADMIN : UserRole.READER);
    const now = new Date().toISOString();
    const user: User = { ...existing, ...userData, id: existing?.id || `user_${randomUUID()}`,
      role, lastLogin: now, createdAt: existing?.createdAt || now };
    if (index >= 0) users[index] = user; else users.push(user);
    atomicWriteJson(usersFilePath, users);
    return user;
  });
}

export function updateUserRole(email: string, newRole: UserRole): { success: boolean; error?: string } {
  try {
    return withStoreLock(() => {
      const users = getAllUsers();
      const user = users.find(item => item.email === email);
      if (!user) return { success: false, error: '사용자를 찾을 수 없습니다.' };
      user.role = newRole;
      atomicWriteJson(usersFilePath, users);
      return { success: true };
    });
  } catch (error) { console.error('Error updating user role:', error); return { success: false, error: '역할 업데이트 중 오류가 발생했습니다.' }; }
}

export function deleteUser(email: string): { success: boolean; error?: string } {
  try {
    return withStoreLock(() => {
      const users = getAllUsers();
      const filtered = users.filter(user => user.email !== email);
      if (users.length === filtered.length) return { success: false, error: '사용자를 찾을 수 없습니다.' };
      atomicWriteJson(usersFilePath, filtered);
      return { success: true };
    });
  } catch (error) { console.error('Error deleting user:', error); return { success: false, error: '사용자 삭제 중 오류가 발생했습니다.' }; }
}

export function getUserStats() {
  const users = getAllUsers();
  return { total: users.length, admins: users.filter(u => u.role === UserRole.ADMIN).length,
    writers: users.filter(u => u.role === UserRole.WRITER).length, readers: users.filter(u => u.role === UserRole.READER).length,
    banned: users.filter(u => u.role === UserRole.BANNED).length };
}
