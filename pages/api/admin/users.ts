import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { getAllUsers, updateUserRole, deleteUser, getUserStats } from '../../../lib/users';
import { UserRole } from '../../../types/roles';
import { UserManagementApiResponse } from '../../../types/user';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UserManagementApiResponse>
) {
  try {
    // 세션 확인
    const session = await getServerSession(req, res, authOptions);
    
    if (!session || !session.user?.email) {
      return res.status(401).json({ 
        success: false,
        message: '로그인이 필요합니다.' 
      });
    }

    // 관리자 권한 확인
    const permissions = (session as any).permissions;
    if (!permissions || !permissions.canDelete) {
      return res.status(403).json({ 
        success: false,
        message: '관리자 권한이 필요합니다.' 
      });
    }

    // GET: 모든 사용자 조회
    if (req.method === 'GET') {
      const users = getAllUsers();
      const stats = getUserStats();
      
      return res.status(200).json({ 
        success: true,
        message: '사용자 목록을 조회했습니다.',
        users,
        ...(req.query.stats === 'true' && { stats }),
      } as any);
    }

    // PUT: 사용자 역할 업데이트
    if (req.method === 'PUT') {
      const { email, role } = req.body;

      if (!email || !role) {
        return res.status(400).json({ 
          success: false,
          message: '이메일과 역할이 필요합니다.' 
        });
      }

      // 유효한 역할인지 확인
      if (!Object.values(UserRole).includes(role)) {
        return res.status(400).json({ 
          success: false,
          message: '유효하지 않은 역할입니다.' 
        });
      }

      // 자기 자신의 역할은 변경할 수 없음
      if (email === session.user.email) {
        return res.status(403).json({ 
          success: false,
          message: '자기 자신의 역할은 변경할 수 없습니다.' 
        });
      }

      const result = updateUserRole(email, role);

      if (result.success) {
        return res.status(200).json({ 
          success: true,
          message: '사용자 역할이 업데이트되었습니다. 변경사항을 적용하려면 해당 사용자가 다시 로그인해야 합니다.' 
        });
      } else {
        return res.status(500).json({ 
          success: false,
          message: result.error || '역할 업데이트 중 오류가 발생했습니다.' 
        });
      }
    }

    // DELETE: 사용자 삭제
    if (req.method === 'DELETE') {
      const { email } = req.query;

      if (!email || typeof email !== 'string') {
        return res.status(400).json({ 
          success: false,
          message: '이메일이 필요합니다.' 
        });
      }

      // 자기 자신은 삭제할 수 없음
      if (email === session.user.email) {
        return res.status(403).json({ 
          success: false,
          message: '자기 자신은 삭제할 수 없습니다.' 
        });
      }

      const result = deleteUser(email);

      if (result.success) {
        return res.status(200).json({ 
          success: true,
          message: '사용자가 삭제되었습니다.' 
        });
      } else {
        return res.status(500).json({ 
          success: false,
          message: result.error || '사용자 삭제 중 오류가 발생했습니다.' 
        });
      }
    }

    // 지원하지 않는 메서드
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    return res.status(405).json({ 
      success: false,
      message: `Method ${req.method} Not Allowed` 
    });

  } catch (error) {
    console.error('User management API error:', error);
    return res.status(500).json({ 
      success: false,
      message: '서버 내부 오류가 발생했습니다.' 
    });
  }
}