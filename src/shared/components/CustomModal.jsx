import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';

export default function CustomModal({
    visible,
    onClose,
    title,
    message,
    type = 'info', // 'info', 'success', 'error', 'warning', 'confirm'
    confirmText = 'Aceptar',
    cancelText = 'Cancelar',
    onConfirm,
    showCancel = false,
    destructive = false,
}) {
    const { colors } = useTheme();
    const styles = createStyles(colors);

    const getIconConfig = () => {
        switch (type) {
            case 'success':
                return { name: 'checkmark-circle', color: '#4CAF50', bg: '#E8F5E9' };
            case 'error':
                return { name: 'close-circle', color: '#FF6B6B', bg: '#FFE5E5' };
            case 'warning':
                return { name: 'warning', color: '#FF9800', bg: '#FFF3E0' };
            case 'confirm':
                return { name: 'help-circle', color: '#29B6F6', bg: '#E1F5FE' };
            default:
                return { name: 'information-circle', color: '#2196F3', bg: '#E3F2FD' };
        }
    };

    const icon = getIconConfig();

    const handleConfirm = () => {
        if (onConfirm) onConfirm();
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={[styles.iconContainer, { backgroundColor: icon.bg }]}>
                        <Ionicons name={icon.name} size={40} color={icon.color} />
                    </View>

                    <Text style={styles.title}>{title}</Text>
                    {message && <Text style={styles.message}>{message}</Text>}

                    <View style={styles.buttonsContainer}>
                        {showCancel && (
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={onClose}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.cancelButtonText}>{cancelText}</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={[
                                styles.confirmButton,
                                destructive && styles.destructiveButton,
                                !showCancel && styles.fullWidthButton
                            ]}
                            onPress={handleConfirm}
                            activeOpacity={0.7}
                        >
                            <Text style={[
                                styles.confirmButtonText,
                                destructive && styles.destructiveButtonText
                            ]}>
                                {confirmText}
                            </Text>
                        </TouchableOpacity>
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
    container: {
        backgroundColor: colors.card,
        borderRadius: 20,
        padding: 24,
        width: '100%',
        maxWidth: 320,
        alignItems: 'center',
    },
    iconContainer: {
        width: 70,
        height: 70,
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
        textAlign: 'center',
        marginBottom: 8,
    },
    message: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 20,
    },
    buttonsContainer: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: colors.border,
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    confirmButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#29B6F6',
        alignItems: 'center',
    },
    fullWidthButton: {
        flex: 1,
    },
    confirmButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    destructiveButton: {
        backgroundColor: '#FF6B6B',
    },
    destructiveButtonText: {
        color: '#FFFFFF',
    },
});


