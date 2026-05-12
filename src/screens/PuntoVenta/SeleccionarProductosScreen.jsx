import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image, TextInput, StatusBar, Modal, Animated, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { obtenerProductos, buscarProductos } from '../../services/productosService';
import * as categoriasRepo from '../../data/categoriasRepository';
import { formatCurrency, obtenerNombreProductoCompleto } from '../../shared/utils/helpers';
import Header from '../../shared/components/Header';
import EmptyState from '../../shared/components/EmptyState';
import BarcodeScannerModal from '../../shared/components/BarcodeScannerModal';
import { useTheme } from '../../shared/hooks/useTheme';

export default function SeleccionarProductosScreen({ route, navigation }) {
    const { productosYaSeleccionados = [] } = route.params || {};
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();

    const [productos, setProductos] = useState([]);
    const [productosFiltrados, setProductosFiltrados] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [loading, setLoading] = useState(true);
    const [productosSeleccionados, setProductosSeleccionados] = useState(productosYaSeleccionados);
    const [productosChecked, setProductosChecked] = useState([]); // IDs de productos con checkbox marcado
    const [mostrarFiltros, setMostrarFiltros] = useState(false);
    const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('all'); // 'all' o ID de categoría
    const [scannerVisible, setScannerVisible] = useState(false);

    useFocusEffect(
        React.useCallback(() => {
            // Forzar StatusBar a oscuro cuando esta pantalla está activa
            const timerId = setTimeout(() => {
                StatusBar.setBarStyle('dark-content', true);
            }, 0);

            cargarDatos();

            return () => {
                // Limpiar el timer
                clearTimeout(timerId);
                // No cambiar el StatusBar aquí - dejar que PuntoVentaScreen lo maneje
            };
        }, [])
    );

    const cargarDatos = async () => {
        setLoading(true);
        try {
            const [prods, cats] = await Promise.all([
                obtenerProductos(),
                categoriasRepo.getCategorias()
            ]);
            // Filtrar solo productos con stock disponible
            const prodsConStock = prods.filter(p => p.stock > 0);
            setProductos(prodsConStock);
            setProductosFiltrados(prodsConStock);
            setCategorias(cats);
        } catch (error) {
            console.error('Error al cargar datos:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleBuscar = async (texto) => {
        setBusqueda(texto);
        let resultados;

        if (texto.trim() === '') {
            resultados = productos;
        } else {
            const busquedaResultados = await buscarProductos(texto);
            resultados = busquedaResultados.filter(p => p.stock > 0);
        }

        // Aplicar filtro de categoría si hay uno seleccionado
        aplicarFiltroCategoria(resultados);
    };

    const handleBarcodeScanned = async (barcode) => {
        // Buscar producto por código de barras
        setBusqueda(barcode);
        const busquedaResultados = await buscarProductos(barcode);
        const resultados = busquedaResultados.filter(p => p.stock > 0);

        if (resultados.length > 0) {
            // Si se encuentra un producto, agregarlo automáticamente
            handleAgregarProducto(resultados[0]);
        } else {
            // Si no se encuentra, mostrar mensaje
            Alert.alert(
                'Producto no encontrado',
                `No se encontró ningún producto con el código de barras: ${barcode}`,
                [{ text: 'OK' }]
            );
        }
    };

    const aplicarFiltroCategoria = (productosBase) => {
        if (categoriaSeleccionada === 'all') {
            setProductosFiltrados(productosBase);
        } else {
            const filtrados = productosBase.filter(p => p.categoria === categoriaSeleccionada);
            setProductosFiltrados(filtrados);
        }
    };

    const handleSeleccionarCategoria = (categoriaId) => {
        setCategoriaSeleccionada(categoriaId);
        setMostrarFiltros(false);

        // Aplicar filtro inmediatamente
        const productosBase = busqueda.trim() === '' ? productos : productosFiltrados;

        if (categoriaId === 'all') {
            if (busqueda.trim() === '') {
                setProductosFiltrados(productos);
            }
            // Si hay búsqueda activa, mantener los resultados de búsqueda
        } else {
            const filtrados = (busqueda.trim() === '' ? productos : productosFiltrados).filter(
                p => p.categoria === categoriaId
            );
            setProductosFiltrados(filtrados);
        }
    };

    const obtenerNombreCategoria = (categoriaId) => {
        const cat = categorias.find(c => c.id === categoriaId);
        return cat ? cat.nombre : categoriaId;
    };

    const handleAgregarProducto = (producto) => {
        console.log('🔍 SeleccionarProductos - Agregar individual:', {
            nombre: producto.nombre,
            categoria: producto.categoria,
            categoriaType: typeof producto.categoria,
            todasLasProps: Object.keys(producto)
        });

        const existe = productosSeleccionados.find(p => p.id === producto.id);
        let nuevosProductos;

        if (existe) {
            // Incrementar cantidad si no excede el stock
            if (existe.cantidad < producto.stock) {
                nuevosProductos = productosSeleccionados.map(p =>
                    p.id === producto.id ? { ...p, cantidad: p.cantidad + 1 } : p
                );
            } else {
                nuevosProductos = productosSeleccionados;
            }
        } else {
            // Agregar nuevo producto con cantidad 1
            nuevosProductos = [
                ...productosSeleccionados,
                { ...producto, cantidad: 1 }
            ];
        }

        console.log('📤 SeleccionarProductos - Enviando producto individual:', nuevosProductos.map(p => ({
            nombre: p.nombre,
            categoria: p.categoria,
            categoriaType: typeof p.categoria
        })));

        // Regresar inmediatamente a Punto de Venta con el producto agregado
        navigation.navigate('PuntoVenta', {
            productosSeleccionados: nuevosProductos
        });
    };

    const handleToggleCheckbox = (productoId) => {
        if (productosChecked.includes(productoId)) {
            setProductosChecked(productosChecked.filter(id => id !== productoId));
        } else {
            setProductosChecked([...productosChecked, productoId]);
        }
    };

    const handleAgregarSeleccionados = () => {
        // Agregar todos los productos checkeados
        const nuevosProductos = [...productosSeleccionados];

        productosChecked.forEach(productoId => {
            const producto = productos.find(p => p.id === productoId);
            if (producto) {
                console.log('🔍 SeleccionarProductos - Producto encontrado:', {
                    nombre: producto.nombre,
                    categoria: producto.categoria,
                    categoriaType: typeof producto.categoria,
                    todasLasProps: Object.keys(producto)
                });
                const existe = nuevosProductos.find(p => p.id === productoId);
                if (existe) {
                    // Si ya existe, incrementar cantidad (sin exceder stock)
                    const index = nuevosProductos.findIndex(p => p.id === productoId);
                    if (nuevosProductos[index].cantidad < producto.stock) {
                        nuevosProductos[index] = {
                            ...nuevosProductos[index],
                            cantidad: nuevosProductos[index].cantidad + 1
                        };
                    }
                } else {
                    // Si no existe, agregarlo con cantidad 1
                    nuevosProductos.push({ ...producto, cantidad: 1 });
                }
            }
        });

        console.log('📤 SeleccionarProductos - Enviando productos:', nuevosProductos.map(p => ({
            nombre: p.nombre,
            categoria: p.categoria,
            categoriaType: typeof p.categoria
        })));

        // Navegar de vuelta con los productos
        navigation.navigate('PuntoVenta', {
            productosSeleccionados: nuevosProductos
        });
    };

    const handleEliminarSeleccionados = () => {
        setProductosChecked([]);
    };

    const renderProducto = ({ item }) => {
        const isChecked = productosChecked.includes(item.id);

        return (
            <View style={styles.productoCard}>
                <TouchableOpacity
                    style={[styles.checkbox, isChecked && styles.checkboxChecked]}
                    onPress={() => handleToggleCheckbox(item.id)}
                    activeOpacity={0.7}
                >
                    {isChecked && (
                        <Ionicons name="checkmark" size={16} color="#FFF" />
                    )}
                </TouchableOpacity>

                <View style={styles.productoContent}>
                    <TouchableOpacity
                        style={styles.imagenContainer}
                        onPress={() => navigation.navigate('DetalleProducto', { productoId: item.id })}
                        activeOpacity={0.7}
                    >
                        {item.imagen ? (
                            <Image source={{ uri: item.imagen }} style={styles.imagen} />
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
                        <Text style={styles.stockTexto}>
                            Stock: {item.stock} {obtenerNombreCategoria(item.categoria)}
                        </Text>
                        <Text style={styles.codigoTexto}>({item.id.substring(0, 15)})</Text>
                        <Text style={styles.productoNombre} numberOfLines={2}>
                            {obtenerNombreProductoCompleto(item)}
                        </Text>
                    </View>

                    <View style={styles.productoRight}>
                        <Text style={styles.productoPrecio}>{formatCurrency(item.precioVenta)}</Text>
                        <TouchableOpacity
                            style={styles.agregarBtn}
                            onPress={() => handleAgregarProducto(item)}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.agregarTexto}>Agregar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    const styles = createStyles(colors);

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <StatusBar barStyle="dark-content" />
            <Header
                title="Buscar"
                showBack
                whiteBackground
                rightButtons={[
                    {
                        icon: 'barcode-scan',
                        onPress: () => setScannerVisible(true),
                        iconComponent: MaterialCommunityIcons
                    },
                    {
                        icon: 'options-outline',
                        onPress: () => setMostrarFiltros(true)
                    }
                ]}
            />

            {/* Barra de búsqueda */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#7F8C8D" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar"
                    placeholderTextColor="#BDC3C7"
                    value={busqueda}
                    onChangeText={handleBuscar}
                    autoFocus
                />
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
                    contentContainerStyle={[
                        styles.listContainer,
                        { paddingBottom: productosChecked.length > 0 ? 120 : 20 }
                    ]}
                    showsVerticalScrollIndicator={false}
                />
            ) : (
                <EmptyState
                    message="No hay productos disponibles"
                    iconName="cube-outline"
                />
            )}

            {/* Footer con botones cuando hay productos seleccionados */}
            {productosChecked.length > 0 && (
                <View style={styles.footerContainer}>
                    <View style={styles.footerInfo}>
                        <Text style={styles.footerTexto}>
                            {productosChecked.length} {productosChecked.length === 1 ? 'producto seleccionado' : 'productos seleccionados'}
                        </Text>
                    </View>
                    <View style={styles.footerButtons}>
                        <TouchableOpacity
                            style={styles.eliminarBtn}
                            onPress={handleEliminarSeleccionados}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
                            <Text style={styles.eliminarTexto}>Eliminar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.agregarProductosBtn}
                            onPress={handleAgregarSeleccionados}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="checkmark" size={20} color="#FFF" />
                            <Text style={styles.agregarProductosBtnTexto}>Agregar Productos</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Modal de Filtros - Estilo Dropdown */}
            <Modal
                visible={mostrarFiltros}
                transparent
                animationType="none"
                onRequestClose={() => setMostrarFiltros(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setMostrarFiltros(false)}
                >
                    <View style={styles.dropdownContainer}>
                        <View style={styles.dropdownHeader}>
                            <Text style={styles.dropdownTitle}>Filtrar</Text>
                        </View>

                        {/* Opción "Todas" */}
                        <TouchableOpacity
                            style={styles.dropdownOption}
                            onPress={() => handleSeleccionarCategoria('all')}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.dropdownOptionText}>Todas</Text>
                            <View style={[
                                styles.radio,
                                categoriaSeleccionada === 'all' && styles.radioSelected
                            ]}>
                                {categoriaSeleccionada === 'all' && (
                                    <View style={styles.radioInner} />
                                )}
                            </View>
                        </TouchableOpacity>

                        {/* Lista de categorías */}
                        {categorias.map((categoria, index) => (
                            <TouchableOpacity
                                key={categoria.id}
                                style={[
                                    styles.dropdownOption,
                                    index === categorias.length - 1 && styles.dropdownOptionLast
                                ]}
                                onPress={() => handleSeleccionarCategoria(categoria.id)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.dropdownOptionText}>{categoria.nombre}</Text>
                                <View style={[
                                    styles.radio,
                                    categoriaSeleccionada === categoria.id && styles.radioSelected
                                ]}>
                                    {categoriaSeleccionada === categoria.id && (
                                        <View style={styles.radioInner} />
                                    )}
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Modal de escáner de código de barras */}
            <BarcodeScannerModal
                visible={scannerVisible}
                onClose={() => setScannerVisible(false)}
                onBarcodeScanned={handleBarcodeScanned}
            />
        </SafeAreaView>
    );
}

const createStyles = (colors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16,
        marginVertical: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#2C3E50',
        padding: 0,
    },
    listContainer: {
        paddingHorizontal: 8,
    },
    productoCard: {
        flexDirection: 'row',
        backgroundColor: colors.card,
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
        marginHorizontal: 8,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'flex-start',
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#BDC3C7',
        marginRight: 12,
        marginTop: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxChecked: {
        backgroundColor: '#48C9B0',
        borderColor: '#48C9B0',
    },
    productoContent: {
        flex: 1,
        flexDirection: 'row',
        gap: 12,
    },
    imagenContainer: {
        width: 70,
        height: 70,
        borderRadius: 8,
        overflow: 'hidden',
        position: 'relative',
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
    stockTexto: {
        fontSize: 11,
        color: colors.textSecondary,
        marginBottom: 2,
    },
    codigoTexto: {
        fontSize: 10,
        color: colors.textTertiary,
        marginBottom: 4,
    },
    productoNombre: {
        fontSize: 13,
        color: colors.text,
        lineHeight: 18,
    },
    productoRight: {
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        minHeight: 70,
    },
    productoPrecio: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
    },
    agregarBtn: {
        backgroundColor: '#48C9B0',
        borderRadius: 6,
        paddingVertical: 6,
        paddingHorizontal: 16,
    },
    agregarTexto: {
        fontSize: 13,
        fontWeight: '600',
        color: '#FFF',
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
        paddingBottom: 35,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 8,
    },
    footerInfo: {
        marginBottom: 12,
    },
    footerTexto: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
        textAlign: 'center',
    },
    footerButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    eliminarBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFE5E5',
        borderRadius: 12,
        paddingVertical: 12,
        gap: 8,
    },
    eliminarTexto: {
        fontSize: 15,
        fontWeight: '600',
        color: '#FF6B6B',
    },
    agregarProductosBtn: {
        flex: 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#48C9B0',
        borderRadius: 12,
        paddingVertical: 12,
        gap: 8,
    },
    agregarProductosBtnTexto: {
        fontSize: 15,
        fontWeight: '600',
        color: '#FFF',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        paddingTop: 60,
        paddingRight: 16,
        alignItems: 'flex-end',
    },
    dropdownContainer: {
        backgroundColor: colors.card,
        borderRadius: 12,
        minWidth: 220,
        maxWidth: 280,
        maxHeight: 500,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
        overflow: 'hidden',
    },
    dropdownHeader: {
        paddingHorizontal: 16,
        paddingVertical: 2,
        backgroundColor: colors.surfaceVariant,
    },
    dropdownTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    dropdownOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    dropdownOptionLast: {
        borderBottomWidth: 0,
    },
    dropdownOptionText: {
        fontSize: 15,
        fontWeight: '500',
        color: colors.text,
        flex: 1,
    },
    radio: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: colors.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioSelected: {
        borderColor: '#48C9B0',
    },
    radioInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#48C9B0',
    },
});
