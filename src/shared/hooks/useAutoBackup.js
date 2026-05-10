import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import {
    debeEjecutarRespaldoAutomatico,
    crearRespaldoAutomatico,
    debeMostrarRecordatorioExportacion,
    marcarRecordatorioExportacionMostrado,
} from '../utils/autoBackupService';

/**
 * Hook para manejar respaldos automáticos y recordatorios
 */
export const useAutoBackup = (onShowReminder) => {
    const [appState, setAppState] = useState(AppState.currentState);

    useEffect(() => {
        // Verificar respaldo automático al montar
        checkAndCreateBackup();

        // Verificar recordatorio de exportación
        checkExportReminder();

        // Escuchar cambios de estado de la app
        const subscription = AppState.addEventListener('change', handleAppStateChange);

        return () => {
            subscription?.remove();
        };
    }, []);

    const handleAppStateChange = async (nextAppState) => {
        // Si la app vuelve al foreground desde el background
        if (appState.match(/inactive|background/) && nextAppState === 'active') {
            await checkAndCreateBackup();
        }
        setAppState(nextAppState);
    };

    const checkAndCreateBackup = async () => {
        try {
            const shouldBackup = await debeEjecutarRespaldoAutomatico();
            
            if (shouldBackup) {
                console.log('⏰ Ejecutando respaldo automático...');
                const result = await crearRespaldoAutomatico();
                
                if (result.success) {
                    console.log('✅ Respaldo automático creado:', result.fileName);
                } else {
                    console.error('❌ Error en respaldo automático:', result.error);
                }
            }
        } catch (error) {
            console.error('Error al verificar respaldo automático:', error);
        }
    };

    const checkExportReminder = async () => {
        try {
            const shouldShow = await debeMostrarRecordatorioExportacion();
            
            if (shouldShow && onShowReminder) {
                // Esperar 5 segundos después de abrir la app para no ser intrusivo
                setTimeout(async () => {
                    onShowReminder();
                    await marcarRecordatorioExportacionMostrado();
                }, 5000);
            }
        } catch (error) {
            console.error('Error al verificar recordatorio:', error);
        }
    };

    return {
        checkAndCreateBackup,
    };
};
