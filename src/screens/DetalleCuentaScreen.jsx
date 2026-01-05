import { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as cuentasRepo from '../data/cuentasRepository';
import { obtenerMovimientosDeCuenta } from '../logic/movimientosService';
import { formatDate, formatCurrency } from '../utils/helpers';
import MovimientoItem from '../components/MovimientoItem';
import EmptyState from '../components/EmptyState';
import Header from '../components/Header';

export default function DetalleCuentaScreen({ route }) {
    const { cuentaId } = route.params;
    const [cuenta, setCuenta] = useState(null);
    const [movimientos, setMovimientos] = useState([]);

    useEffect(() => {
        cargarDatos();
    }, []);

    const cargarDatos = async () => {
        const cuentaData = await cuentasRepo.getById(cuentaId);
        setCuenta(cuentaData);
        const movs = await obtenerMovimientosDeCuenta(cuentaId);
        setMovimientos(movs);
    };

    if (!cuenta) return null;

    const esCancelada = cuenta.estado === 'CERRADA';

    // Calcular totales
    const totalCargos = movimientos
        .filter(m => m.tipo === 'CARGO')
        .reduce((sum, m) => sum + m.monto, 0);
    const totalAbonos = movimientos
        .filter(m => m.tipo === 'ABONO')
        .reduce((sum, m) => sum + m.monto, 0);

    return (
        <View style={styles.container}>
            <Header title="Detalle Cuenta" showBack />

            <ScrollView
                style={styles.contenido}
                showsVerticalScrollIndicator={false}
            >
                {/* Card principal con estado */}
                <View style={styles.cardPrincipal}>
                    <View style={styles.cardHeader}>
                        <View style={styles.iconoContainer}>
                            <Ionicons
                                name={esCancelada ? "checkmark-circle" : "document-text"}
                                size={28}
                                color={esCancelada ? "#4CAF50" : "#6C5CE7"}
                            />
                        </View>
                        <View style={styles.cardHeaderInfo}>
                            <Text style={styles.cardTitulo}>
                                Cuenta {esCancelada ? 'Cancelada' : 'Activa'}
                            </Text>
                            <View style={[styles.estadoBadge, esCancelada && styles.estadoBadgeCancelada]}>
                                <Text style={[styles.estadoTexto, esCancelada && styles.estadoTextoCancelada]}>
                                    {esCancelada ? 'Pagada' : 'Pendiente'}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Fechas */}
                    <View style={styles.fechasContainer}>
                        <View style={styles.fechaItem}>
                            <Ionicons name="calendar-outline" size={16} color="#95A5A6" />
                            <Text style={styles.fechaLabel}>Inicio</Text>
                            <Text style={styles.fechaValor}>{formatDate(cuenta.fechaCreacion)}</Text>
                        </View>

                        {cuenta.fechaCierre && (
                            <View style={styles.fechaItem}>
                                <Ionicons name="checkmark-done-outline" size={16} color="#4CAF50" />
                                <Text style={styles.fechaLabel}>Cierre</Text>
                                <Text style={styles.fechaValor}>{formatDate(cuenta.fechaCierre)}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Resumen de totales */}
                {movimientos.length > 0 && (
                    <View style={styles.resumenContainer}>
                        <View style={styles.resumenItem}>
                            <View style={[styles.resumenIcono, { backgroundColor: '#FFEBEE' }]}>
                                <Ionicons name="arrow-up" size={16} color="#FF6B6B" />
                            </View>
                            <View>
                                <Text style={styles.resumenLabel}>Total cargos</Text>
                                <Text style={[styles.resumenMonto, { color: '#FF6B6B' }]}>
                                    {formatCurrency(totalCargos)}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.resumenDivider} />
                        <View style={styles.resumenItem}>
                            <View style={[styles.resumenIcono, { backgroundColor: '#E8F5E9' }]}>
                                <Ionicons name="arrow-down" size={16} color="#4CAF50" />
                            </View>
                            <View>
                                <Text style={styles.resumenLabel}>Total abonos</Text>
                                <Text style={[styles.resumenMonto, { color: '#4CAF50' }]}>
                                    {formatCurrency(totalAbonos)}
                                </Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Sección de movimientos */}
                <View style={styles.movimientosSection}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitulo}>Historial de movimientos</Text>
                        {movimientos.length > 0 && (
                            <View style={styles.contadorBadge}>
                                <Text style={styles.sectionContador}>{movimientos.length}</Text>
                            </View>
                        )}
                    </View>

                    {movimientos.length > 0 ? (
                        <FlatList
                            data={movimientos}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => <MovimientoItem movimiento={item} />}
                            scrollEnabled={false}
                        />
                    ) : (
                        <EmptyState
                            message="No hay movimientos registrados"
                            iconName="receipt-outline"
                        />
                    )}
                </View>

                <View style={styles.espacioFinal} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFBFC',
    },
    contenido: {
        flex: 1,
    },
    cardPrincipal: {
        backgroundColor: '#FFFFFF',
        margin: 16,
        padding: 8,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#F5F5F5',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    iconoContainer: {
        width: 50,
        height: 50,
        borderRadius: 28,
        backgroundColor: '#F8F9FA',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    cardHeaderInfo: {
        flex: 1,
    },
    cardTitulo: {
        fontSize: 18,
        fontWeight: '700',
        color: '#2D3436',
        marginBottom: 6,
    },
    estadoBadge: {
        alignSelf: 'flex-start',
        backgroundColor: '#F0EBFF',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    estadoBadgeCancelada: {
        backgroundColor: '#E8F5E9',
    },
    estadoTexto: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6C5CE7',
    },
    estadoTextoCancelada: {
        color: '#4CAF50',
    },
    fechasContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    fechaItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8F9FA',
        padding: 12,
        borderRadius: 10,
        gap: 8,
    },
    fechaLabel: {
        fontSize: 11,
        color: '#95A5A6',
    },
    fechaValor: {
        fontSize: 11,
        fontWeight: '600',
        color: '#2D3436',
    },
    resumenContainer: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16,
        marginBottom: 16,
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
    resumenItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    resumenIcono: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    resumenLabel: {
        fontSize: 12,
        color: '#95A5A6',
        marginBottom: 2,
    },
    resumenMonto: {
        fontSize: 16,
        fontWeight: '700',
    },
    resumenDivider: {
        width: 1,
        height: 40,
        backgroundColor: '#F0F0F0',
        marginHorizontal: 12,
    },
    movimientosSection: {
        paddingHorizontal: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitulo: {
        fontSize: 17,
        fontWeight: '700',
        color: '#2D3436',
    },
    contadorBadge: {
        backgroundColor: '#F0EBFF',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    sectionContador: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6C5CE7',
    },
    espacioFinal: {
        height: 20,
    },
});
