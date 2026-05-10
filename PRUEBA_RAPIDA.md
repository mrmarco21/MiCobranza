# 🧪 Prueba Rápida del Sistema de Respaldo

## ⚡ Guía de Prueba en 5 Minutos

### 1️⃣ Probar Respaldos Automáticos (2 min)

```bash
# 1. Abre la app
# 2. Ve a: Configuración → Respaldo y Restauración
# 3. Deberías ver:
```

**✅ Lo que debes ver:**
- Sección "Respaldos Automáticos" con toggle
- Toggle activado por defecto (verde)
- Estadísticas: 0 respaldos, "Nunca" como último respaldo
- Botón azul "Crear Respaldo Ahora"

**🧪 Prueba:**
```
1. Presiona "Crear Respaldo Ahora"
2. Espera 2-3 segundos
3. Deberías ver:
   - Toast: "Respaldo creado correctamente"
   - Estadísticas actualizadas: 1 respaldo
   - Un item en la lista con fecha y hora actual
```

---

### 2️⃣ Probar Exportación Manual (2 min)

```bash
# En la misma pantalla, baja hasta "Exportación Manual"
```

**🧪 Prueba:**
```
1. Presiona "Exportar y Compartir"
2. Confirma en el modal
3. Espera 2-3 segundos
4. Deberías ver:
   - Diálogo de Android para compartir
   - Opciones: Drive, WhatsApp, Email, etc.
5. Selecciona "Google Drive"
6. Guarda el archivo
7. Verifica que se guardó en Drive
```

---

### 3️⃣ Probar Importación (1 min)

```bash
# En la misma pantalla
```

**🧪 Prueba:**
```
1. Presiona "Importar Datos"
2. Selecciona "Seleccionar Archivo"
3. Busca el archivo que acabas de guardar en Drive
4. Deberías ver:
   - Modal con resumen de datos
   - Cantidad de clientes, productos, ventas, etc.
   - Fecha del respaldo
5. Presiona "Cancelar" (para no sobrescribir datos)
```

---

### 4️⃣ Probar Restauración desde Respaldo Automático (1 min)

```bash
# En la lista de respaldos automáticos
```

**🧪 Prueba:**
```
1. Encuentra el respaldo que creaste
2. Presiona el ícono de restaurar (🔄)
3. Deberías ver:
   - Modal de confirmación
   - Advertencia sobre reemplazar datos
4. Presiona "Cancelar" (para no sobrescribir datos)
```

---

### 5️⃣ Probar Recordatorio (Opcional - requiere esperar)

```bash
# Para probar el recordatorio sin esperar 7 días:
```

**🧪 Prueba de Desarrollo:**
```javascript
// Temporalmente en src/shared/hooks/useAutoBackup.js
// Cambia esta línea:
const EXPORT_REMINDER_DAYS = 7;

// Por:
const EXPORT_REMINDER_DAYS = 0; // Para testing

// Luego:
1. Cierra la app completamente
2. Abre la app
3. Espera 5 segundos
4. Deberías ver el modal de recordatorio
5. Presiona "Exportar Ahora"
6. Deberías ir a Configuración

// IMPORTANTE: Vuelve a cambiar a 7 después de probar
```

---

## ✅ Checklist de Verificación

Marca cada item después de probarlo:

### Respaldos Automáticos
- [ ] Toggle visible y funcional
- [ ] Estadísticas se muestran correctamente
- [ ] Botón "Crear Respaldo Ahora" funciona
- [ ] Respaldo aparece en la lista
- [ ] Fecha y tamaño se muestran correctamente
- [ ] Botones de restaurar y eliminar visibles

### Exportación Manual
- [ ] Botón "Exportar y Compartir" funciona
- [ ] Modal de confirmación aparece
- [ ] Archivo se crea correctamente
- [ ] Diálogo de compartir de Android aparece
- [ ] Se puede guardar en Google Drive
- [ ] Archivo tiene nombre con fecha

### Importación
- [ ] Botón "Importar Datos" funciona
- [ ] Selector de archivos aparece
- [ ] Archivo se lee correctamente
- [ ] Modal de resumen muestra todos los datos
- [ ] Opciones "Fusionar" y "Reemplazar" visibles

### Restauración
- [ ] Botón de restaurar en lista funciona
- [ ] Modal de confirmación aparece
- [ ] Advertencia clara sobre reemplazar datos

### Recordatorio (Opcional)
- [ ] Modal aparece después de 5 segundos
- [ ] Mensaje claro y amigable
- [ ] Botón "Exportar Ahora" funciona
- [ ] Botón "Más Tarde" cierra el modal

---

## 🐛 Problemas Comunes

### "No aparece la sección de Respaldos Automáticos"
**Solución:**
```bash
# Verifica que el archivo existe:
src/screens/Configuracion/components/AutoBackupManager.jsx

# Verifica el import en ConfiguracionScreen.jsx
```

### "Error al crear respaldo"
**Solución:**
```bash
# Verifica permisos de almacenamiento
# En Android 11+, los permisos son automáticos
# Revisa la consola para ver el error específico
```

### "No aparece el recordatorio"
**Solución:**
```bash
# El recordatorio solo aparece si:
# 1. Han pasado 7 días desde el último recordatorio
# 2. La app se abre en la pantalla de Inicio
# 3. Han pasado 5 segundos

# Para testing, cambia EXPORT_REMINDER_DAYS a 0
```

### "Archivo exportado no se puede abrir"
**Solución:**
```bash
# El archivo es JSON válido
# Ábrelo con cualquier editor de texto
# Verifica que tenga la estructura correcta:
{
  "version": "2.0",
  "exportDate": "...",
  "data": { ... }
}
```

---

## 📊 Datos de Prueba

Para probar con datos reales:

```bash
# 1. Crea algunos datos de prueba:
- 2-3 clientes
- 1-2 productos
- 1 venta
- 1 gasto

# 2. Crea un respaldo
# 3. Elimina un cliente
# 4. Restaura el respaldo
# 5. Verifica que el cliente vuelva
```

---

## 🎯 Resultado Esperado

Después de todas las pruebas, deberías tener:

```
✅ Al menos 1 respaldo automático creado
✅ 1 archivo exportado en Google Drive
✅ Confirmación de que la importación funciona
✅ Confirmación de que la restauración funciona
✅ (Opcional) Recordatorio probado
```

---

## 📝 Notas de Testing

### Tiempos de Respuesta
- Crear respaldo: 1-3 segundos
- Exportar: 2-5 segundos
- Importar: 1-2 segundos
- Restaurar: 1-2 segundos

### Tamaños de Archivo
- Respaldo vacío: ~1-2 KB
- Respaldo con 100 clientes: ~50-100 KB
- Respaldo con 1000 productos: ~500 KB - 1 MB

### Frecuencia de Respaldos Automáticos
- Cada 24 horas
- Al abrir la app (si han pasado 24h)
- Al volver del background (si han pasado 24h)

---

## 🚀 Siguiente Paso

Una vez que todas las pruebas pasen:

1. ✅ Marca todos los items del checklist
2. ✅ Documenta cualquier problema encontrado
3. ✅ Comparte con el equipo
4. ✅ ¡Listo para producción!

---

**¡Buena suerte con las pruebas!** 🎉
