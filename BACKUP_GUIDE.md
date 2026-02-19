# Guía de Respaldo y Restauración

## ¿Por qué es necesario?

En una app offline, los datos solo existen en el dispositivo. Si:
- Actualizas la app y algo sale mal
- Cambias de dispositivo
- Desinstalas accidentalmente
- El dispositivo se daña

**Perderías todos los datos**. El sistema de respaldo te protege contra esto.

## Funcionalidades Implementadas

### 1. Exportar Datos
- Crea un archivo JSON con todos tus datos
- Incluye: clientas, cuentas, movimientos, nombre y logo de la tienda
- **No incluye el PIN** (por seguridad)
- Nombre del archivo: `micobranza_backup_YYYYMMDD_HHMM.json`
- Puedes guardarlo en Google Drive, Dropbox, WhatsApp, etc.

### 2. Importar Datos
Dos opciones:

#### Opción A: Reemplazar Todo
- Elimina todos los datos actuales
- Restaura exactamente lo que había en el respaldo
- Útil para: restaurar después de reinstalar, volver a un estado anterior
- **Requiere confirmación adicional** por ser destructivo

#### Opción B: Fusionar
- Mantiene tus datos actuales
- Agrega los datos del respaldo que no existan
- Evita duplicados por ID
- Útil para: combinar datos de dos dispositivos, recuperar datos perdidos

### 3. Interfaz con Modales Personalizados
- Todos los diálogos usan modales personalizados (no Alert nativo)
- Iconos visuales para cada tipo de acción
- Colores que indican el tipo de operación
- Toasts para confirmaciones rápidas

## Cómo Usar

### Exportar (Crear Respaldo)
1. Ve a **Configuración**
2. Sección **Respaldo y Restauración**
3. Toca **Exportar Datos**
4. Confirma en el modal
5. Elige dónde guardar el archivo (recomendado: nube)

### Importar (Restaurar)
1. Ve a **Configuración**
2. Sección **Respaldo y Restauración**
3. Toca **Importar Datos**
4. Confirma y selecciona el archivo de respaldo
5. Revisa el resumen (fecha, cantidad de datos)
6. Elige **Fusionar** o **Reemplazar Todo**
7. Confirma la acción
8. Reinicia la app

## Recomendaciones

✅ **Haz respaldos periódicos** (semanal o mensual)
✅ **Guarda los respaldos en la nube** (Google Drive, etc.)
✅ **Prueba restaurar** de vez en cuando para verificar
✅ **Haz respaldo antes de actualizar** la app
✅ **Mantén varios respaldos** (no solo el más reciente)

❌ **No compartas tus respaldos** (contienen datos sensibles)
❌ **No edites manualmente** los archivos JSON
❌ **No confíes solo en el dispositivo** (puede fallar)

## Formato del Archivo

```json
{
  "version": "1.0",
  "exportDate": "2026-01-18T...",
  "data": {
    "clientas": [...],
    "cuentas": [...],
    "movimientos": [...],
    "storeName": "Mi Tienda",
    "storeLogo": "..."
  }
}
```

## Casos de Uso

### Actualización de App
1. Exportar datos antes de actualizar
2. Actualizar la app
3. Si algo falla, importar datos

### Cambio de Dispositivo
1. Exportar en dispositivo viejo
2. Instalar app en dispositivo nuevo
3. Importar datos (Reemplazar Todo)

### Recuperación de Datos
1. Si perdiste datos accidentalmente
2. Importar respaldo anterior
3. Elegir Fusionar para no perder datos nuevos

### Combinar Datos
1. Si usaste la app en dos dispositivos
2. Exportar de ambos
3. Importar uno, luego el otro con Fusionar

## Solución de Problemas

### Error al exportar
- Verifica que tengas espacio en el dispositivo
- Asegúrate de tener permisos de almacenamiento
- Intenta guardar en una ubicación diferente

### Error al importar
- Verifica que el archivo sea un respaldo válido de Mi Cobranza
- No edites el archivo manualmente
- Asegúrate de que el archivo no esté corrupto

### Datos no aparecen después de importar
- **Reinicia la app** (es necesario para cargar los nuevos datos)
- Verifica que la importación haya sido exitosa
