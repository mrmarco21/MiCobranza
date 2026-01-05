import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDate } from '../utils/helpers';

export default function CuentaCerradaCard({ cuenta, cantidadCuentas = 1, onPress }) {
    const getAvatarColor = (nombre) => {
        const colors = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336'];
        const index = nombre.charCodeAt(0) % colors.length;
        return colors[index];
    };

    const avatarColor = getAvatarColor(cuenta.clientaNombre);

    return (
        <Pressable
            style={({ pressed }) => [
                styles.container,
                pressed && styles.containerPressed
            ]}
            onPress={onPress}
        >
            <View style={styles.content}>
                {/* Avatar con gradiente */}
                <View style={[styles.avatarContainer, { backgroundColor: `${avatarColor}15` }]}>
                    <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
                        <Text style={styles.avatarText}>
                            {cuenta.clientaNombre.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                </View>

                {/* Información */}
                <View style={styles.infoContainer}>
                    <Text style={styles.clientName} numberOfLines={1}>
                        {cuenta.clientaNombre}
                    </Text>
                    
                    {cantidadCuentas === 1 ? (
                        <View style={styles.dateRow}>
                            <View style={styles.iconBadge}>
                                <Ionicons name="calendar-outline" size={12} color="#6B7280" />
                            </View>
                            <Text style={styles.dateText}>
                                {formatDate(cuenta.fechaCreacion)} - {formatDate(cuenta.fechaCierre)}
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.dateRow}>
                            <View style={styles.iconBadge}>
                                <Ionicons name="layers-outline" size={12} color="#6B7280" />
                            </View>
                            <Text style={styles.dateText}>
                                {cantidadCuentas} cuentas
                            </Text>
                        </View>
                    )}

                    {/* Badge de estado */}
                    <View style={styles.statusBadge}>
                        <View style={styles.statusDot} />
                        <Text style={styles.statusText}>
                            {cantidadCuentas === 1 ? 'Cancelada' : 'Todas canceladas'}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Indicador de navegación */}
            <View style={styles.arrowContainer}>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 20,
        marginVertical: 6,
        borderRadius: 16,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 8,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    containerPressed: {
        opacity: 0.7,
        transform: [{ scale: 0.98 }],
    },
    content: {
        flexDirection: 'row',
        padding: 16,
        alignItems: 'center',
    },
    avatarContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 20,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
    infoContainer: {
        flex: 1,
        marginRight: 8,
    },
    clientName: {
        fontSize: 17,
        fontWeight: '600',
        color: '#1A1A1A',
        marginBottom: 6,
        letterSpacing: -0.2,
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    iconBadge: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 6,
    },
    dateText: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '500',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#A7F3D0',
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#10B981',
        marginRight: 6,
    },
    statusText: {
        fontSize: 12,
        color: '#059669',
        fontWeight: '600',
        letterSpacing: 0.2,
    },
    arrowContainer: {
        position: 'absolute',
        right: 16,
        top: '50%',
        transform: [{ translateY: -10 }],
    },
});
