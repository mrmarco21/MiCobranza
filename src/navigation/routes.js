
/**
 * routes.js
 * Centralización de nombres de rutas del stack de navegación.
 * Usar siempre estas constantes en lugar de strings literales.
 */
const ROUTES = {
    // ── Core ──────────────────────────────────────────────────────
    INICIO: 'Inicio',

    // ── Clientas ─────────────────────────────────────────────────
    CLIENTAS: 'clientas',
    ADD_CLIENTA: 'AddClienta',
    CLIENTA_DETAIL: 'ClientaDetail',

    // ── Cuentas ──────────────────────────────────────────────────
    CUENTAS_PENDIENTES: 'CuentasPendientes',
    CUENTAS_CANCELADAS: 'CuentasCanceladas',
    DETALLE_CUENTA: 'DetalleCuenta',
    HISTORIAL_CLIENTA_CUENTAS: 'HistorialClientaCuentas',
    COBRO: 'Cobro',

    // ── Movimientos ──────────────────────────────────────────────
    ADD_MOVIMIENTO: 'AddMovimiento',
    MOVIMIENTOS_DIARIOS: 'MovimientosDiarios',

    // ── Gastos ───────────────────────────────────────────────────
    GASTOS: 'Gastos',
    ADD_GASTO: 'AddGasto',

    // ── Inventario ───────────────────────────────────────────────
    INVENTARIO: 'Inventario',
    ADD_PRODUCTO: 'AddProducto',
    DETALLE_PRODUCTO: 'DetalleProducto',
    PRODUCTOS_DESACTIVADOS: 'ProductosDesactivados',

    // ── Punto de Venta ───────────────────────────────────────────
    PUNTO_VENTA: 'PuntoVenta',
    SELECCIONAR_PRODUCTOS: 'SeleccionarProductos',
    METODO_PAGO: 'MetodoPago',
    BORRADORES: 'Borradores',

    // ── Reportes ─────────────────────────────────────────────────
    PRODUCTOS_VENDIDOS: 'ProductosVendidos',
    RESUMEN: 'Resumen',
    INFORMES: 'Informes',

    // ── Ventas ───────────────────────────────────────────────────
    LISTA_VENTAS: 'ListaVentas',
    DETALLE_VENTA: 'DetalleVenta',

    // ── Configuración ────────────────────────────────────────────
    CONFIGURACION: 'Configuracion',
};

export default ROUTES;
