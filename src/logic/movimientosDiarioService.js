import * as ventasRepo from '../data/ventasRepository';
import * as gastosRepo from '../data/gastosRepository';
import * as movimientosRepo from '../data/movimientosRepository';
import * as cuentasRepo from '../data/cuentasRepository';
import * as clientasRepo from '../data/clientasRepository';

/**
 * Obtiene todos los movimientos de efectivo de un día específico
 * Incluye: ventas de contado, ventas parciales, cobros de deudas, y gastos
 */
export const obtenerMovimientosDiarios = async (fecha = new Date()) => {
  const inicio = new Date(fecha);
  inicio.setHours(0, 0, 0, 0);
  const fin = new Date(fecha);
  fin.setHours(23, 59, 59, 999);

  // Obtener todas las ventas del día
  const todasLasVentas = await ventasRepo.getAll();
  const ventasDelDia = todasLasVentas.filter(v => {
    const fechaVenta = new Date(v.fecha);
    return fechaVenta >= inicio && fechaVenta <= fin && !v.anulada;
  });

  // Obtener todos los abonos (cobros) del día
  const abonosDelDia = await movimientosRepo.getAbonosPorRango(inicio, fin);

  // Obtener todos los gastos del día
  const todosLosGastos = await gastosRepo.getAll();
  const gastosDelDia = todosLosGastos.filter(g => {
    const fechaGasto = new Date(g.fecha);
    return fechaGasto >= inicio && fechaGasto <= fin;
  });

  // Obtener todas las cuentas para relacionar abonos con clientes
  const cuentas = await cuentasRepo.getAll();
  
  // Obtener todas las clientas para obtener sus nombres
  const clientas = await clientasRepo.getAll();

  // Procesar movimientos
  const movimientos = [];

  // 1. Agregar ventas de contado (ingreso inmediato)
  ventasDelDia.forEach(venta => {
    if (venta.tipo === 'CONTADO') {
      // Desglosar por método de pago
      if (venta.metodoPago === 'MIXTO' && venta.metodosPago) {
        venta.metodosPago.forEach(metodo => {
          movimientos.push({
            id: `venta-${venta.id}-${metodo.id}`,
            tipo: 'INGRESO',
            categoria: 'VENTA_CONTADO',
            descripcion: `Venta ${venta.numeroDocumento} - ${metodo.nombre}`,
            monto: metodo.monto,
            metodoPago: metodo.nombre,
            clienteNombre: venta.clienteNombre,
            fecha: venta.fecha,
            ventaId: venta.id,
            numeroDocumento: venta.numeroDocumento,
          });
        });
      } else {
        movimientos.push({
          id: `venta-${venta.id}`,
          tipo: 'INGRESO',
          categoria: 'VENTA_CONTADO',
          descripcion: `Venta ${venta.numeroDocumento}`,
          monto: venta.total,
          metodoPago: venta.metodoPago || 'EFECTIVO',
          clienteNombre: venta.clienteNombre,
          fecha: venta.fecha,
          ventaId: venta.id,
          numeroDocumento: venta.numeroDocumento,
        });
      }
    }
  });

  // 2. Agregar ventas parciales (solo el monto pagado)
  ventasDelDia.forEach(venta => {
    if (venta.tipo === 'PARCIAL' && venta.montoPagado > 0) {
      // Desglosar por método de pago si es mixto
      if (venta.metodoPago === 'MIXTO' && venta.metodosPago) {
        venta.metodosPago.forEach(metodo => {
          movimientos.push({
            id: `venta-parcial-${venta.id}-${metodo.id}`,
            tipo: 'INGRESO',
            categoria: 'VENTA_PARCIAL',
            descripcion: `Venta parcial ${venta.numeroDocumento} - ${metodo.nombre}`,
            monto: metodo.monto,
            metodoPago: metodo.nombre,
            clienteNombre: venta.clienteNombre,
            fecha: venta.fecha,
            ventaId: venta.id,
            numeroDocumento: venta.numeroDocumento,
          });
        });
      } else {
        movimientos.push({
          id: `venta-parcial-${venta.id}`,
          tipo: 'INGRESO',
          categoria: 'VENTA_PARCIAL',
          descripcion: `Venta parcial ${venta.numeroDocumento}`,
          monto: venta.montoPagado,
          metodoPago: venta.metodoPago || 'EFECTIVO',
          clienteNombre: venta.clienteNombre,
          fecha: venta.fecha,
          ventaId: venta.id,
          numeroDocumento: venta.numeroDocumento,
        });
      }
    }
  });

  // 3. Agregar abonos (cobros de deudas)
  abonosDelDia.forEach(abono => {
    const cuenta = cuentas.find(c => c.id === abono.cuentaId);
    const clienta = cuenta ? clientas.find(cl => cl.id === cuenta.clientaId) : null;
    const nombreCliente = clienta?.nombre || 'Cliente';
    
    // Determinar el método de pago principal (el que tiene mayor monto)
    let metodoPagoPrincipal = 'EFECTIVO';
    if (abono.metodosPago && typeof abono.metodosPago === 'object') {
      const metodos = abono.metodosPago;
      const maxMonto = Math.max(metodos.efectivo || 0, metodos.yape || 0, metodos.transferencia || 0);
      
      if (maxMonto === metodos.yape) {
        metodoPagoPrincipal = 'YAPE';
      } else if (maxMonto === metodos.transferencia) {
        metodoPagoPrincipal = 'TRANSFERENCIA';
      } else {
        metodoPagoPrincipal = 'EFECTIVO';
      }
    }
    
    // Crear UN SOLO movimiento por abono con el monto total
    movimientos.push({
      id: `abono-${abono.id}`,
      tipo: 'INGRESO',
      categoria: 'COBRO_DEUDA',
      descripcion: abono.comentario || 'Cobro de deuda',
      monto: abono.monto,
      metodoPago: metodoPagoPrincipal,
      clienteNombre: nombreCliente,
      fecha: abono.fecha,
      abonoId: abono.id,
      cuentaId: abono.cuentaId,
      metodosPagoDetalle: abono.metodosPago, // Guardar el detalle para mostrarlo en la UI
    });
  });

  // 4. Agregar gastos (egresos)
  gastosDelDia.forEach(gasto => {
    movimientos.push({
      id: `gasto-${gasto.id}`,
      tipo: 'EGRESO',
      categoria: 'GASTO',
      descripcion: gasto.descripcion,
      monto: gasto.monto,
      metodoPago: 'EFECTIVO', // Los gastos generalmente son en efectivo
      tipoGasto: gasto.tipo,
      fecha: gasto.fecha,
      gastoId: gasto.id,
    });
  });

  // Ordenar por fecha (más recientes primero)
  movimientos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  return movimientos;
};

