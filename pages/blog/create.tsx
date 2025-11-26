import React, { useState } from 'react';
import type { NextPage } from 'next';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Chip,
  Grid,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Save as SaveIcon,
  Preview as PreviewIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { CreatePostPageState, FileAttachment } from '../../types/blog';
import FileUploader from '../../components/FileUploader';
import { useLanguage } from '../../contexts/LanguageContext';

const CreatePostPage: NextPage = () => {
  const { t } = useLanguage();
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [formData, setFormData] = useState<CreatePostPageState['formData']>({
    id: '',
    title: '',
    content: '',
    excerpt: '',
    author: '',
    tags: [],
    attachments: [],
  });
  
  const [newTag, setNewTag] = useState<string>('');
  const [isPreview, setIsPreview] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // 로그인하지 않은 경우 로그인 페이지로 리디렉션
  // 글쓰기 권한이 없는 경우 메인 페이지로 리디렉션
  React.useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    } else if (status === 'authenticated' && session?.permissions && !session.permissions.canWrite) {
      router.push('/');
    }
  }, [status, session, router]);

  const handleInputChange = (field: keyof CreatePostPageState['formData'], value: string) => {
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
      // ID 생성 (제목을 기반으로 URL-safe한 형태로)
      const id = formData.title
        .toLowerCase()
        .replace(/[^a-z0-9가-힣]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') + '-' + Date.now();

      const postData = {
        id,
        title: formData.title,
        content: formData.content,
        excerpt: formData.excerpt || formData.content.substring(0, 200) + '...',
        tags: formData.tags,
        author: session?.user?.name || t('anonymous'),
        date: new Date().toISOString().split('T')[0],
        views: 0,
        attachments: formData.attachments || [],
      };

      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData),
      });

      if (response.ok) {
        setSuccess(t('postCreated'));
        setTimeout(() => {
          router.push(`/blog/${id}`);
        }, 1500);
      } else {
        const errorData = await response.json();
        setError(errorData.message || t('errorCreatingPost'));
      }
    } catch (error) {
      setError(t('networkError'));
      console.error('Error saving post:', error);
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
    return null; // 리디렉션 중
  }

  // 글쓰기 권한이 없는 경우
  if (session.permissions && !session.permissions.canWrite) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <Alert severity="warning">
          글쓰기 권한이 없습니다. 관리자에게 문의하세요.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        {t('createNewPost')}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Box sx={{
        display: 'grid',
        gridTemplateColumns: isPreview ? { xs: '1fr', md: '1fr 1fr' } : '1fr',
        gap: 3
      }}>
        {/* 입력 폼 */}
        <Box>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              {t('postInfo')}
            </Typography>

            <TextField
              fullWidth
              label={t('title')}
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              margin="normal"
              required
            />

            <TextField
              fullWidth
              label={`${t('excerpt')} (${t('optional')})`}
              value={formData.excerpt}
              onChange={(e) => handleInputChange('excerpt', e.target.value)}
              margin="normal"
              multiline
              rows={2}
              helperText={t('excerptHelper')}
            />

            {/* 태그 입력 */}
            <Box sx={{ mt: 2, mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                {t('tags')}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                {formData.tags.map((tag: string) => (
                  <Chip
                    key={tag}
                    label={tag}
                    onDelete={() => handleRemoveTag(tag)}
                    color="primary"
                    variant="outlined"
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
                />
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleAddTag}
                  startIcon={<AddIcon />}
                >
                  {t('add')}
                </Button>
              </Box>
            </Box>

            <TextField
              fullWidth
              label={`${t('content')} (Markdown)`}
              value={formData.content}
              onChange={(e) => handleInputChange('content', e.target.value)}
              margin="normal"
              multiline
              rows={15}
              required
              helperText={t('markdownHelper')}
            />

            {/* 파일 업로더 */}
            <FileUploader
              attachments={formData.attachments || []}
              onAttachmentsChange={(attachments: FileAttachment[]) => 
                setFormData(prev => ({ ...prev, attachments }))
              }
              maxFiles={5}
            />

            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={!formData.title.trim() || !formData.content.trim() || isLoading}
                startIcon={isLoading ? <CircularProgress size={20} /> : <SaveIcon />}
              >
                {isLoading ? t('saving') : t('save')}
              </Button>
              
              <Button
                variant="outlined"
                onClick={() => setIsPreview(!isPreview)}
                startIcon={<PreviewIcon />}
              >
                {isPreview ? t('hidePreview') : t('preview')}
              </Button>
            </Box>
          </Paper>
        </Box>

        {/* 미리보기 */}
        {isPreview && (
          <Box>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                {t('preview')}
              </Typography>
              
              <Typography variant="h5" component="h2" gutterBottom>
                {formData.title || t('titlePlaceholder')}
              </Typography>

              {formData.tags.length > 0 && (
                <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {formData.tags.map((tag: string) => (
                    <Chip key={tag} label={tag} size="small" color="primary" />
                  ))}
                </Box>
              )}

              <Box
                sx={{
                  '& h1, & h2, & h3, & h4, & h5, & h6': {
                    mt: 2,
                    mb: 1,
                  },
                  '& p': {
                    mb: 1,
                  },
                  '& pre': {
                    backgroundColor: '#f5f5f5',
                    p: 2,
                    borderRadius: 1,
                    overflow: 'auto',
                  },
                  '& code': {
                    backgroundColor: '#f5f5f5',
                    padding: '2px 4px',
                    borderRadius: 1,
                    fontSize: '0.875em',
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
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default CreatePostPage;