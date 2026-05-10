import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';

export default function CollapsibleSection({
    title,
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
                style={styles.header}
                onPress={toggleExpand}
                activeOpacity={0.7}
            >
                <View style={styles.headerLeft}>
                    <Ionicons name={icon} size={24} color={iconColor} />
                    <View style={styles.headerText}>
                        <Text style={styles.title}>{title}</Text>
                        {!expanded && description && (
                            <Text style={styles.description} numberOfLines={1}>
                                {description}
                            </Text>
                        )}
                    </View>
                </View>
                <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
                    <Ionicons name="chevron-down" size={24} color={colors.textSecondary} />
                </Animated.View>
            </TouchableOpacity>

            {expanded && <View style={styles.content}>{children}</View>}
        </View>
    );
}

const createStyles = (colors) => StyleSheet.create({
    container: {
        backgroundColor: colors.card,
        borderRadius: 12,
        marginBottom: 12,
        overflow: 'hidden',
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    headerText: {
        marginLeft: 12,
        flex: 1,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
    },
    description: {
        fontSize: 13,
        color: colors.textSecondary,
        marginTop: 2,
    },
    content: {
        padding: 16,
        paddingTop: 0,
    },
});

