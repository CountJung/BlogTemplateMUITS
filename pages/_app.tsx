import React, { useMemo } from 'react';
import type { AppProps } from 'next/app';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { SessionProvider } from 'next-auth/react';
import Layout from '../components/Layout';
import { ThemeProvider as CustomThemeProvider, useThemeMode } from '../contexts/ThemeContext';

// 베이스 테마 설정
const getDesignTokens = (mode: 'light' | 'dark') => ({
  palette: {
    mode,
    primary: {
      main: mode === 'dark' ? '#90caf9' : '#1976d2',
    },
    secondary: {
      main: mode === 'dark' ? '#f48fb1' : '#dc004e',
    },
    background: {
      default: mode === 'dark' ? '#121212' : '#ffffff',
      paper: mode === 'dark' ? '#1e1e1e' : '#ffffff',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"',
    ].join(','),
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          transition: 'background-color 0.3s ease, color 0.3s ease',
        },
        '*': {
          transition: 'background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease',
        },
      },
    },
  },
});

import { LanguageProvider } from '../contexts/LanguageContext';

// 테마를 사용하는 내부 컴포넌트
function ThemedApp({ Component, pageProps }: AppProps) {
  const { effectiveMode } = useThemeMode();
  
  const theme = useMemo(
    () => createTheme(getDesignTokens(effectiveMode)),
    [effectiveMode]
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </ThemeProvider>
  );
}

export default function MyApp({ Component, pageProps: { session, ...pageProps }, ...appProps }: AppProps) {
  return (
    <SessionProvider session={session}>
      <LanguageProvider>
        <CustomThemeProvider>
          <ThemedApp Component={Component} pageProps={pageProps} {...appProps} />
        </CustomThemeProvider>
      </LanguageProvider>
    </SessionProvider>
  );
}