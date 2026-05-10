import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme } from '../theme/colors';

const THEME_KEY = 'app_theme';

export const ThemeContext = createContext({
    theme: 'light',
    colors: lightTheme,
    isDark: false,
    toggleTheme: () => { },
    setTheme: () => { },
});

export const ThemeProvider = ({ children }) => {
    const [theme, setThemeState] = useState('light');
    const [isLoading, setIsLoading] = useState(true);

    // Cargar tema guardado al iniciar
    useEffect(() => {
        loadTheme();
    }, []);

    const loadTheme = async () => {
        try {
            const savedTheme = await AsyncStorage.getItem(THEME_KEY);
            if (savedTheme) {
                setThemeState(savedTheme);
            }
        } catch (error) {
            console.error('Error loading theme:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const setTheme = async (newTheme) => {
        try {
            await AsyncStorage.setItem(THEME_KEY, newTheme);
            setThemeState(newTheme);
        } catch (error) {
            console.error('Error saving theme:', error);
        }
    };

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
    };

    const colors = theme === 'dark' ? darkTheme : lightTheme;
    const isDark = theme === 'dark';

    const value = {
        theme,
        colors,
        isDark,
        toggleTheme,
        setTheme,
        isLoading,
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};
