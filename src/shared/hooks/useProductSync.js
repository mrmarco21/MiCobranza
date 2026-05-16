import { useEffect, useCallback } from 'react';
import eventEmitter, { EVENTS } from '../events/EventEmitter';

/**
 * Hook personalizado para sincronizar productos en tiempo real
 * Escucha eventos de actualización/eliminación de productos y actualiza el estado
 */
export const useProductSync = (setProductosCallback) => {
    // Crear callbacks estables con useCallback
    const actualizarProducto = useCallback((productoActualizado) => {
        console.log(`📥 [Sync] Evento recibido para: ${productoActualizado.nombre}`);
        
        setProductosCallback(prevProductos => {
            const productoEnLista = prevProductos.find(p => p.id === productoActualizado.id);
            
            if (!productoEnLista) {
                // console.log(`⏭️ [Sync] Producto no está en la lista, ignorando`);
                return prevProductos;
            }

            // console.log(`🔄 [Sync] Actualizando: ${productoActualizado.nombre}`);

            return prevProductos.map(p => {
                if (p.id === productoActualizado.id) {
                    // Si el producto tiene precio editado manualmente, preservarlo
                    const precioFueEditado = p.precioVentaOriginal &&
                        p.precioVenta !== p.precioVentaOriginal;

                    return {
                        ...productoActualizado,
                        cantidad: p.cantidad, // Preservar cantidad del carrito
                        precioVenta: precioFueEditado ? p.precioVenta : productoActualizado.precioVenta,
                        precioVentaOriginal: precioFueEditado ? p.precioVentaOriginal : productoActualizado.precioVenta,
                    };
                }
                return p;
            });
        });
    }, [setProductosCallback]);

    const eliminarProducto = useCallback((data) => {
        console.log(`📥 [Sync] Evento de eliminación recibido para ID: ${data.id}`);
        
        setProductosCallback(prevProductos => {
            const productoEliminado = prevProductos.find(p => p.id === data.id);
            if (productoEliminado) {
                // console.log(`🗑️ [Sync] Eliminando: ${productoEliminado.nombre}`);
                return prevProductos.filter(p => p.id !== data.id);
            }
            return prevProductos;
        });
    }, [setProductosCallback]);

    const actualizarProductosBatch = useCallback((productosActualizados) => {
        // console.log(`📥 [Sync] Evento batch recibido para ${productosActualizados.length} productos`);
        
        setProductosCallback(prevProductos => {
            let cambios = false;
            const nuevosProductos = prevProductos.map(p => {
                const productoActualizado = productosActualizados.find(pa => pa.id === p.id);
                if (productoActualizado) {
                    cambios = true;
                    // console.log(`🔄 [Sync Batch] Actualizando: ${productoActualizado.nombre}`);
                    
                    const precioFueEditado = p.precioVentaOriginal &&
                        p.precioVenta !== p.precioVentaOriginal;

                    return {
                        ...productoActualizado,
                        cantidad: p.cantidad,
                        precioVenta: precioFueEditado ? p.precioVenta : productoActualizado.precioVenta,
                        precioVentaOriginal: precioFueEditado ? p.precioVentaOriginal : productoActualizado.precioVenta,
                    };
                }
                return p;
            });

            return cambios ? nuevosProductos : prevProductos;
        });
    }, [setProductosCallback]);

    useEffect(() => {
        // console.log('🎧 [Sync] Suscribiéndose a eventos de productos');
        
        // Suscribirse a eventos
        const unsubscribeUpdate = eventEmitter.on(EVENTS.PRODUCTO_UPDATED, actualizarProducto);
        const unsubscribeDelete = eventEmitter.on(EVENTS.PRODUCTO_DELETED, eliminarProducto);
        const unsubscribeBatch = eventEmitter.on(EVENTS.PRODUCTOS_BATCH_UPDATED, actualizarProductosBatch);

        // Limpiar suscripciones
        return () => {
            // console.log('🔌 [Sync] Desuscribiéndose de eventos de productos');
            unsubscribeUpdate();
            unsubscribeDelete();
            unsubscribeBatch();
        };
    }, [actualizarProducto, eliminarProducto, actualizarProductosBatch]);
};
