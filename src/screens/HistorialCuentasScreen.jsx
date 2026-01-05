import { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { obtenerCuentasCerradas } from '../logic/cuentasService';
import { formatDate } from '../utils/helpers';
import EmptyState from '../components/EmptyState';
import Header from '../components/Header';

export default function HistorialCuentasScreen({ route, navigation }) {
    const { clientaId, clientaNombre } = route.params;
    const [cuentas, setCuentas] = useState([]);

    useFocusEffect(
        useCallback(() => {
            cargarCuentas();
        }, [])
    );

    const cargarCuentas = async () => {
        const data = await obtenerCuentasCerradas(clientaId);
        setCuentas(data.sort((a, b) => new Date(b.fechaCierre) - new Date(a.fechaCierre)));
    };

    const renderCuenta = ({ item, index }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('DetalleCuenta', { cuentaId: item.id })}
            activeOpacity={0.7}
        >
            <View style={styles.cardIcono}>
                <Ionicons name="document-text-outline" size={24} color="#6C5CE7" />
            </View>
            <View style={styles.cardInfo}>
                <Text style={styles.cardTitulo}>Cuenta #{cuentas.length - index}</Text>
                <View style={styles.fechasContainer}>
                    <View style={styles.fechaRow}>
                        <Ionicons name="calendar-outline" size={12} color="#95A5A6" />
                        <Text style={styles.fechaTexto}>Abierta: {formatDate(item.fechaCreacion)}</Text>
                    </View>
                    <View style={styles.fechaRow}>
                        <Ionicons name="checkmark-circle-outline" size={12} color="#4CAF50" />
                        <Text style={styles.fechaTexto}>Cerrada: {formatDate(item.fechaCierre)}</Text>
                    </View>
                </View>
            </View>
            <View style={styles.cardDerecha}>
                <View style={styles.badge}>
                    <Text style={styles.badgeTexto}>Cancelada</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#B0B0B0" style={styles.flecha} />
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <Header title="Historial" showBack />

            {/* Header con info de la clienta */}
            <View style={styles.headerInfo}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarTexto}>
                        {clientaNombre.charAt(0).toUpperCase()}
                    </Text>
                </View>
                <View style={styles.headerTextos}>
                    <Text style={styles.headerSubtitulo}>Cuentas cerradas de</Text>
                    <Text style={styles.headerNombre}>{clientaNombre}</Text>
                </View>
                <View style={styles.contadorContainer}>
                    <Text style={styles.contadorNumero}>{cuentas.length}</Text>
                    <Text style={styles.contadorTexto}>cuentas</Text>
                </View>
            </View>

            <FlatList
                data={cuentas}
                keyExtractor={(item) => item.id}
                renderItem={renderCuenta}
                contentContainerStyle={styles.lista}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={<EmptyState message="No hay cuentas cerradas" />}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFBFC',
    },
    headerInfo: {
        backgroundColor: '#FFFFFF',
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#F0EBFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    avatarTexto: {
        fontSize: 20,
        fontWeight: '700',
        color: '#6C5CE7',
    },
    headerTextos: {
        flex: 1,
    },
    headerSubtitulo: {
        fontSize: 13,
        color: '#95A5A6',
        marginBottom: 2,
    },
    headerNombre: {
        fontSize: 18,
        fontWeight: '700',
        color: '#2D3436',
    },
    contadorContainer: {
        alignItems: 'center',
        backgroundColor: '#F8F9FA',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
    },
    contadorNumero: {
        fontSize: 20,
        fontWeight: '700',
        color: '#6C5CE7',
    },
    contadorTexto: {
        fontSize: 11,
        color: '#95A5A6',
        fontWeight: '500',
    },
    lista: {
        padding: 16,
    },
    card: {
        backgroundColor: '#FFFFFF',
        marginBottom: 12,
        padding: 16,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#F5F5F5',
    },
    cardIcono: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#F0EBFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    cardInfo: {
        flex: 1,
    },
    cardTitulo: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2D3436',
        marginBottom: 6,
    },
    fechasContainer: {
        gap: 4,
    },
    fechaRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    fechaTexto: {
        fontSize: 12,
        color: '#636E72',
        marginLeft: 6,
    },
    cardDerecha: {
        alignItems: 'flex-end',
    },
    badge: {
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        marginBottom: 8,
    },
    badgeTexto: {
        color: '#4CAF50',
        fontSize: 11,
        fontWeight: '600',
    },
    flecha: {
        marginTop: 4,
    },
});