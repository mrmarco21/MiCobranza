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
                searchPlaceholder="Buscar clienta..."
                rightButtons={[
                    {
                        icon: showSearchBar ? 'close' : 'search',
                        onPress: toggleSearch
                    },
                    {
                        icon: 'ellipsis-vertical',
                        onPress: () => setShowSortModal(true)
                    }
                ]}
            />

            {/* Header con estadísticas */}
            {!keyboardVisible && (
                <View style={styles.header}>
                    <View style={styles.estadisticasGrid}>
                        <View style={styles.estadisticaCard}>
                            <View style={styles.estadisticaIcono}>
                                <Ionicons name="people" size={22} color="#29B6F6" />
                            </View>
                            <Text style={styles.estadisticaValor}>{clientasConDeuda.length}</Text>
                            <Text style={styles.estadisticaLabel}>clientes activos</Text>
                        </View>

                        <View style={styles.estadisticaCardDestacado}>
                            <View style={styles.estadisticaIconoDestacado}>
                                <Ionicons name="cash" size={22} color="#FF6B6B" />
                            </View>
                            <Text style={styles.estadisticaValorDestacado}>
                                {formatCurrency(totalPorCobrar)}
                            </Text>
                            <Text style={styles.estadisticaLabelDestacado}>Total por cobrar</Text>
                        </View>
                    </View>
                </View>
            )}

            {/* Barra de búsqueda */}
            {busqueda.length > 0 && (
                <View style={styles.resultadosInfo}>
                    <Ionicons name="filter" size={16} color={colors.primary} />
                    <Text style={styles.resultadosTexto}>
                        {clientasFiltradas.length} {clientasFiltradas.length === 1 ? 'resultado' : 'resultados'}
                    </Text>
                </View>
            )}

            {/* Título de sección */}
            {!keyboardVisible && (
                <View style={styles.seccionHeader}>
                    <View style={styles.seccionTituloWrapper}>
                        <Ionicons name="wallet-outline" size={20} color={colors.text} />
                        <Text style={styles.seccionTitulo}>Cuentas con deuda</Text>
                    </View>
                    <View style={styles.seccionContador}>
                        <Text style={styles.seccionContadorTexto}>
                            {clientasFiltradas.length}
                        </Text>
                    </View>
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
                    />
                )}
                ListEmptyComponent={
                    <EmptyState
                        message={busqueda ? "No se encontraron resultados" : "No hay clientes con deuda activa"}
                        iconName={busqueda ? "search-outline" : "checkmark-done-circle-outline"}
                    />
                }
                contentContainerStyle={clientasFiltradas.length === 0 ? styles.emptyContainer : styles.listaContainer}
                showsVerticalScrollIndicator={false}
            />

            {/* Modal de ordenamiento */}
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
        backgroundColor: colors.background
    },
    header: {
        backgroundColor: colors.card,
        paddingTop: 16,
        paddingBottom: 16,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    estadisticasGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    estadisticaCard: {
        flex: 1,
        backgroundColor: colors.surfaceVariant,
        borderRadius: 12,
        padding: 5,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.primaryLight,
    },
    estadisticaCardDestacado: {
        flex: 1,
        backgroundColor: '#FFF5F5',
        borderRadius: 12,
        padding: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FFE5E5',
    },
    estadisticaIcono: {
        width: 38,
        height: 38,
        borderRadius: 10,
        backgroundColor: colors.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    estadisticaIconoDestacado: {
        width: 38,
        height: 38,
        borderRadius: 10,
        backgroundColor: '#FFE5E5',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    estadisticaValor: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 2,
        letterSpacing: -0.5,
    },
    estadisticaValorDestacado: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FF6B6B',
        marginBottom: 2,
        letterSpacing: -0.5,
    },
    estadisticaLabel: {
        fontSize: 10,
        color: colors.textSecondary,
        textAlign: 'center',
        fontWeight: '500',
    },
    estadisticaLabelDestacado: {
        fontSize: 10,
        color: colors.textSecondary,
        textAlign: 'center',
        fontWeight: '500',
    },
    busquedaContainer: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 8,
    },
    resultadosInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
        marginHorizontal: 16,
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: colors.primaryLight,
        borderRadius: 20,
        alignSelf: 'center',
        gap: 6,
    },
    resultadosTexto: {
        fontSize: 13,
        color: colors.primary,
        fontWeight: '600',
    },
    seccionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 10,
    },
    seccionTituloWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    seccionTitulo: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
    },
    seccionContador: {
        backgroundColor: colors.primaryLight,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        minWidth: 32,
        alignItems: 'center',
    },
    seccionContadorTexto: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.primary,
    },
    listaContainer: {
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    emptyContainer: {
        flex: 1,
        paddingHorizontal: 16,
    },
});
