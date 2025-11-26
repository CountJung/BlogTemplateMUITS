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
  Fab,
  Zoom,
  useScrollTrigger,
} from '@mui/material';
import {
  CalendarToday as DateIcon,
  Person as AuthorIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  Delete as DeleteIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { getPaginatedPosts, getAllPosts } from '../lib/posts';
import { HomePageProps, BlogPost } from '../types/blog';
import { useLanguage } from '../contexts/LanguageContext';

const HomePage: NextPage<HomePageProps> = ({ 
  posts: allPosts, // 전체 게시글 (검색용)
  paginatedPosts, // 페이지네이션된 게시글 (기본 표시용)
  currentPage: initialPage,
  totalPages,
  totalPosts 
}) => {
  const { data: session } = useSession();
  const router = useRouter();
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [filteredPage, setFilteredPage] = useState<number>(1);
  
  // 스크롤 트리거 (맨 위로 가기 버튼용)
  const trigger = useScrollTrigger({
    disableHysteresis: true,
    threshold: 100,
  });

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };
  
  // 삭제 권한 확인 함수 (Admin은 모든 글, Writer는 자신의 글만)
  const canDeletePost = (post: BlogPost): boolean => {
    if (!session?.user?.email) return false;
    
    const isAdmin = session.permissions?.canDelete || false;
    const isAuthor = post.authorEmail === session.user.email;
    
    return isAdmin || isAuthor;
  };

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

  // 검색 및 필터링
  const isSearchActive = searchTerm || selectedTag;
  const allFilteredPosts = allPosts.filter(post => {
    const matchesSearch = !searchTerm || 
      post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.author.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTag = !selectedTag || post.tags.includes(selectedTag);
    
    return matchesSearch && matchesTag;
  });

  // 검색 결과 페이지네이션
  const postsPerPage = 10;
  const totalFilteredPosts = allFilteredPosts.length;
  const totalFilteredPages = Math.ceil(totalFilteredPosts / postsPerPage);
  const startIndex = (filteredPage - 1) * postsPerPage;
  const endIndex = startIndex + postsPerPage;
  const filteredPosts = isSearchActive ? allFilteredPosts.slice(startIndex, endIndex) : (paginatedPosts || []);

  // 모든 태그 추출 (검색용으로 전체 게시글 사용)
  const allTags = Array.from(new Set(allPosts.flatMap(post => post.tags)));

  // 검색어나 태그 변경 시 페이지를 1로 리셋
  React.useEffect(() => {
    setFilteredPage(1);
  }, [searchTerm, selectedTag]);

  // 페이지 변경 핸들러
  const handlePageChange = (_event: React.ChangeEvent<unknown>, page: number) => {
    router.push(`/?page=${page}`);
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

      {/* 페이지네이션 */}
      {isSearchActive ? (
        totalFilteredPages > 1 && (
          <Stack spacing={2} alignItems="center" sx={{ mt: 4 }}>
            <Typography variant="body2" color="text.secondary">
              {t('searchResults', { count: totalFilteredPosts })}
            </Typography>
            <Pagination
              count={totalFilteredPages}
              page={filteredPage}
              onChange={(_event, page) => setFilteredPage(page)}
              color="primary"
              size="large"
              showFirstButton
              showLastButton
            />
          </Stack>
        )
      ) : (
        totalPages > 1 && (
          <Stack spacing={2} alignItems="center" sx={{ mt: 4 }}>
            <Typography variant="body2" color="text.secondary">
              {t('totalPosts', { count: totalPosts })}
            </Typography>
            <Pagination
              count={totalPages}
              page={initialPage}
              onChange={handlePageChange}
              color="primary"
              size="large"
              showFirstButton
              showLastButton
            />
          </Stack>
        )
      )}

      {/* 맨 위로 가기 버튼 */}
      <Zoom in={trigger}>
        <Box
          onClick={scrollToTop}
          role="presentation"
          sx={{ position: 'fixed', bottom: 16, right: 16, zIndex: 1000 }}
        >
          <Fab color="primary" size="medium" aria-label="scroll back to top">
            <KeyboardArrowUpIcon />
          </Fab>
        </Box>
      </Zoom>
    </Box>
  );
};

export const getServerSideProps = async (context: any) => {
  const page = Number(context.query?.page) || 1;
  const postsPerPage = 10;
  
  // 검색/필터를 위해 항상 모든 게시글을 가져옴
  const allPosts = getAllPosts();
  const totalPosts = allPosts.length;
  const totalPages = Math.ceil(totalPosts / postsPerPage);
  
  // 현재 페이지의 게시글만 추출 (검색 없을 때 사용)
  const startIndex = (page - 1) * postsPerPage;
  const endIndex = startIndex + postsPerPage;
  const paginatedPosts = allPosts.slice(startIndex, endIndex);
  
  return {
    props: {
      posts: allPosts, // 전체 게시글 전달 (검색용)
      paginatedPosts: paginatedPosts, // 페이지네이션된 게시글 (기본 표시용)
      currentPage: page,
      totalPages: totalPages,
      postsPerPage: postsPerPage,
      totalPosts: totalPosts,
    },
  };
};

export default HomePage;