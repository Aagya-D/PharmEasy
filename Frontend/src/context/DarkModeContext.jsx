import React, { createContext, useContext, useState, useEffect } from 'react';

const DarkModeContext = createContext();

export const useDarkMode = () => {
  const context = useContext(DarkModeContext);
  if (!context) {
    throw new Error('useDarkMode must be used within a DarkModeProvider');
  }
  return context;
};

export const DarkModeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check localStorage or system preference
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode !== null) {
      return savedMode === 'true';
    }
    // Check system preference
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    // Save to localStorage
    localStorage.setItem('darkMode', isDarkMode.toString());
    
    // Apply dark mode class to document
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.body.style.backgroundColor = '#111827';
      document.body.style.color = '#F9FAFB';
    } else {
      document.documentElement.classList.remove('dark');
      document.body.style.backgroundColor = '#FFFFFF';
      document.body.style.color = '#111827';
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };

  const value = {
    isDarkMode,
    toggleDarkMode,
  };

  return (
    <DarkModeContext.Provider value={value}>
      {children}
    </DarkModeContext.Provider>
  );
};
