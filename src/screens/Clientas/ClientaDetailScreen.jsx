import { useState, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { obtenerClientaConSaldo } from '../../services/clientasService';
import { obtenerCuentasActivas, obtenerCuentasCerradas } from '../../services/cuentasService';
import { obtenerMovimientosDeCuenta } from '../../services/movimientosService';
import * as categoriasRepo from '../../data/categoriasRepository';
import * as ventasRepo from '../../data/ventasRepository';
import { formatCurrency, formatDate, obtenerNombreProductoCompleto } from '../../shared/utils/helpers';
import { useTheme } from '../../shared/hooks/useTheme';
import Header from '../../shared/components/Header';
import ResumenClienteImagen from './components/ResumenClienteImagen';

export default function ClientaDetailScreen({ route, navigation }) {
    const { clientaId } = route.params;
    const { colors } = useTheme();
    const styles = createStyles(colors);
    const insets = useSafeAreaInsets();
    const [clienta, setClienta] = useState(null);
    const [cuentasActivas, setCuentasActivas] = useState([]);
    const [movimientosPorCuenta, setMovimientosPorCuenta] = useState({});
    const [numCuentasCerradas, setNumCuentasCerradas] = useState(0);
    const [cuentasExpandidas, setCuentasExpandidas] = useState({});
    const [movimientosExpandidos, setMovimientosExpandidos] = useState({}); // Para controlar si se muestran todos los movimientos
    const [categorias, setCategorias] = useState([]);

    // Estados para modal de detalle y edición
    const [modalDetalleVisible, setModalDetalleVisible] = useState(false);
    const [movimientoSeleccionado, setMovimientoSeleccionado] = useState(null);
    const [cuentaIdSeleccionada, setCuentaIdSeleccionada] = useState(null);
    const [productosVenta, setProductosVenta] = useState([]); // Productos de la venta asociada

    // Estados para compartir imagen del resumen completo del cliente
    const [modalCompartirVisible, setModalCompartirVisible] = useState(false);
    const [todasLasCuentas, setTodasLasCuentas] = useState([]);
    const [todosLosMovimientos, setTodosLosMovimientos] = useState({});
    const [todasLasVentas, setTodasLasVentas] = useState({}); // Ventas por cuenta
    const viewShotRef = useRef();

    useFocusEffect(
        useCallback(() => {
            cargarDatos();
        }, [])
    );



    const cargarDatos = async () => {
        const clientaData = await obtenerClientaConSaldo(clientaId);
        setClienta(clientaData);

        const cuentas = await obtenerCuentasActivas(clientaId);
        setCuentasActivas(cuentas);

        const cats = await categoriasRepo.getCategorias();
        setCategorias(cats);

        const movsPorCuenta = {};
        for (const cuenta of cuentas) {
            const movs = await obtenerMovimientosDeCuenta(cuenta.id);
            movsPorCuenta[cuenta.id] = movs;
        }
        setMovimientosPorCuenta(movsPorCuenta);

        // Obtener las ventas asociadas a cada cuenta para mostrar comentarios
        const todasVentas = await ventasRepo.getAll();
        const ventasPorCuenta = {};
        for (const cuenta of cuentas) {
            const venta = todasVentas.find(v => v.cuentaId === cuenta.id && v.tipo !== 'CONTADO');
            if (venta) {
                ventasPorCuenta[cuenta.id] = venta;
            }
        }
        setTodasLasVentas(ventasPorCuenta);

        const cerradas = await obtenerCuentasCerradas(clientaId);
        setNumCuentasCerradas(cerradas.length);
    };

    const handleNuevaCuenta = () => {
        navigation.navigate('PuntoVenta', {
            clienteId: clientaId,
            clienteNombre: clienta.nombre,
            nuevaCuenta: true
        });
    };

    const toggleCuentaExpandida = (cuentaId) => {
        setCuentasExpandidas(prev => ({
            ...prev,
            [cuentaId]: !prev[cuentaId]
        }));
    };

    const toggleMostrarTodosMovimientos = (cuentaId) => {
        setMovimientosExpandidos(prev => ({
            ...prev,
            [cuentaId]: !prev[cuentaId]
        }));
    };

    const handleMovimientoPress = async (movimiento, cuentaId) => {
        setMovimientoSeleccionado(movimiento);
        setCuentaIdSeleccionada(cuentaId);

        // Si es un CARGO, obtener la venta asociada para mostrar los productos completos
        if (movimiento.tipo === 'CARGO') {
            const ventas = await ventasRepo.getAll();
            const ventaAsociada = ventas.find(v => v.cuentaId === cuentaId && v.tipo !== 'CONTADO');
            if (ventaAsociada && ventaAsociada.productos) {
                setProductosVenta(ventaAsociada.productos);
            } else {
                setProductosVenta([]);
            }
        } else {
            setProductosVenta([]);
        }

        setModalDetalleVisible(true);
    };

    const handleEditarMovimiento = () => {
        setModalDetalleVisible(false);
        navigation.navigate('AddMovimiento', {
            cuentaId: cuentaIdSeleccionada,
            movimientoId: movimientoSeleccionado.id,
            tipo: movimientoSeleccionado.tipo
        });
    };

    // Parsear prendas
    const parsearPrendas = (comentario) => {
        // console.log('🔍 [ClientaDetail] parsearPrendas recibió comentario:', comentario);
        if (!comentario) return [];
        const partes = comentario.split(' | ');
        console.log('🔍 [ClientaDetail] Partes separadas:', partes);
        return partes.map((parte, idx) => {
            // console.log(`🔍 [ClientaDetail] Procesando parte ${idx}:`, parte);
            // Formato nuevo con cantidad y categoría ID: "LAPICERO - Layconsa - Borrable - AZUL (S/25.00) x 2 [01/01/2026] {ropa-otros}"
            // Usar .+ (greedy) en lugar de .+? (non-greedy) para capturar todo el nombre hasta el paréntesis
            const matchCompleto = parte.match(/^(.+)\s+\(S\/(\d+\.?\d*)\)\s*x\s*(\d+)\s*\[(\d{2}\/\d{2}\/\d{4})\]\s*\{(.+?)\}$/);
            // console.log(`🔍 [ClientaDetail] Match completo parte ${idx}:`, matchCompleto);
            if (matchCompleto) {
                const resultado = {
                    descripcion: matchCompleto[1].trim(),
                    monto: parseFloat(matchCompleto[2]),
                    cantidad: parseInt(matchCompleto[3]),
                    fecha: matchCompleto[4],
                    categoria: matchCompleto[5]
                };
                // console.log(`✅ [ClientaDetail] Resultado parte ${idx}:`, resultado);
                return resultado;
            }
            // Formato con categoría pero sin cantidad (datos antiguos): "Blusa roja (S/25.00) [01/01/2026] {ropa-otros}"
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
            // Formato con fecha pero sin categoría ni cantidad (datos antiguos)
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

    const parsearFechaAbono = (comentario) => {
        if (!comentario) return null;
        const match = comentario.match(/\[(\d{2}\/\d{2}\/\d{4})\]$/);
        return match ? match[1] : null;
    };

    const extraerDescripcionAbono = (comentario) => {
        if (!comentario) return '';
        return comentario.replace(/\s*\[\d{2}\/\d{2}\/\d{4}\]$/, '').trim();
    };

    // Extraer descripción limpia para mostrar en la lista
    const extraerDescripcionLimpia = (comentario, tipo) => {
        if (!comentario) return 'Sin descripción';

        if (tipo === 'ABONO') {
            // Para abonos, quitar la fecha del final
            return comentario.replace(/\s*\[\d{2}\/\d{2}\/\d{4}\]$/, '').trim() || 'Abono';
        } else {
            // Para cargos, extraer las descripciones de las prendas
            const prendas = parsearPrendas(comentario);
            if (prendas.length === 0) return 'Sin descripción';

            // Si hay una sola prenda, mostrar su descripción
            if (prendas.length === 1) {
                return prendas[0].descripcion || 'Sin descripción';
            }

            // Si hay múltiples prendas, mostrar la primera + cantidad
            const primera = prendas[0].descripcion || 'Producto';
            return `${primera} +${prendas.length - 1}`;
        }
    };

    const compartirResumenCliente = async () => {
        // Obtener todas las cuentas (activas + cerradas)
        const cuentasCerradas = await obtenerCuentasCerradas(clientaId);
        const todasCuentas = [...cuentasActivas, ...cuentasCerradas];

        // Obtener movimientos de todas las cuentas
        const movimientosPorCuentaCompleto = {};
        for (const cuenta of todasCuentas) {
            const movs = await obtenerMovimientosDeCuenta(cuenta.id);
            movimientosPorCuentaCompleto[cuenta.id] = movs;
        }

        // Obtener ventas de todas las cuentas
        const todasVentas = await ventasRepo.getAll();
        const ventasPorCuentaCompleto = {};
        for (const cuenta of todasCuentas) {
            const venta = todasVentas.find(v => v.cuentaId === cuenta.id && v.tipo !== 'CONTADO');
            if (venta) {
                ventasPorCuentaCompleto[cuenta.id] = venta;
            }
        }

        setTodasLasCuentas(todasCuentas);
        setTodosLosMovimientos(movimientosPorCuentaCompleto);
        setTodasLasVentas(ventasPorCuentaCompleto);
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
                        dialogTitle: `Resumen de Cliente - ${clienta.nombre}`
                    });
                } else {
                    Alert.alert('Error', 'La función de compartir no está disponible en este dispositivo');
                }
            } catch (error) {
                console.error('Error al compartir:', error);
                setModalCompartirVisible(false);
                Alert.alert('Error', 'No se pudo generar la imagen del resumen');
            }
        }, 500);
    };

    // Calcular totales
    const totalDeuda = cuentasActivas.reduce((sum, c) => sum + c.saldo, 0);
    const totalAbonos = Object.values(movimientosPorCuenta)
        .flat()
        .filter(m => m.tipo === 'ABONO')
        .reduce((sum, m) => sum + m.monto, 0);

    if (!clienta) return null;

    const prendas = movimientoSeleccionado ? parsearPrendas(movimientoSeleccionado.comentario) : [];
    const tienePrendasDesglosadas = prendas.length > 0 && prendas.some(p => p.monto !== null);
    const fechaAbono = movimientoSeleccionado ? parsearFechaAbono(movimientoSeleccionado.comentario) : null;
    const descripcionAbono = movimientoSeleccionado ? extraerDescripcionAbono(movimientoSeleccionado.comentario) : '';

    return (
        <View style={styles.container}>
            <Header
                title={clienta.nombre}
                subtitle={clienta.referencia ? `Ref: ${clienta.referencia}` : undefined}
                showBack
            />

            {/* Header con tarjetas y botón compartir */}
            <View style={styles.header}>
                <View style={styles.headerContenido}>
                    {/* Tarjetas compactas */}
                    <View style={styles.resumenContainer}>
                        <View style={styles.resumenCard}>
                            {/* <View style={styles.resumenIconoWrapper}>
                                <Ionicons name="trending-down" size={16} color="#FF6B6B" />
                            </View> */}
                            <Text style={styles.resumenLabel}>Deuda total</Text>
                            <Text style={styles.resumenMontoDeuda}>{formatCurrency(totalDeuda)}</Text>
                            {cuentasActivas.length > 1 && (
                                <Text style={styles.resumenSubtexto}>{cuentasActivas.length} cuentas</Text>
                            )}
                        </View>
                        <View style={styles.resumenCard}>
                            {/* <View style={[styles.resumenIconoWrapper, styles.resumenIconoAbono]}>
                                <Ionicons name="trending-up" size={16} color="#4CAF50" />
                            </View> */}
                            <Text style={styles.resumenLabel}>Total abonado</Text>
                            <Text style={styles.resumenMontoAbono}>{formatCurrency(totalAbonos)}</Text>
                        </View>
                    </View>

                    {/* Botón compartir */}
                    <TouchableOpacity
                        style={styles.botonCompartirHeader}
                        onPress={compartirResumenCliente}
                        activeOpacity={0.7}
                        onLongPress={() => { }}
                    >
                        <Ionicons name="share-social-outline" size={22} color="#29B6F6" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView style={styles.contenido} showsVerticalScrollIndicator={false}>
                {cuentasActivas.length > 0 ? (
                    <>

                        {/* Botón de cobro destacado */}
                        {totalDeuda > 0 && (
                            <TouchableOpacity
                                style={styles.botonCobrarDestacado}
                                onPress={() => navigation.navigate('Cobro', { clientaId })}
                                activeOpacity={0.7}
                            >
                                <View style={styles.botonCobrarIcono}>
                                    <Ionicons name="cash" size={24} color="#FFF" />
                                </View>
                                <View style={styles.botonCobrarTextos}>
                                    <Text style={styles.botonCobrarTitulo}>Realizar Cobro</Text>
                                    <Text style={styles.botonCobrarSubtitulo}>Cobro parcial o múltiple</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="#FFF" />
                            </TouchableOpacity>
                        )}

                        {/* Lista de cuentas activas - Diseño compacto */}
                        {cuentasActivas.map((cuenta, index) => {
                            const movimientos = movimientosPorCuenta[cuenta.id] || [];
                            const colores = [
                                { bg: '#E1F5FE', border: '#29B6F6', numero: '#29B6F6' },
                                { bg: '#E3F2FD', border: '#2196F3', numero: '#2196F3' },
                                { bg: '#FFF3E0', border: '#FF9800', numero: '#FF9800' },
                                { bg: '#F1F8E9', border: '#8BC34A', numero: '#8BC34A' },
                                { bg: '#FCE4EC', border: '#E91E63', numero: '#E91E63' },
                            ];
                            // Usar el índice del array para mostrar numeración secuencial (1, 2, 3...)
                            // independientemente del numeroCuenta almacenado en la BD
                            const numeroCuenta = index + 1;
                            const color = colores[(numeroCuenta - 1) % colores.length];

                            // Calcular totales de la cuenta
                            const totalCargos = movimientos
                                .filter(m => m.tipo === 'CARGO')
                                .reduce((sum, m) => sum + m.monto, 0);
                            const totalPagado = movimientos
                                .filter(m => m.tipo === 'ABONO')
                                .reduce((sum, m) => sum + m.monto, 0);

                            // Obtener el comentario de la venta asociada
                            const ventaAsociada = todasLasVentas[cuenta.id];
                            const comentarioVenta = ventaAsociada?.comentario || '';

                            return (
                                <View key={cuenta.id} style={[styles.cuentaCard, { borderLeftWidth: 4, borderLeftColor: color.border }]}>
                                    {/* Header compacto de la cuenta */}
                                    <View style={styles.cuentaHeader}>
                                        <View style={styles.cuentaHeaderTop}>
                                            <View style={[styles.cuentaNumero, { backgroundColor: color.bg, borderColor: color.border }]}>
                                                <Text style={[styles.cuentaNumeroTexto, { color: color.numero }]}>#{numeroCuenta}</Text>
                                            </View>
                                            <Text style={styles.cuentaFecha}>{formatDate(cuenta.fechaCreacion)}</Text>
                                        </View>

                                        {/* Comentario de la venta si existe */}
                                        {comentarioVenta && (
                                            <View style={styles.cuentaComentarioContainer}>
                                                <Ionicons name="chatbox-outline" size={12} color={colors.textSecondary} />
                                                <Text style={styles.cuentaComentario} numberOfLines={2}>
                                                    {comentarioVenta}
                                                </Text>
                                            </View>
                                        )}

                                        {/* Información compacta en 3 columnas */}
                                        <View style={styles.cuentaInfoGrid}>
                                            <View style={styles.cuentaInfoItem}>
                                                <Text style={styles.cuentaInfoLabel}>Total</Text>
                                                <Text style={styles.cuentaInfoValor}>{formatCurrency(totalCargos)}</Text>
                                            </View>
                                            <View style={[styles.cuentaInfoItem, styles.cuentaInfoItemCenter]}>
                                                <Text style={styles.cuentaInfoLabel}>Pagado</Text>
                                                <Text style={[styles.cuentaInfoValor, styles.cuentaInfoValorVerde]}>{formatCurrency(totalPagado)}</Text>
                                            </View>
                                            <View style={styles.cuentaInfoItem}>
                                                <Text style={styles.cuentaInfoLabel}>Saldo</Text>
                                                <Text style={[styles.cuentaInfoValor, styles.cuentaInfoValorRojo]}>{formatCurrency(cuenta.saldo)}</Text>
                                            </View>
                                        </View>
                                    </View>

                                    {/* Movimientos recientes */}
                                    {movimientos.length > 0 && (
                                        <View style={styles.cuentaMovimientos}>
                                            <TouchableOpacity
                                                style={styles.movimientosHeader}
                                                onPress={() => toggleCuentaExpandida(cuenta.id)}
                                                activeOpacity={0.7}
                                            >
                                                <Text style={styles.cuentaMovimientosTitulo}>
                                                    Movimientos ({movimientos.length})
                                                </Text>
                                                <Ionicons
                                                    name={cuentasExpandidas[cuenta.id] ? "chevron-up" : "chevron-down"}
                                                    size={20}
                                                    color={colors.textSecondary}
                                                />
                                            </TouchableOpacity>

                                            {cuentasExpandidas[cuenta.id] && (
                                                <>
                                                    <View style={styles.movimientosEncabezado}>
                                                        <Text style={styles.encabezadoTexto}>Descripción</Text>
                                                        <Text style={styles.encabezadoTexto}>Monto</Text>
                                                    </View>
                                                    {(movimientosExpandidos[cuenta.id] ? movimientos : movimientos.slice(0, 3)).map((mov) => {
                                                        // Extraer comentario del abono (sin la fecha)
                                                        const comentarioAbono = mov.tipo === 'ABONO' ? extraerDescripcionAbono(mov.comentario) : '';

                                                        return (
                                                            <TouchableOpacity
                                                                key={mov.id}
                                                                style={styles.miniMovimiento}
                                                                onPress={() => handleMovimientoPress(mov, cuenta.id)}
                                                            >
                                                                <View style={styles.miniMovimientoContent}>
                                                                    <View style={styles.miniMovimientoRow}>
                                                                        <View style={[
                                                                            styles.miniMovIcono,
                                                                            mov.tipo === 'CARGO' ? styles.miniMovIconoCargo : styles.miniMovIconoAbono
                                                                        ]}>
                                                                            <Ionicons
                                                                                name={mov.tipo === 'CARGO' ? "arrow-up" : "arrow-down"}
                                                                                size={12}
                                                                                color={mov.tipo === 'CARGO' ? "#FF6B6B" : "#4CAF50"}
                                                                            />
                                                                        </View>
                                                                        <Text style={styles.miniMovDesc} numberOfLines={1}>
                                                                            {extraerDescripcionLimpia(mov.comentario, mov.tipo)}
                                                                        </Text>
                                                                        <Text style={[
                                                                            styles.miniMovMonto,
                                                                            mov.tipo === 'CARGO' ? styles.montoRojo : styles.montoVerde
                                                                        ]}>
                                                                            {mov.tipo === 'CARGO' ? '+' : '-'}{formatCurrency(mov.monto)}
                                                                        </Text>
                                                                    </View>
                                                                    {mov.tipo === 'ABONO' && comentarioAbono && (
                                                                        <View style={styles.miniMovComentarioContainer}>
                                                                            <Ionicons name="chatbox-outline" size={10} color={colors.textSecondary} />
                                                                            <Text style={styles.miniMovComentario} numberOfLines={1}>
                                                                                {comentarioAbono}
                                                                            </Text>
                                                                        </View>
                                                                    )}
                                                                </View>
                                                            </TouchableOpacity>
                                                        );
                                                    })}
                                                    {movimientos.length > 3 && !movimientosExpandidos[cuenta.id] && (
                                                        <TouchableOpacity
                                                            style={styles.verMasBtn}
                                                            onPress={() => toggleMostrarTodosMovimientos(cuenta.id)}
                                                            activeOpacity={0.7}
                                                        >
                                                            <Text style={styles.verMasTexto}>+{movimientos.length - 3} más</Text>
                                                            <Ionicons name="chevron-down" size={14} color="#29B6F6" />
                                                        </TouchableOpacity>
                                                    )}
                                                    {movimientos.length > 3 && movimientosExpandidos[cuenta.id] && (
                                                        <TouchableOpacity
                                                            style={styles.verMasBtn}
                                                            onPress={() => toggleMostrarTodosMovimientos(cuenta.id)}
                                                            activeOpacity={0.7}
                                                        >
                                                            <Text style={styles.verMasTexto}>Ver menos</Text>
                                                            <Ionicons name="chevron-up" size={14} color="#29B6F6" />
                                                        </TouchableOpacity>
                                                    )}
                                                </>
                                            )}
                                        </View>
                                    )}
                                </View>
                            );
                        })}

                        {/* Botón nueva cuenta */}
                        <TouchableOpacity
                            style={styles.botonNuevaCuenta}
                            onPress={handleNuevaCuenta}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="add-circle-outline" size={20} color="#29B6F6" />
                            <Text style={styles.botonNuevaCuentaTexto}>Abrir nueva cuenta</Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    <View style={styles.sinCuentaCard}>
                        <View style={styles.sinCuentaIcono}>
                            <Ionicons name="folder-open-outline" size={40} color="#B0B0B0" />
                        </View>
                        <Text style={styles.sinCuentaTitulo}>Sin cuenta activa</Text>
                        <Text style={styles.sinCuentaTexto}>
                            Abre una nueva cuenta para comenzar a registrar movimientos
                        </Text>
                        <TouchableOpacity
                            style={styles.botonAbrirCuenta}
                            onPress={handleNuevaCuenta}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="add-outline" size={20} color="#FFF" />
                            <Text style={styles.botonAbrirCuentaTexto}>Abrir nueva cuenta</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Historial */}
                {numCuentasCerradas > 0 && (
                    <TouchableOpacity
                        style={styles.botonHistorial}
                        onPress={() => navigation.navigate('HistorialClientaCuentas', { clientaId, clientaNombre: clienta.nombre })}
                        activeOpacity={0.7}
                    >
                        <View style={styles.historialIcono}>
                            <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
                        </View>
                        <View style={styles.historialTextos}>
                            <Text style={styles.historialTitulo}>Historial de cuentas</Text>
                            <Text style={styles.historialSubtitulo}>
                                {numCuentasCerradas} {numCuentasCerradas === 1 ? 'cuenta cerrada' : 'cuentas cerradas'}
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#B0B0B0" />
                    </TouchableOpacity>
                )}

                <View style={styles.espacioFinal} />
            </ScrollView>

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
                                <Ionicons name="close" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {movimientoSeleccionado && (
                            <ScrollView
                                style={styles.modalDetalleContenido}
                                contentContainerStyle={{ paddingBottom: 20 }}
                                showsVerticalScrollIndicator={false}
                            >
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

                                {movimientoSeleccionado.tipo === 'CARGO' && productosVenta.length > 0 ? (
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
                                        {productosVenta.map((producto, index) => {
                                            const cantidad = producto.cantidad || 1;
                                            const precioUnitario = producto.precioVenta || 0;
                                            const totalLinea = precioUnitario * cantidad;
                                            const nombreCompleto = obtenerNombreProductoCompleto(producto);

                                            return (
                                                <View key={index} style={styles.prendaTableRow}>
                                                    <View style={styles.prendasColProducto}>
                                                        <Text style={styles.prendaDescripcion}>{nombreCompleto}</Text>
                                                    </View>
                                                    <Text style={[styles.prendaTableText, styles.prendasColPrecio]}>
                                                        {formatCurrency(precioUnitario)}
                                                    </Text>
                                                    <Text style={[styles.prendaTableText, styles.prendasColCantidad]}>
                                                        {cantidad}
                                                    </Text>
                                                    <Text style={[styles.prendaTableText, styles.prendasColTotal, styles.prendaTableTextBold]}>
                                                        {formatCurrency(totalLinea)}
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
                                ) : movimientoSeleccionado.tipo === 'CARGO' && tienePrendasDesglosadas ? (
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
                                                <Text style={styles.abonoFechaTexto}>Fecha: {fechaAbono}</Text>
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

                        <View style={[styles.modalDetalleAcciones, { paddingBottom: Math.max(insets.bottom, 8) }]}>
                            <TouchableOpacity
                                style={styles.botonEditar}
                                onPress={handleEditarMovimiento}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="create-outline" size={20} color="#29B6F6" />
                                <Text style={styles.botonEditarTexto}>Editar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.modalDetalleCerrar}
                                onPress={() => setModalDetalleVisible(false)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.modalDetalleCerrarTexto}>Cerrar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Modal invisible para capturar imagen del resumen completo */}
            <Modal
                visible={modalCompartirVisible}
                transparent
                animationType="none"
            >
                <View style={styles.modalCaptura}>
                    <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1.0 }}>
                        <ResumenClienteImagen
                            clientaNombre={clienta.nombre}
                            cuentas={todasLasCuentas}
                            totalDeuda={totalDeuda}
                            movimientosPorCuenta={todosLosMovimientos}
                            ventasPorCuenta={todasLasVentas}
                            categorias={categorias}
                            mostrarHistorialMovimientos={true}
                        />
                    </ViewShot>
                </View>
            </Modal>
        </View>
    );
}


const createStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 10 },
    headerContenido: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 10 },
    botonCompartirHeader: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: colors.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.primary,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
        elevation: 3
    },
    contenido: { flex: 1 },
    resumenContainer: {
        flexDirection: 'row',
        flex: 1,
        gap: 8
    },
    resumenCard: {
        flex: 1,
        backgroundColor: colors.card,
        padding: 5,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1
    },
    resumenIconoWrapper: {
        width: 15,
        height: 15,
        borderRadius: 14,
        backgroundColor: '#FFE5E5',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4
    },
    resumenIconoAbono: { backgroundColor: '#E8F5E9' },
    resumenLabel: {
        fontSize: 9,
        color: colors.textSecondary,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
        marginBottom: 4
    },
    resumenMontoDeuda: { fontSize: 18, fontWeight: '800', color: '#FF6B6B', letterSpacing: -0.5 },
    resumenMontoAbono: { fontSize: 18, fontWeight: '800', color: '#4CAF50', letterSpacing: -0.5, paddingTop: 0 },
    resumenSubtexto: { fontSize: 9, color: colors.textSecondary, marginTop: 2, fontWeight: '500' },
    // Cuenta card - Diseño compacto
    cuentaCard: {
        backgroundColor: colors.card,
        marginHorizontal: 16,
        marginTop: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2
    },
    cuentaHeader: {
        padding: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.border
    },
    cuentaHeaderTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12
    },
    cuentaNumero: {
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 8,
        borderWidth: 1.5,
        justifyContent: 'center',
        alignItems: 'center'
    },
    cuentaNumeroTexto: {
        fontSize: 13,
        fontWeight: '800',
        letterSpacing: 0.3
    },
    cuentaFecha: {
        fontSize: 11,
        color: colors.textSecondary,
        fontWeight: '600',
        letterSpacing: 0.2
    },
    cuentaComentarioContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 6,
        marginTop: 8,
        paddingHorizontal: 4,
        paddingVertical: 6,
        backgroundColor: colors.surfaceVariant,
        borderRadius: 6,
        borderLeftWidth: 2,
        borderLeftColor: colors.primary,
    },
    cuentaComentario: {
        flex: 1,
        fontSize: 11,
        color: colors.text,
        fontStyle: 'italic',
        fontWeight: '500',
        lineHeight: 15,
    },
    cuentaInfoGrid: {
        flexDirection: 'row',
        backgroundColor: colors.surfaceVariant,
        borderRadius: 10,
        padding: 12,
        gap: 8
    },
    cuentaInfoItem: {
        flex: 1,
        alignItems: 'flex-start'
    },
    cuentaInfoItemCenter: {
        alignItems: 'center',
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: colors.border
    },
    cuentaInfoLabel: {
        fontSize: 10,
        color: colors.textSecondary,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4
    },
    cuentaInfoValor: {
        fontSize: 16,
        fontWeight: '800',
        color: colors.text,
        letterSpacing: -0.3
    },
    cuentaInfoValorVerde: {
        color: '#4CAF50'
    },
    cuentaInfoValorRojo: {
        color: '#FF6B6B'
    },
    cuentaMovimientos: {
        padding: 12,
        backgroundColor: colors.surfaceVariant
    },
    movimientosHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        paddingVertical: 4,
        paddingHorizontal: 2
    },
    cuentaMovimientosTitulo: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.8
    },
    movimientosEncabezado: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 10,
        backgroundColor: colors.primaryLight,
        borderRadius: 6,
        marginBottom: 4
    },
    encabezadoTexto: {
        fontSize: 9,
        fontWeight: '800',
        color: '#5C6BC0',
        textTransform: 'uppercase',
        letterSpacing: 0.8
    },
    miniMovimiento: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.card,
        marginBottom: 1,
        borderRadius: 6
    },
    miniMovimientoContent: {
        flex: 1,
    },
    miniMovimientoRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    miniMovIcono: {
        width: 26,
        height: 26,
        borderRadius: 13,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
        borderWidth: 1.5
    },
    miniMovIconoCargo: {
        backgroundColor: '#FFE5E5',
        borderColor: '#FFD4D4'
    },
    miniMovIconoAbono: {
        backgroundColor: '#E8F5E9',
        borderColor: '#C8E6C9'
    },
    miniMovDesc: {
        flex: 1,
        fontSize: 13,
        color: colors.text,
        fontWeight: '600',
        letterSpacing: -0.1
    },
    miniMovMonto: {
        fontSize: 14,
        fontWeight: '800',
        letterSpacing: -0.3
    },
    miniMovComentarioContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        marginLeft: 36,
        gap: 4,
    },
    miniMovComentario: {
        flex: 1,
        fontSize: 11,
        color: colors.textSecondary,
        fontStyle: 'italic',
        fontWeight: '500',
    },
    montoRojo: { color: '#FF6B6B' },
    montoVerde: { color: '#4CAF50' },
    verMasBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
        paddingVertical: 6,
        gap: 4,
    },
    verMasTexto: {
        fontSize: 11,
        color: '#29B6F6',
        fontWeight: '700',
        letterSpacing: 0.3
    },
    botonNuevaCuenta: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 16,
        marginTop: 14,
        marginBottom: 25,
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: colors.primaryLight,
        borderWidth: 2,
        borderColor: colors.primary,
        borderStyle: 'dashed'
    },
    botonNuevaCuentaTexto: {
        fontSize: 14,
        fontWeight: '700',
        color: '#29B6F6',
        marginLeft: 8,
        // marginBottom: 50,
        letterSpacing: 0.3
    },
    // Botón cobrar destacado
    botonCobrarDestacado: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#4CAF50',
        marginHorizontal: 16,
        marginTop: 14,
        paddingVertical: 13,
        paddingHorizontal: 14,
        borderRadius: 12,
        shadowColor: '#4CAF50',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 4,
    },
    botonCobrarIcono: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    botonCobrarTextos: {
        flex: 1,
    },
    botonCobrarTitulo: {
        fontSize: 16,
        fontWeight: '800',
        color: '#FFF',
        marginBottom: 2,
        letterSpacing: -0.2
    },
    botonCobrarSubtitulo: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.9)',
        fontWeight: '500',
    },
    // Sin cuenta
    sinCuentaCard: {
        backgroundColor: colors.card,
        margin: 16,
        padding: 32,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border
    },
    sinCuentaIcono: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.surfaceVariant,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16
    },
    sinCuentaTitulo: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 8 },
    sinCuentaTexto: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
    botonAbrirCuenta: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#29B6F6', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 },
    botonAbrirCuentaTexto: { color: '#FFFFFF', fontSize: 15, fontWeight: '600', marginLeft: 6 },
    // Historial
    botonHistorial: {
        backgroundColor: colors.card,
        marginHorizontal: 16,
        marginTop: 14,
        padding: 14,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1
    },
    historialIcono: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: colors.surfaceVariant,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12
    },
    historialTextos: { flex: 1 },
    historialTitulo: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 2, letterSpacing: -0.1 },
    historialSubtitulo: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
    espacioFinal: { height: 20 },
    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalDetalle: { backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '75%' },
    modalDetalleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
    modalDetalleTitulo: { fontSize: 18, fontWeight: '700', color: colors.text },
    modalDetalleContenido: { padding: 20 },
    detalleInfoGeneral: { alignItems: 'center', marginBottom: 20 },
    detalleTipoIcono: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    iconoCargo: { backgroundColor: '#FFE5E5' },
    iconoAbono: { backgroundColor: '#E8F5E9' },
    detalleTipo: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 4 },
    detalleFecha: { fontSize: 14, color: colors.textSecondary },
    detalleTotalContainer: { backgroundColor: colors.surfaceVariant, borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 20 },
    detalleTotalLabel: { fontSize: 13, color: colors.textSecondary, marginBottom: 4 },
    detalleTotalMonto: { fontSize: 28, fontWeight: '700' },
    prendasContainer: { backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
    prendasTitulo: { fontSize: 14, fontWeight: '600', color: colors.textSecondary, padding: 14, backgroundColor: colors.surfaceVariant, borderBottomWidth: 1, borderBottomColor: colors.border },
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
    prendaFechaContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    prendaFecha: { fontSize: 10, color: colors.textSecondary, marginLeft: 4 },
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
    abonoDetalleContainer: { backgroundColor: colors.surfaceVariant, borderRadius: 12, padding: 16 },
    abonoFechaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    abonoFechaTexto: { fontSize: 14, color: colors.primary, fontWeight: '500', marginLeft: 8 },
    abonoNotaContainer: { backgroundColor: colors.card, borderRadius: 8, padding: 12 },
    abonoNotaLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 4 },
    abonoNotaTexto: { fontSize: 15, color: colors.text },
    descripcionSimpleContainer: { backgroundColor: colors.surfaceVariant, borderRadius: 12, padding: 16 },
    descripcionSimpleLabel: { fontSize: 13, color: colors.textSecondary, marginBottom: 6 },
    descripcionSimpleTexto: { fontSize: 15, color: colors.text, lineHeight: 22 },
    modalDetalleAcciones: { flexDirection: 'row', gap: 12, marginHorizontal: 20, marginTop: 12 },
    botonEditar: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryLight, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.primary },
    botonEditarTexto: { fontSize: 16, fontWeight: '600', color: colors.primary, marginLeft: 6 },
    modalDetalleCerrar: { flex: 1, backgroundColor: colors.surfaceVariant, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
    modalDetalleCerrarTexto: { fontSize: 16, fontWeight: '600', color: colors.text },
    modalCaptura: {
        position: 'absolute',
        left: -10000,
        top: 0,
    },
});