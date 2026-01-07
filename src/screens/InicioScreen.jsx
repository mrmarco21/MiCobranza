import { useState, useCallback } from 'react';
import { View, FlatList, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { obtenerClientasConSaldo } from '../logic/clientasService';
import { clearAllData } from '../data/storage';
import { formatCurrency } from '../utils/helpers';
import ClientaCard from '../components/ClientaCard';
import EmptyState from '../components/EmptyState';
import Header from '../components/Header';
import CustomModal from '../components/CustomModal';

export default function InicioScreen({ navigation }) {
    const [clientasConDeuda, setClientasConDeuda] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [modalConfig, setModalConfig] = useState({});

    const showModal = (config) => {
        setModalConfig(config);
        setModalVisible(true);
    };

    useFocusEffect(
        useCallback(() => {
            cargarClientas();
        }, [])
    );

    const cargarClientas = async () => {
        const data = await obtenerClientasConSaldo();
        const conDeuda = data.filter(c => c.tieneCuentaActiva && c.saldoActual > 0);
        setClientasConDeuda(conDeuda);
    };

    const limpiarDatos = () => {
        showModal({
            type: 'warning',
            title: 'Limpiar datos',
            message: '¿Estás segura de eliminar TODOS los datos? Esta acción no se puede deshacer.',
            confirmText: 'Eliminar todo',
            cancelText: 'Cancelar',
            showCancel: true,
            destructive: true,
            onConfirm: async () => {
                await clearAllData();
                setClientasConDeuda([]);
                showModal({
                    type: 'success',
                    title: 'Listo',
                    message: 'Todos los datos han sido eliminados',
                });
            }
        });
    };

    const clientasFiltradas = clientasConDeuda.filter(c =>
        c.nombre.toLowerCase().includes(busqueda.toLowerCase())
    );

    const totalPorCobrar = clientasConDeuda.reduce((sum, c) => sum + c.saldoActual, 0);

    return (
        <View style={styles.container}>
            <Header title="Inicio" showAddButton />

            {/* Header con estadísticas mejorado */}
            <View style={styles.header}>
                {/* Botón temporal para limpiar datos - ELIMINAR DESPUÉS */}
                {/* <TouchableOpacity
                    style={styles.botonLimpiar}
                    onPress={limpiarDatos}
                >
                    <Ionicons name="trash-outline" size={16} color="#FFF" />
                    <Text style={styles.textoLimpiar}>Limpiar todos los datos</Text>
                </TouchableOpacity> */}

                <View style={styles.estadisticasGrid}>
                    {/* Card Clientas Activas */}
                    <View style={styles.estadisticaCard}>
                        <View style={styles.estadisticaIcono}>
                            <Ionicons name="people" size={22} color="#6C5CE7" />
                        </View>
                        <Text style={styles.estadisticaValor}>{clientasConDeuda.length}</Text>
                        <Text style={styles.estadisticaLabel}>Clientas activas</Text>
                    </View>

                    {/* Card Total por Cobrar */}
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

            {/* Botón de navegación principal mejorado */}
            <View style={styles.accionesContainer}>
                <TouchableOpacity
                    style={styles.botonPrincipal}
                    onPress={() => navigation.navigate('Clientas')}
                    activeOpacity={0.7}
                >
                    <View style={styles.botonContenido}>
                        <View style={styles.botonIconContainer}>
                            <Ionicons name="list" size={22} color="#6C5CE7" />
                        </View>
                        <View style={styles.botonTextoContainer}>
                            <Text style={styles.botonTitulo}>Gestionar clientas</Text>
                            <Text style={styles.botonSubtitulo}>Ver y administrar todas las clientas</Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#B0B0B0" />
                </TouchableOpacity>
            </View>

            {/* Sección de búsqueda mejorada */}
            {clientasConDeuda.length > 0 && (
                <View style={styles.busquedaContainer}>
                    <View style={styles.buscadorWrapper}>
                        <Ionicons name="search" size={18} color="#A0A0A0" />
                        <TextInput
                            style={styles.buscador}
                            placeholder="Buscar por nombre..."
                            placeholderTextColor="#A0A0A0"
                            value={busqueda}
                            onChangeText={setBusqueda}
                        />
                        {busqueda.length > 0 && (
                            <TouchableOpacity onPress={() => setBusqueda('')} style={styles.botonLimpiarBusqueda}>
                                <Ionicons name="close-circle" size={20} color="#A0A0A0" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            )}

            {/* Título de sección mejorado */}
            <View style={styles.seccionHeader}>
                <View style={styles.seccionTituloWrapper}>
                    <Ionicons name="wallet-outline" size={20} color="#2D3436" />
                    <Text style={styles.seccionTitulo}>Cuentas pendientes</Text>
                </View>
                <View style={styles.seccionContador}>
                    <Text style={styles.seccionContadorTexto}>
                        {clientasFiltradas.length}
                    </Text>
                </View>
            </View>

            {/* Lista de clientas */}
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
                        message={busqueda ? "No se encontraron resultados" : "No hay clientas con deuda activa"}
                        iconName={busqueda ? "search-outline" : "checkmark-done-circle-outline"}
                    />
                }
                contentContainerStyle={clientasFiltradas.length === 0 ? styles.emptyContainer : styles.listaContainer}
                showsVerticalScrollIndicator={false}
            />

            <CustomModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                {...modalConfig}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFBFC'
    },
    header: {
        backgroundColor: '#FFFFFF',
        paddingTop: 20,
        paddingBottom: 20,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    botonLimpiar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FF6B6B',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        marginBottom: 16,
    },
    textoLimpiar: {
        color: '#FFF',
        fontWeight: '600',
        marginLeft: 8,
        fontSize: 14,
    },
    estadisticasGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    estadisticaCard: {
        flex: 1,
        backgroundColor: '#F8F9FA',
        borderRadius: 16,
        padding: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F0EBFF',
    },
    estadisticaCardDestacado: {
        flex: 1,
        backgroundColor: '#FFF5F5',
        borderRadius: 16,
        padding: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FFE5E5',
    },
    estadisticaIcono: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#F0EBFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    estadisticaIconoDestacado: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#FFE5E5',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    estadisticaValor: {
        fontSize: 22,
        fontWeight: '700',
        color: '#2D3436',
        marginBottom: 4,
        letterSpacing: -0.5,
    },
    estadisticaValorDestacado: {
        fontSize: 20,
        fontWeight: '700',
        color: '#FF6B6B',
        marginBottom: 4,
        letterSpacing: -0.5,
    },
    estadisticaLabel: {
        fontSize: 11,
        color: '#636E72',
        textAlign: 'center',
        fontWeight: '500',
    },
    estadisticaLabelDestacado: {
        fontSize: 11,
        color: '#636E72',
        textAlign: 'center',
        fontWeight: '500',
    },
    accionesContainer: {
        paddingHorizontal: 16,
        paddingTop: 12,
    },
    botonPrincipal: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#F5F5F5',
    },
    botonContenido: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    botonIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#F0EBFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    botonTextoContainer: {
        flex: 1,
    },
    botonTitulo: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2D3436',
        marginBottom: 2,
    },
    botonSubtitulo: {
        fontSize: 11,
        color: '#95A5A6',
    },
    busquedaContainer: {
        paddingHorizontal: 16,
        paddingTop: 10,
    },
    buscadorWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F5F5F5',
        gap: 10,
    },
    buscador: {
        flex: 1,
        fontSize: 14,
        color: '#2D3436',
        padding: 0,
    },
    botonLimpiarBusqueda: {
        padding: 4,
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
        color: '#2D3436',
    },
    seccionContador: {
        backgroundColor: '#F0EBFF',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        minWidth: 32,
        alignItems: 'center',
    },
    seccionContadorTexto: {
        fontSize: 13,
        fontWeight: '700',
        color: '#6C5CE7',
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