/**
 * Calcula el resumen de movimientos del día
 */
export const calcularResumenDiario = (movimientos) => {
  const resumen = {
    totalIngresos: 0,
    totalEgresos: 0,
    saldoNeto: 0,
    porMetodoPago: {},
    porCategoria: {
      ventasContado: 0,
      ventasParciales: 0,
      cobrosDeuda: 0,
      gastos: 0,
    },
  };

  movimientos.forEach(mov => {
    if (mov.tipo === 'INGRESO') {
      resumen.totalIngresos += mov.monto;

      // Agrupar por método de pago
      if (!resumen.porMetodoPago[mov.metodoPago]) {
        resumen.porMetodoPago[mov.metodoPago] = { ingresos: 0, egresos: 0 };
      }
      resumen.porMetodoPago[mov.metodoPago].ingresos += mov.monto;

      // Agrupar por categoría
      if (mov.categoria === 'VENTA_CONTADO') {
        resumen.porCategoria.ventasContado += mov.monto;
      } else if (mov.categoria === 'VENTA_PARCIAL') {
        resumen.porCategoria.ventasParciales += mov.monto;
      } else if (mov.categoria === 'COBRO_DEUDA') {
        resumen.porCategoria.cobrosDeuda += mov.monto;
      }
    } else if (mov.tipo === 'EGRESO') {
      resumen.totalEgresos += mov.monto;
      resumen.porCategoria.gastos += mov.monto;

      // Agrupar por método de pago
      if (!resumen.porMetodoPago[mov.metodoPago]) {
        resumen.porMetodoPago[mov.metodoPago] = { ingresos: 0, egresos: 0 };
      }
      resumen.porMetodoPago[mov.metodoPago].egresos += mov.monto;
    }
  });

  resumen.saldoNeto = resumen.totalIngresos - resumen.totalEgresos;

  return resumen;
};
