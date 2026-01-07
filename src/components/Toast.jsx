import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Toast({ visible, message, type = 'success', onHide, duration = 2500 }) {
    const insets = useSafeAreaInsets();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(-20)).current;

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
                        toValue: -20,
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
        switch (type) {
            case 'success':
                return { icon: 'checkmark-circle', color: '#4CAF50', bg: '#E8F5E9' };
            case 'error':
                return { icon: 'close-circle', color: '#FF6B6B', bg: '#FFE5E5' };
            case 'warning':
                return { icon: 'warning', color: '#FF9800', bg: '#FFF3E0' };
            default:
                return { icon: 'information-circle', color: '#2196F3', bg: '#E3F2FD' };
        }
    };

    const config = getConfig();

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    top: insets.top + 10,
                    opacity: fadeAnim,
                    transform: [{ translateY }],
                    backgroundColor: config.bg,
                    borderLeftColor: config.color,
                }
            ]}
        >
            <Ionicons name={config.icon} size={22} color={config.color} />
            <Text style={[styles.message, { color: config.color }]}>{message}</Text>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 16,
        right: 16,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderLeftWidth: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 6,
        zIndex: 9999,
        gap: 12,
    },
    message: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
    },
});
