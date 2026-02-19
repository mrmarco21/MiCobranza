import { getData, setData, KEYS } from './storage';

const GASTOS_KEY = 'gastos';

// Obtener todos los gastos
export const getAll = async () => {
  return await getData(GASTOS_KEY);
};

// Obtener gasto por ID
export const getById = async (id) => {
  const gastos = await getAll();
  return gastos.find(g => g.id === id);
};

// Crear nuevo gasto
export const create = async (gasto) => {
  const gastos = await getAll();
  const nuevoGasto = {
    ...gasto,
    id: gasto.id || Date.now().toString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  gastos.push(nuevoGasto);
  await setData(GASTOS_KEY, gastos);
  return nuevoGasto;
};

// Actualizar gasto
export const update = async (id, datosActualizados) => {
  const gastos = await getAll();
  const index = gastos.findIndex(g => g.id === id);
  
  if (index === -1) {
    throw new Error('Gasto no encontrado');
  }
  
  gastos[index] = {
    ...gastos[index],
    ...datosActualizados,
    updatedAt: new Date().toISOString(),
  };
  
  await setData(GASTOS_KEY, gastos);
  return gastos[index];
};

// Eliminar gasto
export const remove = async (id) => {
  const gastos = await getAll();
  const filtrados = gastos.filter(g => g.id !== id);
  await setData(GASTOS_KEY, filtrados);
};

// Obtener gastos por pedido
export const getByPedidoId = async (pedidoId) => {
  const gastos = await getAll();
  return gastos.filter(g => g.pedidoId === pedidoId);
};

// Obtener gastos por tipo
export const getByTipo = async (tipo) => {
  const gastos = await getAll();
  return gastos.filter(g => g.tipo === tipo);
};

// Obtener gastos por rango de fechas
export const getByDateRange = async (fechaInicio, fechaFin) => {
  const gastos = await getAll();
  return gastos.filter(g => {
    const fecha = new Date(g.fecha);
    return fecha >= fechaInicio && fecha <= fechaFin;
  });
};

// Obtener gastos por estado
export const getByEstado = async (estado) => {
  const gastos = await getAll();
  return gastos.filter(g => g.estado === estado);
};

// Obtener total de gastos
export const getTotalGastos = async () => {
  const gastos = await getAll();
  return gastos.reduce((sum, g) => sum + g.monto, 0);
};

// Obtener total por tipo
export const getTotalByTipo = async (tipo) => {
  const gastos = await getByTipo(tipo);
  return gastos.reduce((sum, g) => sum + g.monto, 0);
};
