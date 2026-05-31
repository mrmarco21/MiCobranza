import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image, StatusBar, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatCurrency, obtenerNombreProductoCompleto } from '../../shared/utils/helpers';
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
    const [productoMenuVisible, setProductoMenuVisible] = useState(false);
    const [productoMenuPosition, setProductoMenuPosition] = useState({ x: 0, y: 0 });

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
        const producto = productosSeleccionados.find(p => p.id === productoId);

        Alert.alert(
            'Eliminar producto',
            `¿Deseas eliminar "${obtenerNombreProductoCompleto(producto)}" del carrito?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: () => {
                        setProductosSeleccionados(productosSeleccionados.filter(p => p.id !== productoId));
                        showToast({
                            type: 'success',
                            text: 'Producto eliminado',
                            size: 'small',
                            duration: 2000,
                        });
                    },
                },
            ]
        );
    };

    const handleCambiarCantidad = (productoId, nuevaCantidad) => {
        if (nuevaCantidad <= 0) {
            // Mostrar alerta de confirmación antes de eliminar
            const producto = productosSeleccionados.find(p => p.id === productoId);

            Alert.alert(
                'Eliminar producto',
                `¿Deseas eliminar "${obtenerNombreProductoCompleto(producto)}" del carrito?`,
                [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                        text: 'Eliminar',
                        style: 'destructive',
                        onPress: () => {
                            setProductosSeleccionados(productosSeleccionados.filter(p => p.id !== productoId));
                            showToast({
                                type: 'success',
                                text: 'Producto eliminado',
                                size: 'small',
                                duration: 2000,
                            });
                        },
                    },
                ]
            );
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
                            size: 'small',
                            duration: 2000,
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
                size: 'small',
                duration: 2000,
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
                size: 'small',
                duration: 2000,
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
            size: 'small',
            duration: 2000,
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
            size: 'small',
            duration: 2000,
        });
    };

    const styles = createStyles(colors);

    const handleProductoMenuPress = (producto, event) => {
        event.stopPropagation();
        event.target.measure((_fx, _fy, _width, height, px, py) => {
            setProductoMenuPosition({ x: px - 150, y: py + height + 5 });
            setProductoAEditar(producto);
            setProductoMenuVisible(true);
        });
    };

    const handleDescuentoProducto = () => {
        setProductoMenuVisible(false);
        // TODO: Implementar funcionalidad de descuento
        showToast({
            type: 'info',
            text: 'Funcionalidad de descuento próximamente',
        });
    };

    const handleVerDetalleProducto = () => {
        setProductoMenuVisible(false);
        if (productoAEditar) {
            navigation.navigate('DetalleProducto', { productoId: productoAEditar.id });
        }
    };

    const handleEliminarProductoMenu = () => {
        setProductoMenuVisible(false);
        if (productoAEditar) {
            handleEliminarProducto(productoAEditar.id);
        }
    };

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
                            {obtenerNombreProductoCompleto(item)}
                        </Text>

                        {/* Primera fila: Precio editable */}
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

                        {/* Segunda fila: Controles de cantidad */}
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

                <View style={styles.productoRightSeleccionado}>
                    <TouchableOpacity
                        style={styles.menuBtnProducto}
                        onPress={(e) => handleProductoMenuPress(item, e)}
                    >
                        <Ionicons name="ellipsis-vertical" size={20} color="#636E72" />
                    </TouchableOpacity>

                    <Text style={styles.subtotalTexto}>
                        {formatCurrency(item.precioVenta * item.cantidad)}
                    </Text>

                    <Text style={styles.stockTextoProducto}>
                        Stock: {item.stock}
                    </Text>
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
                        <Ionicons name="arrow-forward" size={20} color="#29B6F6" />
                    </TouchableOpacity>
                </View>
            )}

            {/* Menú dropdown del producto */}
            {productoMenuVisible && (
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setProductoMenuVisible(false)}
                >
                    <View style={[styles.menuDropdown, { top: productoMenuPosition.y, left: productoMenuPosition.x }]}>
                        <TouchableOpacity
                            style={styles.menuOption}
                            onPress={handleDescuentoProducto}
                        >
                            {/* <Ionicons name="pricetag-outline" size={20} color={colors.text} /> */}
                            <Text style={styles.menuOptionText}>Descuento</Text>
                        </TouchableOpacity>

                        <View style={styles.menuDivider} />

                        <TouchableOpacity
                            style={styles.menuOption}
                            onPress={handleVerDetalleProducto}
                        >
                            {/* <Ionicons name="eye-outline" size={20} color={colors.text} /> */}
                            <Text style={styles.menuOptionText}>Ver detalle</Text>
                        </TouchableOpacity>

                        <View style={styles.menuDivider} />

                        <TouchableOpacity
                            style={styles.menuOption}
                            onPress={handleEliminarProductoMenu}
                        >
                            {/* <Ionicons name="trash-outline" size={20} color="#FF6B6B" /> */}
                            <Text style={[styles.menuOptionText, { color: '#FF6B6B' }]}>Eliminar</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
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
        borderRadius: 5,
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
        alignItems: 'flex-start',
        paddingVertical: 14,
        borderBottomWidth: 0.3,
        borderBottomColor: "gray",
    },
    productoLeft: {
        position: "relative",
        flexDirection: 'row',
        flex: 1,
        gap: 12,
        // borderWidth: 2,
        // borderColor: "red"
    },
    imagenContainerSmall: {
        width: 50,
        height: 50,
        borderRadius: 8,
        overflow: 'hidden',
        // borderWidth: 1,
        // borderColor: "gray",
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
        justifyContent: 'flex-start',
        gap: 6,
    },
    productoNombreSeleccionado: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.text,
        lineHeight: 18,
    },
    precioYTotalContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
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
        gap: 6,
        paddingVertical: 5,
        paddingHorizontal: 7,
        borderRadius: 5,
        backgroundColor: colors.surfaceVariant,
        borderWidth: 0.3,
        borderColor: "gray",
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
    subtotalTexto: {
        fontSize: 15,
        fontWeight: '600',   // antes '700'
        color: colors.text,
        marginTop: 8,
    },
    totalYStockContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    cantidadControls: {
        // position: "absolute",
        left: -65,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        // borderWidth:1,
        // borderColor: "red",
        marginLeft: 5,
        marginRight: 80,
    },
    stockTextoProducto: {
        fontSize: 11,
        color: colors.textSecondary,
        fontWeight: '500',
        marginTop: 4,
    },
    productoRightSeleccionado: {
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        paddingTop: 4,
    },
    menuBtnProducto: {
        padding: 4,
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
        paddingVertical: 1,
        paddingHorizontal: 8,
        borderRadius: 4,
        backgroundColor: colors.surfaceVariant,
        minWidth: 40,
        justifyContent: 'center',
        // borderWidth: 0.2,
        // borderColor: "gray"
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
        // backgroundColor: '#29B6F6',
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 24,
        gap: 8,
        marginLeft: 66,
        marginRight: 66,
        borderWidth: 1,
        borderColor: '#29B6F6',
    },
    continuarTexto: {
        fontSize: 15,
        fontWeight: '600',
        color: '#29B6F6',
        alignContent: 'center'
    },
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'transparent',
    },
    menuDropdown: {
        position: 'absolute',
        backgroundColor: colors.card,
        borderRadius: 8,
        minWidth: 160,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
        borderWidth: 1,
        borderColor: colors.border,
    },
    menuOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 11,
        paddingHorizontal: 10,
    },
    menuOptionText: {
        fontSize: 14,
        color: colors.text,
        fontWeight: '500',
        marginLeft: 12,
    },
    menuDivider: {
        height: 1,
        backgroundColor: colors.border,
        marginHorizontal: 8,
    },
});