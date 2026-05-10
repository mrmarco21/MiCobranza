# 📊 Diagrama de Flujo - Sistema de Respaldo

## 🔄 Flujo de Respaldo Automático

```
┌─────────────────────────────────────────────────────────────┐
│                    USUARIO ABRE LA APP                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              useAutoBackup Hook se Ejecuta                   │
│         (src/shared/hooks/useAutoBackup.js)                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│         ¿Han pasado más de 24 horas desde el                │
│              último respaldo automático?                     │
└────────┬────────────────────────────────────────┬───────────┘
         │ SÍ                                      │ NO
         ▼                                         ▼
┌──────────────────────────┐            ┌──────────────────────┐
│  Crear Respaldo          │            │  No hacer nada       │
│  Automático              │            │  (esperar 24h)       │
│                          │            └──────────────────────┘
│  • Recopilar datos       │
│  • Crear archivo JSON    │
│  • Guardar en dispositivo│
│  • Eliminar antiguos     │
│    (mantener últimos 7)  │
└──────────────────────────┘
         │
         ▼
┌──────────────────────────┐
│  ✅ Respaldo Creado      │
│  (Silencioso, sin        │
│   notificación)          │
└──────────────────────────┘
```

---

## 📤 Flujo de Exportación Manual

```
┌─────────────────────────────────────────────────────────────┐
│  USUARIO: Configuración → Respaldo → "Exportar y Compartir" │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Modal de Confirmación                      │
│  "Se creará un archivo con todos tus datos..."              │
└────────┬────────────────────────────────────────┬───────────┘
         │ Confirmar                               │ Cancelar
         ▼                                         ▼
┌──────────────────────────┐            ┌──────────────────────┐
│  exportData()            │            │  Cerrar modal        │
│  (backupService.js)      │            └──────────────────────┘
│                          │
│  • Recopilar TODOS       │
│    los datos             │
│  • Crear JSON v2.0       │
│  • Guardar archivo       │
│  • Abrir diálogo         │
│    de compartir          │
└──────────┬───────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│              Diálogo de Android "Compartir"                  │
│                                                              │
│  📱 Google Drive  ✉️ Email  💬 WhatsApp  📂 Otros           │
└────────┬────────────────────────────────────────┬───────────┘
         │ Usuario elige                           │
         ▼                                         ▼
┌──────────────────────────┐            ┌──────────────────────┐
│  Archivo guardado en     │            │  Archivo guardado en │
│  Google Drive ☁️         │            │  otra ubicación      │
│                          │            └──────────────────────┘
│  ✅ PROTEGIDO CONTRA     │
│     PÉRDIDA DE CELULAR   │
└──────────────────────────┘
```

---

## 📥 Flujo de Importación

```
┌─────────────────────────────────────────────────────────────┐
│  USUARIO: Configuración → Respaldo → "Importar Datos"       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Selector de Archivos de Android                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  importData() lee archivo                    │
│                  (backupService.js)                          │
└────────┬────────────────────────────────────────┬───────────┘
         │ Válido                                  │ Inválido
         ▼                                         ▼
┌──────────────────────────┐            ┌──────────────────────┐
│  Modal con Resumen       │            │  Modal de Error      │
│                          │            │  "Archivo inválido"  │
│  • Fecha del respaldo    │            └──────────────────────┘
│  • X clientes            │
│  • X productos           │
│  • X ventas              │
│  • X gastos              │
│                          │
│  [Fusionar] [Reemplazar] │
└────┬──────────────┬──────┘
     │              │
     │ Fusionar     │ Reemplazar
     ▼              ▼
┌─────────────┐  ┌──────────────────┐
│ Agregar     │  │ Confirmar        │
│ datos sin   │  │ Reemplazo        │
│ borrar      │  │                  │
│ existentes  │  │ "Esto ELIMINARÁ  │
│             │  │  todos tus datos │
│             │  │  actuales..."    │
└──────┬──────┘  └────────┬─────────┘
       │                  │
       │                  │ Confirmar
       ▼                  ▼
┌─────────────────────────────────────┐
│  Aplicar Datos Importados           │
│                                     │
│  • Guardar en AsyncStorage          │
│  • Actualizar repositorios          │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  ✅ Datos Restaurados               │
│  "Reinicia la app para ver cambios" │
└─────────────────────────────────────┘
```

---

## 🔔 Flujo de Recordatorio

