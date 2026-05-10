import { useEffect, useRef, useState } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, Modal,
    Animated, ScrollView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../../shared/hooks/useTheme';
import { useNavigation } from '@react-navigation/native';

// ─── Helpers ────────────────────────────────────────────────────────────────

const formatDate = (date) => {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d)) return '';
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

// ─── Sub-componente: DateField ───────────────────────────────────────────────

function DateField({ label, value, onChange, colors, styles }) {
    const [show, setShow] = useState(false);

    const date = value ? new Date(value) : new Date();

    const handleChange = (_, selected) => {
        if (Platform.OS === 'android') setShow(false);
        if (selected) onChange(selected);
    };

    return (
        <View style={styles.dateInputContainer}>
            <Text style={styles.dateLabel}>{label}</Text>
            <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShow(true)}
                activeOpacity={0.7}
            >
                <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                <Text style={[styles.dateButtonText, !value && { color: colors.textSecondary }]}>
                    {value ? formatDate(value) : 'DD/MM/AAAA'}
                </Text>
                {value && (
                    <TouchableOpacity
                        onPress={() => onChange(null)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                )}
            </TouchableOpacity>

            {show && (
                <DateTimePicker
                    value={date}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleChange}
                    maximumDate={new Date()}
                />
            )}

            {/* iOS: modal wrapper para el spinner */}
            {Platform.OS === 'ios' && show && (
                <Modal transparent animationType="slide">
                    <View style={styles.iosPickerOverlay}>
                        <View style={[styles.iosPickerContainer, { backgroundColor: colors.card }]}>
                            <View style={styles.iosPickerHeader}>
                                <TouchableOpacity onPress={() => setShow(false)}>
                                    <Text style={[styles.iosPickerAction, { color: colors.textSecondary }]}>
                                        Cancelar
                                    </Text>
                                </TouchableOpacity>
                                <Text style={[styles.iosPickerTitle, { color: colors.text }]}>{label}</Text>
                                <TouchableOpacity onPress={() => setShow(false)}>
                                    <Text style={[styles.iosPickerAction, { color: colors.primary }]}>
                                        Listo
                                    </Text>
                                </TouchableOpacity>
                            </View>
                            <DateTimePicker
                                value={date}
                                mode="date"
                                display="spinner"
                                onChange={handleChange}
                                maximumDate={new Date()}
                                style={{ width: '100%' }}
                            />
                        </View>
                    </View>
                </Modal>
            )}
        </View>
    );
}

// ─── Sub-componente: DropdownField ───────────────────────────────────────────

