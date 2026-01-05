import { getData, setData, KEYS } from './storage';

export const getAll = async () => {
  return await getData(KEYS.CUENTAS);
};

export const getById = async (id) => {
  const cuentas = await getAll();
  return cuentas.find(c => c.id === id);
};

export const getByClienta = async (clientaId) => {
  const cuentas = await getAll();
  return cuentas.filter(c => c.clientaId === clientaId);
};

export const getActiva = async (clientaId) => {
  const cuentas = await getByClienta(clientaId);
  // Solo es activa si tiene estado ACTIVA y saldo > 0
  return cuentas.find(c => c.estado === 'ACTIVA' && c.saldo > 0);
};

export const getCerradas = async (clientaId = null) => {
  const cuentas = await getAll();
  if (clientaId) {
    return cuentas.filter(c => c.clientaId === clientaId && c.estado === 'CERRADA');
  }
  return cuentas.filter(c => c.estado === 'CERRADA');
};

export const create = async (cuenta) => {
  const cuentas = await getAll();
  cuentas.push(cuenta);
  await setData(KEYS.CUENTAS, cuentas);
  return cuenta;
};

export const update = async (id, updates) => {
  const cuentas = await getAll();
  const index = cuentas.findIndex(c => c.id === id);
  if (index !== -1) {
    cuentas[index] = { ...cuentas[index], ...updates };
    await setData(KEYS.CUENTAS, cuentas);
    return cuentas[index];
  }
  return null;
};
