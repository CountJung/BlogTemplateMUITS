import React, { useEffect, useState } from 'react';
import type { NextPage } from 'next';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Button,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert,
  CircularProgress,
  Avatar,
  Tooltip,
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  AdminPanelSettings as AdminIcon,
  Create as WriterIcon,
  Visibility as ReaderIcon,
  Block as BannedIcon,
} from '@mui/icons-material';
import { User } from '../../types/user';
import { UserRole } from '../../types/roles';
import { useLanguage } from '../../contexts/LanguageContext';

const AdminPage: NextPage = () => {
  const { t, language } = useLanguage();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<UserRole>(UserRole.READER);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [stats, setStats] = useState({ total: 0, admins: 0, writers: 0, readers: 0, banned: 0 });

  // 권한 확인
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    } else if (status === 'authenticated' && session) {
      const permissions = (session as any).permissions;
      if (!permissions || !permissions.canDelete) {
        router.push('/');
      }
    }
  }, [status, session, router]);

  // 사용자 목록 로드
  const loadUsers = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/admin/users?stats=true');
      const data = await response.json();
      
      if (data.success) {
        setUsers(data.users || []);
        if (data.stats) {
          setStats(data.stats);
        }
      } else {
        setError(data.message || t('errorLoadingUsers'));
      }
    } catch (err) {
      setError(t('networkError'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      loadUsers();
    }
  }, [status]);

  // 역할 변경 다이얼로그 열기
  const handleEditRole = (user: User) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setDialogOpen(true);
  };

  // 역할 변경 처리
  const handleUpdateRole = async () => {
    if (!selectedUser) return;

    try {
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: selectedUser.email,
          role: newRole,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(t('userUpdated'));
        setDialogOpen(false);
        loadUsers();
      } else {
        setError(data.message || t('errorUpdatingUser'));
      }
    } catch (err) {
      setError(t('errorUpdatingUser'));
      console.error(err);
    }
  };

  // 사용자 삭제 다이얼로그 열기
  const handleDeleteClick = (user: User) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  // 사용자 삭제 처리
  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      const response = await fetch(`/api/admin/users?email=${selectedUser.email}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(t('userDeleted'));
        setDeleteDialogOpen(false);
        loadUsers();
      } else {
        setError(data.message || t('errorDeletingUser'));
      }
    } catch (err) {
      setError(t('errorDeletingUser'));
      console.error(err);
    }
  };

  // 역할 아이콘 및 색상
  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return <AdminIcon fontSize="small" />;
      case UserRole.WRITER:
        return <WriterIcon fontSize="small" />;
      case UserRole.BANNED:
        return <BannedIcon fontSize="small" />;
      default:
        return <ReaderIcon fontSize="small" />;
    }
  };

  const getRoleColor = (role: UserRole): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
    switch (role) {
      case UserRole.ADMIN:
        return 'error';
      case UserRole.WRITER:
        return 'primary';
      case UserRole.BANNED:
        return 'warning';
      default:
        return 'default';
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return t('admin');
      case UserRole.WRITER:
        return t('writer');
      case UserRole.BANNED:
        return t('banned');
      default:
        return t('reader');
    }
  };

  if (status === 'loading' || loading) {
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
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" component="h1">
          {t('userManagement')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadUsers}
            disabled={loading}
          >
            {t('refresh')}
          </Button>
        </Box>
      </Box>

      {/* 통계 카드 */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr 1fr' }, gap: 2, mb: 4 }}>
        <Card>
          <CardContent>
            <Typography color="text.secondary" gutterBottom>
              {t('totalUsers')}
            </Typography>
            <Typography variant="h4">
              {stats.total}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ bgcolor: 'error.light' }}>
          <CardContent>
            <Typography color="white" gutterBottom>
              {t('admins')}
            </Typography>
            <Typography variant="h4" color="white">
              {stats.admins}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ bgcolor: 'primary.light' }}>
          <CardContent>
            <Typography color="white" gutterBottom>
              {t('writers')}
            </Typography>
            <Typography variant="h4" color="white">
              {stats.writers}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ bgcolor: 'grey.400' }}>
          <CardContent>
            <Typography color="white" gutterBottom>
              {t('readers')}
            </Typography>
            <Typography variant="h4" color="white">
              {stats.readers}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ bgcolor: 'warning.light' }}>
          <CardContent>
            <Typography color="white" gutterBottom>
              {t('banned')}
            </Typography>
            <Typography variant="h4" color="white">
              {stats.banned}
            </Typography>
          </CardContent>
        </Card>
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

      {/* 사용자 테이블 */}
      <TableContainer 
        component={Paper}
        sx={{
          overflowX: 'auto',
          '&::-webkit-scrollbar': {
            height: '8px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'rgba(0,0,0,0.1)',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(0,0,0,0.3)',
            borderRadius: '4px',
            '&:hover': {
              backgroundColor: 'rgba(0,0,0,0.5)',
            },
          },
        }}
      >
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow>
              <TableCell>{t('user')}</TableCell>
              <TableCell>{t('email')}</TableCell>
              <TableCell>{t('role')}</TableCell>
              <TableCell>{t('lastLogin')}</TableCell>
              <TableCell>{t('joinedAt')}</TableCell>
              <TableCell align="right">{t('actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  {t('noUsers')}
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar src={user.image || undefined} alt={user.name || undefined}>
                        {user.name?.[0] || user.email[0].toUpperCase()}
                      </Avatar>
                      <Typography>{user.name || t('noName')}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Chip
                      icon={getRoleIcon(user.role)}
                      label={getRoleLabel(user.role)}
                      color={getRoleColor(user.role)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(user.lastLogin).toLocaleString(language === 'ko' ? 'ko-KR' : 'en-US')}
                  </TableCell>
                  <TableCell>
                    {new Date(user.createdAt).toLocaleDateString(language === 'ko' ? 'ko-KR' : 'en-US')}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title={t('changeRole')}>
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleEditRole(user)}
                        disabled={user.email === session.user?.email}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t('deleteUser')}>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteClick(user)}
                        disabled={user.email === session.user?.email}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 역할 변경 다이얼로그 */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>{t('changeRoleTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {t('confirmChangeRole', { name: selectedUser?.name || selectedUser?.email || '' })}
          </DialogContentText>
          <Select
            fullWidth
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as UserRole)}
          >
            <MenuItem value={UserRole.ADMIN}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AdminIcon /> {t('admin')}
              </Box>
            </MenuItem>
            <MenuItem value={UserRole.WRITER}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <WriterIcon /> {t('writer')}
              </Box>
            </MenuItem>
            <MenuItem value={UserRole.READER}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ReaderIcon /> {t('reader')}
              </Box>
            </MenuItem>
            <MenuItem value={UserRole.BANNED}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BannedIcon /> {t('banned')}
              </Box>
            </MenuItem>
          </Select>
          <Alert severity="warning" sx={{ mt: 2 }}>
            {t('roleChangeWarning')}
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>{t('cancel')}</Button>
          <Button onClick={handleUpdateRole} variant="contained" color="primary">
            {t('change')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 사용자 삭제 다이얼로그 */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>{t('deleteUser')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('confirmDeleteUser', { name: selectedUser?.name || selectedUser?.email || '' })}<br/>
            {t('cannotUndoUser')}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>{t('cancel')}</Button>
          <Button onClick={handleDeleteUser} variant="contained" color="error">
            {t('delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminPage;