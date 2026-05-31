import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '../../../shared/utils/helpers';
import { useTheme } from '../../../shared/hooks/useTheme';

export default function ClientaCard({
    clienta,
    onPress,
    onEdit,
    onDeactivate,
    onCobrar,
    onHistorial,
    mode = 'manage' // 'manage', 'selection', o 'pending'
}) {
    const { colors } = useTheme();
    const styles = createStyles(colors);
    const [showMenu, setShowMenu] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
    const menuButtonRef = useRef(null);

    const handleMenuPress = (e) => {
        e.stopPropagation();

        // Obtener la posición del botón
        menuButtonRef.current?.measure((fx, fy, width, height, px, py) => {
            setMenuPosition({
                top: py + height + 5, // 5px debajo del botón
                right: 16 // margen derecho
            });
            setShowMenu(true);
        });
    };

    const handleEdit = () => {
        setShowMenu(false);
        if (onEdit) onEdit(clienta);
    };

    const handleDeactivate = () => {
        setShowMenu(false);
        Alert.alert(
            'Desactivar cliente',
            `¿Estás seguro de que deseas desactivar a ${clienta.nombre}?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Desactivar',
                    style: 'destructive',
                    onPress: () => {
                        if (onDeactivate) onDeactivate(clienta);
                    }
                }
            ]
        );
    };

    const handleCobrar = (e) => {
        e.stopPropagation();
        if (onCobrar) onCobrar(clienta);
    };

    const handleHistorial = (e) => {
        e.stopPropagation();
        if (onHistorial) onHistorial(clienta);
    };

    return (
        <>
            <TouchableOpacity
                style={styles.container}
                onPress={mode === 'manage' ? undefined : onPress}
                activeOpacity={mode === 'manage' ? 1 : 0.7}
                disabled={mode === 'manage'}
            >
                {/* Contenido principal */}
                <View style={styles.contenidoPrincipal}>
                    {/* Avatar con inicial */}
                    <View style={[
                        styles.avatar,
                        { backgroundColor: mode === 'pending' ? '#FFE5E5' : '#E8F5E9' }
                    ]}>
                        <Text style={[
                            styles.avatarTexto,
                            { color: mode === 'pending' ? '#FF6B6B' : '#4CAF50' }
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
                        </View>

                        {clienta.referencia ? (
                            <View style={styles.referenciaRow}>
                                <Ionicons name="person-outline" size={13} color={colors.textSecondary} />
                                <Text style={styles.referencia} numberOfLines={1}>
                                    {clienta.referencia}
                                </Text>
                            </View>
                        ) : null}

                        {/* Badge de cuenta activa - solo en modo pending */}
                        {/* {mode === 'pending' && clienta.tieneCuentaActiva && clienta.saldoActual > 0 && (
                            <View style={styles.badgeContainer}>
                                <View style={styles.badgeActiva}>
                                    <Ionicons name="alert-circle" size={11} color="#FF6B6B" />
                                    <Text style={styles.badgeTexto}>Deuda activa</Text>
                                </View>
                            </View>
                        )} */}
                    </View>
                </View>

                {/* Saldo y acción */}
                <View style={styles.saldoWrapper}>
                    {mode === 'manage' ? (
                        // Modo Gestionar: Mostrar total consumido + menú
                        <>
                            <View style={styles.saldoCard}>
                                <Text style={styles.saldoLabel}>Total consumido</Text>
                                <Text style={styles.saldoConsumo}>
                                    {formatCurrency(clienta.totalConsumido || 0)}
                                </Text>
                            </View>
                            <TouchableOpacity
                                ref={menuButtonRef}
                                style={styles.menuIcono}
                                onPress={handleMenuPress}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="ellipsis-vertical" size={18} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </>
                    ) : (
                        // Modo Pending: Mostrar deuda + botones Cobrar e Historial
                        <View style={styles.accionesContainer}>
                            <View style={styles.deudaCard}>
                                <Text style={styles.deudaLabel}>Deuda</Text>
                                <Text style={styles.deudaMonto}>
                                    {formatCurrency(clienta.saldoActual)}
                                </Text>
                            </View>
                            <View style={styles.botonesRow}>
                                <TouchableOpacity
                                    style={styles.botonCobrar}
                                    onPress={handleCobrar}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="cash-outline" size={16} color="#FFF" />
                                    <Text style={styles.botonCobrarTexto}>Cobrar</Text>
                                </TouchableOpacity>
                                {/* <TouchableOpacity
                                    style={styles.botonHistorial}
                                    onPress={handleHistorial}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="time-outline" size={16} color={colors.primary} />
                                </TouchableOpacity> */}
                            </View>
                        </View>
                    )}
                </View>
            </TouchableOpacity>

            {/* Modal de menú contextual - solo para modo manage */}
            {mode === 'manage' && (
                <Modal
                    visible={showMenu}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setShowMenu(false)}
                >
                    <TouchableOpacity
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={() => setShowMenu(false)}
                    >
                        <View style={[styles.menuContainer, { top: menuPosition.top, right: menuPosition.right }]}>
                            <TouchableOpacity
                                style={styles.menuItem}
                                onPress={handleEdit}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="pencil-outline" size={20} color={colors.primary} />
                                <Text style={styles.menuItemText}>Editar cliente</Text>
                            </TouchableOpacity>
                            <View style={styles.menuDivider} />
                            <TouchableOpacity
                                style={styles.menuItem}
                                onPress={handleDeactivate}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="close-circle-outline" size={20} color="#FF6B6B" />
                                <Text style={[styles.menuItemText, styles.menuItemTextDanger]}>Desactivar cliente</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </Modal>
            )}
        </>
    );
}

const createStyles = (colors) => StyleSheet.create({
    container: {
        backgroundColor: colors.card,
        marginBottom: 10,
        padding: 12,
        borderRadius: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 0,
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
        color: colors.text,
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
        color: colors.textSecondary,
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
        backgroundColor: colors.surfaceVariant,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
    },
    saldoLabel: {
        fontSize: 10,
        color: colors.textSecondary,
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
    saldo: {
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    saldoConsumo: {
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: -0.5,
        color: '#4CAF50',
    },
    deuda: {
        color: '#FF6B6B',
    },
    sinDeuda: {
        color: '#4CAF50',
    },
    // Modo pending
    accionesContainer: {
        alignItems: 'flex-end',
        gap: 8,
    },
    deudaCard: {
        alignItems: 'flex-end',
        backgroundColor: colors.surfaceVariant,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
    },
    deudaLabel: {
        fontSize: 10,
        color: colors.textSecondary,
        marginBottom: 2,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    deudaMonto: {
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: -0.5,
        color: '#FF6B6B',
    },
    botonesRow: {
        flexDirection: 'row',
        gap: 6,
    },
    botonCobrar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#4CAF50',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 4,
    },
    botonCobrarTexto: {
        fontSize: 13,
        fontWeight: '600',
        color: '#FFF',
    },
    botonHistorial: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: colors.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuIcono: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: colors.surfaceVariant,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Modal de menú
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
    },
    menuContainer: {
        position: 'absolute',
        backgroundColor: colors.card,
        borderRadius: 12,
        minWidth: 200,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 12,
    },
    menuItemText: {
        fontSize: 15,
        fontWeight: '500',
        color: colors.text,
    },
    menuItemTextDanger: {
        color: '#FF6B6B',
    },
    menuDivider: {
        height: 1,
        backgroundColor: colors.border,
        marginHorizontal: 12,
    },
});

