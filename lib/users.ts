import fs from 'fs';
import path from 'path';
import { User } from '../types/user';
import { UserRole } from '../types/roles';

const usersDirectory = path.join(process.cwd(), 'data');
const usersFilePath = path.join(usersDirectory, 'users.json');

// env에서 관리자 확인 (순환 참조 방지)
function isAdminFromEnv(userEmail: string): boolean {
  const adminEmails = process.env.ADMIN_EMAILS;
  if (!adminEmails) return false;
  
  const adminList = adminEmails.split(',').map(email => email.trim().toLowerCase());
  return adminList.includes(userEmail.toLowerCase());
}

// 사용자 역할 확인 (순환 참조 방지 버전)
function getUserRoleInternal(email: string): UserRole {
  // users.json에서 먼저 확인
  const user = getUserByEmailInternal(email);
  if (user?.role) return user.role;
  
  // users.json에 없으면 env에서 확인 (초기 관리자 설정용)
  if (isAdminFromEnv(email)) return UserRole.ADMIN;
  
  return UserRole.READER;
}

// 내부 사용자 조회 (순환 참조 방지)
function getUserByEmailInternal(email: string): User | null {
  try {
    ensureUsersFile();
    const data = fs.readFileSync(usersFilePath, 'utf8');
    const users: User[] = JSON.parse(data);
    return users.find(user => user.email === email) || null;
  } catch (error) {
    return null;
  }
}

// 사용자 데이터 파일 초기화
function ensureUsersFile(): void {
  if (!fs.existsSync(usersDirectory)) {
    fs.mkdirSync(usersDirectory, { recursive: true });
  }
  
  if (!fs.existsSync(usersFilePath)) {
    fs.writeFileSync(usersFilePath, JSON.stringify([], null, 2));
  }
}

// 모든 사용자 조회
export function getAllUsers(): User[] {
  ensureUsersFile();
  
  try {
    const data = fs.readFileSync(usersFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading users file:', error);
    return [];
  }
}

// 사용자 조회 (이메일로)
export function getUserByEmail(email: string): User | null {
  const users = getAllUsers();
  return users.find(user => user.email === email) || null;
}

// 사용자 조회 (getUser alias for getUserByEmail)
export function getUser(email: string): User | null {
  return getUserByEmail(email);
}

// 사용자 생성 또는 업데이트 (로그인 시)
export function createOrUpdateUser(userData: {
  email: string;
  name: string | null;
  image: string | null;
}): User {
  ensureUsersFile();
  
  const users = getAllUsers();
  const existingUserIndex = users.findIndex(u => u.email === userData.email);
  
  const role = getUserRoleInternal(userData.email);
  const now = new Date().toISOString();
  
  if (existingUserIndex >= 0) {
    // 기존 사용자 업데이트
    users[existingUserIndex] = {
      ...users[existingUserIndex],
      name: userData.name,
      image: userData.image,
      role,
      lastLogin: now,
    };
    
    fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
    return users[existingUserIndex];
  } else {
    // 새 사용자 생성
    const newUser: User = {
      id: `user_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      email: userData.email,
      name: userData.name,
      image: userData.image,
      role,
      lastLogin: now,
      createdAt: now,
    };
    
    users.push(newUser);
    fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
    return newUser;
  }
}

// 사용자 역할 업데이트
export function updateUserRole(email: string, newRole: UserRole): { success: boolean; error?: string } {
  ensureUsersFile();
  
  try {
    const users = getAllUsers();
    const userIndex = users.findIndex(u => u.email === email);
    
    if (userIndex === -1) {
      return { success: false, error: '사용자를 찾을 수 없습니다.' };
    }
    
    users[userIndex].role = newRole;
    fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
    
    // 환경 변수도 업데이트해야 함 (재시작 필요)
    updateEnvironmentVariables(email, newRole);
    
    return { success: true };
  } catch (error) {
    console.error('Error updating user role:', error);
    return { success: false, error: '역할 업데이트 중 오류가 발생했습니다.' };
  }
}

// 환경 변수 업데이트 (참고용 - 실제로는 서버 재시작이 필요)
function updateEnvironmentVariables(email: string, role: UserRole): void {
  // 이 함수는 참고용입니다. 
  // 실제 프로덕션에서는 데이터베이스나 별도의 설정 파일을 사용하는 것이 좋습니다.
  console.log(`환경 변수 업데이트 필요: ${email} -> ${role}`);
  console.log('서버를 재시작하거나 별도의 권한 관리 시스템을 사용하세요.');
}

// 사용자 삭제
export function deleteUser(email: string): { success: boolean; error?: string } {
  ensureUsersFile();
  
  try {
    const users = getAllUsers();
    const filteredUsers = users.filter(u => u.email !== email);
    
    if (users.length === filteredUsers.length) {
      return { success: false, error: '사용자를 찾을 수 없습니다.' };
    }
    
    fs.writeFileSync(usersFilePath, JSON.stringify(filteredUsers, null, 2));
    return { success: true };
  } catch (error) {
    console.error('Error deleting user:', error);
    return { success: false, error: '사용자 삭제 중 오류가 발생했습니다.' };
  }
}

// 통계 정보
export function getUserStats() {
  const users = getAllUsers();
  
  return {
    total: users.length,
    admins: users.filter(u => u.role === UserRole.ADMIN).length,
    writers: users.filter(u => u.role === UserRole.WRITER).length,
    readers: users.filter(u => u.role === UserRole.READER).length,
    banned: users.filter(u => u.role === UserRole.BANNED).length,
  };
}