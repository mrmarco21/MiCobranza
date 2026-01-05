import * as cuentasRepo from '../data/cuentasRepository';
import * as clientasRepo from '../data/clientasRepository';
import { generateId } from '../utils/helpers';

export const obtenerCuentaActiva = async (clientaId) => {
  return await cuentasRepo.getActiva(clientaId);
};

export const obtenerCuentasCerradas = async (clientaId = null) => {
  return await cuentasRepo.getCerradas(clientaId);
};

export const obtenerCuentasConClientas = async (cuentas) => {
  return Promise.all(cuentas.map(async (cuenta) => {
    const clienta = await clientasRepo.getById(cuenta.clientaId);
    return { ...cuenta, clientaNombre: clienta?.nombre || 'Desconocida' };
  }));
};

export const abrirNuevaCuenta = async (clientaId) => {
  // Cerrar cualquier cuenta antigua que tenga saldo 0 pero siga como ACTIVA
  const cuentas = await cuentasRepo.getByClienta(clientaId);
  for (const cuenta of cuentas) {
    if (cuenta.estado === 'ACTIVA' && cuenta.saldo <= 0) {
      await cuentasRepo.update(cuenta.id, {
        estado: 'CERRADA',
        saldo: 0,
        fechaCierre: new Date().toISOString()
      });
    }
  }

  // Verificar que no haya cuenta activa con saldo pendiente
  const cuentaActiva = cuentas.find(c => c.estado === 'ACTIVA' && c.saldo > 0);
  if (cuentaActiva) {
    throw new Error('Ya existe una cuenta activa para esta clienta');
  }

  const cuenta = {
    id: generateId(),
    clientaId,
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
  
  return await cuentasRepo.update(cuentaId, updates);
};
