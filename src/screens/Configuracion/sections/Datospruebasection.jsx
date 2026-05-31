import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CollapsibleSection from '../../../shared/components/CollapsibleSection';
import { clearAllData } from '../../../data/storage';

export default function DatosPruebaSection({ colors, showModal, showToast }) {
    const styles = createStyles(colors);

    const handleClearAllData = () => {
        showModal({
            title: 'Eliminar Todos los Datos',
            message:
                'Esto eliminará PERMANENTEMENTE:\n\n• Todas las clientas\n• Todas las cuentas\n• Todos los movimientos\n• Todos los gastos\n• Configuración de la tienda\n• PIN y seguridad\n\n¿Estás completamente seguro?',
            icon: 'warning',
            iconColor: '#e74c3c',
            buttons: [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Sí, Eliminar Todo',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await clearAllData();
                            showModal({
                                title: 'Datos Eliminados',
                                message:
                                    'Todos los datos han sido eliminados. Cierra y vuelve a abrir la app para empezar de nuevo.',
                                icon: 'checkmark-circle',
                                iconColor: '#4CAF50',
                                buttons: [{ text: 'OK', style: 'primary' }],
                            });
                        } catch (error) {
                            showToast('Error al eliminar los datos', 'error');
                            console.error('Error clearing data:', error);
                        }
                    },
                },
            ],
        });
    };

    return (
        <CollapsibleSection
            title="Datos de Prueba"
            description="Eliminar todos los datos de la app"
            icon="trash-outline"
            iconColor="#e74c3c"
            defaultExpanded={false}
        >
            <View style={styles.dangerCard}>
                <Text style={styles.sectionDescription}>
                    Esta opción eliminará TODOS los datos de la aplicación, incluyendo clientes, cuentas,
                    movimientos, gastos y configuración.
                </Text>

                <View style={styles.backupInfo}>
                    <Ionicons name="warning" size={18} color="#FF9800" />
                    <Text style={[styles.backupInfoText, { color: '#FF9800' }]}>
                        Esta acción no se puede deshacer. Te recomendamos hacer un respaldo antes de continuar.
                    </Text>
                </View>

                <TouchableOpacity
                    style={[styles.actionButton, styles.dangerButton]}
                    onPress={handleClearAllData}
                >
                    <Ionicons name="trash-outline" size={18} color={colors.error} />
                    <Text style={[styles.actionButtonText, styles.dangerButtonText]}>
                        Eliminar Todos los Datos
                    </Text>
                </TouchableOpacity>
            </View>
        </CollapsibleSection>
    );
}

const createStyles = (colors) => StyleSheet.create({
    dangerCard: {
        backgroundColor: colors.surfaceVariant,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 14,
    },
    sectionDescription: {
        fontSize: 12,
        color: colors.textSecondary,
        lineHeight: 18,
        marginBottom: 12,
    },
    backupInfo: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: colors.warningLight,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 12,
        gap: 8,
    },
    backupInfoText: {
        flex: 1,
        fontSize: 11,
        color: colors.success,
        lineHeight: 16,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 11,
        paddingHorizontal: 14,
        borderRadius: 12,
        backgroundColor: colors.primaryLight,
        marginTop: 12,
    },
    actionButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.primary,
    },
    dangerButton: {
        backgroundColor: colors.errorLight,
    },
    dangerButtonText: {
        color: colors.error,
    },
});
