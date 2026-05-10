# 📄 Sistema de Numeración de Documentos - Implementado

## ✅ Formato Implementado: `AAMM-0001`

### 📊 Estructura del Número

```
2605-0001
││││ ││││
│││└─┴┴┴┴─ Número correlativo (0001-9999)
││└─────── Mes (01-12)
└└──────── Año (últimos 2 dígitos)
```

**Ejemplos:**
- `2605-0001` = Primera venta de Mayo 2026
- `2605-0002` = Segunda venta de Mayo 2026
- `2606-0001` = Primera venta de Junio 2026 (reinicia)
- `2612-9999` = Venta 9999 de Diciembre 2026

---

## 🔄 Lógica de Numeración

### 1. **Generación Automática**
- Se genera automáticamente al crear cada venta
- No requiere intervención del usuario
- Formato consistente en todas las ventas

### 2. **Reinicio Mensual**
- El contador se reinicia el primer día de cada mes
- Cada mes comienza desde `0001`
- Permite hasta 9,999 ventas por mes

### 3. **Unicidad Garantizada**
- Cada número es único dentro de su mes
- La combinación AAMM + número garantiza unicidad global
- No hay duplicados ni saltos

### 4. **Ordenamiento Cronológico**
- Los números se ordenan automáticamente por fecha
- Formato permite ordenamiento alfabético = ordenamiento cronológico
- Fácil identificar ventas por mes

---

## 📱 Visualización en la App

### En Lista de Ventas

```
┌─────────────────────────────────────────┐
│ #2605-0001  Cliente: María García       │ ← Número destacado
├─────────────────────────────────────────┤
│ CONTADO    S/ 150.00    ● ●             │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ #2605-0002  Cliente: Juan Pérez         │
├─────────────────────────────────────────┤
│ CRÉDITO    S/ 85.00     ● ○             │
└─────────────────────────────────────────┘
```

**Características visuales:**
- ✅ Número con `#` al inicio
- ✅ Color azul destacado
- ✅ Fondo con color de acento
- ✅ Visible en el header de cada venta
- ✅ Junto al nombre del cliente

---

## 🔧 Implementación Técnica

### Archivos Modificados

1. **`src/data/ventasRepository.js`**
   - Función `generarNumeroDocumento()` actualizada
   - Genera formato `AAMM-0001`
   - Busca último número del mes actual
   - Incrementa automáticamente

2. **`src/screens/PuntoVenta/MetodoPagoScreen.jsx`**
   - Actualizado para usar nueva función
   - Ya no pasa parámetro `tipo`
   - Genera número único para todas las ventas

3. **`src/screens/ListaVentas/ListaVentasScreen.jsx`**
   - Muestra número de documento destacado
   - Nuevo diseño visual con badge
   - Visible en header de cada venta

4. **`src/shared/utils/migracionNumerosDocumento.js`** (NUEVO)
   - Migra ventas antiguas al nuevo formato
   - Mantiene orden cronológico
   - Asigna números correlativos por mes

5. **`App.js`**
   - Ejecuta migración automáticamente
   - Solo se ejecuta una vez
   - Actualiza ventas existentes

---

## 🔄 Migración de Datos Existentes

### ¿Qué pasa con las ventas antiguas?

**Automático al abrir la app:**

1. ✅ Detecta ventas con formato antiguo (`03-0001`)
2. ✅ Agrupa ventas por mes según su fecha
3. ✅ Asigna números correlativos por mes
4. ✅ Mantiene orden cronológico
5. ✅ Actualiza todas las ventas
6. ✅ Se ejecuta solo una vez

**Ejemplo de migración:**

```
ANTES:
- 03-0001 (10/04/2026) → 2604-0001
- 03-0002 (15/04/2026) → 2604-0002
- 03-0003 (01/05/2026) → 2605-0001
- 03-0004 (05/05/2026) → 2605-0002

DESPUÉS:
- 2604-0001 (10/04/2026)
- 2604-0002 (15/04/2026)
- 2605-0001 (01/05/2026)
- 2605-0002 (05/05/2026)
```

