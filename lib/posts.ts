import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { BlogPost, PostFormData, PostSaveResult } from '../types/blog';

const postsDirectory = path.join(process.cwd(), 'content', 'posts');

interface PostPathParams {
  params: {
    id: string;
  };
}

// 날짜 기반 폴더 경로 생성 (YYYY/MM/DD)
function getDateBasedPath(date: string): string {
  const [year, month, day] = date.split('-');
  return path.join(postsDirectory, year, month, day);
}

// 모든 마크다운 파일을 재귀적으로 찾기
function findAllMarkdownFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }

  let files: string[] = [];
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // 하위 디렉토리 재귀 탐색
      files = files.concat(findAllMarkdownFiles(fullPath));
    } else if (item.endsWith('.md')) {
      files.push(fullPath);
    }
  }

  return files;
}

// ID로 게시글 파일 경로 찾기 (전체 폴더 검색)
function findPostPath(id: string): string | null {
  const allFiles = findAllMarkdownFiles(postsDirectory);
  const targetFile = `${id}.md`;
  
  for (const filePath of allFiles) {
    if (filePath.endsWith(targetFile)) {
      return filePath;
    }
  }
  
  return null;
}

// 모든 게시글 가져오기 (재귀적으로 모든 하위 폴더 탐색)
export function getAllPosts(): BlogPost[] {
  // content/posts 디렉토리가 없으면 빈 배열 반환
  if (!fs.existsSync(postsDirectory)) {
    return [];
  }

  const allFiles = findAllMarkdownFiles(postsDirectory);
  const allPostsData = allFiles.map((fullPath): BlogPost => {
    const fileName = path.basename(fullPath);
    const id = fileName.replace(/\.md$/, '');
    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const matterResult = matter(fileContents);

    return {
      id,
      title: matterResult.data.title || '',
      author: matterResult.data.author || 'Unknown',
      date: matterResult.data.date || new Date().toISOString().split('T')[0],
      tags: matterResult.data.tags || [],
      views: matterResult.data.views || 0,
      content: matterResult.content,
      excerpt: matterResult.data.excerpt || matterResult.content.substring(0, 200) + '...',
      ...matterResult.data,
    };
  });

  // 날짜순으로 정렬 (최신순)
  return allPostsData.sort((a, b) => {
    // 먼저 날짜로 비교
    const dateCompare = b.date.localeCompare(a.date);
    if (dateCompare !== 0) {
      return dateCompare;
    }
    
    // 날짜가 같으면 ID의 타임스탬프로 비교 (ID는 보통 title-timestamp 형식)
    // 타임스탬프 추출 (마지막 하이픈 뒤의 숫자)
    const getTimestamp = (id: string): number => {
      const parts = id.split('-');
      const lastPart = parts[parts.length - 1];
      const timestamp = parseInt(lastPart);
      return isNaN(timestamp) ? 0 : timestamp;
    };
    
    return getTimestamp(b.id) - getTimestamp(a.id);
  });
}

// 특정 게시글 가져오기 (전체 폴더에서 검색)
export function getPostById(id: string): BlogPost | null {
  try {
    const fullPath = findPostPath(id);
    
    if (!fullPath || !fs.existsSync(fullPath)) {
      return null;
    }

    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const matterResult = matter(fileContents);

    return {
      id,
      title: matterResult.data.title || '',
      author: matterResult.data.author || 'Unknown',
      date: matterResult.data.date || new Date().toISOString().split('T')[0],
      tags: matterResult.data.tags || [],
      views: matterResult.data.views || 0,
      content: matterResult.content,
      excerpt: matterResult.data.excerpt || matterResult.content.substring(0, 200) + '...',
      ...matterResult.data,
    };
  } catch (error) {
    console.error('Error reading post:', error);
    return null;
  }
}

