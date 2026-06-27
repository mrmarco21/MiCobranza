import { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Animated, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../hooks/useTheme';

const STORE_NAME_KEY = 'store_name';
const STORE_LOGO_KEY = 'store_logo';

export default function MenuModal({ visible, onClose, navigation }) {
    const { colors } = useTheme();
    const styles = createStyles(colors);
    const insets = useSafeAreaInsets();
    const slideAnim = useRef(new Animated.Value(-300)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const [modalVisible, setModalVisible] = useState(false);
    const [storeName, setStoreName] = useState('Mi Negocio');
    const [storeLogo, setStoreLogo] = useState(null);

    useEffect(() => {
        loadStoreConfig();
    }, []);

    useEffect(() => {
        if (visible) {
            loadStoreConfig();
            setModalVisible(true);
            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 70,
                    friction: 12,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 280,
                    useNativeDriver: true,
                })
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: -300,
                    duration: 240,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 240,
                    useNativeDriver: true,
                })
            ]).start(() => setModalVisible(false));
        }
    }, [visible]);

    const loadStoreConfig = async () => {
        try {
            const name = await AsyncStorage.getItem(STORE_NAME_KEY);
            const logo = await AsyncStorage.getItem(STORE_LOGO_KEY);
            if (name) setStoreName(name);
            if (logo) setStoreLogo(logo);
        } catch { }
    };

    // Agrupados en secciones
    const sections = [
        {
            label: 'Principal',
            items: [
                { label: 'Inicio', icon: 'home-outline', screen: 'Inicio' },
                { label: 'Cuentas Pendientes', icon: 'wallet-outline', screen: 'CuentasPendientes' },
                { label: 'Todos los clientes', icon: 'people-outline', screen: 'clientas' },
                { label: 'Deudas Canceladas', icon: 'checkmark-done-outline', screen: 'CuentasCanceladas' },
            ]
        },
        {
            label: 'Reportes',
            items: [
                { label: 'Movimientos del Día', icon: 'swap-vertical-outline', screen: 'MovimientosDiarios' },
                { label: 'Resumen de Cobros', icon: 'stats-chart-outline', screen: 'Resumen' },
                { label: 'Productos Vendidos', icon: 'pricetags-outline', screen: 'ProductosVendidos' },
                { label: 'Informes', icon: 'bar-chart-outline', screen: 'Informes' },
            ]
        },
        {
            label: 'Herramientas',
            items: [
                { label: 'Gestión de Gastos', icon: 'receipt-outline', screen: 'Gastos' },
                { label: 'Configuración', icon: 'settings-outline', screen: 'Configuracion' },
            ]
        }
    ];

    const handleNavigate = (screen, params) => {
        Animated.parallel([
            Animated.timing(slideAnim, { toValue: -300, duration: 220, useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 0, duration: 220, useNativeDriver: true })
        ]).start(() => setModalVisible(false));
        onClose();
        navigation.navigate(screen, params);
    };

    return (
        <Modal
            visible={modalVisible}
            transparent
            animationType="none"
            onRequestClose={onClose}
        >
            <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
                <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />

                <Animated.View
                    style={[
                        styles.drawer,
                        { paddingTop: insets.top + 8 },
                        { transform: [{ translateX: slideAnim }] }
                    ]}
                >
                    {/* ── Perfil ──────────────────────────────────── */}
                    <View style={styles.perfil}>
                        <View style={styles.perfilAvatar}>
                            {storeLogo ? (
                                <Image source={{ uri: storeLogo }} style={styles.perfilAvatarImg} />
                            ) : (
                                <Image source={require('../../assets/icon_app.jpg')} style={styles.perfilAvatarImg} />
                            )}
                        </View>
                        <View style={styles.perfilTextos}>
                            <Text style={styles.perfilNombre} numberOfLines={1}>{storeName}</Text>
                            <Text style={styles.perfilSub}>TODO AL DÍA</Text>
                        </View>
                        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                            <Ionicons name="close" size={22} color={colors.textTertiary} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.divider} />

                    {/* ── Secciones ───────────────────────────────── */}
                    <ScrollView
                        style={styles.scroll}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 16 }}
                    >
                        {sections.map((sec, sIdx) => (
                            <View key={sIdx} style={styles.section}>
                                <Text style={styles.sectionLabel}>{sec.label.toUpperCase()}</Text>
                                {sec.items.map((item, iIdx) => (
                                    <TouchableOpacity
                                        key={iIdx}
                                        style={styles.item}
                                        onPress={() => handleNavigate(item.screen, item.params)}
                                        activeOpacity={0.6}
                                    >
                                        <Ionicons name={item.icon} size={19} color={colors.textSecondary} />
                                        <Text style={styles.itemLabel}>{item.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        ))}
                    </ScrollView>

                    {/* ── Footer ──────────────────────────────────── */}
                    <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + 12, 16) }]}>
                        <Text style={styles.footerTexto}>v1.2.0 · Mi Cobranza</Text>
                    </View>
                </Animated.View>
            </Animated.View>
        </Modal>
    );
}

const createStyles = (colors) => StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    drawer: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 285,
        backgroundColor: colors.card,
        shadowColor: '#000',
        shadowOffset: { width: 3, height: 0 },
        shadowOpacity: 0.18,
        shadowRadius: 12,
        elevation: 10,
    },

    // Perfil
    perfil: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 14,
        gap: 12,
    },
    perfilAvatar: {
        width: 44,
        height: 44,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: colors.primaryLight,
        flexShrink: 0,
    },
    perfilAvatarImg: {
        width: '100%',
        height: '100%',
    },
    perfilTextos: {
        flex: 1,
    },
    perfilNombre: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 2,
    },
    perfilSub: {
        fontSize: 12,
        color: colors.textTertiary,
        fontWeight: '500',
    },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: colors.surfaceVariant,
        justifyContent: 'center',
        alignItems: 'center',
    },

    divider: {
        height: 1,
        backgroundColor: colors.border,
        marginHorizontal: 20,
        marginBottom: 8,
    },

    scroll: {
        flex: 1,
    },

    // Secciones
    section: {
        paddingHorizontal: 14,
        marginBottom: 4,
    },
    sectionLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.textTertiary,
        letterSpacing: 1,
        marginTop: 14,
        marginBottom: 4,
        paddingHorizontal: 8,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingVertical: 11,
        paddingHorizontal: 10,
        borderRadius: 10,
    },
    itemLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.text,
    },

    // Footer
    footer: {
        paddingHorizontal: 20,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        alignItems: 'center',
    },
    footerTexto: {
        fontSize: 11,
        color: colors.textTertiary,
        fontWeight: '500',
    },
});
