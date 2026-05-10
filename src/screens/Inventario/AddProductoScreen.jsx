import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Image, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { registrarProducto, actualizarProducto, obtenerProductoPorId, calcularMargen } from '../../services/productosService';
import * as categoriasRepo from '../../data/categoriasRepository';
import Header from '../../shared/components/Header';
import CustomModal from '../../shared/components/CustomModal';
import Toast from '../../shared/components/Toast';
import { useTheme } from '../../shared/hooks/useTheme';

export default function AddProductoScreen({ route, navigation }) {
    const { productoId } = route.params || {};
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();

    const [nombre, setNombre] = useState('');
    const [categoriaId, setCategoriaId] = useState('');
    const [categorias, setCategorias] = useState([]);
    const [precioCompra, setPrecioCompra] = useState('');
    const [precioVenta, setPrecioVenta] = useState('');
    const [stock, setStock] = useState('');
    const [imagenUri, setImagenUri] = useState(null);
    const [imagenOriginal, setImagenOriginal] = useState(null);

    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [modalConfig, setModalConfig] = useState({});
    const [toastVisible, setToastVisible] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

    // Modal de categorías
    const [modalCategoriasVisible, setModalCategoriasVisible] = useState(false);
    const [modalAgregarCategoriaVisible, setModalAgregarCategoriaVisible] = useState(false);
    const [nuevaCategoriaNombre, setNuevaCategoriaNombre] = useState('');
    const [nuevaCategoriaIcono, setNuevaCategoriaIcono] = useState('pricetag-outline');

    const esEdicion = !!productoId;

    useEffect(() => {
        cargarCategorias();
        if (esEdicion) {
            cargarProducto();
        }
        solicitarPermisos();
    }, [productoId]);

    const cargarCategorias = async () => {
        const cats = await categoriasRepo.getCategorias();
        setCategorias(cats);
        if (cats.length > 0 && !categoriaId) {
            setCategoriaId(cats[0].id);
        }
    };

    const agregarNuevaCategoria = async () => {
        if (!nuevaCategoriaNombre.trim()) {
            showToast('Ingresa un nombre para la categoría');
            return;
        }

        const nuevaCategoria = {
            id: nuevaCategoriaNombre.toLowerCase().replace(/\s+/g, '-'),
            nombre: nuevaCategoriaNombre.trim(),
            icono: nuevaCategoriaIcono,
            color: '#45beffff'
        };

        await categoriasRepo.addCategoria(nuevaCategoria);
        await cargarCategorias();
        setCategoriaId(nuevaCategoria.id);
        setModalAgregarCategoriaVisible(false);
        setNuevaCategoriaNombre('');
        setNuevaCategoriaIcono('pricetag-outline');
        showToast('Categoría agregada exitosamente');
    };

    const solicitarPermisos = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permiso necesario', 'Se necesita permiso para acceder a las fotos');
        }
    };

    const cargarProducto = async () => {
        try {
            const producto = await obtenerProductoPorId(productoId);
            setNombre(producto.nombre);
            setCategoriaId(producto.categoria);
            setPrecioCompra(producto.precioCompra.toString());
            setPrecioVenta(producto.precioVenta.toString());
            setStock(producto.stock.toString());
            if (producto.imagen) {
                setImagenOriginal(producto.imagen);
                setImagenUri(producto.imagen);
            }
        } catch (error) {
            showModal({
                type: 'error',
                title: 'Error',
                message: error.message,
            });
        }
    };

    const showModal = (config) => {
        setModalConfig(config);
        setModalVisible(true);
    };

    const showToast = (message) => {
        setToastMessage(message);
        setToastVisible(true);
    };

    const seleccionarImagen = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.7,
            });

            if (!result.canceled) {
                setImagenUri(result.assets[0].uri);
            }
        } catch (error) {
            showModal({
                type: 'error',
                title: 'Error',
                message: 'No se pudo seleccionar la imagen',
            });
        }
    };

    const tomarFoto = async () => {
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permiso necesario', 'Se necesita permiso para usar la cámara');
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.7,
            });

            if (!result.canceled) {
                setImagenUri(result.assets[0].uri);
            }
        } catch (error) {
            showModal({
                type: 'error',
                title: 'Error',
                message: 'No se pudo tomar la foto',
            });
        }
    };

    const eliminarImagen = () => {
        setImagenUri(null);
    };

    const mostrarOpcionesImagen = () => {
        Alert.alert(
            'Seleccionar imagen',
            'Elige una opción',
            [
                { text: 'Tomar foto', onPress: tomarFoto },
                { text: 'Elegir de galería', onPress: seleccionarImagen },
                { text: 'Cancelar', style: 'cancel' },
            ]
        );
    };

    const calcularYMostrarMargen = () => {
        if (precioCompra && precioVenta) {
            const margen = calcularMargen(precioCompra, precioVenta);
            return margen;
        }
        return null;
    };

    const handleGuardar = async () => {
        if (!nombre.trim()) {
            showModal({
                type: 'error',
                title: 'Campo requerido',
                message: 'El nombre del producto es obligatorio',
            });
            return;
        }

        if (!categoriaId) {
            showModal({
                type: 'error',
                title: 'Campo requerido',
                message: 'Debes seleccionar una categoría',
            });
            return;
        }

        setLoading(true);
        try {
            const productoData = {
                nombre: nombre.trim(),
                categoria: categoriaId,
                precioCompra,
                precioVenta,
                stock,
                stockMinimo: 5, // Valor por defecto
            };

            const uriParaGuardar = imagenUri !== imagenOriginal ? imagenUri : null;

            if (esEdicion) {
                await actualizarProducto(productoId, productoData, uriParaGuardar);
                showToast('Producto actualizado correctamente');
            } else {
                await registrarProducto(productoData, uriParaGuardar);
                showToast('Producto registrado correctamente');
            }

            setTimeout(() => navigation.goBack(), 1500);
        } catch (error) {
            showModal({
                type: 'error',
                title: 'Error',
                message: error.message,
            });
            setLoading(false);
        }
    };

    const categoriaSeleccionada = categorias.find(c => c.id === categoriaId);
    const margen = calcularYMostrarMargen();
    const styles = createStyles(colors);

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <Header title={esEdicion ? 'Editar Producto' : 'Nuevo Producto'} showBack />

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                <View style={styles.formulario}>
                    {/* Selector de imagen */}
                    <View style={styles.imagenSection}>
                        <Text style={styles.label}>Imagen del producto</Text>
                        <TouchableOpacity
                            style={styles.imagenSelector}
                            onPress={mostrarOpcionesImagen}
                            activeOpacity={0.7}
                        >
                            {imagenUri ? (
                                <View style={styles.imagenPreviewContainer}>
                                    <Image source={{ uri: imagenUri }} style={styles.imagenPreview} />
                                    <TouchableOpacity
                                        style={styles.eliminarImagenBtn}
                                        onPress={eliminarImagen}
                                    >
                                        <Ionicons name="close-circle" size={24} color="#FF6B6B" />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View style={styles.imagenPlaceholder}>
                                    <Ionicons name="camera" size={40} color="#95A5A6" />
                                    <Text style={styles.imagenPlaceholderTexto}>Toca para agregar foto</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Nombre */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Nombre del producto *</Text>
                        <TextInput
                            style={styles.input}
                            value={nombre}
                            onChangeText={setNombre}
                            placeholder="Ej: Blusa roja talla M"
                            placeholderTextColor="#A0A0A0"
                        />
                    </View>

                    {/* Selector de Categoría */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Categoría *</Text>
                        <TouchableOpacity
                            style={styles.categoriaSelector}
                            onPress={() => setModalCategoriasVisible(true)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.categoriaSelectorContent}>
                                {categoriaSeleccionada ? (
                                    <>
                                        <Ionicons name={categoriaSeleccionada.icono} size={20} color="#45beffff" />
                                        <Text style={styles.categoriaSelectorTexto}>{categoriaSeleccionada.nombre}</Text>
                                    </>
                                ) : (
                                    <Text style={styles.categoriaSelectorTexto}>Seleccionar categoría</Text>
                                )}
                            </View>
                            <Ionicons name="chevron-down" size={20} color="#636E72" />
                        </TouchableOpacity>
                    </View>

                    {/* Precios en fila */}
                    <View style={styles.preciosRow}>
                        <View style={styles.precioInputGroup}>
                            <Text style={styles.label}>Precio Compra *</Text>
                            <View style={styles.monedaInputContainer}>
                                <Text style={styles.monedaSymbol}>S/</Text>
                                <TextInput
                                    style={styles.precioInput}
                                    value={precioCompra}
                                    onChangeText={setPrecioCompra}
                                    placeholder="0.00"
                                    placeholderTextColor="#A0A0A0"
                                    keyboardType="decimal-pad"
                                />
                            </View>
                        </View>

                        <View style={styles.precioInputGroup}>
                            <Text style={styles.label}>Precio Venta *</Text>
                            <View style={styles.monedaInputContainer}>
                                <Text style={styles.monedaSymbol}>S/</Text>
                                <TextInput
                                    style={styles.precioInput}
                                    value={precioVenta}
                                    onChangeText={setPrecioVenta}
                                    placeholder="0.00"
                                    placeholderTextColor="#A0A0A0"
                                    keyboardType="decimal-pad"
                                />
                            </View>
                        </View>
                    </View>

                    {/* Margen de ganancia */}
                    {margen && (
                        <View style={styles.margenContainer}>
                            <View style={styles.margenItem}>
                                <Text style={styles.margenLabel}>Ganancia</Text>
                                <Text style={styles.margenValor}>S/ {margen.ganancia}</Text>
                            </View>
                            <View style={styles.margenItem}>
                                <Text style={styles.margenLabel}>Margen</Text>
                                <Text style={styles.margenPorcentaje}>{margen.margenPorcentaje}%</Text>
                            </View>
                        </View>
                    )}

                    {/* Stock */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Stock Actual *</Text>
                        <TextInput
                            style={styles.input}
                            value={stock}
                            onChangeText={setStock}
                            placeholder="0"
                            placeholderTextColor="#A0A0A0"
                            keyboardType="number-pad"
                        />
                    </View>

                    <View style={styles.espacioFinal} />
                </View>
            </ScrollView>

            {/* Botón guardar */}
            <View style={[styles.footerContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
                <TouchableOpacity
                    style={[styles.botonGuardar, loading && styles.botonDisabled]}
                    onPress={handleGuardar}
                    activeOpacity={0.7}
                    disabled={loading}
                >
                    <Ionicons name="checkmark" size={22} color="#FFF" />
                    <Text style={styles.botonGuardarTexto}>
                        {esEdicion ? 'Guardar Cambios' : 'Registrar Producto'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Modal de selección de categorías */}
            <Modal
                visible={modalCategoriasVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setModalCategoriasVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCategorias}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitulo}>Seleccionar Categoría</Text>
                            <TouchableOpacity onPress={() => setModalCategoriasVisible(false)}>
                                <Ionicons name="close" size={24} color="#636E72" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalContenido} showsVerticalScrollIndicator={false}>
                            {categorias.map((cat) => (
                                <TouchableOpacity
                                    key={cat.id}
                                    style={styles.categoriaItem}
                                    onPress={() => {
                                        setCategoriaId(cat.id);
                                        setModalCategoriasVisible(false);
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.categoriaItemLeft}>
                                        <Ionicons name={cat.icono} size={20} color="#45beffff" />
                                        <Text style={styles.categoriaItemTexto}>{cat.nombre}</Text>
                                    </View>
                                    {categoriaId === cat.id && (
                                        <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                                    )}
                                </TouchableOpacity>
                            ))}

                            <TouchableOpacity
                                style={styles.categoriaItemAgregar}
                                onPress={() => {
                                    setModalCategoriasVisible(false);
                                    setModalAgregarCategoriaVisible(true);
                                }}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="add-circle-outline" size={20} color="#29B6F6" />
                                <Text style={styles.categoriaItemAgregarTexto}>Nueva categoría</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Modal para agregar nueva categoría */}
            <Modal
                visible={modalAgregarCategoriaVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setModalAgregarCategoriaVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalAgregarCategoria}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitulo}>Nueva Categoría</Text>
                            <TouchableOpacity onPress={() => setModalAgregarCategoriaVisible(false)}>
                                <Ionicons name="close" size={24} color="#636E72" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalContenido}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Nombre de la categoría</Text>
                                <TextInput
                                    style={styles.input}
                                    value={nuevaCategoriaNombre}
                                    onChangeText={setNuevaCategoriaNombre}
                                    placeholder="Ej: Ropa, Calzado, Accesorios"
                                    placeholderTextColor="#A0A0A0"
                                />
                            </View>

                            <TouchableOpacity
                                style={styles.botonGuardarCategoria}
                                onPress={agregarNuevaCategoria}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="checkmark" size={20} color="#FFF" />
                                <Text style={styles.botonGuardarCategoriaTexto}>Guardar Categoría</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <CustomModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                {...modalConfig}
            />

            <Toast
                visible={toastVisible}
                message={toastMessage}
                onHide={() => setToastVisible(false)}
            />
        </KeyboardAvoidingView>
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
    formulario: {
        padding: 16,
    },
    imagenSection: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 8,
    },
    imagenSelector: {
        width: '100%',
        height: 200,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: colors.border,
        borderStyle: 'dashed',
    },
    imagenPreviewContainer: {
        width: '100%',
        height: '100%',
        position: 'relative',
    },
    imagenPreview: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    eliminarImagenBtn: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: '#FFF',
        borderRadius: 12,
    },
    imagenPlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.surfaceVariant,
    },
    imagenPlaceholderTexto: {
        marginTop: 8,
        fontSize: 14,
        color: colors.textSecondary,
    },
    inputGroup: {
        marginBottom: 16,
    },
    input: {
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 15,
        color: colors.text,
    },
    categoriaSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    categoriaSelectorContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    categoriaSelectorTexto: {
        fontSize: 15,
        color: colors.text,
    },
    preciosRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    precioInputGroup: {
        flex: 1,
    },
    monedaInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    monedaSymbol: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.text,
        marginRight: 8,
    },
    precioInput: {
        flex: 1,
        fontSize: 15,
        color: colors.text,
    },
    margenContainer: {
        flexDirection: 'row',
        backgroundColor: '#E8F5E9',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        gap: 16,
    },
    margenItem: {
        flex: 1,
        alignItems: 'center',
    },
    margenLabel: {
        fontSize: 12,
        color: '#2E7D32',
        marginBottom: 4,
    },
    margenValor: {
        fontSize: 16,
        fontWeight: '700',
        color: '#2E7D32',
    },
    margenPorcentaje: {
        fontSize: 16,
        fontWeight: '700',
        color: '#2E7D32',
    },
    stockRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    stockInputGroup: {
        flex: 1,
    },
    espacioFinal: {
        height: 20,
    },
    footerContainer: {
        padding: 16,
        backgroundColor: colors.card,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    botonGuardar: {
        flexDirection: 'row',
        backgroundColor: '#29B6F6',
        borderRadius: 12,
        paddingVertical: 14,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    botonDisabled: {
        opacity: 0.6,
    },
    botonGuardarTexto: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFF',
    },
    // Modales
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalCategorias: {
        backgroundColor: colors.card,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '70%',
    },
    modalAgregarCategoria: {
        backgroundColor: colors.card,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    modalTitulo: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
    },
    modalContenido: {
        padding: 20,
    },
    categoriaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
        backgroundColor: colors.surfaceVariant,
        borderRadius: 12,
        marginBottom: 8,
    },
    categoriaItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    categoriaItemTexto: {
        fontSize: 15,
        color: colors.text,
        fontWeight: '500',
    },
    categoriaItemAgregar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        backgroundColor: '#E1F5FE',
        borderRadius: 12,
        marginTop: 8,
        gap: 8,
    },
    categoriaItemAgregarTexto: {
        fontSize: 15,
        color: '#29B6F6',
        fontWeight: '600',
    },
    botonGuardarCategoria: {
        flexDirection: 'row',
        backgroundColor: '#29B6F6',
        borderRadius: 12,
        paddingVertical: 14,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        marginTop: 8,
    },
    botonGuardarCategoriaTexto: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFF',
    },
});
