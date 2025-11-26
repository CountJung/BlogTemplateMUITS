import fs from 'fs';
import path from 'path';
import { Comment, CommentFormData } from '../types/comment';

const commentsDirectory = path.join(process.cwd(), 'data', 'comments');

// 댓글 데이터 디렉토리 초기화
function ensureCommentsDirectory(): void {
  if (!fs.existsSync(commentsDirectory)) {
    fs.mkdirSync(commentsDirectory, { recursive: true });
  }
}

// 특정 게시글의 댓글 파일 경로
function getCommentsFilePath(postId: string): string {
  return path.join(commentsDirectory, `${postId}.json`);
}

// 특정 게시글의 모든 댓글 조회
export function getCommentsByPostId(postId: string): Comment[] {
  ensureCommentsDirectory();
  
  const filePath = getCommentsFilePath(postId);
  
  if (!fs.existsSync(filePath)) {
    return [];
  }
  
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    const comments: Comment[] = JSON.parse(data);
    
    // 최신순 정렬 (createdAt 기준)
    return comments.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    console.error('Error reading comments:', error);
    return [];
  }
}

// 댓글 생성
export function createComment(
  commentData: CommentFormData & {
    author: string;
    authorEmail: string;
    authorImage?: string | null;
  }
): { success: boolean; comment?: Comment; error?: string } {
  try {
    ensureCommentsDirectory();
    
    const { postId, content, author, authorEmail, authorImage } = commentData;
    
    // 내용 유효성 검사
    if (!content || content.trim().length === 0) {
      return { success: false, error: '댓글 내용을 입력해주세요.' };
    }
    
    if (content.length > 1000) {
      return { success: false, error: '댓글은 1000자를 초과할 수 없습니다.' };
    }
    
    const filePath = getCommentsFilePath(postId);
    const existingComments = getCommentsByPostId(postId);
    
    const newComment: Comment = {
      id: `comment_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      postId,
      content: content.trim(),
      author,
      authorEmail,
      authorImage,
      createdAt: new Date().toISOString(),
    };
    
    existingComments.unshift(newComment); // 최신 댓글을 앞에 추가
    
    fs.writeFileSync(filePath, JSON.stringify(existingComments, null, 2));
    
    return { success: true, comment: newComment };
  } catch (error) {
    console.error('Error creating comment:', error);
    return { success: false, error: '댓글 작성 중 오류가 발생했습니다.' };
  }
}

// 댓글 삭제
export function deleteComment(
  postId: string,
  commentId: string
): { success: boolean; error?: string } {
  try {
    ensureCommentsDirectory();
    
    const filePath = getCommentsFilePath(postId);
    const comments = getCommentsByPostId(postId);
    
    const commentIndex = comments.findIndex(c => c.id === commentId);
    
    if (commentIndex === -1) {
      return { success: false, error: '댓글을 찾을 수 없습니다.' };
    }
    
    comments.splice(commentIndex, 1);
    
    fs.writeFileSync(filePath, JSON.stringify(comments, null, 2));
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting comment:', error);
    return { success: false, error: '댓글 삭제 중 오류가 발생했습니다.' };
  }
}

// 특정 댓글 조회
export function getCommentById(postId: string, commentId: string): Comment | null {
  const comments = getCommentsByPostId(postId);
  return comments.find(c => c.id === commentId) || null;
}

// 댓글 수 조회
export function getCommentsCount(postId: string): number {
  return getCommentsByPostId(postId).length;
}

// 사용자의 모든 댓글 조회 (관리 목적)
export function getCommentsByUserEmail(userEmail: string): Comment[] {
  ensureCommentsDirectory();
  
  const allComments: Comment[] = [];
  
  try {
    const files = fs.readdirSync(commentsDirectory);
    
    files.forEach(file => {
      if (file.endsWith('.json')) {
        const postId = file.replace('.json', '');
        const comments = getCommentsByPostId(postId);
        const userComments = comments.filter(c => c.authorEmail === userEmail);
        allComments.push(...userComments);
      }
    });
    
    // 최신순 정렬
    return allComments.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    console.error('Error getting user comments:', error);
    return [];
  }
}
