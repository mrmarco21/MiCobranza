import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../shared/hooks/useTheme';
import { formatCurrency } from '../../shared/utils/helpers';
import Header from '../../shared/components/Header';
import { getAll as getAllVentas } from '../../data/ventasRepository';
import { getAll as getAllClientas } from '../../data/clientasRepository';
import { getAll as getAllCuentas } from '../../data/cuentasRepository';
import FiltrosVentasModal from './components/FiltrosVentasModal';
import { useToast } from '../../shared/context/ToastContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import ComprobanteVenta from './components/ComprobanteVenta';

export default function ListaVentasScreen({ navigation, route }) {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const styles = createStyles(colors);
    const { showToast } = useToast();

    // Función helper para formatear fechas
    const formatDate = (date) => {
        if (!date) return '';
        const d = date instanceof Date ? date : new Date(date);
        if (isNaN(d)) return '';
        return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    };

    const [ventas, setVentas] = useState([]);
    const [totalVentas, setTotalVentas] = useState(0);
    const [busqueda, setBusqueda] = useState('');
    const comprobanteRef = useRef(null);
    const [ventaParaCompartir, setVentaParaCompartir] = useState(null);
    const [ventaExpandida, setVentaExpandida] = useState(null);
    const [filtroActivo, setFiltroActivo] = useState(false);
    const [cuentas, setCuentas] = useState([]);
    const [clienteSeleccionadoTemp, setClienteSeleccionadoTemp] = useState(null);
    const [filtrosAplicados, setFiltrosAplicados] = useState({
        fechaInicio: formatDate(new Date()), // Fecha de hoy por defecto
        fechaFin: formatDate(new Date()), // Fecha de hoy por defecto
        clienteId: null,
        clienteNombre: null,
        estadoPago: null,
        tipoPago: null
    });

    // Manejar el cliente seleccionado que viene de la navegación
    useFocusEffect(
        useCallback(() => {
            if (route.params?.clienteSeleccionado) {
                setClienteSeleccionadoTemp(route.params.clienteSeleccionado);
                setFiltroActivo(true); // Reabrir el modal
                // Limpiar el parámetro
                navigation.setParams({ clienteSeleccionado: undefined });
            }
        }, [route.params?.clienteSeleccionado])
    );

    useFocusEffect(
        useCallback(() => {
            cargarVentas();
            cargarClientes();
            cargarCuentas();
        }, [])
    );

    // Recargar ventas cuando cambien los filtros
    useEffect(() => {
        cargarVentas();
    }, [filtrosAplicados, busqueda]);

    const cargarVentas = async () => {
        try {
            const todasLasVentas = await getAllVentas();

            // Verificar si hay filtros activos
            const tieneFiltros =
                filtrosAplicados.fechaInicio ||
                filtrosAplicados.fechaFin ||
                filtrosAplicados.clienteId ||
                filtrosAplicados.estadoPago ||
                filtrosAplicados.tipoPago ||
                busqueda;

            let ventasAMostrar;
            if (tieneFiltros) {
                // Si hay filtros, mostrar todas las ventas (se filtrarán después)
                ventasAMostrar = todasLasVentas;
            } else {
                // Sin filtros, solo mostrar las del día actual
                const hoy = new Date().toLocaleDateString('es-PE');
                ventasAMostrar = todasLasVentas.filter(v => {
                    const fechaVenta = new Date(v.fecha).toLocaleDateString('es-PE');
                    return fechaVenta === hoy;
                });
            }

            // Ordenar por fecha descendente (más recientes primero)
            const ventasOrdenadas = ventasAMostrar.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
            setVentas(ventasOrdenadas);
        } catch (error) {
            console.error('Error al cargar ventas:', error);
        }
    };

    const cargarClientes = async () => {
        try {
            await getAllClientas();
        } catch (error) {
            console.error('Error al cargar clientes:', error);
        }
    };

    const cargarCuentas = async () => {
        try {
            const cuentasData = await getAllCuentas();
            setCuentas(cuentasData);
        } catch (error) {
            console.error('Error al cargar cuentas:', error);
        }
    };

    // Función para obtener la deuda específica de una venta
    // Ahora es simple: cada venta tiene su propia cuenta única
    // La deuda de la venta = saldo actual de su cuenta
    const obtenerDeudaEspecificaVenta = (venta) => {
        if (!venta.cuentaId || venta.tipo === 'CONTADO') {
            return 0; // Ventas de contado no tienen deuda
        }

        // Buscar la cuenta de esta venta
        const cuenta = cuentas.find(c => c.id === venta.cuentaId);

        if (!cuenta) {
            // Si no se encuentra la cuenta, usar la deuda original de la venta
            return venta.deuda || 0;
        }

        // La deuda actual es simplemente el saldo de la cuenta
        return cuenta.saldo || 0;
    };

    // Función para obtener el estado de pago actual basado en la deuda específica
    const obtenerEstadoPagoActual = (venta) => {
        // Si la venta está anulada, retornar ANULADA
        if (venta.anulada) {
            return 'ANULADA';
        }

        if (!venta.cuentaId || venta.tipo === 'CONTADO') {
            return 'PAGADO';
        }

        const deudaActual = obtenerDeudaEspecificaVenta(venta);

        // Verificar si la cuenta está cerrada (todas las ventas pagadas)
        const cuenta = cuentas.find(c => c.id === venta.cuentaId);
        if (cuenta && (cuenta.estado === 'CERRADA' || cuenta.saldo === 0)) {
            return 'PAGADO';
        }

        if (deudaActual === 0) {
            return 'PAGADO';
        } else if (venta.tipo === 'PARCIAL' && venta.montoPagado > 0) {
            return 'PARCIAL';
        } else if (venta.estadoPago === 'PARCIAL') {
            return 'PARCIAL';
        } else {
            return 'PENDIENTE';
        }
    };

    const toggleExpandirVenta = (ventaId) => {
        setVentaExpandida(ventaExpandida === ventaId ? null : ventaId);
    };

    const handleVerProductos = (venta) => {
        navigation.navigate('DetalleVenta', { venta });
    };

    const handleCompartirVenta = async (venta) => {
        try {
            showToast({
                type: 'info',
                text: 'Generando comprobante...',
            });

            // Obtener datos necesarios
            const storeName = await AsyncStorage.getItem('store_name') || 'Mi Cobranza';
            const storeLogo = await AsyncStorage.getItem('store_logo');
            const deudaActual = obtenerDeudaEspecificaVenta(venta);
            const estadoPagoActual = obtenerEstadoPagoActual(venta);

            // Establecer la venta para renderizar el comprobante
            setVentaParaCompartir({
                venta,
                storeName,
                storeLogo,
                deudaActual,
                estadoPagoActual
            });

            // Esperar un momento para que se renderice
            setTimeout(async () => {
                try {
                    if (!comprobanteRef.current) {
                        throw new Error('No se pudo generar el comprobante');
                    }

                    // Capturar la vista como imagen
                    const uri = await captureRef(comprobanteRef, {
                        format: 'png',
                        quality: 1,
                    });

                    // Compartir la imagen
                    if (await Sharing.isAvailableAsync()) {
                        await Sharing.shareAsync(uri, {
                            mimeType: 'image/png',
                            dialogTitle: `Comprobante ${venta.numeroDocumento || 'S/N'}`,
                        });

                        showToast({
                            type: 'success',
                            text: 'Comprobante compartido exitosamente',
                        });
                    } else {
                        showToast({
                            type: 'error',
                            text: 'No se puede compartir en este dispositivo',
                        });
                    }

                    // Limpiar
                    setVentaParaCompartir(null);
                } catch (error) {
                    console.error('Error al capturar comprobante:', error);
                    setVentaParaCompartir(null);
                    showToast({
                        type: 'error',
                        text: 'Error al generar el comprobante',
                    });
                }
            }, 500);
        } catch (error) {
            console.error('Error al compartir venta:', error);
            showToast({
                type: 'error',
                text: 'Error al compartir la venta',
            });
        }
    };

    const handleAnularVenta = async (venta) => {
        if (venta.anulada) {
            showToast({
                type: 'info',
                text: 'Esta venta ya está anulada',
            });
            return;
        }

        Alert.alert(
            'Anular Venta',
            `¿Estás seguro de que deseas anular la venta ${venta.numeroDocumento}? Esta acción devolverá los productos al inventario y actualizará los montos.`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Anular',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // Importar las funciones necesarias
                            const { anularVenta } = await import('../../data/ventasRepository');
                            const { getAll: getAllProductos, update: updateProducto } = await import('../../data/productosRepository');
                            const { getById: getCuentaById, update: updateCuenta } = await import('../../data/cuentasRepository');
                            const { getAll: getAllMovimientos, remove: removeMovimiento } = await import('../../data/movimientosRepository');
                            const eventEmitter = (await import('../../shared/events/EventEmitter')).default;
                            const { EVENTS } = await import('../../shared/events/EventEmitter');

                            // Marcar la venta como anulada
                            await anularVenta(venta.id);

                            // Devolver productos al stock
                            const productos = await getAllProductos();
                            const productosActualizados = [];
                            for (const productoVendido of venta.productos) {
                                const producto = productos.find(p => p.id === productoVendido.id);
                                if (producto) {
                                    const productoActualizado = await updateProducto(producto.id, {
                                        ...producto,
                                        stock: producto.stock + (productoVendido.cantidad || 1)
                                    });
                                    productosActualizados.push(productoActualizado);
                                }
                            }

                            // Emitir evento de actualización masiva de productos
                            if (productosActualizados.length > 0) {
                                eventEmitter.emit(EVENTS.PRODUCTOS_BATCH_UPDATED, productosActualizados);
                            }

                            // Si la venta tiene cuenta asociada (crédito o parcial), revertir la cuenta
                            if (venta.cuentaId) {
                                const cuenta = await getCuentaById(venta.cuentaId);

                                if (cuenta) {
                                    console.log('🔄 Anulando cuenta:', cuenta.id, 'Estado actual:', cuenta.estado, 'Saldo actual:', cuenta.saldo);

                                    // Obtener todos los movimientos de esta cuenta
                                    const todosLosMovimientos = await getAllMovimientos();
                                    const movimientosCuenta = todosLosMovimientos.filter(m => m.cuentaId === venta.cuentaId);

                                    console.log('📋 Movimientos a eliminar:', movimientosCuenta.length);

                                    // Eliminar todos los movimientos de esta cuenta
                                    for (const movimiento of movimientosCuenta) {
                                        await removeMovimiento(movimiento.id);
                                    }

                                    // Marcar la cuenta como ANULADA (no cerrada normalmente)
                                    const cuentaActualizada = await updateCuenta(cuenta.id, {
                                        saldo: 0,
                                        estado: 'CERRADA',
                                        anulada: true, // Marcar como anulada
                                        fechaCierre: new Date().toISOString()
                                    });

                                    console.log('✅ Cuenta anulada:', cuentaActualizada);
                                }
                            }

                            // Recargar ventas y cuentas
                            await cargarVentas();
                            await cargarCuentas();

                            showToast({
                                type: 'success',
                                text: 'Venta anulada exitosamente',
                            });
                        } catch (error) {
                            console.error('Error al anular venta:', error);
                            showToast({
                                type: 'error',
                                text: 'Error al anular la venta',
                            });
                        }
                    },
                },
            ]
        );
    };

    const handleAplicarFiltros = (filtros) => {
        // Convertir fechas de Date a string DD/MM/AAAA si es necesario
        const filtrosFormateados = {
            ...filtros,
            fechaInicio: filtros.fechaInicio ? formatDate(filtros.fechaInicio) : '',
            fechaFin: filtros.fechaFin ? formatDate(filtros.fechaFin) : '',
        };
        setFiltrosAplicados(filtrosFormateados);
        setClienteSeleccionadoTemp(null); // Limpiar el temporal
    };

    const parseStringToDate = (dateStr) => {
        if (!dateStr || typeof dateStr !== 'string') return null;
        const [dia, mes, anio] = dateStr.split('/');
        if (!dia || !mes || !anio) return null;
        return new Date(parseInt(anio), parseInt(mes) - 1, parseInt(dia));
    };

    const parseFecha = (fechaStr) => {
        // Espera formato DD/MM/AAAA
        if (!fechaStr || fechaStr.length < 10) return null;
        const [dia, mes, anio] = fechaStr.split('/');
        const fecha = new Date(anio, mes - 1, dia);
        // Establecer a medianoche para comparación correcta
        fecha.setHours(0, 0, 0, 0);
        return fecha;
    };

    // Función para aplicar filtros a las ventas
    const aplicarFiltros = (ventasParaFiltrar) => {
        return ventasParaFiltrar.filter(venta => {
            // Filtro por búsqueda (nombre de cliente)
            if (busqueda) {
                const searchLower = busqueda.toLowerCase();
                if (!venta.clienteNombre.toLowerCase().includes(searchLower)) {
                    return false;
                }
            }

            // Filtro por rango de fechas
            if (filtrosAplicados.fechaInicio || filtrosAplicados.fechaFin) {
                const fechaVenta = new Date(venta.fecha);
                // Normalizar la fecha de la venta a medianoche para comparación
                const fechaVentaNormalizada = new Date(fechaVenta.getFullYear(), fechaVenta.getMonth(), fechaVenta.getDate());
                fechaVentaNormalizada.setHours(0, 0, 0, 0);

                if (filtrosAplicados.fechaInicio) {
                    const fechaInicio = parseFecha(filtrosAplicados.fechaInicio);
                    if (fechaInicio) {
                        fechaInicio.setHours(0, 0, 0, 0);
                        if (fechaVentaNormalizada < fechaInicio) {
                            return false;
                        }
                    }
                }

                if (filtrosAplicados.fechaFin) {
                    const fechaFin = parseFecha(filtrosAplicados.fechaFin);
                    if (fechaFin) {
                        fechaFin.setHours(0, 0, 0, 0);
                        if (fechaVentaNormalizada > fechaFin) {
                            return false;
                        }
                    }
                }
            }

            // Filtro por cliente
            if (filtrosAplicados.clienteId && venta.clienteId !== filtrosAplicados.clienteId) {
                return false;
            }

            // Filtro por estado de pago
            if (filtrosAplicados.estadoPago && venta.estadoPago !== filtrosAplicados.estadoPago) {
                return false;
            }

            // Filtro por tipo de pago
            if (filtrosAplicados.tipoPago) {
                // Para crédito, verificar el tipo de venta
                if (filtrosAplicados.tipoPago === 'CREDITO') {
                    if (venta.tipo !== 'CREDITO') {
                        return false;
                    }
                } else {
                    // Para otros tipos, verificar el método de pago
                    if (venta.metodoPago !== filtrosAplicados.tipoPago) {
                        return false;
                    }
                }
            }

            return true;
        });
    };

    // Calcular ventas filtradas usando useMemo para optimizar
    const ventasFiltradas = useMemo(() => {
        return aplicarFiltros(ventas);
    }, [ventas, busqueda, filtrosAplicados]);

    // Calcular el total de ventas filtradas (excluyendo anuladas)
    useEffect(() => {
        const totalFiltrado = ventasFiltradas
            .filter(v => !v.anulada) // Excluir ventas anuladas
            .reduce((sum, v) => sum + v.total, 0);
        setTotalVentas(totalFiltrado);
    }, [ventasFiltradas]);

    // Verificar si hay filtros activos
    const hayFiltrosActivos =
        filtrosAplicados.fechaInicio ||
        filtrosAplicados.fechaFin ||
        filtrosAplicados.clienteId ||
        filtrosAplicados.estadoPago ||
        filtrosAplicados.tipoPago;

    const renderVentaRow = (venta) => {
        const isExpandida = ventaExpandida === venta.id;
        const esCredito = venta.tipo === 'CREDITO';
        const esParcial = venta.tipo === 'PARCIAL';

        // Obtener deuda actual específica de esta venta (no el saldo total de la cuenta)
        const deudaActual = obtenerDeudaEspecificaVenta(venta);
        const estadoPagoActual = obtenerEstadoPagoActual(venta);

        const tipoPago = esCredito
            ? '-'
            : esParcial
                ? 'PARCIAL'
                : venta.metodoPago === 'MIXTO'
                    ? 'MIXTO'
                    : venta.metodoPago === 'EFECTIVO' || !venta.metodoPago
                        ? 'EFEC'
                        : venta.metodoPago;

        return (
            <View key={venta.id}>
                {/* Cliente header row */}
                <View style={styles.clienteHeaderRow}>
                    <Text style={styles.clienteHeaderText}>Cliente: {venta.clienteNombre}</Text>
                </View>

                {/* Main data row */}
                <TouchableOpacity
                    style={[styles.ventaRow, isExpandida && styles.ventaRowExpanded]}
                    onPress={() => toggleExpandirVenta(venta.id)}
                    activeOpacity={0.7}
                >
                    {/* #DOC */}
                    <View style={styles.colDoc}>
                        {/* <View style={[
                            styles.docTypeBadge,
                            esBoleta ? styles.docBadgeBoleta : styles.docBadgeNota
                        ]}>
                            <Text style={styles.docTypeBadgeText}>
                                {esBoleta ? 'BOL' : 'NTV'}
                            </Text>
                        </View> */}
                        <Text style={[styles.docNumero, venta.anulada && styles.docNumeroAnulado]}>
                            {venta.numeroDocumento}
                        </Text>
                    </View>

                    {/* TIPO DE PAGO */}
                    <View style={styles.colTipoPago}>
                        <Text style={[styles.tipoPagoText, venta.anulada && styles.textoAnulado]}>
                            {tipoPago}
                        </Text>
                    </View>

                    {/* TOTAL */}
                    <View style={styles.colTotal}>
                        <Text style={[styles.totalText, venta.anulada && styles.textoAnulado]}>
                            {formatCurrency(venta.total)}
                        </Text>
                    </View>

                    {/* E. DESP */}
                    <View style={styles.colEstado}>
                        <View style={[
                            styles.estadoCircle,
                            venta.anulada
                                ? styles.estadoCirculoRojo
                                : styles.estadoCirculoVerde
                        ]}>
                            <View style={styles.estadoInnerCircle} />
                        </View>
                    </View>

                    {/* E. PAGO */}
                    <View style={styles.colEstado}>
                        <View style={[
                            styles.estadoCircle,
                            venta.anulada
                                ? styles.estadoCirculoRojo
                                : estadoPagoActual === 'PAGADO'
                                    ? styles.estadoCirculoVerde
                                    : estadoPagoActual === 'PARCIAL'
                                        ? styles.estadoCirculoAmarillo
                                        : styles.estadoCirculoNaranja
                        ]}>
                            <View style={styles.estadoInnerCircle} />
                        </View>
                    </View>
                </TouchableOpacity>

                {/* Expanded detail */}
                {isExpandida && (
                    <View style={styles.detallesExpandidos}>
                        {/* Info rows */}
                        <View style={styles.detallesGrid}>
                            <View style={styles.detalleRow}>
                                <Text style={styles.detalleLabel}>Fecha Op.:</Text>
                                <Text style={styles.detalleValue}>
                                    {new Date(venta.fecha).toLocaleDateString('es-PE', {
                                        day: '2-digit',
                                        month: 'long',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </Text>
                            </View>

                            <View style={styles.detalleRow}>
                                <Text style={styles.detalleLabel}>Modo de pago:</Text>
                                <Text style={styles.detalleValue}>{venta.tipo}</Text>
                            </View>

                            {/* Estado despacho + pago inline */}
                            <View style={styles.estadosInlineRow}>
                                <View style={styles.estadoInlineItem}>
                                    <Text style={styles.estadoInlineLabel}>E. Despacho</Text>
                                    <View style={[
                                        styles.estadoBadgeSmall,
                                        venta.anulada ? styles.estadoRojo : styles.estadoVerde
                                    ]}>
                                        <Text style={styles.estadoBadgeTextSmall}>
                                            {venta.anulada ? 'ANULADO' : 'FINALIZADO'}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.estadoInlineItem}>
                                    <Text style={styles.estadoInlineLabel}>E. Pago</Text>
                                    <View style={[
                                        styles.estadoBadgeSmall,
                                        venta.anulada ? styles.estadoRojo :
                                            estadoPagoActual === 'PAGADO' ? styles.estadoVerde :
                                                estadoPagoActual === 'PARCIAL' ? styles.estadoAmarillo : styles.estadoNaranja
                                    ]}>
                                        <Text style={styles.estadoBadgeTextSmall}>
                                            {venta.anulada ? 'ANULADA' :
                                                estadoPagoActual === 'PAGADO' ? 'PAGADO' :
                                                    estadoPagoActual === 'PARCIAL' ? 'PARCIAL' : 'PENDIENTE'}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* Mostrar detalles del pago parcial */}
                            {venta.tipo === 'PARCIAL' && venta.montoPagado && (
                                <View style={styles.detalleRow}>
                                    <Text style={styles.detalleLabel}>Pago parcial:</Text>
                                    <Text style={styles.detalleValue}>
                                        Pagó {formatCurrency(venta.montoPagado)} de {formatCurrency(venta.total)}
                                    </Text>
                                </View>
                            )}

                            {/* Comentario */}
                            {venta.comentario && (
                                <View style={styles.detalleRow}>
                                    <Text style={styles.detalleLabel}>Comentario:</Text>
                                    <Text style={styles.detalleValue}>{venta.comentario}</Text>
                                </View>
                            )}
                        </View>

                        {/* Totales */}
                        <View style={styles.totalesRow}>
                            <Text style={styles.totalLabel}>
                                Total: <Text style={styles.totalValor}>{formatCurrency(venta.total)}</Text>
                            </Text>
                            {!venta.anulada && deudaActual > 0 && venta.cuentaId && (
                                <TouchableOpacity
                                    onPress={() => navigation.navigate('DetalleCuenta', {
                                        cuentaId: venta.cuentaId,
                                        clientaNombre: venta.clienteNombre
                                    })}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.deudaLabel}>
                                        Deuda: <Text style={styles.deudaValor}>{formatCurrency(deudaActual)} (PAGAR)</Text>
                                    </Text>
                                </TouchableOpacity>
                            )}
                            {!venta.anulada && deudaActual === 0 && venta.cuentaId && (
                                <View style={styles.pagadoCompletoContainer}>
                                    <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                                    <Text style={styles.pagadoCompletoText}>Pagado completamente</Text>
                                </View>
                            )}
                        </View>

                        {/* Acciones */}
                        <View style={styles.accionesRow}>
                            <TouchableOpacity
                                style={styles.accionBtn}
                                onPress={() => handleVerProductos(venta)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.accionBtnTextPrimary}>Ver Productos</Text>
                            </TouchableOpacity>

                            {!venta.anulada && (
                                <>
                                    <TouchableOpacity
                                        style={styles.accionBtn}
                                        onPress={() => handleAnularVenta(venta)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.accionBtnTextDanger}>Anular</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.accionBtn}
                                        onPress={() => handleCompartirVenta(venta)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.accionBtnTextPrimary}>Compartir</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    </View>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <Header
                title={`Ventas: ${formatCurrency(totalVentas)}`}
                showBack
            />

            {/* Barra de búsqueda */}
            <View style={styles.searchContainer}>
                <View style={styles.searchInputContainer}>
                    <Ionicons name="search" size={20} color={colors.textSecondary} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Buscar por cliente"
                        placeholderTextColor={colors.textSecondary}
                        value={busqueda}
                        onChangeText={setBusqueda}
                    />
                </View>
                <TouchableOpacity
                    style={[styles.filterBtn, (filtroActivo || hayFiltrosActivos) && styles.filterBtnActive]}
                    onPress={() => setFiltroActivo(!filtroActivo)}
                    activeOpacity={0.7}
                >
                    <Ionicons
                        name="funnel"
                        size={20}
                        color={(filtroActivo || hayFiltrosActivos) ? '#FFF' : colors.text}
                    />
                </TouchableOpacity>
            </View>

            {/* Tabla header */}
            <View style={styles.tableHeader}>
                <View style={styles.colDoc}>
                    <Text style={styles.tableHeaderText}>#DOC</Text>
                </View>
                <View style={styles.colTipoPago}>
                    <Text style={styles.tableHeaderText}>TIPO DE PAGO</Text>
                </View>
                <View style={styles.colTotal}>
                    <Text style={styles.tableHeaderText}>TOTAL</Text>
                </View>
                <View style={styles.colEstado}>
                    <Text style={styles.tableHeaderTextSmall}>E. DESP.</Text>
                </View>
                <View style={styles.colEstado}>
                    <Text style={styles.tableHeaderTextSmall}>E. PAGO</Text>
                </View>
            </View>

            {/* Lista de ventas */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: Math.max(insets.bottom + 20, 20) }
                ]}
                showsVerticalScrollIndicator={false}
            >
                {ventasFiltradas.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="receipt-outline" size={64} color={colors.textSecondary} />
                        <Text style={styles.emptyTexto}>
                            {hayFiltrosActivos || busqueda
                                ? 'No se encontraron ventas con los filtros aplicados'
                                : 'No hay ventas registradas hoy'}
                        </Text>
                    </View>
                ) : (
                    ventasFiltradas.map((venta) => renderVentaRow(venta))
                )}
            </ScrollView>

            {/* Modal de filtros */}
            <FiltrosVentasModal
                visible={filtroActivo}
                onClose={() => {
                    setFiltroActivo(false);
                    setClienteSeleccionadoTemp(null);
                }}
                onApply={handleAplicarFiltros}
                currentFilters={{
                    fechaInicio: parseStringToDate(filtrosAplicados.fechaInicio),
                    fechaFin: parseStringToDate(filtrosAplicados.fechaFin),
                    clienteId: filtrosAplicados.clienteId,
                    clienteNombre: filtrosAplicados.clienteNombre,
                    estadoPago: filtrosAplicados.estadoPago,
                    tipoPago: filtrosAplicados.tipoPago,
                }}
                clienteSeleccionadoExterno={clienteSeleccionadoTemp}
                navigation={navigation}
            />

            {/* Comprobante oculto para captura */}
            {ventaParaCompartir && (
                <View style={{ position: 'absolute', left: -9999 }}>
                    <View ref={comprobanteRef} collapsable={false}>
                        <ComprobanteVenta
                            venta={ventaParaCompartir.venta}
                            storeName={ventaParaCompartir.storeName}
                            storeLogo={ventaParaCompartir.storeLogo}
                            deudaActual={ventaParaCompartir.deudaActual}
                            estadoPago={ventaParaCompartir.estadoPagoActual}
                        />
                    </View>
                </View>
            )}
        </View>
    );
}

