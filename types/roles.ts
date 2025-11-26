// 사용자 역할 enum (클라이언트/서버 공통)
export enum UserRole {
  BANNED = 'banned',     // 차단된 사용자: 모든 활동 금지
  READER = 'reader',     // 일반 사용자: 읽기 권한만
  WRITER = 'writer',     // 글쓰기 권한자: 읽기 + 글쓰기
  ADMIN = 'admin'        // 관리자: 모든 권한
}

export interface UserPermissions {
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  canComment: boolean;   // 댓글 작성 권한 추가
  role: UserRole;
}
