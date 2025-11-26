import { useEffect } from 'react';
import { useRouter } from 'next/router';

const BlogListPage = () => {
  const router = useRouter();

  useEffect(() => {
    // 홈페이지로 리다이렉트 (홈페이지가 이제 블로그 목록 페이지)
    router.replace('/');
  }, [router]);

  return null;
};

export default BlogListPage;