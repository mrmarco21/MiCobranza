import * as clientasRepo from '../data/clientasRepository';
import * as cuentasRepo from '../data/cuentasRepository';
import { generateId } from '../shared/utils/helpers';

export const obtenerclientas = async () => {
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

export const obtenerclientasConSaldo = async () => {
  const clientas = await clientasRepo.getAll();
  const ventasRepo = await import('../data/ventasRepository');
  
  return Promise.all(clientas.map(async (clienta) => {
    // Obtener TODAS las cuentas del cliente
    const todasLasCuentas = await cuentasRepo.getByClienta(clienta.id);
    
    // console.log(`👤 Cliente ${clienta.nombre}:`, {
    //   totalCuentas: todasLasCuentas.length,
    //   cuentas: todasLasCuentas.map(c => ({ id: c.id, estado: c.estado, saldo: c.saldo }))
    // });
    
    // Filtrar solo las cuentas activas con saldo > 0
    const cuentasActivas = todasLasCuentas.filter(c => c.estado === 'ACTIVA' && c.saldo > 0);
    
    // console.log(`  ✅ Cuentas activas con saldo > 0:`, cuentasActivas.length);
    
    // Sumar el saldo de TODAS las cuentas activas
    const saldoTotal = cuentasActivas.reduce((sum, cuenta) => sum + cuenta.saldo, 0);
    
    // Calcular total consumido (suma de todas las ventas del cliente)
    const todasLasVentas = await ventasRepo.getAll();
    const ventasCliente = todasLasVentas.filter(v => v.clienteId === clienta.id);
    const totalConsumido = ventasCliente.reduce((sum, venta) => sum + venta.total, 0);
    
    return {
      ...clienta,
      saldoActual: saldoTotal,
      tieneCuentaActiva: cuentasActivas.length > 0,
      totalConsumido: totalConsumido,
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
