import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS } from '../../data/storage';
import { Alert } from 'react-native';
import JSZip from 'jszip';
import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Comprime y convierte una imagen a Base64
 * Reduce calidad y tamaño para optimizar el backup
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
    
    // OPTIMIZACIÓN: Comprimir y redimensionar la imagen antes de convertir a Base64
    try {
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        imagePath,
        [
          { resize: { width: 800 } } // Redimensionar a máximo 800px de ancho (mantiene proporción)
        ],
        {
          compress: 0.6, // Comprimir al 60% de calidad (buen balance)
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );
      
      // Leer la imagen comprimida como Base64
      const base64 = await FileSystem.readAsStringAsync(manipulatedImage.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Retornar con el prefijo data:image
      return `data:image/jpeg;base64,${base64}`;
      
    } catch (manipError) {
      // Si falla la compresión, intentar leer la imagen original
      console.warn('No se pudo comprimir imagen, usando original:', manipError.message);
      const base64 = await FileSystem.readAsStringAsync(imagePath, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return `data:image/jpeg;base64,${base64}`;
    }
    
  } catch (error) {
    console.error('Error al convertir imagen a Base64:', error);
    return null;
  }
};

/**
 * Exporta todos los datos de la app en MÚLTIPLES ARCHIVOS
 * Solución real para evitar OutOfMemoryError dividiendo el backup en partes
 * INCLUYE TODAS LAS IMÁGENES (comprimidas para optimizar)
 * 
 * @param {Function} onProgress - Callback para reportar progreso (opcional)
 */
