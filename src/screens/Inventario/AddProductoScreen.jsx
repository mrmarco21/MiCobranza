import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Image, Alert, Modal } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { registrarProducto, actualizarProducto, obtenerProductoPorId, calcularMargen } from '../../services/productosService';
import * as categoriasRepo from '../../data/categoriasRepository';
import * as unidadesRepo from '../../data/unidadesMedidaRepository';
import Header from '../../shared/components/Header';
import CustomModal from '../../shared/components/CustomModal';
import Toast from '../../shared/components/Toast';
import CollapsibleSection from '../../shared/components/CollapsibleSection';
import FloatingLabelInput from '../../shared/components/FloatingLabelInput';
import FloatingLabelSelector from '../../shared/components/FloatingLabelSelector';
import MultipleCodesInput from '../../shared/components/MultipleCodesInput';
import BarcodeScannerModal from '../../shared/components/BarcodeScannerModal';
import { useTheme } from '../../shared/hooks/useTheme';

export default function AddProductoScreen({ route, navigation }) {
    const { productoId } = route.params || {};
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();

    // Campos básicos
    const [codigos, setCodigos] = useState([]); // Todos los códigos (SKU, códigos de barra, alternativos)
    const [nombre, setNombre] = useState('');
    const [categoriaId, setCategoriaId] = useState('');
    const [categorias, setCategorias] = useState([]);
    const [unidadesMedida, setUnidadesMedida] = useState([]);
    const [marca, setMarca] = useState('');
    const [descripcion, setDescripcion] = useState('');

    // Imágenes (múltiples)
    const [imagenes, setImagenes] = useState([]);
    const [imagenOriginal, setImagenOriginal] = useState(null);
    const [imagenesOriginales, setImagenesOriginales] = useState([]); // Para comparar en edición

    // Variantes/Atributos
    const [talla, setTalla] = useState('');
    const [color, setColor] = useState('');
    const [modelo, setModelo] = useState('');

    // Precios
    const [precioCompra, setPrecioCompra] = useState('');
    const [precioVenta, setPrecioVenta] = useState('');

    // Inventario
    const [stock, setStock] = useState('');
    const [stockMinimo, setStockMinimo] = useState('');
    const [unidadMedida, setUnidadMedida] = useState('Unidad');

    // Proveedor y estado
    const [proveedor, setProveedor] = useState('');
    const [estado, setEstado] = useState('Activo');

    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [modalConfig, setModalConfig] = useState({});
    const [toastVisible, setToastVisible] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

    // Modal de escáner de código de barras
    const [scannerVisible, setScannerVisible] = useState(false);

    // Modal de categorías
    const [modalCategoriasVisible, setModalCategoriasVisible] = useState(false);
    const [modalAgregarCategoriaVisible, setModalAgregarCategoriaVisible] = useState(false);
    const [nuevaCategoriaNombre, setNuevaCategoriaNombre] = useState('');
    const [nuevaCategoriaIcono, setNuevaCategoriaIcono] = useState('pricetag-outline');

    // Modal de unidad de medida
    const [modalUnidadVisible, setModalUnidadVisible] = useState(false);
    const [modalAgregarUnidadVisible, setModalAgregarUnidadVisible] = useState(false);
    const [nuevaUnidadNombre, setNuevaUnidadNombre] = useState('');

    // Modal de estado
    const [modalEstadoVisible, setModalEstadoVisible] = useState(false);

    const esEdicion = !!productoId;

    useEffect(() => {
        cargarCategorias();
        cargarUnidadesMedida();
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

    const cargarUnidadesMedida = async () => {
        const unidades = await unidadesRepo.getUnidadesMedida();
        setUnidadesMedida(unidades);
    };

    const agregarNuevaCategoria = async () => {
        if (!nuevaCategoriaNombre.trim()) {
            showToast('Ingresa un nombre para la categoría');
            return;
        }

        const nuevaCategoria = {
            id: nuevaCategoriaNombre.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
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

    const agregarNuevaUnidad = async () => {
        if (!nuevaUnidadNombre.trim()) {
            showToast('Ingresa un nombre para la unidad');
            return;
        }

        const nuevaUnidad = {
            id: nuevaUnidadNombre.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
            nombre: nuevaUnidadNombre.trim()
        };

        await unidadesRepo.addUnidadMedida(nuevaUnidad);
        await cargarUnidadesMedida();
        setUnidadMedida(nuevaUnidad.nombre);
        setModalAgregarUnidadVisible(false);
        setNuevaUnidadNombre('');
        showToast('Unidad agregada exitosamente');
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

            // Cargar todos los códigos (SKU + códigos alternativos)
            const todosLosCodigos = [];
            if (producto.sku) {
                todosLosCodigos.push(producto.sku);
            }
            if (producto.codigosAlternativos && producto.codigosAlternativos.length > 0) {
                todosLosCodigos.push(...producto.codigosAlternativos);
            }
            setCodigos(todosLosCodigos);

            setNombre(producto.nombre);
            setCategoriaId(producto.categoria);
            setMarca(producto.marca || '');
            setDescripcion(producto.descripcion || '');
            setTalla(producto.talla || '');
            setColor(producto.color || '');
            setModelo(producto.modelo || '');
            setPrecioCompra(producto.precioCompra.toString());
            setPrecioVenta(producto.precioVenta.toString());
            setStock(producto.stock.toString());
            setStockMinimo(producto.stockMinimo?.toString() || '5');
            setUnidadMedida(producto.unidadMedida || 'Unidad');
            setProveedor(producto.proveedor || '');
            setEstado(producto.estado || 'Activo');

            if (producto.imagenes && producto.imagenes.length > 0) {
                setImagenOriginal(producto.imagenes[0]);
                setImagenes(producto.imagenes);
                setImagenesOriginales(producto.imagenes);
            } else if (producto.imagen) {
                setImagenOriginal(producto.imagen);
                setImagenes([producto.imagen]);
                setImagenesOriginales([producto.imagen]);
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
                setImagenes([...imagenes, result.assets[0].uri]);
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
                setImagenes([...imagenes, result.assets[0].uri]);
            }
        } catch (error) {
            showModal({
                type: 'error',
                title: 'Error',
                message: 'No se pudo tomar la foto',
            });
        }
    };

    const eliminarImagen = (index) => {
        const nuevasImagenes = imagenes.filter((_, i) => i !== index);
        setImagenes(nuevasImagenes);
    };

    const handleBarcodeScanned = async (barcode) => {
        // Verificar si el código ya existe en este producto
        if (codigos.includes(barcode)) {
            showToast('Este código ya está agregado a este producto');
            return;
        }

        // Validar si el código existe en otro producto
        const isValid = await validarCodigoUnico(barcode);
        if (!isValid) {
            return;
        }

        // Si no existe, agregarlo
        setCodigos([...codigos, barcode]);
        showToast(`Código agregado: ${barcode}`);
    };

    const validarCodigoUnico = async (codigo) => {
        try {
            const productosRepo = await import('../../data/productosRepository');
            const todosLosProductos = await productosRepo.getAll();

            // Buscar si el código existe en otro producto (excluyendo el actual si estamos editando)
            const productoConCodigo = todosLosProductos.find(p => {
                // Excluir el producto actual si estamos editando
                if (esEdicion && p.id === productoId) {
                    return false;
                }

                // Verificar si el código está en SKU o códigos alternativos
                return p.sku === codigo ||
                    (p.codigosAlternativos && p.codigosAlternativos.includes(codigo));
            });

            if (productoConCodigo) {
                showModal({
                    type: 'error',
                    title: 'Código en uso',
                    message: `Este código ya está registrado en el producto: "${productoConCodigo.nombre}"`,
                });
                return false;
            }

            return true;
        } catch (error) {
            console.error('Error al verificar código:', error);
            showModal({
                type: 'error',
                title: 'Error',
                message: 'No se pudo verificar el código',
            });
            return false;
        }
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
            // El primer código será el SKU, el resto serán códigos alternativos
            const sku = codigos.length > 0 ? codigos[0] : `PRD-${Date.now()}`;
            const codigosAlternativos = codigos.length > 1 ? codigos.slice(1) : [];

            const productoData = {
                sku: sku,
                codigosAlternativos: codigosAlternativos,
                nombre: nombre.trim(),
                categoria: categoriaId,
                marca: marca.trim(),
                descripcion: descripcion.trim(),
                talla: talla.trim(),
                color: color.trim(),
                modelo: modelo.trim(),
                precioCompra,
                precioVenta,
                stock,
                stockMinimo: stockMinimo || 5,
                unidadMedida,
                proveedor: proveedor.trim(),
                estado,
            };

            // Determinar qué imágenes son nuevas (no están en imagenesOriginales del estado)
            const imagenesNuevas = imagenes.filter(img => !imagenesOriginales.includes(img));

            // Si hay imágenes nuevas o se eliminaron imágenes, pasar el array completo
            const imagenesParaGuardar = imagenesNuevas.length > 0 || imagenes.length !== imagenesOriginales.length
                ? imagenes
                : [];

            if (esEdicion) {
                await actualizarProducto(productoId, productoData, imagenesParaGuardar);
                showToast('Producto actualizado correctamente');
            } else {
                await registrarProducto(productoData, imagenes);
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
    const gananciaEstimada = precioVenta && precioCompra ? (parseFloat(precioVenta) - parseFloat(precioCompra)).toFixed(2) : '0.00';
    const styles = createStyles(colors);

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <Header
                title={esEdicion ? 'Editar Producto' : 'Nuevo Producto'}
                showBack
                subtitle="Registra la información del producto"
            />

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                <View style={styles.formulario}>

                    {/* Sección: Imagen del producto */}
                    <View style={styles.seccionImagenes}>
                        <Text style={styles.labelSeccion}>Imagen del producto *</Text>

                        {/* Imagen principal */}
                        <TouchableOpacity
                            style={styles.imagenPrincipal}
                            onPress={mostrarOpcionesImagen}
                            activeOpacity={0.7}
                        >
                            {imagenes.length > 0 ? (
                                <View style={styles.imagenPreviewContainer}>
                                    <Image source={{ uri: imagenes[0] }} style={styles.imagenPreview} />
                                    <TouchableOpacity
                                        style={styles.eliminarImagenBtn}
                                        onPress={() => eliminarImagen(0)}
                                    >
                                        <Ionicons name="close-circle" size={24} color="#FF6B6B" />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View style={styles.imagenPlaceholder}>
                                    <Ionicons name="camera-outline" size={48} color="#95A5A6" />
                                    <Text style={styles.imagenPlaceholderTexto}>Toca para agregar</Text>
                                    <Text style={styles.imagenPlaceholderSubtexto}>foto principal</Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        {/* Miniaturas adicionales */}
                        <View style={styles.miniaturasContainer}>
                            {[1, 2, 3].map((index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={styles.miniaturaBox}
                                    onPress={imagenes[index] ? () => eliminarImagen(index) : mostrarOpcionesImagen}
                                    activeOpacity={0.7}
                                >
                                    {imagenes[index] ? (
                                        <Image source={{ uri: imagenes[index] }} style={styles.miniaturaImagen} />
                                    ) : (
                                        <Ionicons name="camera-outline" size={24} color="#95A5A6" />
                                    )}
                                </TouchableOpacity>
                            ))}

                            <TouchableOpacity
                                style={styles.agregarMasFotosBtn}
                                onPress={mostrarOpcionesImagen}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="images-outline" size={16} color="#29B6F6" />
                                <Text style={styles.agregarMasFotosTexto}>Agregar más fotos</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Códigos (SKU, Códigos de Barra, Alternativos) */}
                    <MultipleCodesInput
                        label="Código Alternativo"
                        codes={codigos}
                        onCodesChange={setCodigos}
                        placeholder=""
                        allowBarcode={true}
                        onScanBarcode={() => setScannerVisible(true)}
                        onValidateCode={validarCodigoUnico}
                    />

                    {/* Nombre del producto */}
                    <View style={styles.inputGroup}>
                        <FloatingLabelInput
                            label="Nombre del producto *"
                            value={nombre}
                            onChangeText={setNombre}
                            placeholder="Ej: Polo básico cuello redondo"
                            icon={<Ionicons name="pricetag-outline" size={20} color="#636E72" />}
                        />
                    </View>

                    {/* Categoría */}
                    <View style={styles.inputGroup}>
                        <FloatingLabelSelector
                            label="Categoría *"
                            value={categoriaSeleccionada?.nombre}
                            onPress={() => setModalCategoriasVisible(true)}
                            placeholder="Selecciona una categoría"
                            icon={<Ionicons name="grid-outline" size={20} color="#29B6F6" />}
                        />
                    </View>

                    {/* Sección colapsable: Información básica */}
                    <CollapsibleSection
                        title="Información básica"
                        // icon="document-text-outline"
                        defaultExpanded={true}
                    >
                        {/* Marca y Proveedor en fila */}
                        <View style={styles.rowInputs}>
                            <View style={styles.halfInput}>
                                <FloatingLabelInput
                                    label="Marca"
                                    value={marca}
                                    onChangeText={setMarca}
                                    placeholder="Ej: Nike, Adidas"
                                    icon={<MaterialCommunityIcons name="tag-outline" size={20} color="#636E72" />}
                                />
                            </View>

                            <View style={styles.halfInput}>
                                <FloatingLabelInput
                                    label="Proveedor"
                                    value={proveedor}
                                    onChangeText={setProveedor}
                                    placeholder="Ej: Comercial López"
                                    icon={<Ionicons name="business-outline" size={20} color="#636E72" />}
                                />
                            </View>
                        </View>

                        {/* Descripción */}
                        <View style={styles.inputGroup}>
                            <FloatingLabelInput
                                label="Descripción (opcional)"
                                value={descripcion}
                                onChangeText={setDescripcion}
                                placeholder="Descripción del producto, material, detalles..."
                                icon={<Ionicons name="document-text-outline" size={20} color="#636E72" />}
                                multiline
                                numberOfLines={3}
                                maxLength={200}
                            />
                            <Text style={styles.charCounter}>{descripcion.length}/200</Text>
                        </View>
                    </CollapsibleSection>

                    {/* Sección colapsable: Atributos / Variantes */}
                    <CollapsibleSection
                        title="Atributos / Variantes"
                        // icon="options-outline"
                        subtitle="(opcionales según categoría)"
                        defaultExpanded={false}
                    >
                        <View style={styles.infoBox}>
                            <Ionicons name="information-circle-outline" size={20} color="#29B6F6" />
                            <Text style={styles.infoBoxTexto}>
                                Este producto puede tener diferentes combinaciones (tallas, colores, modelos).
                            </Text>
                        </View>

                        {/* Talla, Color, Modelo */}
                        <View style={styles.variantesRow}>
                            <View style={styles.varianteInput}>
                                <FloatingLabelInput
                                    label="Talla"
                                    value={talla}
                                    onChangeText={setTalla}
                                    placeholder="M"
                                />
                            </View>

                            <View style={styles.varianteInput}>
                                <FloatingLabelInput
                                    label="Color"
                                    value={color}
                                    onChangeText={setColor}
                                    placeholder="Rojo"
                                />
                            </View>

                            <View style={styles.varianteInput}>
                                <FloatingLabelInput
                                    label="Modelo"
                                    value={modelo}
                                    onChangeText={setModelo}
                                    placeholder="Básico"
                                />
                            </View>
                        </View>
                    </CollapsibleSection>

                    {/* Sección colapsable: Precios */}
                    <CollapsibleSection
                        title="Precios"
                        icon="cash-outline"
                        iconColor="#4CAF50"
                        defaultExpanded={true}
                    >
                        <View style={styles.preciosContainer}>
                            {/* Precio de compra */}
                            <View style={styles.precioBox}>
                                <FloatingLabelInput
                                    label="Precio de compra *"
                                    value={precioCompra}
                                    onChangeText={setPrecioCompra}
                                    placeholder="0.00"
                                    keyboardType="decimal-pad"
                                    icon={<Text style={styles.monedaSymbol}>S/</Text>}
                                />
                                <Text style={styles.helperTextPrecio}>Costo por unidad</Text>
                            </View>

                            <Ionicons name="arrow-forward" size={24} color="#95A5A6" style={styles.arrowIcon} />

                            {/* Precio de venta */}
                            <View style={styles.precioBox}>
                                <FloatingLabelInput
                                    label="Precio de venta *"
                                    value={precioVenta}
                                    onChangeText={setPrecioVenta}
                                    placeholder="0.00"
                                    keyboardType="decimal-pad"
                                    icon={<Text style={styles.monedaSymbol}>S/</Text>}
                                />
                                <Text style={styles.helperTextPrecio}>Precio al público</Text>
                            </View>
                        </View>

                        {/* Ganancia estimada */}
                        {margen && (
                            <View style={styles.gananciaBox}>
                                <View style={styles.gananciaItem}>
                                    <Text style={styles.gananciaLabel}>Ganancia</Text>
                                    <Text style={styles.gananciaValor}>S/ {gananciaEstimada}</Text>
                                </View>
                                <View style={styles.dividerVertical} />
                                <View style={styles.gananciaItem}>
                                    <Text style={styles.gananciaLabel}>Margen</Text>
                                    <Text style={styles.gananciaMargen}>{margen.margenPorcentaje}%</Text>
                                </View>
                            </View>
                        )}
                    </CollapsibleSection>

                    {/* Sección colapsable: Inventario */}
                    <CollapsibleSection
                        title="Inventario"
                        icon="cube-outline"
                        iconColor="#9C27B0"
                        defaultExpanded={true}
                    >
                        <View style={styles.inventarioRow}>
                            {/* Stock actual */}
                            <View style={styles.inventarioInput}>
                                <FloatingLabelInput
                                    label="Stock actual *"
                                    value={stock}
                                    onChangeText={setStock}
                                    placeholder="0"
                                    keyboardType="number-pad"
                                    // icon={<MaterialCommunityIcons name="package-variant" size={20} color="#636E72" />}
                                />
                                <Text style={styles.helperText}>Unidades disponibles</Text>
                            </View>

                            {/* Stock mínimo */}
                            <View style={styles.inventarioInput}>
                                <FloatingLabelInput
                                    label="Stock mínimo"
                                    value={stockMinimo}
                                    onChangeText={setStockMinimo}
                                    placeholder="3"
                                    keyboardType="number-pad"
                                    // icon={<MaterialCommunityIcons name="alert-outline" size={20} color="#FF9800" />}
                                />
                                <Text style={styles.helperText}>Alerta de reposición</Text>
                            </View>
                        </View>

                        {/* Unidad de medida */}
                        <View style={styles.inputGroup}>
                            <FloatingLabelSelector
                                label="Unidad de medida"
                                value={unidadMedida}
                                onPress={() => setModalUnidadVisible(true)}
                                icon={<MaterialCommunityIcons name="ruler" size={20} color="#9C27B0" />}
                            />
                        </View>

                        {stock && stockMinimo && parseInt(stock) <= parseInt(stockMinimo) && (
                            <View style={styles.alertaStock}>
                                <Ionicons name="warning" size={20} color="#FF9800" />
                                <Text style={styles.alertaStockTexto}>
                                    Te avisaremos cuando el stock esté bajo
                                </Text>
                            </View>
                        )}
                    </CollapsibleSection>

                    {/* Estado del producto y Fecha */}
                    <View style={styles.estadoFechaRow}>
                        <View style={styles.estadoContainer}>
                            <Text style={styles.label}>Estado del producto</Text>
                            <View style={styles.estadoBotones}>
                                <TouchableOpacity
                                    style={[
                                        styles.estadoBoton,
                                        estado === 'Activo' && styles.estadoBotonActivo
                                    ]}
                                    onPress={() => setEstado('Activo')}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons
                                        name="checkmark-circle"
                                        size={20}
                                        color={estado === 'Activo' ? '#4CAF50' : '#95A5A6'}
                                    />
                                    <Text style={[
                                        styles.estadoBotonTexto,
                                        estado === 'Activo' && styles.estadoBotonTextoActivo
                                    ]}>
                                        Activo
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.estadoBoton,
                                        estado === 'Inactivo' && styles.estadoBotonInactivo
                                    ]}
                                    onPress={() => setEstado('Inactivo')}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons
                                        name="close-circle"
                                        size={20}
                                        color={estado === 'Inactivo' ? '#F44336' : '#95A5A6'}
                                    />
                                    <Text style={[
                                        styles.estadoBotonTexto,
                                        estado === 'Inactivo' && styles.estadoBotonTextoInactivo
                                    ]}>
                                        Inactivo
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.fechaContainer}>
                            <Text style={styles.label}>Fecha de registro</Text>
                            <View style={styles.fechaDisplay}>
                                <Ionicons name="calendar-outline" size={20} color="#636E72" />
                                <Text style={styles.fechaTexto}>
                                    {new Date().toLocaleDateString('es-PE', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric'
                                    })}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.espacioFinal} />
                </View>
            </ScrollView>

            {/* Botones de acción */}
            <View style={[styles.footerContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
                <TouchableOpacity
                    style={styles.botonCancelar}
                    onPress={() => navigation.goBack()}
                    activeOpacity={0.7}
                >
                    <Ionicons name="close" size={22} color="#636E72" />
                    <Text style={styles.botonCancelarTexto}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.botonGuardar, loading && styles.botonDisabled]}
                    onPress={handleGuardar}
                    activeOpacity={0.7}
                    disabled={loading}
                >
                    <Ionicons name="checkmark" size={22} color="#FFF" />
                    <Text style={styles.botonGuardarTexto}>Guardar Producto</Text>
                </TouchableOpacity>
            </View>

            {/* Modal de escáner de código de barras */}
            <BarcodeScannerModal
                visible={scannerVisible}
                onClose={() => setScannerVisible(false)}
                onBarcodeScanned={handleBarcodeScanned}
            />

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

            {/* Modal de unidad de medida */}
            <Modal
                visible={modalUnidadVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setModalUnidadVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCategorias}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitulo}>Unidad de Medida</Text>
                            <TouchableOpacity onPress={() => setModalUnidadVisible(false)}>
                                <Ionicons name="close" size={24} color="#636E72" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalContenido} showsVerticalScrollIndicator={false}>
                            {unidadesMedida.map((unidad) => (
                                <TouchableOpacity
                                    key={unidad.id}
                                    style={styles.categoriaItem}
                                    onPress={() => {
                                        setUnidadMedida(unidad.nombre);
                                        setModalUnidadVisible(false);
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.categoriaItemTexto}>{unidad.nombre}</Text>
                                    {unidadMedida === unidad.nombre && (
                                        <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                                    )}
                                </TouchableOpacity>
                            ))}

                            <TouchableOpacity
                                style={styles.categoriaItemAgregar}
                                onPress={() => {
                                    setModalUnidadVisible(false);
                                    setModalAgregarUnidadVisible(true);
                                }}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="add-circle-outline" size={20} color="#29B6F6" />
                                <Text style={styles.categoriaItemAgregarTexto}>Nueva unidad de medida</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Modal para agregar nueva unidad de medida */}
            <Modal
                visible={modalAgregarUnidadVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setModalAgregarUnidadVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalAgregarCategoria}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitulo}>Nueva Unidad de Medida</Text>
                            <TouchableOpacity onPress={() => setModalAgregarUnidadVisible(false)}>
                                <Ionicons name="close" size={24} color="#636E72" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalContenido}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Nombre de la unidad</Text>
                                <TextInput
                                    style={styles.input}
                                    value={nuevaUnidadNombre}
                                    onChangeText={setNuevaUnidadNombre}
                                    placeholder="Ej: Kg, Litro, Docena"
                                    placeholderTextColor="#A0A0A0"
                                />
                            </View>

                            <TouchableOpacity
                                style={styles.botonGuardarCategoria}
                                onPress={agregarNuevaUnidad}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="checkmark" size={20} color="#FFF" />
                                <Text style={styles.botonGuardarCategoriaTexto}>Guardar Unidad</Text>
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

    // Sección de imágenes
    seccionImagenes: {
        marginBottom: 16,
    },
    labelSeccion: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 8,
    },
    imagenPrincipal: {
        width: '100%',
        height: 180,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: colors.border,
        borderStyle: 'dashed',
        marginBottom: 10,
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
        top: 12,
        right: 12,
        backgroundColor: '#FFF',
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    imagenPlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.surfaceVariant,
    },
    imagenPlaceholderTexto: {
        marginTop: 12,
        fontSize: 15,
        fontWeight: '500',
        color: colors.textSecondary,
    },
    imagenPlaceholderSubtexto: {
        fontSize: 13,
        color: colors.textSecondary,
        marginTop: 4,
    },

    // Miniaturas
    miniaturasContainer: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
    },
    miniaturaBox: {
        width: 60,
        height: 60,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: colors.border,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.surfaceVariant,
    },
    miniaturaImagen: {
        width: '100%',
        height: '100%',
        borderRadius: 8,
    },
    agregarMasFotosBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: '#E3F2FD',
        borderRadius: 8,
    },
    agregarMasFotosTexto: {
        fontSize: 12,
        fontWeight: '500',
        color: '#29B6F6',
    },

    // Inputs generales
    inputGroup: {
        marginBottom: 14,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 6,
    },
    input: {
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 11,
        fontSize: 14,
        color: colors.text,
    },
    helperText: {
        fontSize: 11,
        color: colors.textSecondary,
        marginTop: 4,
    },

    // SKU Container
    skuContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
    },
    skuInput: {
        flex: 1,
    },
    generarBtn: {
        padding: 10,
        backgroundColor: '#E3F2FD',
        borderRadius: 8,
        marginTop: 0,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Input con icono (ya no se usa, pero se mantiene por compatibilidad)
    inputWithIcon: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 11,
        gap: 8,
    },
    inputConIcono: {
        flex: 1,
        fontSize: 14,
        color: colors.text,
    },

    // Selector button (ya no se usa, pero se mantiene por compatibilidad)
    selectorButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 11,
    },
    selectorContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    selectorTexto: {
        fontSize: 14,
        color: colors.text,
        fontWeight: '500',
    },
    selectorPlaceholder: {
        fontSize: 14,
        color: '#A0A0A0',
    },

    // Inputs en fila
    rowInputs: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 14,
    },
    halfInput: {
        flex: 1,
    },

    // Info box
    infoBox: {
        flexDirection: 'row',
        backgroundColor: '#E3F2FD',
        borderRadius: 10,
        padding: 10,
        marginBottom: 12,
        gap: 8,
    },
    infoBoxTexto: {
        flex: 1,
        fontSize: 12,
        color: '#1976D2',
        lineHeight: 16,
    },

    // Char counter
    charCounter: {
        fontSize: 11,
        color: colors.textSecondary,
        textAlign: 'right',
        marginTop: 3,
    },

    // Variantes
    variantesRow: {
        flexDirection: 'row',
        gap: 10,
    },
    varianteInput: {
        flex: 1,
    },

    // Precios
    preciosContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
    },
    precioBox: {
        flex: 1,
    },
    monedaSymbol: {
        fontSize: 16,
        fontWeight: '700',
        color: '#636E72',
    },
    helperTextPrecio: {
        fontSize: 10,
        color: colors.textSecondary,
        marginTop: 3,
    },
    arrowIcon: {
        marginTop: 16,
    },

    // Ganancia box
    gananciaBox: {
        flexDirection: 'row',
        backgroundColor: '#E8F5E9',
        borderRadius: 10,
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
        fontSize: 16,
        fontWeight: '700',
        color: '#2E7D32',
    },
    gananciaMargen: {
        fontSize: 16,
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
    inventarioRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 14,
    },
    inventarioInput: {
        flex: 1,
    },
    alertaStock: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF3E0',
        borderRadius: 8,
        padding: 10,
        gap: 8,
        marginTop: 10,
    },
    alertaStockTexto: {
        flex: 1,
        fontSize: 12,
        color: '#E65100',
    },

    // Estado y Fecha
    estadoFechaRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 4,
        marginBottom: 14,
    },
    estadoContainer: {
        flex: 1,
    },
    estadoBotones: {
        flexDirection: 'row',
        gap: 6,
    },
    estadoBoton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        paddingVertical: 10,
        paddingHorizontal: 10,
        backgroundColor: colors.card,
        borderWidth: 1.5,
        borderColor: colors.border,
        borderRadius: 8,
    },
    estadoBotonActivo: {
        backgroundColor: '#E8F5E9',
        borderColor: '#4CAF50',
    },
    estadoBotonInactivo: {
        backgroundColor: '#FFEBEE',
        borderColor: '#F44336',
    },
    estadoBotonTexto: {
        fontSize: 13,
        fontWeight: '600',
        color: '#95A5A6',
    },
    estadoBotonTextoActivo: {
        color: '#4CAF50',
    },
    estadoBotonTextoInactivo: {
        color: '#F44336',
    },
    fechaContainer: {
        flex: 1,
    },
    fechaDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 11,
    },
    fechaTexto: {
        fontSize: 14,
        color: colors.text,
        fontWeight: '500',
    },

    espacioFinal: {
        height: 20,
    },

    // Footer
    footerContainer: {
        flexDirection: 'row',
        padding: 16,
        backgroundColor: colors.card,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        gap: 12,
    },
    botonCancelar: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: colors.card,
        borderWidth: 1.5,
        borderColor: colors.border,
        borderRadius: 12,
        paddingVertical: 14,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    botonCancelarTexto: {
        fontSize: 16,
        fontWeight: '600',
        color: '#636E72',
    },
    botonGuardar: {
        flex: 2,
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
