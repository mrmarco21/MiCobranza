import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';

export default function CollapsibleSection({
    title,
    subtitle,
    description,
    icon,
    iconColor = '#45beffff',
    children,
    defaultExpanded = false,
}) {
    const { colors } = useTheme();
    const styles = createStyles(colors);
    const [expanded, setExpanded] = useState(defaultExpanded);
    const [animation] = useState(new Animated.Value(defaultExpanded ? 1 : 0));

    const toggleExpand = () => {
        const toValue = expanded ? 0 : 1;
        Animated.spring(animation, {
            toValue,
            useNativeDriver: false,
            friction: 8,
        }).start();
        setExpanded(!expanded);
    };

    const rotateInterpolate = animation.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '180deg'],
    });

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={[styles.header, expanded && styles.headerExpanded]}
                onPress={toggleExpand}
                activeOpacity={0.7}
            >
                <View style={styles.headerLeft}>
                    <View style={styles.iconWrapper}>
                        <Ionicons name={icon} size={20} color={iconColor} />
                    </View>
                    <View style={styles.headerText}>
                        <View style={styles.titleRow}>
                            <Text style={styles.title}>{title}</Text>
                            {subtitle && (
                                <Text style={styles.subtitle}>{subtitle}</Text>
                            )}
                        </View>
                        {!expanded && description && (
                            <Text style={styles.description} numberOfLines={1}>
                                {description}
                            </Text>
                        )}
                    </View>
                </View>
                <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
                    <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                </Animated.View>
            </TouchableOpacity>

            {expanded && (
                <>
                    <View style={styles.divider} />
                    <View style={styles.content}>{children}</View>
                </>
            )}
        </View>
    );
}

const createStyles = (colors) => StyleSheet.create({
    container: {
        backgroundColor: colors.card,
        borderRadius: 18,
        marginBottom: 14,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 15,
    },
    headerExpanded: {
        paddingBottom: 13,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        flex: 1,
    },
    iconWrapper: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surfaceVariant,
        borderWidth: 1,
        borderColor: colors.border,
    },
    headerText: {
        marginLeft: 12,
        flex: 1,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
    },
    subtitle: {
        fontSize: 11,
        color: colors.textSecondary,
        marginLeft: 8,
        backgroundColor: colors.surfaceVariant,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
        overflow: 'hidden',
    },
    description: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 3,
    },
    divider: {
        height: 1,
        backgroundColor: colors.border,
        marginHorizontal: 16,
    },
    content: {
        padding: 16,
        paddingTop: 14,
    },
});

