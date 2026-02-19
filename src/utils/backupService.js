import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS } from '../data/storage';

/**
 * Exporta todos los datos de la app a un archivo JSON
 */
export const exportData = async () => {
  try {
    // Recopilar todos los datos
    const clientas = await AsyncStorage.getItem(KEYS.clientas);
    const cuentas = await AsyncStorage.getItem(KEYS.CUENTAS);
    const movimientos = await AsyncStorage.getItem(KEYS.MOVIMIENTOS);
    const storeName = await AsyncStorage.getItem('store_name');
    const storeLogo = await AsyncStorage.getItem('store_logo');

    const backupData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      data: {
        clientas: clientas ? JSON.parse(clientas) : [],
        cuentas: cuentas ? JSON.parse(cuentas) : [],
        movimientos: movimientos ? JSON.parse(movimientos) : [],
        storeName: storeName || 'Mi Cobranza',
        storeLogo: storeLogo || null,
      },
    };

    // Crear nombre de archivo con fecha
    const date = new Date();
    const fileName = `micobranza_backup_${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}.json`;
    const fileUri = FileSystem.documentDirectory + fileName;

    // Escribir archivo
    await FileSystem.writeAsStringAsync(
      fileUri,
      JSON.stringify(backupData, null, 2)
    );

    // Compartir archivo
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Guardar respaldo de Mi Cobranza',
        UTI: 'public.json',
      });
    }

    return { success: true, fileName };
  } catch (error) {
    console.error('Error al exportar datos:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Importa datos desde un archivo JSON
 */
export const importData = async () => {
  try {
    // Seleccionar archivo
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });

    if (result.canceled) {
      return { success: false, canceled: true };
    }

    // Leer archivo
    const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri);

    const backupData = JSON.parse(fileContent);

    // Validar estructura
    if (!backupData.version || !backupData.data) {
      return {
        success: false,
        error: 'Archivo inválido. No es un respaldo válido de Mi Cobranza.',
      };
    }

    // Validar que tenga los datos esperados
    const { clientas, cuentas, movimientos, storeName, storeLogo } = backupData.data;

    if (!Array.isArray(clientas) || !Array.isArray(cuentas) || !Array.isArray(movimientos)) {
      return {
        success: false,
        error: 'Estructura de datos inválida en el archivo.',
      };
    }

    return {
      success: true,
      data: backupData.data,
      exportDate: backupData.exportDate,
      itemCount: {
        clientas: clientas.length,
        cuentas: cuentas.length,
        movimientos: movimientos.length,
      },
    };
  } catch (error) {
    console.error('Error al importar datos:', error);
    return {
      success: false,
      error: error.message || 'Error al leer el archivo',
    };
  }
};

/**
 * Aplica los datos importados (sobrescribe los actuales)
 */
export const applyImportedData = async (importedData) => {
  try {
    const { clientas, cuentas, movimientos, storeName, storeLogo } = importedData;

    // Guardar datos
    await AsyncStorage.setItem(KEYS.clientas, JSON.stringify(clientas));
    await AsyncStorage.setItem(KEYS.CUENTAS, JSON.stringify(cuentas));
    await AsyncStorage.setItem(KEYS.MOVIMIENTOS, JSON.stringify(movimientos));

    if (storeName) {
      await AsyncStorage.setItem('store_name', storeName);
    }

    if (storeLogo) {
      await AsyncStorage.setItem('store_logo', storeLogo);
    }

    return { success: true };
  } catch (error) {
    console.error('Error al aplicar datos importados:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Fusiona los datos importados con los existentes (no sobrescribe)
 */
export const mergeImportedData = async (importedData) => {
  try {
    const { clientas, cuentas, movimientos } = importedData;

    // Obtener datos actuales
    const currentclientas = await AsyncStorage.getItem(KEYS.clientas);
    const currentCuentas = await AsyncStorage.getItem(KEYS.CUENTAS);
    const currentMovimientos = await AsyncStorage.getItem(KEYS.MOVIMIENTOS);

    const existingclientas = currentclientas ? JSON.parse(currentclientas) : [];
    const existingCuentas = currentCuentas ? JSON.parse(currentCuentas) : [];
    const existingMovimientos = currentMovimientos ? JSON.parse(currentMovimientos) : [];

    // Fusionar datos (evitar duplicados por ID)
    const mergedclientas = [...existingclientas];
    clientas.forEach((newItem) => {
      if (!mergedclientas.find((item) => item.id === newItem.id)) {
        mergedclientas.push(newItem);
      }
    });

    const mergedCuentas = [...existingCuentas];
    cuentas.forEach((newItem) => {
      if (!mergedCuentas.find((item) => item.id === newItem.id)) {
        mergedCuentas.push(newItem);
      }
    });

    const mergedMovimientos = [...existingMovimientos];
    movimientos.forEach((newItem) => {
      if (!mergedMovimientos.find((item) => item.id === newItem.id)) {
        mergedMovimientos.push(newItem);
      }
    });

    // Guardar datos fusionados
    await AsyncStorage.setItem(KEYS.clientas, JSON.stringify(mergedclientas));
    await AsyncStorage.setItem(KEYS.CUENTAS, JSON.stringify(mergedCuentas));
    await AsyncStorage.setItem(KEYS.MOVIMIENTOS, JSON.stringify(mergedMovimientos));

    return {
      success: true,
      added: {
        clientas: mergedclientas.length - existingclientas.length,
        cuentas: mergedCuentas.length - existingCuentas.length,
        movimientos: mergedMovimientos.length - existingMovimientos.length,
      },
    };
  } catch (error) {
    console.error('Error al fusionar datos:', error);
    return { success: false, error: error.message };
  }
};
