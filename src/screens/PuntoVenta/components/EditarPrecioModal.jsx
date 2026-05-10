import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, TouchableWithoutFeedback, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../shared/hooks/useTheme';
import { formatCurrency } from '../../../shared/utils/helpers';

export default function EditarPrecioModal({ visible, onClose, producto, onGuardar }) {
    const { colors } = useTheme();
    const styles = createStyles(colors);

    const [precio, setPrecio] = useState('');

    useEffect(() => {
        if (visible && producto) {
            setPrecio(producto.precioVenta?.toString() || '0');
        }
    }, [visible, producto]);

    const handleGuardar = () => {
        const nuevoPrecio = parseFloat(precio) || 0;

        if (nuevoPrecio <= 0) {
            return;
        }

        onGuardar(nuevoPrecio);
        onClose();
    };

    if (!producto) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback>
                        <View style={styles.modalContainer}>
                            <View style={styles.handle} />

                            <View style={styles.content}>
                                <Text style={styles.title}>Editar Precio</Text>
                                <Text style={styles.productoNombre}>{producto.nombre}</Text>

                                <View style={styles.inputContainer}>
                                    <Ionicons name="cash-outline" size={24} color="#29B6F6" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        value={precio}
                                        onChangeText={setPrecio}
                                        keyboardType="decimal-pad"
                                        placeholder="0.00"
                                        placeholderTextColor="#95A5A6"
                                        autoFocus
                                        selectTextOnFocus
                                    />
                                </View>

                                {producto.precioVentaOriginal && parseFloat(precio) !== producto.precioVentaOriginal && (
                                    <Text style={styles.precioOriginal}>
                                        Precio original: {formatCurrency(producto.precioVentaOriginal)}
                                    </Text>
                                )}

                                <View style={styles.buttonContainer}>
                                    <TouchableOpacity
                                        style={styles.cancelButton}
                                        onPress={onClose}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.cancelButtonText}>Cancelar</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.saveButton}
                                        onPress={handleGuardar}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.saveButtonText}>Guardar</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
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
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 20,
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: '#E0E0E0',
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 8,
    },
    content: {
        paddingHorizontal: 20,
        paddingTop: 12,
        gap: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#2C3E50',
        textAlign: 'center',
    },
    productoNombre: {
        fontSize: 15,
        fontWeight: '600',
        color: '#7F8C8D',
        textAlign: 'center',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#29B6F6',
        borderRadius: 12,
        paddingHorizontal: 16,
        backgroundColor: '#F8F9FA',
        marginTop: 8,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        paddingVertical: 16,
        fontSize: 24,
        color: '#2C3E50',
        fontWeight: '700',
    },
    precioOriginal: {
        fontSize: 13,
        color: '#7F8C8D',
        textAlign: 'center',
        fontStyle: 'italic',
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#E0E0E0',
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2C3E50',
    },
    saveButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#29B6F6',
        alignItems: 'center',
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});
