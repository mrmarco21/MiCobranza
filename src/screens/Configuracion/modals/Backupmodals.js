import { exportData, importData, applyImportedData, mergeImportedData } from '../../../shared/utils/backupService';

/**
 * Agrupa toda la lógica de modales relacionados a backup/restauración.
 * Recibe showModal, showToast, setIsExporting, setIsImporting como dependencias.
 */

export function createBackupModals({ showModal, showToast, setIsExporting, setIsImporting }) {

    const handleExportData = async () => {
        showModal({
            title: 'Exportar Datos',
            message: 'Se creará un archivo ZIP con TODOS tus datos e imágenes comprimidas. Con muchos productos puede tardar varios minutos. Podrás compartirlo directamente por WhatsApp, Drive, Email, etc.',
            icon: 'download-outline',
            iconColor: '#45beffff',
            buttons: [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Exportar',
                    style: 'primary',
                    onPress: async () => {
                        let currentProgress = { step: 'Iniciando...', progress: 0 };

                        showModal({
                            title: 'Exportando...',
                            message: `${currentProgress.step}\n\nProgreso: ${currentProgress.progress}%`,
                            icon: 'time-outline',
                            iconColor: '#45beffff',
                            buttons: [],
                        });

                        setIsExporting(true);

                        await new Promise(resolve => setTimeout(resolve, 100));

                        const onProgress = (progressData) => {
                            currentProgress = progressData;
                            showModal({
                                title: 'Exportando...',
                                message: `${progressData.step}\n\nProgreso: ${progressData.progress}%`,
                                icon: 'time-outline',
                                iconColor: '#45beffff',
                                buttons: [],
                            });
                        };

                        const result = await exportData(onProgress);
                        setIsExporting(false);

                        if (result.success) {
                            showModal({
                                title: 'Exportación Exitosa',
                                message: result.message || `Archivo ZIP creado: ${result.fileName}`,
                                icon: 'checkmark-circle',
                                iconColor: '#4CAF50',
                                buttons: [{ text: 'OK', style: 'primary' }],
                            });
                        } else {
                            showModal({
                                title: 'Error',
                                message: `No se pudo exportar: ${result.error}`,
                                icon: 'alert-circle',
                                iconColor: '#e74c3c',
                                buttons: [{ text: 'OK', style: 'primary' }],
                            });
                        }
                    },
                },
            ],
        });
    };

    const handleReplaceData = async (importedData) => {
        showModal({
            title: 'Confirmar Reemplazo',
            message: 'Esto ELIMINARÁ todos tus datos actuales y los reemplazará con los del respaldo. Esta acción no se puede deshacer.\n\n¿Estás seguro?',
            icon: 'warning',
            iconColor: '#FF9800',
            buttons: [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Sí, Reemplazar',
                    style: 'destructive',
                    onPress: async () => {
                        // Modal de progreso — sin botones para que no se pueda cerrar
                        showModal({
                            title: 'Importando...',
                            message: 'Eliminando datos actuales...\n\nProgreso: 0%',
                            icon: 'time-outline',
                            iconColor: '#45beffff',
                            buttons: [],
                        });

                        await new Promise(resolve => setTimeout(resolve, 100));

                        const onProgress = (progressData) => {
                            showModal({
                                title: 'Importando...',
                                message: `${progressData.step}\n\nProgreso: ${progressData.progress}%`,
                                icon: 'time-outline',
                                iconColor: '#45beffff',
                                buttons: [],
                            });
                        };

                        const result = await applyImportedData(importedData, onProgress);

                        if (result.success) {
                            showModal({
                                title: 'Importación Exitosa',
                                message: 'Datos restaurados correctamente. Reinicia la app para ver los cambios.',
                                icon: 'checkmark-circle',
                                iconColor: '#4CAF50',
                                buttons: [{ text: 'OK', style: 'primary' }],
                            });
                        } else {
                            showModal({
                                title: 'Error',
                                message: `No se pudo importar: ${result.error}`,
                                icon: 'alert-circle',
                                iconColor: '#e74c3c',
                                buttons: [{ text: 'OK', style: 'primary' }],
                            });
                        }
                    },
                },
            ],
        });
    };

    const handleMergeData = async (importedData) => {
        // Modal de progreso — sin botones para que no se pueda cerrar
        showModal({
            title: 'Fusionando...',
            message: 'Comparando datos existentes...\n\nProgreso: 0%',
            icon: 'time-outline',
            iconColor: '#45beffff',
            buttons: [],
        });

        await new Promise(resolve => setTimeout(resolve, 100));

        const onProgress = (progressData) => {
            showModal({
                title: 'Fusionando...',
                message: `${progressData.step}\n\nProgreso: ${progressData.progress}%`,
                icon: 'time-outline',
                iconColor: '#45beffff',
                buttons: [],
            });
        };

        const result = await mergeImportedData(importedData, onProgress);

        if (result.success) {
            const { added } = result;
            const totalAdded = Object.values(added).reduce((sum, val) => sum + val, 0);

            showModal({
                title: 'Fusión Exitosa',
                message: `Se agregaron ${totalAdded} elementos nuevos:\n\n` +
                    `• ${added.clientas} clientes\n` +
                    `• ${added.cuentas} cuentas\n` +
                    `• ${added.movimientos} movimientos\n` +
                    `• ${added.productos} productos\n` +
                    `• ${added.ventas} ventas\n` +
                    `• ${added.gastos} gastos\n` +
                    `• ${added.pedidos} pedidos\n\n` +
                    `Reinicia la app para ver los cambios.`,
                icon: 'checkmark-circle',
                iconColor: '#4CAF50',
                buttons: [{ text: 'OK', style: 'primary' }],
            });
        } else {
            showModal({
                title: 'Error',
                message: `No se pudo fusionar: ${result.error}`,
                icon: 'alert-circle',
                iconColor: '#e74c3c',
                buttons: [{ text: 'OK', style: 'primary' }],
            });
        }
    };

    const handleImportData = async () => {
        showModal({
            title: 'Importar Datos',
            message: 'Selecciona un archivo de respaldo. Podrás elegir si reemplazar o fusionar con tus datos actuales.',
            icon: 'cloud-upload-outline',
            iconColor: '#45beffff',
            buttons: [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Seleccionar Archivo',
                    style: 'primary',
                    onPress: async () => {
                        // Cerrar el modal actual y abrir el picker
                        setIsImporting(true);

                        // Variable para almacenar el progreso actual
                        let currentProgress = { step: 'Iniciando...', progress: 0 };
                        let progressModalShown = false;

                        const onProgress = (progressData) => {
                            currentProgress = progressData;
                            
                            // Mostrar el modal de progreso solo la primera vez que se reporta progreso
                            // (esto significa que el usuario ya seleccionó un archivo)
                            if (!progressModalShown) {
                                progressModalShown = true;
                            }
                            
                            showModal({
                                title: 'Leyendo archivo...',
                                message: `${progressData.step}\n\nProgreso: ${progressData.progress}%`,
                                icon: 'time-outline',
                                iconColor: '#45beffff',
                                buttons: [],
                            });
                        };

                        // Llamar a importData - el modal de progreso se mostrará automáticamente
                        // cuando el usuario seleccione un archivo
                        const result = await importData(onProgress);
                        setIsImporting(false);

                        // Si el usuario canceló en el picker, no hacer nada
                        if (result.canceled) return;

                        if (!result.success) {
                            showModal({
                                title: 'Error',
                                message: result.error || 'No se pudo leer el archivo',
                                icon: 'alert-circle',
                                iconColor: '#e74c3c',
                                buttons: [{ text: 'OK', style: 'primary' }],
                            });
                            return;
                        }

                        const { itemCount, exportDate } = result;
                        const date = new Date(exportDate);
                        const formattedDate = date.toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                        });

                        showModal({
                            title: 'Archivo Válido',
                            message: `Respaldo del ${formattedDate}\n\n` +
                                `• ${itemCount.clientas} clientes\n` +
                                `• ${itemCount.cuentas} cuentas\n` +
                                `• ${itemCount.movimientos} movimientos\n` +
                                `• ${itemCount.productos || 0} productos\n` +
                                `• ${itemCount.ventas || 0} ventas\n` +
                                `• ${itemCount.gastos || 0} gastos\n` +
                                `• ${itemCount.pedidos || 0} pedidos\n\n` +
                                `¿Cómo deseas importar?`,
                            icon: 'document-text',
                            iconColor: '#3498db',
                            buttons: [
                                { text: 'Cancelar', style: 'cancel' },
                                {
                                    text: 'Fusionar',
                                    style: 'primary',
                                    onPress: () => handleMergeData(result.data),
                                },
                                {
                                    text: 'Reemplazar Todo',
                                    style: 'destructive',
                                    onPress: () => handleReplaceData(result.data),
                                },
                            ],
                        });
                    },
                },
            ],
        });
    };

    return { handleExportData, handleImportData, handleReplaceData, handleMergeData };
}