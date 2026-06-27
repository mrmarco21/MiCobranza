import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '../utils/helpers';
import { useTheme } from '../hooks/useTheme';

/**
 * Tarjeta de cliente reutilizable.
 *
 * Prop `modo`:
 *  - 'deudores'  → Se sabe que el cliente tiene deuda.
 *                  No muestra badge "Activa". Muestra nº de cuentas si > 1.
 *                  Saldo siempre en rojo.
 *  - 'todos'     → Lista general. Muestra el estado (deuda / al día / sin cuenta).
 */
export default function ClientaCard({ clienta, onPress, modo = 'todos' }) {
    const { colors } = useTheme();
    const styles = createStyles(colors);

    const tieneDeuda = clienta.saldoActual > 0;
    const tieneCuenta = clienta.tieneCuentaActiva;
    const numCuentas = clienta.numeroCuentasActivas || (tieneCuenta && tieneDeuda ? 1 : 0);

    /* ── Estado visual del avatar ─────────────────────────── */
    let avatarBg, avatarColor;
    if (modo === 'deudores') {
        avatarBg = '#FFF0F0';
        avatarColor = '#EF4444';
    } else if (tieneDeuda) {
        avatarBg = '#FFF0F0';
        avatarColor = '#EF4444';
    } else if (tieneCuenta) {
        avatarBg = '#F0FFF4';
        avatarColor = '#10B981';
    } else {
        avatarBg = '#F1F5F9';
        avatarColor = '#94A3B8';
    }

    /* ── Línea de estado (modo 'todos') ───────────────────── */
    const renderEstado = () => {
        if (modo === 'deudores') {
            // Solo muestra "X cuentas" cuando son más de 1
            if (numCuentas > 1) {
                return (
                    <View style={styles.estadoRow}>
                        <View style={[styles.estadoBadge, styles.badgeCuentas]}>
                            <Ionicons name="layers" size={11} color="#F97316" />
                            <Text style={[styles.estadoBadgeTexto, { color: '#F97316' }]}>
                                {numCuentas} cuentas
                            </Text>
                        </View>
                    </View>
                );
            }
            return null;
        }

        // ── modo 'todos' ──────────────────────────────────────
        if (tieneDeuda) {
            return (
                <View style={styles.estadoRow}>
                    <View style={[styles.estadoBadge, styles.badgeDeuda]}>
                        <View style={styles.badgeDot} />
                        <Text style={[styles.estadoBadgeTexto, { color: '#EF4444' }]}>Con deuda</Text>
                    </View>
                    {numCuentas > 1 && (
                        <View style={[styles.estadoBadge, styles.badgeCuentas]}>
                            <Ionicons name="layers" size={11} color="#F97316" />
                            <Text style={[styles.estadoBadgeTexto, { color: '#F97316' }]}>
                                {numCuentas} cuentas
                            </Text>
                        </View>
                    )}
                </View>
            );
        }
        if (tieneCuenta) {
            return (
                <View style={styles.estadoRow}>
                    <View style={[styles.estadoBadge, styles.badgeAlDia]}>
                        <Ionicons name="checkmark-circle" size={11} color="#10B981" />
                        <Text style={[styles.estadoBadgeTexto, { color: '#10B981' }]}>Al día</Text>
                    </View>
                </View>
            );
        }
        return (
            <View style={styles.estadoRow}>
                <View style={[styles.estadoBadge, styles.badgeSinCuenta]}>
                    <Ionicons name="remove-circle-outline" size={11} color="#94A3B8" />
                    <Text style={[styles.estadoBadgeTexto, { color: '#94A3B8' }]}>Sin cuenta</Text>
                </View>
            </View>
        );
    };

    /* ── Saldo / etiqueta derecha ─────────────────────────── */
    const renderSaldo = () => {
        if (modo === 'deudores' || tieneDeuda) {
            return (
                <View style={[styles.saldoBox, styles.saldoBoxDeuda]}>
                    <Text style={styles.saldoBoxLabel}>DEUDA</Text>
                    <Text style={[styles.saldoBoxMonto, styles.montoDeuda]}>
                        {formatCurrency(clienta.saldoActual)}
                    </Text>
                </View>
            );
        }
        if (tieneCuenta) {
            return (
                <View style={[styles.saldoBox, styles.saldoBoxAlDia]}>
                    <Ionicons name="checkmark-circle" size={22} color="#10B981" />
                </View>
            );
        }
        return (
            <View style={[styles.saldoBox, styles.saldoBoxNeutral]}>
                <Ionicons name="person-outline" size={20} color="#94A3B8" />
            </View>
        );
    };

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={onPress}
            activeOpacity={0.7}
        >
            {/* Avatar */}
            <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
                <Text style={[styles.avatarTexto, { color: avatarColor }]}>
                    {clienta.nombre.charAt(0).toUpperCase()}
                </Text>
            </View>

            {/* Nombre + referencia + estado */}
            <View style={styles.infoContainer}>
                <Text style={styles.nombre} numberOfLines={1}>
                    {clienta.nombre}
                </Text>

                {clienta.referencia ? (
                    <View style={styles.referenciaRow}>
                        <Ionicons name="link-outline" size={12} color={colors.textTertiary} />
                        <Text style={styles.referencia} numberOfLines={1}>
                            {clienta.referencia}
                        </Text>
                    </View>
                ) : null}

                {renderEstado()}
            </View>

            {/* Saldo / estado derecho */}
            <View style={styles.derechaContainer}>
                {renderSaldo()}
                <View style={styles.chevronBox}>
                    <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                </View>
            </View>
        </TouchableOpacity>
    );
}

