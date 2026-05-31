import { useEffect, useRef } from 'react';
import { Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';

export default function Toast({
    visible,
    message,
    type = 'success',
    onHide,
    duration = 2500,
    size = 'normal',
    position = 'top',
    customColors = null,
    iconSize = null,
    fontSize = null,
    index = 0,
}) {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(position === 'bottom' ? 20 : -20)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(translateY, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();

            const timer = setTimeout(() => {
                Animated.parallel([
                    Animated.timing(fadeAnim, {
                        toValue: 0,
                        duration: 300,
                        useNativeDriver: true,
                    }),
                    Animated.timing(translateY, {
                        toValue: position === 'bottom' ? 20 : -20,
                        duration: 300,
                        useNativeDriver: true,
                    }),
                ]).start(() => {
                    if (onHide) onHide();
                });
            }, duration);

            return () => clearTimeout(timer);
        }
    }, [visible]);

    if (!visible) return null;

    const getConfig = () => {
        if (customColors) {
            return {
                icon: customColors.icon || 'information-circle',
                color: customColors.color || '#2196F3',
                bg: customColors.bg || '#E3F2FD',
            };
        }

        switch (type) {
            case 'success':
                return { icon: 'checkmark-circle', color: '#4CAF50', bg: '#E8F5E9' };
            case 'error':
                return { icon: 'close-circle', color: '#FF6B6B', bg: '#FFE5E5' };
            case 'warning':
                return { icon: 'warning', color: '#FF9800', bg: '#FFF3E0' };
            case 'info':
                return { icon: 'information-circle', color: '#2196F3', bg: '#E3F2FD' };
            default:
                return { icon: 'information-circle', color: '#2196F3', bg: '#E3F2FD' };
        }
    };

    const getSizeConfig = () => {
        switch (size) {
            case 'small':
                return {
                    paddingVertical: 8,
                    paddingHorizontal: 10,
                    borderRadius: 6,
                    borderLeftWidth: 2,
                    gap: 6,
                    iconSize: iconSize || 16,
                    fontSize: fontSize || 12,
                    shadowRadius: 3,
                    elevation: 3,
                };
            case 'large':
                return {
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    borderLeftWidth: 4,
                    gap: 12,
                    iconSize: iconSize || 24,
                    fontSize: fontSize || 15,
                    shadowRadius: 6,
                    elevation: 6,
                };
            case 'normal':
            default:
                return {
                    paddingVertical: 10,
                    paddingHorizontal: 10,
                    borderRadius: 8,
                    borderLeftWidth: 3,
                    gap: 8,
                    iconSize: iconSize || 18,
                    fontSize: fontSize || 13,
                    shadowRadius: 4,
                    elevation: 4,
                };
        }
    };

    const config = getConfig();
    const sizeConfig = getSizeConfig();

    // Calcular posición según el índice para apilar múltiples toasts
    const getPositionStyle = () => {
        const offset = index * 70; // Espaciado entre toasts

        switch (position) {
            case 'bottom':
                return { bottom: insets.bottom + 10 + offset };
            case 'center':
                return { top: '45%' };
            case 'top':
            default:
                return { top: insets.top + 10 + offset };
        }
    };

    const styles = createStyles(colors, sizeConfig);

    return (
        <Animated.View
            style={[
                styles.container,
                getPositionStyle(),
                {
                    opacity: fadeAnim,
                    transform: [{ translateY }],
                    backgroundColor: config.bg,
                    borderLeftColor: config.color,
                    alignSelf: 'center', // Centrar horizontalmente
                    maxWidth: '90%', // Máximo 90% del ancho de pantalla
                }
            ]}
        >
            <Ionicons name={config.icon} size={sizeConfig.iconSize} color={config.color} />
            <Text style={[styles.message, { color: config.color, fontSize: sizeConfig.fontSize }]}>
                {message}
            </Text>
        </Animated.View>
    );
}

const createStyles = (colors, sizeConfig) => StyleSheet.create({
    container: {
        position: 'absolute',
        // Removido left y right para permitir ajuste automático al contenido
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: sizeConfig.paddingVertical,
        paddingHorizontal: sizeConfig.paddingHorizontal,
        borderRadius: sizeConfig.borderRadius,
        borderLeftWidth: sizeConfig.borderLeftWidth,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: sizeConfig.shadowRadius,
        elevation: sizeConfig.elevation,
        zIndex: 9999,
        gap: sizeConfig.gap,
    },
    message: {
        fontWeight: '600',
        // Removido flex: 1 para que el texto no se expanda innecesariamente
    },
});