function DropdownField({ label, value, options, onSelect, colors, styles: s }) {
    const [open, setOpen] = useState(false);
    const anim = useRef(new Animated.Value(0)).current;

    const toggle = () => {
        const toValue = open ? 0 : 1;
        Animated.spring(anim, { toValue, useNativeDriver: false, tension: 120, friction: 10 }).start();
        setOpen(!open);
    };

    const selected = options.find(o => o.value === value);

    const maxHeight = anim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, options.length * 52],
    });

    const rotate = anim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '180deg'],
    });

    return (
        <View style={s.dropdownWrapper}>
            <TouchableOpacity
                style={[
                    s.dropdownTrigger,
                    open && { borderColor: colors.primary, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }
                ]}
                onPress={toggle}
                activeOpacity={0.8}
            >
                <View style={s.dropdownLeft}>
                    {selected ? (
                        <>
                            <View style={[s.dropdownBadge, { backgroundColor: colors.primary + '20' }]}>
                                <Ionicons name={selected.icon} size={16} color={colors.primary} />
                            </View>
                            <Text style={[s.dropdownValueText, { color: colors.text }]}>
                                {selected.label}
                            </Text>
                        </>
                    ) : (
                        <Text style={[s.dropdownPlaceholder, { color: colors.textSecondary }]}>
                            {label}
                        </Text>
                    )}
                </View>
                <View style={s.dropdownRight}>
                    {selected && (
                        <TouchableOpacity
                            onPress={() => { onSelect(null); setOpen(false); anim.setValue(0); }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            style={{ marginRight: 8 }}
                        >
                            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                        </TouchableOpacity>
                    )}
                    <Animated.View style={{ transform: [{ rotate }] }}>
                        <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                    </Animated.View>
                </View>
            </TouchableOpacity>

            <Animated.View style={[s.dropdownList, { maxHeight, borderColor: open ? colors.primary : colors.border }]}>
                {options.map((opt, idx) => {
                    const isSelected = value === opt.value;
                    const isLast = idx === options.length - 1;
                    return (
                        <TouchableOpacity
                            key={opt.value}
                            style={[
                                s.dropdownItem,
                                isSelected && { backgroundColor: colors.primary + '12' },
                                !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border }
                            ]}
                            onPress={() => { onSelect(isSelected ? null : opt.value); toggle(); }}
                            activeOpacity={0.7}
                        >
                            <View style={s.dropdownItemLeft}>
                                <View style={[
                                    s.dropdownItemIcon,
                                    { backgroundColor: isSelected ? colors.primary + '20' : colors.background }
                                ]}>
                                    <Ionicons
                                        name={opt.icon}
                                        size={16}
                                        color={isSelected ? colors.primary : colors.textSecondary}
                                    />
                                </View>
                                <Text style={[
                                    s.dropdownItemText,
                                    { color: isSelected ? colors.primary : colors.text, fontWeight: isSelected ? '600' : '400' }
                                ]}>
                                    {opt.label}
                                </Text>
                            </View>
                            {isSelected && (
                                <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                            )}
                        </TouchableOpacity>
                    );
                })}
            </Animated.View>
        </View>
    );
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function FiltrosVentasModal({
    visible,
    onClose,
    onApply,
    currentFilters,
    clienteSeleccionadoExterno = null, // { id, nombre } pasado desde la pantalla de clientes
    navigation: navigationProp,
}) {
    const { colors } = useTheme();
    const styles = createStyles(colors);
    const navigation = navigationProp || useNavigation();

    const slideAnim = useRef(new Animated.Value(300)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const [modalVisible, setModalVisible] = useState(false);

    const [fechaInicio, setFechaInicio] = useState(currentFilters?.fechaInicio || new Date());
    const [fechaFin, setFechaFin] = useState(currentFilters?.fechaFin || new Date());
    const [clienteSeleccionado, setClienteSeleccionado] = useState(
        currentFilters?.clienteId ? { id: currentFilters.clienteId, nombre: currentFilters.clienteNombre || 'Cliente' } : null
    );
    const [estadoPago, setEstadoPago] = useState(currentFilters?.estadoPago || null);
    const [tipoPago, setTipoPago] = useState(currentFilters?.tipoPago || null);

    // Recibir cliente seleccionado desde pantalla externa
    useEffect(() => {
        if (clienteSeleccionadoExterno) {
            setClienteSeleccionado(clienteSeleccionadoExterno);
        }
    }, [clienteSeleccionadoExterno]);

    useEffect(() => {
        if (visible) {
            // Validar y establecer fechas (deben ser objetos Date válidos o null)
            const validFechaInicio = currentFilters?.fechaInicio instanceof Date && !isNaN(currentFilters.fechaInicio)
                ? currentFilters.fechaInicio
                : new Date(); // Por defecto: hoy
            const validFechaFin = currentFilters?.fechaFin instanceof Date && !isNaN(currentFilters.fechaFin)
                ? currentFilters.fechaFin
                : new Date(); // Por defecto: hoy

            setFechaInicio(validFechaInicio);
            setFechaFin(validFechaFin);

            // Establecer cliente (priorizar el externo si existe)
            if (clienteSeleccionadoExterno) {
                setClienteSeleccionado(clienteSeleccionadoExterno);
            } else {
                setClienteSeleccionado(
                    currentFilters?.clienteId
                        ? { id: currentFilters.clienteId, nombre: currentFilters.clienteNombre || 'Cliente' }
                        : null
                );
            }

            setEstadoPago(currentFilters?.estadoPago || null);
            setTipoPago(currentFilters?.tipoPago || null);

            setModalVisible(true);
            Animated.parallel([
                Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
                Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, { toValue: 300, duration: 200, useNativeDriver: true }),
                Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
            ]).start(() => setModalVisible(false));
        }
    }, [visible, currentFilters, clienteSeleccionadoExterno]);

    const handleLimpiar = () => {
        setFechaInicio(new Date()); // Volver a la fecha de hoy
        setFechaFin(new Date()); // Volver a la fecha de hoy
        setClienteSeleccionado(null);
        setEstadoPago(null);
        setTipoPago(null);
    };

    const handleAplicar = () => {
        onApply({
            fechaInicio,
            fechaFin,
            clienteId: clienteSeleccionado?.id || null,
            clienteNombre: clienteSeleccionado?.nombre || null,
            estadoPago,
            tipoPago,
        });
        onClose();
    };

    const contarFiltrosActivos = () => {
        let c = 0;
        if (fechaInicio) c++;
        if (fechaFin) c++;
        if (clienteSeleccionado) c++;
        if (estadoPago) c++;
        if (tipoPago) c++;
        return c;
    };

    const filtrosActivos = contarFiltrosActivos();

    const estadosPago = [
        { value: 'PAGADO', label: 'Pagado', icon: 'checkmark-circle-outline' },
        { value: 'PARCIAL', label: 'Parcial', icon: 'alert-circle-outline' },
        { value: 'PENDIENTE', label: 'Pendiente', icon: 'time-outline' },
    ];

    const tiposPago = [
        { value: 'EFECTIVO', label: 'Efectivo', icon: 'cash-outline' },
        { value: 'YAPE', label: 'Yape', icon: 'phone-portrait-outline' },
        { value: 'DEPOSITO', label: 'Depósito', icon: 'card-outline' },
        { value: 'MIXTO', label: 'Mixto', icon: 'swap-horizontal-outline' },
        { value: 'CREDITO', label: 'Crédito', icon: 'time-outline' },
    ];

    return (
        <Modal visible={modalVisible} transparent animationType="none" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <TouchableOpacity style={styles.overlayTouchable} activeOpacity={1} onPress={onClose} />

                <Animated.View style={[styles.modalContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            <Text style={styles.headerTitle}>Filtros</Text>
                            {filtrosActivos > 0 && (
                                <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                                    <Text style={styles.badgeText}>{filtrosActivos}</Text>
                                </View>
                            )}
                        </View>
                        <TouchableOpacity
                            style={styles.closeBtn}
                            onPress={onClose}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="close" size={20} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    {/* Drag handle */}
                    <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />

                    {/* Content */}
                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

                        {/* ── Rango de fechas ── */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <View style={[styles.sectionIcon, { backgroundColor: colors.primary + '18' }]}>
                                    <Ionicons name="calendar" size={15} color={colors.primary} />
                                </View>
                                <Text style={styles.sectionTitle}>Rango de fechas</Text>
                            </View>

                            <View style={styles.dateRow}>
                                <DateField
                                    label="Desde"
                                    value={fechaInicio}
                                    onChange={setFechaInicio}
                                    colors={colors}
                                    styles={styles}
                                />
                                <View style={[styles.dateSeparator, { backgroundColor: colors.border }]} />
                                <DateField
                                    label="Hasta"
                                    value={fechaFin}
                                    onChange={setFechaFin}
                                    colors={colors}
                                    styles={styles}
                                />
                            </View>
                        </View>

                        {/* ── Cliente ── */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <View style={[styles.sectionIcon, { backgroundColor: colors.primary + '18' }]}>
                                    <Ionicons name="person" size={15} color={colors.primary} />
                                </View>
                                <Text style={styles.sectionTitle}>Cliente</Text>
                            </View>

                            <TouchableOpacity
                                style={[
                                    styles.clienteButton,
                                    clienteSeleccionado && { borderColor: colors.primary }
                                ]}
                                onPress={() => {
                                    onClose(); // Cerrar el modal primero
                                    setTimeout(() => {
                                        navigation.navigate('clientas', {
                                            modoSeleccion: true,
                                            returnScreen: 'ListaVentas', // Indicar a dónde volver
                                        });
                                    }, 300); // Esperar a que termine la animación del modal
                                }}
                                activeOpacity={0.8}
                            >
                                <View style={styles.clienteLeft}>
                                    <View style={[
                                        styles.clienteAvatar,
                                        { backgroundColor: clienteSeleccionado ? colors.primary + '20' : colors.background }
                                    ]}>
                                        <Ionicons
                                            name={clienteSeleccionado ? 'person' : 'person-add-outline'}
                                            size={18}
                                            color={clienteSeleccionado ? colors.primary : colors.textSecondary}
                                        />
                                    </View>
                                    <View>
                                        {clienteSeleccionado ? (
                                            <>
                                                <Text style={[styles.clienteSelectedLabel, { color: colors.textSecondary }]}>
                                                    Cliente seleccionado
                                                </Text>
                                                <Text style={[styles.clienteNombre, { color: colors.text }]}>
                                                    {clienteSeleccionado.nombre}
                                                </Text>
                                            </>
                                        ) : (
                                            <Text style={[styles.clientePlaceholder, { color: colors.textSecondary }]}>
                                                Seleccionar cliente
                                            </Text>
                                        )}
                                    </View>
                                </View>

                                <View style={styles.clienteRight}>
                                    {clienteSeleccionado && (
                                        <TouchableOpacity
                                            onPress={() => setClienteSeleccionado(null)}
                                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                            style={{ marginRight: 8 }}
                                        >
                                            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                                        </TouchableOpacity>
                                    )}
                                    <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                                </View>
                            </TouchableOpacity>
                        </View>

                        {/* ── Estado de pago ── */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <View style={[styles.sectionIcon, { backgroundColor: colors.primary + '18' }]}>
                                    <Ionicons name="checkmark-circle" size={15} color={colors.primary} />
                                </View>
                                <Text style={styles.sectionTitle}>Estado de pago</Text>
                            </View>

                            <DropdownField
                                label="Seleccionar estado"
                                value={estadoPago}
                                options={estadosPago}
                                onSelect={setEstadoPago}
                                colors={colors}
                                styles={styles}
                            />
                        </View>

                        {/* ── Tipo de pago ── */}
                        <View style={[styles.section, { borderBottomWidth: 0 }]}>
                            <View style={styles.sectionHeader}>
                                <View style={[styles.sectionIcon, { backgroundColor: colors.primary + '18' }]}>
                                    <Ionicons name="wallet" size={15} color={colors.primary} />
                                </View>
                                <Text style={styles.sectionTitle}>Tipo de pago</Text>
                            </View>

                            <DropdownField
                                label="Seleccionar tipo"
                                value={tipoPago}
                                options={tiposPago}
                                onSelect={setTipoPago}
                                colors={colors}
                                styles={styles}
                            />
                        </View>

                        <View style={{ height: 16 }} />
                    </ScrollView>

                    {/* Footer */}
                    <View style={[styles.footer, { borderTopColor: colors.border }]}>
                        <TouchableOpacity
                            style={[styles.button, styles.buttonSecondary, { backgroundColor: colors.background, borderColor: colors.border }]}
                            onPress={handleLimpiar}
                            activeOpacity={0.7}
                            disabled={filtrosActivos === 0}
                        >
                            <Ionicons name="refresh-outline" size={16} color={filtrosActivos === 0 ? colors.textSecondary : colors.text} style={{ marginRight: 6 }} />
                            <Text style={[styles.buttonSecondaryText, { color: filtrosActivos === 0 ? colors.textSecondary : colors.text }]}>
                                Limpiar {filtrosActivos > 0 ? `(${filtrosActivos})` : ''}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, styles.buttonPrimary, { backgroundColor: colors.primary }]}
                            onPress={handleAplicar}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="options-outline" size={16} color="#FFF" style={{ marginRight: 6 }} />
                            <Text style={styles.buttonPrimaryText}>Aplicar filtros</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const createStyles = (colors) => StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.55)',
        justifyContent: 'flex-end',
    },
    overlayTouchable: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
    },
    modalContainer: {
        backgroundColor: colors.card,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: '90%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.18,
        shadowRadius: 16,
        elevation: 12,
        flexDirection: 'column',
    },
    dragHandle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 4,
        marginTop: -8,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 12,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
        letterSpacing: -0.3,
    },
    badge: {
        minWidth: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFF',
    },
    closeBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
        minHeight: 0,
    },
    section: {
        paddingHorizontal: 20,
        paddingVertical: 18,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 14,
    },
    sectionIcon: {
        width: 28,
        height: 28,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },

    // ── Dates ──
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 0,
    },
    dateInputContainer: {
        flex: 1,
    },
    dateLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        marginBottom: 6,
        fontWeight: '500',
    },
    dateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.background,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 11,
        borderWidth: 1,
        borderColor: colors.border,
    },
    dateButtonText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
        color: colors.text,
    },
    dateSeparator: {
        width: 1,
        height: 40,
        marginHorizontal: 12,
        marginTop: 18,
        opacity: 0.4,
    },

    // ── iOS Picker ──
    iosPickerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    iosPickerContainer: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 30,
    },
    iosPickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(150,150,150,0.2)',
    },
    iosPickerTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    iosPickerAction: {
        fontSize: 16,
        fontWeight: '500',
    },

    // ── Cliente ──
    clienteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.background,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderWidth: 1.5,
        borderColor: colors.border,
    },
    clienteLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    clienteRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    clienteAvatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
        justifyContent: 'center',
        alignItems: 'center',
    },
    clienteSelectedLabel: {
        fontSize: 11,
        fontWeight: '500',
        marginBottom: 2,
    },
    clienteNombre: {
        fontSize: 15,
        fontWeight: '600',
    },
    clientePlaceholder: {
        fontSize: 15,
        fontWeight: '400',
    },

    // ── Dropdown ──
    dropdownWrapper: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    dropdownTrigger: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.background,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: colors.border,
        paddingHorizontal: 14,
        paddingVertical: 12,
        zIndex: 1,
    },
    dropdownLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    dropdownRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dropdownBadge: {
        width: 30,
        height: 30,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dropdownValueText: {
        fontSize: 15,
        fontWeight: '600',
    },
    dropdownPlaceholder: {
        fontSize: 15,
        fontWeight: '400',
    },
    dropdownList: {
        backgroundColor: colors.card,
        borderLeftWidth: 1.5,
        borderRightWidth: 1.5,
        borderBottomWidth: 1.5,
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
        overflow: 'hidden',
        marginTop: -2,
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingVertical: 14,
    },
    dropdownItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    dropdownItemIcon: {
        width: 30,
        height: 30,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dropdownItemText: {
        fontSize: 15,
    },

    // ── Footer ──
    footer: {
        flexDirection: 'row',
        gap: 10,
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    button: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
    buttonSecondary: {
        borderWidth: 1.5,
    },
    buttonSecondaryText: {
        fontSize: 15,
        fontWeight: '600',
    },
    buttonPrimary: {},
    buttonPrimaryText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFF',
    },
});