const createStyles = (colors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },

    // Search
    searchContainer: {
        flexDirection: 'row',
        paddingHorizontal: 12,
        paddingVertical: 8,
        gap: 8,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    searchInputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background,
        borderRadius: 8,
        paddingHorizontal: 12,
        gap: 8,
        height: 40,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: colors.text,
    },
    filterBtn: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    filterBtnActive: {
        backgroundColor: colors.primary,
    },

    // Table header
    tableHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderBottomWidth: 2,
        borderBottomColor: colors.primary,
    },
    tableHeaderText: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.primary,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    tableHeaderTextSmall: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.primary,
        textTransform: 'uppercase',
        letterSpacing: 0.2,
        textAlign: 'center',
    },

    // Column widths
    colDoc: {
        flex: 2.2,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    colTipoPago: {
        flex: 1.5,
        alignItems: 'center',
    },
    colTotal: {
        flex: 1.5,
        alignItems: 'flex-end',
    },
    colEstado: {
        flex: 0.8,
        alignItems: 'center',
    },

    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 20,
    },

    // Cliente header
    clienteHeaderRow: {
        backgroundColor: colors.surfaceVariant || '#F0F0F0',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    clienteHeaderText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textSecondary,
        textAlign: 'center',
    },

    // Venta row
    ventaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    ventaRowExpanded: {
        backgroundColor: colors.card,
    },

    // Doc badge
    docTypeBadge: {
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 5,
    },
    docBadgeBoleta: {
        backgroundColor: '#4CAF50',
    },
    docBadgeNota: {
        backgroundColor: '#2196F3',
    },
    docTypeBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#FFF',
        letterSpacing: 0.3,
    },
    docNumero: {
        fontSize: 12,
        fontWeight: 'bold',
        color: colors.primary || '#45beffff',
        letterSpacing: 0.5,
    },
    docNumeroAnulado: {
        textDecorationLine: 'line-through',
        color: colors.textSecondary,
        fontWeight: '600',
    },
    textoAnulado: {
        textDecorationLine: 'line-through',
        color: colors.textSecondary,
    },

    tipoPagoText: {
        fontSize: 12,
        fontWeight: '500',
        color: colors.text,
    },
    totalText: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.text,
    },

    // Estado circles (hollow style for main row)
    estadoCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 3,
        justifyContent: 'center',
        alignItems: 'center',
    },
    estadoInnerCircle: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'white',
        opacity: 0,
    },
    estadoCirculoVerde: {
        borderColor: '#4CAF50',
        backgroundColor: 'transparent',
    },
    estadoCirculoAmarillo: {
        borderColor: '#FFC107',
        backgroundColor: 'transparent',
    },
    estadoCirculoNaranja: {
        borderColor: '#FF9800',
        backgroundColor: 'transparent',
    },
    estadoCirculoRojo: {
        borderColor: '#F44336',
        backgroundColor: 'transparent',
    },

    // Estado badges (text style for expanded section)
    estadoBadge: {
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 4,
        minWidth: 60,
        alignItems: 'center',
    },
    estadoBadgeText: {
        fontSize: 9,
        fontWeight: '700',
        color: '#FFF',
        letterSpacing: 0.3,
    },
    estadoVerde: {
        backgroundColor: '#4CAF50',
    },
    estadoAmarillo: {
        backgroundColor: '#FFC107',
    },
    estadoNaranja: {
        backgroundColor: '#FF9800',
    },
    estadoRojo: {
        backgroundColor: '#F44336',
    },

    // Small estado badges for expanded
    estadoBadgeSmall: {
        paddingHorizontal: 5,
        paddingVertical: 2,
        borderRadius: 3,
        minWidth: 50,
        alignItems: 'center',
    },
    estadoBadgeTextSmall: {
        fontSize: 8,
        fontWeight: '700',
        color: '#FFF',
        letterSpacing: 0.2,
    },

    // Expanded details
    detallesExpandidos: {
        backgroundColor: colors.background,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingVertical: 10,
        paddingHorizontal: 12,
    },
    detallesGrid: {
        gap: 4,
        marginBottom: 8,
    },
    detalleRow: {
        flexDirection: 'row',
        gap: 6,
        paddingVertical: 2,
    },
    detalleLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        minWidth: 100,
    },
    detalleValue: {
        fontSize: 12,
        color: colors.text,
        fontWeight: '500',
        flex: 1,
    },

    estadosInlineRow: {
        flexDirection: 'row',
        gap: 16,
        paddingVertical: 4,
        flexWrap: 'wrap',
    },
    estadoInlineItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    estadoInlineLabel: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    estadoInlineValue: {
        fontWeight: '600',
        color: colors.text,
    },

    // Totales
    totalesRow: {
        flexDirection: 'row',
        gap: 16,
        paddingVertical: 6,
        flexWrap: 'wrap',
    },
    totalLabel: {
        fontSize: 13,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    totalValor: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.text,
    },
    deudaLabel: {
        fontSize: 13,
        color: colors.error,
        fontWeight: '500',
    },
    deudaValor: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.error,
        textDecorationLine: 'underline',
    },
    pagadoCompletoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    pagadoCompletoText: {
        fontSize: 13,
        color: '#4CAF50',
        fontWeight: '600',
    },

    // Acciones
    accionesRow: {
        flexDirection: 'row',
        gap: 0,
        paddingTop: 6,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        marginTop: 6,
    },
    accionBtn: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 6,
    },
    accionBtnTextPrimary: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.primary,
    },
    accionBtnTextDanger: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.error,
    },

    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 80,
        gap: 16,
    },
    emptyTexto: {
        fontSize: 15,
        color: colors.textSecondary,
    },
});