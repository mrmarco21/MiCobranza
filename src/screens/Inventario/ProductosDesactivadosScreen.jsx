import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getData, setData, KEYS } from '../../data/storage';
import { formatCurrency } from '../../shared/utils/helpers';
import Header from '../../shared/components/Header';
import EmptyState from '../../shared/components/EmptyState';
import { useTheme } from '../../shared/hooks/useTheme';
import eventEmitter, { EVENTS } from '../../shared/events/EventEmitter';

export default function ProductosDesactivadosScreen({ navigation }) {
    const { colors } = useTheme();
    const [productosDesactivados, setProductosDesactivados] = useState([]);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        React.useCallback(() => {
            cargarProductosDesactivados();
        }, [])
    );

    const cargarProductosDesactivados = async () => {
        setLoading(true);
        try {
            const todosProductos = await getData(KEYS.PRODUCTOS);
            const desactivados = todosProductos.filter(p => !p.activo);
            setProductosDesactivados(desactivados);
        } catch (error) {
            console.error('Error al cargar productos desactivados:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleReactivarProducto = async (producto) => {
        Alert.alert(
            'Reactivar producto',
            `¿Deseas reactivar "${producto.nombre}"?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Reactivar',
                    onPress: async () => {
                        try {
                            const todosProductos = await getData(KEYS.PRODUCTOS);
                            const index = todosProductos.findIndex(p => p.id === producto.id);

                            if (index !== -1) {
                                todosProductos[index].activo = true;
                                await setData(KEYS.PRODUCTOS, todosProductos);

                                // Emitir evento de actualización
                                eventEmitter.emit(EVENTS.PRODUCTO_UPDATED, todosProductos[index]);

                                // Actualizar lista local
                                setProductosDesactivados(prev => prev.filter(p => p.id !== producto.id));

                                console.log('✅ Producto reactivado:', producto.nombre);
                            }
                        } catch (error) {
                            console.error('❌ Error al reactivar producto:', error);
                            Alert.alert('Error', 'No se pudo reactivar el producto');
                        }
                    }
                }
            ]
        );
    };

    const handleEditarProducto = (producto) => {
        navigation.navigate('AddProducto', { productoId: producto.id });
    };

    const handleEliminarPermanente = async (producto) => {
        Alert.alert(
            'Eliminar permanentemente',
            `¿Estás seguro de eliminar permanentemente "${producto.nombre}"? Esta acción no se puede deshacer.`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const todosProductos = await getData(KEYS.PRODUCTOS);
                            const filtrados = todosProductos.filter(p => p.id !== producto.id);
                            await setData(KEYS.PRODUCTOS, filtrados);

                            // Actualizar lista local
                            setProductosDesactivados(prev => prev.filter(p => p.id !== producto.id));

                            console.log('✅ Producto eliminado permanentemente:', producto.nombre);
                        } catch (error) {
                            console.error('❌ Error al eliminar producto:', error);
                            Alert.alert('Error', 'No se pudo eliminar el producto');
                        }
                    }
                }
            ]
        );
    };

    const renderProducto = ({ item }) => {
        return (
            <View style={styles.productoCard}>
                <View style={styles.productoLeft}>
                    <View style={styles.imagenContainer}>
                        {item.imagen ? (
                            <Image source={{ uri: item.imagen }} style={styles.imagen} />
                        ) : (
                            <View style={styles.imagenPlaceholder}>
                                <Ionicons name="image-outline" size={32} color="#95A5A6" />
                            </View>
                        )}
                    </View>

                    <View style={styles.productoInfo}>
                        <Text style={styles.productoNombre} numberOfLines={2}>
                            {item.nombre}
                        </Text>
                        <Text style={styles.categoriaTexto}>{item.categoria}</Text>
                        <Text style={styles.productoPrecio}>{formatCurrency(item.precioVenta)}</Text>
                    </View>
                </View>

                <View style={styles.productoRight}>
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.reactivarBtn]}
                        onPress={() => handleReactivarProducto(item)}
                    >
                        <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                        <Text style={styles.reactivarText}>Reactivar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionBtn, styles.editarBtn]}
                        onPress={() => handleEditarProducto(item)}
                    >
                        <Ionicons name="create-outline" size={18} color="#29B6F6" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionBtn, styles.eliminarBtn]}
                        onPress={() => handleEliminarPermanente(item)}
                    >
                        <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const styles = createStyles(colors);

    return (
        <View style={styles.container}>
            <Header
                showBack={true}
                title="Productos Desactivados"
                onBackPress={() => navigation.goBack()}
            />

            {loading ? (
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingTexto}>Cargando productos...</Text>
                </View>
            ) : productosDesactivados.length > 0 ? (
                <>
                    <View style={styles.infoContainer}>
                        <Ionicons name="information-circle-outline" size={20} color="#FF9800" />
                        <Text style={styles.infoTexto}>
                            {productosDesactivados.length} producto{productosDesactivados.length !== 1 ? 's' : ''} desactivado{productosDesactivados.length !== 1 ? 's' : ''}
                        </Text>
                    </View>
                    <FlatList
                        data={productosDesactivados}
                        keyExtractor={(item) => item.id}
                        renderItem={renderProducto}
                        contentContainerStyle={styles.listContainer}
                        showsVerticalScrollIndicator={false}
                    />
                </>
            ) : (
                <EmptyState
                    message="No hay productos desactivados"
                    iconName="checkmark-done-circle-outline"
                />
            )}
        </View>
    );
}

const createStyles = (colors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    infoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF3E0',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#FFE0B2',
    },
    infoTexto: {
        fontSize: 13,
        color: '#E65100',
        marginLeft: 8,
        fontWeight: '500',
    },
    listContainer: {
        padding: 16,
    },
    productoCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
        opacity: 0.8,
    },
    productoLeft: {
        flexDirection: 'row',
        flex: 1,
    },
    imagenContainer: {
        width: 60,
        height: 60,
        borderRadius: 8,
        overflow: 'hidden',
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
    productoInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    productoNombre: {
        fontSize: 14,
        color: colors.text,
        fontWeight: '600',
        marginBottom: 4,
    },
    categoriaTexto: {
        fontSize: 11,
        color: colors.textSecondary,
        marginBottom: 4,
    },
    productoPrecio: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text,
    },
    productoRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    actionBtn: {
        padding: 8,
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
    },
    reactivarBtn: {
        flexDirection: 'row',
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 12,
    },
    reactivarText: {
        fontSize: 12,
        color: '#4CAF50',
        fontWeight: '600',
        marginLeft: 4,
    },
    editarBtn: {
        backgroundColor: '#E3F2FD',
    },
    eliminarBtn: {
        backgroundColor: '#FFEBEE',
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
});
