import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../shared/hooks/useTheme';

export default function BorradoresModal({ visible, onClose, onGuardarBorrador, onAbrirBorrador, anchorPosition }) {
    const { colors } = useTheme();
    const styles = createStyles(colors);

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback>
                        <View style={[styles.menuContainer, anchorPosition]}>
                            <TouchableOpacity
                                style={styles.menuItem}
                                onPress={() => {
                                    onClose();
                                    onGuardarBorrador();
                                }}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="save-outline" size={20} color="#29B6F6" />
                                <Text style={styles.menuItemText}>Guardar Borrador</Text>
                            </TouchableOpacity>

                            <View style={styles.separator} />

                            <TouchableOpacity
                                style={styles.menuItem}
                                onPress={() => {
                                    onClose();
                                    onAbrirBorrador();
                                }}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="folder-open-outline" size={20} color="#29B6F6" />
                                <Text style={styles.menuItemText}>Abrir Borrador</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

const createStyles = (colors) => StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    menuContainer: {
        position: 'absolute',
        backgroundColor: '#f3f3f3ff',
        borderRadius: 8,
        paddingVertical: 8,
        minWidth: 200,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        gap: 12,
    },
    menuItemText: {
        fontSize: 15,
        color: '#2C3E50',
        fontWeight: '500',
        flex: 1,
    },
    separator: {
        height: 1,
        backgroundColor: '#E0E0E0',
        marginVertical: 4,
    },
});
