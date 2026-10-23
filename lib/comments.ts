import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { atomicWriteJson, readJsonFile, withStoreLock } from './storage';
import { isValidPostId } from './validation';
import { Comment, CommentFormData } from '../types/comment';

const commentsDirectory = path.join(process.cwd(), 'data', 'comments');

// 특정 게시글의 댓글 파일 경로
function getCommentsFilePath(postId: string): string {
  if (!isValidPostId(postId)) throw new Error('Invalid post ID');
  return path.join(commentsDirectory, `${postId}.json`);
}

// 특정 게시글의 모든 댓글 조회
export function getCommentsByPostId(postId: string): Comment[] {
  const comments = readJsonFile<Comment[]>(getCommentsFilePath(postId), () => []);
  if (!Array.isArray(comments)) throw new Error('Invalid comments database');
  return comments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
    return withStoreLock(() => {
    
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
        id: `comment_${randomUUID()}`,
        postId,
        content: content.trim(),
        author,
        authorEmail,
        authorImage,
        createdAt: new Date().toISOString(),
      };
    
      existingComments.unshift(newComment); // 최신 댓글을 앞에 추가
    
      atomicWriteJson(filePath, existingComments);
    
      return { success: true, comment: newComment };
    });
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
    return withStoreLock(() => {
    
      const filePath = getCommentsFilePath(postId);
      const comments = getCommentsByPostId(postId);
    
      const commentIndex = comments.findIndex(c => c.id === commentId);
    
      if (commentIndex === -1) {
        return { success: false, error: '댓글을 찾을 수 없습니다.' };
      }
    
      comments.splice(commentIndex, 1);
    
      atomicWriteJson(filePath, comments);
    
      return { success: true };
    });
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
  
  const allComments: Comment[] = [];
  
  try {
    const files = fs.existsSync(commentsDirectory) ? fs.readdirSync(commentsDirectory) : [];
    
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
