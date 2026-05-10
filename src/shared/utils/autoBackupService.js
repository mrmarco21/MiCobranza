import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS } from '../../data/storage';

// Configuración
const AUTO_BACKUP_DIR = `${FileSystem.documentDirectory}auto_backups/`;
const MAX_AUTO_BACKUPS = 7; // Mantener últimos 7 respaldos
const LAST_BACKUP_KEY = 'last_auto_backup_date';
const AUTO_BACKUP_ENABLED_KEY = 'auto_backup_enabled';
const LAST_EXPORT_REMINDER_KEY = 'last_export_reminder';
const EXPORT_REMINDER_DAYS = 7; // Recordar cada 7 días

/**
 * Asegurar que el directorio de respaldos automáticos existe
 */
const ensureBackupDirExists = async () => {
  try {
    const dirInfo = await FileSystem.getInfoAsync(AUTO_BACKUP_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(AUTO_BACKUP_DIR, { intermediates: true });
    }
  } catch (error) {
    console.error('Error al crear directorio de respaldos:', error);
  }
};

/**
 * Recopilar TODOS los datos de la app
 */
const recopilarTodosLosDatos = async () => {
  try {
    // Datos principales
    const clientas = await AsyncStorage.getItem(KEYS.clientas);
    const cuentas = await AsyncStorage.getItem(KEYS.CUENTAS);
    const movimientos = await AsyncStorage.getItem(KEYS.MOVIMIENTOS);
    
    // Datos nuevos
    const productos = await AsyncStorage.getItem(KEYS.PRODUCTOS);
    const gastos = await AsyncStorage.getItem(KEYS.GASTOS);
    const pedidos = await AsyncStorage.getItem(KEYS.PEDIDOS);
    const ventas = await AsyncStorage.getItem(KEYS.VENTAS);
    const categorias = await AsyncStorage.getItem(KEYS.CATEGORIAS);
    
    // Borradores
    const borradores = await AsyncStorage.getItem('@borradores_punto_venta');
    
    // Configuración de la tienda
    const storeName = await AsyncStorage.getItem('store_name');
    const storeLogo = await AsyncStorage.getItem('store_logo');
    const lockTimeout = await AsyncStorage.getItem('lock_timeout');
    
    return {
      version: '2.0', // Nueva versión con todos los datos
      exportDate: new Date().toISOString(),
      data: {
        // Datos principales
        clientas: clientas ? JSON.parse(clientas) : [],
        cuentas: cuentas ? JSON.parse(cuentas) : [],
        movimientos: movimientos ? JSON.parse(movimientos) : [],
        
        // Inventario y ventas
        productos: productos ? JSON.parse(productos) : [],
        ventas: ventas ? JSON.parse(ventas) : [],
        categorias: categorias ? JSON.parse(categorias) : [],
        
        // Gastos y pedidos
        gastos: gastos ? JSON.parse(gastos) : [],
        pedidos: pedidos ? JSON.parse(pedidos) : [],
        
        // Borradores
        borradores: borradores ? JSON.parse(borradores) : [],
        
        // Configuración
        storeName: storeName || 'Mi Cobranza',
        storeLogo: storeLogo || null,
        lockTimeout: lockTimeout || '60000',
      },
    };
  } catch (error) {
    console.error('Error al recopilar datos:', error);
    throw error;
  }
};

/**
 * Crear respaldo automático
 */
export const crearRespaldoAutomatico = async () => {
  try {
    await ensureBackupDirExists();
    
    // Recopilar datos
    const backupData = await recopilarTodosLosDatos();
    
    // Crear nombre de archivo con fecha
    const date = new Date();
    const fileName = `auto_backup_${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}.json`;
    const fileUri = AUTO_BACKUP_DIR + fileName;
    
    // Escribir archivo
    await FileSystem.writeAsStringAsync(
      fileUri,
      JSON.stringify(backupData, null, 2)
    );
    
    // Actualizar fecha del último respaldo
    await AsyncStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString());
    
    // Limpiar respaldos antiguos
    await limpiarRespaldosAntiguos();
    
    console.log('✅ Respaldo automático creado:', fileName);
    return { success: true, fileName, fileUri };
  } catch (error) {
    console.error('❌ Error al crear respaldo automático:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Limpiar respaldos antiguos (mantener solo los últimos MAX_AUTO_BACKUPS)
 */
const limpiarRespaldosAntiguos = async () => {
  try {
    const dirInfo = await FileSystem.getInfoAsync(AUTO_BACKUP_DIR);
    if (!dirInfo.exists) return;
    
    const files = await FileSystem.readDirectoryAsync(AUTO_BACKUP_DIR);
    const backupFiles = files
      .filter(f => f.startsWith('auto_backup_') && f.endsWith('.json'))
      .sort()
      .reverse(); // Más recientes primero
    
    // Eliminar los más antiguos si hay más de MAX_AUTO_BACKUPS
    if (backupFiles.length > MAX_AUTO_BACKUPS) {
      const filesToDelete = backupFiles.slice(MAX_AUTO_BACKUPS);
      
      for (const file of filesToDelete) {
        await FileSystem.deleteAsync(AUTO_BACKUP_DIR + file);
        console.log('🗑️ Respaldo antiguo eliminado:', file);
      }
    }
  } catch (error) {
    console.error('Error al limpiar respaldos antiguos:', error);
  }
};

/**
 * Obtener lista de respaldos automáticos
 */
export const obtenerRespaldosAutomaticos = async () => {
  try {
    await ensureBackupDirExists();
    
    const files = await FileSystem.readDirectoryAsync(AUTO_BACKUP_DIR);
    const backupFiles = files
      .filter(f => f.startsWith('auto_backup_') && f.endsWith('.json'))
      .sort()
      .reverse(); // Más recientes primero
    
    const backups = [];
    
    for (const file of backupFiles) {
      const fileUri = AUTO_BACKUP_DIR + file;
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      
      // Extraer fecha del nombre del archivo
      const match = file.match(/auto_backup_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})/);
      let fecha = new Date();
      
      if (match) {
        const [, year, month, day, hour, minute] = match;
        fecha = new Date(year, month - 1, day, hour, minute);
      }
      
      backups.push({
        fileName: file,
        fileUri,
        fecha: fecha.toISOString(),
        size: fileInfo.size,
      });
    }
    
    return backups;
  } catch (error) {
    console.error('Error al obtener respaldos automáticos:', error);
    return [];
  }
};

