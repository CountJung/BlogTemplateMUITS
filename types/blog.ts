export interface FileAttachment {
  filename: string;
  originalName: string;
  url: string;
  downloadUrl?: string; // 다운로드 전용 URL (선택적)
  size: number;
  mimeType: string;
  uploadedAt: string;
}

export interface BlogPost {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  author: string;
  authorEmail?: string; // 작성자 이메일 (삭제 권한 확인용)
  date: string;
  tags: string[];
  views: number;
  attachments?: FileAttachment[];
}

export interface PostFormData {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  author: string;
  authorEmail?: string; // 작성자 이메일
  date?: string; // 작성 날짜 (수정 시 유지)
  tags: string[];
  views?: number; // 조회수 (수정 시 유지)
  attachments?: FileAttachment[];
}

export interface PostSaveResult {
  success: boolean;
  id?: string;
  error?: string;
}

export interface PostsApiResponse {
  message: string;
  id?: string;
}

export interface DeletePostResponse {
  message: string;
  success?: boolean;
}

export interface PostPathParams {
  params: {
    id: string;
  };
}

export interface BlogDetailPageProps {
  post: BlogPost;
}

export interface BlogListPageProps {
  posts: BlogPost[];
}

// 조회수 추적 인터페이스
export interface ViewRecord {
  postId: string;
  userId?: string;      // 로그인한 사용자 ID (이메일)
  ip: string;           // IP 주소
  timestamp: string;    // 조회 시간
}

export interface ViewTracker {
  [postId: string]: ViewRecord[];
}

export interface CreatePostPageState {
  formData: PostFormData;
  newTag: string;
  isPreview: boolean;
  isLoading: boolean;
  error: string;
  success: string;
}

export interface PaginatedBlogListProps {
  posts: BlogPost[];
  paginatedPosts?: BlogPost[]; // 페이지네이션된 게시글 (검색 비활성화 시 사용)
  currentPage: number;
  totalPages: number;
  postsPerPage: number;
  totalPosts: number;
}

export interface HomePageProps extends PaginatedBlogListProps {}