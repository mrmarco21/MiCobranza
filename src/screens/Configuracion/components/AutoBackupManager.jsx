import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../shared/hooks/useTheme';
import {
    obtenerRespaldosAutomaticos,
    restaurarDesdeRespaldoAutomatico,
    eliminarRespaldoAutomatico,
    crearRespaldoAutomatico,
    obtenerEstadisticasRespaldos,
    setRespaldoAutomaticoEnabled,
    isRespaldoAutomaticoEnabled,
} from '../../../shared/utils/autoBackupService';

export default function AutoBackupManager({ onRestore, showModal, showToast }) {
    const { colors } = useTheme();
    const styles = createStyles(colors);
    const [backups, setBackups] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [autoBackupEnabled, setAutoBackupEnabled] = useState(true);

    useEffect(() => {
        loadBackups();
    }, []);

    const loadBackups = async () => {
        setLoading(true);
        try {
            const [backupsList, estadisticas, enabled] = await Promise.all([
                obtenerRespaldosAutomaticos(),
                obtenerEstadisticasRespaldos(),
                isRespaldoAutomaticoEnabled(),
            ]);
            setBackups(backupsList);
            setStats(estadisticas);
            setAutoBackupEnabled(enabled);
        } catch (error) {
            console.error('Error al cargar respaldos:', error);
            showToast('Error al cargar respaldos automáticos', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateBackup = async () => {
        setCreating(true);
        const result = await crearRespaldoAutomatico();
        setCreating(false);
        if (result.success) {
            showToast('Respaldo creado correctamente');
            loadBackups();
        } else {
            showToast('Error al crear respaldo', 'error');
        }
    };

    const handleRestoreBackup = async (backup) => {
        showModal({
            title: 'Restaurar Respaldo',
            message: `¿Deseas restaurar el respaldo del ${formatDate(backup.fecha)}?\n\nEsto reemplazará tus datos actuales.`,
            icon: 'refresh-outline',
            iconColor: '#FF9800',
            buttons: [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Restaurar',
                    style: 'primary',
                    onPress: async () => {
                        const result = await restaurarDesdeRespaldoAutomatico(backup.fileUri);
                        if (result.success) {
                            onRestore(result.data);
                        } else {
                            showToast('Error al restaurar respaldo', 'error');
                        }
                    },
                },
            ],
        });
    };

    const handleDeleteBackup = async (backup) => {
        showModal({
            title: 'Eliminar Respaldo',
            message: `¿Deseas eliminar el respaldo del ${formatDate(backup.fecha)}?`,
            icon: 'trash-outline',
            iconColor: '#e74c3c',
            buttons: [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        const result = await eliminarRespaldoAutomatico(backup.fileUri);
                        if (result.success) {
                            showToast('Respaldo eliminado');
                            loadBackups();
                        } else {
                            showToast('Error al eliminar respaldo', 'error');
                        }
                    },
                },
            ],
        });
    };

    const handleToggleAutoBackup = async () => {
        const newState = !autoBackupEnabled;
        const result = await setRespaldoAutomaticoEnabled(newState);
        if (result.success) {
            setAutoBackupEnabled(newState);
            showToast(
                newState
                    ? 'Respaldos automáticos activados'
                    : 'Respaldos automáticos desactivados'
            );
        } else {
            showToast('Error al cambiar configuración', 'error');
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const renderBackupItem = ({ item, index }) => (
        <View style={[
            styles.backupItem,
            index < backups.length - 1 && styles.backupItemBorder,
        ]}>
            <Ionicons name="save-outline" size={18} color={colors.primary} style={styles.backupItemIcon} />
            <View style={styles.backupInfo}>
                <Text style={styles.backupDate}>{formatDate(item.fecha)}</Text>
                <Text style={styles.backupSize}>{formatSize(item.size)}</Text>
            </View>
            <View style={styles.backupActions}>
                <TouchableOpacity
                    style={styles.backupActionButton}
                    onPress={() => handleRestoreBackup(item)}
                >
                    <Ionicons name="refresh-outline" size={17} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.backupActionButton}
                    onPress={() => handleDeleteBackup(item)}
                >
                    <Ionicons name="trash-outline" size={17} color={colors.error} />
                </TouchableOpacity>
            </View>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>Cargando respaldos...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.overviewCard}>
                {/* Toggle de respaldos automáticos */}
                <View style={styles.toggleContainer}>
                    <View style={styles.toggleIconWrapper}>
                        <Ionicons
                            name={autoBackupEnabled ? 'shield-checkmark' : 'shield-outline'}
                            size={18}
                            color={autoBackupEnabled ? '#4CAF50' : '#999'}
                        />
                    </View>
                    <View style={styles.toggleTextContainer}>
                        <Text style={styles.toggleTitle}>Respaldos Automáticos</Text>
                        <Text style={styles.toggleDescription}>
                            {autoBackupEnabled ? 'Activo · Diario a las 2 AM' : 'Desactivado'}
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={[
                            styles.toggleButton,
                            autoBackupEnabled ? styles.toggleButtonActive : styles.toggleButtonInactive,
                        ]}
                        onPress={handleToggleAutoBackup}
                        activeOpacity={0.8}
                    >
                        <View style={[
                            styles.toggleCircle,
                            autoBackupEnabled && styles.toggleCircleActive,
                        ]} />
                    </TouchableOpacity>
                </View>

                {/* Estadísticas */}
                {stats && (
                    <>
                        <View style={styles.overviewDivider} />
                        <View style={styles.statsContainer}>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{stats.totalRespaldos}</Text>
                                <Text style={styles.statLabel}>Respaldos</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Text style={styles.statValue} numberOfLines={1}>
                                    {stats.ultimoRespaldo ? formatDate(stats.ultimoRespaldo) : 'Nunca'}
                                </Text>
                                <Text style={styles.statLabel}>Último</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{formatSize(stats.espacioUsado)}</Text>
                                <Text style={styles.statLabel}>Espacio</Text>
                            </View>
                        </View>
                    </>
                )}
            </View>

            {/* Botón crear respaldo */}
            <TouchableOpacity
                style={[styles.createButton, creating && styles.createButtonDisabled]}
                onPress={handleCreateBackup}
                disabled={creating}
                activeOpacity={0.85}
            >
                {creating ? (
                    <ActivityIndicator size="small" color="#FFF" />
                ) : (
                    <Ionicons name="add-circle-outline" size={19} color="#FFF" />
                )}
                <Text style={styles.createButtonText}>
                    {creating ? 'Creando...' : 'Crear Respaldo Ahora'}
                </Text>
            </TouchableOpacity>

            {/* Lista de respaldos */}
            <View>
                <View style={styles.listHeader}>
                    <Text style={styles.listTitle}>Respaldos Locales</Text>
                    <Text style={styles.listSubtitle}>Últimos 7 guardados</Text>
                </View>

                {backups.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="folder-open-outline" size={36} color={colors.textTertiary} />
                        <Text style={styles.emptyText}>Sin respaldos aún</Text>
                        <Text style={styles.emptySubtext}>Se crean automáticamente cada día</Text>
                    </View>
                ) : (
                    <View style={styles.backupsList}>
                        <FlatList
                            data={backups}
                            renderItem={renderBackupItem}
                            keyExtractor={(item) => item.fileName}
                            scrollEnabled={false}
                        />
                    </View>
                )}
            </View>

            {/* Info */}
            <View style={styles.infoBox}>
                <Ionicons name="information-circle" size={15} color="#3498db" />
                <Text style={styles.infoText}>
                    Respaldos guardados en el dispositivo cada 24 horas. Para mayor seguridad, exporta manualmente a la nube.
                </Text>
            </View>
        </View>
    );
}