---

## 📊 Ventajas del Sistema

### ✅ Para el Usuario
1. **Fácil de leer**: Números cortos y claros
2. **Identificación rápida**: Sabes el mes con solo ver el número
3. **Ordenamiento natural**: Se ordenan automáticamente
4. **Profesional**: Formato estándar de comercio

### ✅ Para el Negocio
1. **Control mensual**: Fácil contar ventas por mes
2. **Reportes simples**: Filtrar por prefijo de mes
3. **Escalable**: Soporta hasta 9,999 ventas/mes
4. **Sin duplicados**: Sistema garantiza unicidad

### ✅ Técnico
1. **Generación automática**: Sin intervención manual
2. **Migración automática**: Actualiza datos antiguos
3. **Validación robusta**: Previene errores
4. **Mantenible**: Código simple y claro

---

## 🎯 Casos de Uso

### Caso 1: Nueva Venta
```javascript
// Usuario crea venta en Mayo 2026
const numeroDocumento = await generarNumeroDocumento();
// Resultado: "2605-0001" (primera del mes)
```

### Caso 2: Múltiples Ventas en un Día
```javascript
// 10 ventas el mismo día
2605-0001, 2605-0002, 2605-0003, ..., 2605-0010
// Todas con el mismo prefijo de mes
```

### Caso 3: Cambio de Mes
```javascript
// Última venta de Mayo
2605-0150

// Primera venta de Junio (reinicia)
2606-0001
```

### Caso 4: Búsqueda por Mes
```javascript
// Buscar todas las ventas de Mayo 2026
ventas.filter(v => v.numeroDocumento.startsWith('2605'))
```

---

## 🔍 Verificación

### Cómo Probar

1. **Crear nueva venta**
   - Ir a Punto de Venta
   - Agregar productos
   - Finalizar venta
   - Verificar número: `2605-0001`

2. **Ver en lista**
   - Ir a Lista de Ventas
   - Ver número destacado en azul
   - Formato: `#2605-0001`

3. **Crear segunda venta**
   - Repetir proceso
   - Verificar número: `2605-0002`
   - Incremento automático

4. **Verificar migración**
   - Si tienes ventas antiguas
   - Abrir la app
   - Ver consola: "Migración completada"
   - Verificar números actualizados

---

## 📝 Notas Importantes

### ⚠️ Consideraciones

1. **Reinicio mensual**: El contador vuelve a 0001 cada mes
2. **Basado en fecha**: Usa la fecha de creación de la venta
3. **Migración única**: Solo se ejecuta una vez automáticamente
4. **Sin prefijo de tipo**: Todas las ventas usan el mismo formato
5. **Límite mensual**: Máximo 9,999 ventas por mes

### 💡 Recomendaciones

1. **No editar manualmente**: Los números se generan automáticamente
2. **No eliminar ventas**: Puede crear saltos en la numeración
3. **Respaldar datos**: Antes de cualquier cambio importante
4. **Verificar migración**: Revisar que todas las ventas tengan el nuevo formato

---

## 🚀 Próximas Mejoras (Opcional)

Si en el futuro necesitas:

1. **Múltiples series**: `A-2605-0001`, `B-2605-0001`
2. **Reinicio anual**: `26-00001` (sin mes)
3. **Prefijo personalizado**: `TDA01-2605-0001`
4. **Exportar a PDF**: Con número de documento visible
5. **Búsqueda por número**: Filtro específico en lista

---

## ✅ Resumen

**Formato:** `AAMM-0001` (Año-Mes-Correlativo)

**Características:**
- ✅ Corto y legible
- ✅ Reinicio mensual
- ✅ Generación automática
- ✅ Migración automática
- ✅ Visualización destacada
- ✅ Sin duplicados
- ✅ Ordenamiento cronológico

**Estado:** ✅ Implementado y funcionando

---

**¡Sistema de numeración profesional listo para usar!** 🎉
