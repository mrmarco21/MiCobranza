import { useState, useEffect } from 'react';
import {
    View, Text, ScrollView, TextInput,
    TouchableOpacity, StyleSheet, Platform, Image, KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as gastosRepo from '../data/gastosRepository';
import * as categoriasRepo from '../data/categoriasRepository';
import { useTheme } from '../hooks/useTheme';
import Header from '../components/Header';
import Toast from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';

// ─── Paleta de color ──────────────────────────────────────────────────────────
const SKY = {
    50: '#F0F9FF',
    100: '#E0F2FE',
    200: '#BAE6FD',
    400: '#38BDF8',
    500: '#0EA5E9',
    600: '#0284C7',
    700: '#0369A1',
};

const TIPOS_GASTO = [
    { id: 'COMPRA', label: 'Compra de Productos', icon: 'cart', color: '#0EA5E9', isImage: false },
    { id: 'ENVIO_ORIGEN', label: 'Envío desde Origen', icon: require('../../assets/shalom.png'), color: '#6366F1', isImage: true },
    { id: 'INTERMEDIARIO', label: 'Pago a Intermediario', icon: 'person', color: '#F59E0B', isImage: false },
    { id: 'ENVIO_FINAL', label: 'Envío Final', icon: 'car', color: '#10B981', isImage: false },
    { id: 'OTRO', label: 'Otro Gasto', icon: 'ellipsis-horizontal', color: '#94A3B8', isImage: false },
];

const ESTADOS = [
    { id: 'PENDIENTE', label: 'Pendiente', icon: 'time', color: '#F59E0B' },
    { id: 'EN_TRANSITO', label: 'En Tránsito', icon: 'navigate', color: '#6366F1' },
    { id: 'RECIBIDO', label: 'Recibido', icon: 'checkmark-circle', color: '#0EA5E9' },
    { id: 'COMPLETADO', label: 'Completado', icon: 'checkmark-done', color: '#10B981' },
];

export default function AddGastoScreen({ navigation, route }) {
    const { colors } = useTheme();
    const styles = createStyles(colors);
    const insets = useSafeAreaInsets();
    const gastoEditar = route.params?.gasto;
    const esEdicion = !!gastoEditar;

    const [tipo, setTipo] = useState(gastoEditar?.tipo || 'COMPRA');
    const [categoria, setCategoria] = useState(gastoEditar?.categoria || '');
    const [descripcion, setDescripcion] = useState(gastoEditar?.descripcion || '');
    const [monto, setMonto] = useState(gastoEditar?.monto?.toString() || '');
    const [tienda, setTienda] = useState(gastoEditar?.tienda || '');
    const [numeroGuia, setNumeroGuia] = useState(gastoEditar?.numeroGuia || '');
    const [estado, setEstado] = useState(gastoEditar?.estado || 'PENDIENTE');
    const [notas, setNotas] = useState(gastoEditar?.notas || '');
    const [fecha, setFecha] = useState(
        gastoEditar?.fecha ? new Date(gastoEditar.fecha) : new Date()
    );
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTipoDropdown, setShowTipoDropdown] = useState(false);
    const [categorias, setCategorias] = useState([]);
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
    const [modalConfig, setModalConfig] = useState({ visible: false });

    useEffect(() => { cargarCategorias(); }, []);

    const cargarCategorias = async () => {
        const cats = await categoriasRepo.getCategorias();
        setCategorias(cats);
    };

    const showToast = (message, type = 'success') => setToast({ visible: true, message, type });
    const showModal = (config) => setModalConfig({ ...config, visible: true });
    const closeModal = () => setModalConfig(m => ({ ...m, visible: false }));

    const validarFormulario = () => {
        if (!descripcion.trim()) { showToast('Ingresa una descripción', 'error'); return false; }
        if (!monto || parseFloat(monto) <= 0) { showToast('Ingresa un monto válido', 'error'); return false; }
        if (tipo === 'COMPRA' && !categoria) { showToast('Selecciona una categoría', 'error'); return false; }
        return true;
    };

    const handleGuardar = async () => {
        if (!validarFormulario()) return;
        try {
            const datos = {
                tipo, categoria: tipo === 'COMPRA' ? categoria : null,
                descripcion: descripcion.trim(), monto: parseFloat(monto),
                tienda: tienda.trim(), numeroGuia: numeroGuia.trim(),
                estado, notas: notas.trim(), fecha: fecha.toISOString(),
            };
            if (esEdicion) {
                await gastosRepo.update(gastoEditar.id, datos);
                showToast('Gasto actualizado');
            } else {
                await gastosRepo.create(datos);
                showToast('Gasto registrado');
            }
            setTimeout(() => navigation.goBack(), 500);
        } catch (error) {
            showToast('Error al guardar el gasto', 'error');
        }
    };

    const handleEliminar = () => {
        showModal({
            title: 'Eliminar Gasto',
            message: '¿Estás seguro? Esta acción no se puede deshacer.',
            icon: 'trash', iconColor: '#EF4444',
            buttons: [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar', style: 'destructive',
                    onPress: async () => {
                        try {
                            await gastosRepo.remove(gastoEditar.id);
                            showToast('Gasto eliminado');
                            setTimeout(() => navigation.goBack(), 500);
                        } catch { showToast('Error al eliminar', 'error'); }
                    },
                },
            ],
        });
    };

    const onChangeFecha = (event, selectedDate) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selectedDate) setFecha(selectedDate);
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
            <Header
                title={esEdicion ? 'Editar Gasto' : 'Nuevo Gasto'}
                showBack
                rightIcon={esEdicion ? 'trash-outline' : null}
                onRightPress={esEdicion ? handleEliminar : null}
            />

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                <View style={{ height: 20 }} />

                {/* ── Tipo de gasto ────────────────────────────────────── */}
                <View style={styles.section}>
                    <Text style={styles.label}>Tipo de gasto <Text style={styles.required}>*</Text></Text>
                    <View style={styles.dropdownContainer}>
                        <TouchableOpacity
                            style={styles.selectorBtn}
                            onPress={() => setShowTipoDropdown(!showTipoDropdown)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.selectorContent}>
                                <View style={[styles.selectorIconWrap, {
                                    backgroundColor: TIPOS_GASTO.find(t => t.id === tipo)?.color + '15'
                                }]}>
                                    {TIPOS_GASTO.find(t => t.id === tipo)?.isImage ? (
                                        <Image
                                            source={TIPOS_GASTO.find(t => t.id === tipo)?.icon}
                                            style={styles.selectorIconImage}
                                        />
                                    ) : (
                                        <Ionicons
                                            name={TIPOS_GASTO.find(t => t.id === tipo)?.icon}
                                            size={22}
                                            color={TIPOS_GASTO.find(t => t.id === tipo)?.color}
                                        />
                                    )}
                                </View>
                                <Text style={styles.selectorText}>
                                    {TIPOS_GASTO.find(t => t.id === tipo)?.label}
                                </Text>
                            </View>
                            <Ionicons name={showTipoDropdown ? "chevron-up" : "chevron-down"} size={22} color="#94A3B8" />
                        </TouchableOpacity>

                        {showTipoDropdown && (
                            <View style={styles.dropdownMenu}>
                                <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                                    {TIPOS_GASTO.map(t => (
                                        <TouchableOpacity
                                            key={t.id}
                                            style={styles.dropdownItem}
                                            onPress={() => {
                                                setTipo(t.id);
                                                setShowTipoDropdown(false);
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <View style={[styles.dropdownItemIcon, { backgroundColor: t.color + '15' }]}>
                                                {t.isImage ? (
                                                    <Image source={t.icon} style={styles.dropdownItemImage} />
                                                ) : (
                                                    <Ionicons name={t.icon} size={24} color={t.color} />
                                                )}
                                            </View>
                                            <Text style={styles.dropdownItemText}>
                                                {t.label}
                                            </Text>
                                            {tipo === t.id && (
                                                <Ionicons name="checkmark-circle" size={22} color={t.color} />
                                            )}
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        )}
                    </View>
                </View>

                {/* ── Categoría ────────────────────────────────────────── */}
                {tipo === 'COMPRA' && (
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>Categoría del producto</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {categorias.map(cat => {
                                const activa = categoria === cat.id;
                                return (
                                    <TouchableOpacity
                                        key={cat.id}
                                        style={[
                                            styles.catChip,
                                            activa && { borderColor: cat.color, backgroundColor: cat.color + '12' },
                                        ]}
                                        onPress={() => setCategoria(cat.id)}
                                        activeOpacity={0.75}
                                    >
                                        <Ionicons name={cat.icono} size={16}
                                            color={activa ? cat.color : '#94A3B8'} />
                                        <Text style={[styles.catChipText, activa && { color: cat.color }]}>
                                            {cat.nombre}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                )}

                {/* ── Descripción ──────────────────────────────────────── */}
                <View style={styles.section}>
                    <Text style={styles.label}>Descripción <Text style={styles.required}>*</Text></Text>
                    <TextInput
                        style={styles.input}
                        value={descripcion}
                        onChangeText={setDescripcion}
                        placeholder="Ej: Compra de blusas variadas"
                        placeholderTextColor="#94A3B8"
                    />
                </View>

                {/* ── Monto ────────────────────────────────────────────── */}
                <View style={styles.section}>
                    <Text style={styles.label}>Monto <Text style={styles.required}>*</Text></Text>
                    <View style={styles.montoWrap}>
                        <Text style={styles.montoPrefix}>S/</Text>
                        <TextInput
                            style={[styles.input, styles.montoInput]}
                            value={monto}
                            onChangeText={setMonto}
                            placeholder="0.00"
                            placeholderTextColor="#94A3B8"
                            keyboardType="decimal-pad"
                        />
                    </View>
                </View>

                {/* ── Fecha ────────────────────────────────────────────── */}
                <View style={styles.section}>
                    <Text style={styles.label}>Fecha</Text>
                    <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
                        <Ionicons name="calendar-outline" size={20} color={SKY[500]} />
                        <Text style={styles.dateBtnText}>
                            {fecha.toLocaleDateString('es-PE', {
                                day: '2-digit', month: 'long', year: 'numeric',
                            })}
                        </Text>
                        <Ionicons name="chevron-down" size={18} color="#94A3B8" />
                    </TouchableOpacity>
                    {showDatePicker && (
                        <DateTimePicker
                            value={fecha} mode="date" display="default"
                            onChange={onChangeFecha} maximumDate={new Date()}
                        />
                    )}
                </View>

                {/* ── Estado ───────────────────────────────────────────── */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Estado del gasto</Text>
                    <View style={styles.estadosRow}>
                        {ESTADOS.map(e => {
                            const activo = estado === e.id;
                            return (
                                <TouchableOpacity
                                    key={e.id}
                                    style={[
                                        styles.estadoChip,
                                        activo && { borderColor: e.color, backgroundColor: e.color + '12' },
                                    ]}
                                    onPress={() => setEstado(e.id)}
                                    activeOpacity={0.75}
                                >
                                    <Ionicons name={e.icon} size={17}
                                        color={activo ? e.color : '#94A3B8'} />
                                    <Text style={[styles.estadoText, activo && { color: e.color }]}>
                                        {e.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* ── Tienda ───────────────────────────────────────────── */}
                <View style={styles.section}>
                    <Text style={styles.label}>Tienda / Proveedor</Text>
                    <TextInput
                        style={styles.input}
                        value={tienda}
                        onChangeText={setTienda}
                        placeholder="Ej: Tienda Online XYZ"
                        placeholderTextColor="#94A3B8"
                    />
                </View>

                {/* ── Número de guía ───────────────────────────────────── */}
                <View style={styles.section}>
                    <Text style={styles.label}>Nº de Guía / Tracking</Text>
                    <TextInput
                        style={styles.input}
                        value={numeroGuia}
                        onChangeText={setNumeroGuia}
                        placeholder="Ej: 123456789"
                        placeholderTextColor="#94A3B8"
                    />
                </View>

                {/* ── Notas ────────────────────────────────────────────── */}
                <View style={styles.section}>
                    <Text style={styles.label}>Notas adicionales</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        value={notas}
                        onChangeText={setNotas}
                        placeholder="Agrega notas o comentarios…"
                        placeholderTextColor="#94A3B8"
                        multiline
                        numberOfLines={4}
                    />
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* ── Footer ────────────────────────────────────────────────── */}
            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                <TouchableOpacity style={styles.saveBtn} onPress={handleGuardar} activeOpacity={0.85}>
                    <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                    <Text style={styles.saveBtnText}>
                        {esEdicion ? 'Actualizar Gasto' : 'Guardar Gasto'}
                    </Text>
                </TouchableOpacity>
            </View>

            <Toast
                visible={toast.visible} message={toast.message} type={toast.type}
                onHide={() => setToast(t => ({ ...t, visible: false }))}
            />
            <ConfirmModal
                visible={modalConfig.visible} onClose={closeModal}
                title={modalConfig.title} message={modalConfig.message}
                icon={modalConfig.icon} iconColor={modalConfig.iconColor}
                buttons={modalConfig.buttons}
            />
        </KeyboardAvoidingView>
    );
}

const createStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollView: { flex: 1, paddingBottom: 20 },

    section: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },

    sectionLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.textSecondary,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        marginBottom: 12,
    },
    label: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 10,
    },
    required: { color: SKY[500] },

    // ── Input ──────────────────────────────────────────────────────────────────
    input: {
        backgroundColor: colors.card,
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: colors.text,
        borderWidth: 1.5,
        borderColor: colors.border,
    },
    textArea: {
        minHeight: 110,
        paddingTop: 14,
        textAlignVertical: 'top',
    },

    montoWrap: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    montoPrefix: {
        fontSize: 17,
        fontWeight: '700',
        color: SKY[600],
        backgroundColor: SKY[50],
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderWidth: 1.5,
        borderRightWidth: 0,
        borderColor: colors.border,
        borderTopLeftRadius: 14,
        borderBottomLeftRadius: 14,
    },
    montoInput: {
        flex: 1,
        borderTopLeftRadius: 0,
        borderBottomLeftRadius: 0,
    },

    // ── Tipos ──────────────────────────────────────────────────────────────────
    dropdownContainer: {
        position: 'relative',
        zIndex: 1000,
    },
    selectorBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.card,
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderWidth: 1.5,
        borderColor: colors.border,
    },
    selectorContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    selectorIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    selectorIconImage: {
        width: 24,
        height: 24,
        resizeMode: 'contain',
    },
    selectorText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        flex: 1,
    },

    // ── Dropdown ───────────────────────────────────────────────────────────────
    dropdownMenu: {
        position: 'absolute',
        top: 58,
        left: 0,
        right: 0,
        backgroundColor: colors.card,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: colors.border,
        maxHeight: 300,
        zIndex: 2000,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
    },
    dropdownScroll: {
        maxHeight: 300,
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    dropdownItemIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    dropdownItemImage: {
        width: 26,
        height: 26,
        resizeMode: 'contain',
    },
    dropdownItemText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },

    // ── Categorías ─────────────────────────────────────────────────────────────
    catChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 11,
        borderRadius: 22,
        backgroundColor: colors.card,
        borderWidth: 1.5,
        borderColor: colors.border,
        marginRight: 10,
    },
    catChipText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textSecondary,
        marginLeft: 7,
    },

    // ── Fecha ──────────────────────────────────────────────────────────────────
    dateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderWidth: 1.5,
        borderColor: colors.border,
    },
    dateBtnText: {
        flex: 1,
        fontSize: 16,
        color: colors.text,
        fontWeight: '500',
        marginLeft: 10,
    },

    // ── Estados ────────────────────────────────────────────────────────────────
    estadosRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    estadoChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 11,
        borderRadius: 22,
        backgroundColor: colors.card,
        borderWidth: 1.5,
        borderColor: colors.border,
        marginRight: 10,
        marginBottom: 10,
    },
    estadoText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textSecondary,
        marginLeft: 7,
    },

    // ── Footer ─────────────────────────────────────────────────────────────────
    footer: {
        paddingHorizontal: 20,
        paddingTop: 16,
        backgroundColor: colors.card,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 10,
    },
    saveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: SKY[500],
        borderRadius: 16,
        paddingVertical: 16,
        shadowColor: SKY[600],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.30,
        shadowRadius: 12,
        elevation: 6,
    },
    saveBtnText: {
        fontSize: 17,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 0.3,
        marginLeft: 8,
    },
});