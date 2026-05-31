import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../shared/hooks/useTheme';

export default function CuentasMenuModal({ visible, onClose, onOrdenar, onMantenimiento, anchorPosition }) {
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
                                    onOrdenar();
                                }}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.menuItemText}>Ordenar</Text>
                                <Ionicons name="chevron-forward" size={18} color="#95A5A6" style={styles.chevron} />
                            </TouchableOpacity>

                            <View style={styles.separator} />

                            <TouchableOpacity
                                style={styles.menuItem}
                                onPress={() => {
                                    onClose();
                                    onMantenimiento();
                                }}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.menuItemText}>Mantenimiento</Text>
                                <Ionicons name="chevron-forward" size={18} color="#95A5A6" style={styles.chevron} />
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
        minWidth: 180,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 5,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 11,
        paddingHorizontal: 10,
        gap: 12,
    },
    menuItemText: {
        fontSize: 15,
        color: '#2C3E50',
        fontWeight: '500',
        flex: 1,
    },
    chevron: {
        marginLeft: 'auto',
    },
    separator: {
        height: 1,
        backgroundColor: '#E0E0E0',
        marginVertical: 4,
    },
});
