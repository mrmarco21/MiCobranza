import * as movimientosRepo from '../data/movimientosRepository';
import * as cuentasService from './cuentasService';
import * as cuentasRepo from '../data/cuentasRepository';
import { generateId } from '../utils/helpers';

export const obtenerMovimientosDeCuenta = async (cuentaId) => {
  return await movimientosRepo.getByCuenta(cuentaId);
};

export const registrarMovimiento = async (cuentaId, tipo, monto, comentario, metodosPago = null, fechaMovimiento = null) => {
  const cuenta = await cuentasRepo.getById(cuentaId);
  if (!cuenta || cuenta.estado !== 'ACTIVA') {
    throw new Error('La cuenta no está activa');
  }

  // Usar la fecha elegida por el usuario; si no se da, usar la fecha actual
  const fechaFinal = fechaMovimiento
    ? (fechaMovimiento instanceof Date ? fechaMovimiento.toISOString() : fechaMovimiento)
    : new Date().toISOString();

  const movimiento = {
    id: generateId(),
    cuentaId,
    tipo,
    monto: parseFloat(monto),
    comentario: comentario?.trim() || '',
    metodosPago: tipo === 'ABONO' ? (metodosPago || { efectivo: parseFloat(monto), yape: 0, transferencia: 0 }) : null,
    fecha: fechaFinal,
  };

  await movimientosRepo.create(movimiento);

  let nuevoSaldo = cuenta.saldo;
  if (tipo === 'CARGO') {
    nuevoSaldo += movimiento.monto;
  } else if (tipo === 'ABONO') {
    nuevoSaldo -= movimiento.monto;
  }

  await cuentasService.actualizarSaldo(cuentaId, nuevoSaldo);
  return movimiento;
};

export const obtenerAbonosDelDia = async (fecha = new Date()) => {
  const inicio = new Date(fecha);
  inicio.setHours(0, 0, 0, 0);
  const fin = new Date(fecha);
  fin.setHours(23, 59, 59, 999);
  return await movimientosRepo.getAbonosPorRango(inicio, fin);
};

export const obtenerAbonosDeLaSemana = async (fecha = new Date()) => {
  const hoy = new Date(fecha);
  const diaSemana = hoy.getDay();
  // Ajustar para que lunes sea el inicio (getDay: 0=domingo, 1=lunes, etc.)
  const diasDesdeInicio = diaSemana === 0 ? 6 : diaSemana - 1;
  const inicio = new Date(hoy);
  inicio.setDate(hoy.getDate() - diasDesdeInicio);
  inicio.setHours(0, 0, 0, 0);
  const fin = new Date(inicio);
  fin.setDate(inicio.getDate() + 6); // Domingo
  fin.setHours(23, 59, 59, 999);
  return await movimientosRepo.getAbonosPorRango(inicio, fin);
};

export const obtenerMovimientoPorId = async (id) => {
  return await movimientosRepo.getById(id);
};

export const editarMovimiento = async (movimientoId, nuevoMonto, nuevoComentario, nuevaFecha = null, nuevosMetodosPago = null) => {
  const movimiento = await movimientosRepo.getById(movimientoId);
  if (!movimiento) {
    throw new Error('Movimiento no encontrado');
  }

  const cuenta = await cuentasRepo.getById(movimiento.cuentaId);
  if (!cuenta) {
    throw new Error('Cuenta no encontrada');
  }

  const diferencia = nuevoMonto - movimiento.monto;
  let nuevoSaldo = cuenta.saldo;

  if (movimiento.tipo === 'CARGO') {
    nuevoSaldo += diferencia;
  } else if (movimiento.tipo === 'ABONO') {
    nuevoSaldo -= diferencia;
  }

  const updates = {
    monto: nuevoMonto,
    comentario: nuevoComentario?.trim() || ''
  };

  // Actualizar la fecha real del movimiento si se proporcionó una nueva
  if (nuevaFecha) {
    updates.fecha = nuevaFecha instanceof Date
      ? nuevaFecha.toISOString()
      : nuevaFecha;
  }

  // Actualizar métodos de pago en abonos
  if (movimiento.tipo === 'ABONO' && nuevosMetodosPago !== null) {
    updates.metodosPago = nuevosMetodosPago;
  }

  await movimientosRepo.update(movimientoId, updates);

  await cuentasService.actualizarSaldo(movimiento.cuentaId, nuevoSaldo);

  return await movimientosRepo.getById(movimientoId);
};

/**
 * Elimina un movimiento y recalcula el saldo y estado de su cuenta
 * a partir de los movimientos restantes. Esto mantiene todo consistente
 * en el resto de la app (saldos, deudores, resúmenes, etc.).
 */
export const eliminarMovimiento = async (movimientoId) => {
  const movimiento = await movimientosRepo.getById(movimientoId);
  if (!movimiento) {
    throw new Error('Movimiento no encontrado');
  }

  const cuentaId = movimiento.cuentaId;

  // Eliminar el movimiento
  await movimientosRepo.remove(movimientoId);

  // Recalcular el saldo de la cuenta con los movimientos restantes
  const cuenta = await cuentasRepo.getById(cuentaId);
  if (cuenta) {
    const movsRestantes = await movimientosRepo.getByCuenta(cuentaId);
    const totalCargos = movsRestantes
      .filter(m => m.tipo === 'CARGO')
      .reduce((sum, m) => sum + m.monto, 0);
    const totalAbonos = movsRestantes
      .filter(m => m.tipo === 'ABONO')
      .reduce((sum, m) => sum + m.monto, 0);
    const nuevoSaldo = totalCargos - totalAbonos;

    if (nuevoSaldo > 0) {
      // Hay deuda: la cuenta queda activa
      await cuentasRepo.update(cuentaId, {
        saldo: nuevoSaldo,
        estado: 'ACTIVA',
        fechaCierre: null,
      });
    } else {
      // Sin deuda: la cuenta queda cerrada
      await cuentasRepo.update(cuentaId, {
        saldo: 0,
        estado: 'CERRADA',
        fechaCierre: cuenta.fechaCierre || new Date().toISOString(),
      });
    }
  }

  return { cuentaId };
};