/**
 * Restaurar desde un respaldo automático
 */
export const restaurarDesdeRespaldoAutomatico = async (fileUri) => {
  try {
    // Leer archivo
    const fileContent = await FileSystem.readAsStringAsync(fileUri);
    const backupData = JSON.parse(fileContent);
    
    // Validar estructura
    if (!backupData.version || !backupData.data) {
      return {
        success: false,
        error: 'Archivo inválido. No es un respaldo válido.',
      };
    }
    
    return {
      success: true,
      data: backupData.data,
      exportDate: backupData.exportDate,
      version: backupData.version,
    };
  } catch (error) {
    console.error('Error al restaurar respaldo automático:', error);
    return {
      success: false,
      error: error.message || 'Error al leer el archivo',
    };
  }
};

/**
 * Eliminar un respaldo automático específico
 */
export const eliminarRespaldoAutomatico = async (fileUri) => {
  try {
    await FileSystem.deleteAsync(fileUri);
    return { success: true };
  } catch (error) {
    console.error('Error al eliminar respaldo:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Verificar si debe ejecutarse un respaldo automático
 */
export const debeEjecutarRespaldoAutomatico = async () => {
  try {
    const enabled = await AsyncStorage.getItem(AUTO_BACKUP_ENABLED_KEY);
    if (enabled === 'false') return false;
    
    const lastBackup = await AsyncStorage.getItem(LAST_BACKUP_KEY);
    
    if (!lastBackup) return true; // Nunca se ha hecho respaldo
    
    const lastBackupDate = new Date(lastBackup);
    const now = new Date();
    
    // Verificar si ha pasado más de 24 horas
    const hoursSinceLastBackup = (now - lastBackupDate) / (1000 * 60 * 60);
    
    return hoursSinceLastBackup >= 24;
  } catch (error) {
    console.error('Error al verificar respaldo automático:', error);
    return false;
  }
};

/**
 * Obtener fecha del último respaldo
 */
export const obtenerFechaUltimoRespaldo = async () => {
  try {
    const lastBackup = await AsyncStorage.getItem(LAST_BACKUP_KEY);
    return lastBackup ? new Date(lastBackup) : null;
  } catch (error) {
    return null;
  }
};

/**
 * Habilitar/deshabilitar respaldos automáticos
 */
export const setRespaldoAutomaticoEnabled = async (enabled) => {
  try {
    await AsyncStorage.setItem(AUTO_BACKUP_ENABLED_KEY, enabled.toString());
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Verificar si los respaldos automáticos están habilitados
 */
export const isRespaldoAutomaticoEnabled = async () => {
  try {
    const enabled = await AsyncStorage.getItem(AUTO_BACKUP_ENABLED_KEY);
    return enabled !== 'false'; // Por defecto true
  } catch (error) {
    return true;
  }
};

/**
 * Verificar si debe mostrar recordatorio de exportación
 */
export const debeMostrarRecordatorioExportacion = async () => {
  try {
    const lastReminder = await AsyncStorage.getItem(LAST_EXPORT_REMINDER_KEY);
    
    if (!lastReminder) return true; // Nunca se ha mostrado
    
    const lastReminderDate = new Date(lastReminder);
    const now = new Date();
    
    // Verificar si han pasado más de EXPORT_REMINDER_DAYS días
    const daysSinceLastReminder = (now - lastReminderDate) / (1000 * 60 * 60 * 24);
    
    return daysSinceLastReminder >= EXPORT_REMINDER_DAYS;
  } catch (error) {
    return false;
  }
};

/**
 * Marcar recordatorio de exportación como mostrado
 */
export const marcarRecordatorioExportacionMostrado = async () => {
  try {
    await AsyncStorage.setItem(LAST_EXPORT_REMINDER_KEY, new Date().toISOString());
  } catch (error) {
    console.error('Error al marcar recordatorio:', error);
  }
};

/**
 * Obtener estadísticas de respaldos
 */
export const obtenerEstadisticasRespaldos = async () => {
  try {
    const backups = await obtenerRespaldosAutomaticos();
    const lastBackup = await obtenerFechaUltimoRespaldo();
    const enabled = await isRespaldoAutomaticoEnabled();
    
    return {
      totalRespaldos: backups.length,
      ultimoRespaldo: lastBackup,
      habilitado: enabled,
      espacioUsado: backups.reduce((sum, b) => sum + b.size, 0),
    };
  } catch (error) {
    return {
      totalRespaldos: 0,
      ultimoRespaldo: null,
      habilitado: true,
      espacioUsado: 0,
    };
  }
};
