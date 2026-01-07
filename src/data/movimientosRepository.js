import { getData, setData, KEYS } from './storage';

export const getAll = async () => {
  return await getData(KEYS.MOVIMIENTOS);
};

export const getByCuenta = async (cuentaId) => {
  const movimientos = await getAll();
  return movimientos
    .filter(m => m.cuentaId === cuentaId)
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
};

export const create = async (movimiento) => {
  const movimientos = await getAll();
  movimientos.push(movimiento);
  await setData(KEYS.MOVIMIENTOS, movimientos);
  return movimiento;
};

export const getById = async (id) => {
  const movimientos = await getAll();
  return movimientos.find(m => m.id === id) || null;
};

export const update = async (id, datos) => {
  const movimientos = await getAll();
  const index = movimientos.findIndex(m => m.id === id);
  if (index === -1) return null;
  movimientos[index] = { ...movimientos[index], ...datos };
  await setData(KEYS.MOVIMIENTOS, movimientos);
  return movimientos[index];
};

export const getAbonosPorRango = async (fechaInicio, fechaFin) => {
  const movimientos = await getAll();
  return movimientos.filter(m => {
    const fecha = new Date(m.fecha);
    return m.tipo === 'ABONO' && fecha >= fechaInicio && fecha <= fechaFin;
  });
};
