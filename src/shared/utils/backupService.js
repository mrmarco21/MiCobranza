import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS } from '../../data/storage';

/**
 * Exporta todos los datos de la app a un archivo JSON
 */
export const exportData = async () => {
  try {
    // Recopilar TODOS los datos
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

    const backupData = {
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
    const { 
      clientas, cuentas, movimientos, 
      productos, ventas, gastos, pedidos, categorias, borradores,
      storeName, storeLogo 
    } = backupData.data;

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
      version: backupData.version,
      itemCount: {
        clientas: clientas?.length || 0,
        cuentas: cuentas?.length || 0,
        movimientos: movimientos?.length || 0,
        productos: productos?.length || 0,
        ventas: ventas?.length || 0,
        gastos: gastos?.length || 0,
        pedidos: pedidos?.length || 0,
        categorias: categorias?.length || 0,
        borradores: borradores?.length || 0,
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
    const { 
      clientas, cuentas, movimientos,
      productos, ventas, gastos, pedidos, categorias, borradores,
      storeName, storeLogo, lockTimeout 
    } = importedData;

    // Guardar datos principales
    await AsyncStorage.setItem(KEYS.clientas, JSON.stringify(clientas || []));
    await AsyncStorage.setItem(KEYS.CUENTAS, JSON.stringify(cuentas || []));
    await AsyncStorage.setItem(KEYS.MOVIMIENTOS, JSON.stringify(movimientos || []));
    
    // Guardar inventario y ventas
    if (productos) await AsyncStorage.setItem(KEYS.PRODUCTOS, JSON.stringify(productos));
    if (ventas) await AsyncStorage.setItem(KEYS.VENTAS, JSON.stringify(ventas));
    if (categorias) await AsyncStorage.setItem(KEYS.CATEGORIAS, JSON.stringify(categorias));
    
    // Guardar gastos y pedidos
    if (gastos) await AsyncStorage.setItem(KEYS.GASTOS, JSON.stringify(gastos));
    if (pedidos) await AsyncStorage.setItem(KEYS.PEDIDOS, JSON.stringify(pedidos));
    
    // Guardar borradores
    if (borradores) await AsyncStorage.setItem('@borradores_punto_venta', JSON.stringify(borradores));

    // Guardar configuración
    if (storeName) {
      await AsyncStorage.setItem('store_name', storeName);
    }

    if (storeLogo) {
      await AsyncStorage.setItem('store_logo', storeLogo);
    }
    
    if (lockTimeout) {
      await AsyncStorage.setItem('lock_timeout', lockTimeout);
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
    const { 
      clientas, cuentas, movimientos,
      productos, ventas, gastos, pedidos, categorias, borradores
    } = importedData;

    // Obtener datos actuales principales
    const currentclientas = await AsyncStorage.getItem(KEYS.clientas);
    const currentCuentas = await AsyncStorage.getItem(KEYS.CUENTAS);
    const currentMovimientos = await AsyncStorage.getItem(KEYS.MOVIMIENTOS);

    const existingclientas = currentclientas ? JSON.parse(currentclientas) : [];
    const existingCuentas = currentCuentas ? JSON.parse(currentCuentas) : [];
    const existingMovimientos = currentMovimientos ? JSON.parse(currentMovimientos) : [];

    // Fusionar datos principales (evitar duplicados por ID)
    const mergedclientas = [...existingclientas];
    (clientas || []).forEach((newItem) => {
      if (!mergedclientas.find((item) => item.id === newItem.id)) {
        mergedclientas.push(newItem);
      }
    });

    const mergedCuentas = [...existingCuentas];
    (cuentas || []).forEach((newItem) => {
      if (!mergedCuentas.find((item) => item.id === newItem.id)) {
        mergedCuentas.push(newItem);
      }
    });

    const mergedMovimientos = [...existingMovimientos];
    (movimientos || []).forEach((newItem) => {
      if (!mergedMovimientos.find((item) => item.id === newItem.id)) {
        mergedMovimientos.push(newItem);
      }
    });

    // Guardar datos principales fusionados
    await AsyncStorage.setItem(KEYS.clientas, JSON.stringify(mergedclientas));
    await AsyncStorage.setItem(KEYS.CUENTAS, JSON.stringify(mergedCuentas));
    await AsyncStorage.setItem(KEYS.MOVIMIENTOS, JSON.stringify(mergedMovimientos));

    const added = {
      clientas: mergedclientas.length - existingclientas.length,
      cuentas: mergedCuentas.length - existingCuentas.length,
      movimientos: mergedMovimientos.length - existingMovimientos.length,
      productos: 0,
      ventas: 0,
      gastos: 0,
      pedidos: 0,
      categorias: 0,
      borradores: 0,
    };

    // Fusionar productos
    if (productos && productos.length > 0) {
      const currentProductos = await AsyncStorage.getItem(KEYS.PRODUCTOS);
      const existingProductos = currentProductos ? JSON.parse(currentProductos) : [];
      const mergedProductos = [...existingProductos];
      
      productos.forEach((newItem) => {
        if (!mergedProductos.find((item) => item.id === newItem.id)) {
          mergedProductos.push(newItem);
        }
      });
      
      await AsyncStorage.setItem(KEYS.PRODUCTOS, JSON.stringify(mergedProductos));
      added.productos = mergedProductos.length - existingProductos.length;
    }

    // Fusionar ventas
    if (ventas && ventas.length > 0) {
      const currentVentas = await AsyncStorage.getItem(KEYS.VENTAS);
      const existingVentas = currentVentas ? JSON.parse(currentVentas) : [];
      const mergedVentas = [...existingVentas];
      
      ventas.forEach((newItem) => {
        if (!mergedVentas.find((item) => item.id === newItem.id)) {
          mergedVentas.push(newItem);
        }
      });
      
      await AsyncStorage.setItem(KEYS.VENTAS, JSON.stringify(mergedVentas));
      added.ventas = mergedVentas.length - existingVentas.length;
    }

    // Fusionar gastos
    if (gastos && gastos.length > 0) {
      const currentGastos = await AsyncStorage.getItem(KEYS.GASTOS);
      const existingGastos = currentGastos ? JSON.parse(currentGastos) : [];
      const mergedGastos = [...existingGastos];
      
      gastos.forEach((newItem) => {
        if (!mergedGastos.find((item) => item.id === newItem.id)) {
          mergedGastos.push(newItem);
        }
      });
      
      await AsyncStorage.setItem(KEYS.GASTOS, JSON.stringify(mergedGastos));
      added.gastos = mergedGastos.length - existingGastos.length;
    }

    // Fusionar pedidos
    if (pedidos && pedidos.length > 0) {
      const currentPedidos = await AsyncStorage.getItem(KEYS.PEDIDOS);
      const existingPedidos = currentPedidos ? JSON.parse(currentPedidos) : [];
      const mergedPedidos = [...existingPedidos];
      
      pedidos.forEach((newItem) => {
        if (!mergedPedidos.find((item) => item.id === newItem.id)) {
          mergedPedidos.push(newItem);
        }
      });
      
      await AsyncStorage.setItem(KEYS.PEDIDOS, JSON.stringify(mergedPedidos));
      added.pedidos = mergedPedidos.length - existingPedidos.length;
    }

    // Fusionar categorías
    if (categorias && categorias.length > 0) {
      const currentCategorias = await AsyncStorage.getItem(KEYS.CATEGORIAS);
      const existingCategorias = currentCategorias ? JSON.parse(currentCategorias) : [];
      const mergedCategorias = [...existingCategorias];
      
      categorias.forEach((newItem) => {
        if (!mergedCategorias.find((item) => item.id === newItem.id)) {
          mergedCategorias.push(newItem);
        }
      });
      
      await AsyncStorage.setItem(KEYS.CATEGORIAS, JSON.stringify(mergedCategorias));
      added.categorias = mergedCategorias.length - existingCategorias.length;
    }

    // Fusionar borradores
    if (borradores && borradores.length > 0) {
      const currentBorradores = await AsyncStorage.getItem('@borradores_punto_venta');
      const existingBorradores = currentBorradores ? JSON.parse(currentBorradores) : [];
      const mergedBorradores = [...existingBorradores];
      
      borradores.forEach((newItem) => {
        if (!mergedBorradores.find((item) => item.id === newItem.id)) {
          mergedBorradores.push(newItem);
        }
      });
      
      await AsyncStorage.setItem('@borradores_punto_venta', JSON.stringify(mergedBorradores));
      added.borradores = mergedBorradores.length - existingBorradores.length;
    }

    return {
      success: true,
      added,
    };
  } catch (error) {
    console.error('Error al fusionar datos:', error);
    return { success: false, error: error.message };
  }
};
