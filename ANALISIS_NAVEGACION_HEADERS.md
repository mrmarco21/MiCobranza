# Análisis de Navegación y Headers

## Resumen de Pantallas y Comportamiento del Header

### 🏠 PANTALLA PRINCIPAL (Menú Hamburguesa)

**1. InicioScreen** - `showMenu={true}`
- Es la pantalla principal/home
- Muestra el menú hamburguesa (☰) en lugar del botón de retroceso
- Desde aquí se accede a todas las demás pantallas

---

### 🔙 PANTALLAS CON BOTÓN DE RETROCESO

**2. CuentasPendientesScreen** - `showBack={true}`
- Acceso desde: Inicio
- Muestra botón de retroceso (←)

**3. clientasScreen** - `showBack`
- Acceso desde: Inicio
- Muestra botón de retroceso (←)

**4. Addclientascreen** - `showBack`
- Acceso desde: clientasScreen
- Muestra botón de retroceso (←)
- Título dinámico: "Nueva Clienta" o "Editar Clienta"

**5. ClientaDetailScreen** - `showBack`
- Acceso desde: clientasScreen, CuentasPendientesScreen
- Muestra botón de retroceso (←)

**6. AddMovimientoScreen** - `showBack`
- Acceso desde: ClientaDetailScreen
- Muestra botón de retroceso (←)
- Título dinámico: "Nuevo Cargo", "Nuevo Abono", "Editar Cargo", "Editar Abono"

**7. HistorialCuentasScreen** - `showBack`
- Acceso desde: ClientaDetailScreen
- Muestra botón de retroceso (←)

**8. DetalleCuentaScreen** - `showBack`
- Acceso desde: HistorialCuentasScreen, CuentasCanceladasScreen
- Muestra botón de retroceso (←)

**9. CuentasCanceladasScreen** - Sin props (⚠️ PROBLEMA)
- Acceso desde: Inicio
- **NO tiene botón de retroceso ni menú hamburguesa**
- **DEBERÍA tener `showBack`**

**10. ProductosVendidosScreen** - `showBack`
- Acceso desde: Inicio
- Muestra botón de retroceso (←)

**11. ConfiguracionScreen** - `showBack`
- Acceso desde: ResumenScreen (menú hamburguesa)
- Muestra botón de retroceso (←)

---

### 🎯 PANTALLA ESPECIAL (Sin botón izquierdo)

**12. ResumenScreen** - Sin `showBack` ni `showMenu`
- Acceso desde: Inicio, Menú hamburguesa
- **NO tiene botón izquierdo** (ni retroceso ni menú)
- Tiene botón derecho: ⚙️ (settings) que va a Configuración
- **DEBERÍA tener `showBack` o `showMenu`** dependiendo del flujo

---

## 🔧 Problemas Detectados

### 1. CuentasCanceladasScreen
```jsx
// ACTUAL (INCORRECTO)
<Header title="Cuentas Canceladas" />

// DEBERÍA SER
<Header title="Cuentas Canceladas" showBack />
```

### 2. ResumenScreen
```jsx
// ACTUAL (INCORRECTO)
<Header
    title="Resumen de Cobros"
    rightIcon="settings-outline"
    onRightPress={() => navigation.navigate('Configuracion')}
/>

// DEBERÍA SER (opción 1 - si se accede desde Inicio)
<Header
    title="Resumen de Cobros"
    showBack
    rightIcon="settings-outline"
    onRightPress={() => navigation.navigate('Configuracion')}
/>

// O (opción 2 - si es pantalla principal alternativa)
<Header
    title="Resumen de Cobros"
    showMenu
    rightIcon="settings-outline"
    onRightPress={() => navigation.navigate('Configuracion')}
/>
```

---

## 📊 Estadísticas

- **Total de pantallas**: 12
- **Con menú hamburguesa**: 1 (InicioScreen)
- **Con botón de retroceso**: 9
- **Sin botón izquierdo**: 2 (CuentasCanceladasScreen ❌, ResumenScreen ❌)

---

## 🎨 Lógica del Header Actual

El componente `Header.jsx` tiene esta lógica:

```jsx
{showBack ? (
    // Muestra flecha de retroceso
    <TouchableOpacity onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" />
    </TouchableOpacity>
) : showMenu ? (
    // Muestra menú hamburguesa
    <TouchableOpacity onPress={() => setMenuVisible(true)}>
        <Ionicons name="menu" />
    </TouchableOpacity>
) : (
    // No muestra nada (placeholder vacío)
    <View style={styles.placeholder} />
)}
```

---

## ✅ Recomendaciones

1. **Corregir CuentasCanceladasScreen**: Agregar `showBack`
2. **Corregir ResumenScreen**: Agregar `showBack` o `showMenu` según el flujo deseado
3. **Mantener consistencia**: Todas las pantallas secundarias deben tener `showBack`
4. **Solo InicioScreen** debería tener `showMenu` (a menos que ResumenScreen sea una pantalla principal alternativa)
