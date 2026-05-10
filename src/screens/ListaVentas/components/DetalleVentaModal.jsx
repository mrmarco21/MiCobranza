import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../shared/hooks/useTheme';
import { formatCurrency } from '../../../shared/utils/helpers';

export default function DetalleVentaModal({ visible, venta, onClose }) {
    const { colors } = useTheme();
    const styles = createStyles(colors);

    if (!venta) return null;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <View>
                            <Text style={styles.modalTitle}>Detalle de Venta</Text>
                            <Text style={styles.modalSubtitle}>{venta.numeroDocumento}</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.closeBtn}
                            onPress={onClose}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="close" size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    {/* Información del cliente */}
                    <View style={styles.infoSection}>
                        <View style={styles.infoRow}>
                            <Ionicons name="person-outline" size={18} color={colors.textSecondary} />
                            <Text style={styles.infoLabel}>Cliente:</Text>
                            <Text style={styles.infoValue}>{venta.clienteNombre}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
                            <Text style={styles.infoLabel}>Fecha:</Text>
                            <Text style={styles.infoValue}>
                                {new Date(venta.fecha).toLocaleDateString('es-PE', {
                                    day: '2-digit',
                                    month: 'long',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Ionicons name="card-outline" size={18} color={colors.textSecondary} />
                            <Text style={styles.infoLabel}>Tipo:</Text>
                            <Text style={styles.infoValue}>{venta.tipo}</Text>
                        </View>
                    </View>

                    {/* Lista de productos */}
                    <View style={styles.productosSection}>
                        <Text style={styles.sectionTitle}>Productos</Text>
                        <ScrollView style={styles.productosScroll} showsVerticalScrollIndicator={false}>
                            {venta.productos.map((producto, index) => (
                                <View key={index} style={styles.productoCard}>
                                    <View style={styles.productoInfo}>
                                        <Text style={styles.productoNombre}>{producto.nombre}</Text>
                                        <Text style={styles.productoCategoria}>
                                            {producto.categoria || 'Sin categoría'}
                                        </Text>
                                    </View>
                                    <View style={styles.productoPrecio}>
                                        <Text style={styles.productoCantidad}>
                                            x{producto.cantidad || 1}
                                        </Text>
                                        <Text style={styles.productoPrecioTexto}>
                                            {formatCurrency(producto.precioVenta)}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Total */}
                    <View style={styles.totalSection}>
                        <Text style={styles.totalLabel}>Total:</Text>
                        <Text style={styles.totalValue}>{formatCurrency(venta.total)}</Text>
                    </View>

                    {/* Botones de acción */}
                    <View style={styles.accionesContainer}>
                        <TouchableOpacity
                            style={styles.accionBtn}
                            onPress={onClose}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="share-outline" size={20} color="#30acefff" />
                            <Text style={styles.accionBtnTexto}>Compartir</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.accionBtn, styles.accionBtnDanger]}
                            onPress={onClose}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
                            <Text style={[styles.accionBtnTexto, styles.accionBtnTextoDanger]}>
                                Anular
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const createStyles = (colors) => StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.card,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '90%',
        paddingBottom: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 4,
    },
    modalSubtitle: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoSection: {
        padding: 20,
        gap: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    infoLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textSecondary,
        width: 60,
    },
    infoValue: {
        fontSize: 14,
        color: colors.text,
        flex: 1,
    },
    productosSection: {
        padding: 20,
        maxHeight: 300,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 12,
    },
    productosScroll: {
        maxHeight: 250,
    },
    productoCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.background,
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
    },
    productoInfo: {
        flex: 1,
        gap: 4,
    },
    productoNombre: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
    },
    productoCategoria: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    productoPrecio: {
        alignItems: 'flex-end',
        gap: 4,
    },
    productoCantidad: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    productoPrecioTexto: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text,
    },
    totalSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: '#30acefff',
        marginHorizontal: 20,
        borderRadius: 12,
        marginBottom: 16,
    },
    totalLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFF',
    },
    totalValue: {
        fontSize: 20,
        fontWeight: '700',
        color: '#FFF',
    },
    accionesContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 12,
    },
    accionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: '#30acefff',
    },
    accionBtnDanger: {
        borderColor: '#FF6B6B',
    },
    accionBtnTexto: {
        fontSize: 14,
        fontWeight: '600',
        color: '#30acefff',
    },
    accionBtnTextoDanger: {
        color: '#FF6B6B',
    },
});
