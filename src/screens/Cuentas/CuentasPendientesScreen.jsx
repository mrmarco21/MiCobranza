import { useState, useCallback, useEffect, useRef } from 'react';
import { View, FlatList, TextInput, TouchableOpacity, Text, StyleSheet, Keyboard, Alert, Modal } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { obtenerclientasConSaldo } from '../../services/clientasService';
import { formatCurrency } from '../../shared/utils/helpers';
import { useTheme } from '../../shared/hooks/useTheme';
import ClientaCard from '../Clientas/components/ClientaCard';
import EmptyState from '../../shared/components/EmptyState';
import Header from '../../shared/components/Header';
import SortFilterModal from '../../shared/components/SortFilterModal';
import { limpiarCuentasInconsistentes } from '../../shared/utils/limpiarCuentasInconsistentes';
import { migrarCuentasAnuladas } from '../../shared/utils/migrarCuentasAnuladas';

export default function CuentasPendientesScreen({ navigation }) {
    const { colors } = useTheme();
    const styles = createStyles(colors);
    const [clientasConDeuda, setclientasConDeuda] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const [showSortModal, setShowSortModal] = useState(false);
    const [showMantenimientoModal, setShowMantenimientoModal] = useState(false);
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
        // Primero limpiar cuentas inconsistentes automáticamente
        await limpiarCuentasInconsistentes();

        // Luego cargar las clientas
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

    const handleCobrar = (clienta) => {
        // Navegar a la nueva pantalla de cobro
        navigation.navigate('Cobro', { clientaId: clienta.id });
    };

    const handleHistorial = (clienta) => {
        // Navegar al detalle del cliente donde se muestra el historial de pagos
        navigation.navigate('ClientaDetail', {
            clientaId: clienta.id
        });
    };

    const handleLimpiarCuentas = async () => {
        Alert.alert(
            'Limpiar Cuentas Inconsistentes',
            '¿Deseas corregir las cuentas que tienen ventas anuladas o sin movimientos? Esto cerrará automáticamente esas cuentas.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Limpiar',
                    onPress: async () => {
                        const resultado = await limpiarCuentasInconsistentes();
                        if (resultado.success) {
                            Alert.alert(
                                'Limpieza Completada',
                                `Se corrigieron ${resultado.cuentasCorregidas} cuenta(s).`,
                                [{ text: 'OK', onPress: () => cargarclientas() }]
                            );
                        } else {
                            Alert.alert('Error', 'No se pudo completar la limpieza: ' + resultado.error);
                        }
                    }
                }
            ]
        );
    };

    const handleMigrarCuentasAnuladas = async () => {
        Alert.alert(
            'Migrar Cuentas Anuladas',
            'Esta acción marcará correctamente las cuentas que fueron anuladas antes de la actualización. Esto corregirá la numeración de las cuentas y el historial.\n\n¿Deseas continuar?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Migrar',
                    onPress: async () => {
                        const resultado = await migrarCuentasAnuladas();
                        if (resultado.success) {
                            Alert.alert(
                                'Migración Completada',
                                `✅ Migración exitosa:\n\n` +
                                `• Cuentas anuladas marcadas: ${resultado.cuentasMigradas}\n` +
                                `• Cuentas ya migradas: ${resultado.cuentasYaMigradas}\n` +
                                `• Total procesadas: ${resultado.totalProcesadas}\n\n` +
                                `La numeración de cuentas y el historial ahora están corregidos.`,
                                [{ text: 'OK', onPress: () => cargarclientas() }]
                            );
                        } else {
                            Alert.alert('Error', 'No se pudo completar la migración: ' + resultado.error);
                        }
                    }
                }
            ]
        );
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
                        icon: 'people',
                        onPress: () => navigation.navigate('clientas')
                    },
                    {
                        icon: 'refresh',
                        onPress: () => setShowMantenimientoModal(true)
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
                    {/* <View style={styles.seccionContador}>
                        <Text style={styles.seccionContadorTexto}>
                            {clientasFiltradas.length}
                        </Text>
                    </View> */}
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
                        onCobrar={handleCobrar}
                        onHistorial={handleHistorial}
                        mode="pending"
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

            {/* Modal de mantenimiento */}
            <Modal
                visible={showMantenimientoModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowMantenimientoModal(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowMantenimientoModal(false)}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Ionicons name="construct-outline" size={24} color={colors.primary} />
                            <Text style={styles.modalTitle}>Mantenimiento</Text>
                        </View>

                        <TouchableOpacity
                            style={styles.modalOption}
                            onPress={() => {
                                setShowMantenimientoModal(false);
                                handleMigrarCuentasAnuladas();
                            }}
                        >
                            <View style={styles.modalOptionIcon}>
                                <Ionicons name="sync-outline" size={22} color="#45beffff" />
                            </View>
                            <View style={styles.modalOptionContent}>
                                <Text style={styles.modalOptionTitle}>Migrar Cuentas Anuladas</Text>
                                <Text style={styles.modalOptionDescription}>
                                    Corrige la numeración de cuentas anuladas anteriormente
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.modalOption}
                            onPress={() => {
                                setShowMantenimientoModal(false);
                                handleLimpiarCuentas();
                            }}
                        >
                            <View style={styles.modalOptionIcon}>
                                <Ionicons name="trash-outline" size={22} color="#FF9800" />
                            </View>
                            <View style={styles.modalOptionContent}>
                                <Text style={styles.modalOptionTitle}>Limpiar Cuentas Inconsistentes</Text>
                                <Text style={styles.modalOptionDescription}>
                                    Cierra cuentas sin movimientos o con ventas anuladas
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.modalCancelButton}
                            onPress={() => setShowMantenimientoModal(false)}
                        >
                            <Text style={styles.modalCancelText}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
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
        paddingTop: 16,
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
    // Modal de mantenimiento
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 20,
        width: '100%',
        maxWidth: 400,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
    },
    modalOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: colors.surfaceVariant,
        borderRadius: 12,
        marginBottom: 12,
        gap: 12,
    },
    modalOptionIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.card,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalOptionContent: {
        flex: 1,
    },
    modalOptionTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 4,
    },
    modalOptionDescription: {
        fontSize: 13,
        color: colors.textSecondary,
        lineHeight: 18,
    },
    modalCancelButton: {
        marginTop: 8,
        padding: 16,
        backgroundColor: colors.surfaceVariant,
        borderRadius: 12,
        alignItems: 'center',
    },
    modalCancelText: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.text,
    },
});
