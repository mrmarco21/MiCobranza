import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CollapsibleSection from '../../../shared/components/CollapsibleSection';

const TIMEOUT_OPTIONS = [
    { label: 'Inmediato', value: 0, description: 'Pide PIN al salir de la app' },
    { label: '30 segundos', value: 30000, description: 'Pide PIN después de 30 segundos' },
    { label: '1 minuto', value: 60000, description: 'Pide PIN después de 1 minuto' },
    { label: '5 minutos', value: 300000, description: 'Pide PIN después de 5 minutos' },
    { label: '15 minutos', value: 900000, description: 'Pide PIN después de 15 minutos' },
    { label: 'Nunca', value: -1, description: 'Solo pide PIN al abrir la app' },
];

export default function SeguridadSection({
    colors,
    hasPin,
    pinEnabled,
    selectedTimeout,
    handleTimeoutChange,
    handleChangePinSecurity,
    handleDisablePin,
    handleCreatePin,
}) {
    const styles = createStyles(colors);

    return (
        <CollapsibleSection
            title="Seguridad"
            description={hasPin ? (pinEnabled ? 'PIN activado' : 'PIN desactivado') : 'Sin PIN'}
            icon="lock-closed-outline"
            iconColor="#45beffff"
            defaultExpanded={false}
        >
            {hasPin && (
                <View style={styles.content}>
                    <View style={styles.pinCard}>
                        {/* Estado del PIN */}
                        <View style={styles.pinStatusContainer}>
                            <View style={styles.pinStatusInfo}>
                                <View style={styles.pinStatusIcon}>
                                    <Ionicons
                                        name={pinEnabled ? 'shield-checkmark' : 'shield-outline'}
                                        size={20}
                                        color={pinEnabled ? '#4CAF50' : '#999'}
                                    />
                                </View>
                                <View style={styles.pinStatusTextWrap}>
                                    <Text style={styles.pinStatusText}>
                                        PIN {pinEnabled ? 'activado' : 'desactivado'}
                                    </Text>
                                    <Text style={styles.pinStatusCaption}>
                                        {pinEnabled ? 'La app solicita protección al volver' : 'La protección manual está pausada'}
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                style={[
                                    styles.toggleButton,
                                    pinEnabled ? styles.toggleButtonActive : styles.toggleButtonInactive,
                                ]}
                                onPress={handleDisablePin}
                            >
                                <View style={[styles.toggleCircle, pinEnabled && styles.toggleCircleActive]} />
                            </TouchableOpacity>
                        </View>

                        {pinEnabled && (
                            <>
                                <Text style={styles.sectionDescription}>
                                    Tiempo de bloqueo automático
                                </Text>

                                <View style={styles.optionsList}>
                                    {TIMEOUT_OPTIONS.map((option) => (
                                        <TouchableOpacity
                                            key={option.value}
                                            style={[
                                                styles.option,
                                                selectedTimeout === option.value && styles.optionSelected,
                                            ]}
                                            onPress={() => handleTimeoutChange(option.value)}
                                        >
                                            <View style={styles.optionContent}>
                                                <Text
                                                    style={[
                                                        styles.optionLabel,
                                                        selectedTimeout === option.value && styles.optionLabelSelected,
                                                    ]}
                                                >
                                                    {option.label}
                                                </Text>
                                                <Text style={styles.optionDescription}>
                                                    {option.description}
                                                </Text>
                                            </View>
                                            <View style={[
                                                styles.optionIndicator,
                                                selectedTimeout === option.value && styles.optionIndicatorSelected,
                                            ]}>
                                                {selectedTimeout === option.value && (
                                                    <Ionicons name="checkmark" size={15} color="#45beffff" />
                                                )}
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={handleChangePinSecurity}
                                >
                                    <Ionicons name="key-outline" size={18} color="#45beffff" />
                                    <Text style={styles.actionButtonText}>
                                        Cambiar PIN y Pregunta de Seguridad
                                    </Text>
                                </TouchableOpacity>
                            </>
                        )}

                        {!pinEnabled && (
                            <View style={styles.pinDisabledInfo}>
                                <Ionicons name="information-circle-outline" size={18} color="#FF9800" />
                                <Text style={styles.pinDisabledText}>
                                    El PIN está desactivado. Tu app no está protegida. Actívalo usando el interruptor de arriba.
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            )}

            {!hasPin && (
                <View style={styles.noPinCard}>
                    <View style={styles.noPinIcon}>
                        <Ionicons name="lock-open-outline" size={34} color="#FF9800" />
                    </View>
                    <Text style={styles.noPinText}>No tienes un PIN configurado</Text>
                    <Text style={styles.noPinDescription}>
                        Protege tu app con un PIN de seguridad para evitar accesos no deseados.
                    </Text>
                    <TouchableOpacity style={styles.createPinButton} onPress={handleCreatePin}>
                        <Ionicons name="add-circle" size={18} color="#FFF" />
                        <Text style={styles.createPinButtonText}>Crear PIN</Text>
                    </TouchableOpacity>
                </View>
            )}
        </CollapsibleSection>
    );
}

const createStyles = (colors) => StyleSheet.create({
    content: {
        gap: 12,
    },
    pinCard: {
        backgroundColor: colors.surfaceVariant,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 14,
    },
    sectionDescription: {
        fontSize: 12,
        color: colors.textSecondary,
        marginBottom: 10,
    },
    pinStatusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    pinStatusInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
        paddingRight: 12,
    },
    pinStatusIcon: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    pinStatusTextWrap: {
        flex: 1,
    },
    pinStatusText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
    },
    pinStatusCaption: {
        fontSize: 11,
        color: colors.textSecondary,
        marginTop: 2,
    },
    toggleButton: {
        width: 44,
        height: 24,
        borderRadius: 12,
        padding: 3,
        justifyContent: 'center',
    },
    toggleButtonActive: {
        backgroundColor: '#4CAF50',
        alignItems: 'flex-end',
    },
    toggleButtonInactive: {
        backgroundColor: colors.border,
        alignItems: 'flex-start',
    },
    toggleCircle: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: colors.card,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
    toggleCircleActive: {},
    optionsList: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 11,
        paddingHorizontal: 12,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    optionSelected: {
        backgroundColor: colors.primaryLight,
    },
    optionContent: {
        flex: 1,
        paddingRight: 12,
    },
    optionIndicator: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.card,
    },
    optionIndicatorSelected: {
        borderColor: colors.primary,
    },
    optionLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 2,
    },
    optionLabelSelected: {
        color: colors.primary,
    },
    optionDescription: {
        fontSize: 11,
        color: colors.textSecondary,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 11,
        paddingHorizontal: 14,
        borderRadius: 12,
        backgroundColor: colors.primaryLight,
        marginTop: 12,
        gap: 8,
    },
    actionButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.primary,
    },
    pinDisabledInfo: {
        flexDirection: 'row',
        backgroundColor: colors.warningLight,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 12,
        gap: 8,
    },
    pinDisabledText: {
        flex: 1,
        fontSize: 12,
        color: colors.warning,
        lineHeight: 17,
    },
    noPinCard: {
        alignItems: 'center',
        backgroundColor: colors.surfaceVariant,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        paddingVertical: 24,
        paddingHorizontal: 18,
    },
    noPinIcon: {
        width: 68,
        height: 68,
        borderRadius: 20,
        backgroundColor: colors.warningLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    noPinText: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.textSecondary,
        marginTop: 14,
        marginBottom: 6,
    },
    noPinDescription: {
        fontSize: 12,
        color: colors.textTertiary,
        textAlign: 'center',
        lineHeight: 17,
        marginBottom: 18,
    },
    createPinButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.primary,
        paddingVertical: 11,
        paddingHorizontal: 20,
        borderRadius: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    createPinButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});
