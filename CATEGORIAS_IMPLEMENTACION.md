# Implementación de Categorías por Artículo

## ✅ Cambios Realizados

### 1. Modelo de Datos
- **Categoría por artículo**: Cada prenda/artículo individual tiene su propia categoría
- **Formato en comentario**: `"Blusa roja (S/25.00) [12/02/2026] {ROPA}"`
- **Valores posibles**: 
  - `ROPA` (ropa, accesorios, zapatos, etc.)
  - `UTILES` (útiles escolares)
- **Compatibilidad**: Artículos antiguos sin categoría se asumen como "ROPA"

### 2. Interfaz de Usuario (AddMovimientoScreen)
- **Selector por artículo**: Cada prenda tiene sus propios botones de categoría
- **Iconos distintivos**: 
  - 👕 Ropa (shirt-outline)
  - 📚 Útiles (book-outline)
- **Mezcla de categorías**: Puedes agregar ropa y útiles en el mismo cargo
- **Placeholder dinámico**: El texto de ayuda cambia según la categoría del artículo

### 3. Nueva Pantalla: Productos Vendidos
- **Ubicación**: Resumen → Productos vendidos
- **Funcionalidades**:
  - Filtro por rango: Semana, Mes, 6 Meses
  - Resumen por categoría con totales
  - Vista "Todas" para ver el total general
  - Detalle de artículos por categoría
  - Muestra cliente, fecha y monto de cada artículo

### 4. Lógica de Negocio

#### reportesService.js
- `parsearPrendas()`: Actualizado para extraer categoría de cada artículo
- `obtenerResumenPorCategoria()`: Genera resumen separado por categoría
- `obtenerMovimientosPorCategoria()`: Filtra artículos por categoría específica

### 5. Navegación
- Agregada ruta `ProductosVendidos` en `ResumenStack`
- Botón de acceso en pantalla de Resumen

### 6. Compatibilidad con Datos Existentes
✅ **100% Compatible**: 
- Artículos sin categoría se asumen como "ROPA"
- El parser maneja 3 formatos:
  1. Nuevo con categoría: `"Blusa (S/25.00) [12/02/2026] {ROPA}"`
  2. Con fecha sin categoría: `"Blusa (S/25.00) [12/02/2026]"` → ROPA
  3. Antiguo sin fecha: `"Blusa (S/25.00)"` → ROPA

## 🎯 Cómo Usar

### Agregar un Cargo Mixto
1. Ir a una cuenta de clienta
2. Agregar nuevo cargo
3. Para cada artículo:
   - Seleccionar categoría (Ropa o Útiles)
   - Ingresar monto
   - Ingresar descripción
   - Seleccionar fecha
4. Puedes mezclar: 2 prendas de ropa + 3 útiles en el mismo cargo

### Ver Productos Vendidos
1. Ir a pestaña "Resumen"
2. Tocar "Productos vendidos"
3. Seleccionar rango (Semana/Mes/6 Meses)
4. Ver resumen por categoría
5. Tocar una categoría para ver el detalle

## 📊 Ejemplo de Uso

```javascript
// Cargo mixto guardado:
{
  comentario: "Blusa roja (S/50.00) [12/02/2026] {ROPA} | Cuaderno A4 (S/15.00) [12/02/2026] {UTILES} | Falda (S/80.00) [12/02/2026] {ROPA}",
  monto: 145.00
}

// Al parsear se obtiene:
[
  { descripcion: "Blusa roja", monto: 50, fecha: "12/02/2026", categoria: "ROPA" },
  { descripcion: "Cuaderno A4", monto: 15, fecha: "12/02/2026", categoria: "UTILES" },
  { descripcion: "Falda", monto: 80, fecha: "12/02/2026", categoria: "ROPA" }
]

// Resumen:
ROPA: S/ 130.00 (2 artículos)
UTILES: S/ 15.00 (1 artículo)
TOTAL: S/ 145.00 (3 artículos)
```

## 📝 Estructura de Archivos

### Archivos Modificados
- ✅ `AddMovimientoScreen.jsx` - Selector de categoría por artículo
- ✅ `reportesService.js` - Parser y funciones de resumen
- ✅ `ResumenScreen.jsx` - Botón de acceso
- ✅ `AppNavigator.jsx` - Ruta de navegación

### Archivos Nuevos
- ✅ `ProductosVendidosScreen.jsx` - Pantalla de productos por categoría

## ✨ Beneficios

- ✅ Flexibilidad total: mezcla categorías en un mismo cargo
- ✅ Reportes precisos por tipo de producto
- ✅ Análisis de rentabilidad por categoría
- ✅ Fácil expansión a más categorías
- ✅ Compatible con datos existentes
- ✅ Sin pérdida de información
- ✅ Interfaz intuitiva y visual

## 🔧 Agregar Más Categorías

Para agregar una nueva categoría (ej: "ACCESORIOS"):

1. En `AddMovimientoScreen.jsx`, agregar botón:
```jsx
<TouchableOpacity
    style={[styles.categoriaPrendaBtn, prenda.categoria === 'ACCESORIOS' && styles.categoriaPrendaBtnActivo]}
    onPress={() => actualizarPrenda(index, 'categoria', 'ACCESORIOS')}
>
    <Ionicons name="watch-outline" size={16} color={...} />
    <Text>Accesorios</Text>
</TouchableOpacity>
```

2. En `ProductosVendidosScreen.jsx`, agregar en resumen:
```jsx
ACCESORIOS: { cantidad: 0, total: 0, articulos: [] }
```

3. En `parsearPrendas()`, actualizar regex:
```javascript
\{(ROPA|UTILES|ACCESORIOS)\}
```

