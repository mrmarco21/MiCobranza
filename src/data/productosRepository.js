import { getData, setData, KEYS } from './storage';
import * as FileSystem from 'expo-file-system/legacy';
import eventEmitter, { EVENTS } from '../shared/events/EventEmitter';

// Directorio para almacenar imágenes de productos
const IMAGES_DIR = `${FileSystem.documentDirectory}product_images/`;

// Asegurar que el directorio de imágenes existe
const ensureImagesDirExists = async () => {
  const dirInfo = await FileSystem.getInfoAsync(IMAGES_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(IMAGES_DIR, { intermediates: true });
  }
};

// Guardar imagen en el sistema de archivos
const saveImageToFileSystem = async (imageUri, productId) => {
  try {
    await ensureImagesDirExists();
    
    // Generar nombre único para la imagen
    const fileName = `${productId}_${Date.now()}.jpg`;
    const destPath = `${IMAGES_DIR}${fileName}`;
    
    // Si la URI es Base64 (productos antiguos), guardarla como archivo
    if (imageUri.startsWith('data:image')) {
      const base64Data = imageUri.split(',')[1];
      await FileSystem.writeAsStringAsync(destPath, base64Data, {
        encoding: 'base64',
      });
    } else {
      // Si es una URI de archivo, copiarla
      await FileSystem.copyAsync({
        from: imageUri,
        to: destPath,
      });
    }
    
    return destPath;
  } catch (error) {
    console.error('Error al guardar imagen:', error);
    return null;
  }
};

// Eliminar imagen del sistema de archivos
const deleteImageFromFileSystem = async (imagePath) => {
  try {
    if (imagePath && imagePath.startsWith(IMAGES_DIR)) {
      const fileInfo = await FileSystem.getInfoAsync(imagePath);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(imagePath);
      }
    }
  } catch (error) {
    console.error('Error al eliminar imagen:', error);
  }
};

// Obtener todos los productos
export const getAll = async () => {
  return await getData(KEYS.PRODUCTOS);
};

// Obtener producto por ID
export const getById = async (id) => {
  const productos = await getAll();
  return productos.find(p => p.id === id) || null;
};