const createStyles = (colors) => StyleSheet.create({
    container: {
        gap: 10,
    },
    loadingContainer: {
        flexDirection: 'row',
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    loadingText: {
        fontSize: 13,
        color: colors.textSecondary,
    },

    // Overview
    overviewCard: {
        backgroundColor: colors.surfaceVariant,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
    },
    overviewDivider: {
        height: 1,
        backgroundColor: colors.border,
        marginHorizontal: 12,
    },
    // Toggle
    toggleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 11,
        paddingHorizontal: 12,
        gap: 10,
    },
    toggleIconWrapper: {
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    toggleTextContainer: {
        flex: 1,
    },
    toggleTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.text,
    },
    toggleDescription: {
        fontSize: 11,
        color: colors.textSecondary,
        marginTop: 1,
    },
    toggleButton: {
        width: 42,
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

    // Stats
    statsContainer: {
        flexDirection: 'row',
        paddingVertical: 8,
        paddingHorizontal: 6,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    statValue: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 1,
        textAlign: 'center',
    },
    statLabel: {
        fontSize: 10,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    statDivider: {
        width: 1,
        backgroundColor: colors.border,
        marginVertical: 4,
    },

    // Create button
    createButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: colors.primary,
        paddingVertical: 11,
        borderRadius: 12,
    },
    createButtonDisabled: {
        opacity: 0.6,
    },
    createButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#FFF',
    },

    // List header
    listHeader: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    listTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.text,
    },
    listSubtitle: {
        fontSize: 11,
        color: colors.textSecondary,
    },

    // Backup items agrupados en card
    backupsList: {
        backgroundColor: colors.surfaceVariant,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
    },
    backupItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 9,
        paddingHorizontal: 12,
    },
    backupItemBorder: {
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backupItemIcon: {
        marginRight: 8,
    },
    backupInfo: {
        flex: 1,
    },
    backupDate: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.text,
    },
    backupSize: {
        fontSize: 10,
        color: colors.textSecondary,
        marginTop: 1,
    },
    backupActions: {
        flexDirection: 'row',
        gap: 5,
    },
    backupActionButton: {
        width: 30,
        height: 30,
        borderRadius: 9,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },

    // Empty state
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 20,
        paddingHorizontal: 16,
        backgroundColor: colors.surfaceVariant,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
    },
    emptyText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textSecondary,
        marginTop: 6,
        marginBottom: 2,
    },
    emptySubtext: {
        fontSize: 11,
        color: colors.textTertiary,
        textAlign: 'center',
    },

    // Info box
    infoBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: colors.infoLight,
        paddingVertical: 9,
        paddingHorizontal: 12,
        borderRadius: 10,
        gap: 7,
    },
    infoText: {
        flex: 1,
        fontSize: 11,
        color: colors.info,
        lineHeight: 15,
    },
});
