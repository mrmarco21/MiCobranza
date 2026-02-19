import { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as gastosRepo from '../data/gastosRepository';
import { formatCurrency } from '../utils/helpers';
import { useTheme } from '../hooks/useTheme';
import Header from '../components/Header';
import GastoCard from '../components/GastoCard';
import EmptyState from '../components/EmptyState';
import DetalleGastoModal from '../components/DetalleGastoModal';

const FILTROS = [
    { id: 'TODOS', label: 'Todos', icon: 'grid-outline' },
    { id: 'COMPRA', label: 'Compras', icon: 'cart-outline' },
    { id: 'ENVIO_ORIGEN', label: 'Envíos', icon: 'airplane-outline' },
    { id: 'INTERMEDIARIO', label: 'Intermediario', icon: 'person-outline' },
    { id: 'ENVIO_FINAL', label: 'Envío Final', icon: 'car-outline' },
    { id: 'OTRO', label: 'Otros', icon: 'ellipsis-horizontal-outline' },
];

export default function GastosScreen({ navigation }) {
    const { colors } = useTheme();
    const styles = createStyles(colors);
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(true);
    const [gastos, setGastos] = useState([]);
    const [filtroActivo, setFiltroActivo] = useState('TODOS');
    const [gastoSeleccionado, setGastoSeleccionado] = useState(null);
    const [showDetalleModal, setShowDetalleModal] = useState(false);
    const [resumen, setResumen] = useState({
        totalCompras: 0,
        totalEnvios: 0,
        totalIntermediario: 0,
        totalOtros: 0,
        totalGeneral: 0,
    });

    useFocusEffect(
        useCallback(() => {
            cargarGastos();
        }, [])
    );

    const cargarGastos = async () => {
        setLoading(true);
        try {
            const todosGastos = await gastosRepo.getAll();

            // Ordenar por fecha descendente
            todosGastos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

            setGastos(todosGastos);
            calcularResumen(todosGastos);
        } catch (error) {
            console.error('Error cargando gastos:', error);
        } finally {
            setLoading(false);
        }
    };

    const calcularResumen = (gastosData) => {
        let totalCompras = 0;
        let totalEnvios = 0;
        let totalIntermediario = 0;
        let totalOtros = 0;

        gastosData.forEach(gasto => {
            switch (gasto.tipo) {
                case 'COMPRA':
                    totalCompras += gasto.monto;
                    break;
                case 'ENVIO_ORIGEN':
                case 'ENVIO_FINAL':
                    totalEnvios += gasto.monto;
                    break;
                case 'INTERMEDIARIO':
                    totalIntermediario += gasto.monto;
                    break;
                default:
                    totalOtros += gasto.monto;
            }
        });

        setResumen({
            totalCompras,
            totalEnvios,
            totalIntermediario,
            totalOtros,
            totalGeneral: totalCompras + totalEnvios + totalIntermediario + totalOtros,
        });
    };

    const gastosFiltrados = filtroActivo === 'TODOS'
        ? gastos
        : gastos.filter(g => g.tipo === filtroActivo);

    const handleVerGasto = (gasto) => {
        setGastoSeleccionado(gasto);
        setShowDetalleModal(true);
    };

    const handleEditarGasto = () => {
        setShowDetalleModal(false);
        setTimeout(() => {
            navigation.navigate('AddGasto', { gasto: gastoSeleccionado });
        }, 300);
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <Header title="Gestión de Gastos" showBack />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#45beffff" />
                    <Text style={styles.loadingText}>Cargando gastos...</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Header title="Gestión de Gastos" showBack />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 100, 100) }}
                showsVerticalScrollIndicator={false}
            >
                {/* Card de resumen total */}
                <View style={styles.resumenCard}>
                    <View style={styles.resumenHeader}>
                        <View style={styles.resumenIconContainer}>
                            <Ionicons name="wallet" size={24} color="#FFFFFF" />
                        </View>
                        <View style={styles.resumenHeaderInfo}>
                            <Text style={styles.resumenLabel}>Total Invertido</Text>
                            <Text style={styles.resumenSubtitle}>{gastos.length} gastos registrados</Text>
                        </View>
                    </View>

                    <Text style={styles.resumenMonto}>{formatCurrency(resumen.totalGeneral)}</Text>

                    <View style={styles.resumenDivisor} />

                    <View style={styles.resumenDesglose}>
                        <View style={styles.desgloseltem}>
                            <View style={[styles.desgloseDot, { backgroundColor: '#E91E63' }]} />
                            <Text style={styles.desgloseLabelText}>Compras</Text>
                            <Text style={styles.desgloseMonto}>{formatCurrency(resumen.totalCompras)}</Text>
                        </View>
                        <View style={styles.desgloseltem}>
                            <View style={[styles.desgloseDot, { backgroundColor: '#3F51B5' }]} />
                            <Text style={styles.desgloseLabelText}>Envíos</Text>
                            <Text style={styles.desgloseMonto}>{formatCurrency(resumen.totalEnvios)}</Text>
                        </View>
                        <View style={styles.desgloseltem}>
                            <View style={[styles.desgloseDot, { backgroundColor: '#FF9800' }]} />
                            <Text style={styles.desgloseLabelText}>Intermediario</Text>
                            <Text style={styles.desgloseMonto}>{formatCurrency(resumen.totalIntermediario)}</Text>
                        </View>
                        {resumen.totalOtros > 0 && (
                            <View style={styles.desgloseltem}>
                                <View style={[styles.desgloseDot, { backgroundColor: '#607D8B' }]} />
                                <Text style={styles.desgloseLabelText}>Otros</Text>
                                <Text style={styles.desgloseMonto}>{formatCurrency(resumen.totalOtros)}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Filtros */}
                <View style={styles.filtrosContainer}>
                    <Text style={styles.filtrosLabel}>Filtrar por tipo</Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.filtrosScroll}
                    >
                        {FILTROS.map(filtro => (
                            <TouchableOpacity
                                key={filtro.id}
                                style={[
                                    styles.filtroChip,
                                    filtroActivo === filtro.id && styles.filtroChipActivo
                                ]}
                                onPress={() => setFiltroActivo(filtro.id)}
                            >
                                <Ionicons
                                    name={filtro.icon}
                                    size={16}
                                    color={filtroActivo === filtro.id ? '#FFFFFF' : '#636E72'}
                                />
                                <Text style={[
                                    styles.filtroChipText,
                                    filtroActivo === filtro.id && styles.filtroChipTextActivo
                                ]}>
                                    {filtro.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Lista de gastos */}
                <View style={styles.listContainer}>
                    <View style={styles.listHeader}>
                        <Text style={styles.listTitle}>
                            {filtroActivo === 'TODOS' ? 'Todos los gastos' : FILTROS.find(f => f.id === filtroActivo)?.label}
                        </Text>
                        <Text style={styles.listCount}>{gastosFiltrados.length}</Text>
                    </View>

                    {gastosFiltrados.length === 0 ? (
                        <EmptyState
                            icon="receipt-outline"
                            title="No hay gastos"
                            message={filtroActivo === 'TODOS'
                                ? "Aún no has registrado ningún gasto"
                                : "No hay gastos de este tipo"}
                        />
                    ) : (
                        gastosFiltrados.map(gasto => (
                            <GastoCard
                                key={gasto.id}
                                gasto={gasto}
                                onPress={() => handleVerGasto(gasto)}
                            />
                        ))
                    )}
                </View>
            </ScrollView>

            {/* Botón flotante para agregar gasto */}
            <TouchableOpacity
                style={[styles.fab, { bottom: Math.max(insets.bottom + 24, 24) }]}
                onPress={() => navigation.navigate('AddGasto')}
                activeOpacity={0.8}
            >
                <Ionicons name="add" size={28} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Modal de detalle */}
            <DetalleGastoModal
                visible={showDetalleModal}
                gasto={gastoSeleccionado}
                onClose={() => setShowDetalleModal(false)}
                onEditar={handleEditarGasto}
            />
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
        backgroundColor: colors.background,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: colors.textSecondary,
        fontWeight: '500',
    },

    // Card de resumen mejorado
    resumenCard: {
        backgroundColor: '#2c95cdff',
        borderRadius: 20,
        padding: 20,
        margin: 16,
        marginTop: 20,
        shadowColor: '#0EA5E9',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.40,
        shadowRadius: 16,
        elevation: 8,
        borderWidth: 1,
        borderColor: 'rgba(56, 189, 248, 0.30)',
    },
    resumenHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    resumenIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: 'rgba(56, 189, 248, 0.25)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        borderWidth: 1,
        borderColor: 'rgba(125, 211, 252, 0.40)',
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
        color: 'rgba(186, 230, 253, 0.90)',
        fontWeight: '500',
    },
    resumenMonto: {
        fontSize: 36,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 16,
        letterSpacing: -1,
    },
    resumenDivisor: {
        height: 1,
        backgroundColor: 'rgba(56, 189, 248, 0.25)',
        marginBottom: 16,
    },
    resumenDesglose: {
        gap: 10,
    },
    desgloseltem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    desgloseDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    desgloseLabelText: {
        flex: 1,
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.95)',
        fontWeight: '600',
    },
    desgloseMonto: {
        fontSize: 14,
        color: '#FFFFFF',
        fontWeight: '800',
        letterSpacing: -0.3,
    },

    // Filtros mejorados
    filtrosContainer: {
        paddingHorizontal: 16,
        marginBottom: 20,
        marginTop: 4,
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
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
    },
    filtroChipActivo: {
        backgroundColor: '#0EA5E9',
        borderColor: '#0EA5E9',
        shadowColor: '#0EA5E9',
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

    // Lista mejorada
    listContainer: {
        paddingHorizontal: 16,
    },
    listHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
        paddingHorizontal: 2,
    },
    listTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: colors.text,
        letterSpacing: -0.3,
    },
    listCount: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.textSecondary,
        backgroundColor: colors.border,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },

    // FAB mejorado
    fab: {
        position: 'absolute',
        right: 20,
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#0EA5E9',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#0EA5E9',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.45,
        shadowRadius: 12,
        elevation: 10,
        borderWidth: 3,
        borderColor: '#FFFFFF',
    },
});
