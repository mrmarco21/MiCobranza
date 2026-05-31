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
    const [toasts, setToasts] = useState([]);

    const showToast = ({
        type = 'success',
        text,
        duration = 2500,
        size = 'normal', // 'small', 'normal', 'large'
        position = 'top', // 'top', 'center', 'bottom'
        customColors = null, // { icon, bg, text }
        iconSize = null,
        fontSize = null,
    }) => {
        const id = Date.now() + Math.random();
        const newToast = {
            id,
            message: text,
            type,
            duration,
            size,
            position,
            customColors,
            iconSize,
            fontSize,
            visible: true,
        };

        setToasts(prev => [...prev, newToast]);

        // Auto-remover después de la duración
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, duration + 300); // +300ms para la animación de salida
    };

    const hideToast = (id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {toasts.map((toast, index) => (
                <Toast
                    key={toast.id}
                    id={toast.id}
                    visible={toast.visible}
                    message={toast.message}
                    type={toast.type}
                    duration={toast.duration}
                    size={toast.size}
                    position={toast.position}
                    customColors={toast.customColors}
                    iconSize={toast.iconSize}
                    fontSize={toast.fontSize}
                    index={index}
                    onHide={() => hideToast(toast.id)}
                />
            ))}
        </ToastContext.Provider>
    );
};
