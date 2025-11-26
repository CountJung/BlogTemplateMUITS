import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Container,
  IconButton,
  Menu,
  MenuItem,
  useMediaQuery,
  useTheme,
  Avatar,
  Tooltip,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Home as HomeIcon,
  Article as ArticleIcon,
  Login as LoginIcon,
  Logout as LogoutIcon,
  AccountCircle as AccountIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession, signOut } from 'next-auth/react';
import ResponsiveDebugger from './ResponsiveDebugger';
import ThemeSwitcher from './ThemeSwitcher';
import { LayoutProps, MenuItem as MenuItemType } from '../types/layout';
import { useLanguage } from '../contexts/LanguageContext';
import { Settings as SettingsIcon } from '@mui/icons-material';

const Header: React.FC = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState<boolean>(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const router = useRouter();
  const { data: session, status } = useSession();
  const { t } = useLanguage();

  const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleLogout = async () => {
    handleUserMenuClose();
    setMobileDrawerOpen(false);
    await signOut({ callbackUrl: '/' });
  };

  const toggleMobileDrawer = () => {
    setMobileDrawerOpen(!mobileDrawerOpen);
  };

  const menuItems: MenuItemType[] = [
    { label: t('home'), href: '/', icon: <HomeIcon /> },
  ];

  // 로그인 상태에 따라 메뉴 아이템 조건부 추가
  if (session) {
    // 글쓰기 권한이 있는 경우에만 글쓰기 메뉴 표시
    if (session.permissions?.canWrite) {
      menuItems.push({ label: t('write'), href: '/blog/create', icon: <ArticleIcon /> });
    }
    // 관리자 권한이 있는 경우에만 관리 메뉴 표시
    if ((session as any).isAdmin) {
      menuItems.push({ label: t('admin'), href: '/admin', icon: <AccountIcon /> });
    }
  } else {
    menuItems.push({ label: t('login'), href: '/auth/login', icon: <LoginIcon /> });
  }

  // 설정 메뉴 추가 (로그인하지 않은 경우에만 상단 메뉴에 표시) - 그냥 상시로 표시
  // if (!session) {
    menuItems.push({ label: t('settings'), href: '/settings', icon: <SettingsIcon /> });
  // }

  const isActive = (href: string): boolean => router.pathname === href;

  return (
    <AppBar position="static" elevation={2}>
      <Toolbar>
        <Typography
          variant="h6"
          component="div"
          sx={{ flexGrow: 1, fontWeight: 'bold' }}
        >
          <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            {t('blogTitle')}
          </Link>
        </Typography>

        {isMobile ? (
          <>
            {/* 모바일 테마 스위처 */}
            <ThemeSwitcher />
            
            <IconButton
              size="large"
              edge="start"
              color="inherit"
              aria-label="menu"
              onClick={toggleMobileDrawer}
            >
              <MenuIcon />
            </IconButton>
            
            {/* Mobile Drawer */}
            <Drawer
              anchor="right"
              open={mobileDrawerOpen}
              onClose={toggleMobileDrawer}
              PaperProps={{
                sx: { width: 280 }
              }}
            >
              <Box sx={{ p: 2 }}>
                <Typography variant="h6" component="div" color="primary">
                  주일설교 자료실
                </Typography>
              </Box>
              <Divider />
              
              {session && (
                <>
                  <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar
                      src={session.user?.image || undefined}
                      alt={session.user?.name || undefined}
                      sx={{ width: 40, height: 40 }}
                    >
                      {session.user?.name?.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2">
                        {session.user?.name || '사용자'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {session.user?.email}
                      </Typography>
                    </Box>
                  </Box>
                  <Divider />
                </>
              )}
              
              <List>
                {menuItems.map((item) => (
                  <ListItem
                    key={item.href}
                    onClick={() => {
                      setMobileDrawerOpen(false);
                      router.push(item.href);
                    }}
                    sx={{
                      cursor: 'pointer',
                      backgroundColor: isActive(item.href) ? 'action.selected' : 'transparent',
                      '&:hover': {
                        backgroundColor: 'action.hover',
                      },
                    }}
                  >
                    <ListItemIcon sx={{ color: isActive(item.href) ? 'primary.main' : 'inherit' }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText 
                      primary={item.label}
                      sx={{ color: isActive(item.href) ? 'primary.main' : 'inherit' }}
                    />
                  </ListItem>
                ))}
                
                {session && (
                  <>
                    <Divider />
                    {/* <ListItem 
                      onClick={() => {
                        setMobileDrawerOpen(false);
                        router.push('/settings');
                      }}
                      sx={{ 
                        cursor: 'pointer',
                        backgroundColor: isActive('/settings') ? 'action.selected' : 'transparent',
                      }}
                    >
                      <ListItemIcon sx={{ color: isActive('/settings') ? 'primary.main' : 'inherit' }}>
                        <SettingsIcon />
                      </ListItemIcon>
                      <ListItemText 
                        primary={t('settings')} 
                        sx={{ color: isActive('/settings') ? 'primary.main' : 'inherit' }}
                      />
                    </ListItem> */}
                    <ListItem onClick={handleLogout} sx={{ cursor: 'pointer' }}>
                      <ListItemIcon>
                        <LogoutIcon />
                      </ListItemIcon>
                      <ListItemText primary="로그아웃" />
                    </ListItem>
                  </>
                )}
              </List>
            </Drawer>
          </>
        ) : (
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            {menuItems.map((item) => (
              <Button
                key={item.href}
                color="inherit"
                component={Link}
                href={item.href}
                startIcon={item.icon}
                sx={{
                  backgroundColor: isActive(item.href) ? 'rgba(255,255,255,0.1)' : 'transparent',
                }}
              >
                {item.label}
              </Button>
            ))}
            
            {/* 데스크톱 테마 스위처 */}
            <ThemeSwitcher />
            
            {session && (
              <>
                <Tooltip title={`${session.user?.name || session.user?.email} (클릭하여 메뉴 열기)`}>
                  <IconButton
                    onClick={handleUserMenuOpen}
                    sx={{ ml: 1 }}
                    color="inherit"
                  >
                    {session.user?.image ? (
                      <Avatar
                        src={session.user.image}
                        alt={session.user.name || undefined}
                        sx={{ width: 32, height: 32 }}
                      />
                    ) : (
                      <AccountIcon />
                    )}
                  </IconButton>
                </Tooltip>
                <Menu
                  anchorEl={userMenuAnchor}
                  open={Boolean(userMenuAnchor)}
                  onClose={handleUserMenuClose}
                  transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                  anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                >
                  <MenuItem disabled>
                    <Box>
                      <Typography variant="subtitle2">
                        {session.user?.name || '사용자'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {session.user?.email}
                      </Typography>
                    </Box>
                  </MenuItem>
                  <Divider />
                  <MenuItem onClick={() => { handleUserMenuClose(); router.push('/settings'); }}>
                    <SettingsIcon sx={{ mr: 1 }} />
                    {t('settings')}
                  </MenuItem>
                  <MenuItem onClick={handleLogout}>
                    <LogoutIcon sx={{ mr: 1 }} />
                    {t('logout')}
                  </MenuItem>
                </Menu>
              </>
            )}
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

const Footer: React.FC = () => {
  return (
    <Box
      component="footer"
      sx={{
        bgcolor: 'grey.900',
        color: 'white',
        py: 3,
        mt: 'auto',
      }}
    >
      <Container maxWidth="lg">
        <Typography variant="body1" align="center">
          © 2025 블로그 프로젝트. Next.js + React + MUI로 구현
        </Typography>
        <Typography variant="body2" align="center" sx={{ mt: 1, opacity: 0.7 }}>
          Modern Blog Platform with Google OAuth Integration
        </Typography>
      </Container>
    </Box>
  );
};

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
      }}
    >
      <Header />
      <Container
        component="main"
        maxWidth="lg"
        sx={{
          flex: 1,
          py: 3,
          px: { xs: 2, sm: 3, md: 3 }, // 반응형 패딩
        }}
      >
        {children}
      </Container>
      <Footer />
      <ResponsiveDebugger />
    </Box>
  );
};

export default Layout;