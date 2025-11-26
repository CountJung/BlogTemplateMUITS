import React from 'react';
import {
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Box,
} from '@mui/material';
import {
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  SettingsBrightness as SystemModeIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { useThemeMode } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

const ThemeSwitcher: React.FC = () => {
  const { mode, effectiveMode, setMode } = useThemeMode();
  const { t } = useLanguage();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleModeSelect = (selectedMode: 'light' | 'dark' | 'system') => {
    setMode(selectedMode);
    handleClose();
  };

  const getCurrentIcon = () => {
    if (mode === 'system') {
      return <SystemModeIcon />;
    }
    return effectiveMode === 'dark' ? <DarkModeIcon /> : <LightModeIcon />;
  };

  const getTooltipText = () => {
    if (mode === 'system') {
      return `${t('themeSystem')} (${t('currentTheme', { mode: effectiveMode === 'dark' ? t('dark') : t('light') })})`;
    }
    return `${effectiveMode === 'dark' ? t('themeDark') : t('themeLight')}`;
  };

  return (
    <Box>
      <Tooltip title={getTooltipText()}>
        <IconButton
          onClick={handleClick}
          color="inherit"
          aria-label={t('changeTheme')}
          aria-controls={open ? 'theme-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={open ? 'true' : undefined}
        >
          {getCurrentIcon()}
        </IconButton>
      </Tooltip>
      
      <Menu
        id="theme-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'theme-button',
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => handleModeSelect('light')}>
          <ListItemIcon>
            <LightModeIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('themeLight')}</ListItemText>
          {mode === 'light' && (
            <CheckIcon fontSize="small" sx={{ ml: 2 }} />
          )}
        </MenuItem>
        
        <MenuItem onClick={() => handleModeSelect('dark')}>
          <ListItemIcon>
            <DarkModeIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('themeDark')}</ListItemText>
          {mode === 'dark' && (
            <CheckIcon fontSize="small" sx={{ ml: 2 }} />
          )}
        </MenuItem>
        
        <MenuItem onClick={() => handleModeSelect('system')}>
          <ListItemIcon>
            <SystemModeIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('themeSystem')}</ListItemText>
          {mode === 'system' && (
            <CheckIcon fontSize="small" sx={{ ml: 2 }} />
          )}
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default ThemeSwitcher;