import React from 'react';
import type { NextPage } from 'next';
import {
  Box,
  Typography,
  Paper,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Divider,
  Alert,
} from '@mui/material';
import { useLanguage } from '../contexts/LanguageContext';
import { Language } from '../types/language';

const SettingsPage: NextPage = () => {
  const { language, setLanguage, t } = useLanguage();

  const handleLanguageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setLanguage(event.target.value as Language);
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        {t('settings')}
      </Typography>

      <Paper sx={{ p: 4, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          {t('language')}
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <FormControl component="fieldset">
          <FormLabel component="legend" sx={{ mb: 2 }}>
            {t('language')}
          </FormLabel>
          <RadioGroup
            row
            aria-label="language"
            name="language"
            value={language}
            onChange={handleLanguageChange}
          >
            <FormControlLabel value="ko" control={<Radio />} label={t('settingsPage.korean')} />
            <FormControlLabel value="en" control={<Radio />} label={t('settingsPage.english')} />
          </RadioGroup>
        </FormControl>

        <Box sx={{ mt: 3 }}>
          <Alert severity="info">
            {t('settingsPage.languageHelp')}
          </Alert>
        </Box>
      </Paper>
    </Box>
  );
};

export default SettingsPage;
