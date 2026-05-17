import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS } from '../../data/storage';
import { Alert } from 'react-native';

/**
 * Convierte una imagen del sistema de archivos a Base64
 * SIN límites de tamaño - incluye todas las imágenes
 */
const imageToBase64 = async (imagePath) => {
  try {
    if (!imagePath) return null;
    
    // Si ya es Base64, devolverla tal cual
    if (imagePath.startsWith('data:image')) {
      return imagePath;
    }
    
    // Verificar que el archivo existe
    const fileInfo = await FileSystem.getInfoAsync(imagePath);
    if (!fileInfo.exists) {
      console.warn(`Imagen no encontrada: ${imagePath}`);
      return null;
    }
    
    // Leer como Base64 (sin límite de tamaño)
    const base64 = await FileSystem.readAsStringAsync(imagePath, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    // Retornar con el prefijo data:image
    return `data:image/jpeg;base64,${base64}`;
  } catch (error) {
    console.error('Error al convertir imagen a Base64:', error);
    return null;
  }
};

/**
 * Exporta todos los datos de la app en MÚLTIPLES ARCHIVOS
 * Solución real para evitar OutOfMemoryError dividiendo el backup en partes
 * INCLUYE TODAS LAS IMÁGENES SIN EXCEPCIÓN
 */
export const exportData = async () => {
  try {
    console.log('🚀 Iniciando exportación en múltiples partes...');
    
    // Crear directorio temporal para los archivos de backup
    const date = new Date();
    const timestamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}`;
    const backupDir = `${FileSystem.documentDirectory}backup_${timestamp}/`;
    
    // Crear directorio
    await FileSystem.makeDirectoryAsync(backupDir, { intermediates: true });
    
    // ========== PARTE 1: DATOS PRINCIPALES (sin imágenes) ==========
    console.log('📦 Parte 1/4: Exportando datos principales...');
    const clientas = await AsyncStorage.getItem(KEYS.clientas);
    const cuentas = await AsyncStorage.getItem(KEYS.CUENTAS);
    const movimientos = await AsyncStorage.getItem(KEYS.MOVIMIENTOS);
    const gastos = await AsyncStorage.getItem(KEYS.GASTOS);
    const pedidos = await AsyncStorage.getItem(KEYS.PEDIDOS);
    const ventas = await AsyncStorage.getItem(KEYS.VENTAS);
    const categorias = await AsyncStorage.getItem(KEYS.CATEGORIAS);
    const borradores = await AsyncStorage.getItem('@borradores_punto_venta');
    
    const parte1 = {
      partNumber: 1,
      totalParts: 4,
      timestamp,
      version: '3.0',
      type: 'main_data',
      data: {
        clientas: clientas ? JSON.parse(clientas) : [],
        cuentas: cuentas ? JSON.parse(cuentas) : [],
        movimientos: movimientos ? JSON.parse(movimientos) : [],
        gastos: gastos ? JSON.parse(gastos) : [],
        pedidos: pedidos ? JSON.parse(pedidos) : [],
        ventas: ventas ? JSON.parse(ventas) : [],
        categorias: categorias ? JSON.parse(categorias) : [],
        borradores: borradores ? JSON.parse(borradores) : [],
      },
    };
    
    await FileSystem.writeAsStringAsync(
      `${backupDir}parte1_datos.json`,
      JSON.stringify(parte1),
      { encoding: FileSystem.EncodingType.UTF8 }
    );
    
    // ========== PARTE 2: PRODUCTOS (sin imágenes) ==========
    console.log('📦 Parte 2/4: Exportando productos (sin imágenes)...');
    const productos = await AsyncStorage.getItem(KEYS.PRODUCTOS);
    const productosData = productos ? JSON.parse(productos) : [];
    
    // Crear copia de productos sin las imágenes
    const productosSinImagenes = productosData.map(p => ({
      ...p,
      imagen: null,
      imagenes: [],
      _hasImages: !!(p.imagen || (p.imagenes && p.imagenes.length > 0))
    }));
    
    const parte2 = {
      partNumber: 2,
      totalParts: 4,
      timestamp,
      version: '3.0',
      type: 'products_data',
      data: {
        productos: productosSinImagenes,
      },
    };
    
    await FileSystem.writeAsStringAsync(
      `${backupDir}parte2_productos.json`,
      JSON.stringify(parte2),
      { encoding: FileSystem.EncodingType.UTF8 }
    );
    
    // ========== PARTE 3: IMÁGENES DE PRODUCTOS (en lotes) ==========
    console.log('📦 Parte 3/4: Exportando imágenes de productos...');
    const productosConImagenes = productosData.filter(p => 
      p.imagen || (p.imagenes && p.imagenes.length > 0)
    );
    
    let totalImagenesExportadas = 0;
    const PRODUCTOS_POR_ARCHIVO = 10; // 10 productos por archivo
    const archivosImagenes = [];
    
    for (let i = 0; i < productosConImagenes.length; i += PRODUCTOS_POR_ARCHIVO) {
      const batch = productosConImagenes.slice(i, i + PRODUCTOS_POR_ARCHIVO);
      const archivoNum = Math.floor(i / PRODUCTOS_POR_ARCHIVO) + 1;
      
      console.log(`  📸 Procesando lote ${archivoNum} (${batch.length} productos)...`);
      
      const productosConImagenesBase64 = [];
      
      for (const producto of batch) {
        const productoConImagenes = {
          id: producto.id,
          imagen: null,
          imagenes: [],
        };
        
        // Convertir imagen principal
        if (producto.imagen) {
          productoConImagenes.imagen = await imageToBase64(producto.imagen);
          if (productoConImagenes.imagen) totalImagenesExportadas++;
        }
        
        // Convertir array de imágenes
        if (producto.imagenes && Array.isArray(producto.imagenes)) {
          for (const imagenPath of producto.imagenes) {
            const base64 = await imageToBase64(imagenPath);
            if (base64) {
              productoConImagenes.imagenes.push(base64);
              totalImagenesExportadas++;
            }
          }
        }
        
        productosConImagenesBase64.push(productoConImagenes);
        
        // Pequeña pausa para liberar memoria
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      const parteImagenes = {
        partNumber: `3.${archivoNum}`,
        totalParts: 4,
        timestamp,
        version: '3.0',
        type: 'product_images',
        batchNumber: archivoNum,
        data: {
          productImages: productosConImagenesBase64,
        },
      };
      
      const nombreArchivo = `parte3_imagenes_${archivoNum}.json`;
      await FileSystem.writeAsStringAsync(
        `${backupDir}${nombreArchivo}`,
        JSON.stringify(parteImagenes),
        { encoding: FileSystem.EncodingType.UTF8 }
      );
      
      archivosImagenes.push(nombreArchivo);
      
      console.log(`  ✅ Lote ${archivoNum} guardado`);
    }
    
    console.log(`✅ ${totalImagenesExportadas} imágenes exportadas en ${archivosImagenes.length} archivos`);
    
    // ========== PARTE 4: CONFIGURACIÓN Y METADATOS ==========
    console.log('📦 Parte 4/4: Exportando configuración...');
    const storeName = await AsyncStorage.getItem('store_name');
    const storeLogo = await AsyncStorage.getItem('store_logo');
    const lockTimeout = await AsyncStorage.getItem('lock_timeout');
    
    // Convertir logo de la tienda
    let storeLogoBase64 = storeLogo;
    if (storeLogo && !storeLogo.startsWith('data:image')) {
      storeLogoBase64 = await imageToBase64(storeLogo);
    }
    
    const parte4 = {
      partNumber: 4,
      totalParts: 4,
      timestamp,
      version: '3.0',
      type: 'config',
      imageFilesCount: archivosImagenes.length,
      imageFilesList: archivosImagenes,
      data: {
        storeName: storeName || 'Mi Cobranza',
        storeLogo: storeLogoBase64 || null,
        lockTimeout: lockTimeout || '60000',
      },
      summary: {
        clientas: parte1.data.clientas.length,
        cuentas: parte1.data.cuentas.length,
        movimientos: parte1.data.movimientos.length,
        productos: parte2.data.productos.length,
        ventas: parte1.data.ventas.length,
        gastos: parte1.data.gastos.length,
        pedidos: parte1.data.pedidos.length,
        totalImagenes: totalImagenesExportadas,
      },
    };
    
    await FileSystem.writeAsStringAsync(
      `${backupDir}parte4_config.json`,
      JSON.stringify(parte4),
      { encoding: FileSystem.EncodingType.UTF8 }
    );
    
    // ========== CREAR ARCHIVO README ==========
    const readme = `BACKUP DE MI COBRANZA
=====================
Fecha: ${new Date().toLocaleString('es-ES')}
Versión: 3.0 (Backup Multi-Parte)

ARCHIVOS INCLUIDOS:
- parte1_datos.json: Datos principales (clientas, cuentas, movimientos, ventas, gastos, pedidos)
- parte2_productos.json: Información de productos (sin imágenes)
- parte3_imagenes_*.json: Imágenes de productos (${archivosImagenes.length} archivos)
- parte4_config.json: Configuración y metadatos

RESUMEN:
- Clientas: ${parte4.summary.clientas}
- Cuentas: ${parte4.summary.cuentas}
- Movimientos: ${parte4.summary.movimientos}
- Productos: ${parte4.summary.productos}
- Ventas: ${parte4.summary.ventas}
- Gastos: ${parte4.summary.gastos}
- Pedidos: ${parte4.summary.pedidos}
- Imágenes: ${parte4.summary.totalImagenes}

INSTRUCCIONES DE IMPORTACIÓN:
1. Guarda TODOS los archivos juntos en una carpeta
2. En la app, ve a Configuración > Importar Datos
3. Selecciona el archivo parte4_config.json
4. La app importará automáticamente todas las partes

IMPORTANTE: No elimines ningún archivo, todos son necesarios para la importación completa.
`;
    
    await FileSystem.writeAsStringAsync(
      `${backupDir}LEEME.txt`,
      readme,
      { encoding: FileSystem.EncodingType.UTF8 }
    );
    
    console.log('✅ Backup completo creado');
    
    // Compartir la carpeta completa (Android soporta compartir directorios)
    if (await Sharing.isAvailableAsync()) {
      try {
        // Intentar compartir el directorio completo
        await Sharing.shareAsync(backupDir, {
          mimeType: 'application/octet-stream',
          dialogTitle: `Guardar backup completo de Mi Cobranza (${4 + archivosImagenes.length} archivos)`,
        });
      } catch (shareError) {
        console.warn('No se pudo compartir la carpeta, intentando con archivo individual:', shareError);
        // Si falla compartir la carpeta, compartir el archivo de configuración
        await Sharing.shareAsync(`${backupDir}parte4_config.json`, {
          mimeType: 'application/json',
          dialogTitle: 'Guardar backup de Mi Cobranza (Parte 4 - Config)',
          UTI: 'public.json',
        });
      }
    }
    
    return { 
      success: true, 
      backupDir,
      timestamp,
      totalParts: 4 + archivosImagenes.length,
      summary: parte4.summary,
      message: `Backup creado con ${4 + archivosImagenes.length} archivos. Guarda TODOS los archivos juntos.`,
    };
  } catch (error) {
    console.error('Error al exportar datos:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Importa datos desde un archivo JSON (soporta versión antigua y nueva multi-parte)
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
    if (!backupData.version) {
      return {
        success: false,
        error: 'Archivo inválido. No es un respaldo válido de Mi Cobranza.',
      };
    }

    // ========== BACKUP MULTI-PARTE (Versión 3.0) ==========
    if (backupData.version === '3.0') {
      console.log('📦 Detectado backup multi-parte versión 3.0');
      
      // Verificar que sea el archivo de configuración (parte 4)
      if (backupData.type !== 'config') {
        return {
          success: false,
          error: 'Por favor selecciona el archivo "parte4_config.json" para iniciar la importación.',
        };
      }
      
      // Obtener el directorio del archivo seleccionado
      const fileUri = result.assets[0].uri;
      const dirPath = fileUri.substring(0, fileUri.lastIndexOf('/') + 1);
      
      console.log('📂 Directorio de backup:', dirPath);
      
      // Intentar leer todas las partes
      try {
        // Parte 1: Datos principales
        console.log('📖 Leyendo parte 1: Datos principales...');
        const parte1Content = await FileSystem.readAsStringAsync(`${dirPath}parte1_datos.json`);
        const parte1 = JSON.parse(parte1Content);
        
        // Parte 2: Productos
        console.log('📖 Leyendo parte 2: Productos...');
        const parte2Content = await FileSystem.readAsStringAsync(`${dirPath}parte2_productos.json`);
        const parte2 = JSON.parse(parte2Content);
        
        // Parte 3: Imágenes (múltiples archivos)
        console.log('📖 Leyendo parte 3: Imágenes...');
        const imageFilesList = backupData.imageFilesList || [];
        const productImages = {};
        
        for (const imageFile of imageFilesList) {
          try {
            const imageContent = await FileSystem.readAsStringAsync(`${dirPath}${imageFile}`);
            const imagePart = JSON.parse(imageContent);
            
            // Mapear imágenes por ID de producto
            for (const prodImg of imagePart.data.productImages) {
              productImages[prodImg.id] = {
                imagen: prodImg.imagen,
                imagenes: prodImg.imagenes,
              };
            }
            
            console.log(`  ✅ ${imageFile} leído`);
          } catch (imgError) {
            console.warn(`  ⚠️ No se pudo leer ${imageFile}:`, imgError.message);
          }
        }
        
        // Combinar productos con sus imágenes
        const productosCompletos = parte2.data.productos.map(producto => {
          const imagenes = productImages[producto.id];
          return {
            ...producto,
            imagen: imagenes?.imagen || producto.imagen,
            imagenes: imagenes?.imagenes || producto.imagenes || [],
          };
        });
        
        // Preparar datos combinados
        const combinedData = {
          ...parte1.data,
          productos: productosCompletos,
          storeName: backupData.data.storeName,
          storeLogo: backupData.data.storeLogo,
          lockTimeout: backupData.data.lockTimeout,
        };
        
        console.log('✅ Todas las partes leídas correctamente');
        
        return {
          success: true,
          data: combinedData,
          exportDate: backupData.timestamp,
          version: backupData.version,
          isMultiPart: true,
          itemCount: {
            clientas: combinedData.clientas?.length || 0,
            cuentas: combinedData.cuentas?.length || 0,
            movimientos: combinedData.movimientos?.length || 0,
            productos: combinedData.productos?.length || 0,
            ventas: combinedData.ventas?.length || 0,
            gastos: combinedData.gastos?.length || 0,
            pedidos: combinedData.pedidos?.length || 0,
            categorias: combinedData.categorias?.length || 0,
            borradores: combinedData.borradores?.length || 0,
          },
        };
        
      } catch (readError) {
        console.error('Error al leer partes del backup:', readError);
        return {
          success: false,
          error: `No se pudieron leer todos los archivos del backup. Asegúrate de que todos los archivos estén en la misma carpeta. Error: ${readError.message}`,
        };
      }
    }
    
    // ========== BACKUP ANTIGUO (Versión 2.x) ==========
    if (!backupData.data) {
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
      isMultiPart: false,
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
 * Convierte una imagen Base64 a archivo en el sistema de archivos
 */
const base64ToImage = async (base64Data, productId) => {
  try {
    if (!base64Data) return null;
    
    // Si no es Base64, asumir que es una ruta válida
    if (!base64Data.startsWith('data:image')) {
      return base64Data;
    }
    
    // Crear directorio de imágenes si no existe
    const IMAGES_DIR = `${FileSystem.documentDirectory}product_images/`;
    const dirInfo = await FileSystem.getInfoAsync(IMAGES_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(IMAGES_DIR, { intermediates: true });
    }
    
    // Extraer el Base64 puro (sin el prefijo data:image)
    const base64Pure = base64Data.split(',')[1];
    
    // Generar nombre único para la imagen
    const fileName = `${productId}_${Date.now()}.jpg`;
    const destPath = `${IMAGES_DIR}${fileName}`;
    
    // Guardar como archivo
    await FileSystem.writeAsStringAsync(destPath, base64Pure, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    return destPath;
  } catch (error) {
    console.error('Error al convertir Base64 a imagen:', error);
    return null;
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
    
    // Procesar productos para restaurar imágenes desde Base64
    if (productos && productos.length > 0) {
      // console.log('📸 Restaurando imágenes de productos...');
      let totalImagenes = 0;
      
      const productosConImagenesRestauradas = await Promise.all(
        productos.map(async (producto) => {
          const productoRestaurado = { ...producto };
          
          // Restaurar imagen principal (retrocompatibilidad)
          if (producto.imagen && producto.imagen.startsWith('data:image')) {
            const imagenPath = await base64ToImage(producto.imagen, producto.id);
            productoRestaurado.imagen = imagenPath;
            if (imagenPath) totalImagenes++;
          }
          
          // Restaurar array de imágenes (múltiples imágenes)
          if (producto.imagenes && Array.isArray(producto.imagenes) && producto.imagenes.length > 0) {
            const imagenesRestauradas = [];
            for (let i = 0; i < producto.imagenes.length; i++) {
              const imagenBase64 = producto.imagenes[i];
              if (imagenBase64 && imagenBase64.startsWith('data:image')) {
                const imagenPath = await base64ToImage(imagenBase64, `${producto.id}_${i}`);
                if (imagenPath) {
                  imagenesRestauradas.push(imagenPath);
                  totalImagenes++;
                }
              } else if (imagenBase64) {
                // Si no es Base64, mantener la ruta (compatibilidad con backups antiguos)
                imagenesRestauradas.push(imagenBase64);
              }
            }
            productoRestaurado.imagenes = imagenesRestauradas;
            
            // Actualizar imagen principal si no existe
            if (!productoRestaurado.imagen && imagenesRestauradas.length > 0) {
              productoRestaurado.imagen = imagenesRestauradas[0];
            }
          }
          
          return productoRestaurado;
        })
      );
      
      await AsyncStorage.setItem(KEYS.PRODUCTOS, JSON.stringify(productosConImagenesRestauradas));
      // console.log(`✅ ${totalImagenes} imágenes restauradas de ${productosConImagenesRestauradas.length} productos`);
    } else if (productos) {
      await AsyncStorage.setItem(KEYS.PRODUCTOS, JSON.stringify(productos));
    }
    
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

    // Restaurar logo de la tienda desde Base64
    if (storeLogo) {
      if (storeLogo.startsWith('data:image')) {
        const logoPath = await base64ToImage(storeLogo, 'store_logo');
        await AsyncStorage.setItem('store_logo', logoPath || storeLogo);
      } else {
        await AsyncStorage.setItem('store_logo', storeLogo);
      }
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
      // console.log('📸 Restaurando imágenes de productos (fusión)...');
      const currentProductos = await AsyncStorage.getItem(KEYS.PRODUCTOS);
      const existingProductos = currentProductos ? JSON.parse(currentProductos) : [];
      const mergedProductos = [...existingProductos];
      let totalImagenes = 0;
      
      // Procesar cada producto importado
      for (const newItem of productos) {
        if (!mergedProductos.find((item) => item.id === newItem.id)) {
          const productoRestaurado = { ...newItem };
          
          // Restaurar imagen principal
          if (newItem.imagen && newItem.imagen.startsWith('data:image')) {
            const imagenPath = await base64ToImage(newItem.imagen, newItem.id);
            productoRestaurado.imagen = imagenPath;
            if (imagenPath) totalImagenes++;
          }
          
          // Restaurar array de imágenes (múltiples imágenes)
          if (newItem.imagenes && Array.isArray(newItem.imagenes) && newItem.imagenes.length > 0) {
            const imagenesRestauradas = [];
            for (let i = 0; i < newItem.imagenes.length; i++) {
              const imagenBase64 = newItem.imagenes[i];
              if (imagenBase64 && imagenBase64.startsWith('data:image')) {
                const imagenPath = await base64ToImage(imagenBase64, `${newItem.id}_${i}`);
                if (imagenPath) {
                  imagenesRestauradas.push(imagenPath);
                  totalImagenes++;
                }
              } else if (imagenBase64) {
                imagenesRestauradas.push(imagenBase64);
              }
            }
            productoRestaurado.imagenes = imagenesRestauradas;
            
            // Actualizar imagen principal si no existe
            if (!productoRestaurado.imagen && imagenesRestauradas.length > 0) {
              productoRestaurado.imagen = imagenesRestauradas[0];
            }
          }
          
          mergedProductos.push(productoRestaurado);
        }
      }
      
      await AsyncStorage.setItem(KEYS.PRODUCTOS, JSON.stringify(mergedProductos));
      added.productos = mergedProductos.length - existingProductos.length;
      // console.log(`✅ ${added.productos} productos nuevos con ${totalImagenes} imágenes restauradas`);
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
