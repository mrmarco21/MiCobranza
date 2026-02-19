import * as gastosRepo from '../data/gastosRepository';
import * as pedidosRepo from '../data/pedidosRepository';

// Crear gasto y asociarlo a un pedido
export const crearGasto = async (datosGasto, pedidoId = null) => {
  const gasto = await gastosRepo.create(datosGasto);
  
  // Si se especificó un pedido, asociar el gasto
  if (pedidoId) {
    await pedidosRepo.addGasto(pedidoId, gasto.id);
    
    // Recalcular totales del pedido
    const gastosPedido = await gastosRepo.getByPedidoId(pedidoId);
    await pedidosRepo.recalcularTotales(pedidoId, gastosPedido);
  }
  
  return gasto;
};

// Actualizar gasto
export const actualizarGasto = async (gastoId, datosActualizados) => {
  const gastoAnterior = await gastosRepo.getById(gastoId);
  const gasto = await gastosRepo.update(gastoId, datosActualizados);
  
  // Si cambió el pedido, actualizar ambos pedidos
  if (gastoAnterior.pedidoId !== gasto.pedidoId) {
    // Remover del pedido anterior
    if (gastoAnterior.pedidoId) {
      await pedidosRepo.removeGasto(gastoAnterior.pedidoId, gastoId);
      const gastosAnteriores = await gastosRepo.getByPedidoId(gastoAnterior.pedidoId);
      await pedidosRepo.recalcularTotales(gastoAnterior.pedidoId, gastosAnteriores);
    }
    
    // Agregar al nuevo pedido
    if (gasto.pedidoId) {
      await pedidosRepo.addGasto(gasto.pedidoId, gastoId);
      const gastosNuevos = await gastosRepo.getByPedidoId(gasto.pedidoId);
      await pedidosRepo.recalcularTotales(gasto.pedidoId, gastosNuevos);
    }
  } else if (gasto.pedidoId) {
    // Si solo cambió el monto, recalcular el pedido actual
    const gastosPedido = await gastosRepo.getByPedidoId(gasto.pedidoId);
    await pedidosRepo.recalcularTotales(gasto.pedidoId, gastosPedido);
  }
  
  return gasto;
};

// Eliminar gasto
export const eliminarGasto = async (gastoId) => {
  const gasto = await gastosRepo.getById(gastoId);
  
  // Si pertenece a un pedido, actualizar el pedido
  if (gasto.pedidoId) {
    await pedidosRepo.removeGasto(gasto.pedidoId, gastoId);
    const gastosPedido = await gastosRepo.getByPedidoId(gasto.pedidoId);
    await pedidosRepo.recalcularTotales(gasto.pedidoId, gastosPedido);
  }
  
  await gastosRepo.remove(gastoId);
};

// Obtener resumen de gastos por período
export const obtenerResumenPorPeriodo = async (fechaInicio, fechaFin) => {
  const gastos = await gastosRepo.getByDateRange(fechaInicio, fechaFin);
  
  const resumen = {
    totalCompras: 0,
    totalEnvios: 0,
    totalIntermediario: 0,
    totalOtros: 0,
    totalGeneral: 0,
    cantidadGastos: gastos.length,
    gastosPorTipo: {},
    gastosPorCategoria: {},
  };
  
  gastos.forEach(gasto => {
    // Totales por tipo
    switch (gasto.tipo) {
      case 'COMPRA':
        resumen.totalCompras += gasto.monto;
        break;
      case 'ENVIO_ORIGEN':
      case 'ENVIO_FINAL':
        resumen.totalEnvios += gasto.monto;
        break;
      case 'INTERMEDIARIO':
        resumen.totalIntermediario += gasto.monto;
        break;
      default:
        resumen.totalOtros += gasto.monto;
    }
    
    // Contar por tipo
    resumen.gastosPorTipo[gasto.tipo] = (resumen.gastosPorTipo[gasto.tipo] || 0) + 1;
    
    // Totales por categoría (solo para compras)
    if (gasto.tipo === 'COMPRA' && gasto.categoria) {
      if (!resumen.gastosPorCategoria[gasto.categoria]) {
        resumen.gastosPorCategoria[gasto.categoria] = {
          cantidad: 0,
          total: 0,
        };
      }
      resumen.gastosPorCategoria[gasto.categoria].cantidad += 1;
      resumen.gastosPorCategoria[gasto.categoria].total += gasto.monto;
    }
  });
  
  resumen.totalGeneral = resumen.totalCompras + resumen.totalEnvios + 
                         resumen.totalIntermediario + resumen.totalOtros;
  
  return resumen;
};

// Obtener balance (ingresos vs gastos)
export const obtenerBalance = async (fechaInicio, fechaFin) => {
  // Importar servicios de ventas
  const { obtenerMovimientosSemana } = require('./reportesService');
  
  // Obtener ingresos (abonos)
  const movimientos = await obtenerMovimientosSemana(fechaInicio);
  const ingresos = movimientos
    .filter(m => m.tipo === 'ABONO')
    .reduce((sum, m) => sum + m.monto, 0);
  
  // Obtener gastos
  const resumenGastos = await obtenerResumenPorPeriodo(fechaInicio, fechaFin);
  const gastos = resumenGastos.totalGeneral;
  
  // Calcular utilidad
  const utilidad = ingresos - gastos;
  const margenPorcentaje = ingresos > 0 ? ((utilidad / ingresos) * 100) : 0;
  
  return {
    ingresos,
    gastos,
    utilidad,
    margenPorcentaje,
  };
};

// Obtener gastos de un pedido con detalles
export const obtenerGastosPedido = async (pedidoId) => {
  const gastos = await gastosRepo.getByPedidoId(pedidoId);
  const pedido = await pedidosRepo.getById(pedidoId);
  
  return {
    pedido,
    gastos,
    totalGastos: gastos.length,
  };
};

// Crear pedido con gastos iniciales
export const crearPedidoConGastos = async (datosPedido, gastosIniciales = []) => {
  const pedido = await pedidosRepo.create(datosPedido);
  
  // Crear gastos y asociarlos al pedido
  for (const datosGasto of gastosIniciales) {
    await crearGasto(datosGasto, pedido.id);
  }
  
  return pedido;
};

// Completar pedido
export const completarPedido = async (pedidoId) => {
  await pedidosRepo.completar(pedidoId);
};
