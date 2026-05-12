import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { obtenerProductoPorId } from '../../services/productosService';
import * as categoriasRepo from '../../data/categoriasRepository';
import { formatCurrency } from '../../shared/utils/helpers';
import Header from '../../shared/components/Header';
import { useTheme } from '../../shared/hooks/useTheme';

const { width } = Dimensions.get('window');

export default function DetalleProductoScreen({ route, navigation }) {
    const { productoId } = route.params;
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();

    const [producto, setProducto] = useState(null);
    const [categoria, setCategoria] = useState(null);
    const [loading, setLoading] = useState(true);
    const [imagenSeleccionada, setImagenSeleccionada] = useState(0);

    useEffect(() => {
        cargarProducto();
    }, [productoId]);

    const cargarProducto = async () => {
        setLoading(true);
        try {
            const prod = await obtenerProductoPorId(productoId);
            setProducto(prod);

            // Cargar categoría
            const categorias = await categoriasRepo.getCategorias();
            const cat = categorias.find(c => c.id === prod.categoria);
            setCategoria(cat);
        } catch (error) {
            console.error('Error al cargar producto:', error);
            Alert.alert('Error', 'No se pudo cargar el producto');
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    };

    const handleEditar = () => {
        navigation.navigate('AddProducto', { productoId: producto.id });
    };

    const styles = createStyles(colors);

    if (loading || !producto) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <Header title="Detalle del Producto" showBack />
                <View style={styles.loadingContainer}>
                    <Text style={[styles.loadingTexto, { color: colors.textSecondary }]}>
                        Cargando...
                    </Text>
                </View>
            </View>
        );
    }

    const imagenes = producto.imagenes && producto.imagenes.length > 0
        ? producto.imagenes
        : producto.imagen
            ? [producto.imagen]
            : [];
    const sinStock = producto.stock === 0;
    const stockBajo = producto.stock > 0 && producto.stock <= (producto.stockMinimo || 5);
    const ganancia = producto.precioVenta - producto.precioCompra;
    const margen = producto.precioCompra > 0
        ? ((ganancia / producto.precioCompra) * 100).toFixed(2)
        : 0;

    return (
        <View style={styles.container}>
            <Header
                title="Detalle del Producto"
                showBack
                rightButtons={[
                    {
                        icon: 'create-outline',
                        onPress: handleEditar
                    }
                ]}
            />

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Galería de imágenes */}
                <View style={styles.galeriaContainer}>
                    {imagenes.length > 0 ? (
                        <>
                            <Image
                                source={{ uri: imagenes[imagenSeleccionada] }}
                                style={styles.imagenPrincipal}
                                resizeMode="cover"
                            />
                            {imagenes.length > 1 && (
                                <View style={styles.miniaturasContainer}>
                                    {imagenes.map((img, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            style={[
                                                styles.miniatura,
                                                imagenSeleccionada === index && styles.miniaturaActiva
                                            ]}
                                            onPress={() => setImagenSeleccionada(index)}
                                        >
                                            <Image source={{ uri: img }} style={styles.miniaturaImagen} />
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </>
                    ) : (
                        <View style={styles.imagenPlaceholder}>
                            <Ionicons name="image-outline" size={80} color="#95A5A6" />
                            <Text style={styles.imagenPlaceholderTexto}>Sin imagen</Text>
                        </View>
                    )}
                </View>

                {/* Información principal */}
                <View style={styles.contenido}>
                    {/* SKU y Estado */}
                    <View style={styles.headerInfo}>
                        <View style={styles.skuContainer}>
                            <MaterialCommunityIcons name="barcode" size={16} color={colors.textSecondary} />
                            <Text style={styles.skuTexto}>
                                {producto.sku || producto.id.substring(5, 15)}
                            </Text>
                        </View>
                        <View style={[
                            styles.estadoBadge,
                            producto.estado === 'Activo' ? styles.estadoBadgeActivo : styles.estadoBadgeInactivo
                        ]}>
                            <Text style={[
                                styles.estadoBadgeTexto,
                                producto.estado === 'Activo' ? styles.estadoBadgeTextoActivo : styles.estadoBadgeTextoInactivo
                            ]}>
                                {producto.estado || 'Activo'}
                            </Text>
                        </View>
                    </View>

                    {/* Nombre */}
                    <Text style={styles.nombre}>{producto.nombre}</Text>

                    {/* Categoría */}
                    {categoria && (
                        <View style={styles.categoriaContainer}>
                            <Ionicons name={categoria.icono || 'pricetag'} size={16} color="#29B6F6" />
                            <Text style={styles.categoriaTexto}>{categoria.nombre}</Text>
                        </View>
                    )}

                    {/* Sección: Información básica */}
                    <View style={styles.seccion}>
                        <View style={styles.seccionHeader}>
                            <Ionicons name="information-circle-outline" size={24} color="#29B6F6" />
                            <Text style={styles.seccionTitulo}>Información Básica</Text>
                        </View>

                        {producto.marca && (
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Marca:</Text>
                                <Text style={styles.infoValor}>{producto.marca}</Text>
                            </View>
                        )}

                        {producto.descripcion && (
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Descripción:</Text>
                                <Text style={styles.infoValorMultilinea}>{producto.descripcion}</Text>
                            </View>
                        )}

                        {producto.proveedor && (
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Proveedor:</Text>
                                <Text style={styles.infoValor}>{producto.proveedor}</Text>
                            </View>
                        )}
                    </View>

                    {/* Sección: Variantes */}
                    {(producto.talla || producto.color || producto.modelo) && (
                        <View style={styles.seccion}>
                            <View style={styles.seccionHeader}>
                                <Ionicons name="options-outline" size={24} color="#9C27B0" />
                                <Text style={styles.seccionTitulo}>Variantes</Text>
                            </View>

                            <View style={styles.variantesGrid}>
                                {producto.talla && (
                                    <View style={styles.varianteItem}>
                                        <Text style={styles.varianteLabel}>Talla</Text>
                                        <Text style={styles.varianteValor}>{producto.talla}</Text>
                                    </View>
                                )}
                                {producto.color && (
                                    <View style={styles.varianteItem}>
                                        <Text style={styles.varianteLabel}>Color</Text>
                                        <Text style={styles.varianteValor}>{producto.color}</Text>
                                    </View>
                                )}
                                {producto.modelo && (
                                    <View style={styles.varianteItem}>
                                        <Text style={styles.varianteLabel}>Modelo</Text>
                                        <Text style={styles.varianteValor}>{producto.modelo}</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    )}

                    {/* Sección: Precios */}
                    <View style={styles.seccion}>
                        <View style={styles.seccionHeader}>
                            {/* <Ionicons name="cash-outline" size={24} color="#4CAF50" /> */}
                            <Text style={styles.seccionTitulo}>Precios</Text>
                        </View>

                        <View style={styles.preciosContainer}>
                            <View style={styles.precioBox}>
                                <Text style={styles.precioLabel}>Precio de Compra</Text>
                                <Text style={styles.precioValor}>{formatCurrency(producto.precioCompra)}</Text>
                                <Text style={styles.precioSubtexto}>Costo por unidad</Text>
                            </View>

                            <Ionicons name="arrow-forward" size={24} color="#95A5A6" />

                            <View style={styles.precioBox}>
                                <Text style={styles.precioLabel}>Precio de Venta</Text>
                                <Text style={styles.precioValor}>{formatCurrency(producto.precioVenta)}</Text>
                                <Text style={styles.precioSubtexto}>Precio al público</Text>
                            </View>
                        </View>

                        {/* Ganancia */}
                        <View style={styles.gananciaBox}>
                            <View style={styles.gananciaItem}>
                                <Text style={styles.gananciaLabel}>Ganancia</Text>
                                <Text style={styles.gananciaValor}>{formatCurrency(ganancia)}</Text>
                            </View>
                            <View style={styles.dividerVertical} />
                            <View style={styles.gananciaItem}>
                                <Text style={styles.gananciaLabel}>Margen</Text>
                                <Text style={styles.gananciaValor}>{margen}%</Text>
                            </View>
                        </View>
                    </View>

                    {/* Sección: Inventario */}
                    <View style={styles.seccion}>
                        <View style={styles.seccionHeader}>
                            {/* <Ionicons name="cube-outline" size={24} color="#FF9800" /> */}
                            <Text style={styles.seccionTitulo}>Inventario</Text>
                        </View>

                        <View style={styles.inventarioGrid}>
                            <View style={styles.inventarioItem}>
                                {/* <View style={styles.inventarioIconContainer}>
                                    <MaterialCommunityIcons name="package-variant" size={24} color="#29B6F6" />
                                </View> */}
                                <Text style={styles.inventarioLabel}>Stock Actual</Text>
                                <Text style={[
                                    styles.inventarioValor,
                                    sinStock && styles.inventarioValorSinStock,
                                    stockBajo && styles.inventarioValorBajo
                                ]}>
                                    {producto.stock}
                                </Text>
                                <Text style={styles.inventarioUnidad}>{producto.unidadMedida || 'Unidades'}</Text>
                            </View>

                            <View style={styles.inventarioItem}>
                                {/* <View style={styles.inventarioIconContainer}>
                                    <MaterialCommunityIcons name="alert-outline" size={24} color="#FF9800" />
                                </View> */}
                                <Text style={styles.inventarioLabel}>Stock Mínimo</Text>
                                <Text style={styles.inventarioValor}>{producto.stockMinimo || 5}</Text>
                                <Text style={styles.inventarioUnidad}>Alerta de reposición</Text>
                            </View>
                        </View>

                        {/* Alerta de stock */}
                        {sinStock && (
                            <View style={styles.alertaStock}>
                                <Ionicons name="alert-circle" size={20} color="#FF6B6B" />
                                <Text style={styles.alertaStockTexto}>
                                    ⚠️ Producto sin stock disponible
                                </Text>
                            </View>
                        )}

                        {stockBajo && !sinStock && (
                            <View style={styles.alertaStockBajo}>
                                <Ionicons name="warning" size={20} color="#FF9800" />
                                <Text style={styles.alertaStockBajoTexto}>
                                    Stock bajo - Considere reabastecer
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Fecha de creación */}
                    {producto.fechaCreacion && (
                        <View style={styles.fechaContainer}>
                            <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                            <Text style={styles.fechaTexto}>
                                Registrado el {new Date(producto.fechaCreacion).toLocaleDateString('es-PE', {
                                    day: '2-digit',
                                    month: 'long',
                                    year: 'numeric'
                                })}
                            </Text>
                        </View>
                    )}

                    <View style={styles.espacioFinal} />
                </View>
            </ScrollView>

            {/* Botón de editar flotante */}
            <TouchableOpacity
                style={[styles.botonEditarFlotante, { bottom: Math.max(insets.bottom, 16) + 16 }]}
                onPress={handleEditar}
                activeOpacity={0.8}
            >
                <Ionicons name="create" size={24} color="#FFF" />
                <Text style={styles.botonEditarTexto}>Editar Producto</Text>
            </TouchableOpacity>
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingTexto: {
        fontSize: 16,
    },

    // Galería
    galeriaContainer: {
        backgroundColor: colors.card,
        paddingBottom: 16,
    },
    imagenPrincipal: {
        width: width,
        height: width,
        backgroundColor: colors.surfaceVariant,
    },
    imagenPlaceholder: {
        width: width,
        height: width,
        backgroundColor: colors.surfaceVariant,
        justifyContent: 'center',
        alignItems: 'center',
    },
    imagenPlaceholderTexto: {
        marginTop: 12,
        fontSize: 16,
        color: colors.textSecondary,
    },
    miniaturasContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingTop: 12,
        gap: 8,
    },
    miniatura: {
        width: 60,
        height: 60,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: 'transparent',
        overflow: 'hidden',
    },
    miniaturaActiva: {
        borderColor: '#29B6F6',
    },
    miniaturaImagen: {
        width: '100%',
        height: '100%',
    },

    // Contenido
    contenido: {
        padding: 14,
    },
    headerInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    skuContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: colors.surfaceVariant,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 6,
    },
    skuTexto: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.text,
    },
    estadoBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 6,
    },
    estadoBadgeActivo: {
        backgroundColor: '#E8F5E9',
    },
    estadoBadgeInactivo: {
        backgroundColor: '#FFEBEE',
    },
    estadoBadgeTexto: {
        fontSize: 11,
        fontWeight: '600',
    },
    estadoBadgeTextoActivo: {
        color: '#4CAF50',
    },
    estadoBadgeTextoInactivo: {
        color: '#F44336',
    },
    nombre: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 10,
        lineHeight: 28,
    },
    categoriaContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#E3F2FD',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        alignSelf: 'flex-start',
        marginBottom: 16,
    },
    categoriaTexto: {
        fontSize: 13,
        fontWeight: '600',
        color: '#1976D2',
    },

    // Secciones
    seccion: {
        backgroundColor: colors.card,
        borderRadius: 10,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    seccionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    seccionTitulo: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
    },
    infoRow: {
        marginBottom: 10,
    },
    infoLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textSecondary,
        marginBottom: 3,
    },
    infoValor: {
        fontSize: 14,
        color: colors.text,
    },
    infoValorMultilinea: {
        fontSize: 14,
        color: colors.text,
        lineHeight: 20,
    },

    // Variantes
    variantesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    varianteItem: {
        flex: 1,
        minWidth: 90,
        backgroundColor: colors.surfaceVariant,
        padding: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    varianteLabel: {
        fontSize: 11,
        color: colors.textSecondary,
        marginBottom: 3,
    },
    varianteValor: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.text,
    },

    // Precios
    preciosContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    precioBox: {
        flex: 1,
        alignItems: 'center',
    },
    precioLabel: {
        fontSize: 11,
        color: colors.textSecondary,
        marginBottom: 4,
    },
    precioValor: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 3,
    },
    precioSubtexto: {
        fontSize: 10,
        color: colors.textSecondary,
    },
    gananciaBox: {
        flexDirection: 'row',
        backgroundColor: '#E8F5E9',
        borderRadius: 8,
        padding: 12,
        alignItems: 'center',
    },
    gananciaItem: {
        flex: 1,
        alignItems: 'center',
    },
    gananciaLabel: {
        fontSize: 11,
        color: '#2E7D32',
        marginBottom: 4,
        fontWeight: '500',
    },
    gananciaValor: {
        fontSize: 18,
        fontWeight: '700',
        color: '#2E7D32',
    },
    dividerVertical: {
        width: 1,
        height: 35,
        backgroundColor: '#A5D6A7',
        marginHorizontal: 12,
    },

    // Inventario
    inventarioGrid: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 10,
    },
    inventarioItem: {
        flex: 1,
        backgroundColor: colors.surfaceVariant,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    inventarioIconContainer: {
        marginBottom: 6,
    },
    inventarioLabel: {
        fontSize: 11,
        color: colors.textSecondary,
        marginBottom: 4,
    },
    inventarioValor: {
        fontSize: 24,
        fontWeight: '700',
        color: '#4CAF50',
        marginBottom: 2,
    },
    inventarioValorSinStock: {
        color: '#FF6B6B',
    },
    inventarioValorBajo: {
        color: '#FF9800',
    },
    inventarioUnidad: {
        fontSize: 10,
        color: colors.textSecondary,
    },
    alertaStock: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFEBEE',
        borderRadius: 8,
        padding: 10,
        gap: 8,
    },
    alertaStockTexto: {
        flex: 1,
        fontSize: 12,
        color: '#C62828',
        fontWeight: '600',
    },
    alertaStockBajo: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF3E0',
        borderRadius: 8,
        padding: 10,
        gap: 8,
    },
    alertaStockBajoTexto: {
        flex: 1,
        fontSize: 12,
        color: '#E65100',
        fontWeight: '600',
    },

    // Fecha
    fechaContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: colors.surfaceVariant,
        borderRadius: 8,
    },
    fechaTexto: {
        fontSize: 12,
        color: colors.textSecondary,
    },

    espacioFinal: {
        height: 80,
    },

    // Botón flotante
    botonEditarFlotante: {
        position: 'absolute',
        right: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#29B6F6',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    botonEditarTexto: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFF',
    },
});
