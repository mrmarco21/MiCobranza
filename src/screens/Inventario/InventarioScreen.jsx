import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { obtenerProductos } from '../../services/productosService';
import * as categoriasRepo from '../../data/categoriasRepository';
import { formatCurrency, obtenerNombreProductoCompleto } from '../../shared/utils/helpers';
import Header from '../../shared/components/Header';
import EmptyState from '../../shared/components/EmptyState';
import { useTheme } from '../../shared/hooks/useTheme';
import eventEmitter, { EVENTS } from '../../shared/events/EventEmitter';

export default function InventarioScreen({ navigation }) {
    const { colors } = useTheme();
    const [productos, setProductos] = useState([]);
    const [productosFiltrados, setProductosFiltrados] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [loading, setLoading] = useState(true);
    const [modoBusqueda, setModoBusqueda] = useState(false);
    const [menuVisible, setMenuVisible] = useState(false);
    const [productoSeleccionado, setProductoSeleccionado] = useState(null);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
    const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null); // null = "Todo"

    // Función para aplicar filtros (definida antes del useEffect)
    const aplicarFiltros = React.useCallback(async (prods, textoBusqueda, categoriaId) => {
        let resultado = prods;

        // Filtrar por búsqueda primero (búsqueda flexible)
        if (textoBusqueda.trim() !== '') {
            try {
                const productosRepo = await import('../../data/productosRepository');
                resultado = await productosRepo.buscar(textoBusqueda);
            } catch (error) {
                console.error('Error en búsqueda:', error);
            }
        }

        // Luego filtrar por categoría
        if (categoriaId !== null) {
            resultado = resultado.filter(p => p.categoria === categoriaId);
        }

        return resultado;
    }, []);

    // Efecto para aplicar filtros cuando cambian productos, búsqueda o categoría
    useEffect(() => {
        const aplicarFiltrosAsync = async () => {
            const filtrados = await aplicarFiltros(productos, busqueda, categoriaSeleccionada);
            setProductosFiltrados(filtrados);
        };

        aplicarFiltrosAsync();
    }, [productos, busqueda, categoriaSeleccionada, aplicarFiltros]);

    useFocusEffect(
        React.useCallback(() => {
            cargarDatos();

            // Suscribirse a eventos de actualización de productos
            const unsubscribeUpdated = eventEmitter.on(EVENTS.PRODUCTO_UPDATED, (productoActualizado) => {
                console.log('📦 [Inventario] Producto actualizado:', productoActualizado.nombre);
                setProductos(prev => {
                    const nuevosProductos = prev.map(p => p.id === productoActualizado.id ? productoActualizado : p);
                    return nuevosProductos;
                });
                // Actualizar filtrados después
                setProductosFiltrados(prev => prev.map(p => p.id === productoActualizado.id ? productoActualizado : p));
            });

            const unsubscribeCreated = eventEmitter.on(EVENTS.PRODUCTO_CREATED, (nuevoProducto) => {
                console.log('📦 [Inventario] Producto creado:', nuevoProducto.nombre);
                setProductos(prev => [...prev, nuevoProducto]);
                // Agregar a filtrados si cumple con los filtros actuales
                setProductosFiltrados(prev => {
                    // Si no hay filtro de categoría o coincide con la categoría seleccionada
                    if (categoriaSeleccionada === null || nuevoProducto.categoria === categoriaSeleccionada) {
                        return [...prev, nuevoProducto];
                    }
                    return prev;
                });
            });

            const unsubscribeDeleted = eventEmitter.on(EVENTS.PRODUCTO_DELETED, ({ id }) => {
                console.log('📦 [Inventario] Producto eliminado:', id);
                setProductos(prev => prev.filter(p => p.id !== id));
                setProductosFiltrados(prev => prev.filter(p => p.id !== id));
            });

            const unsubscribeBatchUpdated = eventEmitter.on(EVENTS.PRODUCTOS_BATCH_UPDATED, (productosActualizados) => {
                console.log('📦 [Inventario] Actualización masiva de productos:', productosActualizados.length);
                setProductos(prev => {
                    const nuevosProductos = [...prev];
                    productosActualizados.forEach(productoActualizado => {
                        const index = nuevosProductos.findIndex(p => p.id === productoActualizado.id);
                        if (index !== -1) {
                            nuevosProductos[index] = productoActualizado;
                        }
                    });
                    return nuevosProductos;
                });
                setProductosFiltrados(prev => {
                    const nuevosFiltrados = [...prev];
                    productosActualizados.forEach(productoActualizado => {
                        const index = nuevosFiltrados.findIndex(p => p.id === productoActualizado.id);
                        if (index !== -1) {
                            nuevosFiltrados[index] = productoActualizado;
                        }
                    });
                    return nuevosFiltrados;
                });
            });

            // Cleanup: desuscribirse al desmontar
            return () => {
                unsubscribeUpdated();
                unsubscribeCreated();
                unsubscribeDeleted();
                unsubscribeBatchUpdated();
            };
        }, [categoriaSeleccionada])
    );

    const cargarDatos = async () => {
        setLoading(true);
        try {
            const [prods, cats] = await Promise.all([
                obtenerProductos(),
                categoriasRepo.getCategorias()
            ]);
            setProductos(prods);
            // No establecer productosFiltrados aquí, el useEffect lo hará
            setCategorias(cats);
        } catch (error) {
            console.error('Error al cargar datos:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleBuscar = (texto) => {
        setBusqueda(texto);
        // El filtro se aplicará automáticamente por el useEffect con búsqueda flexible
    };

    const handleCategoriaPress = (categoriaId) => {
        setCategoriaSeleccionada(categoriaId);
        // El filtro se aplicará automáticamente por el useEffect
    };

    const obtenerNombreCategoria = (categoriaId) => {
        const cat = categorias.find(c => c.id === categoriaId);
        return cat ? cat.nombre : categoriaId;
    };

    const handleMenuPress = (producto, event) => {
        event.stopPropagation();
        // Medir la posición del botón para posicionar el menú
        event.target.measure((_fx, _fy, _width, height, px, py) => {
            setMenuPosition({ x: px - 150, y: py + height + 5 }); // +5 para un pequeño espacio
            setProductoSeleccionado(producto);
            setMenuVisible(true);
        });
    };

    const handleEditarProducto = () => {
        setMenuVisible(false);
        if (productoSeleccionado) {
            navigation.navigate('AddProducto', { productoId: productoSeleccionado.id });
        }
    };

    const handleDesactivarProducto = async () => {
        setMenuVisible(false);
        if (!productoSeleccionado) return;

        try {
            // Importar el repositorio de productos
            const productosRepo = await import('../../data/productosRepository');
            await productosRepo.deleteProducto(productoSeleccionado.id);

            // Actualizar la lista local
            setProductos(prev => prev.filter(p => p.id !== productoSeleccionado.id));
            setProductosFiltrados(prev => prev.filter(p => p.id !== productoSeleccionado.id));

            console.log('✅ Producto desactivado:', productoSeleccionado.nombre);
        } catch (error) {
            console.error('❌ Error al desactivar producto:', error);
        }
    };

    const calcularTotales = () => {
        const cantidadProductos = productosFiltrados.length;
        const costoTotal = productosFiltrados.reduce((sum, p) => sum + (p.precioCompra * p.stock), 0);
        return { cantidadProductos, costoTotal };
    };

    const { cantidadProductos, costoTotal } = calcularTotales();

    const renderProducto = ({ item }) => {
        const sinStock = item.stock === 0;
        const stockBajo = item.stock > 0 && item.stock <= (item.stockMinimo || 5);

        // Construir string de códigos (SKU + códigos alternativos)
        const codigos = [];
        if (item.sku) codigos.push(item.sku);
        if (item.codigosAlternativos && item.codigosAlternativos.length > 0) {
            codigos.push(...item.codigosAlternativos);
        }
        const codigosTexto = codigos.length > 0 ? codigos.join(' / ') : `ID: ${item.id.substring(5, 15)}`;

        return (
            <View
                style={[styles.productoCard, sinStock && styles.productoCardDisabled]}
            >
                <View style={styles.productoLeft}>
                    <TouchableOpacity
                        style={styles.imagenContainer}
                        onPress={() => navigation.navigate('DetalleProducto', { productoId: item.id })}
                        activeOpacity={0.7}
                    >
                        {(item.imagenes && item.imagenes.length > 0) || item.imagen ? (
                            <Image
                                source={{ uri: item.imagenes && item.imagenes.length > 0 ? item.imagenes[0] : item.imagen }}
                                style={styles.imagen}
                            />
                        ) : (
                            <View style={styles.imagenPlaceholder}>
                                <Ionicons name="image-outline" size={32} color="#95A5A6" />
                            </View>
                        )}
                        <View style={styles.verBtn}>
                            <Text style={styles.verTexto}>Ver</Text>
                        </View>
                    </TouchableOpacity>

                    <View style={styles.productoInfo}>
                        {/* Nombre completo del producto (incluye color, modelo, talla) */}
                        <Text style={styles.productoNombre} numberOfLines={2}>
                            {obtenerNombreProductoCompleto(item)}
                        </Text>

                        {/* Códigos del producto (SKU / Códigos de barra) */}
                        <Text style={styles.codigoTexto} numberOfLines={1}>
                            {codigosTexto}
                        </Text>

                        {/* Stock con indicador visual */}
                        <View style={styles.stockContainer}>
                            <Ionicons
                                name={sinStock ? "alert-circle" : stockBajo ? "warning" : "checkmark-circle"}
                                size={14}
                                color={sinStock ? "#FF6B6B" : stockBajo ? "#FF9800" : "#4CAF50"}
                            />
                            <Text style={[
                                styles.stockTexto,
                                sinStock && styles.stockTextoSinStock,
                                stockBajo && styles.stockTextoBajo
                            ]}>
                                Stock: {item.stock} {item.unidadMedida || 'unid.'}
                            </Text>
                        </View>

                        {/* Categoría */}
                        <Text style={styles.categoriaTexto}>
                            {obtenerNombreCategoria(item.categoria)}
                        </Text>
                    </View>
                </View>

                <View style={styles.productoRight}>
                    <Text style={styles.productoPrecio}>{formatCurrency(item.precioVenta)}</Text>

                    {/* Estado del producto */}
                    {/* {item.estado && (
                        <View style={[
                            styles.estadoBadge,
                            item.estado === 'Activo' ? styles.estadoBadgeActivo : styles.estadoBadgeInactivo
                        ]}>
                            <Text style={[
                                styles.estadoBadgeTexto,
                                item.estado === 'Activo' ? styles.estadoBadgeTextoActivo : styles.estadoBadgeTextoInactivo
                            ]}>
                                {item.estado}
                            </Text>
                        </View>
                    )} */}

                    <TouchableOpacity
                        style={styles.menuBtn}
                        onPress={(e) => handleMenuPress(item, e)}
                    >
                        <Ionicons name="ellipsis-vertical" size={20} color="#636E72" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const styles = createStyles(colors);

    const rightButtons = [
        {
            icon: modoBusqueda ? 'close' : 'search',
            onPress: () => {
                setModoBusqueda(!modoBusqueda);
                if (modoBusqueda) {
                    setBusqueda('');
                    // El filtro se aplicará automáticamente por el useEffect
                }
            }
        },
        {
            icon: 'archive-outline',
            onPress: () => navigation.navigate('ProductosDesactivados')
        }
    ];

    return (
        <View style={styles.container}>
            <Header
                title="Productos S/"
                showMenu
                rightButtons={rightButtons}
                searchMode={modoBusqueda}
                searchValue={busqueda}
                onSearchChange={handleBuscar}
                searchPlaceholder="Buscar producto..."
            />

            {/* Filtros de categoría */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoriasContainer}
                contentContainerStyle={styles.categoriasContent}
            >
                <TouchableOpacity
                    style={[
                        styles.categoriaChip,
                        categoriaSeleccionada === null && styles.categoriaChipActive
                    ]}
                    onPress={() => handleCategoriaPress(null)}
                >
                    <Text style={[
                        styles.categoriaChipTexto,
                        categoriaSeleccionada === null && styles.categoriaChipTextoActive
                    ]}>
                        Todo
                    </Text>
                </TouchableOpacity>
                {categorias.map((cat) => (
                    <TouchableOpacity
                        key={cat.id}
                        style={[
                            styles.categoriaChip,
                            categoriaSeleccionada === cat.id && styles.categoriaChipActive
                        ]}
                        onPress={() => handleCategoriaPress(cat.id)}
                    >
                        <Text style={[
                            styles.categoriaChipTexto,
                            categoriaSeleccionada === cat.id && styles.categoriaChipTextoActive
                        ]}>
                            {cat.nombre}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Resumen */}
            <View style={styles.resumenContainer}>
                <View style={styles.resumenItem}>
                    <Text style={styles.resumenLabel}>Cant. Productos:</Text>
                    <Text style={styles.resumenValor}>{cantidadProductos}</Text>
                </View>
                <View style={styles.resumenDivider} />
                <View style={styles.resumenItem}>
                    <Text style={styles.resumenLabel}>Costo Total:</Text>
                    <Text style={styles.resumenValor}>{formatCurrency(costoTotal)}</Text>
                </View>
            </View>

            {/* Lista de productos */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingTexto}>Cargando productos...</Text>
                </View>
            ) : productosFiltrados.length > 0 ? (
                <FlatList
                    data={productosFiltrados}
                    keyExtractor={(item) => item.id}
                    renderItem={renderProducto}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                />
            ) : (
                <EmptyState
                    message="No hay productos registrados"
                    iconName="cube-outline"
                />
            )}

            {/* Menú dropdown */}
            {menuVisible && (
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setMenuVisible(false)}
                >
                    <View style={[styles.menuDropdown, { top: menuPosition.y, left: menuPosition.x }]}>
                        <TouchableOpacity
                            style={styles.menuOption}
                            onPress={handleEditarProducto}
                        >
                            <Ionicons name="create-outline" size={20} color={colors.text} />
                            <Text style={styles.menuOptionText}>Editar producto</Text>
                        </TouchableOpacity>

                        <View style={styles.menuDivider} />

                        <TouchableOpacity
                            style={styles.menuOption}
                            onPress={handleDesactivarProducto}
                        >
                            <Ionicons name="close-circle-outline" size={20} color="#FF6B6B" />
                            <Text style={[styles.menuOptionText, { color: '#FF6B6B' }]}>Desactivar producto</Text>
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
    categoriasContainer: {
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        maxHeight: 50,
    },
    categoriasContent: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        alignItems: 'center',
    },
    categoriaChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: colors.surfaceVariant,
        marginRight: 8,
        height: 34,
        justifyContent: 'center',
        alignItems: 'center',
    },
    categoriaChipActive: {
        backgroundColor: '#C8E6C9',
    },
    categoriaChipTexto: {
        fontSize: 13,
        color: colors.text,
        fontWeight: '500',
    },
    categoriaChipTextoActive: {
        fontSize: 13,
        color: '#2E7D32',
        fontWeight: '600',
    },
    resumenContainer: {
        flexDirection: 'row',
        paddingHorizontal: 14,
        paddingVertical: 5,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    resumenItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    resumenLabel: {
        fontSize: 11,
        color: colors.textSecondary,
    },
    resumenValor: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
        marginLeft: 10,
    },
    resumenDivider: {
        width: 1,
        backgroundColor: colors.border,
        marginHorizontal: 16,
    },
    listContainer: {
        padding: 16,
        paddingBottom: 80,
    },
    productoCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: colors.card,
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    productoCardDisabled: {
        opacity: 0.5,
    },
    productoLeft: {
        flexDirection: 'row',
        flex: 1,
    },
    imagenContainer: {
        width: 70,
        height: 70,
        borderRadius: 8,
        overflow: 'hidden',
        position: 'relative',
        marginRight: 12,
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
    verBtn: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingVertical: 2,
        alignItems: 'center',
    },
    verTexto: {
        fontSize: 10,
        color: '#FFF',
        fontWeight: '600',
    },
    productoInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    productoNombre: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
        lineHeight: 18,
        marginBottom: 6,
    },
    codigoTexto: {
        fontSize: 11,
        color: colors.textTertiary,
        marginBottom: 6,
        fontWeight: '500',
    },
    detallesTexto: {
        fontSize: 11,
        color: colors.textSecondary,
        marginBottom: 4,
        fontStyle: 'italic',
    },
    stockContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 2,
    },
    stockTexto: {
        fontSize: 12,
        color: '#4CAF50',
        fontWeight: '600',
    },
    stockTextoSinStock: {
        color: '#FF6B6B',
    },
    stockTextoBajo: {
        color: '#FF9800',
    },
    categoriaTexto: {
        fontSize: 10,
        color: colors.textTertiary,
        backgroundColor: colors.surfaceVariant,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        alignSelf: 'flex-start',
        marginTop: 2,
    },
    productoRight: {
        alignItems: 'flex-end',
        justifyContent: 'space-between',
    },
    productoPrecio: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
    },
    estadoBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        marginVertical: 4,
    },
    estadoBadgeActivo: {
        backgroundColor: '#E8F5E9',
    },
    estadoBadgeInactivo: {
        backgroundColor: '#FFEBEE',
    },
    estadoBadgeTexto: {
        fontSize: 10,
        fontWeight: '600',
    },
    estadoBadgeTextoActivo: {
        color: '#4CAF50',
    },
    estadoBadgeTextoInactivo: {
        color: '#F44336',
    },
    menuBtn: {
        padding: 4,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingTexto: {
        fontSize: 15,
        color: colors.textSecondary,
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
        width: 180,
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
        paddingVertical: 12,
        paddingHorizontal: 16,
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
