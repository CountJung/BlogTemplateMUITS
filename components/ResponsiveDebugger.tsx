import React from 'react';
import { Box, Chip, useMediaQuery, useTheme } from '@mui/material';

interface BreakpointInfo {
  label: string;
  color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
}

const ResponsiveDebugger: React.FC = () => {
  const theme = useTheme();
  
  const isXs = useMediaQuery(theme.breakpoints.only('xs'));
  const isSm = useMediaQuery(theme.breakpoints.only('sm'));
  const isMd = useMediaQuery(theme.breakpoints.only('md'));
  const isLg = useMediaQuery(theme.breakpoints.only('lg'));
  const isXl = useMediaQuery(theme.breakpoints.only('xl'));

  // 개발 모드에서만 표시
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const getCurrentBreakpoint = (): BreakpointInfo => {
    if (isXs) return { label: 'XS', color: 'error' };
    if (isSm) return { label: 'SM', color: 'warning' };
    if (isMd) return { label: 'MD', color: 'info' };
    if (isLg) return { label: 'LG', color: 'success' };
    if (isXl) return { label: 'XL', color: 'primary' };
    return { label: 'Unknown', color: 'default' };
  };

  const breakpoint = getCurrentBreakpoint();

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 80,
        right: 16,
        zIndex: 9999,
        backgroundColor: 'rgba(58, 201, 165, 0.35)',
        borderRadius: 1,
        p: 1,
      }}
    >
      <Chip
        label={`Breakpoint: ${breakpoint.label}`}
        color={breakpoint.color}
        variant="filled"
        size="small"
        sx={{ color: 'white', fontWeight: 'bold' }}
      />
    </Box>
  );
};

export default ResponsiveDebugger;