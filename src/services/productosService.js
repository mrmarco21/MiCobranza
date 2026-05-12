import * as productosRepo from '../data/productosRepository';

// Validar datos del producto
const validarProducto = (producto) => {
  if (!producto.nombre || producto.nombre.trim() === '') {
    throw new Error('El nombre del producto es obligatorio');
  }

  if (!producto.categoria) {
    throw new Error('La categoría es obligatoria');
  }

  const precioCompra = parseFloat(producto.precioCompra);
  const precioVenta = parseFloat(producto.precioVenta);

  if (isNaN(precioCompra) || precioCompra < 0) {
    throw new Error('El precio de compra debe ser un número válido');
  }

  if (isNaN(precioVenta) || precioVenta < 0) {
    throw new Error('El precio de venta debe ser un número válido');
  }

  if (precioVenta < precioCompra) {
    throw new Error('El precio de venta no puede ser menor al precio de compra');
  }

  const stock = parseInt(producto.stock);
  if (isNaN(stock) || stock < 0) {
    throw new Error('El stock debe ser un número válido mayor o igual a 0');
  }

  return true;
};

// Registrar nuevo producto con múltiples imágenes
export const registrarProducto = async (productoData, imagenesUris = []) => {
  validarProducto(productoData);
  return await productosRepo.create(productoData, imagenesUris);
};

// Actualizar producto existente con múltiples imágenes
export const actualizarProducto = async (id, productoData, imagenesUris = []) => {
  validarProducto(productoData);
  const producto = await productosRepo.update(id, productoData, imagenesUris);
  
  if (!producto) {
    throw new Error('Producto no encontrado');
  }
  
  return producto;
};

// Obtener todos los productos activos
export const obtenerProductos = async () => {
  return await productosRepo.getActivos();
};

// Obtener producto por ID
export const obtenerProductoPorId = async (id) => {
  const producto = await productosRepo.getById(id);
  if (!producto) {
    throw new Error('Producto no encontrado');
  }
  return producto;
};

// Buscar productos
export const buscarProductos = async (termino) => {
  if (!termino || termino.trim() === '') {
    return await productosRepo.getActivos();
  }
  return await productosRepo.buscar(termino);
};

// Eliminar producto
export const eliminarProducto = async (id) => {
  const eliminado = await productosRepo.deleteProducto(id);
  if (!eliminado) {
    throw new Error('No se pudo eliminar el producto');
  }
  return true;
};

// Calcular margen de ganancia
export const calcularMargen = (precioCompra, precioVenta) => {
  const compra = parseFloat(precioCompra);
  const venta = parseFloat(precioVenta);
  
  if (compra === 0) return 0;
  
  const ganancia = venta - compra;
  const margenPorcentaje = (ganancia / compra) * 100;
  
  return {
    ganancia: ganancia.toFixed(2),
    margenPorcentaje: margenPorcentaje.toFixed(2),
  };
};

// Obtener productos con stock bajo
export const obtenerProductosStockBajo = async () => {
  return await productosRepo.getStockBajo();
};

// Obtener estadísticas del inventario
export const obtenerEstadisticasInventario = async () => {
  return await productosRepo.getEstadisticas();
};

// Validar disponibilidad de stock para venta
export const validarDisponibilidad = async (productosVenta) => {
  const productos = await productosRepo.getActivos();
  const noDisponibles = [];

  for (const item of productosVenta) {
    const producto = productos.find(p => p.id === item.productoId);
    
    if (!producto) {
      noDisponibles.push({
        productoId: item.productoId,
        razon: 'Producto no encontrado',
      });
      continue;
    }

    if (producto.stock < item.cantidad) {
      noDisponibles.push({
        productoId: item.productoId,
        nombre: producto.nombre,
        stockDisponible: producto.stock,
        cantidadSolicitada: item.cantidad,
        razon: `Stock insuficiente. Disponible: ${producto.stock}`,
      });
    }
  }

  return {
    disponible: noDisponibles.length === 0,
    noDisponibles,
  };
};

// Procesar venta y actualizar stock
export const procesarVenta = async (productosVendidos) => {
  // Validar disponibilidad primero
  const validacion = await validarDisponibilidad(productosVendidos);
  
  if (!validacion.disponible) {
    throw new Error(`Productos no disponibles: ${validacion.noDisponibles.map(p => p.razon).join(', ')}`);
  }

  // Actualizar stock
  await productosRepo.actualizarStock(productosVendidos);
  
  return true;
};
