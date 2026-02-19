# Plan de Implementación: Modo Oscuro + Gestión de Gastos

## 📋 Resumen del Proyecto

### 1. MODO OSCURO
Sistema de temas (claro/oscuro) que se aplica a toda la aplicación de forma consistente.

### 2. GESTIÓN DE GASTOS
Sistema para registrar y controlar todos los gastos relacionados con la compra de inventario:
- Inversión en compras (productos de diferentes tiendas online)
- Gastos de envío (ciudad origen → ciudad intermedia)
- Pago a intermediario (persona que recoge en ciudad intermedia)
- Gastos de envío final (ciudad intermedia → tu ciudad)
- Otros gastos relacionados

---

## 🎨 PARTE 1: MODO OSCURO

### Archivos a Crear:

#### 1. `src/context/ThemeContext.jsx`
**Propósito:** Context API para manejar el tema global
**Contenido:**
- Estado del tema actual (light/dark)
- Función para cambiar tema
- Persistencia en AsyncStorage
- Provider para toda la app

#### 2. `src/theme/colors.js`
**Propósito:** Paleta de colores centralizada
**Contenido:**
```javascript
export const lightTheme = {
  // Colores principales
  primary: '#45beffff',
  background: '#F5F6F8',
  surface: '#FFFFFF',
  text: '#2D3436',
  textSecondary: '#636E72',
  // ... más colores
};

export const darkTheme = {
  primary: '#45beffff',
  background: '#121212',
  surface: '#1E1E1E',
  text: '#FFFFFF',
  textSecondary: '#B0B0B0',
  // ... más colores
};
```

#### 3. `src/hooks/useTheme.js`
**Propósito:** Hook personalizado para acceder al tema
**Contenido:**
- Hook que consume ThemeContext
- Retorna: { theme, colors, isDark, toggleTheme }

### Archivos a Modificar:

**Todos los archivos con StyleSheet.create (25 archivos):**

#### Pantallas (14 archivos):
1. ✅ InicioScreen.jsx
2. ✅ ClientasScreen.jsx
3. ✅ AddClientaScreen.jsx
4. ✅ ClientaDetailScreen.jsx
5. ✅ AddMovimientoScreen.jsx
6. ✅ CuentasPendientesScreen.jsx
7. ✅ CuentasCanceladasScreen.jsx
8. ✅ DetalleCuentaScreen.jsx
9. ✅ HistorialCuentasScreen.jsx
10. ✅ ResumenScreen.jsx
11. ✅ ProductosVendidosScreen.jsx
12. ✅ ConfiguracionScreen.jsx
13. ✅ PinScreen.jsx
14. ✅ SplashScreen.jsx

#### Componentes (11 archivos):
1. ✅ Header.jsx
2. ✅ ClientaCard.jsx
3. ✅ CuentaCerradaCard.jsx
4. ✅ MovimientoItem.jsx
5. ✅ Toast.jsx
6. ✅ MenuModal.jsx
7. ✅ ConfirmModal.jsx
8. ✅ CustomModal.jsx
9. ✅ CollapsibleSection.jsx
10. ✅ EmptyState.jsx
11. ✅ EstadoCuentaImagen.jsx

#### Otros:
- ✅ App.js (envolver con ThemeProvider)
- ✅ app.json (configurar userInterfaceStyle: 'automatic')

### Patrón de Modificación:

**ANTES:**
```javascript
import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    color: '#2D3436',
  }
});
```

**DESPUÉS:**
```javascript
import { StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';

export default function MiComponente() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  
  return <View style={styles.container}>...</View>;
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    color: colors.text,
  }
});
```

---

## 💰 PARTE 2: GESTIÓN DE GASTOS

### Estructura de Datos:

#### Modelo: Gasto
```javascript
{
  id: string,
  fecha: Date,
  tipo: 'COMPRA' | 'ENVIO_ORIGEN' | 'INTERMEDIARIO' | 'ENVIO_FINAL' | 'OTRO',
  categoria: string, // 'ropa-blusas', 'ropa-pantalones', etc.
  descripcion: string,
  monto: number,
  tienda: string, // Nombre de la tienda online
  numeroGuia: string, // Número de seguimiento (opcional)
  estado: 'PENDIENTE' | 'EN_TRANSITO' | 'RECIBIDO' | 'COMPLETADO',
  notas: string,
  adjuntos: [string], // URIs de fotos/comprobantes
  pedidoId: string, // Para agrupar gastos del mismo pedido
  createdAt: Date,
  updatedAt: Date
}
```

#### Modelo: Pedido (Agrupador)
```javascript
{
  id: string,
  nombre: string, // "Pedido Enero 2024"
  fechaInicio: Date,
  fechaCompletado: Date,
  estado: 'ABIERTO' | 'EN_PROCESO' | 'COMPLETADO',
  totalCompras: number,
  totalEnvios: number,
  totalIntermediario: number,
  totalOtros: number,
  totalGeneral: number,
  gastos: [gastoId],
  notas: string
}
```

