import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency, formatDate } from '../utils/helpers';

export default function MovimientoItem({ movimiento }) {
    const esCargo = movimiento.tipo === 'CARGO';

    return (
        <View style={styles.container}>
            <View style={styles.izquierda}>
                <View style={[styles.icono, esCargo ? styles.iconoCargo : styles.iconoAbono]}>
                    <Ionicons 
                        name={esCargo ? "arrow-up" : "arrow-down"} 
                        size={18} 
                        color={esCargo ? "#FF6B6B" : "#4CAF50"} 
                    />
                </View>
                <View style={styles.info}>
                    <Text style={styles.comentario} numberOfLines={1}>
                        {movimiento.comentario || 'Sin descripción'}
                    </Text>
                    <Text style={styles.fecha}>{formatDate(movimiento.fecha)}</Text>
                </View>
            </View>
            <View style={styles.derecha}>
                <Text style={[styles.monto, esCargo ? styles.montoRojo : styles.montoVerde]}>
                    {esCargo ? '+' : '-'} {formatCurrency(movimiento.monto)}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#FAFBFC',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 10,
        marginBottom: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    izquierda: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 12,
    },
    icono: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    iconoCargo: {
        backgroundColor: '#FFE5E5',
    },
    iconoAbono: {
        backgroundColor: '#E8F5E9',
    },
    info: {
        flex: 1,
    },
    comentario: {
        fontSize: 15,
        fontWeight: '500',
        color: '#2D3436',
        marginBottom: 4,
    },
    fecha: {
        fontSize: 12,
        color: '#95A5A6',
    },
    derecha: {
        alignItems: 'flex-end',
    },
    monto: {
        fontSize: 16,
        fontWeight: '700',
    },
    montoRojo: {
        color: '#FF6B6B',
    },
    montoVerde: {
        color: '#4CAF50',
    },
});
