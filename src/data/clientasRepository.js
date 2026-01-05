import { getData, setData, KEYS } from './storage';

export const getAll = async () => {
  return await getData(KEYS.CLIENTAS);
};

export const getById = async (id) => {
  const clientas = await getAll();
  return clientas.find(c => c.id === id);
};

export const create = async (clienta) => {
  const clientas = await getAll();
  clientas.push(clienta);
  await setData(KEYS.CLIENTAS, clientas);
  return clienta;
};

export const update = async (id, updates) => {
  const clientas = await getAll();
  const index = clientas.findIndex(c => c.id === id);
  if (index !== -1) {
    clientas[index] = { ...clientas[index], ...updates };
    await setData(KEYS.CLIENTAS, clientas);
    return clientas[index];
  }
  return null;
};
