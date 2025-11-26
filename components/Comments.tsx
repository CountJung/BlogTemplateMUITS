import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Avatar,
  IconButton,
  Divider,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Send as SendIcon,
  Comment as CommentIcon,
} from '@mui/icons-material';
import { useSession } from 'next-auth/react';
import { Comment } from '../types/comment';
import { useLanguage } from '../contexts/LanguageContext';

interface CommentsProps {
  postId: string;
  postAuthorEmail: string; // 게시글 작성자 이메일
}

const Comments: React.FC<CommentsProps> = ({ postId, postAuthorEmail }) => {
  const { data: session } = useSession();
  const { t } = useLanguage();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);

  // 댓글 목록 조회
  const fetchComments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/comments/${postId}`);
      const data = await response.json();

      if (data.success && data.comments) {
        setComments(data.comments);
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [postId]);

  // 댓글 작성
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session) {
      setError(t('loginRequired'));
      return;
    }

    if (!newComment.trim()) {
      setError(t('error'));
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/comments/${postId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: newComment }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setNewComment('');
        setSuccess(t('success'));
        await fetchComments(); // 댓글 목록 새로고침
        
        // 성공 메시지 3초 후 자동 제거
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || t('error'));
      }
    } catch (error) {
      console.error('Comment submission error:', error);
      setError(t('error'));
    } finally {
      setSubmitting(false);
    }
  };

  // 댓글 삭제 권한 확인
  const canDeleteComment = (comment: Comment): boolean => {
    if (!session?.user?.email) return false;

    const isAdmin = (session as any).isAdmin || false;
    const isPostAuthor = postAuthorEmail === session.user.email;
    const isCommentAuthor = comment.authorEmail === session.user.email;

    return isAdmin || isPostAuthor || isCommentAuthor;
  };

  // 댓글 삭제
  const handleDeleteComment = async () => {
    if (!commentToDelete) return;

    try {
      const response = await fetch(`/api/comments/${postId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ commentId: commentToDelete }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess('댓글이 삭제되었습니다.');
        await fetchComments(); // 댓글 목록 새로고침
        
        // 성공 메시지 3초 후 자동 제거
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || '댓글 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Comment deletion error:', error);
      setError('댓글 삭제 중 오류가 발생했습니다.');
    } finally {
      setDeleteDialogOpen(false);
      setCommentToDelete(null);
    }
  };

  // 날짜 포맷팅
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Box sx={{ mt: 6 }}>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CommentIcon />
        {t('comments')} ({comments.length})
      </Typography>

      <Divider sx={{ mb: 3 }} />

      {/* 알림 메시지 */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* 댓글 작성 폼 */}
      {session ? (
        session.permissions?.canComment ? (
          <Paper sx={{ p: 3, mb: 4 }}>
            <form onSubmit={handleSubmitComment}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                <Avatar
                  src={session.user?.image || undefined}
                  alt={session.user?.name || undefined}
                  sx={{ width: 40, height: 40 }}
                >
                  {session.user?.name?.charAt(0)}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    placeholder={t('writeComment') + "..."}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    disabled={submitting}
                    sx={{ mb: 2 }}
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                      {newComment.length} / 1000
                    </Typography>
                    <Button
                      type="submit"
                      variant="contained"
                      endIcon={submitting ? <CircularProgress size={20} /> : <SendIcon />}
                      disabled={submitting || !newComment.trim()}
                    >
                      {submitting ? t('loading') : t('writeComment')}
                    </Button>
                  </Box>
                </Box>
              </Box>
            </form>
          </Paper>
        ) : (
          <Alert severity="warning" sx={{ mb: 4 }}>
            {t('permissionDenied')}
          </Alert>
        )
      ) : (
        <Alert severity="info" sx={{ mb: 4 }}>
          {t('loginRequired')}
        </Alert>
      )}

      {/* 댓글 목록 */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : comments.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="body1" color="text.secondary">
            아직 댓글이 없습니다. 첫 댓글을 작성해보세요!
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {comments.map((comment) => (
            <Paper key={comment.id} sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Avatar
                  src={comment.authorImage || undefined}
                  alt={comment.author}
                  sx={{ width: 40, height: 40 }}
                >
                  {comment.author.charAt(0)}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Box>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {comment.author}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(comment.createdAt)}
                      </Typography>
                    </Box>
                    {canDeleteComment(comment) && (
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => {
                          setCommentToDelete(comment.id);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {comment.content}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          ))}
        </Box>
      )}

      {/* 삭제 확인 다이얼로그 */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>댓글 삭제 확인</DialogTitle>
        <DialogContent>
          <DialogContentText>
            정말로 이 댓글을 삭제하시겠습니까?
            <br />
            삭제된 댓글은 복구할 수 없습니다.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>취소</Button>
          <Button onClick={handleDeleteComment} color="error" variant="contained">
            삭제
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Comments;
