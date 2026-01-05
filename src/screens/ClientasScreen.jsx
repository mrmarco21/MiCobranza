import { useState, useCallback } from 'react';
import { View, FlatList, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { obtenerClientasConSaldo } from '../logic/clientasService';
import ClientaCard from '../components/ClientaCard';
import EmptyState from '../components/EmptyState';
import Header from '../components/Header';

export default function ClientasScreen({ navigation }) {
    const [clientas, setClientas] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const insets = useSafeAreaInsets();

    useFocusEffect(
        useCallback(() => {
            cargarClientas();
        }, [])
    );

    const cargarClientas = async () => {
        const data = await obtenerClientasConSaldo();
        setClientas(data);
    };

    const clientasFiltradas = clientas.filter(c =>
        c.nombre.toLowerCase().includes(busqueda.toLowerCase())
    );

    // Calcular estadísticas
    const totalClientas = clientas.length;
    const clientasConDeuda = clientas.filter(c => c.tieneCuentaActiva && c.saldoActual > 0).length;
    const clientasAlDia = clientas.filter(c => c.tieneCuentaActiva && c.saldoActual === 0).length;
    const clientasSinCuenta = clientas.filter(c => !c.tieneCuentaActiva).length;

    return (
        <View style={styles.container}>
            <Header title="Todas las Clientas" showBack />

            {/* Header con estadísticas */}
            <View style={styles.header}>
                <View style={styles.estadisticasContainer}>
                    <View style={styles.estadisticaItem}>
                        <View style={styles.estadisticaIcono}>
                            <Ionicons name="people" size={18} color="#6C5CE7" />
                        </View>
                        <Text style={styles.estadisticaValor}>{totalClientas}</Text>
                        <Text style={styles.estadisticaLabel}>Total</Text>
                    </View>

                    <View style={styles.estadisticaItem}>
                        <View style={[styles.estadisticaIcono, { backgroundColor: '#FFE5E5' }]}>
                            <Ionicons name="alert-circle" size={18} color="#FF6B6B" />
                        </View>
                        <Text style={styles.estadisticaValor}>{clientasConDeuda}</Text>
                        <Text style={styles.estadisticaLabel}>Con deuda</Text>
                    </View>

                    {/* <View style={styles.estadisticaItem}>
                        <View style={[styles.estadisticaIcono, { backgroundColor: '#E8F5E9' }]}>
                            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                        </View>
                        <Text style={styles.estadisticaValor}>{clientasAlDia}</Text>
                        <Text style={styles.estadisticaLabel}>Al día</Text>
                    </View> */}

                    <View style={styles.estadisticaItem}>
                        <View style={[styles.estadisticaIcono, { backgroundColor: '#F5F5F5' }]}>
                            <Ionicons name="person-outline" size={18} color="#9E9E9E" />
                        </View>
                        <Text style={styles.estadisticaValor}>{clientasSinCuenta}</Text>
                        <Text style={styles.estadisticaLabel}>Sin cuenta</Text>
                    </View>
                </View>
            </View>

            {/* Sección de búsqueda */}
            <View style={styles.busquedaContainer}>
                <View style={styles.buscadorWrapper}>
                    <Ionicons name="search" size={20} color="#A0A0A0" style={styles.iconoBuscador} />
                    <TextInput
                        style={styles.buscador}
                        placeholder="Buscar por nombre..."
                        placeholderTextColor="#A0A0A0"
                        value={busqueda}
                        onChangeText={setBusqueda}
                    />
                    {busqueda.length > 0 && (
                        <TouchableOpacity onPress={() => setBusqueda('')}>
                            <Ionicons name="close-circle" size={20} color="#A0A0A0" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Título de sección con contador */}
            <View style={styles.seccionHeader}>
                <Text style={styles.seccionTitulo}>Todas las clientas</Text>
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
                        message={busqueda ? "No se encontraron resultados" : "No hay clientas registradas"}
                        iconName={busqueda ? "search-outline" : "people-outline"}
                    />
                }
                contentContainerStyle={clientasFiltradas.length === 0 ? styles.emptyContainer : styles.listaContainer}
                showsVerticalScrollIndicator={false}
            />

            {/* Botón flotante para agregar nueva clienta */}
            <TouchableOpacity
                style={[styles.botonFlotante, { bottom: 20 + insets.bottom }]}
                onPress={() => navigation.navigate('AddClienta')}
                activeOpacity={0.8}
            >
                <Ionicons name="person-add" size={28} color="#fff" />
                {/* <Text style={styles.botonFlotanteTexto}>Nueva Clienta</Text> */}
            </TouchableOpacity>
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
        paddingTop: 16,
        paddingBottom: 16,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    estadisticasContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#F8F9FA',
        borderRadius: 10,
        padding: 14,
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
        backgroundColor: '#F0EBFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 5,
    },
    estadisticaValor: {
        fontSize: 20,
        fontWeight: '700',
        color: '#2D3436',
        marginTop: 4,
    },
    estadisticaLabel: {
        fontSize: 12,
        color: '#636E72',
        marginTop: 4,
        textAlign: 'center',
    },
    busquedaContainer: {
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    buscadorWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    iconoBuscador: {
        marginRight: 10,
    },
    buscador: {
        flex: 1,
        fontSize: 15,
        color: '#2D3436',
        padding: 0,
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
        color: '#2D3436',
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
        right: 20,
        width: 56,
        height: 56,
        backgroundColor: '#9b59b6',
        borderRadius: 28, // Mitad del width/height para hacerlo circular
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#6C5CE7',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },

    botonFlotanteTexto: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '700',
        marginLeft: 8
    },
});
