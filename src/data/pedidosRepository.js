import { getData, setData } from './storage';

const PEDIDOS_KEY = 'pedidos';

// Obtener todos los pedidos
export const getAll = async () => {
  return await getData(PEDIDOS_KEY);
};

// Obtener pedido por ID
export const getById = async (id) => {
  const pedidos = await getAll();
  return pedidos.find(p => p.id === id);
};

// Crear nuevo pedido
export const create = async (pedido) => {
  const pedidos = await getAll();
  const nuevoPedido = {
    ...pedido,
    id: pedido.id || Date.now().toString(),
    estado: pedido.estado || 'ABIERTO',
    gastos: pedido.gastos || [],
    totalCompras: pedido.totalCompras || 0,
    totalEnvios: pedido.totalEnvios || 0,
    totalIntermediario: pedido.totalIntermediario || 0,
    totalOtros: pedido.totalOtros || 0,
    totalGeneral: pedido.totalGeneral || 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  pedidos.push(nuevoPedido);
  await setData(PEDIDOS_KEY, pedidos);
  return nuevoPedido;
};

// Actualizar pedido
export const update = async (id, datosActualizados) => {
  const pedidos = await getAll();
  const index = pedidos.findIndex(p => p.id === id);
  
  if (index === -1) {
    throw new Error('Pedido no encontrado');
  }
  
  pedidos[index] = {
    ...pedidos[index],
    ...datosActualizados,
    updatedAt: new Date().toISOString(),
  };
  
  await setData(PEDIDOS_KEY, pedidos);
  return pedidos[index];
};

// Eliminar pedido
export const remove = async (id) => {
  const pedidos = await getAll();
  const filtrados = pedidos.filter(p => p.id !== id);
  await setData(PEDIDOS_KEY, filtrados);
};

// Agregar gasto a pedido
export const addGasto = async (pedidoId, gastoId) => {
  const pedido = await getById(pedidoId);
  if (!pedido) {
    throw new Error('Pedido no encontrado');
  }
  
  if (!pedido.gastos.includes(gastoId)) {
    pedido.gastos.push(gastoId);
    await update(pedidoId, { gastos: pedido.gastos });
  }
};

// Remover gasto de pedido
export const removeGasto = async (pedidoId, gastoId) => {
  const pedido = await getById(pedidoId);
  if (!pedido) {
    throw new Error('Pedido no encontrado');
  }
  
  pedido.gastos = pedido.gastos.filter(id => id !== gastoId);
  await update(pedidoId, { gastos: pedido.gastos });
};

// Recalcular totales del pedido
export const recalcularTotales = async (pedidoId, gastos) => {
  let totalCompras = 0;
  let totalEnvios = 0;
  let totalIntermediario = 0;
  let totalOtros = 0;
  
  gastos.forEach(gasto => {
    switch (gasto.tipo) {
      case 'COMPRA':
        totalCompras += gasto.monto;
        break;
      case 'ENVIO_ORIGEN':
      case 'ENVIO_FINAL':
        totalEnvios += gasto.monto;
        break;
      case 'INTERMEDIARIO':
        totalIntermediario += gasto.monto;
        break;
      default:
        totalOtros += gasto.monto;
    }
  });
  
  const totalGeneral = totalCompras + totalEnvios + totalIntermediario + totalOtros;
  
  await update(pedidoId, {
    totalCompras,
    totalEnvios,
    totalIntermediario,
    totalOtros,
    totalGeneral,
  });
};

// Obtener pedidos por estado
export const getByEstado = async (estado) => {
  const pedidos = await getAll();
  return pedidos.filter(p => p.estado === estado);
};

// Completar pedido
export const completar = async (pedidoId) => {
  await update(pedidoId, {
    estado: 'COMPLETADO',
    fechaCompletado: new Date().toISOString(),
  });
};
