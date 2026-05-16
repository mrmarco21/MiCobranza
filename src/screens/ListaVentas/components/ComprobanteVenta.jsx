import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { formatCurrency, obtenerNombreProductoCompleto } from '../../../shared/utils/helpers';

export default function ComprobanteVenta({ venta, storeName, storeLogo, deudaActual, estadoPago }) {
    // Formatear fecha
    const fechaVenta = new Date(venta.fecha);
    const fechaFormateada = fechaVenta.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    // Determinar tipo de venta
    let tipoVenta = '';
    if (venta.tipo === 'CONTADO') {
        tipoVenta = 'Venta al Contado';
    } else if (venta.tipo === 'CREDITO') {
        tipoVenta = 'Venta a Crédito';
    } else if (venta.tipo === 'PARCIAL') {
        tipoVenta = 'Venta Parcial';
    }

    return (
        <View style={styles.container}>
            {/* Header con logo y nombre */}
            <View style={styles.header}>
                <Image
                    source={require('../../../../assets/icon_app.png')}
                    style={styles.logo}
                />
                <Text style={styles.storeName}>{storeName}</Text>
                <Text style={styles.subtitle}>COMPROBANTE DE VENTA</Text>
            </View>

            {/* Línea separadora */}
            <View style={styles.divider} />

            {/* Información de la venta */}
            <View style={styles.infoSection}>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Nº Documento:</Text>
                    <Text style={styles.infoValue}>{venta.numeroDocumento || 'S/N'}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Fecha:</Text>
                    <Text style={styles.infoValueSmall}>{fechaFormateada}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Cliente:</Text>
                    <Text style={styles.infoValue}>{venta.clienteNombre}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Tipo:</Text>
                    <Text style={styles.infoValue}>{tipoVenta}</Text>
                </View>
            </View>

            {/* Línea separadora */}
            <View style={styles.divider} />

            {/* Productos */}
            <View style={styles.productosSection}>
                <Text style={styles.sectionTitle}>PRODUCTOS</Text>

                {/* Encabezado de tabla */}
                <View style={styles.tablaHeader}>
                    <Text style={[styles.tablaHeaderText, { flex: 2.5 }]}>Nombre</Text>
                    <Text style={[styles.tablaHeaderText, { flex: 1, textAlign: 'right' }]}>Precio</Text>
                    <Text style={[styles.tablaHeaderText, { flex: 0.8, textAlign: 'center' }]}>Cant.</Text>
                    <Text style={[styles.tablaHeaderText, { flex: 1.2, textAlign: 'right' }]}>Total</Text>
                </View>

                {/* Filas de productos */}
                {venta.productos.map((producto, index) => {
                    const subtotal = producto.precioVenta * (producto.cantidad || 1);
                    return (
                        <View key={index} style={styles.tablaFila}>
                            <Text style={[styles.tablaTexto, styles.productoNombre, { flex: 2.5 }]}>
                                {obtenerNombreProductoCompleto(producto)}
                            </Text>
                            <Text style={[styles.tablaTexto, { flex: 1, textAlign: 'right' }]}>
                                {formatCurrency(producto.precioVenta)}
                            </Text>
                            <Text style={[styles.tablaTexto, { flex: 0.8, textAlign: 'center', fontWeight: '600' }]}>
                                {producto.cantidad || 1}
                            </Text>
                            <Text style={[styles.tablaTexto, styles.tablaTotal, { flex: 1.2, textAlign: 'right' }]}>
                                {formatCurrency(subtotal)}
                            </Text>
                        </View>
                    );
                })}
            </View>

            {/* Línea separadora */}
            <View style={styles.divider} />

            {/* Total */}
            <View style={styles.totalSection}>
                <Text style={styles.totalLabel}>TOTAL:</Text>
                <Text style={styles.totalValue}>{formatCurrency(venta.total)}</Text>
            </View>

            {/* Información de pago */}
            {venta.tipo === 'CONTADO' && (
                <View style={styles.pagoSection}>
                    <Text style={styles.pagoTitle}>MÉTODO DE PAGO:</Text>
                    {venta.metodosPago && venta.metodosPago.length > 0 ? (
                        venta.metodosPago.map((metodo, index) => (
                            <View key={index} style={styles.pagoRow}>
                                <Text style={styles.pagoMetodo}>{metodo.nombre}:</Text>
                                <Text style={styles.pagoMonto}>{formatCurrency(metodo.monto)}</Text>
                            </View>
                        ))
                    ) : (
                        <Text style={styles.pagoMetodo}>{venta.metodoPago || 'EFECTIVO'}</Text>
                    )}
                </View>
            )}

            {venta.tipo === 'PARCIAL' && (
                <View style={styles.pagoSection}>
                    <View style={styles.pagoRow}>
                        <Text style={styles.pagoLabel}>Monto pagado:</Text>
                        <Text style={styles.pagoMonto}>{formatCurrency(venta.montoPagado || 0)}</Text>
                    </View>
                    <View style={styles.pagoRow}>
                        <Text style={styles.pagoLabel}>Deuda pendiente:</Text>
                        <Text style={styles.deudaMonto}>{formatCurrency(deudaActual)}</Text>
                    </View>
                </View>
            )}

            {venta.tipo === 'CREDITO' && (
                <View style={styles.pagoSection}>
                    <View style={styles.pagoRow}>
                        <Text style={styles.pagoLabel}>Deuda pendiente:</Text>
                        <Text style={styles.deudaMonto}>{formatCurrency(deudaActual)}</Text>
                    </View>
                </View>
            )}

            {/* Estado */}
            <View style={styles.estadoSection}>
                {venta.anulada ? (
                    <View style={styles.estadoBadgeAnulado}>
                        <Text style={styles.estadoTextAnulado}>⚠️ VENTA ANULADA</Text>
                    </View>
                ) : (
                    <View style={styles.estadoBadge}>
                        <Text style={styles.estadoText}>Estado: {estadoPago}</Text>
                    </View>
                )}
            </View>

            {/* Comentario */}
            {venta.comentario && (
                <View style={styles.comentarioSection}>
                    <Text style={styles.comentarioLabel}>Nota:</Text>
                    <Text style={styles.comentarioText}>{venta.comentario}</Text>
                </View>
            )}

            {/* Footer */}
            <View style={styles.footer}>
                <Text style={styles.footerText}>Gracias por su compra</Text>
                {/* <Text style={styles.footerEmoji}>🙏</Text> */}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#FFFFFF',
        padding: 24,
        width: 400,
    },
    header: {
        alignItems: 'center',
        marginBottom: 20,
    },
    logo: {
        width: 80,
        height: 80,
        borderRadius: 20,
        marginBottom: 12,
    },
    logoPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#45beffff',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    logoText: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    storeName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginBottom: 4,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
        fontWeight: '600',
        letterSpacing: 1,
    },
    divider: {
        height: 2,
        backgroundColor: '#e0e0e0',
        marginVertical: 16,
    },
    infoSection: {
        marginBottom: 8,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
        alignItems: 'center',
    },
    infoLabel: {
        fontSize: 13,
        color: '#666',
        fontWeight: '600',
        width: 110,
    },
    infoValue: {
        fontSize: 14,
        color: '#1a1a1a',
        fontWeight: '600',
        flex: 1,
        textAlign: 'right',
    },
    infoValueSmall: {
        fontSize: 12,
        color: '#1a1a1a',
        fontWeight: '600',
        flex: 1,
        textAlign: 'right',
    },
    productosSection: {
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginBottom: 12,
        letterSpacing: 0.5,
    },
    tablaHeader: {
        flexDirection: 'row',
        backgroundColor: '#f5f5f5',
        paddingVertical: 8,
        paddingHorizontal: 8,
        borderRadius: 6,
        marginBottom: 8,
    },
    tablaHeaderText: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#666',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    tablaFila: {
        flexDirection: 'row',
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        alignItems: 'center',
    },
    tablaTexto: {
        fontSize: 12,
        color: '#1a1a1a',
    },
    productoNombre: {
        fontWeight: '600',
        lineHeight: 16,
    },
    tablaTotal: {
        fontWeight: 'bold',
        color: '#45beffff',
    },
    totalSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        padding: 16,
        borderRadius: 8,
        marginBottom: 16,
    },
    totalLabel: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1a1a1a',
        letterSpacing: 0.5,
    },
    totalValue: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#45beffff',
    },
    pagoSection: {
        marginBottom: 16,
        backgroundColor: '#f9f9f9',
        padding: 12,
        borderRadius: 8,
    },
    pagoTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#666',
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    pagoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    pagoLabel: {
        fontSize: 12,
        color: '#666',
        fontWeight: '600',
    },
    pagoMetodo: {
        fontSize: 12,
        color: '#1a1a1a',
        fontWeight: '600',
    },
    pagoMonto: {
        fontSize: 13,
        color: '#1a1a1a',
        fontWeight: '600',
    },
    deudaMonto: {
        fontSize: 13,
        color: '#e74c3c',
        fontWeight: 'bold',
    },
    estadoSection: {
        alignItems: 'center',
        marginBottom: 16,
    },
    estadoBadge: {
        backgroundColor: '#4CAF50',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    estadoText: {
        fontSize: 12,
        color: '#FFFFFF',
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    estadoBadgeAnulado: {
        backgroundColor: '#e74c3c',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    estadoTextAnulado: {
        fontSize: 12,
        color: '#FFFFFF',
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    comentarioSection: {
        backgroundColor: '#fff9e6',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
        borderLeftWidth: 3,
        borderLeftColor: '#FFB800',
    },
    comentarioLabel: {
        fontSize: 11,
        color: '#666',
        fontWeight: 'bold',
        marginBottom: 4,
    },
    comentarioText: {
        fontSize: 12,
        color: '#1a1a1a',
        lineHeight: 18,
    },
    footer: {
        alignItems: 'center',
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
    },
    footerText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '600',
        marginBottom: 4,
    },
    footerEmoji: {
        fontSize: 24,
    },
});