const createStyles = (colors) => StyleSheet.create({
    container: {
        backgroundColor: colors.card,
        marginBottom:5,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 1,
        borderWidth: 1,
        borderColor: colors.border,
    },

    // Avatar
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        flexShrink: 0,
    },
    avatarTexto: {
        fontSize: 20,
        fontWeight: '800',
        letterSpacing: -0.5,
    },

    // Información central
    infoContainer: {
        flex: 1,
        marginRight: 10,
        justifyContent: 'center',
    },
    nombre: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 3,
        letterSpacing: -0.2,
    },
    referenciaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 5,
    },
    referencia: {
        fontSize: 12,
        color: colors.textTertiary,
        flex: 1,
    },

    // Badges de estado
    estadoRow: {
        flexDirection: 'row',
        gap: 6,
        flexWrap: 'wrap',
    },
    estadoBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    estadoBadgeTexto: {
        fontSize: 11,
        fontWeight: '700',
    },
    badgeDeuda: {
        backgroundColor: '#FEF2F2',
    },
    badgeDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#EF4444',
    },
    badgeAlDia: {
        backgroundColor: '#F0FFF4',
    },
    badgeSinCuenta: {
        backgroundColor: '#F8FAFC',
    },
    badgeCuentas: {
        backgroundColor: '#FFF7ED',
    },

    // Derecha: saldo + chevron
    derechaContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexShrink: 0,
    },
    saldoBox: {
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    saldoBoxDeuda: {
        backgroundColor: '#FEF2F2',
    },
    saldoBoxAlDia: {
        backgroundColor: '#F0FFF4',
        width: 44,
        height: 44,
    },
    saldoBoxNeutral: {
        backgroundColor: '#F8FAFC',
        width: 44,
        height: 44,
    },
    saldoBoxLabel: {
        fontSize: 9,
        fontWeight: '800',
        color: '#EF4444',
        letterSpacing: 0.8,
        marginBottom: 2,
    },
    saldoBoxMonto: {
        fontSize: 15,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    montoDeuda: {
        color: '#EF4444',
    },
    chevronBox: {
        width: 28,
        height: 28,
        borderRadius: 9,
        backgroundColor: colors.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
