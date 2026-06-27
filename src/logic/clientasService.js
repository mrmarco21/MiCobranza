import * as clientasRepo from '../data/clientasRepository';
import * as cuentasRepo from '../data/cuentasRepository';
import { generateId } from '../utils/helpers';

export const obtenerclientas = async () => {
  return await clientasRepo.getAll();
};

export const obtenerClientaConSaldo = async (clientaId) => {
  const clienta = await clientasRepo.getById(clientaId);
  if (!clienta) return null;

  // Sumar el saldo de TODAS las cuentas activas (una clienta puede tener varias)
  const cuentas = await cuentasRepo.getByClienta(clientaId);
  const cuentasActivas = cuentas.filter(c => c.estado === 'ACTIVA' && c.saldo > 0);
  const saldoTotal = cuentasActivas.reduce((sum, c) => sum + (c.saldo || 0), 0);

  return {
    ...clienta,
    saldoActual: saldoTotal,
    tieneCuentaActiva: cuentasActivas.length > 0,
    numeroCuentasActivas: cuentasActivas.length,
  };
};

export const obtenerclientasConSaldo = async () => {
  const clientas = await clientasRepo.getAll();
  const todasLasCuentas = await cuentasRepo.getAll();
  return clientas.map((clienta) => {
    // Sumar el saldo de TODAS las cuentas activas de la clienta
    const cuentasActivas = todasLasCuentas.filter(
      c => c.clientaId === clienta.id && c.estado === 'ACTIVA' && c.saldo > 0
    );
    const saldoTotal = cuentasActivas.reduce((sum, c) => sum + (c.saldo || 0), 0);
    return {
      ...clienta,
      saldoActual: saldoTotal,
      tieneCuentaActiva: cuentasActivas.length > 0,
      numeroCuentasActivas: cuentasActivas.length,
    };
  });
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
