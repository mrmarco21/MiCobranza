export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};


export const formatCurrency = (amount) => {
  const formatted = Number(amount).toFixed(2);
  const parts = formatted.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `S/ ${parts.join('.')}`;
};


export const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};


export const sumarMontos = (movimientos) => {
  return movimientos.reduce((sum, m) => sum + m.monto, 0);
};


/**
 * Genera un nombre descriptivo completo del producto
 * combinando nombre, marca, modelo, color y talla
 * @param {Object} producto - Objeto producto con sus atributos
 * @returns {string} Nombre completo del producto en mayúsculas
 */
export const obtenerNombreProductoCompleto = (producto) => {
  // console.log('🔧 [Helper] obtenerNombreProductoCompleto recibió:', producto);
  
  if (!producto) {
    // console.log('⚠️ [Helper] Producto es null o undefined');
    return '';
  }
  
  const partes = [producto.nombre];
  
  // Agregar atributos opcionales si existen
  if (producto.marca && producto.marca.trim()) {
    partes.push(producto.marca);
  }
  if (producto.modelo && producto.modelo.trim()) {
    partes.push(producto.modelo);
  }
  if (producto.color && producto.color.trim()) {
    partes.push(producto.color);
  }
  if (producto.talla && producto.talla.trim()) {
    partes.push(`Talla ${producto.talla}`);
  }
  
  const nombreCompleto = partes.join(' ').toUpperCase();
  console.log('✅ [Helper] Nombre completo generado:', nombreCompleto);
  
  return nombreCompleto;
};


/**
 * Genera un nombre corto del producto (nombre + color + talla)
 * Útil para espacios reducidos
 * @param {Object} producto - Objeto producto con sus atributos
 * @returns {string} Nombre corto del producto
 */
export const obtenerNombreProductoCorto = (producto) => {
  if (!producto) return '';
  
  const partes = [producto.nombre];
  
  if (producto.color && producto.color.trim()) {
    partes.push(producto.color);
  }
  if (producto.talla && producto.talla.trim()) {
    partes.push(producto.talla);
  }
  
  return partes.join(' - ');
};
