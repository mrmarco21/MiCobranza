import { useState, useCallback, useEffect, useRef } from 'react';
import { View, FlatList, TextInput, TouchableOpacity, Text, StyleSheet, Keyboard } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { obtenerclientasConSaldo } from '../logic/clientasService';
import { formatCurrency } from '../utils/helpers';
import { useTheme } from '../hooks/useTheme';
import ClientaCard from '../components/ClientaCard';
import EmptyState from '../components/EmptyState';
import Header from '../components/Header';
import SortFilterModal from '../components/SortFilterModal';

export default function CuentasPendientesScreen({ navigation }) {
    const { colors } = useTheme();
    const styles = createStyles(colors);
    const [clientasConDeuda, setclientasConDeuda] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const [showSortModal, setShowSortModal] = useState(false);
    const [sortOrder, setSortOrder] = useState('a-z');
    const [showSearchBar, setShowSearchBar] = useState(false);
    const searchInputRef = useRef(null);

    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
            setKeyboardVisible(true);
        });

        const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
            setKeyboardVisible(false);
        });

        return () => {
            keyboardDidShowListener.remove();
            keyboardDidHideListener.remove();
        };
    }, []);

    useFocusEffect(
        useCallback(() => {
            cargarclientas();
        }, [])
    );

    const cargarclientas = async () => {
        const data = await obtenerclientasConSaldo();
        const conDeuda = data.filter(c => c.tieneCuentaActiva && c.saldoActual > 0);
        setclientasConDeuda(conDeuda);
    };
    const clientasFiltradas = clientasConDeuda
        .filter(c => c.nombre.toLowerCase().includes(busqueda.toLowerCase()))
        .sort((a, b) => {
            switch (sortOrder) {
                case 'a-z':
                    return a.nombre.localeCompare(b.nombre);
                case 'z-a':
                    return b.nombre.localeCompare(a.nombre);
                case 'recent':
                    return new Date(b.fechaUltimaCuenta || 0) - new Date(a.fechaUltimaCuenta || 0);
                case 'oldest':
                    return new Date(a.fechaUltimaCuenta || 0) - new Date(b.fechaUltimaCuenta || 0);
                case 'highest':
                    return b.saldoActual - a.saldoActual;
                case 'lowest':
                    return a.saldoActual - b.saldoActual;
                default:
                    return 0;
            }
        });

    const totalPorCobrar = clientasConDeuda.reduce((sum, c) => sum + c.saldoActual, 0);
    const totalCuentasActivas = clientasConDeuda.reduce((sum, c) => sum + (c.numeroCuentasActivas || 1), 0);

    const handleSortApply = ({ sort }) => {
        setSortOrder(sort);
    };

    const toggleSearch = () => {
        setShowSearchBar(!showSearchBar);
        if (showSearchBar) {
            setBusqueda('');
        }
    };

    return (
        <View style={styles.container}>
            <Header
                title="Deudores"
                showBack={true}
                searchMode={showSearchBar}
                searchValue={busqueda}
                onSearchChange={setBusqueda}
                searchPlaceholder="Buscar deudor..."
                rightButtons={[
                    {
                        icon: showSearchBar ? 'close' : 'search',
                        onPress: toggleSearch
                    },
                    // {
                    //     icon: 'options-outline',
                    //     onPress: () => setShowSortModal(true)
                    // }
                ]}
            />

            {/* ─── Resumen ejecutivo ─────────────────────────────── */}
            {!keyboardVisible && (
                <View style={styles.resumenBanner}>
                    {/* Total por cobrar — protagonista */}
                    <View style={styles.bannerTotal}>
                        <Text style={styles.bannerTotalLabel}>TOTAL POR COBRAR</Text>
                        <Text style={styles.bannerTotalMonto}>{formatCurrency(totalPorCobrar)}</Text>
                    </View>

                    <View style={styles.bannerDivisor} />

                    {/* Dos métricas secundarias */}
                    <View style={styles.bannerMetricas}>
                        <View style={styles.bannerMetrica}>
                            <View style={styles.bannerMetricaIcono}>
                                <Ionicons name="people" size={16} color="#0EA5E9" />
                            </View>
                            <Text style={styles.bannerMetricaValor}>{clientasConDeuda.length}</Text>
                            <Text style={styles.bannerMetricaLabel}>
                                {clientasConDeuda.length === 1 ? 'Deudor' : 'Deudores'}
                            </Text>
                        </View>

                        <View style={styles.bannerMetricaSep} />

                        <View style={styles.bannerMetrica}>
                            <View style={[styles.bannerMetricaIcono, { backgroundColor: '#FFF7ED' }]}>
                                <Ionicons name="wallet" size={16} color="#F97316" />
                            </View>
                            <Text style={styles.bannerMetricaValor}>{totalCuentasActivas}</Text>
                            <Text style={styles.bannerMetricaLabel}>
                                {totalCuentasActivas === 1 ? 'Cuenta activa' : 'Cuentas activas'}
                            </Text>
                        </View>
                    </View>
                </View>
            )}

            {/* ─── Encabezado de lista ───────────────────────────── */}
            {!keyboardVisible && (
                <View style={styles.listaEncabezado}>
                    <Text style={styles.listaEncabezadoTitulo}>
                        {busqueda
                            ? `${clientasFiltradas.length} resultado${clientasFiltradas.length !== 1 ? 's' : ''}`
                            : 'Lista de deudores'
                        }
                    </Text>
                    <TouchableOpacity
                        style={styles.ordenarBtn}
                        onPress={() => setShowSortModal(true)}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="options-outline" size={16} color={colors.textSecondary} />
                        <Text style={styles.ordenarBtnTexto}>Filtrar / Ordenar</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* ─── Lista de deudores ─────────────────────────────── */}
            <FlatList
                data={clientasFiltradas}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <ClientaCard
                        clienta={item}
                        onPress={() => navigation.navigate('ClientaDetail', { clientaId: item.id })}
                        modo="deudores"
                    />
                )}
                ListEmptyComponent={
                    <EmptyState
                        message={busqueda ? "No se encontraron resultados" : "No hay clientes con deuda activa"}
                        iconName={busqueda ? "search-outline" : "checkmark-done-circle-outline"}
                    />
                }
                contentContainerStyle={
                    clientasFiltradas.length === 0
                        ? styles.emptyContainer
                        : styles.listaContainer
                }
                showsVerticalScrollIndicator={false}
            />

            <SortFilterModal
                visible={showSortModal}
                onClose={() => setShowSortModal(false)}
                onApply={handleSortApply}
                currentSort={sortOrder}
                showFilters={false}
            />
        </View>
    );
}

