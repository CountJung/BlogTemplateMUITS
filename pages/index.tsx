import React, { useState } from 'react';
import type { NextPage, GetServerSideProps } from 'next';
import {
  Typography,
  Box,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  Pagination,
  Stack,
} from '@mui/material';
import {
  CalendarToday as DateIcon,
  Person as AuthorIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { getPublicPostPage } from '../lib/public-posts';
import { getServerSession } from 'next-auth';
import { authOptions } from './api/auth/[...nextauth]';
import { HomePageProps, PostSummary } from '../types/blog';
import { useLanguage } from '../contexts/LanguageContext';
import ScrollToTop from '../components/ScrollToTop';

const HomePage: NextPage<HomePageProps> = ({
  posts: filteredPosts, currentPage: initialPage, totalPages, totalPosts,
  search, selectedTag: initialTag, allTags,
}) => {
  const router = useRouter();
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState(search);
  const [selectedTag, setSelectedTag] = useState(initialTag);
  const canDeletePost = (post: PostSummary): boolean => post.canManage;

  React.useEffect(() => { setSearchTerm(search); setSelectedTag(initialTag); }, [search, initialTag]);
  React.useEffect(() => {
    if (searchTerm === search && selectedTag === initialTag) return;
    const timer = setTimeout(() => {
      router.push({ pathname: '/', query: { q: searchTerm, tag: selectedTag, page: 1 } });
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm, selectedTag, search, initialTag, router]);

  const handleQuickDelete = async (postId: string, postTitle: string) => {
    if (!confirm(t('confirmDeletePost', { title: postTitle }))) {
      return;
    }

    try {
      const response = await fetch(`/api/delete-post?id=${postId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        alert(t('success'));
        // 페이지 새로고침으로 목록 업데이트
        router.reload();
      } else {
        alert(data.message || t('error'));
      }
    } catch (error) {
      console.error('Delete post error:', error);
      alert(t('error'));
    }
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, page: number) => {
    router.push({ pathname: '/', query: { q: search, tag: initialTag, page } });
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        {t('blogTitle')}
      </Typography>

      {/* 검색 및 필터 */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
          <Box sx={{ flex: 1 }}>
            <TextField
              fullWidth
              placeholder={t('searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              size="small"
            />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                label={t('all')}
                onClick={() => setSelectedTag('')}
                color={selectedTag === '' ? 'primary' : 'default'}
                variant={selectedTag === '' ? 'filled' : 'outlined'}
                size="small"
              />
              {allTags.map(tag => (
                <Chip
                  key={tag}
                  label={tag}
                  onClick={() => setSelectedTag(tag)}
                  color={selectedTag === tag ? 'primary' : 'default'}
                  variant={selectedTag === tag ? 'filled' : 'outlined'}
                  size="small"
                />
              ))}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* 게시글 목록 */}
      <Box sx={{ mb: 4 }}>
        {filteredPosts.map(post => (
            <Card key={post.id} sx={{ mb: 3, p: 2 }}>
              <CardContent>
                <Typography variant="h5" component="h2" gutterBottom>
                  <Link 
                    href={`/blog/${post.id}`} 
                    style={{ 
                      textDecoration: 'none', 
                      color: 'inherit'
                    }}
                  >
                    {post.title}
                  </Link>
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
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
                      {t('viewsCount', { count: post.views })}
                    </Typography>
                  </Box>
                </Box>

                <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                  {post.excerpt}
                </Typography>

                {post.tags.length > 0 && (
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                    {post.tags.map(tag => (
                      <Chip 
                        key={tag} 
                        label={tag} 
                        size="small" 
                        variant="outlined"
                        onClick={() => setSelectedTag(tag)}
                        sx={{ cursor: 'pointer' }}
                      />
                    ))}
                  </Box>
                )}
              </CardContent>

              <CardActions sx={{ justifyContent: 'space-between' }}>
                <Button
                  component={Link}
                  href={`/blog/${post.id}`}
                  size="small"
                  color="primary"
                  variant="outlined"
                >
                  {t('readMore')}
                </Button>
                
                {canDeletePost(post) && (
                  <Tooltip title={t('deletePostTooltip')}>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={(e) => {
                        e.preventDefault();
                        handleQuickDelete(post.id, post.title);
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                )}
              </CardActions>
            </Card>
        ))}
      </Box>
      
      {filteredPosts.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary">
            {searchTerm || selectedTag ? t('noResults') : t('noPosts')}
          </Typography>
        </Box>
      )}

      {totalPages > 1 && (
        <Stack spacing={2} alignItems="center" sx={{ mt: 4 }}>
          <Typography variant="body2" color="text.secondary">{t('totalPosts', { count: totalPosts })}</Typography>
          <Pagination count={totalPages} page={initialPage} onChange={handlePageChange}
            color="primary" size="large" showFirstButton showLastButton />
        </Stack>
      )}

      {/* 맨 위로 가기 버튼 */}
      <ScrollToTop />
    </Box>
  );
};

export const getServerSideProps: GetServerSideProps<HomePageProps> = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);
  context.res.setHeader('Cache-Control', 'private, no-store');
  return { props: getPublicPostPage(context.query, session?.user?.email) };
};

export default HomePage;