```
┌─────────────────────────────────────────────────────────────┐
│              USUARIO ABRE LA APP (Pantalla Inicio)           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Esperar 5 segundos (no intrusivo)               │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│         ¿Han pasado más de 7 días desde el último           │
│              recordatorio de exportación?                    │
└────────┬────────────────────────────────────────┬───────────┘
         │ SÍ                                      │ NO
         ▼                                         ▼
┌──────────────────────────┐            ┌──────────────────────┐
│  Mostrar Modal           │            │  No mostrar nada     │
│  ExportReminderModal     │            └──────────────────────┘
│                          │
│  "Protege tus Datos"     │
│                          │
│  "Han pasado varios días │
│   desde tu último        │
│   respaldo manual..."    │
│                          │
│  [Más Tarde] [Exportar]  │
└────┬──────────────┬──────┘
     │              │
     │ Más Tarde    │ Exportar Ahora
     ▼              ▼
┌─────────────┐  ┌──────────────────┐
│ Cerrar      │  │ Navegar a        │
│ modal       │  │ Configuración    │
│             │  │                  │
│ Marcar      │  │ Abrir sección    │
│ recordatorio│  │ de Respaldo      │
│ como        │  └──────────────────┘
│ mostrado    │
└─────────────┘
```

---

## 🔄 Flujo de Restauración desde Respaldo Automático

```
┌─────────────────────────────────────────────────────────────┐
│  USUARIO: Configuración → Respaldo → Lista de Respaldos     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Ver Lista de Respaldos Automáticos              │
│                                                              │
│  📁 10/05/2026 14:30 - 125 KB  [🔄] [🗑️]                   │
│  📁 09/05/2026 14:30 - 124 KB  [🔄] [🗑️]                   │
│  📁 08/05/2026 14:30 - 123 KB  [🔄] [🗑️]                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ Usuario presiona [🔄]
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Modal de Confirmación                      │
│                                                              │
│  "¿Deseas restaurar el respaldo del 10/05/2026 14:30?"     │
│  "Esto reemplazará tus datos actuales."                    │
│                                                              │
│  [Cancelar] [Restaurar]                                     │
└────────┬────────────────────────────────────────┬───────────┘
         │ Cancelar                                │ Restaurar
         ▼                                         ▼
┌──────────────────────────┐            ┌──────────────────────┐
│  Cerrar modal            │            │  Leer archivo local  │
└──────────────────────────┘            │  Aplicar datos       │
                                        │  Actualizar storage  │
                                        └──────────┬───────────┘
                                                   │
                                                   ▼
                                        ┌──────────────────────┐
                                        │  ✅ Datos Restaurados│
                                        │  "Reinicia la app"   │
                                        └──────────────────────┘
```

---

## 📊 Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                         APP.JS                               │
│                    (Punto de Entrada)                        │
│                                                              │
│  • useAutoBackup() ← Hook principal                         │
│  • Verifica respaldos al iniciar                            │
│  • Verifica al volver del background                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  CAPA DE SERVICIOS                           │
│                                                              │
│  ┌──────────────────────┐  ┌──────────────────────┐        │
│  │ autoBackupService.js │  │  backupService.js    │        │
│  │                      │  │                      │        │
│  │ • Respaldos auto     │  │ • Exportación manual │        │
│  │ • Gestión local      │  │ • Importación        │        │
│  │ • Recordatorios      │  │ • Fusión/Reemplazo   │        │
│  └──────────────────────┘  └──────────────────────┘        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    CAPA DE DATOS                             │
│                                                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │ AsyncStorage│ │ FileSystem  │ │ Repositories│          │
│  │             │ │             │ │             │          │
│  │ • Clientes  │ │ • Respaldos │ │ • Productos │          │
│  │ • Cuentas   │ │   locales   │ │ • Ventas    │          │
│  │ • Config    │ │ • Archivos  │ │ • Gastos    │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    CAPA DE UI                                │
│                                                              │
│  ┌──────────────────────┐  ┌──────────────────────┐        │
│  │ ConfiguracionScreen  │  │  InicioScreen        │        │
│  │                      │  │                      │        │
│  │ • AutoBackupManager  │  │ • ExportReminder     │        │
│  │ • Exportar/Importar  │  │   Modal              │        │
│  └──────────────────────┘  └──────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Puntos Clave

### ✅ Automatización
- Respaldos se crean solos cada 24 horas
- No requiere intervención del usuario
- Silencioso y transparente

### ✅ Seguridad
- Múltiples capas de protección
- 7 puntos de restauración
- Recordatorios inteligentes

### ✅ Flexibilidad
- Respaldos locales (rápidos)
- Exportación a nube (seguros)
- Fusión o reemplazo (opciones)

### ✅ Usabilidad
- Interfaz clara y simple
- Mensajes informativos
- Proceso guiado paso a paso

---

**Sistema completo y funcional** ✨
