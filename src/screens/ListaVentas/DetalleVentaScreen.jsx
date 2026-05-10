import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../shared/hooks/useTheme';
import { formatCurrency } from '../../shared/utils/helpers';
import Header from '../../shared/components/Header';
import { useToast } from '../../shared/context/ToastContext';

export default function DetalleVentaScreen({ route, navigation }) {
    const { venta } = route.params;
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const styles = createStyles(colors);
    const { showToast } = useToast();
    const [menuVisible, setMenuVisible] = useState(false);

    if (!venta) {
        return null;
    }

    const esContado = venta.tipo === 'CONTADO';

    const handleCopiarVenta = () => {
        setMenuVisible(false);

        // Preparar productos para copiar al punto de venta
        const productosParaCopiar = venta.productos.map(p => ({
            ...p,
            cantidad: p.cantidad || 1,
            // Mantener el precio de venta original
            precioVenta: p.precioVenta,
            precioVentaOriginal: p.precioVentaOriginal || p.precioVenta,
        }));

        // Navegar al punto de venta con los productos
        navigation.navigate('PuntoVenta', {
            productosSeleccionados: productosParaCopiar,
            clienteSeleccionado: venta.clienteId ? {
                id: venta.clienteId,
                nombre: venta.clienteNombre
            } : null,
        });

        showToast({
            type: 'success',
            text: 'Productos copiados al Punto de Venta',
        });
    };

    return (
        <View style={styles.container}>
            <Header
                title={`${venta.numeroDocumento} (${venta.productos?.length || 0})`}
                showBack
                rightButtons={[
                    {
                        icon: 'print-outline',
                        onPress: () => { }
                    },
                    {
                        icon: 'share-outline',
                        onPress: () => { }
                    },
                    ...(venta.anulada ? [{
                        icon: 'ellipsis-vertical',
                        onPress: () => setMenuVisible(true)
                    }] : [])
                ]}
            />

            {/* Modal de menú para ventas anuladas */}
            {venta.anulada && (
                <Modal
                    visible={menuVisible}
                    transparent={true}
                    animationType="none"
                    onRequestClose={() => setMenuVisible(false)}
                >
                    <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
                        <View style={styles.menuOverlay}>
                            <TouchableWithoutFeedback>
                                <View style={[styles.menuContainer, { top: insets.top + 20, right: 10 }]}>
                                    <TouchableOpacity
                                        style={styles.menuItem}
                                        onPress={handleCopiarVenta}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name="copy-outline" size={20} color="#2C3E50" />
                                        <Text style={styles.menuItemText}>Copiar venta</Text>
                                    </TouchableOpacity>
                                </View>
                            </TouchableWithoutFeedback>
                        </View>
                    </TouchableWithoutFeedback>
                </Modal>
            )}

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: Math.max(insets.bottom + 20, 20) }
                ]}
                showsVerticalScrollIndicator={false}
            >
                {/* Banner de venta anulada */}
                {venta.anulada && (
                    <View style={styles.bannerAnulada}>
                        <Ionicons name="close-circle" size={24} color="#FF6B6B" />
                        <View style={styles.bannerAnuladaTexto}>
                            <Text style={styles.bannerAnuladaTitulo}>VENTA ANULADA</Text>
                            <Text style={styles.bannerAnuladaDescripcion}>
                                Esta venta fue anulada y no es válida
                            </Text>
                        </View>
                    </View>
                )}

                {/* Información del cliente y fecha */}
                <View style={styles.infoSection}>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Cliente:</Text>
                        <Text style={styles.infoValue}>{venta.clienteNombre}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Vendedor:</Text>
                        <Text style={styles.infoValue}>-</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Fecha Op.:</Text>
                        <Text style={styles.infoValue}>
                            {new Date(venta.fecha).toLocaleDateString('es-PE', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </Text>
                    </View>
                </View>

                {/* Detalle de pagos (solo para contado) */}
                {esContado && venta.metodosPago && venta.metodosPago.length > 0 && (
                    <View style={styles.pagosSection}>
                        <Text style={styles.sectionTitle}>Detalle de pagos:</Text>
                        {venta.metodosPago.map((metodo, index) => (
                            <View key={index} style={styles.pagoRow}>
                                <Text style={styles.pagoMetodo}>{metodo.nombre}</Text>
                                <Text style={styles.pagoMonto}>{formatCurrency(metodo.monto)}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Total cobrado (contado) o Total a cobrar (crédito) */}
                <View style={[
                    styles.totalSection,
                    venta.anulada ? styles.totalAnulada :
                        esContado ? styles.totalCobrado : styles.totalACobrar
                ]}>
                    <Text style={styles.totalLabel}>
                        {venta.anulada ? 'Total anulado' :
                            esContado ? 'Total cobrado' : 'Total a cobrar'}
                    </Text>
                    <Text style={styles.totalValue}>{formatCurrency(venta.total)}</Text>
                </View>

                {/* Deuda pendiente (solo para crédito y no anuladas) */}
                {!esContado && !venta.anulada && venta.deuda > 0 && venta.cuentaId && (
                    <TouchableOpacity
                        style={styles.deudaSection}
                        onPress={() => navigation.navigate('DetalleCuenta', {
                            cuentaId: venta.cuentaId,
                            clientaNombre: venta.clienteNombre
                        })}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.deudaLabel}>Deuda pendiente:</Text>
                        <Text style={styles.deudaValue}>
                            {formatCurrency(venta.deuda)} (PAGAR)
                        </Text>
                    </TouchableOpacity>
                )}

                {/* Tabla de productos */}
                <View style={styles.productosSection}>
                    {/* Header de la tabla */}
                    <View style={styles.tableHeader}>
                        <Text style={[styles.tableHeaderText, styles.colProducto]}>PRODUCTO</Text>
                        <Text style={[styles.tableHeaderText, styles.colPrecio]}>PRECIO</Text>
                        <Text style={[styles.tableHeaderText, styles.colCantidad]}>#</Text>
                        <Text style={[styles.tableHeaderText, styles.colTotal]}>TOTAL</Text>
                    </View>

                    {/* Filas de productos */}
                    {venta.productos && venta.productos.map((producto, index) => {
                        const precioModificado = producto.precioVentaOriginal && producto.precioVenta !== producto.precioVentaOriginal;

                        return (
                            <View key={index} style={styles.tableRow}>
                                <View style={styles.colProducto}>
                                    <Text style={styles.productoNombre}>{producto.nombre}</Text>
                                </View>
                                <View style={styles.colPrecio}>
                                    {precioModificado ? (
                                        <>
                                            <Text style={[styles.tableText, styles.precioModificado]}>
                                                {formatCurrency(producto.precioVenta)}
                                            </Text>
                                            <Text style={styles.precioOriginalTachado}>
                                                {formatCurrency(producto.precioVentaOriginal)}
                                            </Text>
                                        </>
                                    ) : (
                                        <Text style={styles.tableText}>
                                            {formatCurrency(producto.precioVenta)}
                                        </Text>
                                    )}
                                </View>
                                <Text style={[styles.tableText, styles.colCantidad]}>
                                    {producto.cantidad || 1}
                                </Text>
                                <Text style={[styles.tableText, styles.colTotal]}>
                                    {formatCurrency(producto.precioVenta * (producto.cantidad || 1))}
                                </Text>
                            </View>
                        );
                    })}
                </View>
            </ScrollView>
        </View>
    );
}

// DetalleVentaScreen.jsx — solo cambios de estilo

const createStyles = (colors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        gap: 12,                          // 👈 gap uniforme entre secciones
    },

    // ── BANNER ANULADA ────────────────────────────────────────
    bannerAnulada: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFEBEE',
        borderRadius: 12,
        padding: 16,
        gap: 12,
        borderWidth: 1,
        borderColor: '#FFCDD2',
    },
    bannerAnuladaTexto: {
        flex: 1,
    },
    bannerAnuladaTitulo: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FF6B6B',
        marginBottom: 4,
    },
    bannerAnuladaDescripcion: {
        fontSize: 13,
        color: '#D32F2F',
    },

    // ── INFO SECTION ──────────────────────────────────────────
    infoSection: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 0,                        // 👈 padding manejado por infoRow
        overflow: 'hidden',
        borderWidth: 0.5,
        borderColor: colors.border,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.border,  // 👈 separadores internos sutiles
        gap: 12,
    },
    infoRowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    infoIconWrapper: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#E1F5EE',        // teal-50
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoLabel: {
        fontSize: 11,
        color: colors.textSecondary,
        fontWeight: '500',
        letterSpacing: 0.3,
    },
    infoValue: {
        fontSize: 13,
        color: colors.text,
        fontWeight: '600',
        textAlign: 'right',
        flex: 1,
    },

    // ── PAGOS SECTION ─────────────────────────────────────────
    pagosSection: {
        backgroundColor: colors.card,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 0.5,
        borderColor: colors.border,
    },
    pagosSectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.border,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.textSecondary,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        margin: 5
    },
    tipoBadge: {
        backgroundColor: '#E1F5EE',
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 3,
    },
    tipoBadgeText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#0F6E56',
        letterSpacing: 0.3,
    },
    pagoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 13,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.border,
        gap: 8,
    },
    pagoLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    pagoMetodo: {
        fontSize: 13,
        color: colors.text,
        fontWeight: '400',
    },
    pagoMonto: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.text,
    },

    // ── TOTAL SECTION ─────────────────────────────────────────
    totalSection: {
        borderRadius: 12,
        paddingHorizontal: 20,
        paddingVertical: 18,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    totalCobrado: {
        backgroundColor: '#1D9E75',        // verde más profundo y profesional
    },
    totalACobrar: {
        backgroundColor: '#378ADD',
    },
    totalAnulada: {
        backgroundColor: '#FF6B6B',
    },
    totalLabelWrapper: {
        gap: 2,
    },
    totalLabel: {
        fontSize: 12,
        fontWeight: '500',
        color: 'rgba(255,255,255,0.75)',
    },
    totalSubLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },
    totalValue: {
        fontSize: 24,
        fontWeight: '700',
        color: '#fff',
        letterSpacing: -0.5,
    },

    // ── DEUDA SECTION ─────────────────────────────────────────
    deudaSection: {
        backgroundColor: '#FCEBEB',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 0.5,
        borderColor: '#F09595',
    },
    deudaLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    deudaLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#A32D2D',
    },
    deudaValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#A32D2D',
        textDecorationLine: 'underline',
    },

    // ── PRODUCTOS TABLE ───────────────────────────────────────
    productosSection: {
        backgroundColor: colors.card,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 0.5,
        borderColor: colors.border,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: colors.background,
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.border,
    },
    tableHeaderText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#48C9B0',
        letterSpacing: 0.5,
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 16,
        paddingHorizontal: 14,
        borderBottomWidth: 0.9,
        borderBottomColor: colors.border,
        alignItems: 'center',
    },
    colProducto: { flex: 1 },
    colPrecio: { width: 45,
         alignItems: 'flex-end' },
    colCantidad: { width: 36, textAlign: 'center' },
    colTotal: { width: 68, textAlign: 'right' },
    productoNombre: {
        fontSize: 11.5,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 1,
        lineHeight: 18,
    },
    productoId: {
        fontSize: 10,
        color: colors.textSecondary,
        letterSpacing: 0.2,
    },
    tableText: {
        fontSize: 11,
        color: colors.text,
        fontWeight: '500',
    },
    precioOriginalTachado: {
        fontSize: 11,
        color: colors.textSecondary,
        textDecorationLine: 'line-through',
        marginBottom: 2,
    },
    precioModificado: {
        color: '#FF9800',
        fontWeight: '600',
    },
    tablePrecioText: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '400',
        textAlign: 'right',
        width: 78,
    },

    // ── TABLA FOOTER (totales) ────────────────────────────────
    tableFooter: {
        backgroundColor: colors.background,
        paddingHorizontal: 14,
        paddingVertical: 14,
        gap: 8,
        borderTopWidth: 0.5,
        borderTopColor: colors.border,
    },
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    footerLabel: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    footerValue: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    footerDivider: {
        height: 0.5,
        backgroundColor: colors.border,
        marginVertical: 4,
    },
    footerTotalLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text,
    },
    footerTotalValue: {
        fontSize: 17,
        fontWeight: '700',
        color: '#1D9E75',
    },

    // Menu styles
    menuOverlay: {
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
        elevation: 5,
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