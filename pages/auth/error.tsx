import React from 'react';
import type { NextPage } from 'next';
import {
  Box,
  Paper,
  Typography,
  Button,
  Container,
  Alert,
} from '@mui/material';
import {
  Error as ErrorIcon,
  Home as HomeIcon,
  Login as LoginIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useLanguage } from '../../contexts/LanguageContext';

const AuthErrorPage: NextPage = () => {
  const router = useRouter();
  const { error } = router.query;
  const { t } = useLanguage();

  const getErrorMessage = (errorCode: string | string[] | undefined): string => {
    if (!errorCode || typeof errorCode !== 'string') {
      return t('authError.unknown');
    }

    switch (errorCode) {
      case 'Configuration':
        return t('authError.configuration');
      case 'AccessDenied':
        return t('authError.accessDenied');
      case 'Verification':
        return t('authError.verification');
      case 'Default':
        return t('authError.default');
      case 'OAuthAccountNotLinked':
        return t('authError.accountNotLinked');
      case 'OAuthCallback':
        return t('authError.callback');
      default:
        return t('authError.generic', { error: errorCode });
    }
  };

  const errorMessage = getErrorMessage(error);

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
          <ErrorIcon
            sx={{
              fontSize: 60,
              color: 'error.main',
              mb: 2,
            }}
          />
          
          <Typography variant="h4" component="h1" gutterBottom>
            {t('authError.title')}
          </Typography>
          
          <Alert severity="error" sx={{ mb: 3 }}>
            {errorMessage}
          </Alert>

          {error === 'OAuthCallback' && (
            <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
              <Typography variant="subtitle2" gutterBottom>
                {t('authError.troubleshootTitle')}
              </Typography>
              <Typography variant="body2" component="div">
                {t('authError.troubleshootStep1')}<br/>
                {t('authError.troubleshootStep2')}<br/>
                <code>http://localhost:3000/api/auth/callback/google</code><br/>
                {t('authError.troubleshootStep3')}
              </Typography>
            </Alert>
          )}

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              component={Link}
              href="/auth/login"
              variant="contained"
              startIcon={<LoginIcon />}
            >
              {t('authError.tryLoginAgain')}
            </Button>
            
            <Button
              component={Link}
              href="/"
              variant="outlined"
              startIcon={<HomeIcon />}
            >
              {t('authError.backToHome')}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default AuthErrorPage;