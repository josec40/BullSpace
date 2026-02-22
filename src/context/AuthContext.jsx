import React, { createContext, useState, useContext } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(() => {
        const saved = localStorage.getItem('bullspace_auth');
        return saved ? JSON.parse(saved) : null;
    });

    const login = (userData) => {
        setCurrentUser(userData);
        localStorage.setItem('bullspace_auth', JSON.stringify(userData));
    };

    const logout = () => {
        setCurrentUser(null);
        localStorage.removeItem('bullspace_auth');
    };

    return (
        <AuthContext.Provider value={{ currentUser, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
