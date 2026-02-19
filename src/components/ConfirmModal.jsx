import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';

export default function ConfirmModal({
    visible,
    onClose,
    title,
    message,
    icon,
    iconColor = '#45beffff',
    buttons = [],
}) {
    const { colors } = useTheme();
    const styles = createStyles(colors);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modal}>
                    {icon && (
                        <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
                            <Ionicons name={icon} size={48} color={iconColor} />
                        </View>
                    )}

                    <Text style={styles.title}>{title}</Text>

                    <ScrollView style={styles.messageContainer}>
                        <Text style={styles.message}>{message}</Text>
                    </ScrollView>

                    <View style={styles.buttonsContainer}>
                        {buttons.map((button, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[
                                    styles.button,
                                    button.style === 'destructive' && styles.buttonDestructive,
                                    button.style === 'primary' && styles.buttonPrimary,
                                ]}
                                onPress={() => {
                                    onClose();
                                    if (button.onPress) {
                                        button.onPress();
                                    }
                                }}
                            >
                                <Text
                                    style={[
                                        styles.buttonText,
                                        button.style === 'destructive' && styles.buttonTextDestructive,
                                        button.style === 'primary' && styles.buttonTextPrimary,
                                    ]}
                                >
                                    {button.text}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const createStyles = (colors) => StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modal: {
        backgroundColor: colors.card,
        borderRadius: 20,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        maxHeight: '80%',
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: colors.text,
        textAlign: 'center',
        marginBottom: 12,
    },
    messageContainer: {
        maxHeight: 300,
        marginBottom: 24,
    },
    message: {
        fontSize: 15,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
    },
    buttonsContainer: {
        gap: 10,
    },
    button: {
        padding: 16,
        borderRadius: 12,
        backgroundColor: colors.border,
        alignItems: 'center',
    },
    buttonPrimary: {
        backgroundColor: '#45beffff',
    },
    buttonDestructive: {
        backgroundColor: '#FFEBEE',
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },
    buttonTextPrimary: {
        color: '#FFFFFF',
    },
    buttonTextDestructive: {
        color: '#e74c3c',
    },
});

