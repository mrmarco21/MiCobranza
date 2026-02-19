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
    const slideAnim = useRef(new Animated.Value(-280)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const [modalVisible, setModalVisible] = useState(false);
    const [storeName, setStoreName] = useState('Mi Negocio');
    const [storeLogo, setStoreLogo] = useState(null);

    useEffect(() => {
        loadStoreConfig();
    }, []);

    useEffect(() => {
        if (visible) {
            loadStoreConfig(); // Recargar al abrir el modal
            setModalVisible(true);
            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 65,
                    friction: 11,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                })
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: -280,
                    duration: 250,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 250,
                    useNativeDriver: true,
                })
            ]).start(() => {
                setModalVisible(false);
            });
        }
    }, [visible]);

    const loadStoreConfig = async () => {
        try {
            const name = await AsyncStorage.getItem(STORE_NAME_KEY);
            const logo = await AsyncStorage.getItem(STORE_LOGO_KEY);

            if (name) setStoreName(name);
            if (logo) setStoreLogo(logo);
        } catch (error) {
            console.error('Error loading store config:', error);
        }
    };

    const menuItems = [
        {
            label: 'Inicio',
            icon: 'home-outline',
            screen: 'Inicio',
            description: 'Pantalla principal'
        },
        {
            label: 'Cuentas Pendientes',
            icon: 'wallet-outline',
            screen: 'CuentasPendientes',
            description: 'Ver deudas activas'
        },
        {
            label: 'Gestionar clientas',
            icon: 'people-outline',
            screen: 'clientas',
            description: 'Administrar clientas'
        },
        {
            label: 'Deudas Canceladas',
            icon: 'checkmark-done-outline',
            screen: 'CuentasCanceladas',
            description: 'Historial de pagos'
        },
        {
            label: 'Gestión de Gastos',
            icon: 'receipt-outline',
            screen: 'Gastos',
            description: 'Control de inversiones'
        },
        {
            label: 'Resumen',
            icon: 'stats-chart-outline',
            screen: 'Resumen',
            description: 'Estadísticas generales'
        },
        {
            label: 'Informes',
            icon: 'bar-chart-outline',
            screen: 'Informes',
            description: 'Reportes y gráficos'
        },
        {
            label: 'Productos Vendidos',
            icon: 'cart-outline',
            screen: 'ProductosVendidos',
            description: 'Historial de ventas'
        },
        {
            label: 'Configuración',
            icon: 'settings-outline',
            screen: 'Configuracion',
            description: 'Ajustes de la app'
        },
    ];

    const handleNavigate = (screen) => {
        // Iniciar la animación de cierre más lenta
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: -280,
                duration: 400,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 400,
                useNativeDriver: true,
            })
        ]).start(() => {
            setModalVisible(false);
        });

        // Navegar inmediatamente mientras se cierra el modal
        onClose();
        navigation.navigate(screen);
    };

    return (
        <Modal
            visible={modalVisible}
            transparent
            animationType="none"
            onRequestClose={onClose}
        >
            <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
                <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    activeOpacity={1}
                    onPress={onClose}
                />
                <Animated.View
                    style={[
                        styles.menuContainer,
                        { paddingTop: insets.top },
                        { transform: [{ translateX: slideAnim }] }
                    ]}
                >
                    {/* Header del menú */}
                    <View style={styles.header}>
                        <View style={styles.headerIcon}>
                            {storeLogo ? (
                                <Image source={{ uri: storeLogo }} style={styles.logoImage} />
                            ) : (
                                <Image
                                    source={require('../../assets/icon_app.jpg')}
                                    style={styles.logoImage}
                                />
                            )}
                        </View>
                        <Text style={styles.headerTitle}>{storeName}</Text>
                        <Text style={styles.headerSubtitle}>Todo al día.</Text>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={onClose}
                        >
                            <Ionicons name="close" size={28} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {/* Menú items */}
                    <ScrollView style={styles.scrollView}>
                        {menuItems.map((item, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.menuItem}
                                onPress={() => handleNavigate(item.screen)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.menuIconContainer}>
                                    <Ionicons name={item.icon} size={22} color={colors.primary} />
                                </View>
                                <View style={styles.menuTextContainer}>
                                    <Text style={styles.menuLabel}>{item.label}</Text>
                                    <Text style={styles.menuDescription}>{item.description}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Footer */}
                    <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
                        <Text style={styles.footerText}>Versión 0.0.3</Text>
                    </View>
                </Animated.View>
            </Animated.View>
        </Modal>
    );
}

const createStyles = (colors) => StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-start',
    },
    menuContainer: {
        width: 280,
        height: '100%',
        backgroundColor: colors.card,
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 0 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 5,
    },
    header: {
        padding: 24,
        backgroundColor: colors.surfaceVariant,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        alignItems: 'center',
    },
    closeButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerIcon: {
        width: 66,
        height: 66,
        borderRadius: 32,
        backgroundColor: colors.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        overflow: 'hidden',
    },
    logoImage: {
        width: '90%',
        height: '90%',
        borderRadius: 32,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 13,
        color: colors.textSecondary,
    },
    scrollView: {
        flex: 1,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    menuIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: colors.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    menuTextContainer: {
        flex: 1,
    },
    menuLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 2,
    },
    menuDescription: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 12,
        color: colors.textSecondary,
    },
});
