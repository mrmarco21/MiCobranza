# Pantalla de Movimientos del Día

## Descripción
Esta pantalla muestra todos los movimientos de efectivo (ingresos y egresos) de un día específico, proporcionando un control completo de caja diario.

## Características

### Movimientos Incluidos

#### Ingresos:
1. **Ventas de Contado**: Ventas pagadas completamente al momento de la venta
   - Desglosadas por método de pago (Efectivo, Yape, Transferencia, Mixto)
   
2. **Ventas Parciales**: Solo el monto pagado inicialmente de ventas a crédito parcial
   - Desglosadas por método de pago
   
3. **Cobros de Deuda**: Abonos realizados a cuentas pendientes
   - Desglosados por método de pago
   - Incluye información del cliente

#### Egresos:
1. **Gastos**: Todos los gastos registrados en el día
   - Compras de productos
   - Envíos
   - Pagos a intermediarios
   - Otros gastos

### Funcionalidades

1. **Selector de Fecha**
   - Navegación entre días (anterior/siguiente)
   - Selector de calendario
   - Indicador de "Hoy"

2. **Resumen de Caja**
   - Total de ingresos
   - Total de egresos
   - Saldo neto del día
   - Desglose por método de pago

3. **Lista Detallada de Movimientos**
   - Categoría del movimiento
   - Descripción
   - Monto (con indicador de ingreso/egreso)
   - Cliente (cuando aplica)
   - Método de pago
   - Hora del movimiento

## Acceso
La pantalla se puede acceder desde:
- **Pantalla de Resumen de Cobros** → Botón "Movimientos del día"

## Servicios Utilizados

### `movimientosDiarioService.js`
- `obtenerMovimientosDiarios(fecha)`: Obtiene todos los movimientos de un día
- `calcularResumenDiario(movimientos)`: Calcula el resumen financiero del día

## Estructura de Datos

### Movimiento
```javascript
{
  id: string,
  tipo: 'INGRESO' | 'EGRESO',
  categoria: 'VENTA_CONTADO' | 'VENTA_PARCIAL' | 'COBRO_DEUDA' | 'GASTO',
  descripcion: string,
  monto: number,
  metodoPago: string,
  clienteNombre?: string,
  fecha: string (ISO),
  // Campos adicionales según el tipo
}
```

### Resumen
```javascript
{
  totalIngresos: number,
  totalEgresos: number,
  saldoNeto: number,
  porMetodoPago: {
    [metodo]: { ingresos: number, egresos: number }
  },
  porCategoria: {
    ventasContado: number,
    ventasParciales: number,
    cobrosDeuda: number,
    gastos: number
  }
}
```

## Notas Técnicas

1. **Desglose de Métodos de Pago**: 
   - Las ventas y cobros con múltiples métodos de pago se desglosan en movimientos separados
   - Esto permite un control preciso de cada método de pago

2. **Filtrado por Fecha**:
   - Se filtran todos los movimientos entre las 00:00:00 y 23:59:59 del día seleccionado

3. **Ordenamiento**:
   - Los movimientos se ordenan por fecha descendente (más recientes primero)

4. **Exclusiones**:
   - Las ventas anuladas no se incluyen en los movimientos
