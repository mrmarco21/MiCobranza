import * as cuentasRepo from '../data/cuentasRepository';
import * as clientasRepo from '../data/clientasRepository';
import { generateId } from '../utils/helpers';

export const obtenerCuentaActiva = async (clientaId) => {
  return await cuentasRepo.getActiva(clientaId);
};

// Obtener TODAS las cuentas activas de una clienta
export const obtenerCuentasActivas = async (clientaId) => {
  const cuentas = await cuentasRepo.getByClienta(clientaId);
  return cuentas.filter(c => c.estado === 'ACTIVA').sort((a, b) => 
    (a.numeroCuenta || 0) - (b.numeroCuenta || 0)
  );
};

export const obtenerCuentasCerradas = async (clientaId = null) => {
  return await cuentasRepo.getCerradas(clientaId);
};

export const obtenerTodasLasCuentas = async () => {
  return await cuentasRepo.getAll();
};

export const obtenerCuentasConclientas = async (cuentas) => {
  return Promise.all(cuentas.map(async (cuenta) => {
    const clienta = await clientasRepo.getById(cuenta.clientaId);
    return { ...cuenta, clientaNombre: clienta?.nombre || 'Desconocida' };
  }));
};

export const abrirNuevaCuenta = async (clientaId) => {
  // Cerrar cualquier cuenta con saldo 0
  const cuentas = await cuentasRepo.getByClienta(clientaId);
  for (const cuenta of cuentas) {
    if (cuenta.estado === 'ACTIVA' && cuenta.saldo <= 0) {
      await cuentasRepo.update(cuenta.id, {
        estado: 'CERRADA',
        fechaCierre: new Date().toISOString()
      });
    }
  }

  // Calcular el número de cuenta basado en cuentas activas actuales
  const cuentasActivas = await obtenerCuentasActivas(clientaId);
  const numeroCuenta = cuentasActivas.length + 1;

  // Crear nueva cuenta (permitir múltiples activas)
  const cuenta = {
    id: generateId(),
    clientaId,
    numeroCuenta,
    saldo: 0,
    estado: 'ACTIVA',
    fechaCreacion: new Date().toISOString(),
    fechaCierre: null,
  };
  return await cuentasRepo.create(cuenta);
};

export const actualizarSaldo = async (cuentaId, nuevoSaldo) => {
  const updates = { saldo: nuevoSaldo };
  
  if (nuevoSaldo <= 0) {
    updates.saldo = 0;
    updates.estado = 'CERRADA';
    updates.fechaCierre = new Date().toISOString();
  }
  
  const resultado = await cuentasRepo.update(cuentaId, updates);
  
  // Si se cerró una cuenta, renumerar las cuentas activas restantes
  if (nuevoSaldo <= 0) {
    const cuenta = await cuentasRepo.getById(cuentaId);
    if (cuenta) {
      await renumerarCuentasActivas(cuenta.clientaId);
    }
  }
  
  return resultado;
};

// Renumerar las cuentas activas de una clienta
const renumerarCuentasActivas = async (clientaId) => {
  const cuentasActivas = await obtenerCuentasActivas(clientaId);
  
  // Si no hay cuentas activas, no hay nada que renumerar
  if (cuentasActivas.length === 0) return;
  
  // Renumerar las cuentas activas en orden
  for (let i = 0; i < cuentasActivas.length; i++) {
    const nuevoNumero = i + 1;
    if (cuentasActivas[i].numeroCuenta !== nuevoNumero) {
      await cuentasRepo.update(cuentasActivas[i].id, {
        numeroCuenta: nuevoNumero
      });
    }
  }
};
