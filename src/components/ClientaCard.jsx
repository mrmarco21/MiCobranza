import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '../utils/helpers';

export default function ClientaCard({ clienta, onPress }) {
    return (
        <TouchableOpacity
            style={styles.container}
            onPress={onPress}
            activeOpacity={0.7}
        >
            {/* Contenido principal */}
            <View style={styles.contenidoPrincipal}>
                {/* Avatar con inicial */}
                <View style={[
                    styles.avatar,
                    { backgroundColor: clienta.saldoActual > 0 ? '#FFE5E5' : '#E8F5E9' }
                ]}>
                    <Text style={[
                        styles.avatarTexto,
                        { color: clienta.saldoActual > 0 ? '#FF6B6B' : '#4CAF50' }
                    ]}>
                        {clienta.nombre.charAt(0).toUpperCase()}
                    </Text>
                </View>

                {/* Información de la clienta */}
                <View style={styles.infoContainer}>
                    <View style={styles.nombreRow}>
                        <Text style={styles.nombre} numberOfLines={1}>
                            {clienta.nombre}
                        </Text>
                        {/* {clienta.tieneCuentaActiva && clienta.saldoActual > 0 && (
                            <View style={styles.indicadorActivo}>
                                <View style={styles.puntito} />
                            </View>
                        )} */}
                    </View>

                    {clienta.referencia ? (
                        <View style={styles.referenciaRow}>
                            <Ionicons name="person-outline" size={13} color="#95A5A6" />
                            <Text style={styles.referencia} numberOfLines={1}>
                                {clienta.referencia}
                            </Text>
                        </View>
                    ) : null}

                    {/* Badge de cuenta activa */}
                    {clienta.tieneCuentaActiva && clienta.saldoActual > 0 && (
                        <View style={styles.badgeContainer}>
                            <View style={styles.badgeActiva}>
                                <Ionicons name="checkmark-circle" size={11} color="#4CAF50" />
                                <Text style={styles.badgeTexto}>Activa</Text>
                            </View>
                        </View>
                    )}
                </View>
            </View>

            {/* Saldo y acción */}
            <View style={styles.saldoWrapper}>
                <View style={styles.saldoCard}>
                    <Text style={styles.saldoLabel}>Deuda</Text>
                    <Text style={[
                        styles.saldo,
                        clienta.saldoActual > 0 ? styles.deuda : styles.sinDeuda
                    ]}>
                        {formatCurrency(clienta.saldoActual)}
                    </Text>
                </View>
                <View style={styles.accionIcono}>
                    <Ionicons name="chevron-forward" size={18} color="#6C5CE7" />
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#FFFFFF',
        marginBottom: 12,
        padding: 16,
        borderRadius: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#F5F5F5',
    },
    contenidoPrincipal: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 12,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarTexto: {
        fontSize: 20,
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    infoContainer: {
        flex: 1,
    },
    nombreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    nombre: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2D3436',
        flex: 1,
    },
    indicadorActivo: {
        marginLeft: 6,
    },
    puntito: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#4CAF50',
    },
    referenciaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
        gap: 4,
    },
    referencia: {
        fontSize: 13,
        color: '#95A5A6',
        flex: 1,
    },
    badgeContainer: {
        flexDirection: 'row',
        marginTop: 2,
    },
    badgeActiva: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        gap: 4,
    },
    badgeTexto: {
        fontSize: 11,
        color: '#4CAF50',
        fontWeight: '600',
    },
    saldoWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    saldoCard: {
        alignItems: 'flex-end',
        backgroundColor: '#F8F9FA',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
    },
    saldoLabel: {
        fontSize: 10,
        color: '#95A5A6',
        marginBottom: 2,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    saldo: {
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    deuda: {
        color: '#FF6B6B',
    },
    sinDeuda: {
        color: '#4CAF50',
    },
    accionIcono: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: '#F0EBFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
});