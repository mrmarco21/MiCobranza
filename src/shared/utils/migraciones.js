import { getData, setData, KEYS } from '../../data/storage';

/**
 * Migración: Agregar numeroCuenta a cuentas existentes
 * Esta función asigna un número de cuenta permanente a todas las cuentas activas
 * que no lo tengan, basándose en su orden de creación
 */
export const migrarNumeroCuentas = async () => {
  try {
    const cuentas = await getData(KEYS.CUENTAS);
    
    // Agrupar cuentas por clienta
    const cuentasPorClienta = {};
    cuentas.forEach(cuenta => {
      if (!cuentasPorClienta[cuenta.clientaId]) {
        cuentasPorClienta[cuenta.clientaId] = [];
      }
      cuentasPorClienta[cuenta.clientaId].push(cuenta);
    });

    // Asignar números de cuenta solo a las activas
    let cambiosRealizados = false;
    Object.keys(cuentasPorClienta).forEach(clientaId => {
      const cuentasClienta = cuentasPorClienta[clientaId];
      
      // Filtrar solo las activas
      const cuentasActivas = cuentasClienta.filter(c => c.estado === 'ACTIVA');
      
      // Ordenar por fecha de creación
      cuentasActivas.sort((a, b) => 
        new Date(a.fechaCreacion) - new Date(b.fechaCreacion)
      );

      // Asignar número si no existe
      cuentasActivas.forEach((cuenta, index) => {
        if (!cuenta.numeroCuenta) {
          cuenta.numeroCuenta = index + 1;
          cambiosRealizados = true;
        }
      });
    });

    // Guardar cambios si hubo modificaciones
    if (cambiosRealizados) {
      await setData(KEYS.CUENTAS, cuentas);
      // console.log('Migración de numeroCuenta completada');
    }

    return true;
  } catch (error) {
    console.error('Error en migración de numeroCuenta:', error);
    return false;
  }
};

/**
 * Migración: Agregar categorías a productos vendidos en movimientos antiguos
 * Esta función actualiza los comentarios de movimientos CARGO que no tienen
 * el formato con categoría {categoria-id}, intentando encontrar la categoría
 * del producto en el inventario actual
 */
export const migrarCategoriasProductosVendidos = async () => {
  try {
    // console.log('🔄 Iniciando migración de categorías en productos vendidos...');
    
    const movimientos = await getData(KEYS.MOVIMIENTOS);
    const productos = await getData(KEYS.PRODUCTOS);
    
    let cambiosRealizados = 0;
    let movimientosRevisados = 0;
    
    // Procesar solo movimientos de tipo CARGO
    const movimientosActualizados = movimientos.map(movimiento => {
      if (movimiento.tipo !== 'CARGO' || !movimiento.comentario) {
        return movimiento;
      }
      
      movimientosRevisados++;
      
      // Parsear el comentario para ver si ya tiene categorías
      const partes = movimiento.comentario.split(' | ');
      let necesitaActualizacion = false;
      
      const partesActualizadas = partes.map(parte => {
        // Verificar si ya tiene categoría (formato: "Nombre (S/Precio) [Fecha] {categoria}")
        if (parte.match(/\{.+?\}$/)) {
          return parte; // Ya tiene categoría, no modificar
        }
        
        necesitaActualizacion = true;
        
        // Formato con fecha pero sin categoría: "Nombre (S/Precio) [Fecha]"
        const matchConFecha = parte.match(/^(.+?)\s*\(S\/(\d+\.?\d*)\)\s*\[(\d{2}\/\d{2}\/\d{4})\]$/);
        if (matchConFecha) {
          const nombreProducto = matchConFecha[1].trim();
          const precio = matchConFecha[2];
          const fecha = matchConFecha[3];
          
          // Buscar el producto en el inventario por nombre (case-insensitive)
          const productoEncontrado = productos.find(p => 
            p.nombre.toLowerCase() === nombreProducto.toLowerCase()
          );
          
          const categoria = productoEncontrado?.categoria || 'ropa-otros';
          
          // console.log(`  📦 Actualizando: "${nombreProducto}" → categoría: ${categoria}`);
          
          return `${nombreProducto} (S/${precio}) [${fecha}] {${categoria}}`;
        }
        
        // Formato sin fecha: "Nombre (S/Precio)"
        const matchSinFecha = parte.match(/^(.+?)\s*\(S\/(\d+\.?\d*)\)$/);
        if (matchSinFecha) {
          const nombreProducto = matchSinFecha[1].trim();
          const precio = matchSinFecha[2];
          
          // Buscar el producto en el inventario por nombre
          const productoEncontrado = productos.find(p => 
            p.nombre.toLowerCase() === nombreProducto.toLowerCase()
          );
          
          const categoria = productoEncontrado?.categoria || 'ropa-otros';
          
          // Generar fecha del movimiento
          const fechaMov = new Date(movimiento.fecha);
          const fechaStr = `${String(fechaMov.getDate()).padStart(2, '0')}/${String(fechaMov.getMonth() + 1).padStart(2, '0')}/${fechaMov.getFullYear()}`;
          
          // console.log(`  📦 Actualizando (sin fecha): "${nombreProducto}" → categoría: ${categoria}, fecha: ${fechaStr}`);
          
          return `${nombreProducto} (S/${precio}) [${fechaStr}] {${categoria}}`;
        }
        
        // Si no coincide con ningún formato conocido, dejar como está
        return parte;
      });
      
      if (necesitaActualizacion) {
        cambiosRealizados++;
        return {
          ...movimiento,
          comentario: partesActualizadas.join(' | ')
        };
      }
      
      return movimiento;
    });
    
    // Guardar cambios si hubo modificaciones
    if (cambiosRealizados > 0) {
      await setData(KEYS.MOVIMIENTOS, movimientosActualizados);
      // console.log(`✅ Migración completada: ${cambiosRealizados} movimientos actualizados de ${movimientosRevisados} revisados`);
    } else {
      // console.log(`ℹ️ No se encontraron movimientos que necesiten actualización (${movimientosRevisados} revisados)`);
    }
    
    return {
      success: true,
      movimientosRevisados,
      movimientosActualizados: cambiosRealizados
    };
  } catch (error) {
    console.error('❌ Error en migración de categorías:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
