import * as movimientosRepo from '../data/movimientosRepository';
import * as cuentasService from './cuentasService';
import * as cuentasRepo from '../data/cuentasRepository';
import { generateId } from '../utils/helpers';

export const obtenerMovimientosDeCuenta = async (cuentaId) => {
  return await movimientosRepo.getByCuenta(cuentaId);
};

export const registrarMovimiento = async (cuentaId, tipo, monto, comentario) => {
  const cuenta = await cuentasRepo.getById(cuentaId);
  if (!cuenta || cuenta.estado !== 'ACTIVA') {
    throw new Error('La cuenta no está activa');
  }

  const movimiento = {
    id: generateId(),
    cuentaId,
    tipo,
    monto: parseFloat(monto),
    comentario: comentario?.trim() || '',
    fecha: new Date().toISOString(),
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
  const inicio = new Date(hoy);
  inicio.setDate(hoy.getDate() - diaSemana);
  inicio.setHours(0, 0, 0, 0);
  const fin = new Date(inicio);
  fin.setDate(inicio.getDate() + 6);
  fin.setHours(23, 59, 59, 999);
  return await movimientosRepo.getAbonosPorRango(inicio, fin);
};

export const obtenerMovimientoPorId = async (id) => {
  return await movimientosRepo.getById(id);
};

export const editarMovimiento = async (movimientoId, nuevoMonto, nuevoComentario) => {
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

  await movimientosRepo.update(movimientoId, {
    monto: nuevoMonto,
    comentario: nuevoComentario?.trim() || ''
  });

  await cuentasService.actualizarSaldo(movimiento.cuentaId, nuevoSaldo);

  return await movimientosRepo.getById(movimientoId);
};
