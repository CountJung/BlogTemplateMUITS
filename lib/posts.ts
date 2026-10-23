import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { atomicWriteText, withStoreLock } from './storage';
import { isValidPostId, validatePostInput } from './validation';
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
  if (!fs.existsSync(/* turbopackIgnore: true */ dir)) {
    return [];
  }

  let files: string[] = [];
  const items = fs.readdirSync(/* turbopackIgnore: true */ dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.lstatSync(/* turbopackIgnore: true */ fullPath);
    if (stat.isSymbolicLink()) continue;

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
  if (!isValidPostId(id)) return null;
  const allFiles = findAllMarkdownFiles(postsDirectory);
  const targetFile = `${id}.md`;
  
  for (const filePath of allFiles) {
    if (path.basename(filePath) === targetFile) {
      return filePath;
    }
  }
  
  return null;
}

// 모든 게시글 가져오기 (재귀적으로 모든 하위 폴더 탐색)
export function getAllPosts(): BlogPost[] {
  // content/posts 디렉토리가 없으면 빈 배열 반환
  if (!fs.existsSync(/* turbopackIgnore: true */ postsDirectory)) {
    return [];
  }

  const allFiles = findAllMarkdownFiles(postsDirectory);
  const allPostsData = allFiles.map((fullPath): BlogPost => {
    const fileName = path.basename(fullPath);
    const id = fileName.replace(/\.md$/, '');
    const fileContents = fs.readFileSync(/* turbopackIgnore: true */ fullPath, 'utf8');
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
    
    if (!fullPath || !fs.existsSync(/* turbopackIgnore: true */ fullPath)) {
      return null;
    }

    const fileContents = fs.readFileSync(/* turbopackIgnore: true */ fullPath, 'utf8');
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
    return withStoreLock(() => {
      const post = getPostById(id);
    
      if (!post) {
        return { success: false, error: 'Post not found' };
      }

      const fullPath = findPostPath(id);
      if (!fullPath) {
        return { success: false, error: 'Post file not found' };
      }

      const fileContents = fs.readFileSync(/* turbopackIgnore: true */ fullPath, 'utf8');
      const matterResult = matter(fileContents);

      // 조회수 증가
      const newViews = (matterResult.data.views || 0) + 1;
      matterResult.data.views = newViews;

      // 파일 저장
      const fileContent = matter.stringify(matterResult.content, matterResult.data);
      atomicWriteText(fullPath, fileContent);

      return { success: true, id };
    });
  } catch (error) {
    console.error('Error incrementing views:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// 모든 게시글 ID 가져오기 (getStaticPaths용)
export function getAllPostIds(): PostPathParams[] {
  if (!fs.existsSync(/* turbopackIgnore: true */ postsDirectory)) {
    return [];
  }

  const fileNames = findAllMarkdownFiles(postsDirectory).map(file => path.basename(file));
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
    return withStoreLock(() => {
      const invalid = validatePostInput(postData);
      if (invalid) return { success: false, error: invalid };
      const { id, content, date, ...frontmatter } = postData;
      if (findPostPath(id)) return { success: false, error: 'Post already exists' };
    
      // 날짜가 없으면 현재 날짜 사용
      const postDate = date || new Date().toISOString().split('T')[0];
    
      // 날짜 기반 폴더 경로 생성 (YYYY/MM/DD)
      const datePath = getDateBasedPath(postDate);
    
      // 디렉토리가 없으면 생성
      if (!fs.existsSync(/* turbopackIgnore: true */ datePath)) {
        fs.mkdirSync(/* turbopackIgnore: true */ datePath, { recursive: true });
      }

      const fullPath = path.join(datePath, `${id}.md`);
    
      // Front matter와 content를 결합 (date 포함)
      const fileContent = matter.stringify(content, { ...frontmatter, date: postDate });
    
      atomicWriteText(fullPath, fileContent);
    
      return { success: true, id };
    });
  } catch (error) {
    console.error('Error saving post:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// 게시글 수정
export function updatePost(id: string, postData: PostFormData): PostSaveResult {
  try {
    return withStoreLock(() => {
      const invalid = validatePostInput({ ...postData, id });
      if (invalid) return { success: false, error: invalid };
      const fullPath = findPostPath(id);
    
      // 기존 게시글이 존재하는지 확인
      if (!fullPath || !fs.existsSync(/* turbopackIgnore: true */ fullPath)) {
        return { success: false, error: 'Post not found' };
      }

      const current = getPostById(id);
      if (!current || current.authorEmail !== postData.authorEmail) return { success: false, error: 'Post owner changed' };
      const { content, ...frontmatter } = postData;
      Object.assign(frontmatter, { id, author: current.author, ...(current.authorEmail ? { authorEmail: current.authorEmail } : {}), date: current.date, views: current.views });
    
      // Front matter와 content를 결합
      const fileContent = matter.stringify(content, frontmatter);
    
      atomicWriteText(fullPath, fileContent);
    
      return { success: true, id };
    });
  } catch (error) {
    console.error('Error updating post:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// 게시글 삭제
export function deletePost(id: string, expectedOwnerEmail?: string): PostSaveResult {
  try {
    return withStoreLock(() => {
      const fullPath = findPostPath(id);
    
      if (!fullPath || !fs.existsSync(/* turbopackIgnore: true */ fullPath)) {
        return { success: false, error: 'Post not found' };
      }

      if (expectedOwnerEmail !== undefined && getPostById(id)?.authorEmail !== expectedOwnerEmail) {
        return { success: false, error: 'Post owner changed' };
      }

      // Attachments may be shared or client-referenced. Delete only the owned post;
      // file reclamation requires a separate reference/ownership check.

      // 게시글 파일 삭제
      fs.unlinkSync(/* turbopackIgnore: true */ fullPath);
      return { success: true };
    });
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