import { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../hooks/useTheme';

export default function FloatingLabelInput({
    label,
    value,
    onChangeText,
    placeholder,
    keyboardType = 'default',
    multiline = false,
    numberOfLines = 1,
    maxLength,
    icon: IconComponent,
    editable = true,
    style,
    inputStyle,
    ...props
}) {
    const { colors } = useTheme();
    const [isFocused, setIsFocused] = useState(false);
    const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;

    useEffect(() => {
        Animated.timing(animatedValue, {
            toValue: isFocused || value ? 1 : 0,
            duration: 200,
            useNativeDriver: false,
        }).start();
    }, [isFocused, value]);

    const labelStyle = {
        position: 'absolute',
        left: IconComponent ? 46 : 14,
        top: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [multiline ? 18 : 14, -8],
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
            minHeight: multiline ? 100 : 48,
        },
        style,
    ];

    const textInputStyle = [
        styles.input,
        {
            color: colors.text,
            paddingLeft: IconComponent ? 46 : 14,
            paddingTop: multiline ? 20 : 14,
            paddingBottom: multiline ? 10 : 14,
            minHeight: multiline ? 100 : 48,
        },
        inputStyle,
    ];

    return (
        <View style={containerStyle}>
            <Animated.Text style={labelStyle}>
                {label}
            </Animated.Text>
            {IconComponent && (
                <View style={styles.iconContainer}>
                    {IconComponent}
                </View>
            )}
            <TextInput
                style={textInputStyle}
                value={value}
                onChangeText={onChangeText}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={isFocused ? placeholder : ''}
                placeholderTextColor={colors.textSecondary}
                keyboardType={keyboardType}
                multiline={multiline}
                numberOfLines={numberOfLines}
                maxLength={maxLength}
                editable={editable}
                textAlignVertical={multiline ? 'top' : 'center'}
                {...props}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        borderWidth: 1,
        borderRadius: 10,
        justifyContent: 'center',
    },
    input: {
        fontSize: 14,
        paddingHorizontal: 14,
        paddingVertical: 14,
    },
    iconContainer: {
        position: 'absolute',
        left: 14,
        top: 14,
        zIndex: 2,
    },
});
