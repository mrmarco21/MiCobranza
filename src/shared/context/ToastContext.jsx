import React, { createContext, useContext, useState } from 'react';
import Toast from '../components/Toast';

const ToastContext = createContext();

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast debe usarse dentro de ToastProvider');
    }
    return context;
};

export const ToastProvider = ({ children }) => {
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

    const showToast = ({ type = 'success', text, duration = 2500 }) => {
        setToast({ visible: true, message: text, type, duration });
    };

    const hideToast = () => {
        setToast({ ...toast, visible: false });
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <Toast
                visible={toast.visible}
                message={toast.message}
                type={toast.type}
                duration={toast.duration}
                onHide={hideToast}
            />
        </ToastContext.Provider>
    );
};
