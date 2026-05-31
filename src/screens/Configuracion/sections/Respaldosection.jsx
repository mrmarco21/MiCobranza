import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CollapsibleSection from '../../../shared/components/CollapsibleSection';
import AutoBackupManager from '../components/AutoBackupManager';

export default function RespaldoSection({
    colors,
    isExporting,
    isImporting,
    handleExportData,
    handleImportData,
    handleReplaceData,
    showModal,
    showToast,
}) {
    const styles = createStyles(colors);

    return (
        <CollapsibleSection
            title="Respaldo y Restauración"
            description="Protege tus datos automáticamente"
            icon="cloud-upload-outline"
            iconColor="#45beffff"
            defaultExpanded={false}
        >
            {/* Respaldos Automáticos */}
            <AutoBackupManager
                onRestore={handleReplaceData}
                showModal={showModal}
                showToast={showToast}
            />

            <View style={styles.manualCard}/>
                <View style={styles.manualHeader}>
                    <Text style={styles.manualTitle}>Exportación Manual</Text>
                    <Text style={styles.sectionDescription}>
                        Guarda o restaura tus datos desde Google Drive, WhatsApp u otro destino.
                    </Text>
                </View>

                <View style={styles.buttonsCard}>
                    <TouchableOpacity
                        style={[styles.backupButton, isExporting && styles.backupButtonDisabled]}
                        onPress={handleExportData}
                        disabled={isExporting}
                    >
                        <View style={styles.iconWrapper}>
                            {isExporting ? (
                                <ActivityIndicator size="small" color="#45beffff" />
                            ) : (
                                <Ionicons name="download-outline" size={18} color="#45beffff" />
                            )}
                        </View>
                        <View style={styles.backupButtonContent}>
                            <Text style={styles.backupButtonTitle}>Exportar y Compartir</Text>
                            <Text style={styles.backupButtonDescription}>Crear archivo y guardarlo en la nube</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                    </TouchableOpacity>

                    <View style={styles.divider} />

                    <TouchableOpacity
                        style={[styles.backupButton, isImporting && styles.backupButtonDisabled]}
                        onPress={handleImportData}
                        disabled={isImporting}
                    >
                        <View style={styles.iconWrapper}>
                            {isImporting ? (
                                <ActivityIndicator size="small" color="#45beffff" />
                            ) : (
                                <Ionicons name="cloud-upload-outline" size={18} color="#45beffff" />
                            )}
                        </View>
                        <View style={styles.backupButtonContent}>
                            <Text style={styles.backupButtonTitle}>Importar Datos</Text>
                            <Text style={styles.backupButtonDescription}>Restaurar desde un archivo externo</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
            </View>

            {/* Info compacta */}
            <View style={styles.backupInfo}>
                <Ionicons name="shield-checkmark" size={15} color="#4CAF50" />
                <Text style={styles.backupInfoText}>
                    Incluye clientes, cuentas, movimientos, productos (con imágenes), ventas, gastos y configuración. El PIN no se exporta por seguridad.
                </Text>
            </View>
        </CollapsibleSection>
    );
}

const createStyles = (colors) => StyleSheet.create({
    manualCard: {
        backgroundColor: colors.surfaceVariant,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 14,
        marginTop: 12,
        marginBottom: 10,
    },
    manualHeader: {
        marginBottom: 10,
    },
    manualTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 3,
    },
    sectionDescription: {
        fontSize: 12,
        color: colors.textSecondary,
        lineHeight: 18,
    },
    buttonsCard: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
    },
    divider: {
        height: 1,
        backgroundColor: colors.border,
        marginLeft: 48,
    },
    backupButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
    },
    backupButtonDisabled: {
        opacity: 0.5,
    },
    iconWrapper: {
        width: 34,
        height: 34,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surfaceVariant,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
    },
    backupButtonContent: {
        flex: 1,
        marginLeft: 10,
    },
    backupButtonTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 2,
    },
    backupButtonDescription: {
        fontSize: 11,
        color: colors.textSecondary,
    },
    backupInfo: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: colors.successLight,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 12,
        gap: 8,
    },
    backupInfoText: {
        flex: 1,
        fontSize: 11,
        color: colors.success,
        lineHeight: 15,
    },
});
