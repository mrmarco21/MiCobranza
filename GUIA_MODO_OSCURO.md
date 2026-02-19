# Guía de Implementación: Modo Oscuro

## 📚 Cómo Convertir Componentes al Sistema de Temas

### Patrón General

#### ANTES (sin tema):
```javascript
import { View, Text, StyleSheet } from 'react-native';

export default function MiComponente() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Hola</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  text: {
    color: '#2D3436',
    fontSize: 16,
  }
});
```

#### DESPUÉS (con tema):
```javascript
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';

export default function MiComponente() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Hola</Text>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    padding: 16,
  },
  text: {
    color: colors.text,
    fontSize: 16,
  }
});
```

---

## 🎨 Mapeo de Colores

### Fondos
```javascript
// Antes → Después
'#F5F6F8' → colors.background      // Fondo principal
'#FFFFFF' → colors.surface          // Cards, modales
'#F8F9FA' → colors.surfaceVariant   // Fondos alternativos
```

### Textos
```javascript
// Antes → Después
'#2D3436' → colors.text             // Texto principal
'#636E72' → colors.textSecondary    // Texto secundario
'#95A5A6' → colors.textTertiary     // Texto terciario/hints
'#FFFFFF' → colors.textInverse      // Texto sobre fondos oscuros
```

### Bordes
```javascript
// Antes → Después
'#F5F6F8' → colors.border           // Bordes principales
'#F0F0F0' → colors.borderLight      // Bordes sutiles
'#E0E0E0' → colors.divider          // Líneas divisoras
```

### Estados
```javascript
// Antes → Después
'#4CAF50' → colors.success          // Éxito
'#E8F5E9' → colors.successLight     // Fondo de éxito
'#FF6B6B' → colors.error            // Error
'#FFE5E5' → colors.errorLight       // Fondo de error
'#FF9800' → colors.warning          // Advertencia
'#FFF3E0' → colors.warningLight     // Fondo de advertencia
'#2196F3' → colors.info             // Información
'#E3F2FD' → colors.infoLight        // Fondo de información
```

### Color Primario
```javascript
// Antes → Después
'#45beffff' → colors.primary        // Color principal
'#2c95cdff' → colors.primaryDark    // Variante oscura
'#E1F5FE' → colors.primaryLight     // Variante clara
```

---

## 📋 Ejemplos por Tipo de Componente

### 1. Pantallas (Screens)

```javascript
import { View, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import Header from '../components/Header';

export default function MiScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  
  return (
    <View style={styles.container}>
      <Header title="Mi Pantalla" showBack />
      <ScrollView style={styles.scrollView}>
        {/* Contenido */}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
});
```

### 2. Cards

```javascript
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';

export default function MiCard({ data, onPress }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <Text style={styles.title}>{data.title}</Text>
      <Text style={styles.subtitle}>{data.subtitle}</Text>
    </TouchableOpacity>
  );
}

const createStyles = (colors) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
```

### 3. Modales

```javascript
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';

export default function MiModal({ visible, onClose }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Título</Text>
          <TouchableOpacity style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    width: '85%',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.textInverse,
    fontSize: 16,
    fontWeight: '600',
  },
});
```

### 4. Inputs

```javascript
import { View, TextInput, Text, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';

export default function MiInput({ label, value, onChangeText, placeholder }) {
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors);
  
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        keyboardAppearance={isDark ? 'dark' : 'light'}
      />
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
```

---

## 🔧 Casos Especiales

### 1. Colores que NO deben cambiar
Algunos colores deben mantenerse constantes (ej: categorías, estados):

```javascript
const createStyles = (colors) => StyleSheet.create({
  // ✅ CORRECTO - Usar color del tema
  container: {
    backgroundColor: colors.surface,
  },
  
  // ✅ CORRECTO - Color de categoría (ya está en el tema)
  categoryIcon: {
    color: colors.categoryBlusas,
  },
  
  // ✅ CORRECTO - Estados (ya adaptados en el tema)
  errorText: {
    color: colors.error,
  },
});
```

### 2. Sombras
Las sombras deben ser más sutiles en modo oscuro:

```javascript
const createStyles = (colors) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
});
```

### 3. Overlays
```javascript
const createStyles = (colors) => StyleSheet.create({
  overlay: {
    backgroundColor: colors.overlay, // Ya tiene opacidad incluida
  },
});
```

### 4. StatusBar
En cada pantalla principal:

```javascript
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../hooks/useTheme';

export default function MiScreen() {
  const { colors } = useTheme();
  
  return (
    <View>
      <StatusBar style={colors.statusBar} />
      {/* Contenido */}
    </View>
  );
}
```

---

## ✅ Checklist de Conversión

Para cada archivo:

- [ ] Importar `useTheme` hook
- [ ] Obtener `colors` del hook
- [ ] Convertir `StyleSheet.create` a función `createStyles(colors)`
- [ ] Llamar `createStyles(colors)` dentro del componente
- [ ] Reemplazar colores hardcodeados con `colors.*`
- [ ] Agregar `keyboardAppearance` en TextInputs
- [ ] Agregar `StatusBar` en pantallas principales
- [ ] Probar en modo claro y oscuro
- [ ] Verificar contraste y legibilidad

---

## 🎯 Prioridad de Archivos

### Alta Prioridad (Componentes base):
1. Header.jsx
2. Toast.jsx
3. MenuModal.jsx
4. ConfirmModal.jsx
5. CustomModal.jsx

### Media Prioridad (Pantallas principales):
6. InicioScreen.jsx
7. ClientasScreen.jsx
8. ConfiguracionScreen.jsx
9. ResumenScreen.jsx

### Baja Prioridad (Resto):
10. Todas las demás pantallas y componentes

---

## 🚀 Siguiente Paso

Una vez creados los archivos base (ThemeContext, colors, useTheme), 
el siguiente paso es:

1. Modificar App.js para envolver con ThemeProvider
2. Agregar toggle en ConfiguracionScreen
3. Convertir Header y componentes base
4. Convertir pantallas una por una
5. Probar exhaustivamente

¿Quieres que empiece con la modificación de App.js y ConfiguracionScreen?