export const exportData = async (onProgress = null) => {
  try {
    console.log('🚀 Iniciando exportación en múltiples partes...');
    
    // Reportar progreso inicial
    if (onProgress) onProgress({ step: 'Iniciando...', progress: 0 });
    
    // Crear directorio temporal para los archivos de backup
    const date = new Date();
    const timestamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}`;
    const backupDir = `${FileSystem.documentDirectory}backup_${timestamp}/`;
    
    // Crear directorio
    await FileSystem.makeDirectoryAsync(backupDir, { intermediates: true });
    
    // ========== PARTE 1: DATOS PRINCIPALES (sin imágenes) ==========
    console.log('📦 Parte 1/4: Exportando datos principales...');
    if (onProgress) onProgress({ step: 'Exportando datos principales...', progress: 10 });
    
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
    if (onProgress) onProgress({ step: 'Exportando productos...', progress: 20 });
    
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
    if (onProgress) onProgress({ step: 'Comprimiendo imágenes...', progress: 30 });
    
    const productosConImagenes = productosData.filter(p => 
      p.imagen || (p.imagenes && p.imagenes.length > 0)
    );
    
    let totalImagenesExportadas = 0;
    const PRODUCTOS_POR_ARCHIVO = 20; // 20 productos por archivo
    const archivosImagenes = [];
    const totalProductosConImagenes = productosConImagenes.length;
    
    for (let i = 0; i < productosConImagenes.length; i += PRODUCTOS_POR_ARCHIVO) {
      const batch = productosConImagenes.slice(i, i + PRODUCTOS_POR_ARCHIVO);
      const archivoNum = Math.floor(i / PRODUCTOS_POR_ARCHIVO) + 1;
      
      // Calcular progreso (30% a 70% para las imágenes)
      const progressPercent = 30 + Math.floor((i / totalProductosConImagenes) * 40);
      if (onProgress) onProgress({ 
        step: `Procesando imágenes ${i + 1}/${totalProductosConImagenes}...`, 
        progress: progressPercent 
      });
      
      console.log(`  📸 Procesando lote ${archivoNum} (${batch.length} productos)...`);
      
      const productosConImagenesBase64 = [];
      
      // Procesar de 2 en 2 para mayor velocidad
      for (let j = 0; j < batch.length; j += 2) {
        const miniLote = batch.slice(j, j + 2);
        
        const resultados = await Promise.all(
          miniLote.map(async (producto) => {
            const productoConImagenes = {
              id: producto.id,
              imagen: null,
              imagenes: [],
            };
            
            // Convertir imagen principal (comprimida)
            if (producto.imagen) {
              productoConImagenes.imagen = await imageToBase64(producto.imagen);
              if (productoConImagenes.imagen) totalImagenesExportadas++;
            }
            
            // Convertir array de imágenes (comprimidas)
            if (producto.imagenes && Array.isArray(producto.imagenes)) {
              for (const imagenPath of producto.imagenes) {
                const base64 = await imageToBase64(imagenPath);
                if (base64) {
                  productoConImagenes.imagenes.push(base64);
                  totalImagenesExportadas++;
                }
              }
            }
            
            return productoConImagenes;
          })
        );
        
        productosConImagenesBase64.push(...resultados);
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
      
      console.log(`  ✅ Lote ${archivoNum} guardado (${totalImagenesExportadas} imágenes hasta ahora)`);
    }
    
    console.log(`✅ ${totalImagenesExportadas} imágenes exportadas en ${archivosImagenes.length} archivos`);
    
    // ========== PARTE 4: CONFIGURACIÓN Y METADATOS ==========
    console.log('📦 Parte 4/4: Exportando configuración...');
    if (onProgress) onProgress({ step: 'Guardando configuración...', progress: 75 });
    
    const storeName = await AsyncStorage.getItem('store_name');
    const storeLogo = await AsyncStorage.getItem('store_logo');
    const lockTimeout = await AsyncStorage.getItem('lock_timeout');
    
    // Convertir logo de la tienda (comprimido)
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
    
    // ========== CREAR ARCHIVO ZIP ==========
    console.log('🗜️ Comprimiendo archivos en ZIP...');
    if (onProgress) onProgress({ step: 'Creando archivo ZIP...', progress: 80 });
    
    const zip = new JSZip();
    
    // Leer y agregar cada archivo al ZIP
    const archivosParaZip = [
      'parte1_datos.json',
      'parte2_productos.json',
      ...archivosImagenes,
      'parte4_config.json',
      'LEEME.txt'
    ];
    
    for (let i = 0; i < archivosParaZip.length; i++) {
      const archivo = archivosParaZip[i];
      try {
        const contenido = await FileSystem.readAsStringAsync(`${backupDir}${archivo}`);
        zip.file(archivo, contenido);
        
        // Actualizar progreso (80% a 90%)
        const zipProgress = 80 + Math.floor((i / archivosParaZip.length) * 10);
        if (onProgress) onProgress({ 
          step: `Agregando archivos al ZIP ${i + 1}/${archivosParaZip.length}...`, 
          progress: zipProgress 
        });
      } catch (error) {
        console.warn(`  ⚠️ No se pudo agregar ${archivo}:`, error.message);
      }
    }
    
    // Generar el ZIP con compresión mínima (más rápido)
    console.log('📦 Generando archivo ZIP (esto puede tardar un momento)...');
    if (onProgress) onProgress({ step: 'Comprimiendo archivo final...', progress: 90 });
    
    const zipBase64 = await zip.generateAsync({ 
      type: 'base64',
      compression: 'DEFLATE',
      compressionOptions: { level: 1 } // Compresión mínima para mayor velocidad
    });
    
    // Guardar el ZIP
    const zipFileName = `micobranza_backup_${timestamp}.zip`;
    const zipFilePath = `${FileSystem.documentDirectory}${zipFileName}`;
    
    console.log('💾 Guardando archivo ZIP...');
    if (onProgress) onProgress({ step: 'Guardando archivo...', progress: 95 });
    
    await FileSystem.writeAsStringAsync(zipFilePath, zipBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    console.log('✅ Archivo ZIP creado:', zipFileName);
    
    // Limpiar archivos temporales
    console.log('🧹 Limpiando archivos temporales...');
    try {
      await FileSystem.deleteAsync(backupDir, { idempotent: true });
      console.log('✅ Archivos temporales eliminados');
    } catch (cleanError) {
      console.warn('⚠️ No se pudieron eliminar archivos temporales:', cleanError.message);
    }
    
    // Compartir el archivo ZIP
    if (onProgress) onProgress({ step: 'Abriendo diálogo de compartir...', progress: 100 });
    
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(zipFilePath, {
        mimeType: 'application/zip',
        dialogTitle: 'Guardar backup completo de Mi Cobranza',
        UTI: 'public.zip-archive',
      });
    }
    
    return { 
      success: true, 
      fileName: zipFileName,
      zipFilePath,
      timestamp,
      totalParts: 4 + archivosImagenes.length,
      summary: parte4.summary,
      message: `✅ Backup completo: ${zipFileName}\n\n` +
               `📊 Contenido:\n` +
               `• Productos: ${parte4.summary.productos}\n` +
               `• Imágenes: ${parte4.summary.totalImagenes} (comprimidas)\n` +
               `• Clientas: ${parte4.summary.clientas}\n` +
               `• Cuentas: ${parte4.summary.cuentas}\n\n` +
               `Las imágenes fueron comprimidas a 800px de ancho para optimizar el tamaño del archivo.`,
    };
  } catch (error) {
    console.error('Error al exportar datos:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Importa datos desde un archivo JSON o ZIP
 * Soporta: versión antigua (2.x), multi-parte (3.0) y ZIP
 * @param {Function} onProgress - Callback para reportar progreso (opcional)
 */
export const importData = async (onProgress = null) => {
  try {
    // Seleccionar archivo (JSON o ZIP) - SIN reportar progreso aún
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'application/zip', 'application/x-zip-compressed'],
      copyToCacheDirectory: true,
    });

    if (result.canceled) {
      return { success: false, canceled: true };
    }

    // AHORA SÍ reportar progreso - el usuario ya seleccionó un archivo
    if (onProgress) onProgress({ step: 'Iniciando lectura del archivo...', progress: 0 });
    
    // Pequeño delay para que el modal se renderice antes del procesamiento pesado
    await new Promise(resolve => setTimeout(resolve, 100));

    const fileUri = result.assets[0].uri;
    const fileName = result.assets[0].name || '';
    
    // ========== DETECTAR SI ES ZIP ==========
    if (fileName.endsWith('.zip') || result.assets[0].mimeType?.includes('zip')) {
      console.log('📦 Detectado archivo ZIP, descomprimiendo...');
      if (onProgress) onProgress({ step: 'Leyendo archivo ZIP...', progress: 5 });
      
      // Otro pequeño delay antes de la operación pesada
      await new Promise(resolve => setTimeout(resolve, 50));
      
      try {
        // Leer el archivo ZIP como Base64
        const zipBase64 = await FileSystem.readAsStringAsync(fileUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        if (onProgress) onProgress({ step: 'Descomprimiendo archivo...', progress: 15 });
        
        // Delay para que se actualice el modal
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Descomprimir
        const zip = new JSZip();
        const zipContent = await zip.loadAsync(zipBase64, { base64: true });
        
        console.log('📂 Archivos en el ZIP:', Object.keys(zipContent.files).join(', '));
        
        if (onProgress) onProgress({ step: 'Verificando contenido...', progress: 25 });
        
        // Delay para que se actualice el modal
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Buscar el archivo de configuración (parte4)
        const configFile = zipContent.file('parte4_config.json');
        if (!configFile) {
          return {
            success: false,
            error: 'El archivo ZIP no contiene un backup válido (falta parte4_config.json)',
          };
        }
        
        // Leer configuración
        const configContent = await configFile.async('string');
        const configData = JSON.parse(configContent);
        
        if (configData.version !== '3.0') {
          return {
            success: false,
            error: 'Versión de backup no compatible. Por favor usa un backup más reciente.',
          };
        }
        
        // Leer parte 1: Datos principales
        console.log('📖 Leyendo datos principales...');
        if (onProgress) onProgress({ step: 'Leyendo datos principales...', progress: 35 });
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const parte1Content = await zipContent.file('parte1_datos.json').async('string');
        const parte1 = JSON.parse(parte1Content);
        
        // Leer parte 2: Productos
        console.log('📖 Leyendo productos...');
        if (onProgress) onProgress({ step: 'Leyendo productos...', progress: 50 });
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const parte2Content = await zipContent.file('parte2_productos.json').async('string');
        const parte2 = JSON.parse(parte2Content);
        
        // Leer parte 3: Imágenes (múltiples archivos)
        console.log('📖 Leyendo imágenes...');
        const imageFilesList = configData.imageFilesList || [];
        const productImages = {};
        
        for (let i = 0; i < imageFilesList.length; i++) {
          const imageFile = imageFilesList[i];
          
          // Calcular progreso (50% a 85% para las imágenes)
          const progressPercent = 50 + Math.floor((i / imageFilesList.length) * 35);
          if (onProgress) onProgress({ 
            step: `Leyendo imágenes ${i + 1}/${imageFilesList.length}...`, 
            progress: progressPercent 
          });
          
          // Delay cada 3 archivos para actualizar UI
          if (i % 3 === 0) {
            await new Promise(resolve => setTimeout(resolve, 50));
          }
          
          try {
            const imageFileContent = await zipContent.file(imageFile).async('string');
            const imagePart = JSON.parse(imageFileContent);
            
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
        
        if (onProgress) onProgress({ step: 'Procesando datos...', progress: 90 });
        await new Promise(resolve => setTimeout(resolve, 100));
        
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
          storeName: configData.data.storeName,
          storeLogo: configData.data.storeLogo,
          lockTimeout: configData.data.lockTimeout,
        };
        
        console.log('✅ ZIP descomprimido y datos leídos correctamente');
        if (onProgress) onProgress({ step: 'Archivo procesado correctamente', progress: 100 });
        
        return {
          success: true,
          data: combinedData,
          exportDate: configData.timestamp,
          version: configData.version,
          isMultiPart: true,
          isZip: true,
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
        
      } catch (zipError) {
        console.error('Error al descomprimir ZIP:', zipError);
        return {
          success: false,
          error: `No se pudo descomprimir el archivo ZIP: ${zipError.message}`,
        };
      }
    }
    
    // ========== ARCHIVO JSON (versiones antiguas) ==========
    console.log('📄 Detectado archivo JSON');
    if (onProgress) onProgress({ step: 'Leyendo archivo JSON...', progress: 5 });
    
    // Pequeño delay antes de la operación pesada
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Leer archivo
    const fileContent = await FileSystem.readAsStringAsync(fileUri);
    if (onProgress) onProgress({ step: 'Procesando datos...', progress: 20 });
    
    // Otro delay antes de parsear JSON (puede ser pesado)
    await new Promise(resolve => setTimeout(resolve, 50));
    const backupData = JSON.parse(fileContent);

    // Validar estructura
    if (!backupData.version) {
      return {
        success: false,
        error: 'Archivo inválido. No es un respaldo válido de Mi Cobranza.',
      };
    }

    // ========== BACKUP MULTI-PARTE (Versión 3.0) SIN ZIP ==========
    if (backupData.version === '3.0') {
      console.log('📦 Detectado backup multi-parte versión 3.0 (sin ZIP)');
      if (onProgress) onProgress({ step: 'Verificando backup multi-parte...', progress: 30 });
      
      // Verificar que sea el archivo de configuración (parte 4)
      if (backupData.type !== 'config') {
        return {
          success: false,
          error: 'Por favor selecciona el archivo "parte4_config.json" o el archivo ZIP completo.',
        };
      }
      
      // Obtener el directorio del archivo seleccionado
      const dirPath = fileUri.substring(0, fileUri.lastIndexOf('/') + 1);
      
      console.log('📂 Directorio de backup:', dirPath);
      
      // Intentar leer todas las partes
      try {
        // Parte 1: Datos principales
        console.log('📖 Leyendo parte 1: Datos principales...');
        if (onProgress) onProgress({ step: 'Leyendo datos principales...', progress: 40 });
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const parte1Content = await FileSystem.readAsStringAsync(`${dirPath}parte1_datos.json`);
        const parte1 = JSON.parse(parte1Content);
        
        // Parte 2: Productos
        console.log('📖 Leyendo parte 2: Productos...');
        if (onProgress) onProgress({ step: 'Leyendo productos...', progress: 55 });
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const parte2Content = await FileSystem.readAsStringAsync(`${dirPath}parte2_productos.json`);
        const parte2 = JSON.parse(parte2Content);
        
        // Parte 3: Imágenes (múltiples archivos)
        console.log('📖 Leyendo parte 3: Imágenes...');
        const imageFilesList = backupData.imageFilesList || [];
        const productImages = {};
        
        for (let i = 0; i < imageFilesList.length; i++) {
          const imageFile = imageFilesList[i];
          
          // Calcular progreso (55% a 85% para las imágenes)
          const progressPercent = 55 + Math.floor((i / imageFilesList.length) * 30);
          if (onProgress) onProgress({ 
            step: `Leyendo imágenes ${i + 1}/${imageFilesList.length}...`, 
            progress: progressPercent 
          });
          
          // Delay cada 3 archivos para actualizar UI
          if (i % 3 === 0) {
            await new Promise(resolve => setTimeout(resolve, 50));
          }
          
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
        
        if (onProgress) onProgress({ step: 'Procesando datos...', progress: 90 });
        await new Promise(resolve => setTimeout(resolve, 100));
        
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
        if (onProgress) onProgress({ step: 'Archivo procesado correctamente', progress: 100 });
        
        return {
          success: true,
          data: combinedData,
          exportDate: backupData.timestamp,
          version: backupData.version,
          isMultiPart: true,
          isZip: false,
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
          error: `No se pudieron leer todos los archivos del backup. Asegúrate de que todos los archivos estén en la misma carpeta o usa el archivo ZIP. Error: ${readError.message}`,
        };
      }
    }
    
    // ========== BACKUP ANTIGUO (Versión 2.x) ==========
    if (onProgress) onProgress({ step: 'Validando estructura...', progress: 60 });
    await new Promise(resolve => setTimeout(resolve, 100));
    
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

    if (onProgress) onProgress({ step: 'Archivo procesado correctamente', progress: 100 });
    await new Promise(resolve => setTimeout(resolve, 50));

    return {
      success: true,
      data: backupData.data,
      exportDate: backupData.exportDate,
      version: backupData.version,
      isMultiPart: false,
      isZip: false,
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
 * @param {Object} importedData - Datos a importar
 * @param {Function} onProgress - Callback para reportar progreso (opcional)
 */
export const applyImportedData = async (importedData, onProgress = null) => {
  try {
    const { 
      clientas, cuentas, movimientos,
      productos, ventas, gastos, pedidos, categorias, borradores,
      storeName, storeLogo, lockTimeout 
    } = importedData;

    // Guardar datos principales
    if (onProgress) onProgress({ step: 'Guardando clientes...', progress: 10 });
    await AsyncStorage.setItem(KEYS.clientas, JSON.stringify(clientas || []));
    
    if (onProgress) onProgress({ step: 'Guardando cuentas...', progress: 20 });
    await AsyncStorage.setItem(KEYS.CUENTAS, JSON.stringify(cuentas || []));
    
    if (onProgress) onProgress({ step: 'Guardando movimientos...', progress: 30 });
    await AsyncStorage.setItem(KEYS.MOVIMIENTOS, JSON.stringify(movimientos || []));
    
    // Procesar productos para restaurar imágenes desde Base64
    if (productos && productos.length > 0) {
      if (onProgress) onProgress({ step: 'Restaurando imágenes de productos...', progress: 40 });
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
      
      if (onProgress) onProgress({ step: 'Guardando productos...', progress: 60 });
      await AsyncStorage.setItem(KEYS.PRODUCTOS, JSON.stringify(productosConImagenesRestauradas));
      // console.log(`✅ ${totalImagenes} imágenes restauradas de ${productosConImagenesRestauradas.length} productos`);
    } else if (productos) {
      await AsyncStorage.setItem(KEYS.PRODUCTOS, JSON.stringify(productos));
    }
    
    if (onProgress) onProgress({ step: 'Guardando ventas...', progress: 70 });
    if (ventas) await AsyncStorage.setItem(KEYS.VENTAS, JSON.stringify(ventas));
    if (categorias) await AsyncStorage.setItem(KEYS.CATEGORIAS, JSON.stringify(categorias));
    
    // Guardar gastos y pedidos
    if (onProgress) onProgress({ step: 'Guardando gastos y pedidos...', progress: 80 });
    if (gastos) await AsyncStorage.setItem(KEYS.GASTOS, JSON.stringify(gastos));
    if (pedidos) await AsyncStorage.setItem(KEYS.PEDIDOS, JSON.stringify(pedidos));
    
    // Guardar borradores
    if (borradores) await AsyncStorage.setItem('@borradores_punto_venta', JSON.stringify(borradores));

    // Guardar configuración
    if (onProgress) onProgress({ step: 'Guardando configuración...', progress: 90 });
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

    if (onProgress) onProgress({ step: 'Importación completada', progress: 100 });

    return { success: true };
  } catch (error) {
    console.error('Error al aplicar datos importados:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Fusiona los datos importados con los existentes (no sobrescribe)
 * @param {Object} importedData - Datos a fusionar
 * @param {Function} onProgress - Callback para reportar progreso (opcional)
 */
export const mergeImportedData = async (importedData, onProgress = null) => {
  try {
    const { 
      clientas, cuentas, movimientos,
      productos, ventas, gastos, pedidos, categorias, borradores
    } = importedData;

    // Obtener datos actuales principales
    if (onProgress) onProgress({ step: 'Cargando datos actuales...', progress: 5 });
    const currentclientas = await AsyncStorage.getItem(KEYS.clientas);
    const currentCuentas = await AsyncStorage.getItem(KEYS.CUENTAS);
    const currentMovimientos = await AsyncStorage.getItem(KEYS.MOVIMIENTOS);

    const existingclientas = currentclientas ? JSON.parse(currentclientas) : [];
    const existingCuentas = currentCuentas ? JSON.parse(currentCuentas) : [];
    const existingMovimientos = currentMovimientos ? JSON.parse(currentMovimientos) : [];

    // Fusionar datos principales (evitar duplicados por ID)
    if (onProgress) onProgress({ step: 'Fusionando clientes...', progress: 15 });
    const mergedclientas = [...existingclientas];
    (clientas || []).forEach((newItem) => {
      if (!mergedclientas.find((item) => item.id === newItem.id)) {
        mergedclientas.push(newItem);
      }
    });

    if (onProgress) onProgress({ step: 'Fusionando cuentas...', progress: 25 });
    const mergedCuentas = [...existingCuentas];
    (cuentas || []).forEach((newItem) => {
      if (!mergedCuentas.find((item) => item.id === newItem.id)) {
        mergedCuentas.push(newItem);
      }
    });

    if (onProgress) onProgress({ step: 'Fusionando movimientos...', progress: 35 });
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
      if (onProgress) onProgress({ step: 'Fusionando productos...', progress: 45 });
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
      if (onProgress) onProgress({ step: 'Fusionando ventas...', progress: 60 });
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
      if (onProgress) onProgress({ step: 'Fusionando gastos...', progress: 70 });
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
      if (onProgress) onProgress({ step: 'Fusionando pedidos...', progress: 80 });
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
      if (onProgress) onProgress({ step: 'Fusionando categorías...', progress: 90 });
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
      if (onProgress) onProgress({ step: 'Fusionando borradores...', progress: 95 });
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

    if (onProgress) onProgress({ step: 'Fusión completada', progress: 100 });

    return {
      success: true,
      added,
    };
  } catch (error) {
    console.error('Error al fusionar datos:', error);
    return { success: false, error: error.message };
  }
};
