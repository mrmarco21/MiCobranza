import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency, formatDate, obtenerNombreProductoCompleto } from '../../../shared/utils/helpers';

export default function ResumenClienteImagen({
    clientaNombre,
    cuentas = [],
    totalDeuda = 0,
    movimientosPorCuenta = {},
    categorias = [],
    ventasPorCuenta = {}, // Nueva prop: ventas asociadas a cada cuenta
    mostrarHistorialMovimientos = true // Nueva prop para controlar si se muestra el historial
}) {
    // Separar cuentas activas y cerradas (excluyendo anuladas)
    const cuentasActivas = cuentas.filter(c => c.estado === 'ACTIVA' && c.saldo > 0 && !c.anulada);
    const cuentasCerradas = cuentas.filter(c => (c.estado === 'CERRADA' || c.saldo === 0) && !c.anulada);

    // Función para parsear prendas del comentario
    const parsearPrendas = (comentario) => {
        if (!comentario) return [];
        const partes = comentario.split(' | ');
        return partes.map(parte => {
            // Formato nuevo con cantidad y categoría ID: "LAPICERO - Layconsa - Borrable - AZUL (S/25.00) x 2 [01/01/2026] {ropa-otros}"
            // Usar .+ (greedy) en lugar de .+? (non-greedy) para capturar todo el nombre hasta el paréntesis
            const matchCompleto = parte.match(/^(.+)\s+\(S\/(\d+\.?\d*)\)\s*x\s*(\d+)\s*\[(\d{2}\/\d{2}\/\d{4})\]\s*\{(.+?)\}$/);
            if (matchCompleto) {
                return {
                    descripcion: matchCompleto[1].trim(),
                    monto: parseFloat(matchCompleto[2]),
                    cantidad: parseInt(matchCompleto[3]),
                    fecha: matchCompleto[4],
                    categoria: matchCompleto[5]
                };
            }
            // Formato con categoría pero sin cantidad (datos antiguos)
            const matchSinCantidad = parte.match(/^(.+)\s+\(S\/(\d+\.?\d*)\)\s*\[(\d{2}\/\d{2}\/\d{4})\]\s*\{(.+?)\}$/);
            if (matchSinCantidad) {
                return {
                    descripcion: matchSinCantidad[1].trim(),
                    monto: parseFloat(matchSinCantidad[2]),
                    cantidad: 1,
                    fecha: matchSinCantidad[3],
                    categoria: matchSinCantidad[4]
                };
            }
            // Formato con fecha pero sin categoría ni cantidad
            const matchConFecha = parte.match(/^(.+)\s+\(S\/(\d+\.?\d*)\)\s*\[(\d{2}\/\d{2}\/\d{4})\]$/);
            if (matchConFecha) {
                return {
                    descripcion: matchConFecha[1].trim(),
                    monto: parseFloat(matchConFecha[2]),
                    cantidad: 1,
                    fecha: matchConFecha[3],
                    categoria: null
                };
            }
            // Formato sin fecha: "tajadores (S/20.00)"
            const matchSinFecha = parte.match(/^(.+)\s+\(S\/(\d+\.?\d*)\)$/);
            if (matchSinFecha) {
                return {
                    descripcion: matchSinFecha[1].trim(),
                    monto: parseFloat(matchSinFecha[2]),
                    cantidad: 1,
                    fecha: null,
                    categoria: null
                };
            }
            return { descripcion: parte, monto: null, cantidad: 1, fecha: null, categoria: null };
        });
    };

    const extraerDescripcionAbono = (comentario) => {
        if (!comentario) return '';
        return comentario.replace(/\s*\[\d{2}\/\d{2}\/\d{4}\]$/, '').trim();
    };

    // Obtener productos de una cuenta desde la venta asociada
    const obtenerProductosDeCuenta = (cuentaId) => {
        // Primero intentar obtener de la venta
        const venta = ventasPorCuenta[cuentaId];
        if (venta && venta.productos && venta.productos.length > 0) {
            // Usar productos de la venta con nombres completos
            return venta.productos.map(p => ({
                descripcion: obtenerNombreProductoCompleto(p),
                monto: p.precioVenta,
                cantidad: p.cantidad || 1,
                fecha: null,
                categoria: p.categoria
            }));
        }

        // Fallback: parsear del comentario (para ventas antiguas)
        const movimientos = movimientosPorCuenta[cuentaId] || [];
        const cargos = movimientos.filter(m => m.tipo === 'CARGO');

        const productos = [];
        cargos.forEach(cargo => {
            const prendas = parsearPrendas(cargo.comentario);
            productos.push(...prendas);
        });

        return productos;
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View>
                        <Text style={styles.titulo}>RESUMEN DE CLIENTE</Text>
                        <Text style={styles.subtitulo}>{clientaNombre}</Text>
                    </View>
                    <View style={styles.iconoCliente}>
                        <Ionicons name="person" size={32} color="#29B6F6" />
                    </View>
                </View>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Fecha de reporte:</Text>
                    <Text style={styles.infoValor}>{formatDate(new Date().toISOString())}</Text>
                </View>
            </View>

            {/* Saldo total */}
            <View style={[
                styles.saldoContainer,
                totalDeuda === 0 && styles.saldoContainerPagado
            ]}>
                <Text style={styles.saldoLabel}>DEUDA TOTAL</Text>
                <Text style={[
                    styles.saldoMonto,
                    totalDeuda === 0 && styles.saldoMontoPagado
                ]}>
                    {formatCurrency(totalDeuda)}
                </Text>
                {totalDeuda === 0 && (
                    <View style={styles.pagadoContainer}>
                        <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                        <Text style={styles.saldoPagadoTexto}>Sin deudas pendientes</Text>
                    </View>
                )}
            </View>

            {/* Cuentas activas */}
            {cuentasActivas.length > 0 && (
                <View style={styles.seccionContainer}>
                    <View style={styles.seccionHeader}>
                        <Ionicons name="alert-circle" size={18} color="#FF6B6B" />
                        <Text style={styles.seccionTitulo}>
                            CUENTAS PENDIENTES ({cuentasActivas.length})
                        </Text>
                    </View>
                    <View style={styles.dividerSeccion} />

                    {cuentasActivas.map((cuenta, index) => {
                        const productos = obtenerProductosDeCuenta(cuenta.id);

                        return (
                            <View key={cuenta.id} style={styles.cuentaItem}>
                                <View style={styles.cuentaHeader}>
                                    <View style={styles.cuentaNumeroContainer}>
                                        <View style={styles.numeroBadge}>
                                            <Text style={styles.numeroTexto}>#{cuenta.numeroCuenta || (index + 1)}</Text>
                                        </View>
                                        <View>
                                            <Text style={styles.cuentaFecha}>
                                                Desde {formatDate(cuenta.fechaCreacion)}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text style={styles.cuentaSaldo}>{formatCurrency(cuenta.saldo)}</Text>
                                </View>

                                {/* Lista de productos */}
                                {productos.length > 0 && (
                                    <View style={styles.productosContainer}>
                                        <Text style={styles.productosLabel}>Productos comprados:</Text>

                                        {/* Header de la tabla */}
                                        <View style={styles.productosTableHeader}>
                                            <Text style={[styles.productosTableHeaderText, styles.productosColNombre]}>PRODUCTO</Text>
                                            <Text style={[styles.productosTableHeaderText, styles.productosColPrecio]}>PRECIO</Text>
                                            <Text style={[styles.productosTableHeaderText, styles.productosColCantidad]}>CANT.</Text>
                                            <Text style={[styles.productosTableHeaderText, styles.productosColTotal]}>TOTAL</Text>
                                        </View>

                                        {/* Filas de productos */}
                                        {productos.map((producto, idx) => {
                                            const precioUnitario = producto.monto || 0;
                                            const cantidad = producto.cantidad || 1;
                                            const total = precioUnitario * cantidad;

                                            return (
                                                <View key={idx} style={styles.productoTableRow}>
                                                    <Text style={[styles.productoTableText, styles.productosColNombre]}>{producto.descripcion}</Text>
                                                    <Text style={[styles.productoTableText, styles.productosColPrecio]}>
                                                        {precioUnitario > 0 ? formatCurrency(precioUnitario) : '-'}
                                                    </Text>
                                                    <Text style={[styles.productoTableText, styles.productosColCantidad]}>{cantidad}</Text>
                                                    <Text style={[styles.productoTableText, styles.productosColTotal, styles.productoTableTextBold]}>
                                                        {precioUnitario > 0 ? formatCurrency(total) : '-'}
                                                    </Text>
                                                </View>
                                            );
                                        })}
                                    </View>
                                )}

                                {/* Historial de pagos */}
                                {mostrarHistorialMovimientos && (
                                    <View style={styles.historialContainer}>
                                        <Text style={styles.historialLabel}>Historial de pagos:</Text>
                                        {(movimientosPorCuenta[cuenta.id] || [])
                                            .filter(m => m.tipo === 'ABONO') // Solo mostrar pagos
                                            .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
                                            .map((mov, movIdx, filteredMovs) => {
                                                const descripcionAbono = extraerDescripcionAbono(mov.comentario);

                                                return (
                                                    <View key={movIdx} style={styles.movimientoItem}>
                                                        <View style={styles.movimientoHeader}>
                                                            <View style={styles.movimientoTipo}>
                                                                <View style={styles.indicadorAbono} />
                                                                <Text style={styles.tipoTexto}>
                                                                    {descripcionAbono || 'Pago'}
                                                                </Text>
                                                            </View>
                                                            <Text style={styles.montoAbono}>
                                                                {formatCurrency(mov.monto)}
                                                            </Text>
                                                        </View>
                                                        <Text style={styles.movimientoFecha}>{formatDate(mov.fecha)}</Text>

                                                        {movIdx < filteredMovs.length - 1 && (
                                                            <View style={styles.movimientoDivider} />
                                                        )}
                                                    </View>
                                                );
                                            })}
                                        {(movimientosPorCuenta[cuenta.id] || []).filter(m => m.tipo === 'ABONO').length === 0 && (
                                            <Text style={styles.sinPagosTexto}>No hay pagos registrados</Text>
                                        )}
                                    </View>
                                )}

                                {index < cuentasActivas.length - 1 && <View style={styles.cuentaDivider} />}
                            </View>
                        );
                    })}
                </View>
            )}

            {/* Cuentas cerradas/pagadas */}
            {cuentasCerradas.length > 0 && (
                <View style={styles.seccionContainer}>
                    <View style={styles.seccionHeader}>
                        <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
                        <Text style={[styles.seccionTitulo, styles.seccionTituloPagado]}>
                            CUENTAS PAGADAS ({cuentasCerradas.length})
                        </Text>
                    </View>
                    <View style={styles.dividerSeccion} />

                    {cuentasCerradas.map((cuenta, index) => {
                        const productos = obtenerProductosDeCuenta(cuenta.id);

                        return (
                            <View key={cuenta.id} style={styles.cuentaItem}>
                                <View style={styles.cuentaHeader}>
                                    <View style={styles.cuentaNumeroContainer}>
                                        <View style={[styles.numeroBadge, styles.numeroBadgePagado]}>
                                            <Text style={styles.numeroTexto}>#{cuenta.numeroCuenta || (index + 1)}</Text>
                                        </View>
                                        <View>
                                            <Text style={styles.cuentaFecha}>
                                                {formatDate(cuenta.fechaCreacion)} - {formatDate(cuenta.fechaCierre)}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.pagadoBadge}>
                                        <Ionicons name="checkmark" size={14} color="#4CAF50" />
                                        <Text style={styles.pagadoTexto}>PAGADO</Text>
                                    </View>
                                </View>

                                {/* Lista de productos */}
                                {productos.length > 0 && (
                                    <View style={styles.productosContainer}>
                                        <Text style={styles.productosLabel}>Productos comprados:</Text>

                                        {/* Header de la tabla */}
                                        <View style={styles.productosTableHeader}>
                                            <Text style={[styles.productosTableHeaderText, styles.productosColNombre]}>PRODUCTO</Text>
                                            <Text style={[styles.productosTableHeaderText, styles.productosColPrecio]}>PRECIO</Text>
                                            <Text style={[styles.productosTableHeaderText, styles.productosColCantidad]}>CANT.</Text>
                                            <Text style={[styles.productosTableHeaderText, styles.productosColTotal]}>TOTAL</Text>
                                        </View>

                                        {/* Filas de productos */}
                                        {productos.map((producto, idx) => {
                                            const precioUnitario = producto.monto || 0;
                                            const cantidad = producto.cantidad || 1;
                                            const total = precioUnitario * cantidad;

                                            return (
                                                <View key={idx} style={styles.productoTableRow}>
                                                    <Text style={[styles.productoTableText, styles.productosColNombre]}>{producto.descripcion}</Text>
                                                    <Text style={[styles.productoTableText, styles.productosColPrecio]}>
                                                        {precioUnitario > 0 ? formatCurrency(precioUnitario) : '-'}
                                                    </Text>
                                                    <Text style={[styles.productoTableText, styles.productosColCantidad]}>{cantidad}</Text>
                                                    <Text style={[styles.productoTableText, styles.productosColTotal, styles.productoTableTextBold]}>
                                                        {precioUnitario > 0 ? formatCurrency(total) : '-'}
                                                    </Text>
                                                </View>
                                            );
                                        })}
                                    </View>
                                )}

                                {/* Historial de pagos */}
                                {mostrarHistorialMovimientos && (
                                    <View style={styles.historialContainer}>
                                        <Text style={styles.historialLabel}>Historial de pagos:</Text>
                                        {(movimientosPorCuenta[cuenta.id] || [])
                                            .filter(m => m.tipo === 'ABONO') // Solo mostrar pagos
                                            .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
                                            .map((mov, movIdx, filteredMovs) => {
                                                const descripcionAbono = extraerDescripcionAbono(mov.comentario);

                                                return (
                                                    <View key={movIdx} style={styles.movimientoItem}>
                                                        <View style={styles.movimientoHeader}>
                                                            <View style={styles.movimientoTipo}>
                                                                <View style={styles.indicadorAbono} />
                                                                <Text style={styles.tipoTexto}>
                                                                    {descripcionAbono || 'Pago'}
                                                                </Text>
                                                            </View>
                                                            <Text style={styles.montoAbono}>
                                                                {formatCurrency(mov.monto)}
                                                            </Text>
                                                        </View>
                                                        <Text style={styles.movimientoFecha}>{formatDate(mov.fecha)}</Text>

                                                        {movIdx < filteredMovs.length - 1 && (
                                                            <View style={styles.movimientoDivider} />
                                                        )}
                                                    </View>
                                                );
                                            })}
                                        {(movimientosPorCuenta[cuenta.id] || []).filter(m => m.tipo === 'ABONO').length === 0 && (
                                            <Text style={styles.sinPagosTexto}>No hay pagos registrados</Text>
                                        )}
                                    </View>
                                )}

                                {index < cuentasCerradas.length - 1 && <View style={styles.cuentaDivider} />}
                            </View>
                        );
                    })}
                </View>
            )}

            {/* Resumen estadístico */}
            <View style={styles.resumenContainer}>
                <Text style={styles.resumenTitulo}>ESTADÍSTICAS</Text>
                <View style={styles.dividerSeccion} />
                <View style={styles.resumenRowHorizontal}>
                    <View style={styles.resumenItem}>
                        <Text style={styles.resumenLabel}>Total de cuentas</Text>
                        <Text style={styles.resumenValor}>{cuentas.length}</Text>
                    </View>
                    <View style={styles.resumenDividerVertical} />
                    <View style={styles.resumenItem}>
                        <Text style={styles.resumenLabel}>Cuentas activas</Text>
                        <Text style={styles.resumenValorPendiente}>{cuentasActivas.length}</Text>
                    </View>
                    <View style={styles.resumenDividerVertical} />
                    <View style={styles.resumenItem}>
                        <Text style={styles.resumenLabel}>Cuentas pagadas</Text>
                        <Text style={styles.resumenValorPagado}>{cuentasCerradas.length}</Text>
                    </View>
                    <View style={styles.resumenDividerVertical} />
                    <View style={styles.resumenItem}>
                        <Text style={styles.resumenLabelTotal}>Deuda total</Text>
                        <Text style={styles.resumenValorTotal}>{formatCurrency(totalDeuda)}</Text>
                    </View>
                </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
                <Text style={styles.footerTexto}>
                    Generado el {formatDate(new Date().toISOString())}
                </Text>
                <Text style={styles.footerSubtexto}>
                    Este documento es un resumen de todas las cuentas del cliente
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#FFFFFF',
        padding: 24,
        width: 600,
    },
    header: {
        marginBottom: 20,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    titulo: {
        fontSize: 24,
        fontWeight: '700',
        color: '#2D3436',
        letterSpacing: 1,
    },
    subtitulo: {
        fontSize: 18,
        fontWeight: '600',
        color: '#29B6F6',
        marginTop: 4,
    },
    iconoCliente: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#E3F2FD',
        justifyContent: 'center',
        alignItems: 'center',
    },
    divider: {
        height: 2,
        backgroundColor: '#2D3436',
        marginBottom: 12,
    },
    dividerSeccion: {
        height: 1,
        backgroundColor: '#E0E0E0',
        marginBottom: 12,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    infoLabel: {
        fontSize: 14,
        color: '#636E72',
        fontWeight: '500',
    },
    infoValor: {
        fontSize: 14,
        color: '#2D3436',
        fontWeight: '600',
    },
    saldoContainer: {
        backgroundColor: '#FFF5F5',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 2,
        borderColor: '#FF6B6B',
    },
    saldoContainerPagado: {
        backgroundColor: '#F0FFF4',
        borderColor: '#4CAF50',
    },
    saldoLabel: {
        fontSize: 12,
        color: '#636E72',
        fontWeight: '600',
        marginBottom: 4,
        letterSpacing: 1,
    },
    saldoMonto: {
        fontSize: 36,
        fontWeight: '700',
        color: '#FF6B6B',
    },
    saldoMontoPagado: {
        color: '#4CAF50',
    },
    pagadoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 6,
    },
    saldoPagadoTexto: {
        fontSize: 13,
        color: '#4CAF50',
        fontWeight: '600',
    },
    seccionContainer: {
        marginBottom: 20,
    },
    seccionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    seccionTitulo: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FF6B6B',
        letterSpacing: 0.5,
    },
    seccionTituloPagado: {
        color: '#4CAF50',
    },
    cuentaItem: {
        marginBottom: 8,
    },
    cuentaHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    cuentaNumeroContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    numeroBadge: {
        backgroundColor: '#29B6F6',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 6,
    },
    numeroBadgePagado: {
        backgroundColor: '#4CAF50',
    },
    numeroTexto: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    cuentaFecha: {
        fontSize: 12,
        color: '#636E72',
    },
    cuentaSaldo: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FF6B6B',
    },
    pagadoBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#F0FFF4',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#4CAF50',
    },
    pagadoTexto: {
        fontSize: 11,
        fontWeight: '700',
        color: '#4CAF50',
    },
    cuentaDivider: {
        height: 1,
        backgroundColor: '#F0F0F0',
        marginVertical: 4,
    },
    resumenContainer: {
        backgroundColor: '#F8F9FA',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
    },
    resumenTitulo: {
        fontSize: 14,
        fontWeight: '700',
        color: '#2D3436',
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    resumenRowHorizontal: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    resumenItem: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 8,
    },
    resumenDividerVertical: {
        width: 1,
        height: 40,
        backgroundColor: '#E0E0E0',
    },
    resumenLabel: {
        fontSize: 10,
        color: '#636E72',
        textAlign: 'center',
        marginBottom: 6,
    },
    resumenValor: {
        fontSize: 18,
        fontWeight: '700',
        color: '#2D3436',
    },
    resumenValorPendiente: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FF6B6B',
    },
    resumenValorPagado: {
        fontSize: 18,
        fontWeight: '700',
        color: '#4CAF50',
    },
    resumenLabelTotal: {
        fontSize: 10,
        fontWeight: '700',
        color: '#2D3436',
        textAlign: 'center',
        marginBottom: 6,
    },
    resumenValorTotal: {
        fontSize: 20,
        fontWeight: '700',
        color: '#FF6B6B',
    },
    footer: {
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
    },
    footerTexto: {
        fontSize: 11,
        color: '#95A5A6',
        marginBottom: 4,
    },
    footerSubtexto: {
        fontSize: 10,
        color: '#BDC3C7',
        fontStyle: 'italic',
    },
    // Productos - Formato tabla
    productosContainer: {
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
    },
    productosLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#636E72',
        marginBottom: 6,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    productosTableHeader: {
        flexDirection: 'row',
        paddingVertical: 6,
        paddingHorizontal: 4,
        backgroundColor: '#F8F9FA',
        borderRadius: 4,
        marginBottom: 4,
    },
    productosTableHeaderText: {
        fontSize: 9,
        fontWeight: '700',
        color: '#636E72',
        letterSpacing: 0.3,
    },
    productosColNombre: {
        flex: 3,
    },
    productosColPrecio: {
        flex: 1.5,
        textAlign: 'right',
    },
    productosColCantidad: {
        flex: 1,
        textAlign: 'center',
    },
    productosColTotal: {
        flex: 1.5,
        textAlign: 'right',
    },
    productoTableRow: {
        flexDirection: 'row',
        paddingVertical: 4,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    productoTableText: {
        fontSize: 10,
        color: '#2D3436',
    },
    productoTableTextBold: {
        fontWeight: '600',
    },
    // Historial de pagos
    historialContainer: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
    },
    historialLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#636E72',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    movimientoItem: {
        marginBottom: 10,
    },
    movimientoHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 3,
    },
    movimientoTipo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    indicadorAbono: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#4CAF50',
    },
    tipoTexto: {
        fontSize: 11,
        fontWeight: '600',
        color: '#2D3436',
    },
    montoAbono: {
        fontSize: 12,
        fontWeight: '700',
        color: '#4CAF50',
    },
    movimientoFecha: {
        fontSize: 10,
        color: '#636E72',
        marginBottom: 4,
    },
    movimientoDivider: {
        height: 1,
        backgroundColor: '#F0F0F0',
        marginTop: 8,
    },
    sinPagosTexto: {
        fontSize: 10,
        color: '#95A5A6',
        fontStyle: 'italic',
        textAlign: 'center',
        paddingVertical: 8,
    },
});
