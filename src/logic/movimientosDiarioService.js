import * as movimientosRepo from '../data/movimientosRepository';
import * as cuentasRepo from '../data/cuentasRepository';
import * as clientasRepo from '../data/clientasRepository';
import * as gastosRepo from '../data/gastosRepository';

/**
 * Servicio de "Movimientos del día" adaptado al modelo de la versión antigua (cobranza).
 *
 * Mapeo de los datos existentes:
 *  - ABONO  -> COBRO_DEUDA (INGRESO de caja)  con su método de pago.
 *  - CARGO  -> VENTA (venta a crédito, informativa; no afecta la caja del día).
 *  - GASTO  -> GASTO (EGRESO de caja).
 *
 * El "saldo neto" del día = cobros (ingresos) - gastos (egresos).
 */

const esMismaFecha = (fechaISO, fechaRef) => {
    if (!fechaISO) return false;
    const d = new Date(fechaISO);
    return (
        d.getFullYear() === fechaRef.getFullYear() &&
        d.getMonth() === fechaRef.getMonth() &&
        d.getDate() === fechaRef.getDate()
    );
};

// Quita la fecha "[dd/mm/aaaa]" del final del comentario de un abono
const limpiarDescripcionAbono = (comentario) => {
    if (!comentario) return 'Cobro de deuda';
    const limpio = comentario.replace(/\s*\[\d{2}\/\d{2}\/\d{4}\]\s*$/, '').trim();
    return limpio || 'Cobro de deuda';
};

// Resume las prendas de un cargo en una descripción corta
const resumirCargo = (comentario) => {
    if (!comentario) return 'Venta';
    const partes = comentario.split(' | ');
    const descripciones = partes
        .map(parte => {
            const m = parte.match(/^(.+?)\s*\(S\//);
            return (m ? m[1] : parte).trim();
        })
        .filter(Boolean);
    if (descripciones.length === 0) return 'Venta';
    if (descripciones.length === 1) return descripciones[0];
    return `${descripciones[0]} +${descripciones.length - 1}`;
};

const nombreMetodo = (key) => {
    switch (key) {
        case 'efectivo': return 'Efectivo';
        case 'yape': return 'Yape';
        case 'transferencia': return 'Transferencia';
        default: return key;
    }
};

// Devuelve la lista de métodos de pago con monto > 0
const metodosActivos = (metodosPago) => {
    if (!metodosPago || typeof metodosPago !== 'object') return [];
    return Object.entries(metodosPago).filter(([, monto]) => monto > 0);
};

/**
 * Obtiene todos los movimientos (cobros, ventas y gastos) de un día específico,
 * normalizados a un formato común para la pantalla.
 */
export const obtenerMovimientosDiarios = async (fecha = new Date()) => {
    const [movimientos, cuentas, clientas, gastos] = await Promise.all([
        movimientosRepo.getAll(),
        cuentasRepo.getAll(),
        clientasRepo.getAll(),
        gastosRepo.getAll(),
    ]);

    const fechaRef = new Date(fecha);
    const resultado = [];

    for (const m of movimientos) {
        if (!esMismaFecha(m.fecha, fechaRef)) continue;

        const cuenta = cuentas.find(c => c.id === m.cuentaId);
        const clienta = cuenta ? clientas.find(cl => cl.id === cuenta.clientaId) : null;
        const clienteNombre = clienta?.nombre || null;

        if (m.tipo === 'ABONO') {
            const activos = metodosActivos(m.metodosPago);
            let metodoPago = 'Efectivo';
            let metodosPagoDetalle = null;

            if (activos.length > 1) {
                metodosPagoDetalle = {
                    efectivo: m.metodosPago.efectivo || 0,
                    yape: m.metodosPago.yape || 0,
                    transferencia: m.metodosPago.transferencia || 0,
                };
                metodoPago = 'Mixto';
            } else if (activos.length === 1) {
                metodoPago = nombreMetodo(activos[0][0]);
            }

            resultado.push({
                id: m.id,
                tipo: 'INGRESO',
                categoria: 'COBRO_DEUDA',
                monto: m.monto,
                descripcion: limpiarDescripcionAbono(m.comentario),
                clienteNombre,
                metodoPago,
                metodosPagoDetalle,
                fecha: m.fecha,
            });
        } else if (m.tipo === 'CARGO') {
            resultado.push({
                id: m.id,
                tipo: 'VENTA',
                categoria: 'VENTA',
                monto: m.monto,
                descripcion: resumirCargo(m.comentario),
                clienteNombre,
                metodoPago: 'Crédito',
                metodosPagoDetalle: null,
                fecha: m.fecha,
            });
        }
    }

    for (const g of gastos) {
        if (!esMismaFecha(g.fecha, fechaRef)) continue;
        resultado.push({
            id: g.id,
            tipo: 'EGRESO',
            categoria: 'GASTO',
            monto: g.monto,
            descripcion: g.descripcion || g.notas || 'Gasto',
            clienteNombre: null,
            metodoPago: 'Efectivo',
            metodosPagoDetalle: null,
            fecha: g.fecha,
        });
    }

    // Más reciente primero
    resultado.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    return resultado;
};

/**
 * Calcula el resumen del día a partir de los movimientos normalizados.
 */
export const calcularResumenDiario = (movimientos) => {
    let totalIngresos = 0; // cobros (abonos)
    let totalEgresos = 0;  // gastos
    let totalVentas = 0;   // cargos (informativo)
    const porMetodoPago = {};

    const acumularMetodo = (metodo, ingreso, egreso) => {
        if (!porMetodoPago[metodo]) {
            porMetodoPago[metodo] = { ingresos: 0, egresos: 0 };
        }
        porMetodoPago[metodo].ingresos += ingreso;
        porMetodoPago[metodo].egresos += egreso;
    };

    for (const m of movimientos) {
        if (m.categoria === 'COBRO_DEUDA') {
            totalIngresos += m.monto;
            if (m.metodosPagoDetalle) {
                const d = m.metodosPagoDetalle;
                if (d.efectivo > 0) acumularMetodo('Efectivo', d.efectivo, 0);
                if (d.yape > 0) acumularMetodo('Yape', d.yape, 0);
                if (d.transferencia > 0) acumularMetodo('Transferencia', d.transferencia, 0);
            } else {
                acumularMetodo(m.metodoPago || 'Efectivo', m.monto, 0);
            }
        } else if (m.categoria === 'GASTO') {
            totalEgresos += m.monto;
            acumularMetodo(m.metodoPago || 'Efectivo', 0, m.monto);
        } else if (m.categoria === 'VENTA') {
            totalVentas += m.monto;
        }
    }

    return {
        totalIngresos,
        totalEgresos,
        totalVentas,
        saldoNeto: totalIngresos - totalEgresos,
        porMetodoPago,
    };
};
