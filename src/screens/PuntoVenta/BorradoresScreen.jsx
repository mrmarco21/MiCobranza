import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatCurrency } from '../../shared/utils/helpers';
import Header from '../../shared/components/Header';
import EmptyState from '../../shared/components/EmptyState';
import { useTheme } from '../../shared/hooks/useTheme';
import { getBorradores, eliminarBorrador, limpiarBorradores } from '../../data/borradoresRepository';

export default function BorradoresScreen({ navigation }) {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const [borradores, setBorradores] = useState([]);

    const cargarBorradores = async () => {
        const borradoresData = await getBorradores();
        setBorradores(borradoresData);
    };

    useFocusEffect(
        React.useCallback(() => {
            cargarBorradores();
        }, [])
    );

    const handleEliminarBorrador = (borradorId) => {
        Alert.alert(
            'Eliminar Borrador',
            '¿Estás seguro de que deseas eliminar este borrador?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        await eliminarBorrador(borradorId);
                        cargarBorradores();
                    },
                },
            ]
        );
    };

    const handleEliminarTodos = () => {
        if (borradores.length === 0) return;

        Alert.alert(
            'Eliminar Todos los Borradores',
            '¿Estás seguro de que deseas eliminar todos los borradores? Esta acción no se puede deshacer.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar Todos',
                    style: 'destructive',
                    onPress: async () => {
                        await limpiarBorradores();
                        cargarBorradores();
                    },
                },
            ]
        );
    };

    const handleCargarBorrador = async (borrador) => {
        // Eliminar el borrador antes de cargarlo en el punto de venta
        await eliminarBorrador(borrador.id);
        cargarBorradores();

        // Navegar al punto de venta con los datos del borrador
        navigation.navigate('PuntoVenta', {
            productosSeleccionados: borrador.productos,
            clienteSeleccionado: borrador.cliente,
        });
    };

    const formatearFecha = (timestamp) => {
        const fecha = new Date(timestamp);
        const dia = fecha.getDate().toString().padStart(2, '0');
        const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
        const año = fecha.getFullYear();
        const horas = fecha.getHours().toString().padStart(2, '0');
        const minutos = fecha.getMinutes().toString().padStart(2, '0');
        return `${dia}/${mes}/${año} ${horas}:${minutos}`;
    };

    const calcularTotal = (productos) => {
        return productos.reduce((sum, p) => sum + (p.precioVenta * p.cantidad), 0);
    };

    const styles = createStyles(colors);

    const renderBorrador = ({ item }) => {
        const total = calcularTotal(item.productos);
        const cantidadProductos = item.productos.reduce((sum, p) => sum + p.cantidad, 0);

        return (
            <View style={styles.borradorCard}>
                <View style={styles.borradorHeader}>
                    <View style={styles.borradorHeaderLeft}>
                        <Text style={styles.borradorNombre}>
                            {item.nombre || 'Sin nombre'}
                        </Text>
                        <Text style={styles.borradorFecha}>
                            {formatearFecha(item.timestamp)}
                        </Text>
                    </View>
                    <View style={styles.borradorActions}>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => handleCargarBorrador(item)}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="copy-outline" size={22} color="#29B6F6" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => handleEliminarBorrador(item.id)}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="trash-outline" size={22} color="#FF6B6B" />
                        </TouchableOpacity>
                    </View>
                </View>

                {item.cliente && (
                    <View style={styles.clienteInfo}>
                        <Ionicons name="person-outline" size={16} color="#7F8C8D" />
                        <Text style={styles.clienteNombre}>{item.cliente.nombre}</Text>
                    </View>
                )}

                <View style={styles.productosInfo}>
                    <Text style={styles.productosLabel}>
                        {cantidadProductos} {cantidadProductos === 1 ? 'producto' : 'productos'}
                    </Text>
                    <Text style={styles.totalLabel}>{formatCurrency(total)}</Text>
                </View>

                <View style={styles.productosList}>
                    {item.productos.slice(0, 3).map((producto, index) => (
                        <Text key={index} style={styles.productoItem} numberOfLines={1}>
                            • {producto.nombre} x{producto.cantidad}
                        </Text>
                    ))}
                    {item.productos.length > 3 && (
                        <Text style={styles.masProductos}>
                            +{item.productos.length - 3} más
                        </Text>
                    )}
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <Header
                title="Borradores"
                showBack
                rightIcon="trash-outline"
                onRightPress={handleEliminarTodos}
            />

            {borradores.length === 0 ? (
                <EmptyState
                    icon="document-text-outline"
                    message="No hay borradores guardados"
                    description="Los borradores que guardes aparecerán aquí"
                />
            ) : (
                <FlatList
                    data={borradores}
                    keyExtractor={(item) => item.id}
                    renderItem={renderBorrador}
                    contentContainerStyle={[
                        styles.listContainer,
                        { paddingBottom: Math.max(insets.bottom + 16, 16) }
                    ]}
                    showsVerticalScrollIndicator={false}
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
    listContainer: {
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    borradorCard: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    borradorHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    borradorHeaderLeft: {
        flex: 1,
    },
    borradorNombre: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 4,
    },
    borradorFecha: {
        fontSize: 13,
        color: colors.textSecondary,
    },
    borradorActions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.surfaceVariant,
        justifyContent: 'center',
        alignItems: 'center',
    },
    clienteInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 12,
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: colors.surfaceVariant,
        borderRadius: 6,
    },
    clienteNombre: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
    },
    productosInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    productosLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    totalLabel: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
    },
    productosList: {
        gap: 4,
    },
    productoItem: {
        fontSize: 13,
        color: colors.textSecondary,
        lineHeight: 18,
    },
    masProductos: {
        fontSize: 13,
        color: '#29B6F6',
        fontWeight: '600',
        marginTop: 4,
    },
});
