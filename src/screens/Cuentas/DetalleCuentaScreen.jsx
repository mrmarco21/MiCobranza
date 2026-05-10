import { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, ScrollView, Modal, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as cuentasRepo from '../../data/cuentasRepository';
import * as categoriasRepo from '../../data/categoriasRepository';
import { obtenerMovimientosDeCuenta } from '../../services/movimientosService';
import { formatDate, formatCurrency } from '../../shared/utils/helpers';
import MovimientoItem from '../Movimientos/components/MovimientoItem';
import EmptyState from '../../shared/components/EmptyState';
import Header from '../../shared/components/Header';
import ResumenClienteImagen from '../Clientas/components/ResumenClienteImagen';
import { useTheme } from '../../shared/hooks/useTheme';

export default function DetalleCuentaScreen({ route, navigation }) {
    const { cuentaId, clientaNombre } = route.params;
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const [cuenta, setCuenta] = useState(null);
    const [movimientos, setMovimientos] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [modalDetalleVisible, setModalDetalleVisible] = useState(false);
    const [movimientoSeleccionado, setMovimientoSeleccionado] = useState(null);

    // Estados para compartir imagen
    const [modalCompartirVisible, setModalCompartirVisible] = useState(false);
    const viewShotRef = useRef();

    useEffect(() => {
        cargarDatos();
    }, []);

    const cargarDatos = async () => {
        const cuentaData = await cuentasRepo.getById(cuentaId);
        setCuenta(cuentaData);
        const movs = await obtenerMovimientosDeCuenta(cuentaId);
        setMovimientos(movs);
        const cats = await categoriasRepo.getCategorias();
        setCategorias(cats);
    };

    const handleMovimientoPress = (movimiento) => {
        setMovimientoSeleccionado(movimiento);
        setModalDetalleVisible(true);
    };

    // Parsear prendas desde comentario
    const parsearPrendas = (comentario) => {
        if (!comentario) return [];
        const partes = comentario.split(' | ');
        return partes.map(parte => {
            // Formato nuevo con cantidad y categoría ID: "Blusa roja (S/25.00) x 2 [01/01/2026] {ropa-otros}"
            const matchCompleto = parte.match(/^(.+?)\s*\(S\/(\d+\.?\d*)\)\s*x\s*(\d+)\s*\[(\d{2}\/\d{2}\/\d{4})\]\s*\{(.+?)\}$/);
            if (matchCompleto) {
                return {
                    descripcion: matchCompleto[1].trim(),
                    monto: parseFloat(matchCompleto[2]),
                    cantidad: parseInt(matchCompleto[3]),
                    fecha: matchCompleto[4],
                    categoria: matchCompleto[5]
                };
            }
            // Formato con categoría pero sin cantidad (datos antiguos): "Blusa roja (S/25.00) [01/01/2026] {ropa-otros}"
            const matchSinCantidad = parte.match(/^(.+?)\s*\(S\/(\d+\.?\d*)\)\s*\[(\d{2}\/\d{2}\/\d{4})\]\s*\{(.+?)\}$/);
            if (matchSinCantidad) {
                return {
                    descripcion: matchSinCantidad[1].trim(),
                    monto: parseFloat(matchSinCantidad[2]),
                    cantidad: 1,
                    fecha: matchSinCantidad[3],
                    categoria: matchSinCantidad[4]
                };
            }
            // Formato con fecha pero sin categoría ni cantidad (datos antiguos)
            const matchConFecha = parte.match(/^(.+?)\s*\(S\/(\d+\.?\d*)\)\s*\[(\d{2}\/\d{2}\/\d{4})\]$/);
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
            const matchSinFecha = parte.match(/^(.+?)\s*\(S\/(\d+\.?\d*)\)$/);
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

    const parsearFechaAbono = (comentario) => {
        if (!comentario) return null;
        const match = comentario.match(/\[(\d{2}\/\d{2}\/\d{4})\]$/);
        return match ? match[1] : null;
    };

    const extraerDescripcionAbono = (comentario) => {
        if (!comentario) return '';
        return comentario.replace(/\s*\[\d{2}\/\d{2}\/\d{4}\]$/, '').trim();
    };

    const compartirCuenta = async () => {
        setModalCompartirVisible(true);

        // Esperar un momento para que el modal se renderice
        setTimeout(async () => {
            try {
                const uri = await viewShotRef.current.capture();
                setModalCompartirVisible(false);

                // Compartir la imagen
                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(uri, {
                        mimeType: 'image/png',
                        dialogTitle: `Estado de Cuenta #${cuenta.numeroCuenta || 1} - ${clientaNombre}`
                    });
                } else {
                    Alert.alert('Error', 'La función de compartir no está disponible en este dispositivo');
                }
            } catch (error) {
                console.error('Error al compartir:', error);
                setModalCompartirVisible(false);
                Alert.alert('Error', 'No se pudo generar la imagen del estado de cuenta');
            }
        }, 500);
    };

    if (!cuenta) return null;

    const esCancelada = cuenta.estado === 'CERRADA';
    const totalCargos = movimientos.filter(m => m.tipo === 'CARGO').reduce((sum, m) => sum + m.monto, 0);
    const totalAbonos = movimientos.filter(m => m.tipo === 'ABONO').reduce((sum, m) => sum + m.monto, 0);

    const prendas = movimientoSeleccionado ? parsearPrendas(movimientoSeleccionado.comentario) : [];
    const tienePrendasDesglosadas = prendas.length > 0 && prendas.some(p => p.monto !== null);
    const fechaAbono = movimientoSeleccionado ? parsearFechaAbono(movimientoSeleccionado.comentario) : null;
    const descripcionAbono = movimientoSeleccionado ? extraerDescripcionAbono(movimientoSeleccionado.comentario) : '';

    const styles = createStyles(colors);

    return (
        <View style={styles.container}>
            <Header title="Detalle Cuenta" showBack />

            <ScrollView
                style={styles.contenido}
                contentContainerStyle={{ paddingBottom: !esCancelada && cuenta.saldo > 0 ? 100 : 20 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Card principal */}
                <View style={styles.cardPrincipal}>
                    <View style={styles.cardHeader}>
                        <View style={styles.iconoContainer}>
                            <Ionicons
                                name={esCancelada ? "checkmark-circle" : "document-text"}
                                size={28}
                                color={esCancelada ? "#4CAF50" : "#29B6F6"}
                            />
                        </View>
                        <View style={styles.cardHeaderInfo}>
                            <Text style={styles.cardTitulo}>
                                Cuenta {esCancelada ? 'Cancelada' : 'Activa'}
                            </Text>
                            <View style={[styles.estadoBadge, esCancelada && styles.estadoBadgeCancelada]}>
                                <Text style={[styles.estadoTexto, esCancelada && styles.estadoTextoCancelada]}>
                                    {esCancelada ? 'Pagada' : 'Pendiente'}
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={styles.botonCompartir}
                            onPress={compartirCuenta}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="share-outline" size={20} color={esCancelada ? "#4CAF50" : "#29B6F6"} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.fechasContainer}>
                        <View style={styles.fechaItem}>
                            <Ionicons name="calendar-outline" size={16} color="#95A5A6" />
                            <Text style={styles.fechaLabel}>Inicio</Text>
                            <Text style={styles.fechaValor}>{formatDate(cuenta.fechaCreacion)}</Text>
                        </View>
                        {cuenta.fechaCierre && (
                            <View style={styles.fechaItem}>
                                <Ionicons name="checkmark-done-outline" size={16} color="#4CAF50" />
                                <Text style={styles.fechaLabel}>Cierre</Text>
                                <Text style={styles.fechaValor}>{formatDate(cuenta.fechaCierre)}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Resumen */}
                {movimientos.length > 0 && (
                    <View style={styles.resumenContainer}>
                        <View style={styles.resumenItem}>
                            <View style={[styles.resumenIcono, { backgroundColor: '#FFEBEE' }]}>
                                <Ionicons name="arrow-up" size={16} color="#FF6B6B" />
                            </View>
                            <View>
                                <Text style={styles.resumenLabel}>Total cargos</Text>
                                <Text style={[styles.resumenMonto, { color: '#FF6B6B' }]}>{formatCurrency(totalCargos)}</Text>
                            </View>
                        </View>
                        <View style={styles.resumenDivider} />
                        <View style={styles.resumenItem}>
                            <View style={[styles.resumenIcono, { backgroundColor: '#E8F5E9' }]}>
                                <Ionicons name="arrow-down" size={16} color="#4CAF50" />
                            </View>
                            <View>
                                <Text style={styles.resumenLabel}>Total abonos</Text>
                                <Text style={[styles.resumenMonto, { color: '#4CAF50' }]}>{formatCurrency(totalAbonos)}</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Movimientos */}
                <View style={styles.movimientosSection}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitulo}>Historial de movimientos</Text>
                        {movimientos.length > 0 && (
                            <View style={styles.contadorBadge}>
                                <Text style={styles.sectionContador}>{movimientos.length}</Text>
                            </View>
                        )}
                    </View>

                    {movimientos.length > 0 ? (
                        <FlatList
                            data={movimientos}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <MovimientoItem
                                    movimiento={item}
                                    onPress={() => handleMovimientoPress(item)}
                                />
                            )}
                            scrollEnabled={false}
                        />
                    ) : (
                        <EmptyState message="No hay movimientos registrados" iconName="receipt-outline" />
                    )}
                </View>
            </ScrollView>

            {/* Botón flotante para realizar pago - solo si la cuenta está activa */}
            {!esCancelada && cuenta.saldo > 0 && (
                <View style={[styles.footerContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
                    <TouchableOpacity
                        style={styles.botonRealizarPago}
                        onPress={() => navigation.navigate('Cobro', { clientaId: cuenta.clientaId })}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="cash" size={22} color="#FFF" />
                        <Text style={styles.botonRealizarPagoTexto}>
                            Realizar Pago
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Modal de detalle */}
            <Modal
                visible={modalDetalleVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setModalDetalleVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalDetalle}>
                        <View style={styles.modalDetalleHeader}>
                            <Text style={styles.modalDetalleTitulo}>Detalle del movimiento</Text>
                            <TouchableOpacity onPress={() => setModalDetalleVisible(false)}>
                                <Ionicons name="close" size={24} color="#636E72" />
                            </TouchableOpacity>
                        </View>

                        {movimientoSeleccionado && (
                            <ScrollView style={styles.modalDetalleContenido} showsVerticalScrollIndicator={false}>
                                <View style={styles.detalleInfoGeneral}>
                                    <View style={[
                                        styles.detalleTipoIcono,
                                        movimientoSeleccionado.tipo === 'CARGO' ? styles.iconoCargo : styles.iconoAbono
                                    ]}>
                                        <Ionicons
                                            name={movimientoSeleccionado.tipo === 'CARGO' ? "arrow-up" : "arrow-down"}
                                            size={24}
                                            color={movimientoSeleccionado.tipo === 'CARGO' ? "#FF6B6B" : "#4CAF50"}
                                        />
                                    </View>
                                    <Text style={styles.detalleTipo}>
                                        {movimientoSeleccionado.tipo === 'CARGO' ? 'Cargo' : 'Abono'}
                                    </Text>
                                    <Text style={styles.detalleFecha}>{formatDate(movimientoSeleccionado.fecha)}</Text>
                                </View>

                                <View style={styles.detalleTotalContainer}>
                                    <Text style={styles.detalleTotalLabel}>Monto total</Text>
                                    <Text style={[
                                        styles.detalleTotalMonto,
                                        movimientoSeleccionado.tipo === 'CARGO' ? styles.montoRojo : styles.montoVerde
                                    ]}>
                                        {formatCurrency(movimientoSeleccionado.monto)}
                                    </Text>
                                </View>

                                {movimientoSeleccionado.tipo === 'CARGO' && tienePrendasDesglosadas ? (
                                    <View style={styles.prendasContainer}>
                                        <Text style={styles.prendasTitulo}>Detalle de productos</Text>

                                        {/* Header de la tabla */}
                                        <View style={styles.prendasTableHeader}>
                                            <Text style={[styles.prendasTableHeaderText, styles.prendasColProducto]}>PRODUCTO</Text>
                                            <Text style={[styles.prendasTableHeaderText, styles.prendasColPrecio]}>PRECIO</Text>
                                            <Text style={[styles.prendasTableHeaderText, styles.prendasColCantidad]}>#</Text>
                                            <Text style={[styles.prendasTableHeaderText, styles.prendasColTotal]}>TOTAL</Text>
                                        </View>

                                        {/* Filas de productos */}
                                        {prendas.map((prenda, index) => {
                                            const cantidad = prenda.cantidad || 1;
                                            const precioUnitario = prenda.monto || 0;
                                            const totalLinea = precioUnitario * cantidad;

                                            return (
                                                <View key={index} style={styles.prendaTableRow}>
                                                    <View style={styles.prendasColProducto}>
                                                        <Text style={styles.prendaDescripcion}>{prenda.descripcion}</Text>
                                                        {prenda.fecha && (
                                                            <View style={styles.prendaFechaContainer}>
                                                                <Ionicons name="calendar-outline" size={10} color={colors.textSecondary} />
                                                                <Text style={styles.prendaFecha}>{prenda.fecha}</Text>
                                                            </View>
                                                        )}
                                                    </View>
                                                    <Text style={[styles.prendaTableText, styles.prendasColPrecio]}>
                                                        {precioUnitario !== null ? formatCurrency(precioUnitario) : '-'}
                                                    </Text>
                                                    <Text style={[styles.prendaTableText, styles.prendasColCantidad]}>
                                                        {cantidad}
                                                    </Text>
                                                    <Text style={[styles.prendaTableText, styles.prendasColTotal]}>
                                                        {precioUnitario !== null ? formatCurrency(totalLinea) : '-'}
                                                    </Text>
                                                </View>
                                            );
                                        })}

                                        {/* Footer con total */}
                                        <View style={styles.prendasTableFooter}>
                                            <Text style={styles.prendasFooterLabel}>Total:</Text>
                                            <Text style={styles.prendasFooterValue}>
                                                {formatCurrency(movimientoSeleccionado.monto)}
                                            </Text>
                                        </View>
                                    </View>
                                ) : movimientoSeleccionado.tipo === 'ABONO' ? (
                                    <View style={styles.abonoDetalleContainer}>
                                        {fechaAbono && (
                                            <View style={styles.abonoFechaRow}>
                                                <Ionicons name="calendar-outline" size={16} color="#29B6F6" />
                                                <Text style={styles.abonoFechaTexto}>Fecha del abono: {fechaAbono}</Text>
                                            </View>
                                        )}
                                        {descripcionAbono ? (
                                            <View style={styles.abonoNotaContainer}>
                                                <Text style={styles.abonoNotaLabel}>Nota</Text>
                                                <Text style={styles.abonoNotaTexto}>{descripcionAbono}</Text>
                                            </View>
                                        ) : null}
                                    </View>
                                ) : (
                                    <View style={styles.descripcionSimpleContainer}>
                                        <Text style={styles.descripcionSimpleLabel}>Descripción</Text>
                                        <Text style={styles.descripcionSimpleTexto}>
                                            {movimientoSeleccionado.comentario || 'Sin descripción'}
                                        </Text>
                                    </View>
                                )}
                            </ScrollView>
                        )}

                        <TouchableOpacity
                            style={[styles.modalDetalleCerrar, { marginBottom: Math.max(insets.bottom, 20) }]}
                            onPress={() => setModalDetalleVisible(false)}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.modalDetalleCerrarTexto}>Cerrar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Modal invisible para capturar imagen */}
            <Modal
                visible={modalCompartirVisible}
                transparent
                animationType="none"
            >
                <View style={styles.modalCaptura}>
                    <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1.0 }}>
                        {cuenta && (
                            <ResumenClienteImagen
                                clientaNombre={clientaNombre}
                                cuentas={[{
                                    id: cuenta.id,
                                    numeroCuenta: cuenta.numeroCuenta || 1,
                                    fechaCreacion: cuenta.fechaCreacion,
                                    fechaCierre: cuenta.fechaCierre,
                                    saldo: cuenta.saldo,
                                    estado: esCancelada ? 'CERRADA' : 'ACTIVA'
                                }]}
                                totalDeuda={esCancelada ? 0 : cuenta.saldo}
                                movimientosPorCuenta={{
                                    [cuenta.id]: movimientos
                                }}
                                categorias={categorias}
                                mostrarHistorialMovimientos={true}
                            />
                        )}
                    </ViewShot>
                </View>
            </Modal>
        </View>
    );
}


const createStyles = (colors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    contenido: {
        flex: 1,
    },
    cardPrincipal: {
        backgroundColor: colors.card,
        margin: 16,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    iconoContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: colors.surfaceVariant,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    cardHeaderInfo: {
        flex: 1,
    },
    botonCompartir: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#E1F5FE',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E0D4FF',
        marginLeft: 8,
    },
    cardTitulo: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 6,
    },
    estadoBadge: {
        alignSelf: 'flex-start',
        backgroundColor: '#E1F5FE',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    estadoBadgeCancelada: {
        backgroundColor: '#E8F5E9',
    },
    estadoTexto: {
        fontSize: 12,
        fontWeight: '600',
        color: '#29B6F6',
    },
    estadoTextoCancelada: {
        color: '#4CAF50',
    },
    fechasContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    fechaItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceVariant,
        padding: 12,
        borderRadius: 10,
        gap: 8,
    },
    fechaLabel: {
        fontSize: 11,
        color: colors.textTertiary,
    },
    fechaValor: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.text,
    },
    resumenContainer: {
        backgroundColor: colors.card,
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 16,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    resumenItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    resumenIcono: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    resumenLabel: {
        fontSize: 12,
        color: colors.textTertiary,
        marginBottom: 2,
    },
    resumenMonto: {
        fontSize: 16,
        fontWeight: '700',
    },
    resumenDivider: {
        width: 1,
        height: 40,
        backgroundColor: colors.border,
        marginHorizontal: 12,
    },
    movimientosSection: {
        paddingHorizontal: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitulo: {
        fontSize: 17,
        fontWeight: '700',
        color: colors.text,
    },
    contadorBadge: {
        backgroundColor: '#E1F5FE',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    sectionContador: {
        fontSize: 13,
        fontWeight: '600',
        color: '#29B6F6',
    },
    footerContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.card,
        paddingHorizontal: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 8,
    },
    botonRealizarPago: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#4CAF50',
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
    },
    botonRealizarPagoTexto: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFF',
    },
    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalDetalle: {
        backgroundColor: colors.card,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '80%',
    },
    modalDetalleHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    modalDetalleTitulo: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
    },
    modalDetalleContenido: {
        padding: 20,
    },
    detalleInfoGeneral: {
        alignItems: 'center',
        marginBottom: 20,
    },
    detalleTipoIcono: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    iconoCargo: {
        backgroundColor: '#FFE5E5',
    },
    iconoAbono: {
        backgroundColor: '#E8F5E9',
    },
    detalleTipo: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 4,
    },
    detalleFecha: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    detalleTotalContainer: {
        backgroundColor: colors.surfaceVariant,
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginBottom: 20,
    },
    detalleTotalLabel: {
        fontSize: 13,
        color: colors.textSecondary,
        marginBottom: 4,
    },
    detalleTotalMonto: {
        fontSize: 28,
        fontWeight: '700',
    },
    montoRojo: {
        color: '#FF6B6B',
    },
    montoVerde: {
        color: '#4CAF50',
    },
    prendasContainer: {
        backgroundColor: colors.card,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
    },
    prendasTitulo: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textSecondary,
        padding: 14,
        backgroundColor: colors.surfaceVariant,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    // Tabla de prendas
    prendasTableHeader: {
        flexDirection: 'row',
        backgroundColor: colors.background,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.border,
    },
    prendasTableHeaderText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#48C9B0',
        letterSpacing: 0.5,
    },
    prendasColProducto: { flex: 1 },
    prendasColPrecio: { width: 78, textAlign: 'right' },
    prendasColCantidad: { width: 36, textAlign: 'center' },
    prendasColTotal: { width: 78, textAlign: 'right' },
    prendaTableRow: {
        flexDirection: 'row',
        paddingVertical: 13,
        paddingHorizontal: 14,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.border,
        alignItems: 'center',
    },
    prendaDescripcion: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 1,
        lineHeight: 18,
    },
    prendaFechaContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    prendaFecha: {
        fontSize: 10,
        color: colors.textSecondary,
        marginLeft: 4,
    },
    prendaTableText: {
        fontSize: 13,
        color: colors.text,
        fontWeight: '500',
    },
    prendasTableFooter: {
        backgroundColor: colors.background,
        paddingHorizontal: 14,
        paddingVertical: 14,
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 0.5,
        borderTopColor: colors.border,
    },
    prendasFooterLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text,
    },
    prendasFooterValue: {
        fontSize: 17,
        fontWeight: '700',
        color: '#1D9E75',
    },
    abonoDetalleContainer: {
        backgroundColor: colors.surfaceVariant,
        borderRadius: 12,
        padding: 16,
    },
    abonoFechaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    abonoFechaTexto: {
        fontSize: 14,
        color: '#29B6F6',
        fontWeight: '500',
        marginLeft: 8,
    },
    abonoNotaContainer: {
        backgroundColor: colors.card,
        borderRadius: 8,
        padding: 12,
    },
    abonoNotaLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        marginBottom: 4,
    },
    abonoNotaTexto: {
        fontSize: 15,
        color: colors.text,
    },
    descripcionSimpleContainer: {
        backgroundColor: colors.surfaceVariant,
        borderRadius: 12,
        padding: 16,
    },
    descripcionSimpleLabel: {
        fontSize: 13,
        color: colors.textSecondary,
        marginBottom: 6,
    },
    descripcionSimpleTexto: {
        fontSize: 15,
        color: colors.text,
        lineHeight: 22,
    },
    modalDetalleCerrar: {
        backgroundColor: colors.surfaceVariant,
        marginHorizontal: 20,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    modalDetalleCerrarTexto: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },
    modalCaptura: {
        position: 'absolute',
        left: -10000,
        top: 0,
    },
});