### Archivos a Crear:

#### 1. Repositorios
- `src/data/gastosRepository.js`
- `src/data/pedidosRepository.js`

#### 2. Servicios
- `src/logic/gastosService.js`

#### 3. Pantallas
- `src/screens/GastosScreen.jsx` (Lista de gastos)
- `src/screens/AddGastoScreen.jsx` (Crear/editar gasto)
- `src/screens/PedidosScreen.jsx` (Lista de pedidos)
- `src/screens/DetallePedidoScreen.jsx` (Ver pedido completo)
- `src/screens/ResumenGastosScreen.jsx` (Estadísticas y reportes)

#### 4. Componentes
- `src/components/GastoCard.jsx`
- `src/components/PedidoCard.jsx`
- `src/components/SelectorTipoGasto.jsx`

### Funcionalidades:

#### Pantalla Principal de Gastos:
- Lista de gastos recientes
- Filtros por tipo, fecha, estado
- Búsqueda por descripción/tienda
- Resumen de totales
- Botón para crear nuevo gasto
- Botón para crear nuevo pedido

#### Crear/Editar Gasto:
- Seleccionar tipo de gasto
- Seleccionar categoría de producto (si aplica)
- Ingresar monto
- Nombre de tienda (si es compra)
- Número de guía (opcional)
- Descripción/notas
- Adjuntar fotos de comprobantes
- Asociar a un pedido existente o crear nuevo

#### Gestión de Pedidos:
- Ver todos los pedidos
- Crear pedido nuevo
- Ver detalle de pedido (todos los gastos asociados)
- Marcar pedido como completado
- Calcular rentabilidad (ventas vs gastos)

#### Reportes:
- Total invertido por período
- Desglose por tipo de gasto
- Desglose por categoría de producto
- Comparativa: ingresos vs gastos
- Margen de ganancia
- Gráficos visuales

### Integración con Sistema Actual:

#### En ResumenScreen:
- Agregar sección de "Balance General"
- Mostrar: Ingresos (ventas) vs Gastos (inversión)
- Calcular utilidad neta

#### En MenuModal:
- Agregar opción "Gestión de Gastos"
- Agregar opción "Pedidos"

#### En InicioScreen:
- Agregar card de "Gastos del Mes"
- Mostrar total invertido

---

## 📊 Prioridad de Implementación

### FASE 1: Modo Oscuro (Base)
1. ✅ Crear ThemeContext
2. ✅ Crear colors.js
3. ✅ Crear useTheme hook
4. ✅ Modificar App.js
5. ✅ Modificar Header y componentes básicos

### FASE 2: Modo Oscuro (Pantallas)
6. ✅ Modificar todas las pantallas principales
7. ✅ Agregar toggle en ConfiguracionScreen
8. ✅ Probar en toda la app

### FASE 3: Gestión de Gastos (Base)
9. ✅ Crear modelos de datos
10. ✅ Crear repositorios
11. ✅ Crear servicios

### FASE 4: Gestión de Gastos (UI)
12. ✅ Crear GastosScreen
13. ✅ Crear AddGastoScreen
14. ✅ Crear componentes de gasto
15. ✅ Integrar en navegación

### FASE 5: Gestión de Gastos (Avanzado)
16. ✅ Crear sistema de pedidos
17. ✅ Crear reportes y estadísticas
18. ✅ Integrar con ResumenScreen

---

## 🎯 Resultado Final

### Modo Oscuro:
- ✅ Toggle en Configuración
- ✅ Cambio instantáneo en toda la app
- ✅ Persistencia de preferencia
- ✅ Colores consistentes
- ✅ Buena legibilidad en ambos modos

### Gestión de Gastos:
- ✅ Registro completo de inversiones
- ✅ Control de envíos y pagos
- ✅ Agrupación por pedidos
- ✅ Reportes de rentabilidad
- ✅ Balance: ingresos vs gastos
- ✅ Cálculo de utilidad neta
- ✅ Adjuntar comprobantes
- ✅ Seguimiento de estados

---

## 📝 Notas Importantes

### Modo Oscuro:
- Usar colores semánticos (no hardcodear)
- Mantener contraste adecuado
- Probar legibilidad en ambos modos
- StatusBar debe cambiar según tema

### Gestión de Gastos:
- Separar claramente tipos de gastos
- Permitir edición y eliminación
- Validar montos
- Backup incluye gastos
- Exportar reportes de gastos

---

## 🚀 ¿Por dónde empezar?

**Recomendación:** Implementar en orden:
1. Primero Modo Oscuro (afecta toda la UI)
2. Luego Gestión de Gastos (nueva funcionalidad)

Esto permite que la gestión de gastos ya nazca con soporte de modo oscuro.
