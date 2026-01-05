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

export const getAbonosPorRango = async (fechaInicio, fechaFin) => {
  const movimientos = await getAll();
  return movimientos.filter(m => {
    const fecha = new Date(m.fecha);
    return m.tipo === 'ABONO' && fecha >= fechaInicio && fecha <= fechaFin;
  });
};
