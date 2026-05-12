import { getData, setData, KEYS } from './storage';

const VENTAS_KEY = KEYS.VENTAS;

/**
 * Estructura de una venta:
 * {
 *   id: string,
 *   numeroDocumento: string,
 *   tipo: 'CONTADO' | 'CREDITO' | 'PARCIAL',
 *   clienteId: string | null,
 *   clienteNombre: string,
 *   productos: Array<{
 *     id: string,
 *     nombre: string,
 *     marca: string,
 *     modelo: string,
 *     color: string,
 *     talla: string,
 *     cantidad: number,
 *     precioVenta: number,
 *     categoria: string
 *   }>,
 *   total: number,
 *   metodoPago: string, // 'EFECTIVO', 'YAPE', 'DEPOSITO', 'PARCIAL', etc.
 *   metodosPago: Array<{ id: string, nombre: string, monto: number }>,
 *   estadoDespacho: 'PENDIENTE' | 'FINALIZADO',
 *   estadoPago: 'PENDIENTE' | 'PARCIAL' | 'PAGADO',
 *   deuda: number,
 *   montoPagado: number, // Solo para ventas PARCIAL
 *   comentario: string,
 *   cuentaId: string | null, // Solo para ventas a crédito o parciales
 *   anulada: boolean, // true si la venta está anulada
 *   fecha: string (ISO),
 *   createdAt: string (ISO),
 *   updatedAt: string (ISO)
 * }
 */

// Obtener todas las ventas
export const getAll = async () => {
  return await getData(VENTAS_KEY);
};

// Obtener venta por ID
export const getById = async (id) => {
  const ventas = await getAll();
  return ventas.find(v => v.id === id);
};

// Crear nueva venta
export const create = async (venta) => {
  const ventas = await getAll();
  const nuevaVenta = {
    ...venta,
    id: venta.id || Date.now().toString(),
    estadoDespacho: venta.estadoDespacho || 'PENDIENTE',
    estadoPago: venta.estadoPago || (venta.tipo === 'CONTADO' ? 'PAGADO' : 'PENDIENTE'),
    deuda: venta.deuda || (venta.tipo === 'CREDITO' ? venta.total : 0),
    anulada: venta.anulada || false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  ventas.push(nuevaVenta);
  await setData(VENTAS_KEY, ventas);
  return nuevaVenta;
};

// Actualizar venta
export const update = async (id, datosActualizados) => {
  const ventas = await getAll();
  const index = ventas.findIndex(v => v.id === id);
  
  if (index === -1) {
    throw new Error('Venta no encontrada');
  }
  
  ventas[index] = {
    ...ventas[index],
    ...datosActualizados,
    updatedAt: new Date().toISOString(),
  };
  
  await setData(VENTAS_KEY, ventas);
  return ventas[index];
};

// Eliminar venta
export const remove = async (id) => {
  const ventas = await getAll();
  const filtradas = ventas.filter(v => v.id !== id);
  await setData(VENTAS_KEY, filtradas);
};

// Obtener ventas por fecha
export const getByFecha = async (fecha) => {
  const ventas = await getAll();
  const fechaBusqueda = new Date(fecha).toLocaleDateString('es-PE');
  return ventas.filter(v => {
    const fechaVenta = new Date(v.fecha).toLocaleDateString('es-PE');
    return fechaVenta === fechaBusqueda;
  });
};

// Obtener ventas del día actual
export const getVentasDelDia = async () => {
  const ventas = await getAll();
  const hoy = new Date().toLocaleDateString('es-PE');
  return ventas
    .filter(v => {
      const fechaVenta = new Date(v.fecha).toLocaleDateString('es-PE');
      return fechaVenta === hoy;
    })
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
};

// Obtener ventas por tipo
export const getByTipo = async (tipo) => {
  const ventas = await getAll();
  return ventas.filter(v => v.tipo === tipo);
};

// Obtener ventas por cliente
export const getByCliente = async (clienteId) => {
  const ventas = await getAll();
  return ventas.filter(v => v.clienteId === clienteId);
};

// Calcular total de ventas del día
export const getTotalVentasDelDia = async () => {
  const ventasDelDia = await getVentasDelDia();
  return ventasDelDia.reduce((sum, v) => sum + v.total, 0);
};

// Actualizar estado de despacho
export const updateEstadoDespacho = async (id, estadoDespacho) => {
  return await update(id, { estadoDespacho });
};

// Actualizar estado de pago
export const updateEstadoPago = async (id, estadoPago, deuda) => {
  return await update(id, { estadoPago, deuda });
};

// Anular venta
export const anularVenta = async (id) => {
  return await update(id, { anulada: true });
};

// Generar número de documento con formato AAMM-0001 (reinicio mensual)
export const generarNumeroDocumento = async () => {
  const ventas = await getAll();
  const ahora = new Date();
  
  // Formato: AAMM (últimos 2 dígitos del año + mes con 2 dígitos)
  const year = ahora.getFullYear().toString().slice(-2); // 26 para 2026
  const month = String(ahora.getMonth() + 1).padStart(2, '0'); // 05 para mayo
  const prefijoMes = `${year}${month}`; // 2605
  
  // Filtrar ventas del mes actual
  const ventasDelMes = ventas.filter(v => {
    if (!v.numeroDocumento) return false;
    // Verificar si el número de documento empieza con el prefijo del mes actual
    return v.numeroDocumento.startsWith(prefijoMes);
  });
  
  // Encontrar el último número del mes
  let ultimoNumero = 0;
  ventasDelMes.forEach(v => {
    // Extraer el número después del guion: "2605-0001" -> "0001"
    const match = v.numeroDocumento.match(/-(\d+)$/);
    if (match) {
      const numero = parseInt(match[1]);
      if (numero > ultimoNumero) {
        ultimoNumero = numero;
      }
    }
  });
  
  // Incrementar y formatear
  const nuevoNumero = (ultimoNumero + 1).toString().padStart(4, '0');
  
  return `${prefijoMes}-${nuevoNumero}`;
};
