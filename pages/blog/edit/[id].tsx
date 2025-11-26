import React, { useState, useEffect } from 'react';
import type { NextPage, GetServerSideProps } from 'next';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Save as SaveIcon,
  Preview as PreviewIcon,
  Add as AddIcon,
  ArrowBack as BackIcon,
} from '@mui/icons-material';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { getPostById } from '../../../lib/posts';
import { BlogPost, FileAttachment } from '../../../types/blog';
import FileUploader from '../../../components/FileUploader';
import { useLanguage } from '../../../contexts/LanguageContext';
import 'highlight.js/styles/github-dark.css';

interface EditPostPageProps {
  post: BlogPost | null;
}

const EditPostPage: NextPage<EditPostPageProps> = ({ post }) => {
  const { t } = useLanguage();
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    excerpt: '',
    tags: [] as string[],
    attachments: [] as FileAttachment[],
  });
  
  const [newTag, setNewTag] = useState<string>('');
  const [isPreview, setIsPreview] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // 게시글 데이터 로드
  useEffect(() => {
    if (post) {
      setFormData({
        title: post.title,
        content: post.content,
        excerpt: post.excerpt || '',
        tags: post.tags || [],
        attachments: post.attachments || [],
      });
    }
  }, [post]);

  // 로그인 및 권한 확인
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    } else if (status === 'authenticated' && session?.user?.email && post) {
      const isAdmin = (session as any).isAdmin || false;
      const isAuthor = post.authorEmail === session.user.email;

      if (!isAdmin && !isAuthor) {
        router.push('/');
      }
    }
  }, [status, session, post, router]);

  if (!post) {
    return (
      <Box textAlign="center" py={8}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {t('postNotFound')}
        </Alert>
        <Button
          component={Link}
          href="/"
          variant="outlined"
          startIcon={<BackIcon />}
        >
          {t('backToHome')}
        </Button>
      </Box>
    );
  }

  const handleInputChange = (field: keyof typeof formData, value: string | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()],
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove),
    }));
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/posts/${post.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          content: formData.content,
          excerpt: formData.excerpt || formData.content.substring(0, 200) + '...',
          tags: formData.tags,
          attachments: formData.attachments,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(t('postUpdated'));
        setTimeout(() => {
          router.push(`/blog/${post.id}`);
        }, 1500);
      } else {
        setError(data.message || t('errorUpdatingPost'));
      }
    } catch (error) {
      setError(t('networkError'));
      console.error('Update post error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          {t('editPost')}
        </Typography>
        <Button
          component={Link}
          href={`/blog/${post.id}`}
          startIcon={<BackIcon />}
        >
          {t('back')}
        </Button>
      </Box>

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

      <Box sx={{ display: 'grid', gridTemplateColumns: isPreview ? { xs: '1fr', md: '1fr 1fr' } : '1fr', gap: 3 }}>
        <Paper sx={{ p: 3 }}>
            <Box sx={{ mb: 3 }}>
              <TextField
                fullWidth
                label={t('title')}
                variant="outlined"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                disabled={isLoading}
                required
              />
            </Box>

            <Box sx={{ mb: 3 }}>
              <TextField
                fullWidth
                label={t('content')}
                variant="outlined"
                multiline
                rows={15}
                value={formData.content}
                onChange={(e) => handleInputChange('content', e.target.value)}
                disabled={isLoading}
                required
                placeholder={t('markdownHelper')}
              />
            </Box>

            <Box sx={{ mb: 3 }}>
              <TextField
                fullWidth
                label={`${t('excerpt')} (${t('optional')})`}
                variant="outlined"
                multiline
                rows={3}
                value={formData.excerpt}
                onChange={(e) => handleInputChange('excerpt', e.target.value)}
                disabled={isLoading}
                placeholder={t('excerptHelper')}
              />
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                {t('tags')}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                {formData.tags.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    onDelete={() => handleRemoveTag(tag)}
                    color="primary"
                    disabled={isLoading}
                  />
                ))}
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  size="small"
                  placeholder={t('tagPlaceholder')}
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  disabled={isLoading}
                />
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={handleAddTag}
                  disabled={isLoading}
                >
                  {t('add')}
                </Button>
              </Box>
            </Box>

            {/* 파일 업로더 */}
            <FileUploader
              attachments={formData.attachments}
              onAttachmentsChange={(attachments: FileAttachment[]) => 
                setFormData(prev => ({ ...prev, attachments }))
              }
              maxFiles={5}
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                startIcon={isLoading ? <CircularProgress size={20} /> : <SaveIcon />}
                onClick={handleSubmit}
                disabled={isLoading || !formData.title || !formData.content}
                fullWidth
              >
                {isLoading ? t('saving') : t('editPost')}
              </Button>
              <Button
                variant="outlined"
                startIcon={<PreviewIcon />}
                onClick={() => setIsPreview(!isPreview)}
                disabled={isLoading}
              >
                {isPreview ? t('edit') : t('preview')}
              </Button>
            </Box>
          </Paper>

        {isPreview && (
          <Paper sx={{ p: 3, position: 'sticky', top: 20 }}>
              <Typography variant="h5" gutterBottom>
                {t('preview')}
              </Typography>
              <Typography variant="h4" gutterBottom sx={{ mt: 2 }}>
                {formData.title || t('noTitle')}
              </Typography>
              <Box sx={{ mb: 2 }}>
                {formData.tags.map((tag) => (
                  <Chip key={tag} label={tag} size="small" sx={{ mr: 1 }} />
                ))}
              </Box>
              <Box
                sx={{
                  '& h1': { fontSize: '2rem', fontWeight: 'bold', mt: 4, mb: 2, color: 'primary.main' },
                  '& h2': { fontSize: '1.5rem', fontWeight: 'bold', mt: 3, mb: 2 },
                  '& h3': { fontSize: '1.25rem', fontWeight: 'bold', mt: 2, mb: 1 },
                  '& p': { mb: 2, lineHeight: 1.8 },
                  '& ul, & ol': { pl: 3, mb: 2 },
                  '& li': { mb: 1 },
                  '& code': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    padding: '2px 6px',
                    borderRadius: 1,
                    fontFamily: 'Consolas, Monaco, monospace',
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
                  {formData.content || `*${t('contentPlaceholder')}*`}
                </ReactMarkdown>
              </Box>
            </Paper>
        )}
      </Box>
    </Box>
  );
};

export const getServerSideProps: GetServerSideProps<EditPostPageProps> = async (context) => {
  const { id } = context.params as { id: string };
  const post = getPostById(id);

  if (!post) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      post,
    },
  };
};

export default EditPostPage;
