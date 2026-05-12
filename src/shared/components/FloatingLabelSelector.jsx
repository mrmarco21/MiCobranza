import { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';

export default function FloatingLabelSelector({
    label,
    value,
    onPress,
    placeholder = 'Seleccionar',
    icon: IconComponent,
    style,
}) {
    const { colors } = useTheme();
    const [isFocused, setIsFocused] = useState(false);
    const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;

    useEffect(() => {
        Animated.timing(animatedValue, {
            toValue: value ? 1 : 0,
            duration: 200,
            useNativeDriver: false,
        }).start();
    }, [value]);

    const labelStyle = {
        position: 'absolute',
        left: IconComponent ? 46 : 14,
        top: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [14, -8],
        }),
        fontSize: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [14, 11],
        }),
        color: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [colors.textSecondary, isFocused ? '#29B6F6' : colors.textSecondary],
        }),
        backgroundColor: colors.card,
        paddingHorizontal: 4,
        zIndex: 1,
    };

    const containerStyle = [
        styles.container,
        {
            borderColor: isFocused ? '#29B6F6' : colors.border,
            backgroundColor: colors.card,
        },
        style,
    ];

    return (
        <TouchableOpacity
            style={containerStyle}
            onPress={onPress}
            onPressIn={() => setIsFocused(true)}
            onPressOut={() => setIsFocused(false)}
            activeOpacity={0.7}
        >
            <Animated.Text style={labelStyle}>
                {label}
            </Animated.Text>
            {IconComponent && (
                <View style={styles.iconContainer}>
                    {IconComponent}
                </View>
            )}
            <View style={[styles.content, { paddingLeft: IconComponent ? 46 : 14 }]}>
                <Text style={[styles.valueText, { color: value ? colors.text : colors.textSecondary }]}>
                    {value || placeholder}
                </Text>
            </View>
            <View style={styles.chevronContainer}>
                <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        borderWidth: 1,
        borderRadius: 10,
        minHeight: 48,
        justifyContent: 'center',
    },
    iconContainer: {
        position: 'absolute',
        left: 14,
        top: 14,
        zIndex: 2,
    },
    content: {
        paddingHorizontal: 14,
        paddingVertical: 14,
        paddingRight: 40,
    },
    valueText: {
        fontSize: 14,
        fontWeight: '500',
    },
    chevronContainer: {
        position: 'absolute',
        right: 14,
        top: 14,
    },
});
