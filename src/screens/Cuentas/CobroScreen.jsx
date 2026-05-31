import { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert, Modal } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { obtenerClientaConSaldo } from '../../services/clientasService';
import { obtenerCuentasActivas } from '../../services/cuentasService';
import { registrarMovimiento } from '../../services/movimientosService';
import { obtenerMovimientosDeCuenta } from '../../services/movimientosService';
import { formatCurrency, formatDate } from '../../shared/utils/helpers';
import { useTheme } from '../../shared/hooks/useTheme';
import Header from '../../shared/components/Header';
import Toast from '../../shared/components/Toast';

export default function CobroScreen({ route, navigation }) {
    const { clientaId } = route.params;
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const styles = createStyles(colors);

    const [clienta, setClienta] = useState(null);
    const [cuentasActivas, setCuentasActivas] = useState([]);
    const [montoPorCuenta, setMontoPorCuenta] = useState({});
    const [montoTotal, setMontoTotal] = useState('');
    const [comentario, setComentario] = useState('');
    const [loading, setLoading] = useState(false);
    const [toastVisible, setToastVisible] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [historialAbonos, setHistorialAbonos] = useState([]);
    const [mostrarHistorial, setMostrarHistorial] = useState(false);

    // Métodos de pago - nuevo sistema similar a MetodoPagoScreen
    const [metodosPago, setMetodosPago] = useState([
        { id: 'efectivo', nombre: 'EFECTIVO', monto: 0, activo: true }
    ]);
    const [modalEditarMonto, setModalEditarMonto] = useState(false);
    const [metodoEditando, setMetodoEditando] = useState(null);
    const [montoTemporal, setMontoTemporal] = useState('');

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

        const todosLosAbonos = [];
        for (const cuenta of cuentas) {
            const movimientos = await obtenerMovimientosDeCuenta(cuenta.id);
            const abonos = movimientos
                .filter(m => m.tipo === 'ABONO')
                .map(m => ({ ...m, cuentaNumero: cuenta.numeroCuenta || 1 }));
            todosLosAbonos.push(...abonos);
        }
        todosLosAbonos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        setHistorialAbonos(todosLosAbonos);
    };

    const showToast = (message) => {
        setToastMessage(message);
        setToastVisible(true);
    };

    const actualizarMontoCuenta = (cuentaId, valor) => {
        setMontoPorCuenta(prev => {
            const nuevoMonto = { ...prev, [cuentaId]: valor };

            // Calcular el nuevo total a cobrar
            const nuevoTotalCobro = Object.values(nuevoMonto).reduce((total, monto) => {
                return total + (parseFloat(monto) || 0);
            }, 0);

            // Auto-asignar el total a efectivo si existe
            const efectivoIndex = metodosPago.findIndex(m => m.id === 'efectivo');
            if (efectivoIndex !== -1) {
                setMetodosPago(prev => prev.map(m =>
                    m.id === 'efectivo' ? { ...m, monto: nuevoTotalCobro, activo: nuevoTotalCobro > 0 } : m
                ));
            }

            return nuevoMonto;
        });
    };

    const calcularTotalCobro = () => {
        return Object.values(montoPorCuenta).reduce((total, monto) => {
            return total + (parseFloat(monto) || 0);
        }, 0);
    };

    const calcularTotalMetodosPago = () => {
        return metodosPago.reduce((total, metodo) => {
            return total + (metodo.monto || 0);
        }, 0);
    };

    const aplicarMontoCompleto = (cuentaId, saldo) => {
        actualizarMontoCuenta(cuentaId, saldo.toString());
    };

    const distribuirMontoEquitativo = () => {
        const montoTotalNum = parseFloat(montoTotal) || 0;
        if (montoTotalNum <= 0) {
            Alert.alert('Error', 'Ingresa un monto total válido para distribuir');
            return;
        }
        const totalDeuda = cuentasActivas.reduce((sum, c) => sum + c.saldo, 0);
        if (montoTotalNum > totalDeuda) {
            Alert.alert('Monto excesivo', `El monto (S/ ${montoTotalNum.toFixed(2)}) no puede ser mayor a la deuda total (S/ ${totalDeuda.toFixed(2)})`);
            return;
        }
        const cuentasOrdenadas = [...cuentasActivas].sort((a, b) => b.saldo - a.saldo);
        let montoRestante = montoTotalNum;
        const nuevosMontoPorCuenta = {};
        for (const cuenta of cuentasOrdenadas) {
            if (montoRestante <= 0) {
                nuevosMontoPorCuenta[cuenta.id] = '0';
            } else {
                const montoAsignado = Math.min(montoRestante, cuenta.saldo);
                nuevosMontoPorCuenta[cuenta.id] = montoAsignado.toFixed(2);
                montoRestante -= montoAsignado;
            }
        }
        setMontoPorCuenta(nuevosMontoPorCuenta);

        // Auto-asignar el total a efectivo
        setMetodosPago(prev => prev.map(m =>
            m.id === 'efectivo' ? { ...m, monto: montoTotalNum, activo: true } : m
        ));
    };

    const limpiarMontos = () => {
        setMontoPorCuenta({});
        setMetodosPago([{ id: 'efectivo', nombre: 'EFECTIVO', monto: 0, activo: true }]);
    };

    // Métodos de pago disponibles
    const metodosDisponibles = [
        { id: 'efectivo', nombre: 'EFECTIVO', icon: 'cash-outline' },
        { id: 'yape', nombre: 'Yape', icon: 'phone-portrait-outline' },
        { id: 'transferencia', nombre: 'Transferencia', icon: 'swap-horizontal-outline' },
    ];

    const handleAgregarMetodo = (metodo) => {
        const existe = metodosPago.find(m => m.id === metodo.id);
        if (!existe) {
            const montoFaltante = calcularFaltanteMetodosPago();

            // Eliminar métodos con monto 0 antes de agregar el nuevo
            const metodosFiltrados = metodosPago.filter(m => m.monto > 0);

            // Auto-asignar el faltante al nuevo método
            setMetodosPago([...metodosFiltrados, { ...metodo, monto: montoFaltante > 0 ? montoFaltante : 0, activo: true }]);
        }
    };

    const handleEliminarMetodo = (metodoId) => {
        if (metodosPago.length === 1) {
            // Si es el único método, resetear su monto a 0 para que aparezcan otros métodos
            setMetodosPago(prev => prev.map(m => ({ ...m, monto: 0, activo: false })));
        } else {
            // Si hay más métodos, eliminar este completamente
            setMetodosPago(metodosPago.filter(m => m.id !== metodoId));
        }
    };

    const handleCambiarMonto = (metodoId, nuevoMonto) => {
        const monto = parseFloat(nuevoMonto) || 0;
        setMetodosPago(metodosPago.map(m =>
            m.id === metodoId ? { ...m, monto, activo: monto > 0 } : m
        ));
    };

    const handleAbrirEditarMonto = (metodo) => {
        setMetodoEditando(metodo);
        setMontoTemporal(metodo.monto > 0 ? metodo.monto.toString() : '');
        setModalEditarMonto(true);
    };

    const handleGuardarMonto = () => {
        if (metodoEditando) {
            handleCambiarMonto(metodoEditando.id, montoTemporal);
        }
        setModalEditarMonto(false);
        setMetodoEditando(null);
        setMontoTemporal('');
    };

    const handleCancelarEdicion = () => {
        setModalEditarMonto(false);
        setMetodoEditando(null);
        setMontoTemporal('');
    };

    const calcularFaltanteMetodosPago = () => {
        const totalCobro = calcularTotalCobro();
        return totalCobro - calcularTotalMetodosPago();
    };

    const handleGuardarCobro = async () => {
        const totalCobro = calcularTotalCobro();
        if (totalCobro <= 0) {
            Alert.alert('Error', 'Ingresa al menos un monto válido para cobrar');
            return;
        }

        // Validar métodos de pago
        const totalMetodosPago = calcularTotalMetodosPago();
        if (totalMetodosPago !== totalCobro) {
            Alert.alert(
                'Error en métodos de pago',
                `El total de métodos de pago (S/ ${totalMetodosPago.toFixed(2)}) debe coincidir con el total a cobrar (S/ ${totalCobro.toFixed(2)})`
            );
            return;
        }

        for (const cuenta of cuentasActivas) {
            const monto = parseFloat(montoPorCuenta[cuenta.id]) || 0;
            if (monto > cuenta.saldo) {
                Alert.alert('Monto excesivo', `El abono para la cuenta #${cuenta.numeroCuenta || 1} (S/ ${monto.toFixed(2)}) no puede ser mayor a su deuda (S/ ${cuenta.saldo.toFixed(2)})`);
                return;
            }
        }

        // Construir descripción de métodos de pago
        const metodosPagoDesc = [];
        metodosPago.forEach(metodo => {
            if (metodo.monto > 0) {
                metodosPagoDesc.push(`${metodo.nombre}: S/ ${metodo.monto.toFixed(2)}`);
            }
        });
        const metodosPagoTexto = metodosPagoDesc.join(' | ');

        Alert.alert(
            'Confirmar cobro',
            `¿Confirmas el cobro de S/ ${totalCobro.toFixed(2)}?\n\n${metodosPagoTexto}`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Confirmar',
                    onPress: async () => {
                        setLoading(true);
                        try {
                            const fecha = new Date();
                            const fechaStr = `[${formatDate(fecha)}]`;
                            const descripcionFinal = comentario.trim()
                                ? `${comentario.trim()} ${fechaStr}`
                                : fechaStr;

                            // Preparar objeto de métodos de pago totales
                            const metodosPagoTotales = {
                                efectivo: 0,
                                yape: 0,
                                transferencia: 0
                            };

                            metodosPago.forEach(metodo => {
                                if (metodo.id === 'efectivo') {
                                    metodosPagoTotales.efectivo = metodo.monto;
                                } else if (metodo.id === 'yape') {
                                    metodosPagoTotales.yape = metodo.monto;
                                } else if (metodo.id === 'transferencia') {
                                    metodosPagoTotales.transferencia = metodo.monto;
                                }
                            });

                            for (const cuenta of cuentasActivas) {
                                const monto = parseFloat(montoPorCuenta[cuenta.id]) || 0;
                                if (monto > 0) {
                                    // Calcular la proporción de este abono respecto al total
                                    const proporcion = monto / totalCobro;

                                    // Distribuir los métodos de pago proporcionalmente
                                    const metodosPagoObj = {
                                        efectivo: metodosPagoTotales.efectivo * proporcion,
                                        yape: metodosPagoTotales.yape * proporcion,
                                        transferencia: metodosPagoTotales.transferencia * proporcion
                                    };

                                    await registrarMovimiento(cuenta.id, 'ABONO', monto, descripcionFinal, metodosPagoObj);
                                }
                            }
                            showToast('Cobro registrado exitosamente');
                            setTimeout(() => navigation.goBack(), 1500);
                        } catch (error) {
                            Alert.alert('Error', error.message);
                            setLoading(false);
                        }
                    }
                }
            ]
        );
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

    if (!clienta) return null;

    const totalDeuda = cuentasActivas.reduce((sum, c) => sum + c.saldo, 0);
    const totalCobro = calcularTotalCobro();
    const saldoRestante = totalDeuda - totalCobro;
    const porcentajePagado = totalDeuda > 0 ? Math.min((totalCobro / totalDeuda) * 100, 100) : 0;

    const ACCOUNT_COLORS = [
        { accent: '#29B6F6', light: '#E1F5FE', tag: '#0288D1' },
        { accent: '#AB47BC', light: '#F3E5F5', tag: '#7B1FA2' },
        { accent: '#FF7043', light: '#FBE9E7', tag: '#D84315' },
        { accent: '#26A69A', light: '#E0F2F1', tag: '#00796B' },
        { accent: '#EC407A', light: '#FCE4EC', tag: '#C2185B' },
    ];

    return (
        <View style={styles.container}>
            <Header title="Cobro" showBack />

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                {/* ── HERO: Cliente + deuda ── */}
                <View style={styles.heroCard}>
                    <View style={styles.heroLeft}>
                        <View style={styles.heroAvatar}>
                            <Ionicons name="person" size={20} color={colors.primary} />
                        </View>
                        <View>
                            <Text style={styles.heroName}>{clienta.nombre}</Text>
                            <View style={styles.heroBadgeRow}>
                                <Ionicons name="layers-outline" size={12} color={colors.textSecondary} />
                                <Text style={styles.heroBadgeText}>{cuentasActivas.length} cuenta{cuentasActivas.length !== 1 ? 's' : ''} activa{cuentasActivas.length !== 1 ? 's' : ''}</Text>
                            </View>
                        </View>
                    </View>
                    <View style={styles.heroRight}>
                        <Text style={styles.heroDeudaLabel}>Deuda total</Text>
                        <Text style={styles.heroDeudaMonto}>{formatCurrency(totalDeuda)}</Text>
                    </View>
                </View>

                <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                    {/* ── RESUMEN EN TIEMPO REAL ── */}
                    <View style={styles.resumenWrapper}>
                        {/* Barra de progreso */}
                        <View style={styles.progressContainer}>
                            <View style={styles.progressTrack}>
                                <View style={[styles.progressFill, { width: `${porcentajePagado}%` }]} />
                            </View>
                            <Text style={styles.progressLabel}>{porcentajePagado.toFixed(0)}% cubierto</Text>
                        </View>

                        <View style={styles.resumenRow}>
                            {/* Cobrar */}
                            <View style={styles.resumenBlock}>
                                {/* <View style={[styles.resumenIcon, { backgroundColor: '#E8F5E9' }]}>
                                    <Ionicons name="cash-outline" size={18} color="#43A047" />
                                </View> */}
                                <Text style={styles.resumenBlockLabel}>A cobrar</Text>
                                <Text style={[styles.resumenBlockMonto, { color: '#43A047' }]}>{formatCurrency(totalCobro)}</Text>
                            </View>

                            <View style={styles.resumenSeparador} />

                            {/* Pendiente */}
                            <View style={styles.resumenBlock}>
                                {/* <View style={[styles.resumenIcon, { backgroundColor: '#FFF3E0' }]}>
                                    <Ionicons name="hourglass-outline" size={18} color="#FB8C00" />
                                </View> */}
                                <Text style={styles.resumenBlockLabel}>Pendiente</Text>
                                <Text style={[styles.resumenBlockMonto, { color: '#FB8C00' }]}>{formatCurrency(saldoRestante)}</Text>
                            </View>
                        </View>
                    </View>



                    {/* ── CUENTAS ACTIVAS ── */}
                    <View style={styles.seccion}>
                        <View style={styles.seccionTituloRow}>
                            {/* <Ionicons name="card-outline" size={15} color={colors.primary} /> */}
                            <Text style={styles.seccionTitulo}>Cuentas activas</Text>
                            <TouchableOpacity style={styles.limpiarBtn} onPress={limpiarMontos} activeOpacity={0.7}>
                                <Ionicons name="refresh-outline" size={13} color={colors.textSecondary} />
                                <Text style={styles.limpiarBtnText}>Limpiar</Text>
                            </TouchableOpacity>
                        </View>

                        {cuentasActivas.map((cuenta, index) => {
                            const numeroCuenta = cuenta.numeroCuenta || (index + 1);
                            const palette = ACCOUNT_COLORS[(numeroCuenta - 1) % ACCOUNT_COLORS.length];
                            const montoActual = montoPorCuenta[cuenta.id] || '';
                            const montoNum = parseFloat(montoActual) || 0;
                            const cuentaPct = cuenta.saldo > 0 ? Math.min((montoNum / cuenta.saldo) * 100, 100) : 0;

                            return (
                                <View key={cuenta.id} style={[styles.cuentaCard, { borderTopColor: palette.accent }]}>
                                    {/* Cabecera cuenta */}
                                    <View style={styles.cuentaCabecera}>
                                        <View style={[styles.cuentaTag, { backgroundColor: palette.light, borderColor: palette.accent }]}>
                                            {/* <Ionicons name="receipt-outline" size={12} color={palette.tag} /> */}
                                            <Text style={[styles.cuentaTagText, { color: palette.tag }]}>Cuenta #{numeroCuenta}</Text>
                                        </View>
                                        <View style={styles.cuentaFechaWrapper}>
                                            <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} />
                                            <Text style={styles.cuentaFecha}>{formatDate(cuenta.fechaCreacion)}</Text>
                                        </View>
                                    </View>

                                    {/* Deuda + mini barra */}
                                    <View style={styles.cuentaDeudaRow}>
                                        <View>
                                            <Text style={styles.cuentaDeudaLabel}>Deuda</Text>
                                            <Text style={[styles.cuentaDeudaMonto, { color: palette.accent }]}>{formatCurrency(cuenta.saldo)}</Text>
                                        </View>
                                        <View style={styles.cuentaMiniBar}>
                                            <View style={styles.cuentaMiniBarTrack}>
                                                <View style={[styles.cuentaMiniBarFill, { width: `${cuentaPct}%`, backgroundColor: palette.accent }]} />
                                            </View>
                                            <Text style={[styles.cuentaMiniBarPct, { color: palette.accent }]}>{cuentaPct.toFixed(0)}%</Text>
                                        </View>
                                    </View>

                                    {/* Input cobro */}
                                    <View style={styles.cuentaInputRow}>
                                        <View style={[styles.cuentaInputWrapper, { borderColor: montoNum > 0 ? palette.accent : colors.border }]}>
                                            {/* <View style={styles.cuentaInputIconBg}>
                                                <Ionicons name="cash" size={16} color={montoNum > 0 ? palette.accent : colors.textSecondary} />
                                            </View> */}
                                            <Text style={[styles.cuentaInputCurrency, { color: montoNum > 0 ? palette.accent : colors.textSecondary }]}>S/</Text>
                                            <TextInput
                                                style={[styles.cuentaInput, { color: montoNum > 0 ? colors.text : colors.textSecondary }]}
                                                value={montoActual}
                                                onChangeText={(v) => actualizarMontoCuenta(cuenta.id, v)}
                                                placeholder="0.00"
                                                placeholderTextColor={colors.textSecondary}
                                                keyboardType="decimal-pad"
                                            />
                                        </View>
                                        <TouchableOpacity
                                            style={[styles.botonTotal, { backgroundColor: palette.accent }]}
                                            onPress={() => aplicarMontoCompleto(cuenta.id, cuenta.saldo)}
                                            activeOpacity={0.8}
                                        >
                                            <Ionicons name="checkmark-done" size={14} color="#FFF" />
                                            <Text style={styles.botonTotalText}>Total</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        })}
                    </View>

                    {/* ── MÉTODOS DE PAGO ── */}
                    <View style={styles.seccion}>
                        <View style={styles.seccionHeader}>
                            <View style={styles.seccionTituloRow}>
                                {/* <Ionicons name="wallet-outline" size={16} color={colors.primary} /> */}
                                <Text style={styles.seccionTitulo}>Métodos de pago</Text>
                            </View>
                            <Text style={styles.seccionSubtitulo}>Especifica cómo se realizó el pago</Text>
                        </View>

                        {/* Métodos de pago activos */}
                        <View style={styles.metodosPagoCard}>
                            {metodosPago.map((metodo, index) => (
                                <View key={metodo.id}>
                                    <View style={styles.metodoPagoRow}>
                                        <View style={styles.metodoPagoLeft}>
                                            <View style={[
                                                styles.metodoPagoIcono,
                                                metodo.id === 'efectivo' && { backgroundColor: '#E8F5E9' },
                                                metodo.id === 'yape' && { backgroundColor: '#F3E5F5' },
                                                metodo.id === 'transferencia' && { backgroundColor: '#E3F2FD' }
                                            ]}>
                                                <Ionicons
                                                    name={
                                                        metodo.id === 'efectivo' ? 'cash' :
                                                            metodo.id === 'yape' ? 'phone-portrait' :
                                                                'swap-horizontal'
                                                    }
                                                    size={22}
                                                    color={
                                                        metodo.id === 'efectivo' ? '#43A047' :
                                                            metodo.id === 'yape' ? '#9C27B0' :
                                                                '#1976D2'
                                                    }
                                                />
                                            </View>
                                            <View style={styles.metodoPagoInfo}>
                                                <Text style={styles.metodoPagoNombre}>{metodo.nombre}</Text>
                                            </View>
                                        </View>
                                        <View style={styles.metodoPagoRight}>
                                            <View style={[
                                                styles.metodoPagoInputContainer,
                                                metodo.monto > 0 && metodo.id === 'efectivo' && { borderColor: '#43A047', backgroundColor: '#F1F8F4' },
                                                metodo.monto > 0 && metodo.id === 'yape' && { borderColor: '#9C27B0', backgroundColor: '#F9F5FA' },
                                                metodo.monto > 0 && metodo.id === 'transferencia' && { borderColor: '#1976D2', backgroundColor: '#F1F6FB' }
                                            ]}>
                                                <Text style={[
                                                    styles.metodoPagoMontoLabel,
                                                    metodo.monto > 0 && metodo.id === 'efectivo' && { color: '#43A047' },
                                                    metodo.monto > 0 && metodo.id === 'yape' && { color: '#9C27B0' },
                                                    metodo.monto > 0 && metodo.id === 'transferencia' && { color: '#1976D2' }
                                                ]}>S/</Text>
                                                <Text style={[
                                                    styles.metodoPagoMontoTexto,
                                                    metodo.monto > 0 && metodo.id === 'efectivo' && { color: '#43A047' },
                                                    metodo.monto > 0 && metodo.id === 'yape' && { color: '#9C27B0' },
                                                    metodo.monto > 0 && metodo.id === 'transferencia' && { color: '#1976D2' }
                                                ]}>
                                                    {metodo.monto > 0 ? metodo.monto.toFixed(2) : '0.00'}
                                                </Text>
                                            </View>
                                            <TouchableOpacity
                                                style={styles.editBtn}
                                                onPress={() => handleAbrirEditarMonto(metodo)}
                                                activeOpacity={0.7}
                                            >
                                                <Ionicons name="create-outline" size={20} color={colors.primary} />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={styles.deleteBtn}
                                                onPress={() => handleEliminarMetodo(metodo.id)}
                                                activeOpacity={0.7}
                                            >
                                                <Ionicons name="trash-outline" size={20} color="#EF5350" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                    {index < metodosPago.length - 1 && <View style={styles.metodoPagoDivider} />}
                                </View>
                            ))}

                            {/* Resumen de métodos de pago */}
                            {totalCobro > 0 && (
                                <>
                                    <View style={styles.metodoPagoDivider} />
                                    <View style={styles.resumenMetodosPago}>
                                        <View style={styles.resumenMetodosRow}>
                                            <Text style={styles.resumenMetodosLabel}>Total a cobrar:</Text>
                                            <Text style={styles.resumenMetodosMonto}>{formatCurrency(totalCobro)}</Text>
                                        </View>
                                        <View style={styles.resumenMetodosRow}>
                                            <Text style={styles.resumenMetodosLabel}>Total ingresado:</Text>
                                            <Text style={[
                                                styles.resumenMetodosMonto,
                                                { color: calcularTotalMetodosPago() === totalCobro ? '#43A047' : '#EF5350' }
                                            ]}>
                                                {formatCurrency(calcularTotalMetodosPago())}
                                            </Text>
                                        </View>

                                        {calcularTotalMetodosPago() !== totalCobro && (
                                            <View style={styles.resumenMetodosRow}>
                                                <Text style={[styles.resumenMetodosLabel, { color: '#EF5350' }]}>
                                                    {calcularTotalMetodosPago() > totalCobro ? 'Excedente:' : 'Faltante:'}
                                                </Text>
                                                <Text style={[styles.resumenMetodosMonto, { color: '#EF5350' }]}>
                                                    {formatCurrency(Math.abs(totalCobro - calcularTotalMetodosPago()))}
                                                </Text>
                                            </View>
                                        )}

                                        {/* Indicador de estado */}
                                        <View style={[
                                            styles.estadoMetodosPago,
                                            calcularTotalMetodosPago() === totalCobro ? styles.estadoMetodosOk : styles.estadoMetodosError
                                        ]}>
                                            <Ionicons
                                                name={calcularTotalMetodosPago() === totalCobro ? "checkmark-circle" : "alert-circle"}
                                                size={18}
                                                color={calcularTotalMetodosPago() === totalCobro ? "#43A047" : "#EF5350"}
                                            />
                                            <Text style={[
                                                styles.estadoMetodosTexto,
                                                { color: calcularTotalMetodosPago() === totalCobro ? "#43A047" : "#EF5350" }
                                            ]}>
                                                {calcularTotalMetodosPago() === totalCobro
                                                    ? "Los montos coinciden correctamente"
                                                    : calcularTotalMetodosPago() > totalCobro
                                                        ? "El total ingresado supera el monto a cobrar"
                                                        : "Completa el total con los métodos de pago"}
                                            </Text>
                                        </View>
                                    </View>
                                </>
                            )}
                        </View>

                        {/* Métodos de pago disponibles - solo mostrar cuando realmente hay faltante */}
                        {totalCobro > 0 && calcularFaltanteMetodosPago() > 0 && (
                            <View style={styles.metodosDisponiblesContainer}>
                                <Text style={styles.metodosDisponiblesLabel}>
                                    Agregar otro método de pago
                                </Text>
                                <View style={styles.metodosGrid}>
                                    {metodosDisponibles.map((metodo) => {
                                        const yaAgregado = metodosPago.find(m => m.id === metodo.id);
                                        const estaDeshabilitado = yaAgregado ? true : false;
                                        return (
                                            <TouchableOpacity
                                                key={metodo.id}
                                                style={[
                                                    styles.metodoBtn,
                                                    yaAgregado && styles.metodoBtnActivo
                                                ]}
                                                onPress={() => handleAgregarMetodo(metodo)}
                                                activeOpacity={0.7}
                                                disabled={estaDeshabilitado}
                                            >
                                                <Ionicons
                                                    name={metodo.icon}
                                                    size={28}
                                                    color={yaAgregado ? colors.textSecondary : colors.primary}
                                                />
                                                <Text style={[
                                                    styles.metodoBtnTexto,
                                                    yaAgregado && styles.metodoBtnTextoActivo
                                                ]}>
                                                    {metodo.nombre}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        )}
                    </View>

                    {/* ── NOTA OPCIONAL ── */}
                    <View style={styles.seccion}>
                        <View style={styles.seccionTituloRow}>
                            <Ionicons name="create-outline" size={15} color={colors.primary} />
                            <Text style={styles.seccionTitulo}>Nota opcional</Text>
                        </View>
                        <View style={styles.notaCard}>
                            <TextInput
                                style={styles.notaInput}
                                value={comentario}
                                onChangeText={setComentario}
                                placeholder="Ej: Pago parcial, abono semanal, efectivo..."
                                placeholderTextColor={colors.textSecondary}
                                multiline
                            />
                        </View>
                    </View>

                    {/* ── HISTORIAL ── */}
                    <View style={styles.seccion}>
                        <TouchableOpacity
                            style={styles.historialToggle}
                            onPress={() => setMostrarHistorial(!mostrarHistorial)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.historialToggleLeft}>
                                <View style={styles.historialToggleIcon}>
                                    <Ionicons name="time-outline" size={16} color={colors.primary} />
                                </View>
                                <Text style={styles.historialToggleTitle}>Historial de pagos</Text>
                                <View style={styles.historialBadge}>
                                    <Text style={styles.historialBadgeText}>{historialAbonos.length}</Text>
                                </View>
                            </View>
                            <Ionicons name={mostrarHistorial ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
                        </TouchableOpacity>

                        {mostrarHistorial && (
                            <View style={styles.historialLista}>
                                {historialAbonos.length > 0 ? historialAbonos.map((abono) => {
                                    const fechaAbono = parsearFechaAbono(abono.comentario);
                                    const descripcion = extraerDescripcionAbono(abono.comentario);
                                    const tieneMetodosPago = abono.metodosPago && (abono.metodosPago.efectivo > 0 || abono.metodosPago.yape > 0 || abono.metodosPago.transferencia > 0);

                                    return (
                                        <View key={abono.id} style={styles.historialItem}>
                                            <View style={styles.historialItemDot} />
                                            <View style={styles.historialItemIcono}>
                                                <Ionicons name="arrow-down-circle" size={22} color="#43A047" />
                                            </View>
                                            <View style={styles.historialItemInfo}>
                                                <View style={styles.historialItemRow}>
                                                    <View style={styles.historialCuentaTag}>
                                                        <Text style={styles.historialCuentaTagText}>#{abono.cuentaNumero}</Text>
                                                    </View>
                                                    <Text style={styles.historialMonto}>{formatCurrency(abono.monto)}</Text>
                                                </View>
                                                <Text style={styles.historialFecha}>{fechaAbono || formatDate(abono.fecha)}</Text>
                                                {!!descripcion && <Text style={styles.historialDescripcion}>{descripcion}</Text>}

                                                {/* Métodos de pago */}
                                                {tieneMetodosPago && (
                                                    <View style={styles.historialMetodosPagoContainer}>
                                                        <Text style={styles.historialMetodosPagoLabel}>Pagado con:</Text>
                                                        <View style={styles.historialMetodosPago}>
                                                            {abono.metodosPago.efectivo > 0 && (
                                                                <View style={[styles.historialMetodoChip, { backgroundColor: '#E8F5E9', borderColor: '#43A047' }]}>
                                                                    <Ionicons name="cash" size={11} color="#43A047" />
                                                                    <Text style={[styles.historialMetodoChipText, { color: '#43A047' }]}>
                                                                        {formatCurrency(abono.metodosPago.efectivo)}
                                                                    </Text>
                                                                </View>
                                                            )}
                                                            {abono.metodosPago.yape > 0 && (
                                                                <View style={[styles.historialMetodoChip, { backgroundColor: '#F3E5F5', borderColor: '#9C27B0' }]}>
                                                                    <Ionicons name="phone-portrait" size={11} color="#9C27B0" />
                                                                    <Text style={[styles.historialMetodoChipText, { color: '#9C27B0' }]}>
                                                                        {formatCurrency(abono.metodosPago.yape)}
                                                                    </Text>
                                                                </View>
                                                            )}
                                                            {abono.metodosPago.transferencia > 0 && (
                                                                <View style={[styles.historialMetodoChip, { backgroundColor: '#E3F2FD', borderColor: '#1976D2' }]}>
                                                                    <Ionicons name="swap-horizontal" size={11} color="#1976D2" />
                                                                    <Text style={[styles.historialMetodoChipText, { color: '#1976D2' }]}>
                                                                        {formatCurrency(abono.metodosPago.transferencia)}
                                                                    </Text>
                                                                </View>
                                                            )}
                                                        </View>
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                    );
                                }) : (
                                    <View style={styles.historialVacio}>
                                        <Ionicons name="receipt-outline" size={36} color={colors.textSecondary} />
                                        <Text style={styles.historialVacioText}>Sin pagos registrados aún</Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </View>

                    <View style={{ height: 24 }} />
                </ScrollView >
            </KeyboardAvoidingView >

            <Toast visible={toastVisible} message={toastMessage} onHide={() => setToastVisible(false)} />

            {/* Modal para editar monto */}
            <Modal
                visible={modalEditarMonto}
                transparent={true}
                animationType="fade"
                onRequestClose={handleCancelarEdicion}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            Editar monto - {metodoEditando?.nombre}
                        </Text>
                        <View style={styles.modalInputContainer}>
                            <Text style={styles.modalMonedaSymbol}>S/</Text>
                            <TextInput
                                style={styles.modalInput}
                                value={montoTemporal}
                                onChangeText={setMontoTemporal}
                                keyboardType="decimal-pad"
                                placeholder="0.00"
                                placeholderTextColor={colors.textSecondary}
                                autoFocus
                            />
                        </View>
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.modalBtnCancelar}
                                onPress={handleCancelarEdicion}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.modalBtnCancelarTexto}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalBtnGuardar}
                                onPress={handleGuardarMonto}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.modalBtnGuardarTexto}>Guardar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Botón FUERA del KeyboardAvoidingView - El teclado lo tapará */}
            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                <TouchableOpacity
                    style={[styles.ctaButton, (loading || totalCobro <= 0) && styles.ctaDisabled]}
                    onPress={handleGuardarCobro}
                    activeOpacity={0.85}
                    disabled={loading || totalCobro <= 0}
                >
                    <View style={styles.ctaLeft}>
                        <View style={styles.ctaIconCircle}>
                            <Ionicons name="checkmark-circle" size={22} color={totalCobro > 0 ? '#43A047' : colors.textSecondary} />
                        </View>
                        <View>
                            <Text style={styles.ctaLabel}>Registrar cobro</Text>
                            <Text style={styles.ctaMonto}>{formatCurrency(totalCobro)}</Text>
                        </View>
                    </View>
                    <View style={styles.ctaArrow}>
                        <Ionicons name="arrow-forward" size={18} color="#FFF" />
                    </View>
                </TouchableOpacity>
            </View>
        </View >
    );
}

const createStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    // ── HERO ──
    heroCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.card,
        paddingHorizontal: 18,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    heroLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    heroAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: colors.primary,
    },
    heroName: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 3 },
    heroBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    heroBadgeText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
    heroRight: { alignItems: 'flex-end' },
    heroDeudaLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
    heroDeudaMonto: { fontSize: 20, fontWeight: '800', color: '#EF5350', letterSpacing: -0.5 },

    // ── SCROLL ──
    scrollArea: { flex: 1 },
    scrollContent: { paddingHorizontal: 16, paddingTop: 16 },

    // ── RESUMEN ──
    resumenWrapper: {
        backgroundColor: colors.card,
        borderRadius: 14,
        padding: 10,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    progressContainer: { marginBottom: 16 },
    progressTrack: {
        height: 6,
        backgroundColor: colors.border,
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 5,
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#43A047',
        borderRadius: 3,
    },
    progressLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '600', textAlign: 'right' },
    resumenRow: { flexDirection: 'row', alignItems: 'center' },
    resumenBlock: { flex: 1, alignItems: 'center' },
    resumenIcon: {
        width: 30,
        height: 30,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 5,
    },
    resumenBlockLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 },
    resumenBlockMonto: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
    resumenSeparador: { width: 1, height: 52, backgroundColor: colors.border, marginHorizontal: 8 },

    // ── SECCIONES ──
    seccion: { marginBottom: 20 },
    seccionHeader: { marginBottom: 12 },
    seccionTituloRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    seccionTitulo: { fontSize: 15, fontWeight: '700', color: colors.text, letterSpacing: 0.1 },
    seccionSubtitulo: { fontSize: 12, color: colors.textSecondary, fontWeight: '500', marginLeft: 22 },

    // ── DISTRIBUCIÓN ──
    distribuirCard: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: colors.border,
    },
    distribuirHint: { fontSize: 12, color: colors.textSecondary, marginBottom: 12, lineHeight: 17 },
    distribuirRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
    distribuirInputWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceVariant,
        borderRadius: 10,
        paddingHorizontal: 12,
        borderWidth: 1.5,
        borderColor: colors.border,
    },
    distribuirCurrency: { fontSize: 17, fontWeight: '700', color: colors.text, marginRight: 6 },
    distribuirInput: { flex: 1, fontSize: 20, fontWeight: '700', color: colors.text, paddingVertical: 11 },
    botonDistribuir: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 10,
    },
    botonDistribuirTexto: { fontSize: 13, fontWeight: '700', color: '#FFF' },

    // ── LIMPIAR BTN ──
    limpiarBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 4,
        backgroundColor: colors.surfaceVariant,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.border,
    },
    limpiarBtnText: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },

    // ── CUENTAS ──
    cuentaCard: {
        backgroundColor: colors.card,
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: colors.border,
        borderTopWidth: 3,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    cuentaCabecera: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    cuentaTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        borderWidth: 1,
    },
    cuentaTagText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
    cuentaFechaWrapper: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    cuentaFecha: { fontSize: 11, color: colors.textSecondary, fontWeight: '500' },

    cuentaDeudaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    cuentaDeudaLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '600', marginBottom: 2 },
    cuentaDeudaMonto: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },

    cuentaMiniBar: { flex: 1, marginLeft: 20, alignItems: 'flex-end' },
    cuentaMiniBarTrack: {
        width: '100%',
        height: 5,
        backgroundColor: colors.border,
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 4,
    },
    cuentaMiniBarFill: { height: '100%', borderRadius: 3 },
    cuentaMiniBarPct: { fontSize: 12, fontWeight: '700' },

    cuentaInputRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
    cuentaInputWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceVariant,
        borderRadius: 10,
        paddingHorizontal: 10,
        borderWidth: 1.5,
        gap: 6,
    },
    cuentaInputIconBg: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cuentaInputCurrency: { fontSize: 16, fontWeight: '700' },
    cuentaInput: { flex: 1, fontSize: 18, fontWeight: '700', paddingVertical: 10 },
    botonTotal: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 10,
    },
    botonTotalText: { fontSize: 13, fontWeight: '700', color: '#FFF' },

    // ── NOTA ──
    notaCard: {
        backgroundColor: colors.card,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 14,
        paddingVertical: 4,
    },
    notaInput: {
        fontSize: 14,
        color: colors.text,
        minHeight: 72,
        textAlignVertical: 'top',
        paddingVertical: 12,
        fontWeight: '500',
        lineHeight: 20,
    },

    // ── MÉTODOS DE PAGO ──
    metodosPagoCard: {
        backgroundColor: colors.card,
        borderRadius: 14,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    metodoPagoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 4,
    },
    metodoPagoLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    metodoPagoIcono: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    metodoPagoInfo: {
        flex: 1,
    },
    metodoPagoNombre: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text,
    },
    metodoPagoDesc: {
        fontSize: 11,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    metodoPagoRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    metodoPagoInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceVariant,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 2,
        borderColor: colors.border,
        minWidth: 110,
    },
    metodoPagoMontoLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.textSecondary,
        marginRight: 4,
    },
    metodoPagoMontoTexto: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
        minWidth: 60,
        textAlign: 'right',
    },
    editBtn: {
        padding: 4,
    },
    deleteBtn: {
        padding: 4,
    },
    metodoPagoDivider: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: 14,
    },
    resumenMetodosPago: {
        backgroundColor: colors.surfaceVariant,
        borderRadius: 10,
        padding: 12,
        gap: 8,
    },
    resumenMetodosRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    resumenMetodosLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    resumenMetodosMonto: {
        fontSize: 16,
        fontWeight: '800',
        color: colors.text,
    },
    estadoMetodosPago: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 4,
        padding: 10,
        borderRadius: 8,
    },
    estadoMetodosOk: {
        backgroundColor: '#E8F5E9',
    },
    estadoMetodosError: {
        backgroundColor: '#FFEBEE',
    },
    estadoMetodosTexto: {
        flex: 1,
        fontSize: 12,
        fontWeight: '600',
        lineHeight: 16,
    },

    // ── MÉTODOS DISPONIBLES ──
    metodosDisponiblesContainer: {
        marginTop: 16,
    },
    metodosDisponiblesLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 12,
    },
    metodosGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    metodoBtn: {
        width: '48%',
        aspectRatio: 2,
        backgroundColor: colors.card,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
        borderWidth: 2,
        borderColor: colors.border,
    },
    metodoBtnActivo: {
        borderColor: colors.border,
        backgroundColor: colors.surfaceVariant,
        opacity: 0.5,
    },
    metodoBtnTexto: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.text,
        textAlign: 'center',
    },
    metodoBtnTextoActivo: {
        color: colors.textSecondary,
    },

    // ── MODAL ──
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    modalContent: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 20,
        textAlign: 'center',
    },
    modalInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceVariant,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 20,
        borderWidth: 2,
        borderColor: colors.primary,
    },
    modalMonedaSymbol: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.primary,
        marginRight: 8,
    },
    modalInput: {
        flex: 1,
        fontSize: 24,
        fontWeight: '700',
        color: colors.text,
        padding: 0,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    modalBtnCancelar: {
        flex: 1,
        backgroundColor: colors.surfaceVariant,
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    modalBtnCancelarTexto: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    modalBtnGuardar: {
        flex: 1,
        backgroundColor: colors.primary,
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: 'center',
    },
    modalBtnGuardarTexto: {
        fontSize: 15,
        fontWeight: '600',
        color: '#FFF',
    },

    // ── HISTORIAL ──
    historialToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.card,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    historialToggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    historialToggleIcon: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: colors.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    historialToggleTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
    historialBadge: {
        backgroundColor: colors.primary,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    historialBadgeText: { fontSize: 11, fontWeight: '800', color: '#FFF' },

    historialLista: {
        backgroundColor: colors.card,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
        borderTopWidth: 0,
        overflow: 'hidden',
        marginTop: -1,
    },
    historialItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        gap: 12,
    },
    historialItemDot: {
        position: 'absolute',
        left: 34,
        top: 0,
        bottom: 0,
        width: 1,
        backgroundColor: colors.border,
    },
    historialItemIcono: { zIndex: 1 },
    historialItemInfo: { flex: 1 },
    historialItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    historialCuentaTag: {
        backgroundColor: colors.primaryLight,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    historialCuentaTagText: { fontSize: 11, fontWeight: '700', color: colors.primary },
    historialMonto: { fontSize: 15, fontWeight: '800', color: '#43A047' },
    historialFecha: { fontSize: 11, color: colors.textSecondary, fontWeight: '500', marginBottom: 2 },
    historialDescripcion: { fontSize: 12, color: colors.textSecondary, fontStyle: 'italic', marginBottom: 6 },
    historialMetodosPagoContainer: {
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    historialMetodosPagoLabel: {
        fontSize: 10,
        color: colors.textSecondary,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 6,
    },
    historialMetodosPago: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    historialMetodoChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
    },
    historialMetodoChipText: {
        fontSize: 11,
        fontWeight: '700',
    },
    historialVacio: {
        alignItems: 'center',
        paddingVertical: 32,
        gap: 8,
    },
    historialVacioText: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },

    // ── FOOTER ──
    footer: {
        backgroundColor: colors.card,
        paddingHorizontal: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    ctaButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#43A047',
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 16,
        shadowColor: '#43A047',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    ctaDisabled: { backgroundColor: colors.border, shadowOpacity: 0 },
    ctaLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    ctaIconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.18)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    ctaLabel: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 },
    ctaMonto: { fontSize: 22, fontWeight: '800', color: '#FFF', letterSpacing: -0.4 },
    ctaArrow: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.18)',
        justifyContent: 'center',
        alignItems: 'center',
    },
});