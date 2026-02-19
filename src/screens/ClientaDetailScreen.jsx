import { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { obtenerClientaConSaldo } from '../logic/clientasService';
import { obtenerCuentasActivas, obtenerCuentasCerradas } from '../logic/cuentasService';
import { obtenerMovimientosDeCuenta } from '../logic/movimientosService';
import * as categoriasRepo from '../data/categoriasRepository';
import { formatCurrency, formatDate } from '../utils/helpers';
import { useTheme } from '../hooks/useTheme';
import Header from '../components/Header';
import EstadoCuentaImagen from '../components/EstadoCuentaImagen';

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

    // Estados para compartir imagen
    const [modalCompartirVisible, setModalCompartirVisible] = useState(false);
    const [cuentaParaCompartir, setCuentaParaCompartir] = useState(null);
    const [movimientosParaCompartir, setMovimientosParaCompartir] = useState([]);
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

        const cerradas = await obtenerCuentasCerradas(clientaId);
        setNumCuentasCerradas(cerradas.length);
    };

    const handleNuevaCuenta = () => {
        navigation.navigate('AddMovimiento', { clientaId, nuevaCuenta: true, tipo: 'CARGO' });
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

    const handleMovimientoPress = (movimiento, cuentaId) => {
        setMovimientoSeleccionado(movimiento);
        setCuentaIdSeleccionada(cuentaId);
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
        if (!comentario) return [];
        const partes = comentario.split(' | ');
        return partes.map(parte => {
            // Formato nuevo con categoría ID: "Blusa roja (S/25.00) [01/01/2026] {ropa-otros}"
            const matchCompleto = parte.match(/^(.+?)\s*\(S\/(\d+\.?\d*)\)\s*\[(\d{2}\/\d{2}\/\d{4})\]\s*\{(.+?)\}$/);
            if (matchCompleto) {
                return {
                    descripcion: matchCompleto[1].trim(),
                    monto: parseFloat(matchCompleto[2]),
                    fecha: matchCompleto[3],
                    categoria: matchCompleto[4]
                };
            }
            // Formato con fecha pero sin categoría (datos antiguos)
            const matchConFecha = parte.match(/^(.+?)\s*\(S\/(\d+\.?\d*)\)\s*\[(\d{2}\/\d{2}\/\d{4})\]$/);
            if (matchConFecha) {
                return {
                    descripcion: matchConFecha[1].trim(),
                    monto: parseFloat(matchConFecha[2]),
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
                    fecha: null,
                    categoria: null
                };
            }
            return { descripcion: parte, monto: null, fecha: null, categoria: null };
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

    const compartirCuenta = async (cuenta, movimientos) => {
        setCuentaParaCompartir(cuenta);
        setMovimientosParaCompartir(movimientos);
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
                        dialogTitle: `Estado de Cuenta #${cuenta.numeroCuenta || 1} - ${clienta.nombre}`
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
            <Header title="Detalle de Clienta" showBack />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerContenido}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarTexto}>{clienta.nombre.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={styles.headerInfo}>
                        <Text style={styles.nombre}>{clienta.nombre}</Text>
                        {clienta.referencia && (
                            <View style={styles.infoRow}>
                                <Ionicons name="people-outline" size={12} color="#95A5A6" />
                                <Text style={styles.dato}>Ref: {clienta.referencia}</Text>
                            </View>
                        )}
                    </View>
                    <TouchableOpacity
                        style={styles.botonEditar}
                        onPress={() => navigation.navigate('AddClienta', { clientaId })}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="pencil" size={16} color="#29B6F6" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView style={styles.contenido} showsVerticalScrollIndicator={false}>
                {cuentasActivas.length > 0 ? (
                    <>
                        {/* Resumen total */}
                        <View style={styles.resumenContainer}>
                            <View style={styles.resumenCard}>
                                <View style={styles.resumenRow}>
                                    <View style={styles.resumenIcono}>
                                        <Ionicons name="trending-down" size={14} color="#FF6B6B" />
                                    </View>
                                    <View style={styles.resumenTextos}>
                                        <Text style={styles.resumenLabel}>Deuda total</Text>
                                        {cuentasActivas.length > 1 && (
                                            <Text style={styles.resumenSubtexto}>{cuentasActivas.length} cuentas</Text>
                                        )}
                                    </View>
                                </View>
                                <Text style={styles.resumenMontoDeuda}>{formatCurrency(totalDeuda)}</Text>
                            </View>
                            <View style={styles.resumenCard}>
                                <View style={styles.resumenRow}>
                                    <View style={[styles.resumenIcono, styles.resumenIconoAbono]}>
                                        <Ionicons name="trending-up" size={14} color="#4CAF50" />
                                    </View>
                                    <View style={styles.resumenTextos}>
                                        <Text style={styles.resumenLabel}>Total abonado</Text>
                                    </View>
                                </View>
                                <Text style={styles.resumenMontoAbono}>{formatCurrency(totalAbonos)}</Text>
                            </View>
                        </View>

                        {/* Lista de cuentas activas */}
                        {cuentasActivas.map((cuenta, index) => {
                            const movimientos = movimientosPorCuenta[cuenta.id] || [];
                            const colores = [
                                { bg: '#E1F5FE', border: '#29B6F6', numero: '#29B6F6' },
                                { bg: '#E3F2FD', border: '#2196F3', numero: '#2196F3' },
                                { bg: '#FFF3E0', border: '#FF9800', numero: '#FF9800' },
                                { bg: '#F1F8E9', border: '#8BC34A', numero: '#8BC34A' },
                                { bg: '#FCE4EC', border: '#E91E63', numero: '#E91E63' },
                            ];
                            // Usar numeroCuenta si existe, sino usar el índice + 1
                            const numeroCuenta = cuenta.numeroCuenta || (index + 1);
                            const color = colores[(numeroCuenta - 1) % colores.length];

                            return (
                                <View key={cuenta.id} style={[styles.cuentaCard, { borderLeftWidth: 5, borderLeftColor: color.border }]}>
                                    <View style={styles.cuentaHeader}>
                                        <View style={styles.cuentaTituloRow}>
                                            <View style={[styles.cuentaNumero, { backgroundColor: color.bg, borderColor: color.border }]}>
                                                <Text style={[styles.cuentaNumeroTexto, { color: color.numero }]}>#{numeroCuenta}</Text>
                                            </View>
                                            <View style={styles.cuentaInfoTexto}>
                                                <Text style={styles.cuentaFecha}>Desde {formatDate(cuenta.fechaCreacion)}</Text>
                                            </View>
                                        </View>
                                        <View style={styles.cuentaSaldoContainer}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={{ fontSize: 10, color: '#95A5A6', fontWeight: '600', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>Saldo actual</Text>
                                                <Text style={styles.cuentaSaldo}>{formatCurrency(cuenta.saldo)}</Text>
                                            </View>
                                            <TouchableOpacity
                                                style={styles.botonCompartir}
                                                onPress={() => compartirCuenta(cuenta, movimientos)}
                                                activeOpacity={0.7}
                                            >
                                                <Ionicons name="share-outline" size={18} color="#29B6F6" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    {/* Botones */}
                                    <View style={styles.cuentaBotones}>
                                        <TouchableOpacity
                                            style={styles.cuentaBotonCargo}
                                            onPress={() => navigation.navigate('AddMovimiento', { cuentaId: cuenta.id, tipo: 'CARGO' })}
                                            activeOpacity={0.7}
                                        >
                                            <Ionicons name="add" size={16} color="#FF6B6B" />
                                            <Text style={styles.cuentaBotonCargoTexto}>Cargo</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.cuentaBotonAbono}
                                            onPress={() => navigation.navigate('AddMovimiento', { cuentaId: cuenta.id, tipo: 'ABONO' })}
                                            activeOpacity={0.7}
                                        >
                                            <Ionicons name="remove" size={16} color="#4CAF50" />
                                            <Text style={styles.cuentaBotonAbonoTexto}>Abono</Text>
                                        </TouchableOpacity>
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
                                                    {(movimientosExpandidos[cuenta.id] ? movimientos : movimientos.slice(0, 3)).map((mov) => (
                                                        <TouchableOpacity
                                                            key={mov.id}
                                                            style={styles.miniMovimiento}
                                                            onPress={() => handleMovimientoPress(mov, cuenta.id)}
                                                        >
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
                                                        </TouchableOpacity>
                                                    ))}
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

                                {movimientoSeleccionado.tipo === 'CARGO' && tienePrendasDesglosadas ? (
                                    <View style={styles.prendasContainer}>
                                        <Text style={styles.prendasTitulo}>Detalle de prendas</Text>
                                        {prendas.map((prenda, index) => (
                                            <View key={index} style={styles.prendaItem}>
                                                <View style={styles.prendaInfo}>
                                                    <View style={styles.prendaNumero}>
                                                        <Text style={styles.prendaNumeroTexto}>{index + 1}</Text>
                                                    </View>
                                                    <View style={styles.prendaTextos}>
                                                        <Text style={styles.prendaDescripcion}>{prenda.descripcion}</Text>
                                                        {prenda.fecha && (
                                                            <View style={styles.prendaFechaContainer}>
                                                                <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} />
                                                                <Text style={styles.prendaFecha}>{prenda.fecha}</Text>
                                                            </View>
                                                        )}
                                                    </View>
                                                </View>
                                                {prenda.monto !== null && (
                                                    <Text style={styles.prendaMonto}>{formatCurrency(prenda.monto)}</Text>
                                                )}
                                            </View>
                                        ))}
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

                        <View style={[styles.modalDetalleAcciones, { paddingBottom: Math.max(insets.bottom + 8, 12) }]}>
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

            {/* Modal invisible para capturar imagen */}
            <Modal
                visible={modalCompartirVisible}
                transparent
                animationType="none"
            >
                <View style={styles.modalCaptura}>
                    <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1.0 }}>
                        {cuentaParaCompartir && (
                            <EstadoCuentaImagen
                                clientaNombre={clienta.nombre}
                                numeroCuenta={cuentaParaCompartir.numeroCuenta || 1}
                                fechaCreacion={cuentaParaCompartir.fechaCreacion}
                                saldo={cuentaParaCompartir.saldo}
                                movimientos={movimientosParaCompartir}
                                parsearPrendas={parsearPrendas}
                                parsearFechaAbono={parsearFechaAbono}
                                extraerDescripcionAbono={extraerDescripcionAbono}
                                categorias={categorias}
                            />
                        )}
                    </ViewShot>
                </View>
            </Modal>
        </View>
    );
}


const createStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
    headerContenido: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
    avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surfaceVariant, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    avatarTexto: { fontSize: 20, fontWeight: '700', color: colors.textSecondary },
    headerInfo: { flex: 1 },
    nombre: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 2 },
    infoRow: { flexDirection: 'row', alignItems: 'center' },
    dato: { fontSize: 12, color: colors.textSecondary, marginLeft: 4 },
    botonEditar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.card,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: colors.primaryLight,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2
    },
    contenido: { flex: 1 },
    resumenContainer: { flexDirection: 'row', marginHorizontal: 16, marginTop: 10, gap: 8 },
    resumenCard: { flex: 1, backgroundColor: colors.card, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
    resumenRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    resumenIcono: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFE5E5', justifyContent: 'center', alignItems: 'center', marginRight: 6 },
    resumenIconoAbono: { backgroundColor: '#E8F5E9' },
    resumenTextos: { flex: 1 },
    resumenLabel: { fontSize: 10, color: colors.textSecondary, fontWeight: '600' },
    resumenMontoDeuda: { fontSize: 18, fontWeight: '700', color: '#FF6B6B' },
    resumenMontoAbono: { fontSize: 18, fontWeight: '700', color: '#4CAF50' },
    resumenSubtexto: { fontSize: 9, color: colors.textSecondary, marginTop: 1 },
    // Cuenta card
    cuentaCard: {
        backgroundColor: colors.card,
        marginHorizontal: 16,
        marginTop: 10,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2
    },
    cuentaHeader: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border
    },
    cuentaTituloRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8
    },
    cuentaNumero: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
        elevation: 1
    },
    cuentaNumeroTexto: {
        fontSize: 14,
        fontWeight: '800',
        letterSpacing: 0.5
    },
    cuentaInfoTexto: {
        flex: 1
    },
    cuentaFecha: {
        fontSize: 11,
        color: colors.textSecondary,
        fontWeight: '500',
        letterSpacing: 0.2
    },
    cuentaSaldoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.surfaceVariant,
        padding: 10,
        borderRadius: 10,
        marginTop: 2
    },
    cuentaSaldo: {
        fontSize: 22,
        fontWeight: '800',
        color: '#FF6B6B',
        letterSpacing: -0.5
    },
    botonCompartir: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: colors.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: colors.primaryLight,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.12,
        shadowRadius: 3,
        elevation: 1
    },
    cuentaBotones: {
        flexDirection: 'row',
        padding: 10,
        gap: 8
    },
    cuentaBotonCargo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 9,
        backgroundColor: '#FFF5F5',
        borderWidth: 1.5,
        borderColor: '#FFD4D4',
        shadowColor: '#FF6B6B',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
        elevation: 1
    },
    cuentaBotonCargoTexto: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FF6B6B',
        marginLeft: 4,
        letterSpacing: 0.3
    },
    cuentaBotonAbono: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 9,
        backgroundColor: '#F0FFF4',
        borderWidth: 1.5,
        borderColor: '#C8E6C9',
        shadowColor: '#4CAF50',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
        elevation: 1
    },
    cuentaBotonAbonoTexto: {
        fontSize: 14,
        fontWeight: '700',
        color: '#4CAF50',
        marginLeft: 4,
        letterSpacing: 0.3
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
        paddingVertical: 6,
        paddingHorizontal: 4
    },
    cuentaMovimientosTitulo: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5
    },
    movimientosEncabezado: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: colors.primaryLight,
        borderRadius: 8,
        marginBottom: 6
    },
    encabezadoTexto: {
        fontSize: 10,
        fontWeight: '800',
        color: '#5C6BC0',
        textTransform: 'uppercase',
        letterSpacing: 0.8
    },
    miniMovimiento: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.card,
        marginBottom: 2,
        borderRadius: 6
    },
    miniMovIcono: {
        width: 28,
        height: 28,
        borderRadius: 14,
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
        fontWeight: '500'
    },
    miniMovMonto: {
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: -0.2
    },
    montoRojo: { color: '#FF6B6B' },
    montoVerde: { color: '#4CAF50' },
    verMasBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        paddingVertical: 8,
        gap: 4,
    },
    verMasTexto: {
        fontSize: 12,
        color: '#29B6F6',
        fontWeight: '600',
        letterSpacing: 0.3
    },
    botonNuevaCuenta: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 16,
        marginTop: 12,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: colors.primaryLight,
        borderWidth: 2,
        borderColor: colors.primary,
        borderStyle: 'dashed',
        shadowColor: '#29B6F6',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 1
    },
    botonNuevaCuentaTexto: {
        fontSize: 14,
        fontWeight: '700',
        color: '#29B6F6',
        marginLeft: 8,
        letterSpacing: 0.3
    },
    // Sin cuenta
    sinCuentaCard: { backgroundColor: colors.card, margin: 16, padding: 32, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
    sinCuentaIcono: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.surfaceVariant, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    sinCuentaTitulo: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 8 },
    sinCuentaTexto: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
    botonAbrirCuenta: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#29B6F6', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 },
    botonAbrirCuentaTexto: { color: '#FFFFFF', fontSize: 15, fontWeight: '600', marginLeft: 6 },
    // Historial
    botonHistorial: { backgroundColor: colors.card, marginHorizontal: 16, marginTop: 12, padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
    historialIcono: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceVariant, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    historialTextos: { flex: 1 },
    historialTitulo: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 2 },
    historialSubtitulo: { fontSize: 13, color: colors.textSecondary },
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
    prendaItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
    prendaInfo: { flexDirection: 'row', alignItems: 'flex-start', flex: 1 },
    prendaNumero: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#29B6F6', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    prendaNumeroTexto: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
    prendaTextos: { flex: 1 },
    prendaDescripcion: { fontSize: 14, color: colors.text, marginBottom: 2 },
    prendaFechaContainer: { flexDirection: 'row', alignItems: 'center' },
    prendaFecha: { fontSize: 12, color: colors.textSecondary, marginLeft: 4 },
    prendaMonto: { fontSize: 14, fontWeight: '600', color: colors.text },
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