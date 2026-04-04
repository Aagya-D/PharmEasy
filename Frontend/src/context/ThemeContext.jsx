import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const ThemeContext = createContext(null);
const THEME_STORAGE_KEY = "theme-mode";

const lightThemeVars = {
	"--color-bg-primary": "#f8fafc",
	"--color-bg-secondary": "#ffffff",
	"--color-text-primary": "#0f172a",
	"--color-text-secondary": "#475569",
	"--color-primary": "#0ea5e9",
	"--color-border": "#cbd5e1",
};

const darkThemeVars = {
	"--color-bg-primary": "#020617",
	"--color-bg-secondary": "#0f172a",
	"--color-text-primary": "#f8fafc",
	"--color-text-secondary": "#94a3b8",
	"--color-primary": "#38bdf8",
	"--color-border": "#334155",
};

function resolveInitialTheme() {
	if (typeof window === "undefined") return false;

	const stored = localStorage.getItem(THEME_STORAGE_KEY);
	if (stored === "dark") return true;
	if (stored === "light") return false;

	return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function ThemeProvider({ children }) {
	const [isDark, setIsDark] = useState(resolveInitialTheme);

	useEffect(() => {
		if (typeof document === "undefined") return;

		const root = document.documentElement;
		const variables = isDark ? darkThemeVars : lightThemeVars;

		root.classList.toggle("dark", isDark);
		Object.entries(variables).forEach(([key, value]) => {
			root.style.setProperty(key, value);
		});

		localStorage.setItem(THEME_STORAGE_KEY, isDark ? "dark" : "light");
	}, [isDark]);

	const value = useMemo(
		() => ({
			isDark,
			theme: isDark ? "dark" : "light",
			toggleTheme: () => setIsDark((prev) => !prev),
			setTheme: (nextTheme) => setIsDark(nextTheme === "dark"),
		}),
		[isDark]
	);

	return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
	const context = useContext(ThemeContext);
	if (!context) {
		throw new Error("useTheme must be used within ThemeProvider");
	}
	return context;
}
