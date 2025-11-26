import React from 'react';
import type { NextPage } from 'next';
import {
  Box,
  Paper,
  Typography,
  Button,
  Container,
  Alert,
  Divider,
} from '@mui/material';
import {
  Google as GoogleIcon,
  Login as LoginIcon,
} from '@mui/icons-material';
import { signIn, getSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useLanguage } from '../../contexts/LanguageContext';

const LoginPage: NextPage = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const router = useRouter();
  const { t } = useLanguage();

  useEffect(() => {
    // 이미 로그인되어 있다면 홈으로 리다이렉트
    const checkSession = async () => {
      const session = await getSession();
      if (session) {
        const callbackUrl = router.query.callbackUrl as string || '/';
        router.push(callbackUrl);
      }
    };
    checkSession();

    // URL에서 오류 파라미터 확인
    if (router.query.error) {
      const errorMsg = Array.isArray(router.query.error) 
        ? router.query.error[0] 
        : router.query.error;
      
      switch (errorMsg) {
        case 'OAuthCallback':
          setError(t('loginPage.googleLoginError'));
          break;
        case 'AccessDenied':
          setError(t('loginPage.loginCancelled'));
          break;
        default:
          setError(t('loginPage.loginError'));
      }
    }
  }, [router]);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError('');
      
      // 현재 페이지의 callbackUrl 파라미터 또는 기본값 사용
      const callbackUrl = (router.query.callbackUrl as string) || '/';
      
      const result = await signIn('google', {
        callbackUrl,
        redirect: true, // 직접 리디렉션하도록 변경
      });
      
      // redirect: true일 때는 이 코드에 도달하지 않음
      if (result?.error) {
        setError(t('loginPage.loginErrorRetry'));
      }
    } catch (error) {
      setError(t('loginPage.loginError'));
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 6,
            width: '100%',
            textAlign: 'center',
          }}
        >
          <LoginIcon
            sx={{
              fontSize: 60,
              color: 'primary.main',
              mb: 2,
            }}
          />
          
          <Typography variant="h4" component="h1" gutterBottom>
            {t('loginPage.loginTitle')}
          </Typography>
          
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            {t('loginPage.loginSubtitle')}
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Button
            variant="contained"
            size="large"
            startIcon={<GoogleIcon />}
            onClick={handleGoogleLogin}
            disabled={loading}
            sx={{
              mb: 3,
              py: 1.5,
              px: 4,
              fontSize: '1.1rem',
            }}
          >
            {loading ? t('loginPage.loggingIn') : t('loginPage.signInWithGoogle')}
          </Button>

          <Divider sx={{ my: 3 }} />

          <Typography variant="body2" color="text.secondary">
            {t('loginPage.noAccount')}
          </Typography>

          <Box sx={{ mt: 3 }}>
            <Button
              component={Link}
              href="/"
              variant="text"
              color="primary"
            >
              {t('loginPage.backToHome')}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default LoginPage;