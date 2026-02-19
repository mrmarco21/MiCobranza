import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency, formatDate } from '../utils/helpers';
import { useTheme } from '../hooks/useTheme';

const TIPO_GASTO_CONFIG = {
    COMPRA: {
        label: 'Compra',
        icon: 'cart',
        color: '#E91E63',
        bgColor: '#FCE4EC',
        isImage: false,
    },
    ENVIO_ORIGEN: {
        label: 'Envío Origen',
        icon: require('../../assets/shalom.png'),
        color: '#3F51B5',
        bgColor: '#E8EAF6',
        isImage: true,
    },
    INTERMEDIARIO: {
        label: 'Intermediario',
        icon: 'person',
        color: '#FF9800',
        bgColor: '#FFF3E0',
        isImage: false,
    },
    ENVIO_FINAL: {
        label: 'Envío Final',
        icon: 'car',
        color: '#00BCD4',
        bgColor: '#E0F7FA',
        isImage: false,
    },
    OTRO: {
        label: 'Otro',
        icon: 'ellipsis-horizontal',
        color: '#607D8B',
        bgColor: '#ECEFF1',
        isImage: false,
    },
};

const ESTADO_CONFIG = {
    PENDIENTE: { label: 'Pendiente', color: '#FF9800', icon: 'time' },
    EN_TRANSITO: { label: 'En Tránsito', color: '#2196F3', icon: 'navigate' },
    RECIBIDO: { label: 'Recibido', color: '#9C27B0', icon: 'checkmark-circle' },
    COMPLETADO: { label: 'Completado', color: '#4CAF50', icon: 'checkmark-done' },
};

export default function GastoCard({ gasto, onPress, onLongPress }) {
    const { colors } = useTheme();
    const styles = createStyles(colors);
    const tipoConfig = TIPO_GASTO_CONFIG[gasto.tipo] || TIPO_GASTO_CONFIG.OTRO;
    const estadoConfig = ESTADO_CONFIG[gasto.estado] || ESTADO_CONFIG.PENDIENTE;

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={onPress}
            onLongPress={onLongPress}
            activeOpacity={0.7}
        >
            {/* Icono del tipo de gasto */}
            <View style={[styles.iconContainer, { backgroundColor: tipoConfig.bgColor }]}>
                {tipoConfig.isImage ? (
                    <Image source={tipoConfig.icon} style={styles.iconImage} />
                ) : (
                    <Ionicons name={tipoConfig.icon} size={24} color={tipoConfig.color} />
                )}
            </View>

            {/* Información principal */}
            <View style={styles.infoContainer}>
                <View style={styles.headerRow}>
                    <Text style={styles.tipo}>{tipoConfig.label}</Text>
                    <Text style={styles.monto}>{formatCurrency(gasto.monto)}</Text>
                </View>

                <Text style={styles.descripcion} numberOfLines={1}>
                    {gasto.descripcion || 'Sin descripción'}
                </Text>

                {gasto.tienda && (
                    <View style={styles.metadataRow}>
                        <Ionicons name="storefront-outline" size={12} color="#95A5A6" />
                        <Text style={styles.metadataText} numberOfLines={1}>
                            {gasto.tienda}
                        </Text>
                    </View>
                )}

                <View style={styles.footerRow}>
                    <View style={styles.fechaContainer}>
                        <Ionicons name="calendar-outline" size={12} color="#95A5A6" />
                        <Text style={styles.fecha}>{formatDate(gasto.fecha)}</Text>
                    </View>

                    <View style={[styles.estadoBadge, { backgroundColor: estadoConfig.color + '15' }]}>
                        <Ionicons name={estadoConfig.icon} size={10} color={estadoConfig.color} />
                        <Text style={[styles.estadoText, { color: estadoConfig.color }]}>
                            {estadoConfig.label}
                        </Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
}

const createStyles = (colors) => StyleSheet.create({
    container: {
        backgroundColor: colors.card,
        borderRadius: 18,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 4,
        borderWidth: 1,
        borderColor: colors.border,
    },
    iconContainer: {
        width: 52,
        height: 52,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    iconImage: {
        width: 30,
        height: 30,
        resizeMode: 'contain',
    },
    infoContainer: {
        flex: 1,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 5,
    },
    tipo: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text,
        letterSpacing: -0.2,
    },
    monto: {
        fontSize: 17,
        fontWeight: '800',
        color: '#EF4444',
        letterSpacing: -0.5,
    },
    descripcion: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 8,
        fontWeight: '500',
    },
    metadataRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginBottom: 8,
    },
    metadataText: {
        fontSize: 12,
        color: colors.textSecondary,
        flex: 1,
        fontWeight: '500',
    },
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    fechaContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    fecha: {
        fontSize: 11,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    estadoBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
    },
    estadoText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
});
