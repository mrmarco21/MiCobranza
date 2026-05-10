import { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../shared/hooks/useTheme';
import { formatCurrency } from '../../shared/utils/helpers';
import Header from '../../shared/components/Header';
import { obtenerMovimientosDiarios, calcularResumenDiario } from '../../logic/movimientosDiarioService';

export default function MovimientosDiariosScreen({ navigation }) {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const [movimientos, setMovimientos] = useState([]);
    const [resumen, setResumen] = useState(null);
    const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [loading, setLoading] = useState(false);
    const [categoriaFiltro, setCategoriaFiltro] = useState('TODOS');

    useFocusEffect(
        useCallback(() => {
            cargarMovimientos();
        }, [fechaSeleccionada])
    );

    const cargarMovimientos = async () => {
        setLoading(true);
        try {
            const movs = await obtenerMovimientosDiarios(fechaSeleccionada);
            const res = calcularResumenDiario(movs);
            setMovimientos(movs);
            setResumen(res);
        } catch (error) {
            console.error('Error al cargar movimientos:', error);
        } finally {
            setLoading(false);
        }
    };

    const onChangeFecha = (event, selectedDate) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selectedDate) {
            setFechaSeleccionada(selectedDate);
        }
    };

    const esHoy = () => {
        const hoy = new Date();
        return (
            fechaSeleccionada.getDate() === hoy.getDate() &&
            fechaSeleccionada.getMonth() === hoy.getMonth() &&
            fechaSeleccionada.getFullYear() === hoy.getFullYear()
        );
    };

    const cambiarDia = (dias) => {
        const nuevaFecha = new Date(fechaSeleccionada);
        nuevaFecha.setDate(nuevaFecha.getDate() + dias);
        setFechaSeleccionada(nuevaFecha);
    };

    const getCategoriaLabel = (categoria) => {
        switch (categoria) {
            case 'VENTA_CONTADO': return 'Venta de contado';
            case 'VENTA_PARCIAL': return 'Venta parcial';
            case 'COBRO_DEUDA': return 'Cobro de deuda';
            case 'GASTO': return 'Gasto';
            default: return categoria;
        }
    };

    const getCategoriaIcon = (categoria) => {
        switch (categoria) {
            case 'VENTA_CONTADO': return 'cart';
            case 'VENTA_PARCIAL': return 'card';
            case 'COBRO_DEUDA': return 'cash';
            case 'GASTO': return 'trending-down';
            default: return 'ellipse';
        }
    };

    const getCategoriaColor = (categoria) => {
        switch (categoria) {
            case 'VENTA_CONTADO': return '#10B981';
            case 'VENTA_PARCIAL': return '#3B82F6';
            case 'COBRO_DEUDA': return '#F59E0B';
            case 'GASTO': return '#EF4444';
            default: return '#94A3B8';
        }
    };

    const getCategoriaColorLight = (categoria) => {
        switch (categoria) {
            case 'VENTA_CONTADO': return '#D1FAE5';
            case 'VENTA_PARCIAL': return '#DBEAFE';
            case 'COBRO_DEUDA': return '#FEF3C7';
            case 'GASTO': return '#FEE2E2';
            default: return '#F1F5F9';
        }
    };

    const getMetodoPagoIcon = (metodo) => {
        if (!metodo) return 'cash';
        const metodoCaps = metodo.toUpperCase();
        if (metodoCaps.includes('YAPE')) return 'phone-portrait';
        if (metodoCaps.includes('TRANSFER') || metodoCaps.includes('DEPOSIT')) return 'card';
        return 'cash';
    };

    const FILTROS_CATEGORIA = [
        { id: 'TODOS', label: 'Todos', icon: 'grid-outline' },
        { id: 'VENTA_CONTADO', label: 'Ventas', icon: 'cart-outline' },
        { id: 'COBRO_DEUDA', label: 'Cobros', icon: 'cash-outline' },
        { id: 'GASTO', label: 'Gastos', icon: 'trending-down-outline' },
    ];

    const movimientosFiltrados = categoriaFiltro === 'TODOS'
        ? movimientos
        : movimientos.filter(m => {
            if (categoriaFiltro === 'VENTA_CONTADO') {
                return m.categoria === 'VENTA_CONTADO' || m.categoria === 'VENTA_PARCIAL';
            }
            return m.categoria === categoriaFiltro;
        });

    const renderMovimiento = (mov) => {
        const esIngreso = mov.tipo === 'INGRESO';
        const color = getCategoriaColor(mov.categoria);
        const colorLight = getCategoriaColorLight(mov.categoria);
        const icon = getCategoriaIcon(mov.categoria);

        return (
            <View key={mov.id} style={styles.movimientoCard}>
                <View style={[styles.movimientoIcono, { backgroundColor: colorLight }]}>
                    <Ionicons name={icon} size={20} color={color} />
                </View>

                <View style={styles.movimientoInfo}>
                    <View style={styles.movimientoHeader}>
                        <View style={styles.movimientoHeaderLeft}>
                            <Text style={styles.movimientoCategoria}>
                                {getCategoriaLabel(mov.categoria)}
                            </Text>
                            {mov.clienteNombre && (
                                <View style={styles.clienteBadge}>
                                    <Ionicons name="person" size={10} color={colors.textSecondary} />
                                    <Text style={styles.clienteBadgeText}>{mov.clienteNombre}</Text>
                                </View>
                            )}
                        </View>
                        <Text style={[
                            styles.movimientoMonto,
                            esIngreso ? styles.montoIngreso : styles.montoEgreso
                        ]}>
                            {esIngreso ? '+' : '-'} {formatCurrency(mov.monto)}
                        </Text>
                    </View>

                    <Text style={styles.movimientoDescripcion} numberOfLines={1}>
                        {mov.descripcion}
                    </Text>

                    <View style={styles.movimientoFooter}>
                        <View style={styles.movimientoMetodo}>
                            <Ionicons name={getMetodoPagoIcon(mov.metodoPago)} size={12} color={colors.textSecondary} />
                            <Text style={styles.movimientoMetodoText}>{mov.metodoPago}</Text>
                        </View>
                        <Text style={styles.movimientoHora}>
                            {new Date(mov.fecha).toLocaleTimeString('es-PE', {
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <Header title="Movimientos del Día" showBack />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Cargando movimientos...</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Header title="Movimientos del Día" showBack />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 20, 20) }}
                showsVerticalScrollIndicator={false}
            >
                {/* Selector de fecha */}
                <View style={styles.fechaContainer}>
                    <TouchableOpacity
                        style={styles.fechaBtn}
                        onPress={() => cambiarDia(-1)}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="chevron-back" size={22} color={colors.text} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.fechaDisplay}
                        onPress={() => setShowDatePicker(true)}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                        <View style={styles.fechaTextos}>
                            <Text style={styles.fechaPrincipal}>
                                {esHoy() ? 'Hoy' : fechaSeleccionada.toLocaleDateString('es-PE', {
                                    day: 'numeric',
                                    month: 'short'
                                })}
                            </Text>
                            <Text style={styles.fechaSecundaria}>
                                {fechaSeleccionada.toLocaleDateString('es-PE', { weekday: 'long' })}
                            </Text>
                        </View>
                        <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.fechaBtn, esHoy() && styles.fechaBtnDisabled]}
                        onPress={() => cambiarDia(1)}
                        disabled={esHoy()}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name="chevron-forward"
                            size={22}
                            color={esHoy() ? colors.border : colors.text}
                        />
                    </TouchableOpacity>
                </View>

                {showDatePicker && (
                    <DateTimePicker
                        value={fechaSeleccionada}
                        mode="date"
                        display="default"
                        onChange={onChangeFecha}
                        maximumDate={new Date()}
                    />
                )}

                {/* Card de resumen principal */}
                {resumen && (
                    <View style={styles.resumenPrincipal}>
                        <View style={styles.resumenHeader}>
                            <View style={styles.resumenIconContainer}>
                                <Ionicons name="wallet" size={24} color="#FFFFFF" />
                            </View>
                            <View style={styles.resumenHeaderInfo}>
                                <Text style={styles.resumenLabel}>Balance del Día</Text>
                                <Text style={styles.resumenSubtitle}>
                                    {movimientos.length} movimiento{movimientos.length !== 1 ? 's' : ''}
                                </Text>
                            </View>
                        </View>

                        <Text style={[
                            styles.saldoNetoMonto,
                            { color: resumen.saldoNeto >= 0 ? '#FFFFFF' : '#FEE2E2' }
                        ]}>
                            {formatCurrency(Math.abs(resumen.saldoNeto))}
                        </Text>

                        <View style={styles.resumenDivisor} />

                        <View style={styles.resumenGrid}>
                            <View style={styles.resumenGridItem}>
                                <View style={styles.resumenGridIcono}>
                                    <Ionicons name="arrow-up" size={16} color="#10B981" />
                                </View>
                                <Text style={styles.resumenGridLabel}>Ingresos</Text>
                                <Text style={styles.resumenGridMonto}>{formatCurrency(resumen.totalIngresos)}</Text>
                            </View>

                            <View style={styles.resumenGridDivisor} />

                            <View style={styles.resumenGridItem}>
                                <View style={styles.resumenGridIcono}>
                                    <Ionicons name="arrow-down" size={16} color="#EF4444" />
                                </View>
                                <Text style={styles.resumenGridLabel}>Egresos</Text>
                                <Text style={styles.resumenGridMonto}>{formatCurrency(resumen.totalEgresos)}</Text>
                            </View>
                        </View>

                        {/* Desglose por método de pago */}
                        {Object.keys(resumen.porMetodoPago).length > 0 && (
                            <>
                                <View style={styles.resumenDivisor} />
                                <View style={styles.metodosPagoContainer}>
                                    <Text style={styles.metodosPagoLabel}>Por método de pago</Text>
                                    {Object.entries(resumen.porMetodoPago).map(([metodo, montos]) => {
                                        const neto = montos.ingresos - montos.egresos;
                                        return (
                                            <View key={metodo} style={styles.metodoPagoItem}>
                                                <View style={styles.metodoPagoLeft}>
                                                    <Ionicons
                                                        name={getMetodoPagoIcon(metodo)}
                                                        size={14}
                                                        color="rgba(255, 255, 255, 0.8)"
                                                    />
                                                    <Text style={styles.metodoPagoNombre}>{metodo}</Text>
                                                </View>
                                                <Text style={styles.metodoPagoMonto}>
                                                    {formatCurrency(neto)}
                                                </Text>
                                            </View>
                                        );
                                    })}
                                </View>
                            </>
                        )}
                    </View>
                )}

                {/* Filtros de categoría */}
                <View style={styles.filtrosContainer}>
                    <Text style={styles.filtrosLabel}>Filtrar movimientos</Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.filtrosScroll}
                    >
                        {FILTROS_CATEGORIA.map(filtro => (
                            <TouchableOpacity
                                key={filtro.id}
                                style={[
                                    styles.filtroChip,
                                    categoriaFiltro === filtro.id && styles.filtroChipActivo
                                ]}
                                onPress={() => setCategoriaFiltro(filtro.id)}
                                activeOpacity={0.7}
                            >
                                <Ionicons
                                    name={filtro.icon}
                                    size={16}
                                    color={categoriaFiltro === filtro.id ? '#FFFFFF' : colors.textSecondary}
                                />
                                <Text style={[
                                    styles.filtroChipText,
                                    categoriaFiltro === filtro.id && styles.filtroChipTextActivo
                                ]}>
                                    {filtro.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Lista de movimientos */}
                <View style={styles.movimientosContainer}>
                    <View style={styles.movimientosHeader}>
                        <Text style={styles.movimientosTitulo}>
                            {categoriaFiltro === 'TODOS' ? 'Todos los movimientos' :
                                FILTROS_CATEGORIA.find(f => f.id === categoriaFiltro)?.label}
                        </Text>
                        <View style={styles.contadorBadge}>
                            <Text style={styles.contadorTexto}>{movimientosFiltrados.length}</Text>
                        </View>
                    </View>

                    {movimientosFiltrados.length === 0 ? (
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIconContainer}>
                                <Ionicons name="file-tray-outline" size={48} color={colors.textSecondary} />
                            </View>
                            <Text style={styles.emptyTitle}>No hay movimientos</Text>
                            <Text style={styles.emptyText}>
                                {categoriaFiltro === 'TODOS'
                                    ? 'No se registraron movimientos este día'
                                    : 'No hay movimientos de este tipo'}
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.movimientosList}>
                            {movimientosFiltrados.map(mov => renderMovimiento(mov))}
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const createStyles = (colors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollView: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: colors.textSecondary,
        fontWeight: '500',
    },

    // Selector de fecha mejorado
    fechaContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 12,
        gap: 10,
    },
    fechaBtn: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: colors.card,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    fechaBtnDisabled: {
        opacity: 0.4,
    },
    fechaDisplay: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 10,
        gap: 10,
        borderWidth: 1,
        borderColor: colors.border,
    },
    fechaTextos: {
        flex: 1,
    },
    fechaPrincipal: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 2,
    },
    fechaSecundaria: {
        fontSize: 12,
        color: colors.textSecondary,
        textTransform: 'capitalize',
        fontWeight: '500',
    },

    // Card de resumen principal mejorado
    resumenPrincipal: {
        backgroundColor: colors.primary,
        borderRadius: 20,
        padding: 15,
        marginHorizontal: 16,
        marginBottom: 15,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.40,
        shadowRadius: 16,
        elevation: 5,
        borderWidth: 1,
        borderColor: 'rgba(56, 189, 248, 0.30)',
    },
    resumenHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    resumenIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: 'rgba(255, 255, 255, 0.20)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.30)',
    },
    resumenHeaderInfo: {
        flex: 1,
    },
    resumenLabel: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.90)',
        fontWeight: '600',
        marginBottom: 2,
        letterSpacing: 0.3,
    },
    resumenSubtitle: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.70)',
        fontWeight: '500',
    },
    saldoNetoMonto: {
        fontSize: 32,
        fontWeight: '800',
        marginBottom: 5,
        letterSpacing: -1,
        // justifyContent: 'center',
        textAlign: 'center',
        lineHeight: 40,
    },
    resumenDivisor: {
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.20)',
        marginBottom: 16,
    },
    resumenGrid: {
        flexDirection: 'row',
        justifyContent: 'center',   
        alignItems: 'center',
    },
    resumenGridItem: {
        flex: 1,
        alignItems: 'center',
    },
    resumenGridIcono: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.20)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    resumenGridLabel: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.80)',
        fontWeight: '600',
        marginBottom: 4,
    },
    resumenGridMonto: {
        fontSize: 16,
        color: '#FFFFFF',
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    resumenGridDivisor: {
        width: 1,
        height: 50,
        backgroundColor: 'rgba(255, 255, 255, 0.20)',
        marginHorizontal: 16,
    },

    // Métodos de pago
    metodosPagoContainer: {
        gap: 10,
    },
    metodosPagoLabel: {
        fontSize: 11,
        color: 'rgba(255, 255, 255, 0.70)',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 2,
    },
    metodoPagoItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 6,
    },
    metodoPagoLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    metodoPagoNombre: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.90)',
        fontWeight: '600',
    },
    metodoPagoMonto: {
        fontSize: 14,
        color: '#FFFFFF',
        fontWeight: '800',
        letterSpacing: -0.3,
    },

    // Filtros mejorados
    filtrosContainer: {
        paddingHorizontal: 16,
        marginBottom: 10,
    },
    filtrosLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.textSecondary,
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    filtrosScroll: {
        gap: 10,
    },
    filtroChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 24,
        backgroundColor: colors.card,
        borderWidth: 1.5,
        borderColor: colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.01,
        shadowRadius: 2,
        elevation: 1,
    },
    filtroChipActivo: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 4,
    },
    filtroChipText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    filtroChipTextActivo: {
        color: '#FFFFFF',
        fontWeight: '700',
    },

    // Lista de movimientos mejorada
    movimientosContainer: {
        paddingHorizontal: 16,
    },
    movimientosHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
        paddingHorizontal: 2,
    },
    movimientosTitulo: {
        fontSize: 17,
        fontWeight: '700',
        color: colors.text,
        letterSpacing: -0.3,
    },
    contadorBadge: {
        backgroundColor: colors.border,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        minWidth: 28,
        alignItems: 'center',
    },
    contadorTexto: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.textSecondary,
    },
    movimientosList: {
        gap: 10,
    },

    // Card de movimiento mejorado
    movimientoCard: {
        flexDirection: 'row',
        padding: 14,
        backgroundColor: colors.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    movimientoIcono: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    movimientoInfo: {
        flex: 1,
    },
    movimientoHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 6,
    },
    movimientoHeaderLeft: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginRight: 8,
    },
    movimientoCategoria: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.text,
    },
    clienteBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.background,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    clienteBadgeText: {
        fontSize: 10,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    movimientoMonto: {
        fontSize: 15,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    montoIngreso: {
        color: '#10B981',
    },
    montoEgreso: {
        color: '#EF4444',
    },
    movimientoDescripcion: {
        fontSize: 13,
        color: colors.textSecondary,
        marginBottom: 8,
        lineHeight: 18,
    },
    movimientoFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    movimientoMetodo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.background,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    movimientoMetodoText: {
        fontSize: 11,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    movimientoHora: {
        fontSize: 11,
        color: colors.textSecondary,
        fontWeight: '500',
    },

    // Empty state mejorado
    emptyState: {
        alignItems: 'center',
        paddingVertical: 50,
        paddingHorizontal: 20,
    },
    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.border,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 6,
    },
    emptyText: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
});
