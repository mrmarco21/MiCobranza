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

    const renderBackupItem = ({ item }) => (
        <View style={styles.backupItem}>
            <View style={styles.backupIcon}>
                <Ionicons name="save-outline" size={24} color={colors.primary} />
            </View>
            <View style={styles.backupInfo}>
                <Text style={styles.backupDate}>{formatDate(item.fecha)}</Text>
                <Text style={styles.backupSize}>{formatSize(item.size)}</Text>
            </View>
            <View style={styles.backupActions}>
                <TouchableOpacity
                    style={styles.backupActionButton}
                    onPress={() => handleRestoreBackup(item)}
                >
                    <Ionicons name="refresh-outline" size={20} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.backupActionButton}
                    onPress={() => handleDeleteBackup(item)}
                >
                    <Ionicons name="trash-outline" size={20} color={colors.error} />
                </TouchableOpacity>
            </View>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Cargando respaldos...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Toggle de respaldos automáticos */}
            <View style={styles.toggleContainer}>
                <View style={styles.toggleInfo}>
                    <Ionicons
                        name={autoBackupEnabled ? "shield-checkmark" : "shield-outline"}
                        size={24}
                        color={autoBackupEnabled ? "#4CAF50" : "#999"}
                    />
                    <View style={styles.toggleTextContainer}>
                        <Text style={styles.toggleTitle}>Respaldos Automáticos</Text>
                        <Text style={styles.toggleDescription}>
                            {autoBackupEnabled ? 'Activo - Diario a las 2 AM' : 'Desactivado'}
                        </Text>
                    </View>
                </View>
                <TouchableOpacity
                    style={[
                        styles.toggleButton,
                        autoBackupEnabled ? styles.toggleButtonActive : styles.toggleButtonInactive
                    ]}
                    onPress={handleToggleAutoBackup}
                >
                    <View style={[
                        styles.toggleCircle,
                        autoBackupEnabled && styles.toggleCircleActive
                    ]} />
                </TouchableOpacity>
            </View>

            {/* Estadísticas */}
            {stats && (
                <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                        <Ionicons name="folder-outline" size={20} color={colors.primary} />
                        <Text style={styles.statValue}>{stats.totalRespaldos}</Text>
                        <Text style={styles.statLabel}>Respaldos</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Ionicons name="time-outline" size={20} color={colors.primary} />
                        <Text style={styles.statValue}>
                            {stats.ultimoRespaldo
                                ? formatDate(stats.ultimoRespaldo)
                                : 'Nunca'}
                        </Text>
                        <Text style={styles.statLabel}>Último respaldo</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Ionicons name="cloud-outline" size={20} color={colors.primary} />
                        <Text style={styles.statValue}>{formatSize(stats.espacioUsado)}</Text>
                        <Text style={styles.statLabel}>Espacio usado</Text>
                    </View>
                </View>
            )}

            {/* Botón para crear respaldo manual */}
            <TouchableOpacity
                style={[styles.createButton, creating && styles.createButtonDisabled]}
                onPress={handleCreateBackup}
                disabled={creating}
            >
                {creating ? (
                    <ActivityIndicator size="small" color="#FFF" />
                ) : (
                    <Ionicons name="add-circle-outline" size={22} color="#FFF" />
                )}
                <Text style={styles.createButtonText}>
                    {creating ? 'Creando...' : 'Crear Respaldo Ahora'}
                </Text>
            </TouchableOpacity>

            {/* Lista de respaldos */}
            <View style={styles.listHeader}>
                <Text style={styles.listTitle}>Respaldos Locales</Text>
                <Text style={styles.listSubtitle}>
                    Se mantienen los últimos 7 respaldos
                </Text>
            </View>

            {backups.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="folder-open-outline" size={48} color={colors.textTertiary} />
                    <Text style={styles.emptyText}>No hay respaldos automáticos</Text>
                    <Text style={styles.emptySubtext}>
                        Los respaldos se crean automáticamente cada día
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={backups}
                    renderItem={renderBackupItem}
                    keyExtractor={(item) => item.fileName}
                    style={styles.list}
                    scrollEnabled={false}
                />
            )}

            {/* Información */}
            <View style={styles.infoBox}>
                <Ionicons name="information-circle" size={18} color="#3498db" />
                <Text style={styles.infoText}>
                    Los respaldos automáticos se guardan en tu dispositivo y se crean cada 24 horas.
                    Para protección adicional, exporta tus datos manualmente y guárdalos en la nube.
                </Text>
            </View>
        </View>
    );
}

const createStyles = (colors) => StyleSheet.create({
    container: {
        gap: 16,
    },
    loadingContainer: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: colors.textSecondary,
    },
    toggleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.surfaceVariant,
        padding: 16,
        borderRadius: 12,
    },
    toggleInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 12,
    },
    toggleTextContainer: {
        flex: 1,
    },
    toggleTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 2,
    },
    toggleDescription: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    toggleButton: {
        width: 56,
        height: 32,
        borderRadius: 16,
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
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: colors.card,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
    statsContainer: {
        flexDirection: 'row',
        backgroundColor: colors.surfaceVariant,
        borderRadius: 12,
        padding: 12,
        gap: 8,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
        padding: 8,
    },
    statValue: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
        marginTop: 6,
        marginBottom: 2,
        textAlign: 'center',
    },
    statLabel: {
        fontSize: 11,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    createButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: colors.primary,
        padding: 14,
        borderRadius: 10,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    createButtonDisabled: {
        opacity: 0.6,
    },
    createButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#FFF',
    },
    listHeader: {
        marginTop: 8,
        marginBottom: 8,
    },
    listTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 4,
    },
    listSubtitle: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    list: {
        maxHeight: 300,
    },
    backupItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceVariant,
        padding: 12,
        borderRadius: 10,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: colors.border,
    },
    backupIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    backupInfo: {
        flex: 1,
    },
    backupDate: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 2,
    },
    backupSize: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    backupActions: {
        flexDirection: 'row',
        gap: 8,
    },
    backupActionButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    emptyContainer: {
        alignItems: 'center',
        padding: 32,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textSecondary,
        marginTop: 12,
        marginBottom: 4,
    },
    emptySubtext: {
        fontSize: 13,
        color: colors.textTertiary,
        textAlign: 'center',
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: colors.infoLight,
        padding: 12,
        borderRadius: 8,
        gap: 10,
    },
    infoText: {
        flex: 1,
        fontSize: 12,
        color: colors.info,
        lineHeight: 16,
    },
});
