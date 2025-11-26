import fs from 'fs';
import path from 'path';
import { ViewTracker, ViewRecord } from '../types/blog';

const viewsDirectory = path.join(process.cwd(), 'data', 'views');
const viewsFilePath = path.join(viewsDirectory, 'views.json');

// 조회수 데이터 디렉토리 초기화
function ensureViewsDirectory(): void {
  if (!fs.existsSync(viewsDirectory)) {
    fs.mkdirSync(viewsDirectory, { recursive: true });
  }
  
  if (!fs.existsSync(viewsFilePath)) {
    fs.writeFileSync(viewsFilePath, JSON.stringify({}, null, 2));
  }
}

// 모든 조회 기록 가져오기
function getViewTracker(): ViewTracker {
  ensureViewsDirectory();
  
  try {
    const data = fs.readFileSync(viewsFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading views file:', error);
    return {};
  }
}

// 조회 기록 저장
function saveViewTracker(tracker: ViewTracker): void {
  ensureViewsDirectory();
  fs.writeFileSync(viewsFilePath, JSON.stringify(tracker, null, 2));
}

// 특정 게시글의 조회 기록 가져오기
export function getPostViewRecords(postId: string): ViewRecord[] {
  const tracker = getViewTracker();
  return tracker[postId] || [];
}

// 중복 조회 확인 (IP 또는 사용자 ID 기반)
export function hasViewed(
  postId: string,
  ip: string,
  userId?: string
): boolean {
  const records = getPostViewRecords(postId);
  
  // 24시간 이내 조회 기록만 확인 (선택적)
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  
  return records.some(record => {
    const recordTime = new Date(record.timestamp).getTime();
    
    // 24시간 이내의 기록만 체크
    if (recordTime < oneDayAgo) {
      return false;
    }
    
    // 로그인한 사용자의 경우 userId로 확인
    if (userId && record.userId === userId) {
      return true;
    }
    
    // IP로 확인
    if (record.ip === ip) {
      return true;
    }
    
    return false;
  });
}

// 조회 기록 추가
export function addViewRecord(
  postId: string,
  ip: string,
  userId?: string
): { success: boolean; error?: string } {
  try {
    // 이미 조회한 경우
    if (hasViewed(postId, ip, userId)) {
      return { success: false, error: 'Already viewed' };
    }
    
    const tracker = getViewTracker();
    
    if (!tracker[postId]) {
      tracker[postId] = [];
    }
    
    const newRecord: ViewRecord = {
      postId,
      ip,
      userId,
      timestamp: new Date().toISOString(),
    };
    
    tracker[postId].push(newRecord);
    
    // 30일 이상 된 기록은 삭제 (용량 관리)
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    tracker[postId] = tracker[postId].filter(record => {
      const recordTime = new Date(record.timestamp).getTime();
      return recordTime >= thirtyDaysAgo;
    });
    
    saveViewTracker(tracker);
    
    return { success: true };
  } catch (error) {
    console.error('Error adding view record:', error);
    return { success: false, error: 'Failed to add view record' };
  }
}

// 특정 게시글의 고유 조회수 계산
export function getUniqueViewCount(postId: string): number {
  const records = getPostViewRecords(postId);
  
  // 고유 IP와 고유 사용자 ID를 합산
  const uniqueIps = new Set<string>();
  const uniqueUserIds = new Set<string>();
  
  records.forEach(record => {
    uniqueIps.add(record.ip);
    if (record.userId) {
      uniqueUserIds.add(record.userId);
    }
  });
  
  // IP 기반 조회수를 기본으로 사용
  return uniqueIps.size;
}

// 오래된 조회 기록 정리 (유지보수용)
export function cleanupOldRecords(): void {
  try {
    const tracker = getViewTracker();
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    
    Object.keys(tracker).forEach(postId => {
      tracker[postId] = tracker[postId].filter(record => {
        const recordTime = new Date(record.timestamp).getTime();
        return recordTime >= thirtyDaysAgo;
      });
      
      // 빈 배열이면 삭제
      if (tracker[postId].length === 0) {
        delete tracker[postId];
      }
    });
    
    saveViewTracker(tracker);
  } catch (error) {
    console.error('Error cleaning up old records:', error);
  }
}
