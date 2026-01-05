import { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, Text, Pressable, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { obtenerCuentasCerradas, obtenerCuentasConClientas } from '../logic/cuentasService';
import CuentaCerradaCard from '../components/CuentaCerradaCard';
import EmptyState from '../components/EmptyState';
import Header from '../components/Header';

export default function CuentasCanceladasScreen({ navigation }) {
    const [clientasAgrupadas, setClientasAgrupadas] = useState([]);
    const [totalCuentas, setTotalCuentas] = useState(0);

    useFocusEffect(
        useCallback(() => {
            cargarCuentas();
        }, [])
    );

    const cargarCuentas = async () => {
        const cerradas = await obtenerCuentasCerradas();
        const conClientas = await obtenerCuentasConClientas(cerradas);
        const ordenadas = conClientas.sort((a, b) => new Date(b.fechaCierre) - new Date(a.fechaCierre));

        const agrupadas = ordenadas.reduce((acc, cuenta) => {
            const existing = acc.find(c => c.clientaId === cuenta.clientaId);
            if (existing) {
                existing.cuentas.push(cuenta);
            } else {
                acc.push({
                    clientaId: cuenta.clientaId,
                    clientaNombre: cuenta.clientaNombre,
                    cuentas: [cuenta]
                });
            }
            return acc;
        }, []);

        setClientasAgrupadas(agrupadas);
        setTotalCuentas(ordenadas.length);
    };

    const handlePress = (clienta) => {
        if (clienta.cuentas.length === 1) {
            navigation.navigate('DetalleCuenta', { cuentaId: clienta.cuentas[0].id });
        } else {
            navigation.navigate('HistorialCuentas', {
                clientaId: clienta.clientaId,
                clientaNombre: clienta.clientaNombre
            });
        }
    };

    return (
        <View style={styles.container}>
            <Header title="Cuentas Canceladas" />

            <FlatList
                data={clientasAgrupadas}
                keyExtractor={(item) => item.clientaId}
                ListHeaderComponent={
                    clientasAgrupadas.length > 0 ? (
                        <>
                            {/* Tarjeta de resumen mejorada */}
                            <View style={styles.headerSection}>
                                <Pressable
                                    style={({ pressed }) => [
                                        styles.statsCard,
                                        pressed && styles.statsCardPressed
                                    ]}
                                >
                                    <View style={styles.statsIconContainer}>
                                        <View style={styles.statsIconCircle}>
                                            <Ionicons name="checkmark-done" size={28} color="#4CAF50" />
                                        </View>
                                    </View>
                                    <View style={styles.statsContent}>
                                        <Text style={styles.statsValue}>{totalCuentas}</Text>
                                        <Text style={styles.statsLabel}>
                                            {totalCuentas === 1 ? 'Cuenta cancelada' : 'Cuentas canceladas'}
                                        </Text>
                                    </View>
                                    <View style={styles.statsDecorator}>
                                        <View style={styles.decoratorCircle1} />
                                        <View style={styles.decoratorCircle2} />
                                    </View>
                                </Pressable>
                            </View>

                            {/* Título de sección mejorado */}
                            <View style={styles.sectionHeader}>
                                <View>
                                    <Text style={styles.sectionTitle}>Historial completo</Text>
                                    <Text style={styles.sectionSubtitle}>
                                        {clientasAgrupadas.length} {clientasAgrupadas.length === 1 ? 'cliente' : 'clientes'}
                                    </Text>
                                </View>
                            </View>
                        </>
                    ) : null
                }
                renderItem={({ item }) => (
                    <CuentaCerradaCard
                        cuenta={item.cuentas[0]}
                        cantidadCuentas={item.cuentas.length}
                        onPress={() => handlePress(item)}
                    />
                )}
                ListEmptyComponent={
                    <EmptyState
                        message="No hay cuentas canceladas"
                        iconName="checkmark-done-circle-outline"
                    />
                }
                contentContainerStyle={clientasAgrupadas.length === 0 ? styles.emptyContainer : styles.listaContainer}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F7FA'
    },
    headerSection: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 8,
    },
    statsCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 24,
        flexDirection: 'row',
        alignItems: 'center',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.08,
                shadowRadius: 12,
            },
            android: {
                elevation: 4,
            },
        }),
        overflow: 'hidden',
    },
    statsCardPressed: {
        opacity: 0.95,
        transform: [{ scale: 0.98 }],
    },
    statsIconContainer: {
        marginRight: 16,
    },
    statsIconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#E8F5E9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    statsContent: {
        flex: 1,
    },
    statsValue: {
        fontSize: 32,
        fontWeight: '700',
        color: '#1A1A1A',
        letterSpacing: -0.5,
        marginBottom: 2,
    },
    statsLabel: {
        fontSize: 15,
        color: '#6B7280',
        fontWeight: '500',
    },
    statsDecorator: {
        position: 'absolute',
        right: -10,
        top: -10,
    },
    decoratorCircle1: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#E8F5E9',
        opacity: 0.3,
    },
    decoratorCircle2: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#E8F5E9',
        opacity: 0.2,
        position: 'absolute',
        top: 30,
        left: 30,
    },
    sectionHeader: {
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1A1A1A',
        letterSpacing: -0.3,
        marginBottom: 2,
    },
    sectionSubtitle: {
        fontSize: 13,
        color: '#9CA3AF',
        fontWeight: '500',
    },
    listaContainer: {
        paddingBottom: 24,
    },
    emptyContainer: {
        flex: 1,
    },
});
