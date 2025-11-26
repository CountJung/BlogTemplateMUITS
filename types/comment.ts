// 댓글 관련 타입 정의

export interface Comment {
  id: string;                    // 댓글 고유 ID
  postId: string;               // 게시글 ID
  content: string;              // 댓글 내용
  author: string;               // 작성자 이름
  authorEmail: string;          // 작성자 이메일
  authorImage?: string | null;  // 작성자 프로필 이미지
  createdAt: string;            // 작성일시 (ISO 8601)
  updatedAt?: string;           // 수정일시 (ISO 8601)
}

export interface CommentFormData {
  postId: string;
  content: string;
}

export interface CommentApiResponse {
  success: boolean;
  comment?: Comment;
  comments?: Comment[];
  message?: string;
  error?: string;
}

export interface DeleteCommentRequest {
  commentId: string;
  postId: string;
}
