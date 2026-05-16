/**
 * Sistema de eventos global para sincronización en tiempo real
 * Permite que todas las pantallas se actualicen cuando cambian los datos
 */

class EventEmitter {
    constructor() {
        this.listeners = {};
    }

    /**
     * Suscribirse a un evento
     * @param {string} event - Nombre del evento
     * @param {function} callback - Función a ejecutar cuando ocurra el evento
     * @returns {function} Función para desuscribirse
     */
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
        
        // console.log(`✅ [EventEmitter] Nuevo listener para ${event}. Total: ${this.listeners[event].length}`);

        // Retornar función para desuscribirse
        return () => {
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
            // console.log(`❌ [EventEmitter] Listener removido de ${event}. Total: ${this.listeners[event].length}`);
        };
    }

    /**
     * Emitir un evento
     * @param {string} event - Nombre del evento
     * @param {*} data - Datos a pasar a los listeners
     */
    emit(event, data) {
        // console.log(`📢 [EventEmitter] Emitiendo evento: ${event}`, data?.nombre || data?.id || '');
        
        if (this.listeners[event]) {
            // console.log(`👂 [EventEmitter] ${this.listeners[event].length} listeners para ${event}`);
            this.listeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    // console.error(`Error en listener de evento ${event}:`, error);
                }
            });
        } else {
            // console.log(`⚠️ [EventEmitter] No hay listeners para ${event}`);
        }
    }

    /**
     * Eliminar todos los listeners de un evento
     * @param {string} event - Nombre del evento
     */
    removeAllListeners(event) {
        if (event) {
            delete this.listeners[event];
        } else {
            this.listeners = {};
        }
    }
}

// Instancia singleton
const eventEmitter = new EventEmitter();

// Eventos disponibles
export const EVENTS = {
    PRODUCTO_UPDATED: 'producto:updated',
    PRODUCTO_CREATED: 'producto:created',
    PRODUCTO_DELETED: 'producto:deleted',
    PRODUCTOS_BATCH_UPDATED: 'productos:batch_updated',
    VENTA_CREATED: 'venta:created',
    CLIENTE_UPDATED: 'cliente:updated',
    CUENTA_UPDATED: 'cuenta:updated',
};

export default eventEmitter;
