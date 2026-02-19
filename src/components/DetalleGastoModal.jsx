import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency, formatDate } from '../utils/helpers';
import { useTheme } from '../hooks/useTheme';

const TIPO_GASTO_CONFIG = {
    COMPRA: { label: 'Compra', icon: 'cart', color: '#E91E63', isImage: false },
    ENVIO_ORIGEN: { label: 'Envío Origen', icon: require('../../assets/shalom.png'), color: '#3F51B5', isImage: true },
    INTERMEDIARIO: { label: 'Intermediario', icon: 'person', color: '#FF9800', isImage: false },
    ENVIO_FINAL: { label: 'Envío Final', icon: 'car', color: '#00BCD4', isImage: false },
    OTRO: { label: 'Otro', icon: 'ellipsis-horizontal', color: '#607D8B', isImage: false },
};

const ESTADO_CONFIG = {
    PENDIENTE: { label: 'Pendiente', color: '#FF9800', icon: 'time' },
    EN_TRANSITO: { label: 'En Tránsito', color: '#2196F3', icon: 'navigate' },
    RECIBIDO: { label: 'Recibido', color: '#9C27B0', icon: 'checkmark-circle' },
    COMPLETADO: { label: 'Completado', color: '#4CAF50', icon: 'checkmark-done' },
};

export default function DetalleGastoModal({ visible, gasto, onClose, onEditar }) {
    const { colors } = useTheme();
    const styles = createStyles(colors);

    if (!gasto) return null;

    const tipoConfig = TIPO_GASTO_CONFIG[gasto.tipo] || TIPO_GASTO_CONFIG.OTRO;
    const estadoConfig = ESTADO_CONFIG[gasto.estado] || ESTADO_CONFIG.PENDIENTE;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    activeOpacity={1}
                    onPress={onClose}
                />
                <View style={styles.container}>
                    {/* Header con color del tipo */}
                    <View style={[styles.headerBanner, { backgroundColor: tipoConfig.color }]}>
                        <View style={styles.headerContent}>
                            <View style={styles.headerIconContainer}>
                                {tipoConfig.isImage ? (
                                    <Image source={tipoConfig.icon} style={styles.headerIconImage} />
                                ) : (
                                    <Ionicons name={tipoConfig.icon} size={32} color="#FFFFFF" />
                                )}
                            </View>
                            <View style={styles.headerTextContainer}>
                                <Text style={styles.tipoLabel}>{tipoConfig.label}</Text>
                                <Text style={styles.montoLabel}>{formatCurrency(gasto.monto)}</Text>
                            </View>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={28} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>

                    {/* Content */}
                    <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
                        {/* Descripción */}
                        <View style={styles.infoCard}>
                            <View style={styles.infoHeader}>
                                <Ionicons name="document-text-outline" size={20} color={colors.primary} />
                                <Text style={styles.infoTitle}>Descripción</Text>
                            </View>
                            <Text style={styles.infoText}>{gasto.descripcion || 'Sin descripción'}</Text>
                        </View>

                        {/* Fecha y Estado */}
                        <View style={styles.rowContainer}>
                            <View style={[styles.infoCard, styles.halfCard]}>
                                <View style={styles.infoHeader}>
                                    <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                                    <Text style={styles.infoTitle}>Fecha</Text>
                                </View>
                                <Text style={styles.infoText}>{formatDate(gasto.fecha)}</Text>
                            </View>

                            <View style={[styles.infoCard, styles.halfCard]}>
                                <View style={styles.infoHeader}>
                                    <Ionicons name={estadoConfig.icon} size={20} color={estadoConfig.color} />
                                    <Text style={styles.infoTitle}>Estado</Text>
                                </View>
                                <View style={[styles.estadoChip, { backgroundColor: estadoConfig.color + '20' }]}>
                                    <Text style={[styles.estadoChipText, { color: estadoConfig.color }]}>
                                        {estadoConfig.label}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Tienda */}
                        {gasto.tienda && (
                            <View style={styles.infoCard}>
                                <View style={styles.infoHeader}>
                                    <Ionicons name="storefront-outline" size={20} color={colors.primary} />
                                    <Text style={styles.infoTitle}>Tienda / Proveedor</Text>
                                </View>
                                <Text style={styles.infoText}>{gasto.tienda}</Text>
                            </View>
                        )}

                        {/* Número de guía */}
                        {gasto.numeroGuia && (
                            <View style={styles.infoCard}>
                                <View style={styles.infoHeader}>
                                    <Ionicons name="barcode-outline" size={20} color={colors.primary} />
                                    <Text style={styles.infoTitle}>Nº de Guía / Tracking</Text>
                                </View>
                                <Text style={[styles.infoText, styles.trackingText]}>{gasto.numeroGuia}</Text>
                            </View>
                        )}

                        {/* Notas */}
                        {gasto.notas && (
                            <View style={styles.infoCard}>
                                <View style={styles.infoHeader}>
                                    <Ionicons name="chatbox-outline" size={20} color={colors.primary} />
                                    <Text style={styles.infoTitle}>Notas</Text>
                                </View>
                                <Text style={styles.notasContent}>{gasto.notas}</Text>
                            </View>
                        )}
                    </ScrollView>

                    {/* Footer con botón */}
                    <View style={styles.footerContainer}>
                        <TouchableOpacity
                            style={styles.editButton}
                            onPress={onEditar}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="create-outline" size={22} color="#FFFFFF" />
                            <Text style={styles.editButtonText}>Editar Gasto</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const createStyles = (colors) => StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: colors.card,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '90%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 10,
    },
    headerBanner: {
        paddingTop: 20,
        paddingBottom: 24,
        paddingHorizontal: 20,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    headerIconContainer: {
        width: 60,
        height: 60,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerIconImage: {
        width: 36,
        height: 36,
        resizeMode: 'contain',
    },
    headerTextContainer: {
        marginLeft: 16,
        flex: 1,
    },
    tipoLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.9)',
        marginBottom: 4,
    },
    montoLabel: {
        fontSize: 28,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: -0.5,
    },
    closeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 12,
    },
    scrollContent: {
        padding: 16,
    },
    infoCard: {
        backgroundColor: colors.background,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    infoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    infoTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginLeft: 8,
    },
    infoText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        lineHeight: 22,
    },
    trackingText: {
        fontFamily: 'monospace',
        letterSpacing: 1,
    },
    rowContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    halfCard: {
        width: '48.5%',
    },
    estadoChip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        alignSelf: 'flex-start',
    },
    estadoChipText: {
        fontSize: 13,
        fontWeight: '700',
    },
    notasContent: {
        fontSize: 15,
        fontWeight: '500',
        color: colors.textSecondary,
        lineHeight: 22,
        fontStyle: 'italic',
    },
    footerContainer: {
        padding: 20,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.card,
    },
    editButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0EA5E9',
        borderRadius: 16,
        paddingVertical: 16,
        shadowColor: '#0EA5E9',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    editButtonText: {
        fontSize: 17,
        fontWeight: '700',
        color: '#FFFFFF',
        marginLeft: 8,
    },
});
