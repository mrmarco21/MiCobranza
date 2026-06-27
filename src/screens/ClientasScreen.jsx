import { useState, useCallback, useRef, useEffect } from 'react';
import { View, FlatList, TextInput, TouchableOpacity, Text, StyleSheet, Keyboard } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { obtenerclientasConSaldo } from '../logic/clientasService';
import { useTheme } from '../hooks/useTheme';
import ClientaCard from '../components/ClientaCard';
import EmptyState from '../components/EmptyState';
import Header from '../components/Header';
import SortFilterModal from '../components/SortFilterModal';

export default function clientasScreen({ navigation }) {
    const { colors } = useTheme();
    const styles = createStyles(colors);
    const insets = useSafeAreaInsets();
    const [clientas, setclientas] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const [showSortModal, setShowSortModal] = useState(false);
    const [filterType, setFilterType] = useState('all');
    const [sortOrder, setSortOrder] = useState('a-z');
    const [showSearchBar, setShowSearchBar] = useState(false);
    const searchInputRef = useRef(null);

    useFocusEffect(
        useCallback(() => {
            cargarclientas();
        }, [])
    );

    // Detectar cuando el teclado se muestra/oculta
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

    const cargarclientas = async () => {
        const data = await obtenerclientasConSaldo();
        setclientas(data);
    };

    const clientasFiltradas = clientas
        .filter(c => {
            const matchesSearch = c.nombre.toLowerCase().includes(busqueda.toLowerCase());
            if (filterType === 'all') return matchesSearch;
            if (filterType === 'pending') return matchesSearch && c.tieneCuentaActiva && c.saldoActual > 0;
            if (filterType === 'inactive') return matchesSearch && !c.tieneCuentaActiva;
            return matchesSearch;
        })
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

    // Calcular estadísticas
    const totalclientas = clientas.length;
    const clientasConDeuda = clientas.filter(c => c.tieneCuentaActiva && c.saldoActual > 0).length;
    const clientasAlDia = clientas.filter(c => c.tieneCuentaActiva && c.saldoActual === 0).length;
    const clientasSinCuenta = clientas.filter(c => !c.tieneCuentaActiva).length;

    const handleSortFilterApply = ({ filter, sort }) => {
        setFilterType(filter);
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
                title="Todos los clientes"
                showBack
                searchMode={showSearchBar}
                searchValue={busqueda}
                onSearchChange={setBusqueda}
                searchPlaceholder="Buscar cliente..."
                rightButtons={[
                    {
                        icon: showSearchBar ? 'close' : 'search',
                        onPress: toggleSearch
                    }
                ]}
            />

            {/* Header con estadísticas - se oculta cuando el teclado está visible */}
            {!keyboardVisible && (
                <View style={styles.header}>
                    <View style={styles.estadisticasContainer}>
                        <View style={styles.estadisticaItem}>
                            <View style={styles.estadisticaIcono}>
                                <Ionicons name="people" size={18} color="#29B6F6" />
                            </View>
                            <Text style={styles.estadisticaValor}>{totalclientas}</Text>
                            <Text style={styles.estadisticaLabel}>Total</Text>
                        </View>

                        <View style={styles.estadisticaItem}>
                            <View style={[styles.estadisticaIcono, { backgroundColor: '#FFE5E5' }]}>
                                <Ionicons name="alert-circle" size={18} color="#FF6B6B" />
                            </View>
                            <Text style={styles.estadisticaValor}>{clientasConDeuda}</Text>
                            <Text style={styles.estadisticaLabel}>Con deuda</Text>
                        </View>

                        <View style={styles.estadisticaItem}>
                            <View style={[styles.estadisticaIcono, { backgroundColor: '#F5F5F5' }]}>
                                <Ionicons name="person-outline" size={18} color="#9E9E9E" />
                            </View>
                            <Text style={styles.estadisticaValor}>{clientasSinCuenta}</Text>
                            <Text style={styles.estadisticaLabel}>Sin cuenta</Text>
                        </View>
                    </View>
                </View>
            )}

            {/* ─── Encabezado de lista ───────────────────────────── */}
            {!keyboardVisible && (
                <View style={styles.listaEncabezado}>
                    <View style={styles.listaEncabezadoIzq}>
                        <Text style={styles.listaEncabezadoTitulo}>
                            {busqueda
                                ? `${clientasFiltradas.length} resultado${clientasFiltradas.length !== 1 ? 's' : ''}`
                                : filterType !== 'all'
                                    ? `${clientasFiltradas.length} cliente${clientasFiltradas.length !== 1 ? 's' : ''}`
                                    : 'Todos los clientes'
                            }
                        </Text>
                        {filterType !== 'all' && (
                            <View style={styles.filtroActivoBadge}>
                                <Text style={styles.filtroActivoTexto}>
                                    {filterType === 'pending' ? 'Con deuda' : 'Sin cuenta'}
                                </Text>
                                <TouchableOpacity
                                    onPress={() => setFilterType('all')}
                                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                >
                                    <Ionicons name="close-circle" size={14} color={colors.primary} />
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
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

            {/* Lista de clientes */}
            <FlatList
                data={clientasFiltradas}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <ClientaCard
                        clienta={item}
                        onPress={() => navigation.navigate('ClientaDetail', { clientaId: item.id })}
                        modo="todos"
                    />
                )}
                ListEmptyComponent={
                    <EmptyState
                        message={busqueda ? "No se encontraron resultados" : "No hay clientes registrados"}
                        iconName={busqueda ? "search-outline" : "people-outline"}
                    />
                }
                contentContainerStyle={clientasFiltradas.length === 0 ? styles.emptyContainer : styles.listaContainer}
                showsVerticalScrollIndicator={false}
            />

            {/* Botón flotante para agregar nueva clienta - se oculta cuando el teclado está visible */}
            {!keyboardVisible && (
                <TouchableOpacity
                    style={[styles.botonFlotante, { bottom: Math.max(insets.bottom + 24, 24) }]}
                    onPress={() => navigation.navigate('AddClienta')}
                    activeOpacity={0.8}
                >
                    <Ionicons name="person-add" size={24} color="#fff" />
                </TouchableOpacity>
            )}

            {/* Modal de ordenamiento y filtrado */}
            <SortFilterModal
                visible={showSortModal}
                onClose={() => setShowSortModal(false)}
                onApply={handleSortFilterApply}
                currentFilter={filterType}
                currentSort={sortOrder}
                showFilters={true}
            />
        </View>
    );
}

const createStyles = (colors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background
    },
    header: {
        backgroundColor: colors.card,
        paddingTop: 12,
        paddingBottom: 14,
        paddingHorizontal: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    estadisticasContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.background,
        borderRadius: 10,
        padding: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    estadisticaItem: {
        flex: 1,
        alignItems: 'center',
    },
    estadisticaIcono: {
        width: 35,
        height: 35,
        borderRadius: 20,
        backgroundColor: '#E1F5FE',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 5,
    },
    estadisticaValor: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
        marginTop: 4,
    },
    estadisticaLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 4,
        textAlign: 'center',
    },
    busquedaContainer: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 4,
    },
    resultadosInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
        marginHorizontal: 16,
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: '#E1F5FE',
        borderRadius: 20,
        alignSelf: 'center',
        gap: 6,
    },
    resultadosTexto: {
        fontSize: 13,
        color: '#29B6F6',
        fontWeight: '600',
    },
    seccionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 20,
        paddingBottom: 12,
    },
    seccionTitulo: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
    },
    // ── Encabezado de lista ─────────────────────────────────────
    listaEncabezado: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 8,
    },
    listaEncabezadoIzq: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginRight: 8,
        flexWrap: 'wrap',
    },
    listaEncabezadoTitulo: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.text,
    },
    filtroActivoBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.primaryLight,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    filtroActivoTexto: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.primary,
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
    listaContainer: {
        paddingHorizontal: 16,
        paddingBottom: 120,
    },
    emptyContainer: {
        flex: 1,
        paddingHorizontal: 16,
    },
    botonFlotante: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
});

