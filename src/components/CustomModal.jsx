import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
    const getIconConfig = () => {
        switch (type) {
            case 'success':
                return { name: 'checkmark-circle', color: '#4CAF50', bg: '#E8F5E9' };
            case 'error':
                return { name: 'close-circle', color: '#FF6B6B', bg: '#FFE5E5' };
            case 'warning':
                return { name: 'warning', color: '#FF9800', bg: '#FFF3E0' };
            case 'confirm':
                return { name: 'help-circle', color: '#6C5CE7', bg: '#F0EBFF' };
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

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    container: {
        backgroundColor: '#FFFFFF',
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
        color: '#2D3436',
        textAlign: 'center',
        marginBottom: 8,
    },
    message: {
        fontSize: 14,
        color: '#636E72',
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
        backgroundColor: '#F5F5F5',
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#636E72',
    },
    confirmButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#6C5CE7',
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
