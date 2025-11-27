import React, { useState, useEffect } from 'react';
import type { NextPage } from 'next';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Divider,
  IconButton,
  Alert,
  CircularProgress,
  Breadcrumbs,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Description as FileIcon,
  NavigateNext as NavigateNextIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import { useLanguage } from '../../contexts/LanguageContext';

interface LogFile {
  name: string;
  size: number;
  mtime: string;
}

const AdminLogsPage: NextPage = () => {
  const { t } = useLanguage();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [files, setFiles] = useState<LogFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [logContent, setLogContent] = useState<string>('');
  const [loadingFiles, setLoadingFiles] = useState<boolean>(false);
  const [loadingContent, setLoadingContent] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || !(session as any).isAdmin) {
      router.push('/');
      return;
    }
    fetchFiles();
  }, [session, status, router]);

  const fetchFiles = async () => {
    setLoadingFiles(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/logs');
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files);
      } else {
        setError(t('adminLogs.error'));
      }
    } catch (err) {
      setError(t('adminLogs.error'));
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleFileSelect = async (filename: string) => {
    setSelectedFile(filename);
    setLoadingContent(true);
    setLogContent('');
    setError(null);

    try {
      const res = await fetch(`/api/admin/logs/${filename}`);
      if (res.ok) {
        const data = await res.json();
        setLogContent(data.content);
      } else if (res.status === 404) {
        setError(t('adminLogs.fileNotFound'));
        // Refresh file list as the file might be deleted
        fetchFiles();
      } else {
        setError(t('adminLogs.error'));
      }
    } catch (err) {
      setError(t('adminLogs.error'));
    } finally {
      setLoadingContent(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (status === 'loading' || !session || !(session as any).isAdmin) {
    return null;
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', mt: 4, px: 2 }}>
      <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} aria-label="breadcrumb" sx={{ mb: 3 }}>
        <Link href="/" passHref legacyBehavior>
          <Typography color="inherit" sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}>
            {t('home')}
          </Typography>
        </Link>
        <Link href="/admin" passHref legacyBehavior>
          <Typography color="inherit" sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}>
            {t('adminPage')}
          </Typography>
        </Link>
        <Typography color="text.primary">{t('adminLogs.title')}</Typography>
      </Breadcrumbs>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          {t('adminLogs.title')}
        </Typography>
        <IconButton onClick={fetchFiles} disabled={loadingFiles}>
          <RefreshIcon />
        </IconButton>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
        <Box sx={{ width: { xs: '100%', md: '33.33%' }, flexShrink: 0 }}>
          <Paper sx={{ height: '70vh', overflow: 'auto' }}>
            {loadingFiles ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : files.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="textSecondary">{t('adminLogs.noLogs')}</Typography>
              </Box>
            ) : (
              <List>
                {files.map((file) => (
                  <React.Fragment key={file.name}>
                    <ListItemButton
                      selected={selectedFile === file.name}
                      onClick={() => handleFileSelect(file.name)}
                    >
                      <FileIcon sx={{ mr: 2, color: 'action.active' }} />
                      <ListItemText
                        primary={file.name}
                        secondary={
                          <>
                            <Typography component="span" variant="body2" color="text.primary">
                              {formatSize(file.size)}
                            </Typography>
                            {" — "}
                            {formatDate(file.mtime)}
                          </>
                        }
                      />
                    </ListItemButton>
                    <Divider />
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>
        </Box>

        <Box sx={{ flexGrow: 1, width: { xs: '100%', md: 'auto' } }}>
          <Paper sx={{ height: '70vh', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.default' }}>
              <Typography variant="subtitle1" fontWeight="bold">
                {selectedFile || t('adminLogs.selectLog')}
              </Typography>
            </Box>
            <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2, bgcolor: '#1e1e1e', color: '#d4d4d4' }}>
              {loadingContent ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <CircularProgress />
                </Box>
              ) : selectedFile ? (
                <pre style={{ margin: 0, fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {logContent}
                </pre>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'text.secondary' }}>
                  <Typography>{t('adminLogs.selectLog')}</Typography>
                </Box>
              )}
            </Box>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
};

export default AdminLogsPage;
