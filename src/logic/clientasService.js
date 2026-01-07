import * as clientasRepo from '../data/clientasRepository';
import * as cuentasRepo from '../data/cuentasRepository';
import { generateId } from '../utils/helpers';

export const obtenerClientas = async () => {
  return await clientasRepo.getAll();
};

export const obtenerClientaConSaldo = async (clientaId) => {
  const clienta = await clientasRepo.getById(clientaId);
  if (!clienta) return null;
  
  const cuentaActiva = await cuentasRepo.getActiva(clientaId);
  return {
    ...clienta,
    saldoActual: cuentaActiva ? cuentaActiva.saldo : 0,
    tieneCuentaActiva: !!cuentaActiva,
  };
};

export const obtenerClientasConSaldo = async () => {
  const clientas = await clientasRepo.getAll();
  return Promise.all(clientas.map(async (clienta) => {
    const cuentaActiva = await cuentasRepo.getActiva(clienta.id);
    return {
      ...clienta,
      saldoActual: cuentaActiva ? cuentaActiva.saldo : 0,
      tieneCuentaActiva: !!cuentaActiva,
    };
  }));
};

export const registrarClienta = async (datos) => {
  const clienta = {
    id: generateId(),
    nombre: datos.nombre.trim(),
    referencia: datos.referencia?.trim() || '',
    fechaRegistro: new Date().toISOString(),
  };
  return await clientasRepo.create(clienta);
};

export const actualizarClienta = async (clientaId, datos) => {
  return await clientasRepo.update(clientaId, {
    nombre: datos.nombre.trim(),
    referencia: datos.referencia?.trim() || '',
  });
};

export const obtenerClientaPorId = async (clientaId) => {
  return await clientasRepo.getById(clientaId);
};