// Crear producto con múltiples imágenes
export const create = async (productoData, imagenesUris = []) => {
  const productos = await getAll();
  
  const productoId = `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Guardar todas las imágenes
  const imagenesPaths = [];
  if (imagenesUris && imagenesUris.length > 0) {
    for (let i = 0; i < imagenesUris.length; i++) {
      const imagenPath = await saveImageToFileSystem(imagenesUris[i], `${productoId}_${i}`);
      if (imagenPath) {
        imagenesPaths.push(imagenPath);
      }
    }
  }

  const nuevoProducto = {
    id: productoId,
    sku: productoData.sku || productoId,
    codigosAlternativos: productoData.codigosAlternativos || [],
    nombre: productoData.nombre,
    categoria: productoData.categoria,
    marca: productoData.marca || '',
    descripcion: productoData.descripcion || '',
    talla: productoData.talla || '',
    color: productoData.color || '',
    modelo: productoData.modelo || '',
    precioCompra: parseFloat(productoData.precioCompra) || 0,
    precioVenta: parseFloat(productoData.precioVenta) || 0,
    stock: parseInt(productoData.stock) || 0,
    stockMinimo: parseInt(productoData.stockMinimo) || 5,
    unidadMedida: productoData.unidadMedida || 'Unidad',
    proveedor: productoData.proveedor || '',
    estado: productoData.estado || 'Activo',
    imagen: imagenesPaths.length > 0 ? imagenesPaths[0] : null, // Imagen principal (retrocompatibilidad)
    imagenes: imagenesPaths, // Array de todas las imágenes
    fechaCreacion: new Date().toISOString(),
    activo: true,
  };

  productos.push(nuevoProducto);
  await setData(KEYS.PRODUCTOS, productos);
  
  // Emitir evento de creación
  eventEmitter.emit(EVENTS.PRODUCTO_CREATED, nuevoProducto);
  
  return nuevoProducto;
};

// Actualizar producto con múltiples imágenes
export const update = async (id, productoData, imagenesUris = []) => {
  const productos = await getAll();
  const index = productos.findIndex(p => p.id === id);
  
  if (index === -1) return null;

  // Mantener imágenes actuales por defecto
  let imagenesPaths = productos[index].imagenes || [];
  
  // Si se proporcionan nuevas imágenes
  if (imagenesUris && imagenesUris.length > 0) {
    // Eliminar imágenes anteriores del sistema de archivos
    if (productos[index].imagenes && productos[index].imagenes.length > 0) {
      for (const imgPath of productos[index].imagenes) {
        await deleteImageFromFileSystem(imgPath);
      }
    }
    
    // Guardar las nuevas imágenes
    imagenesPaths = [];
    for (let i = 0; i < imagenesUris.length; i++) {
      const imagenPath = await saveImageToFileSystem(imagenesUris[i], `${id}_${i}`);
      if (imagenPath) {
        imagenesPaths.push(imagenPath);
      }
    }
  }

  productos[index] = {
    ...productos[index],
    sku: productoData.sku || productos[index].sku,
    codigosAlternativos: productoData.codigosAlternativos || productos[index].codigosAlternativos || [],
    nombre: productoData.nombre,
    categoria: productoData.categoria,
    marca: productoData.marca || '',
    descripcion: productoData.descripcion || '',
    talla: productoData.talla || '',
    color: productoData.color || '',
    modelo: productoData.modelo || '',
    precioCompra: parseFloat(productoData.precioCompra),
    precioVenta: parseFloat(productoData.precioVenta),
    stock: parseInt(productoData.stock),
    stockMinimo: parseInt(productoData.stockMinimo),
    unidadMedida: productoData.unidadMedida || 'Unidad',
    proveedor: productoData.proveedor || '',
    estado: productoData.estado || 'Activo',
    imagen: imagenesPaths.length > 0 ? imagenesPaths[0] : null, // Imagen principal
    imagenes: imagenesPaths, // Array de todas las imágenes
  };

  await setData(KEYS.PRODUCTOS, productos);
  
  // Emitir evento de actualización
  eventEmitter.emit(EVENTS.PRODUCTO_UPDATED, productos[index]);
  
  return productos[index];
};

// Eliminar producto (soft delete)
export const deleteProducto = async (id) => {
  const productos = await getAll();
  const index = productos.findIndex(p => p.id === id);
  
  if (index === -1) return false;
  
  // Eliminar todas las imágenes asociadas
  if (productos[index].imagenes && productos[index].imagenes.length > 0) {
    for (const imgPath of productos[index].imagenes) {
      await deleteImageFromFileSystem(imgPath);
    }
  } else if (productos[index].imagen) {
    // Retrocompatibilidad: eliminar imagen única
    await deleteImageFromFileSystem(productos[index].imagen);
  }
  
  productos[index].activo = false;
  await setData(KEYS.PRODUCTOS, productos);
  
  // Emitir evento de eliminación
  eventEmitter.emit(EVENTS.PRODUCTO_DELETED, { id });
  
  return true;
};

// Obtener productos activos
export const getActivos = async () => {
  const productos = await getAll();
  return productos.filter(p => p.activo);
};

// Buscar productos por nombre, SKU, marca, categoría, códigos alternativos (búsqueda flexible)
export const buscar = async (termino) => {
  const productos = await getActivos();
  const terminoLower = termino.toLowerCase().trim();
  
  // Si no hay término de búsqueda, devolver todos
  if (!terminoLower) return productos;
  
  // Dividir el término en palabras para búsqueda más flexible
  const palabras = terminoLower.split(/\s+/);
  
  return productos.filter(p => {
    // Incluir códigos alternativos en la búsqueda
    const codigosAlternativosTexto = (p.codigosAlternativos || []).join(' ');
    
    const textoCompleto = `
      ${p.nombre} 
      ${p.sku || ''} 
      ${p.marca || ''} 
      ${p.categoria || ''} 
      ${p.descripcion || ''}
      ${p.talla || ''}
      ${p.color || ''}
      ${p.modelo || ''}
      ${codigosAlternativosTexto}
    `.toLowerCase();
    
    // El producto debe contener todas las palabras buscadas (en cualquier orden)
    return palabras.every(palabra => textoCompleto.includes(palabra));
  });
};

// Obtener productos por categoría
export const getByCategoria = async (categoria) => {
  const productos = await getActivos();
  return productos.filter(p => p.categoria === categoria);
};

// Actualizar stock después de una venta
export const actualizarStock = async (productosVendidos) => {
  const productos = await getAll();
  const productosActualizados = [];
  
  productosVendidos.forEach(vendido => {
    const producto = productos.find(p => p.id === vendido.productoId);
    if (producto) {
      producto.stock -= vendido.cantidad;
      producto.ultimaVenta = new Date().toISOString();
      productosActualizados.push(producto);
    }
  });
  
  await setData(KEYS.PRODUCTOS, productos);
  
  // Emitir evento de actualización masiva
  if (productosActualizados.length > 0) {
    eventEmitter.emit(EVENTS.PRODUCTOS_BATCH_UPDATED, productosActualizados);
  }
};

// Obtener productos con stock bajo
export const getStockBajo = async () => {
  const productos = await getActivos();
  return productos.filter(p => p.stock <= p.stockMinimo);
};

// Obtener estadísticas de inventario
export const getEstadisticas = async () => {
  const productos = await getActivos();
  
  return {
    totalProductos: productos.length,
    valorInventario: productos.reduce((sum, p) => sum + (p.precioCompra * p.stock), 0),
    stockBajo: productos.filter(p => p.stock <= p.stockMinimo).length,
    sinStock: productos.filter(p => p.stock === 0).length,
  };
};

// Migrar productos con imágenes Base64 a archivos
export const migrateBase64ImagesToFiles = async () => {
  try {
    const productos = await getAll();
    let migrated = 0;
    
    for (let i = 0; i < productos.length; i++) {
      const producto = productos[i];
      
      // Si el producto tiene una imagen en formato Base64
      if (producto.imagen && producto.imagen.startsWith('data:image')) {
        // console.log(`Migrando imagen del producto: ${producto.nombre}`);
        
        // Guardar como archivo
        const imagenPath = await saveImageToFileSystem(producto.imagen, producto.id);
        
        if (imagenPath) {
          productos[i].imagen = imagenPath;
          migrated++;
        }
      }
    }
    
    if (migrated > 0) {
      await setData(KEYS.PRODUCTOS, productos);
      // console.log(`✅ Migración completada: ${migrated} imágenes convertidas a archivos`);
    } else {
      // console.log('✅ No hay imágenes para migrar');
    }
    
    return { success: true, migrated };
  } catch (error) {
    console.error('Error en migración de imágenes:', error);
    return { success: false, error: error.message };
  }
};

// Limpiar imágenes huérfanas (archivos sin producto asociado)
export const cleanOrphanImages = async () => {
  try {
    await ensureImagesDirExists();
    
    const productos = await getAll();
    const imagenesEnUso = productos
      .filter(p => p.imagen && p.imagen.startsWith(IMAGES_DIR))
      .map(p => p.imagen);
    
    const dirContent = await FileSystem.readDirectoryAsync(IMAGES_DIR);
    let deleted = 0;
    
    for (const fileName of dirContent) {
      const filePath = `${IMAGES_DIR}${fileName}`;
      
      if (!imagenesEnUso.includes(filePath)) {
        await FileSystem.deleteAsync(filePath);
        deleted++;
      }
    }
    
    console.log(`🧹 Limpieza completada: ${deleted} imágenes huérfanas eliminadas`);
    return { success: true, deleted };
  } catch (error) {
    console.error('Error al limpiar imágenes huérfanas:', error);
    return { success: false, error: error.message };
  }
};
