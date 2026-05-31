import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as categoriasRepo from '../../../data/categoriasRepository';
import * as unidadesRepo from '../../../data/unidadesMedidaRepository';
import { useTheme } from '../../../shared/hooks/useTheme';

export default function GestionCategoriasUnidades({ showToast }) {
    const { colors } = useTheme();
    const styles = createStyles(colors);

    const [categorias, setCategorias] = useState([]);
    const [unidades, setUnidades] = useState([]);

    // Modales de categorías
    const [modalCategoriaVisible, setModalCategoriaVisible] = useState(false);
    const [categoriaEditando, setCategoriaEditando] = useState(null);
    const [nombreCategoria, setNombreCategoria] = useState('');

    // Modales de unidades
    const [modalUnidadVisible, setModalUnidadVisible] = useState(false);
    const [unidadEditando, setUnidadEditando] = useState(null);
    const [nombreUnidad, setNombreUnidad] = useState('');

    useEffect(() => {
        cargarDatos();
    }, []);

    const cargarDatos = async () => {
        const cats = await categoriasRepo.getCategorias();
        const unis = await unidadesRepo.getUnidadesMedida();
        setCategorias(cats);
        setUnidades(unis);
    };

    // ========== CATEGORÍAS ==========
    const abrirModalCategoria = (categoria = null) => {
        setCategoriaEditando(categoria);
        setNombreCategoria(categoria ? categoria.nombre : '');
        setModalCategoriaVisible(true);
    };

    const guardarCategoria = async () => {
        if (!nombreCategoria.trim()) {
            showToast('Ingresa un nombre para la categoría', 'error');
            return;
        }

        try {
            if (categoriaEditando) {
                // Editar
                await categoriasRepo.updateCategoria(categoriaEditando.id, {
                    nombre: nombreCategoria.trim()
                });
                showToast('Categoría actualizada correctamente');
            } else {
                // Crear nueva
                const nuevaCategoria = {
                    id: nombreCategoria.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
                    nombre: nombreCategoria.trim(),
                    icono: 'pricetag-outline',
                    color: '#45beffff'
                };
                await categoriasRepo.addCategoria(nuevaCategoria);
                showToast('Categoría agregada correctamente');
            }

            await cargarDatos();
            setModalCategoriaVisible(false);
            setNombreCategoria('');
            setCategoriaEditando(null);
        } catch (error) {
            showToast('Error al guardar la categoría', 'error');
        }
    };

    const eliminarCategoria = async (categoria) => {
        // Verificar si está en uso
        const productosRepo = await import('../../../data/productosRepository');
        const productos = await productosRepo.getAll();
        const enUso = productos.some(p => p.categoria === categoria.id);

        if (enUso) {
            Alert.alert(
                'Categoría en uso',
                'No puedes eliminar esta categoría porque hay productos que la están usando.',
                [{ text: 'OK' }]
            );
            return;
        }

        Alert.alert(
            'Eliminar Categoría',
            `¿Estás seguro de eliminar "${categoria.nombre}"?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await categoriasRepo.deleteCategoria(categoria.id);
                            await cargarDatos();
                            showToast('Categoría eliminada correctamente');
                        } catch (error) {
                            showToast('Error al eliminar la categoría', 'error');
                        }
                    }
                }
            ]
        );
    };

    // ========== UNIDADES DE MEDIDA ==========
    const abrirModalUnidad = (unidad = null) => {
        setUnidadEditando(unidad);
        setNombreUnidad(unidad ? unidad.nombre : '');
        setModalUnidadVisible(true);
    };

    const guardarUnidad = async () => {
        if (!nombreUnidad.trim()) {
            showToast('Ingresa un nombre para la unidad', 'error');
            return;
        }

        try {
            if (unidadEditando) {
                // Editar
                await unidadesRepo.updateUnidadMedida(unidadEditando.id, {
                    nombre: nombreUnidad.trim()
                });
                showToast('Unidad actualizada correctamente');
            } else {
                // Crear nueva
                const nuevaUnidad = {
                    id: nombreUnidad.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
                    nombre: nombreUnidad.trim()
                };
                await unidadesRepo.addUnidadMedida(nuevaUnidad);
                showToast('Unidad agregada correctamente');
            }

            await cargarDatos();
            setModalUnidadVisible(false);
            setNombreUnidad('');
            setUnidadEditando(null);
        } catch (error) {
            showToast('Error al guardar la unidad', 'error');
        }
    };

    const eliminarUnidad = async (unidad) => {
        // Verificar si está en uso
        const enUso = await unidadesRepo.isUnidadEnUso(unidad.nombre);

        if (enUso) {
            Alert.alert(
                'Unidad en uso',
                'No puedes eliminar esta unidad porque hay productos que la están usando.',
                [{ text: 'OK' }]
            );
            return;
        }

        Alert.alert(
            'Eliminar Unidad',
            `¿Estás seguro de eliminar "${unidad.nombre}"?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await unidadesRepo.deleteUnidadMedida(unidad.id);
                            await cargarDatos();
                            showToast('Unidad eliminada correctamente');
                        } catch (error) {
                            showToast('Error al eliminar la unidad', 'error');
                        }
                    }
                }
            ]
        );
    };

    return (
        <View style={styles.container}>
            {/* ========== CATEGORÍAS ========== */}
            <View style={styles.seccion}>
                <View style={styles.seccionHeader}>
                    <View>
                        <Text style={styles.seccionTitulo}>Categorías de Productos</Text>
                        <Text style={styles.seccionSubtitulo}>Organiza mejor tu inventario</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.botonAgregar}
                        onPress={() => abrirModalCategoria()}
                    >
                        <Ionicons name="add-circle" size={18} color="#29B6F6" />
                        <Text style={styles.botonAgregarTexto}>Agregar</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.listaItems}>
                    {categorias.map((cat) => (
                        <View key={cat.id} style={styles.item}>
                            <View style={styles.itemLeft}>
                                <View style={styles.itemIcon}>
                                    <Ionicons name={cat.icono || 'pricetag-outline'} size={18} color="#45beffff" />
                                </View>
                                <Text style={styles.itemNombre}>{cat.nombre}</Text>
                            </View>
                            <View style={styles.itemActions}>
                                <TouchableOpacity
                                    style={styles.itemBoton}
                                    onPress={() => abrirModalCategoria(cat)}
                                >
                                    <Ionicons name="create-outline" size={18} color="#29B6F6" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.itemBoton}
                                    onPress={() => eliminarCategoria(cat)}
                                >
                                    <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                </View>
            </View>

            {/* ========== UNIDADES DE MEDIDA ========== */}
            <View style={styles.seccion}>
                <View style={styles.seccionHeader}>
                    <View>
                        <Text style={styles.seccionTitulo}>Unidades de Medida</Text>
                        <Text style={styles.seccionSubtitulo}>Mantén consistencia al vender</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.botonAgregar}
                        onPress={() => abrirModalUnidad()}
                    >
                        <Ionicons name="add-circle" size={18} color="#29B6F6" />
                        <Text style={styles.botonAgregarTexto}>Agregar</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.listaItems}>
                    {unidades.map((unidad) => (
                        <View key={unidad.id} style={styles.item}>
                            <View style={styles.itemLeft}>
                                <View style={styles.itemIcon}>
                                    <Ionicons name="cube-outline" size={18} color="#9C27B0" />
                                </View>
                                <Text style={styles.itemNombre}>{unidad.nombre}</Text>
                            </View>
                            <View style={styles.itemActions}>
                                <TouchableOpacity
                                    style={styles.itemBoton}
                                    onPress={() => abrirModalUnidad(unidad)}
                                >
                                    <Ionicons name="create-outline" size={18} color="#29B6F6" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.itemBoton}
                                    onPress={() => eliminarUnidad(unidad)}
                                >
                                    <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                </View>
            </View>

            {/* ========== MODAL CATEGORÍA ========== */}
            <Modal
                visible={modalCategoriaVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setModalCategoriaVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContenido}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitulo}>
                                {categoriaEditando ? 'Editar Categoría' : 'Nueva Categoría'}
                            </Text>
                            <TouchableOpacity onPress={() => setModalCategoriaVisible(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalBody}>
                            <Text style={styles.label}>Nombre de la categoría</Text>
                            <TextInput
                                style={styles.input}
                                value={nombreCategoria}
                                onChangeText={setNombreCategoria}
                                placeholder="Ej: Ropa, Calzado, Accesorios"
                                placeholderTextColor="#A0A0A0"
                                autoFocus
                            />

                            <TouchableOpacity
                                style={styles.botonGuardar}
                                onPress={guardarCategoria}
                            >
                                <Ionicons name="checkmark" size={20} color="#FFF" />
                                <Text style={styles.botonGuardarTexto}>
                                    {categoriaEditando ? 'Actualizar' : 'Guardar'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ========== MODAL UNIDAD ========== */}
            <Modal
                visible={modalUnidadVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setModalUnidadVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContenido}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitulo}>
                                {unidadEditando ? 'Editar Unidad' : 'Nueva Unidad'}
                            </Text>
                            <TouchableOpacity onPress={() => setModalUnidadVisible(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalBody}>
                            <Text style={styles.label}>Nombre de la unidad</Text>
                            <TextInput
                                style={styles.input}
                                value={nombreUnidad}
                                onChangeText={setNombreUnidad}
                                placeholder="Ej: Kg, Litro, Docena"
                                placeholderTextColor="#A0A0A0"
                                autoFocus
                            />

                            <TouchableOpacity
                                style={styles.botonGuardar}
                                onPress={guardarUnidad}
                            >
                                <Ionicons name="checkmark" size={20} color="#FFF" />
                                <Text style={styles.botonGuardarTexto}>
                                    {unidadEditando ? 'Actualizar' : 'Guardar'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const createStyles = (colors) => StyleSheet.create({
    container: {
        gap: 12,
    },
    seccion: {
        backgroundColor: colors.surfaceVariant,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 14,
    },
    seccionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
        gap: 10,
    },
    seccionTitulo: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text,
    },
    seccionSubtitulo: {
        fontSize: 11,
        color: colors.textSecondary,
        marginTop: 2,
    },
    botonAgregar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 12,
        paddingVertical: 7,
        backgroundColor: '#E3F2FD',
        borderRadius: 10,
    },
    botonAgregarTexto: {
        fontSize: 12,
        fontWeight: '600',
        color: '#29B6F6',
    },
    listaItems: {
        gap: 8,
    },
    item: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.surface,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    itemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    itemIcon: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: colors.surfaceVariant,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    itemNombre: {
        fontSize: 13,
        fontWeight: '500',
        color: colors.text,
    },
    itemActions: {
        flexDirection: 'row',
        gap: 6,
    },
    itemBoton: {
        width: 30,
        height: 30,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surfaceVariant,
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContenido: {
        backgroundColor: colors.card,
        borderRadius: 18,
        width: '100%',
        maxWidth: 400,
        borderWidth: 1,
        borderColor: colors.border,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 18,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    modalTitulo: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
    },
    modalBody: {
        padding: 18,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 8,
    },
    input: {
        backgroundColor: colors.surfaceVariant,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 14,
        color: colors.text,
        marginBottom: 16,
    },
    botonGuardar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#29B6F6',
        paddingVertical: 12,
        borderRadius: 12,
    },
    botonGuardarTexto: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFF',
    },
});