// 조회수 증가
export function incrementViews(id: string): PostSaveResult {
  try {
    const post = getPostById(id);
    
    if (!post) {
      return { success: false, error: 'Post not found' };
    }

    const fullPath = findPostPath(id);
    if (!fullPath) {
      return { success: false, error: 'Post file not found' };
    }

    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const matterResult = matter(fileContents);

    // 조회수 증가
    const newViews = (matterResult.data.views || 0) + 1;
    matterResult.data.views = newViews;

    // 파일 저장
    const fileContent = matter.stringify(matterResult.content, matterResult.data);
    fs.writeFileSync(fullPath, fileContent);

    return { success: true, id };
  } catch (error) {
    console.error('Error incrementing views:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// 모든 게시글 ID 가져오기 (getStaticPaths용)
export function getAllPostIds(): PostPathParams[] {
  if (!fs.existsSync(postsDirectory)) {
    return [];
  }

  const fileNames = fs.readdirSync(postsDirectory);
  return fileNames
    .filter(name => name.endsWith('.md'))
    .map((fileName): PostPathParams => {
      return {
        params: {
          id: fileName.replace(/\.md$/, ''),
        },
      };
    });
}

// 게시글 검색
export function searchPosts(query: string): BlogPost[] {
  const allPosts = getAllPosts();
  
  if (!query) {
    return allPosts;
  }

  const searchQuery = query.toLowerCase();
  
  return allPosts.filter(post => {
    const title = post.title?.toLowerCase() || '';
    const excerpt = post.excerpt?.toLowerCase() || '';
    const tags = post.tags?.join(' ').toLowerCase() || '';
    const content = post.content?.toLowerCase() || '';
    
    return title.includes(searchQuery) || 
           excerpt.includes(searchQuery) || 
           tags.includes(searchQuery) ||
           content.includes(searchQuery);
  });
}

// 태그별 게시글 필터링
export function getPostsByTag(tag: string): BlogPost[] {
  const allPosts = getAllPosts();
  
  if (!tag) {
    return allPosts;
  }
  
  return allPosts.filter(post => 
    post.tags && post.tags.includes(tag)
  );
}

// 게시글 저장 (새 게시글 작성) - 날짜 기반 폴더 구조
export function savePost(postData: PostFormData): PostSaveResult {
  try {
    const { id, content, date, ...frontmatter } = postData;
    
    // 날짜가 없으면 현재 날짜 사용
    const postDate = date || new Date().toISOString().split('T')[0];
    
    // 날짜 기반 폴더 경로 생성 (YYYY/MM/DD)
    const datePath = getDateBasedPath(postDate);
    
    // 디렉토리가 없으면 생성
    if (!fs.existsSync(datePath)) {
      fs.mkdirSync(datePath, { recursive: true });
    }

    const fullPath = path.join(datePath, `${id}.md`);
    
    // Front matter와 content를 결합 (date 포함)
    const fileContent = matter.stringify(content, { ...frontmatter, date: postDate });
    
    fs.writeFileSync(fullPath, fileContent);
    
    return { success: true, id };
  } catch (error) {
    console.error('Error saving post:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// 게시글 수정
export function updatePost(id: string, postData: PostFormData): PostSaveResult {
  try {
    const fullPath = findPostPath(id);
    
    // 기존 게시글이 존재하는지 확인
    if (!fullPath || !fs.existsSync(fullPath)) {
      return { success: false, error: 'Post not found' };
    }

    const { content, ...frontmatter } = postData;
    
    // Front matter와 content를 결합
    const fileContent = matter.stringify(content, frontmatter);
    
    fs.writeFileSync(fullPath, fileContent);
    
    return { success: true, id };
  } catch (error) {
    console.error('Error updating post:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// 게시글 삭제
export function deletePost(id: string): PostSaveResult {
  try {
    const fullPath = findPostPath(id);
    
    if (!fullPath || !fs.existsSync(fullPath)) {
      return { success: false, error: 'Post not found' };
    }

    // 게시글 정보를 가져와서 첨부파일 확인
    const post = getPostById(id);
    
    // 첨부파일이 있으면 삭제
    if (post && post.attachments && post.attachments.length > 0) {
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
      const uploadsDirResolved = path.resolve(uploadsDir);
      
      post.attachments.forEach(attachment => {
        try {
          // url: /api/files/<relativePath>
          let relativePath = '';
          if (typeof attachment.url === 'string') {
            const marker = '/api/files/';
            const idx = attachment.url.indexOf(marker);
            if (idx >= 0) {
              relativePath = attachment.url.slice(idx + marker.length);
            }
          }

          // 호환성: 예전(flat) 구조는 filename만 있을 수 있음
          if (!relativePath && attachment.filename) {
            relativePath = attachment.filename;
          }

          relativePath = relativePath.replace(/^\/+/, '');
          if (!relativePath) {
            return;
          }

          const filePathResolved = path.resolve(uploadsDirResolved, ...relativePath.split('/'));
          if (!filePathResolved.startsWith(uploadsDirResolved + path.sep)) {
            return;
          }

          if (fs.existsSync(filePathResolved)) {
            fs.unlinkSync(filePathResolved);
            console.log(`Deleted attachment: ${relativePath}`);
          }
        } catch (fileError) {
          console.error(`Error deleting attachment file:`, fileError);
          // 첨부파일 삭제 실패해도 게시글 삭제는 계속 진행
        }
      });
    }

    // 게시글 파일 삭제
    fs.unlinkSync(fullPath);
    return { success: true };
  } catch (error) {
    console.error('Error deleting post:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// 페이지네이션을 위한 게시글 가져오기
export function getPaginatedPosts(page: number = 1, postsPerPage: number = 5) {
  const allPosts = getAllPosts();
  const totalPosts = allPosts.length;
  const totalPages = Math.ceil(totalPosts / postsPerPage);
  const startIndex = (page - 1) * postsPerPage;
  const endIndex = startIndex + postsPerPage;
  const posts = allPosts.slice(startIndex, endIndex);

  return {
    posts,
    currentPage: page,
    totalPages,
    totalPosts,
    postsPerPage,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}