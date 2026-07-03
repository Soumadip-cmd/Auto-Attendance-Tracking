import { useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { storage } from '../utils/storage';
import { lightTheme, darkTheme } from '../constants/theme';
import { APP_CONFIG } from '../constants/config';

let sharedIsDarkMode = null;
let hasLoadedPreference = false;
let loadPromise = null;
const listeners = new Set();

const notify = () => {
  listeners.forEach((listener) => listener(sharedIsDarkMode));
};

const setSharedMode = (value) => {
  sharedIsDarkMode = !!value;
  notify();
};

const loadThemePreference = async (systemIsDark) => {
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const savedTheme = await storage.getItem(APP_CONFIG.THEME_KEY);
      if (savedTheme === 'dark' || savedTheme === 'light') {
        setSharedMode(savedTheme === 'dark');
      } else if (sharedIsDarkMode === null) {
        setSharedMode(systemIsDark);
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
      if (sharedIsDarkMode === null) setSharedMode(systemIsDark);
    } finally {
      hasLoadedPreference = true;
    }
  })();

  return loadPromise;
};

export const useTheme = () => {
  const systemColorScheme = useColorScheme();
  const systemIsDark = systemColorScheme === 'dark';

  if (sharedIsDarkMode === null) {
    sharedIsDarkMode = systemIsDark;
  }

  const [isDarkMode, setIsDarkMode] = useState(sharedIsDarkMode);

  useEffect(() => {
    listeners.add(setIsDarkMode);
    if (!hasLoadedPreference) {
      loadThemePreference(systemIsDark);
    }

    return () => {
      listeners.delete(setIsDarkMode);
    };
  }, [systemIsDark]);

  const toggleTheme = async () => {
    try {
      const newMode = !sharedIsDarkMode;
      setSharedMode(newMode);
      await storage.setItem(APP_CONFIG.THEME_KEY, newMode ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const theme = useMemo(() => {
    const baseTheme = isDarkMode ? darkTheme : lightTheme;
    return {
      ...baseTheme,
      dark: isDarkMode,
      isDarkMode,
    };
  }, [isDarkMode]);

  return {
    theme,
    isDarkMode,
    toggleTheme,
  };
};
