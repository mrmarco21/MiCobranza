import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency, formatDate } from '../utils/helpers';
import { useTheme } from '../hooks/useTheme';

export default function MovimientoItem({ movimiento, onPress }) {
    const { colors } = useTheme();
    const styles = createStyles(colors);
    const esCargo = movimiento.tipo === 'CARGO';

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={onPress}
            activeOpacity={0.7}
        >
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
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </View>
        </TouchableOpacity>
    );
}

const createStyles = (colors) => StyleSheet.create({
    container: {
        backgroundColor: colors.surfaceVariant,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 10,
        marginBottom: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
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
        color: colors.text,
        marginBottom: 4,
    },
    fecha: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    derecha: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
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
