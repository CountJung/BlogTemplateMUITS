import React, { useState, useEffect } from 'react';
import type { NextPage } from 'next';
import {
  Box,
  Typography,
  Paper,
  Divider,
  TextField,
  Button,
  Snackbar,
  Alert as MuiAlert
} from '@mui/material';
import { useLanguage } from '../contexts/LanguageContext';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';

const SettingsPage: NextPage = () => {
  const { t } = useLanguage();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [logRetentionDays, setLogRetentionDays] = useState<number>(10);
  const [scheduler, setScheduler] = useState({ hour: 1, minute: 0, second: 0 });
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || !(session as any).isAdmin) {
      router.push('/');
      return;
    }

    fetch('/api/settings/system')
      .then(res => res.json())
      .then(data => {
        if (data.logRetentionDays) setLogRetentionDays(data.logRetentionDays);
        if (data.scheduler) setScheduler(data.scheduler);
      })
      .catch(err => console.error('Failed to load settings', err));
  }, [session, status, router]);

  const handleSaveSystemSettings = async () => {
    try {
      const res = await fetch('/api/settings/system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          logRetentionDays: Number(logRetentionDays), 
          scheduler: {
            hour: Number(scheduler.hour),
            minute: Number(scheduler.minute),
            second: Number(scheduler.second)
          }
        }),
      });
      
      if (res.ok) {
        setMessage({ text: t('settingsPage.settingsSaved'), type: 'success' });
      } else {
        setMessage({ text: t('settingsPage.settingsFailed'), type: 'error' });
      }
    } catch (error) {
      setMessage({ text: t('settingsPage.settingsFailed'), type: 'error' });
    }
  };

  const handleCloseMessage = () => {
    setMessage(null);
  };

  if (status === 'loading' || !session || !(session as any).isAdmin) {
    return null;
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        {t('settings')}
      </Typography>

      <Paper sx={{ p: 4, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          {t('settingsPage.systemSettings')}
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <Box component="form" noValidate autoComplete="off">
          <TextField
            label={t('settingsPage.logRetentionDays')}
            type="number"
            value={logRetentionDays}
            onChange={(e) => setLogRetentionDays(Number(e.target.value))}
            fullWidth
            margin="normal"
            helperText={t('settingsPage.logRetentionDaysHelp')}
          />
          
          <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
            {t('settingsPage.schedulerConfiguration')}
          </Typography>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            {t('settingsPage.schedulerHelp')}
          </Typography>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label={t('settingsPage.hour')}
              type="number"
              value={scheduler.hour}
              onChange={(e) => setScheduler({ ...scheduler, hour: Number(e.target.value) })}
              fullWidth
              margin="normal"
              inputProps={{ min: 0, max: 23 }}
            />
            <TextField
              label={t('settingsPage.minute')}
              type="number"
              value={scheduler.minute}
              onChange={(e) => setScheduler({ ...scheduler, minute: Number(e.target.value) })}
              fullWidth
              margin="normal"
              inputProps={{ min: 0, max: 59 }}
            />
            <TextField
              label={t('settingsPage.second')}
              type="number"
              value={scheduler.second}
              onChange={(e) => setScheduler({ ...scheduler, second: Number(e.target.value) })}
              fullWidth
              margin="normal"
              inputProps={{ min: 0, max: 59 }}
            />
          </Box>

          <Box sx={{ mt: 3 }}>
            <Button variant="contained" color="primary" onClick={handleSaveSystemSettings}>
              {t('settingsPage.saveSettings')}
            </Button>
          </Box>
        </Box>
      </Paper>

      <Snackbar open={!!message} autoHideDuration={6000} onClose={handleCloseMessage}>
        <MuiAlert onClose={handleCloseMessage} severity={message?.type || 'info'} sx={{ width: '100%' }}>
          {message?.text}
        </MuiAlert>
      </Snackbar>
    </Box>
  );
};

export default SettingsPage;
