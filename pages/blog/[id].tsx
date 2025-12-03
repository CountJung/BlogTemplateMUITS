import React, { useState, useEffect } from 'react';
import type { NextPage, GetStaticPaths, GetStaticProps } from 'next';
import {
  Typography,
  Box,
  Paper,
  Chip,
  Divider,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  CalendarToday as DateIcon,
  Person as AuthorIcon,
  Visibility as ViewIcon,
  ArrowBack as BackIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Attachment as AttachmentIcon,
  Print as PrintIcon,
} from '@mui/icons-material';
import { Button } from '@mui/material';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { getAllPostIds, getPostById } from '../../lib/posts';
import { BlogDetailPageProps } from '../../types/blog';
import Comments from '../../components/Comments';
import { useLanguage } from '../../contexts/LanguageContext';
import ScrollToTop from '../../components/ScrollToTop';
import 'highlight.js/styles/github-dark.css';

const BlogPostPage: NextPage<BlogDetailPageProps> = ({ post }) => {
  const { t, language } = useLanguage();
  const router = useRouter();
  const { data: session } = useSession();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState('');
  const [textFileContents, setTextFileContents] = useState<{ [key: string]: string }>({});
  
  // 조회수 증가 처리
  useEffect(() => {
    if (!post?.id) return;
    
    const incrementViewCount = async () => {
      try {
        await fetch(`/api/posts/${post.id}/view`, {
          method: 'POST',
        });
      } catch (error) {
        console.error('Failed to increment view count:', error);
        // 조회수 증가 실패는 사용자에게 표시하지 않음
      }
    };
    
    incrementViewCount();
  }, [post?.id]);

  // 텍스트 파일 내용 로드
  useEffect(() => {
    if (!post?.attachments) return;

    const loadTextFiles = async () => {
      const textFiles = post.attachments?.filter(file => file.mimeType === 'text/plain') || [];
      
      for (const file of textFiles) {
        try {
          const response = await fetch(file.url);
          const text = await response.text();
          setTextFileContents(prev => ({
            ...prev,
            [file.url]: text.substring(0, 1000) + (text.length > 1000 ? t('textTruncated') : ''),
          }));
        } catch (error) {
          console.error('Failed to load text file:', error);
          setTextFileContents(prev => ({
            ...prev,
            [file.url]: t('errorLoadingTextFile'),
          }));
        }
      }
    };

    loadTextFiles();
  }, [post?.attachments]);
  
  // 삭제 권한 확인 (Admin은 모든 글, Writer는 자신의 글만)
  const canDelete = (() => {
    if (!session?.user?.email) return false;
    
    const isAdmin = session.permissions?.canDelete || false;
    const isAuthor = post.authorEmail === session.user.email;
    
    return isAdmin || isAuthor;
  })();

  // 수정 권한 확인 (Admin 또는 작성자)
  const canEdit = (() => {
    if (!session?.user?.email) return false;
    
    const isAdmin = (session as any).isAdmin || false;
    const isAuthor = post.authorEmail === session.user.email;
    
    return isAdmin || isAuthor;
  })();

  const handleDeletePost = async () => {
    setDeleteLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/delete-post?id=${post.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        // 삭제 성공 시 블로그 목록으로 이동
        router.push('/blog');
      } else {
        setError(data.message || t('error'));
      }
    } catch (error) {
      setError(t('error'));
      console.error('Delete post error:', error);
    } finally {
      setDeleteLoading(false);
      setDeleteDialogOpen(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };
  
  if (!post) {
    return (
      <Box textAlign="center" py={8}>
        <Typography variant="h4" gutterBottom>
          {t('postNotFound')}
        </Typography>
        <Button
          component={Link}
          href="/blog"
          startIcon={<BackIcon />}
          variant="outlined"
        >
          {t('backToBlog')}
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, displayPrint: 'none' }}>
        <Button
          component={Link}
          href="/blog"
          startIcon={<BackIcon />}
        >
          {t('back')}
        </Button>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={handlePrint}
          >
            {t('print') || 'Print'}
          </Button>
          {canEdit && (
            <Button
              component={Link}
              href={`/blog/edit/${post.id}`}
              variant="outlined"
              startIcon={<EditIcon />}
            >
              {t('edit')}
            </Button>
          )}
          {canDelete && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => setDeleteDialogOpen(true)}
              disabled={deleteLoading}
            >
              {t('delete')}
            </Button>
          )}
        </Box>
      </Box>
      
      <Paper sx={{ p: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          {post.title}
        </Typography>
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
          {post.tags.map((tag: string) => (
            <Chip
              key={tag}
              label={tag}
              size="small"
              color="primary"
              variant="outlined"
            />
          ))}
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Avatar sx={{ width: 40, height: 40 }}>
            {post.author.charAt(0)}
          </Avatar>
          
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AuthorIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  {post.author}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <DateIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  {post.date}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <ViewIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  {t('views')} {post.views}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
        
        <Divider sx={{ my: 3 }} />
        
        <Box
          sx={{
            '& h1': {
              fontSize: '2rem',
              fontWeight: 'bold',
              mt: 4,
              mb: 2,
              color: 'primary.main',
            },
            '& h2': {
              fontSize: '1.5rem',
              fontWeight: 'bold',
              mt: 3,
              mb: 2,
              color: 'text.primary',
            },
            '& h3': {
              fontSize: '1.25rem',
              fontWeight: 'bold',
              mt: 2,
              mb: 1,
              color: 'text.primary',
            },
            '& p': {
              mb: 2,
              lineHeight: 1.8,
            },
            '& ul, & ol': {
              pl: 3,
              mb: 2,
            },
            '& li': {
              mb: 1,
            },
            '& code': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              padding: '2px 6px',
              borderRadius: 1,
              fontFamily: 'Consolas, Monaco, "Courier New", monospace',
              fontSize: '0.875em',
            },
            '& pre': {
              backgroundColor: '#0d1117',
              color: '#f0f6fc',
              p: 2,
              borderRadius: 1,
              overflow: 'auto',
              mb: 2,
              border: '1px solid #30363d',
              '& code': {
                backgroundColor: 'transparent',
                padding: 0,
                fontSize: '0.875em',
              },
            },
            '& blockquote': {
              borderLeft: '4px solid #1976d2',
              pl: 2,
              ml: 0,
              fontStyle: 'italic',
              color: 'text.secondary',
            },
          }}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
          >
            {post.content}
          </ReactMarkdown>
        </Box>

        {/* 첨부파일 섹션 */}
        {post.attachments && post.attachments.length > 0 && (
          <>
            <Divider sx={{ my: 4 }} />
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AttachmentIcon />
                {t('attachments')} ({post.attachments.length})
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {post.attachments.map((file, index) => {
                  const isImage = file.mimeType.startsWith('image/');
                  const isText = file.mimeType === 'text/plain';
                  const isPdf = file.mimeType === 'application/pdf';

                  return (
                    <Paper
                      key={index}
                      sx={{
                        p: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      {/* 파일 정보 헤더 */}
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          mb: isImage || isText ? 2 : 0,
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Box
                            sx={{
                              width: 40,
                              height: 40,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: 'primary.light',
                              borderRadius: 1,
                            }}
                          >
                            {isImage ? (
                              <img
                                src={file.url}
                                alt={file.originalName}
                                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4 }}
                              />
                            ) : (
                              <AttachmentIcon />
                            )}
                          </Box>
                          <Box>
                            <Typography 
                              variant="body1" 
                              component="a" 
                              href={file.url} 
                              target="_blank"
                              sx={{ 
                                textDecoration: 'none', 
                                color: 'primary.main',
                                '&:hover': {
                                  textDecoration: 'underline',
                                }
                              }}
                            >
                              {file.originalName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block">
                              {(file.size / 1024).toFixed(2)} KB · {new Date(file.uploadedAt).toLocaleDateString(language === 'ko' ? 'ko-KR' : 'en-US')}
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            variant="outlined"
                            size="small"
                            href={file.url}
                            target="_blank"
                            sx={{ minWidth: 80 }}
                          >
                            {t('open')}
                          </Button>
                          <Button
                            variant="contained"
                            size="small"
                            href={file.url}
                            download={file.originalName}
                            sx={{ minWidth: 80 }}
                          >
                            {t('download')}
                          </Button>
                        </Box>
                      </Box>

                      {/* 이미지 미리보기 */}
                      {isImage && (
                        <Box
                          sx={{
                            mt: 2,
                            maxWidth: '100%',
                            display: 'flex',
                            justifyContent: 'center',
                            backgroundColor: 'action.hover',
                            borderRadius: 1,
                            p: 2,
                            border: '1px solid',
                            borderColor: 'divider',
                          }}
                        >
                          <img
                            src={file.url}
                            alt={file.originalName}
                            style={{
                              maxWidth: '100%',
                              maxHeight: '500px',
                              objectFit: 'contain',
                              borderRadius: 4,
                              cursor: 'pointer',
                            }}
                            onClick={() => window.open(file.url, '_blank')}
                            title={t('clickToViewOriginal')}
                          />
                        </Box>
                      )}

                      {/* 텍스트 파일 미리보기 */}
                      {isText && (
                        <Box
                          sx={{
                            mt: 2,
                            p: 2,
                            backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50',
                            borderRadius: 1,
                            maxHeight: '300px',
                            overflow: 'auto',
                            fontFamily: 'monospace',
                            fontSize: '0.875rem',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            border: '1px solid',
                            borderColor: 'divider',
                          }}
                        >
                          {textFileContents[file.url] ? (
                            <Typography
                              component="pre"
                              sx={{
                                fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                                fontSize: '0.875rem',
                                margin: 0,
                                lineHeight: 1.6,
                              }}
                            >
                              {textFileContents[file.url]}
                            </Typography>
                          ) : (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <CircularProgress size={16} />
                              <Typography variant="body2" color="text.secondary">
                                {t('loadingTextFile')}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      )}

                      {/* PDF 미리보기 안내 */}
                      {isPdf && (
                        <Box
                          sx={{
                            mt: 2,
                            p: 2,
                            backgroundColor: 'info.light',
                            borderRadius: 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                          }}
                        >
                          <Typography variant="body2" color="info.dark">
                            {t('pdfPreviewHint')}
                          </Typography>
                        </Box>
                      )}
                    </Paper>
                  );
                })}
              </Box>
            </Box>
          </>
        )}
      </Paper>

      {/* 댓글 섹션 */}
      <Box sx={{ displayPrint: 'none' }}>
        <Comments postId={post.id} postAuthorEmail={post.authorEmail || ''} />
      </Box>
      
      {/* 삭제 확인 다이얼로그 */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t('delete')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('confirmDeletePost', { title: post.title })}<br/>
            {t('cannotUndo')}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteDialogOpen(false)}
            disabled={deleteLoading}
          >
            {t('cancel')}
          </Button>
          <Button 
            onClick={handleDeletePost}
            color="error"
            variant="contained"
            disabled={deleteLoading}
          >
            {deleteLoading ? t('deleting') : t('delete')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 맨 위로 가기 버튼 */}
      <Box sx={{ displayPrint: 'none' }}>
        <ScrollToTop />
      </Box>
    </Box>
  );
};

// getStaticPaths: 빌드 시점에 생성할 페이지 경로들을 지정
export const getStaticPaths: GetStaticPaths = async () => {
  const paths = getAllPostIds();
  
  return {
    paths,
    // fallback: 'blocking'으로 변경하여 빌드 후 생성된 게시글도 접근 가능하도록 함
    fallback: 'blocking',
  };
};

// getStaticProps: 빌드 시점에 데이터를 가져옴
// revalidate를 추가하여 ISR(Incremental Static Regeneration) 활성화
export const getStaticProps: GetStaticProps<BlogDetailPageProps> = async ({ params }) => {
  const post = getPostById(params?.id as string);
  
  if (!post) {
    return {
      notFound: true,
    };
  }
  
  return {
    props: {
      post,
    },
    // 10초마다 페이지를 재생성 (필요에 따라 조정 가능)
    revalidate: 10,
  };
};

export default BlogPostPage;