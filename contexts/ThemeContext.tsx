import React, { createContext, useContext, useEffect, useState } from 'react';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  mode: ThemeMode;
  effectiveMode: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useThemeMode = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeMode must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>('system');
  const [systemPreference, setSystemPreference] = useState<'light' | 'dark'>('light');
  const [isInitialized, setIsInitialized] = useState(false);

  // 시스템 테마 감지 및 초기 설정
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemPreference(mediaQuery.matches ? 'dark' : 'light');

    // 로컬 스토리지에서 저장된 테마 모드 불러오기
    const savedMode = localStorage.getItem('theme-mode') as ThemeMode;
    if (savedMode && ['light', 'dark', 'system'].includes(savedMode)) {
      setMode(savedMode);
    }

    setIsInitialized(true);

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemPreference(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // 모드 변경 시 로컬 스토리지에 저장
  const handleSetMode = (newMode: ThemeMode) => {
    setMode(newMode);
    localStorage.setItem('theme-mode', newMode);
  };

  // 토글 함수 (라이트 ↔ 다크만)
  const toggleMode = () => {
    const newMode = effectiveMode === 'light' ? 'dark' : 'light';
    handleSetMode(newMode);
  };

  // 실제 적용되는 테마 계산
  const effectiveMode = mode === 'system' ? systemPreference : mode;

  const value = {
    mode,
    effectiveMode,
    setMode: handleSetMode,
    toggleMode,
  };

  // 초기화되지 않은 상태에서는 시스템 기본값으로 렌더링
  if (!isInitialized) {
    return (
      <ThemeContext.Provider value={{ ...value, effectiveMode: systemPreference }}>
        {children}
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};