const createStyles = (colors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },

    // ── Resumen banner ──────────────────────────────────────────
    resumenBanner: {
        backgroundColor: colors.card,
        marginHorizontal: 16,
        marginTop: 14,
        marginBottom: 4,
        borderRadius: 18,
        padding: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
        elevation: 3,
        borderWidth: 1,
        borderColor: colors.border,
    },
    bannerTotal: {
        alignItems: 'center',
        marginBottom: 5,
    },
    bannerTotalLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: colors.textTertiary,
        letterSpacing: 1.5,
        marginBottom: 1,
    },
    bannerTotalMonto: {
        fontSize: 30,
        fontWeight: '800',
        color: '#FF6B6B',
        letterSpacing: -1,
    },
    bannerDivisor: {
        height: 1,
        backgroundColor: colors.border,
        marginBottom: 10,
    },
    bannerMetricas: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    bannerMetrica: {
        flex: 1,
        alignItems: 'center',
        gap: 2,
    },
    bannerMetricaIcono: {
        width: 22,
        height: 22,
        borderRadius: 10,
        backgroundColor: '#EFF6FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 2,
    },
    bannerMetricaValor: {
        fontSize: 20,
        fontWeight: '800',
        color: colors.text,
        letterSpacing: -0.5,
    },
    bannerMetricaLabel: {
        fontSize: 10,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    bannerMetricaSep: {
        width: 1,
        height: 48,
        backgroundColor: colors.border,
        marginHorizontal: 12,
    },

    // ── Encabezado de lista ──────────────────────────────────────
    listaEncabezado: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 8,
    },
    listaEncabezadoTitulo: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.text,
    },
    ordenarBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        backgroundColor: colors.surfaceVariant,
        borderWidth: 1,
        borderColor: colors.border,
    },
    ordenarBtnTexto: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textSecondary,
    },

    // ── Lista ────────────────────────────────────────────────────
    listaContainer: {
        paddingHorizontal: 16,
        paddingBottom: 24,
    },
    emptyContainer: {
        flex: 1,
        paddingHorizontal: 16,
    },
});
