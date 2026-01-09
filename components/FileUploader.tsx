import React, { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  LinearProgress,
  Alert,
  Chip,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  InsertDriveFile as FileIcon,
  Image as ImageIcon,
  PictureAsPdf as PdfIcon,
  Description as DocIcon,
  Attachment as AttachmentIcon,
} from '@mui/icons-material';
import { FileAttachment } from '../types/blog';
import { useLanguage } from '../contexts/LanguageContext';

interface FileUploaderProps {
  attachments: FileAttachment[];
  onAttachmentsChange: (attachments: FileAttachment[]) => void;
  maxFiles?: number;
  postDate?: string; // YYYY-MM-DD (포스트 날짜 기반 업로드 폴더 분리)
}

const FileUploader: React.FC<FileUploaderProps> = ({
  attachments,
  onAttachmentsChange,
  maxFiles = 1000,
  postDate,
}) => {
  const { t, language } = useLanguage();
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');

  // 파일 타입에 따른 아이콘 반환
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <ImageIcon />;
    if (mimeType === 'application/pdf') return <PdfIcon />;
    if (mimeType.includes('word') || mimeType.includes('document')) return <DocIcon />;
    return <FileIcon />;
  };

  // 파일 크기 포맷
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  // 파일 업로드 처리
  const uploadFile = async (file: File): Promise<FileAttachment | null> => {
    const formData = new FormData();
    formData.append('file', file);
    if (postDate) {
      formData.append('postDate', postDate);
    }

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        return data.file;
      } else {
        setError(data.message || t('uploadFailed'));
        return null;
      }
    } catch (error) {
      console.error('Upload error:', error);
      setError(t('uploadError'));
      return null;
    }
  };

  // 파일 선택/드롭 처리
  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setError('');

    // 최대 파일 수 체크
    if (attachments.length + files.length > maxFiles) {
      setError(t('maxFilesExceeded', { max: maxFiles }));
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    const newAttachments: FileAttachment[] = [];
    const totalFiles = files.length;

    for (let i = 0; i < totalFiles; i++) {
      const file = files[i];
      const uploaded = await uploadFile(file);
      
      if (uploaded) {
        newAttachments.push(uploaded);
      }
      
      setUploadProgress(((i + 1) / totalFiles) * 100);
    }

    if (newAttachments.length > 0) {
      onAttachmentsChange([...attachments, ...newAttachments]);
    }

    setUploading(false);
    setUploadProgress(0);
  }, [attachments, maxFiles, onAttachmentsChange]);

  // 드래그 이벤트 핸들러
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    handleFiles(files);
  }, [handleFiles]);

  // 파일 선택 (클릭)
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  }, [handleFiles]);

  // 파일 삭제
  const handleRemoveFile = (index: number) => {
    const newAttachments = attachments.filter((_, i) => i !== index);
    onAttachmentsChange(newAttachments);
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        {t('fileUpload')} ({attachments.length}/{maxFiles})
      </Typography>

      {/* 드래그 앤 드롭 영역 */}
      <Paper
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        sx={{
          p: 3,
          textAlign: 'center',
          border: '2px dashed',
          borderColor: isDragging ? 'primary.main' : 'grey.300',
          backgroundColor: isDragging ? 'action.hover' : 'background.paper',
          cursor: 'pointer',
          transition: 'all 0.3s',
          '&:hover': {
            borderColor: 'primary.light',
            backgroundColor: 'action.hover',
          },
        }}
      >
        <input
          type="file"
          multiple
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          id="file-upload-input"
          disabled={uploading || attachments.length >= maxFiles}
        />
        <label htmlFor="file-upload-input" style={{ cursor: 'pointer', width: '100%' }}>
          <UploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
          <Typography variant="body1" gutterBottom>
            {isDragging ? t('dropFilesHere') : `${t('dragDropFiles')} ${t('clickToSelect')}`}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('supportedFiles')}
          </Typography>
        </label>
      </Paper>

      {/* 업로드 진행률 */}
      {uploading && (
        <Box sx={{ mt: 2 }}>
          <LinearProgress variant="determinate" value={uploadProgress} />
          <Typography variant="caption" align="center" display="block" sx={{ mt: 0.5 }}>
            {t('loading')}... {Math.round(uploadProgress)}%
          </Typography>
        </Box>
      )}

      {/* 에러 메시지 */}
      {error && (
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* 첨부된 파일 목록 */}
      {attachments.length > 0 && (
        <List sx={{ mt: 2 }}>
          {attachments.map((file, index) => (
            <ListItem
              key={index}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                mb: 1,
              }}
            >
              <Box sx={{ mr: 2 }}>
                {getFileIcon(file.mimeType)}
              </Box>
              <ListItemText
                primary={file.originalName}
                secondary={
                  <Box component="span" sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5 }}>
                    <Chip label={formatFileSize(file.size)} size="small" />
                    <Typography variant="caption" color="text.secondary">
                      {new Date(file.uploadedAt).toLocaleString(language === 'ko' ? 'ko-KR' : 'en-US')}
                    </Typography>
                  </Box>
                }
              />
              <ListItemSecondaryAction>
                <IconButton
                  edge="end"
                  onClick={() => handleRemoveFile(index)}
                  disabled={uploading}
                >
                  <DeleteIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
};

export default FileUploader;
