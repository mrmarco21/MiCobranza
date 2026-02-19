import { useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../hooks/useTheme';
import { obtenerclientasConSaldo } from '../logic/clientasService';
import { getAll as getAllMovimientos } from '../data/movimientosRepository';
import { formatCurrency } from '../utils/helpers';
import Header from '../components/Header';
import DonutChart from '../components/DonutChart';

export default function InformesScreen() {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const [clientas, setClientas] = useState([]);
    const [movimientos, setMovimientos] = useState([]);
    const [filtroTiempo, setFiltroTiempo] = useState('mes');
    const [showDatePickerInicio, setShowDatePickerInicio] = useState(false);
    const [showDatePickerFin, setShowDatePickerFin] = useState(false);
    const [fechaInicio, setFechaInicio] = useState(null);
    const [fechaFin, setFechaFin] = useState(null);

    useFocusEffect(
        useCallback(() => {
            cargarDatos();
        }, [])
    );

    const cargarDatos = async () => {
        const data = await obtenerclientasConSaldo();
        setClientas(data);

        const allMovimientos = await getAllMovimientos();
        setMovimientos(allMovimientos);
    };

    // Calcular fechas según el filtro
    const obtenerRangoFechas = () => {
        const hoy = new Date();
        let inicio, fin;

        if (filtroTiempo === 'personalizado' && fechaInicio && fechaFin) {
            inicio = new Date(fechaInicio);
            inicio.setHours(0, 0, 0, 0);
            fin = new Date(fechaFin);
            fin.setHours(23, 59, 59, 999);
        } else {
            let fechaInicioCalc = new Date();

            switch (filtroTiempo) {
                case 'semana':
                    fechaInicioCalc.setDate(hoy.getDate() - 7);
                    break;
                case 'mes':
                    fechaInicioCalc.setMonth(hoy.getMonth() - 1);
                    break;
                case 'año':
                    fechaInicioCalc.setFullYear(hoy.getFullYear() - 1);
                    break;
                case 'todo':
                    fechaInicioCalc = new Date(2000, 0, 1);
                    break;
            }

            inicio = fechaInicioCalc;
            fin = hoy;
        }

        return { fechaInicio: inicio, fechaFin: fin };
    };

    const { fechaInicio: fechaInicioCalc, fechaFin: fechaFinCalc } = obtenerRangoFechas();

    const handleDateChangeInicio = (event, selectedDate) => {
        setShowDatePickerInicio(Platform.OS === 'ios');
        if (selectedDate) {
            setFechaInicio(selectedDate);
        }
    };

    const handleDateChangeFin = (event, selectedDate) => {
        setShowDatePickerFin(Platform.OS === 'ios');
        if (selectedDate) {
            setFechaFin(selectedDate);
        }
    };

    const formatFecha = (fecha) => {
        if (!fecha) return 'Seleccionar';
        const d = new Date(fecha);
        return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
    };

    // Primero identificar clientes con cuentas activas
    const clientasConDeuda = clientas.filter(c => c.tieneCuentaActiva && c.saldoActual > 0);

    // Filtrar movimientos por rango de fechas (TODOS los movimientos del período)
    const movimientosFiltrados = movimientos.filter(m => {
        const fechaMov = new Date(m.fecha);
        return fechaMov >= fechaInicioCalc && fechaMov <= fechaFinCalc;
    });

    // Calcular totales del período (TODOS los abonos y ventas, no solo de activos)
    const abonos = movimientosFiltrados.filter(m => m.tipo === 'ABONO');
    const totalPagado = abonos.reduce((sum, m) => sum + (m.monto || 0), 0);

    const ventas = movimientosFiltrados.filter(m => m.tipo === 'VENTA');
    const totalVentas = ventas.reduce((sum, m) => sum + (m.monto || 0), 0);

    // Total pendiente es el saldo actual de todas las cuentas activas
    const totalPendiente = clientasConDeuda.reduce((sum, c) => sum + c.saldoActual, 0);

    const deudaTotal = totalVentas;

    // Encontrar deuda más baja y más alta (usando la misma variable clientasConDeuda)
    const deudasActivas = clientasConDeuda.map(c => c.saldoActual).filter(d => d > 0);
    const deudaMasBaja = deudasActivas.length > 0 ? Math.min(...deudasActivas) : 0;
    const deudaMasAlta = deudasActivas.length > 0 ? Math.max(...deudasActivas) : 0;
    const cantidadDeudas = clientasConDeuda.length;

    // Calcular porcentajes para el gráfico de dona
    const totalGeneral = totalPagado + totalPendiente;
    const porcentajePagado = totalGeneral > 0 ? (totalPagado / totalGeneral) * 100 : 50;
    const porcentajePendiente = totalGeneral > 0 ? (totalPendiente / totalGeneral) * 100 : 50;

    // Calcular altura de barras (máximo 200px)
    const maxDeuda = Math.max(deudaMasBaja, deudaMasAlta) || 1;
    const alturaBaja = (deudaMasBaja / maxDeuda) * 200;
    const alturaAlta = (deudaMasAlta / maxDeuda) * 200;

    return (
        <View style={styles.container}>
            <Header title="Informes" showBack={true} />

            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
            >
                {/* Filtros de tiempo */}
                <View style={styles.filtrosContainer}>
                    <TouchableOpacity
                        style={[styles.filtroBtn, filtroTiempo === 'semana' && styles.filtroBtnActivo]}
                        onPress={() => setFiltroTiempo('semana')}
                    >
                        <Text style={[styles.filtroBtnText, filtroTiempo === 'semana' && styles.filtroBtnTextActivo]}>
                            Semana
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.filtroBtn, filtroTiempo === 'mes' && styles.filtroBtnActivo]}
                        onPress={() => setFiltroTiempo('mes')}
                    >
                        <Text style={[styles.filtroBtnText, filtroTiempo === 'mes' && styles.filtroBtnTextActivo]}>
                            Mes
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.filtroBtn, filtroTiempo === 'año' && styles.filtroBtnActivo]}
                        onPress={() => setFiltroTiempo('año')}
                    >
                        <Text style={[styles.filtroBtnText, filtroTiempo === 'año' && styles.filtroBtnTextActivo]}>
                            Año
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.filtroBtn, filtroTiempo === 'todo' && styles.filtroBtnActivo]}
                        onPress={() => setFiltroTiempo('todo')}
                    >
                        <Text style={[styles.filtroBtnText, filtroTiempo === 'todo' && styles.filtroBtnTextActivo]}>
                            Todo
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Filtro Personalizado Compacto */}
                <View style={styles.filtroPersonalizadoContainer}>
                    <TouchableOpacity
                        style={[styles.btnPersonalizadoCompacto, filtroTiempo === 'personalizado' && styles.btnPersonalizadoActivo]}
                        onPress={() => setFiltroTiempo('personalizado')}
                    >
                        <Ionicons name="calendar-outline" size={18} color={filtroTiempo === 'personalizado' ? '#fff' : colors.primary} />
                        <Text style={[styles.btnPersonalizadoText, filtroTiempo === 'personalizado' && styles.btnPersonalizadoTextActivo]}>
                            Personalizado
                        </Text>
                    </TouchableOpacity>

                    {filtroTiempo === 'personalizado' && (
                        <View style={styles.fechasCompactas}>
                            <TouchableOpacity
                                style={styles.fechaSelectorCompacto}
                                onPress={() => setShowDatePickerInicio(true)}
                            >
                                <Text style={styles.fechaSelectorTextCompacto}>{formatFecha(fechaInicio)}</Text>
                            </TouchableOpacity>
                            <Ionicons name="arrow-forward" size={16} color={colors.textSecondary} />
                            <TouchableOpacity
                                style={styles.fechaSelectorCompacto}
                                onPress={() => setShowDatePickerFin(true)}
                            >
                                <Text style={styles.fechaSelectorTextCompacto}>{formatFecha(fechaFin)}</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Resumen General */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Resumen General</Text>

                    <View style={styles.card}>
                        <Text style={styles.cardLabel}>Total Ventas del Período</Text>
                        <Text style={styles.cardValue}>{formatCurrency(deudaTotal)}</Text>

                        {/* Gráfico Circular */}
                        <View style={styles.chartContainer}>
                            <DonutChart
                                data={[
                                    {
                                        value: totalPagado,
                                        color: '#4CAF50',
                                        text: totalPagado.toFixed(0),
                                    },
                                    {
                                        value: totalPendiente,
                                        color: '#FFEB3B',
                                        text: totalPendiente.toFixed(0),
                                    },
                                ]}
                                size={240}
                                strokeWidth={50}
                            />
                        </View>

                        {/* Leyenda */}
                        <View style={styles.legendContainer}>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
                                <View style={styles.legendTextContainer}>
                                    <Text style={styles.legendLabel}>Total Pagado</Text>
                                    <Text style={styles.legendValue}>{formatCurrency(totalPagado)}</Text>
                                </View>
                            </View>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendDot, { backgroundColor: '#FFEB3B' }]} />
                                <View style={styles.legendTextContainer}>
                                    <Text style={styles.legendLabel}>Total Pendiente</Text>
                                    <Text style={styles.legendValue}>{formatCurrency(totalPendiente)}</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Rango de Deudas */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Rango de Deudas</Text>

                    <View style={styles.card}>
                        <Text style={styles.cardLabel}>Deudas Pendientes</Text>
                        <Text style={styles.cardValueLarge}>{cantidadDeudas}</Text>

                        {/* Gráfico de Barras */}
                        <View style={styles.barChartContainer}>
                            <View style={styles.barChart}>
                                {/* Barra Verde */}
                                <View style={styles.barWrapper}>
                                    <Text style={styles.barValue}>{deudaMasBaja.toFixed(0)}</Text>
                                    <View style={styles.barColumn}>
                                        <View style={[styles.bar, styles.barGreen, { height: alturaBaja }]} />
                                    </View>
                                    <Text style={styles.barLabel}>Deuda Más{'\n'}Baja</Text>
                                </View>

                                {/* Barra Amarilla */}
                                <View style={styles.barWrapper}>
                                    <Text style={styles.barValue}>{deudaMasAlta.toFixed(0)}</Text>
                                    <View style={styles.barColumn}>
                                        <View style={[styles.bar, styles.barYellow, { height: alturaAlta }]} />
                                    </View>
                                    <Text style={styles.barLabel}>Deuda Más{'\n'}Alta</Text>
                                </View>
                            </View>
                        </View>

                        {/* Leyenda */}
                        <View style={styles.legendContainer}>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
                                <View style={styles.legendTextContainer}>
                                    <Text style={styles.legendLabel}>Deuda Más Baja</Text>
                                    <Text style={styles.legendValue}>{formatCurrency(deudaMasBaja)}</Text>
                                </View>
                            </View>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendDot, { backgroundColor: '#9E9D24' }]} />
                                <View style={styles.legendTextContainer}>
                                    <Text style={styles.legendLabel}>Deuda Más Alta</Text>
                                    <Text style={styles.legendValue}>{formatCurrency(deudaMasAlta)}</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={styles.bottomPadding} />
            </ScrollView>

            {/* Date Pickers */}
            {showDatePickerInicio && (
                <DateTimePicker
                    value={fechaInicio || new Date()}
                    mode="date"
                    display="default"
                    onChange={handleDateChangeInicio}
                    maximumDate={new Date()}
                />
            )}
            {showDatePickerFin && (
                <DateTimePicker
                    value={fechaFin || new Date()}
                    mode="date"
                    display="default"
                    onChange={handleDateChangeFin}
                    maximumDate={new Date()}
                    minimumDate={fechaInicio}
                />
            )}
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
    filtrosContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
        gap: 8,
    },
    filtroBtn: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
    },
    filtroBtnActivo: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    filtroBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.text,
    },
    filtroBtnTextActivo: {
        color: '#fff',
    },
    filtroPersonalizadoContainer: {
        paddingHorizontal: 16,
        paddingTop: 8,
        gap: 8,
    },
    btnPersonalizadoCompacto: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 6,
    },
    btnPersonalizadoActivo: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    btnPersonalizadoText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.text,
    },
    btnPersonalizadoTextActivo: {
        color: '#fff',
    },
    fechasCompactas: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    fechaSelectorCompacto: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: colors.card,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        minWidth: 100,
        alignItems: 'center',
    },
    fechaSelectorTextCompacto: {
        fontSize: 13,
        fontWeight: '500',
        color: colors.text,
    },
    section: {
        paddingHorizontal: 16,
        paddingTop: 10,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FF5252',
        marginBottom: 10,
    },
    card: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    cardLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 8,
    },
    cardValue: {
        fontSize: 28,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 5,
    },
    cardValueLarge: {
        fontSize: 48,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 10,
    },
    // Gráfico circular
    chartContainer: {
        alignItems: 'center',
        marginVertical: 10,
    },
    // Gráfico de barras
    barChartContainer: {
        marginVertical: 20,
        paddingHorizontal: 20,
    },
    barChart: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'flex-end',
        height: 250,
        paddingTop: 10,
    },
    barWrapper: {
        alignItems: 'center',
        flex: 1,
    },
    barValue: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 5,
    },
    barColumn: {
        width: 80,
        height: 200,
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    bar: {
        width: '100%',
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
        minHeight: 20,
    },
    barGreen: {
        backgroundColor: '#4CAF50',
    },
    barYellow: {
        backgroundColor: '#9E9D24',
    },
    barLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 8,
        textAlign: 'center',
    },
    // Leyenda
    legendContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 5,
        gap: 12,
    },
    legendItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    legendDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    legendTextContainer: {
        flex: 1,
    },
    legendLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 2,
    },
    legendValue: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
    },
    bottomPadding: {
        height: 20,
    },
});
