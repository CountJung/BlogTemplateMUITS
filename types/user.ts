import { UserRole } from './roles';

export interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: UserRole;
  lastLogin: string;
  createdAt: string;
}

export interface UserManagementApiResponse {
  success: boolean;
  message: string;
  users?: User[];
  user?: User;
}

export interface UpdateUserRoleRequest {
  email: string;
  role: UserRole;
}