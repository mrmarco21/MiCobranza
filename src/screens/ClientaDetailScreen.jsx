import { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { obtenerClientaConSaldo } from '../logic/clientasService';
import { obtenerCuentaActiva, obtenerCuentasCerradas } from '../logic/cuentasService';
import { obtenerMovimientosDeCuenta } from '../logic/movimientosService';
import { formatCurrency } from '../utils/helpers';
import MovimientoItem from '../components/MovimientoItem';
import Header from '../components/Header';

export default function ClientaDetailScreen({ route, navigation }) {
    const { clientaId } = route.params;
    const [clienta, setClienta] = useState(null);
    const [cuentaActiva, setCuentaActiva] = useState(null);
    const [movimientos, setMovimientos] = useState([]);
    const [numCuentasCerradas, setNumCuentasCerradas] = useState(0);

    useFocusEffect(
        useCallback(() => {
            cargarDatos();
        }, [])
    );

    const cargarDatos = async () => {
        const clientaData = await obtenerClientaConSaldo(clientaId);
        setClienta(clientaData);

        const cuenta = await obtenerCuentaActiva(clientaId);
        setCuentaActiva(cuenta);

        if (cuenta) {
            const movs = await obtenerMovimientosDeCuenta(cuenta.id);
            setMovimientos(movs);
        } else {
            setMovimientos([]);
        }

        const cerradas = await obtenerCuentasCerradas(clientaId);
        setNumCuentasCerradas(cerradas.length);
    };

    const handleNuevaCuenta = () => {
        // Navegar al formulario indicando que es una cuenta nueva
        navigation.navigate('AddMovimiento', { clientaId: clientaId, nuevaCuenta: true, tipo: 'CARGO' });
    };

    if (!clienta) return null;

    return (
        <View style={styles.container}>
            <Header title="Detalle de Clienta" showBack />

            {/* Header minimalista */}
            <View style={styles.header}>
                <View style={styles.headerContenido}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarTexto}>
                            {clienta.nombre.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                    <View style={styles.headerInfo}>
                        <Text style={styles.nombre}>{clienta.nombre}</Text>
                        {clienta.referencia && (
                            <View style={styles.infoRow}>
                                <Ionicons name="people-outline" size={14} color="#636E72" />
                                <Text style={styles.dato}>{clienta.referencia}</Text>
                            </View>
                        )}
                    </View>
                </View>
            </View>

            <ScrollView
                style={styles.contenido}
                showsVerticalScrollIndicator={false}
            >
                {cuentaActiva ? (
                    <>
                        {/* Deuda simplificada */}
                        <View style={styles.deudaCard}>
                            <Text style={styles.deudaLabel}>Deuda actual</Text>
                            <Text style={styles.deudaMonto}>{formatCurrency(cuentaActiva.saldo)}</Text>

                            {/* Botones de acción */}
                            <View style={styles.botonesAccion}>
                                <TouchableOpacity
                                    style={styles.botonAccion}
                                    onPress={() => navigation.navigate('AddMovimiento', { cuentaId: cuentaActiva.id, tipo: 'CARGO' })}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="add-outline" size={20} color="#2D3436" />
                                    <Text style={styles.botonAccionTexto}>Agregar cargo</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.botonAccion2}
                                    onPress={() => navigation.navigate('AddMovimiento', { cuentaId: cuentaActiva.id, tipo: 'ABONO' })}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="remove-outline" size={20} color="#2D3436" />
                                    <Text style={styles.botonAccionTexto}>Registrar abono</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Lista de movimientos */}
                        {movimientos.length > 0 && (
                            <View style={styles.movimientosSection}>
                                <View style={styles.sectionHeader}>
                                    <Text style={styles.sectionTitulo}>Movimientos</Text>
                                    <Text style={styles.sectionContador}>{movimientos.length}</Text>
                                </View>
                                <FlatList
                                    data={movimientos}
                                    keyExtractor={(item) => item.id}
                                    renderItem={({ item }) => <MovimientoItem movimiento={item} />}
                                    scrollEnabled={false}
                                />
                            </View>
                        )}
                    </>
                ) : (
                    /* Sin cuenta activa */
                    <View style={styles.sinCuentaCard}>
                        <View style={styles.sinCuentaIcono}>
                            <Ionicons name="folder-open-outline" size={40} color="#B0B0B0" />
                        </View>
                        <Text style={styles.sinCuentaTitulo}>Sin cuenta activa</Text>
                        <Text style={styles.sinCuentaTexto}>
                            Abre una nueva cuenta para comenzar a registrar movimientos
                        </Text>
                        <TouchableOpacity
                            style={styles.botonNuevaCuenta}
                            onPress={handleNuevaCuenta}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="add-outline" size={20} color="#2D3436" />
                            <Text style={styles.botonNuevaCuentaTexto}>Abrir nueva cuenta</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Historial minimalista */}
                {numCuentasCerradas > 0 && (
                    <TouchableOpacity
                        style={styles.botonHistorial}
                        onPress={() => navigation.navigate('HistorialCuentas', { clientaId, clientaNombre: clienta.nombre })}
                        activeOpacity={0.7}
                    >
                        <View style={styles.historialIcono}>
                            <Ionicons name="time-outline" size={20} color="#636E72" />
                        </View>
                        <View style={styles.historialTextos}>
                            <Text style={styles.historialTitulo}>Historial de cuentas</Text>
                            <Text style={styles.historialSubtitulo}>
                                {numCuentasCerradas} {numCuentasCerradas === 1 ? 'cuenta cerrada' : 'cuentas cerradas'}
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#B0B0B0" />
                    </TouchableOpacity>
                )}

                <View style={styles.espacioFinal} />
            </ScrollView>
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
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    headerContenido: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#F0F0F0',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    avatarTexto: {
        fontSize: 24,
        fontWeight: '700',
        color: '#636E72',
    },
    headerInfo: {
        flex: 1,
    },
    nombre: {
        fontSize: 20,
        fontWeight: '700',
        color: '#2D3436',
        marginBottom: 6,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    dato: {
        fontSize: 13,
        color: '#636E72',
        marginLeft: 6,
    },
    contenido: {
        flex: 1,
    },
    deudaCard: {
        backgroundColor: '#FFFFFF',
        margin: 16,
        padding: 24,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#F0F0F0',
        alignItems: "center"
    },
    deudaLabel: {
        fontSize: 14,
        color: '#636E72',
        marginBottom: 8,

    },
    deudaMonto: {
        fontSize: 36,
        fontWeight: '700',
        color: '#2D3436',
        marginBottom: 20,
    },
    botonesAccion: {
        flexDirection: 'row',
        gap: 12,
    },
    botonAccion: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: '#f40d0d3d',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    botonAccionTexto: {
        color: '#2D3436',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 6,
    },
    botonAccion2: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: '#96ffad48',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    botonAccionTexto: {
        color: '#2D3436',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 6,
    },
    movimientosSection: {
        marginHorizontal: 16,
        marginBottom: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitulo: {
        fontSize: 16,
        fontWeight: '700',
        color: '#2D3436',
    },
    sectionContador: {
        fontSize: 14,
        fontWeight: '600',
        color: '#636E72',
    },
    sinCuentaCard: {
        backgroundColor: '#FFFFFF',
        margin: 16,
        padding: 32,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    sinCuentaIcono: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#F8F9FA',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    sinCuentaTitulo: {
        fontSize: 18,
        fontWeight: '700',
        color: '#2D3436',
        marginBottom: 8,
    },
    sinCuentaTexto: {
        fontSize: 14,
        color: '#636E72',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 20,
    },
    botonNuevaCuenta: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8F9FA',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    botonNuevaCuentaTexto: {
        color: '#2D3436',
        fontSize: 15,
        fontWeight: '600',
        marginLeft: 6,
    },
    botonHistorial: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 16,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    historialIcono: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F8F9FA',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    historialTextos: {
        flex: 1,
    },
    historialTitulo: {
        fontSize: 15,
        fontWeight: '600',
        color: '#2D3436',
        marginBottom: 2,
    },
    historialSubtitulo: {
        fontSize: 13,
        color: '#636E72',
    },
    espacioFinal: {
        height: 20,
    },
});
