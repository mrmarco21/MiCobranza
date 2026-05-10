import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image, StatusBar, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatCurrency } from '../../shared/utils/helpers';
import Header from '../../shared/components/Header';
import { useTheme } from '../../shared/hooks/useTheme';
import { useToast } from '../../shared/context/ToastContext';
import { useProductSync } from '../../shared/hooks/useProductSync';
import PuntoVentaMenuModal from './components/PuntoVentaMenuModal';
import BorradoresModal from './components/BorradoresModal';
import EditarPrecioModal from './components/EditarPrecioModal';
import EditarCantidadModal from './components/EditarCantidadModal';
import { guardarBorrador } from '../../data/borradoresRepository';
import { getById as getProductoById } from '../../data/productosRepository';

const PUNTO_VENTA_STORAGE_KEY = '@punto_venta_temp';

export default function PuntoVentaScreen({ route, navigation }) {
    const { clienteId, clienteNombre, cuentaId, nuevaCuenta } = route.params || {};
    const { colors } = useTheme();
    const { showToast } = useToast();
    const insets = useSafeAreaInsets();

    const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
    const [productosSeleccionados, setProductosSeleccionados] = useState([]);
    const [menuVisible, setMenuVisible] = useState(false);
    const [borradoresModalVisible, setBorradoresModalVisible] = useState(false);
    const [editarPrecioModalVisible, setEditarPrecioModalVisible] = useState(false);
    const [editarCantidadModalVisible, setEditarCantidadModalVisible] = useState(false);
    const [productoAEditar, setProductoAEditar] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    // Sincronización automática en tiempo real
    useProductSync(setProductosSeleccionados);

    // Guardar en AsyncStorage cada vez que cambian los productos o cliente
    const guardarEstadoTemporal = async (productos, cliente) => {
        try {
            const estado = {
                productos: productos || [],
                cliente: cliente || null,
                timestamp: Date.now()
            };
            await AsyncStorage.setItem(PUNTO_VENTA_STORAGE_KEY, JSON.stringify(estado));
        } catch (error) {
            console.error('Error al guardar estado temporal:', error);
        }
    };

    // Cargar desde AsyncStorage
    const cargarEstadoTemporal = async () => {
        try {
            const estadoStr = await AsyncStorage.getItem(PUNTO_VENTA_STORAGE_KEY);
            if (estadoStr) {
                const estado = JSON.parse(estadoStr);
                return estado;
            }
        } catch (error) {
            console.error('Error al cargar estado temporal:', error);
        }
        return null;
    };

    useFocusEffect(
        React.useCallback(() => {
            // Forzar StatusBar a oscuro cuando esta pantalla está activa
            // Usar setTimeout para asegurar que se aplique después de cualquier cambio previo
            const timerId = setTimeout(() => {
                StatusBar.setBarStyle('dark-content', true);
            }, 0);

            const cargarDatos = async () => {
                // Si viene desde ClientaDetailScreen (con clienteId y clienteNombre)
                if (clienteId && clienteNombre) {
                    // Establecer el cliente
                    setClienteSeleccionado({ id: clienteId, nombre: clienteNombre });
                    // Limpiar productos (empezar desde cero)
                    setProductosSeleccionados([]);
                    // Limpiar el storage temporal
                    await AsyncStorage.removeItem(PUNTO_VENTA_STORAGE_KEY);
                } else if (route.params?.limpiarEstado) {
                    // Si viene con flag de limpiar estado (después de completar una venta)
                    setClienteSeleccionado(null);
                    setProductosSeleccionados([]);
                    await AsyncStorage.removeItem(PUNTO_VENTA_STORAGE_KEY);
                    // Limpiar el parámetro para evitar que se ejecute nuevamente
                    navigation.setParams({ limpiarEstado: undefined });
                } else {
                    // Flujo normal: cargar desde params o AsyncStorage
                    if (route.params?.clienteSeleccionado) {
                        setClienteSeleccionado(route.params.clienteSeleccionado);
                    }

                    if (route.params?.productosSeleccionados) {
                        console.log('🔍 PuntoVenta - Productos desde params:', route.params.productosSeleccionados.map(p => ({
                            nombre: p.nombre,
                            categoria: p.categoria,
                            categoriaType: typeof p.categoria
                        })));
                        setProductosSeleccionados(route.params.productosSeleccionados);
                    } else {
                        // Si no hay params, cargar desde AsyncStorage
                        const estadoGuardado = await cargarEstadoTemporal();
                        if (estadoGuardado) {
                            // Verificar que el estado no sea muy antiguo (más de 1 hora)
                            const tiempoTranscurrido = Date.now() - estadoGuardado.timestamp;
                            const unaHora = 60 * 60 * 1000;

                            if (tiempoTranscurrido < unaHora) {
                                if (estadoGuardado.productos && estadoGuardado.productos.length > 0) {
                                    console.log('🔍 PuntoVenta - Productos desde AsyncStorage:', estadoGuardado.productos.map(p => ({
                                        nombre: p.nombre,
                                        categoria: p.categoria,
                                        categoriaType: typeof p.categoria
                                    })));
                                    setProductosSeleccionados(estadoGuardado.productos);
                                }
                                if (estadoGuardado.cliente) {
                                    setClienteSeleccionado(estadoGuardado.cliente);
                                }
                            } else {
                                // Estado muy antiguo, limpiar
                                await AsyncStorage.removeItem(PUNTO_VENTA_STORAGE_KEY);
                            }
                        }
                    }
                }
            };

            cargarDatos();

            return () => {
                // Limpiar el timer si el componente se desmonta antes
                clearTimeout(timerId);
                // Restaurar StatusBar a claro cuando se sale de la pantalla
                StatusBar.setBarStyle('light-content');
            };
        }, [clienteId, clienteNombre, route.params?.clienteSeleccionado, route.params?.productosSeleccionados, route.params?.limpiarEstado])
    );

    // Guardar cada vez que cambian los productos o cliente
    React.useEffect(() => {
        if (productosSeleccionados.length > 0 || clienteSeleccionado) {
            console.log('💾 PuntoVenta - Guardando en AsyncStorage:', productosSeleccionados.map(p => ({
                nombre: p.nombre,
                categoria: p.categoria,
                categoriaType: typeof p.categoria
            })));
            guardarEstadoTemporal(productosSeleccionados, clienteSeleccionado);
        }
    }, [productosSeleccionados, clienteSeleccionado]);

    const handleSeleccionarCliente = () => {
        navigation.navigate('clientas', {
            fromPuntoVenta: true,
            productosSeleccionados: productosSeleccionados,
        });
    };

    const handleQuitarCliente = () => {
        setClienteSeleccionado(null);
    };

    const handleAgregarProductos = () => {
        navigation.navigate('SeleccionarProductos', {
            productosYaSeleccionados: productosSeleccionados,
        });
    };

    const handleEliminarProducto = (productoId) => {
        setProductosSeleccionados(productosSeleccionados.filter(p => p.id !== productoId));
    };

    const handleCambiarCantidad = (productoId, nuevaCantidad) => {
        if (nuevaCantidad <= 0) {
            handleEliminarProducto(productoId);
        } else {
            setProductosSeleccionados(
                productosSeleccionados.map(p =>
                    p.id === productoId ? { ...p, cantidad: Math.min(nuevaCantidad, p.stock) } : p
                )
            );
        }
    };

    const calcularTotal = () => {
        return productosSeleccionados.reduce((sum, p) => sum + (p.precioVenta * p.cantidad), 0);
    };

    const cantidadProductosEnCarrito = productosSeleccionados.reduce((sum, p) => sum + p.cantidad, 0);
    const totalVenta = calcularTotal();

    const handleOpenMenu = () => {
        setMenuVisible(true);
    };

    const handleLimpiar = () => {
        if (productosSeleccionados.length === 0) {
            showToast({
                type: 'info',
                text: 'No hay productos para limpiar',
            });
            return;
        }

        Alert.alert(
            'Limpiar Punto de Venta',
            '¿Estás seguro de que deseas eliminar todos los productos del carrito?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Limpiar',
                    style: 'destructive',
                    onPress: async () => {
                        setProductosSeleccionados([]);
                        setClienteSeleccionado(null);
                        await AsyncStorage.removeItem(PUNTO_VENTA_STORAGE_KEY);
                        showToast({
                            type: 'success',
                            text: 'Punto de venta limpiado',
                        });
                    },
                },
            ]
        );
    };

    const handleGuardarBorrador = async () => {
        if (productosSeleccionados.length === 0) {
            showToast({
                type: 'error',
                text: 'No hay productos para guardar',
            });
            return;
        }

        try {
            // Generar nombre automático con fecha y hora
            const ahora = new Date();
            const dia = ahora.getDate().toString().padStart(2, '0');
            const mes = (ahora.getMonth() + 1).toString().padStart(2, '0');
            const año = ahora.getFullYear();
            const horas = ahora.getHours().toString().padStart(2, '0');
            const minutos = ahora.getMinutes().toString().padStart(2, '0');
            const nombreAutomatico = `Borrador ${dia}/${mes}/${año} ${horas}:${minutos}`;

            const borrador = {
                nombre: nombreAutomatico,
                productos: productosSeleccionados,
                cliente: clienteSeleccionado,
            };

            await guardarBorrador(borrador);

            // Limpiar el punto de venta
            setProductosSeleccionados([]);
            setClienteSeleccionado(null);
            await AsyncStorage.removeItem(PUNTO_VENTA_STORAGE_KEY);

            showToast({
                type: 'success',
                text: 'Borrador guardado exitosamente',
            });
        } catch (error) {
            console.error('Error al guardar borrador:', error);
            showToast({
                type: 'error',
                text: 'Error al guardar el borrador',
            });
        }
    };

    const handleAbrirBorradores = () => {
        navigation.navigate('Borradores');
    };

    const handleActualizarProductos = async () => {
        if (productosSeleccionados.length === 0) {
            showToast({
                type: 'info',
                text: 'No hay productos para actualizar',
            });
            return;
        }

        try {
            setRefreshing(true);
            const productosActualizados = await Promise.all(
                productosSeleccionados.map(async (productoEnCarrito) => {
                    const productoActual = await getProductoById(productoEnCarrito.id);

                    if (!productoActual) {
                        return null;
                    }

                    // Si el precio fue editado manualmente, mantenerlo
                    const precioFueEditado = productoEnCarrito.precioVentaOriginal &&
                        productoEnCarrito.precioVenta !== productoEnCarrito.precioVentaOriginal;

                    return {
                        ...productoActual,
                        cantidad: productoEnCarrito.cantidad,
                        precioVenta: precioFueEditado ? productoEnCarrito.precioVenta : productoActual.precioVenta,
                        precioVentaOriginal: precioFueEditado ? productoEnCarrito.precioVentaOriginal : productoActual.precioVenta,
                    };
                })
            );

            const productosFiltrados = productosActualizados.filter(p => p !== null);

            setProductosSeleccionados(productosFiltrados);

            showToast({
                type: 'success',
                text: 'Productos actualizados',
            });
        } catch (error) {
            console.error('Error al actualizar productos:', error);
            showToast({
                type: 'error',
                text: 'Error al actualizar productos',
            });
        } finally {
            setRefreshing(false);
        }
    };

    const handleRefresh = async () => {
        await handleActualizarProductos();
    };

    const handleEditarPrecio = (producto) => {
        setProductoAEditar(producto);
        setEditarPrecioModalVisible(true);
    };

    const handleEditarCantidad = (producto) => {
        setProductoAEditar(producto);
        setEditarCantidadModalVisible(true);
    };

    const handleGuardarPrecio = (nuevoPrecio) => {
        setProductosSeleccionados(
            productosSeleccionados.map(p => {
                if (p.id === productoAEditar.id) {
                    return {
                        ...p,
                        precioVenta: nuevoPrecio,
                        precioVentaOriginal: p.precioVentaOriginal || p.precioVenta,
                    };
                }
                return p;
            })
        );

        showToast({
            type: 'success',
            text: 'Precio actualizado',
        });
    };

    const handleGuardarCantidad = (nuevaCantidad) => {
        setProductosSeleccionados(
            productosSeleccionados.map(p => {
                if (p.id === productoAEditar.id) {
                    return {
                        ...p,
                        cantidad: Math.min(nuevaCantidad, p.stock),
                    };
                }
                return p;
            })
        );

        showToast({
            type: 'success',
            text: 'Cantidad actualizada',
        });
    };

    const styles = createStyles(colors);

    const renderProductoSeleccionado = ({ item }) => {
        const precioModificado = item.precioVentaOriginal && item.precioVenta !== item.precioVentaOriginal;

        return (
            <View style={styles.productoSeleccionadoCard}>
                <View style={styles.productoLeft}>
                    <View style={styles.imagenContainerSmall}>
                        {item.imagen ? (
                            <Image source={{ uri: item.imagen }} style={styles.imagen} />
                        ) : (
                            <View style={styles.imagenPlaceholder}>
                                <Ionicons name="image-outline" size={24} color="#95A5A6" />
                            </View>
                        )}
                    </View>

                    <View style={styles.productoInfoSeleccionado}>
                        <Text style={styles.productoNombreSeleccionado} numberOfLines={2}>
                            {item.nombre}
                        </Text>
                        <View style={styles.precioContainer}>
                            {precioModificado && (
                                <Text style={styles.precioOriginalTachado}>
                                    {formatCurrency(item.precioVentaOriginal)}
                                </Text>
                            )}
                            <TouchableOpacity
                                style={styles.precioEditableContainer}
                                onPress={() => handleEditarPrecio(item)}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.productoPrecioSeleccionado, precioModificado && styles.precioModificado]}>
                                    {formatCurrency(item.precioVenta)}
                                </Text>
                                <Ionicons name="pencil" size={14} color={precioModificado ? "#FF9800" : "#7F8C8D"} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                <View style={styles.productoRightSeleccionado}>
                    <Text style={styles.subtotalTexto}>
                        {formatCurrency(item.precioVenta * item.cantidad)}
                    </Text>
                    <View style={styles.cantidadControls}>
                        <TouchableOpacity
                            style={styles.cantidadBtn}
                            onPress={() => handleCambiarCantidad(item.id, item.cantidad - 1)}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="remove" size={16} color="#2C3E50" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.cantidadEditableContainer}
                            onPress={() => handleEditarCantidad(item)}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.cantidadTextoControl}>{item.cantidad}</Text>
                            <Ionicons name="pencil" size={12} color="#7F8C8D" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.cantidadBtn}
                            onPress={() => handleCambiarCantidad(item.id, item.cantidad + 1)}
                            activeOpacity={0.7}
                            disabled={item.cantidad >= item.stock}
                        >
                            <Ionicons name="add" size={16} color="#2C3E50" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    // Vista principal
    return (
        <View style={styles.container}>
            {/* Header blanco */}
            <Header
                title={`Ventas: ${formatCurrency(totalVenta)} (${cantidadProductosEnCarrito})`}
                showMenu
                whiteBackground
                rightButtons={[
                    {
                        icon: 'ellipsis-vertical',
                        onPress: handleOpenMenu,
                    }
                ]}
            />

            {/* Modales */}
            <PuntoVentaMenuModal
                visible={menuVisible}
                onClose={() => setMenuVisible(false)}
                onLimpiar={handleLimpiar}
                onBorradores={() => setBorradoresModalVisible(true)}
                onActualizar={handleActualizarProductos}
                anchorPosition={{ top: insets.top + 25, right: 10 }}
            />

            <BorradoresModal
                visible={borradoresModalVisible}
                onClose={() => setBorradoresModalVisible(false)}
                onGuardarBorrador={handleGuardarBorrador}
                onAbrirBorrador={handleAbrirBorradores}
                anchorPosition={{ top: insets.top + 25, right: 10 }}
            />

            <EditarPrecioModal
                visible={editarPrecioModalVisible}
                onClose={() => setEditarPrecioModalVisible(false)}
                producto={productoAEditar}
                onGuardar={handleGuardarPrecio}
            />

            <EditarCantidadModal
                visible={editarCantidadModalVisible}
                onClose={() => setEditarCantidadModalVisible(false)}
                producto={productoAEditar}
                onGuardar={handleGuardarCantidad}
            />

            {/* Botones de acción */}
            <View style={styles.actionButtonsContainer}>
                <TouchableOpacity
                    style={styles.seleccionarClienteBtn}
                    onPress={handleSeleccionarCliente}
                    activeOpacity={0.7}
                >
                    <Ionicons name="pencil" size={16} color="#5DADE2" />
                    <View style={styles.clienteNombreContainer}>
                        <Text style={styles.seleccionarClienteTexto}>
                            {clienteSeleccionado ? clienteSeleccionado.nombre : 'Seleccionar cliente'}
                        </Text>
                        {clienteSeleccionado && (
                            <TouchableOpacity
                                onPress={handleQuitarCliente}
                                activeOpacity={0.7}
                                style={styles.quitarClienteBtn}
                            >
                                <Ionicons name="close" size={18} color="#FF6B6B" />
                            </TouchableOpacity>
                        )}
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.agregarProductosBtn}
                    onPress={handleAgregarProductos}
                    activeOpacity={0.7}
                >
                    <Ionicons name="add" size={16} color="#5DADE2" />
                    <Text style={styles.agregarProductosTexto}>AGREGAR</Text>
                </TouchableOpacity>
            </View>

            {/* Lista de productos seleccionados o estado vacío */}
            {productosSeleccionados.length === 0 ? (
                <View style={styles.emptyStateContainer}>
                    <View style={styles.emptyStateContent}>
                        <Text style={styles.emptyMessage}>
                            No se ha agregado ningun producto.
                            Agrega productos para comenzar la venta.
                        </Text>
                    </View>
                </View>
            ) : (
                <FlatList
                    data={productosSeleccionados}
                    keyExtractor={(item) => item.id}
                    renderItem={renderProductoSeleccionado}
                    contentContainerStyle={[
                        styles.listContainer,
                        { paddingBottom: Math.max(insets.bottom + 100, 100) }
                    ]}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            colors={['#29B6F6']}
                            tintColor="#29B6F6"
                        />
                    }
                />
            )}

            {/* Footer con total y botón continuar */}
            {productosSeleccionados.length > 0 && (
                <View style={[styles.footerContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
                    {/* <View style={styles.totalContainer}>
                        <Text style={styles.totalLabel}>Total</Text>
                        <Text style={styles.totalValor}>{formatCurrency(totalVenta)}</Text>
                    </View> */}
                    <TouchableOpacity
                        style={styles.continuarBtn}
                        onPress={() => {
                            navigation.navigate('MetodoPago', {
                                productosSeleccionados: productosSeleccionados,
                                clienteSeleccionado: clienteSeleccionado,
                                totalVenta: totalVenta,
                                cuentaId: cuentaId,
                                nuevaCuenta: nuevaCuenta
                            });
                        }}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.continuarTexto}>Continuar</Text>
                        <Ionicons name="arrow-forward" size={20} color="#FFF" />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const createStyles = (colors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 1,
        gap: 12,
        backgroundColor: '#FFFFFF',
        // borderBottomWidth: 1,
        // borderBottomColor: '#E0E0E0',
    },
    seleccionarClienteBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        borderRadius: 8,
        paddingVertical: 0,
        paddingHorizontal: 10,
        gap: 8,
        // borderWidth: 1,
    },
    clienteNombreContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        flex: 1,
    },
    seleccionarClienteTexto: {
        fontSize: 15,
        fontWeight: '600',
        color: '#5DADE2',
        textDecorationLine: 'underline',
        letterSpacing: 0.9,
    },
    quitarClienteBtn: {
        padding: 0,
        marginLeft: 0,
    },
    agregarProductosBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        paddingVertical: 5,
        paddingHorizontal: 10,
        gap: 6,
        // borderWidth: 1,
    },
    agregarProductosTexto: {
        fontSize: 14,
        fontWeight: '600',
        color: '#5DADE2',
        textDecorationLine: 'underline',
        letterSpacing: 0.8
    },
    emptyStateContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    emptyStateContent: {
        alignItems: 'center',
        width: '100%',
    },
    emptyMessage: {
        fontSize: 15,
        color: '#85C1E9',
        textAlign: 'center',
        lineHeight: 22,
    },
    listContainer: {
        paddingHorizontal: 16,
        paddingTop: 12,
    },
    productoSeleccionadoCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    productoLeft: {
        flexDirection: 'row',
        flex: 1,
        gap: 12,
    },
    imagenContainerSmall: {
        width: 50,
        height: 50,
        borderRadius: 8,
        overflow: 'hidden',
    },
    imagen: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    imagenPlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: colors.surfaceVariant,
        justifyContent: 'center',
        alignItems: 'center',
    },
    productoInfoSeleccionado: {
        flex: 1,
        justifyContent: 'center',
    },
    productoNombreSeleccionado: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 4,
        lineHeight: 18,
    },
    precioContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flexWrap: 'wrap',
    },
    precioOriginalTachado: {
        fontSize: 12,
        color: colors.textSecondary,
        textDecorationLine: 'line-through',
    },
    precioEditableContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 2,
        paddingHorizontal: 6,
        borderRadius: 4,
        backgroundColor: colors.surfaceVariant,
    },
    productoPrecioSeleccionado: {
        fontSize: 13,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    precioModificado: {
        color: '#FF9800',
        fontWeight: '700',
    },
    productoRightSeleccionado: {
        alignItems: 'flex-end',
        gap: 8,
    },
    subtotalTexto: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
    },
    cantidadControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    cantidadBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.surfaceVariant,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cantidadEditableContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 4,
        backgroundColor: colors.surfaceVariant,
        minWidth: 40,
        justifyContent: 'center',
    },
    cantidadTextoControl: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
        textAlign: 'center',
    },
    footerContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.card,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingHorizontal: 16,
        paddingTop: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    totalContainer: {
        // flex: 1,
        borderWidth: 1,
        borderColor: 'black'
    },
    totalLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        marginBottom: 2,
    },
    totalValor: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
    },
    continuarBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        // alignContent: 'center',
        justifyContent: 'center',
        backgroundColor: '#29B6F6',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 24,
        gap: 8,
        marginLeft: 66,
        marginRight: 66,
    },
    continuarTexto: {
        fontSize: 15,
        fontWeight: '600',
        color: '#FFF',
        alignContent: 'center'
    },
});

