import React from "react";
import { ThemeProvider, useTheme } from "./ThemeContext";

export const useDarkMode = () => {
  const { isDark, toggleTheme } = useTheme();

  return {
    isDarkMode: isDark,
    toggleDarkMode: toggleTheme,
  };
};

export const DarkModeProvider = ({ children }) => {
  return <ThemeProvider>{children}</ThemeProvider>;
};
