import { useState, useCallback, useRef, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Text, StyleSheet, BackHandler } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { obtenerclientasConSaldo } from '../../services/clientasService';
import { formatCurrency } from '../../shared/utils/helpers';
import { useTheme } from '../../shared/hooks/useTheme';
import Header from '../../shared/components/Header';
import Toast from '../../shared/components/Toast';
import ExportReminderModal from '../../shared/components/ExportReminderModal';
import {
    debeMostrarRecordatorioExportacion,
    marcarRecordatorioExportacionMostrado
} from '../../shared/utils/autoBackupService';
import AsyncStorage from '@react-native-async-storage/async-storage'; // ❌ falta este import

const STORE_NAME_KEY = 'store_name';

export default function InicioScreen({ navigation, visible, onClose }) {
    const { colors } = useTheme();
    const styles = createStyles(colors);
    const insets = useSafeAreaInsets();
    const [estadisticas, setEstadisticas] = useState({
        clientasActivas: 0,
        totalPorCobrar: 0,
        cuentasPendientes: 0,
    });
    const [toastVisible, setToastVisible] = useState(false);
    const backPressCount = useRef(0);
    const [showExportReminder, setShowExportReminder] = useState(false);
    const [storeName, setStoreName] = useState('');

    useFocusEffect(
        useCallback(() => {
            loadStoreConfig();
        }, [])
    );

    const showToast = () => {
        setToastVisible(true);
    };

    // Verificar recordatorio de exportación
    useEffect(() => {
        const timer = setTimeout(async () => {
            const shouldShow = await debeMostrarRecordatorioExportacion();
            if (shouldShow) {
                setShowExportReminder(true);
                await marcarRecordatorioExportacionMostrado();
            }
        }, 5000);

        return () => clearTimeout(timer);
    }, []);

    const handleExportFromReminder = () => {
        navigation.navigate('Configuracion');
    };

    const loadStoreConfig = async () => {
        try {
            const name = await AsyncStorage.getItem(STORE_NAME_KEY);
            if (name) setStoreName(name);
        } catch (error) {
            console.error('Error loading store config:', error);
        }
    };

    // Manejar el botón de retroceso
    useFocusEffect(
        useCallback(() => {
            const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
                if (backPressCount.current === 0) {
                    backPressCount.current = 1;
                    showToast();

                    setTimeout(() => {
                        backPressCount.current = 0;
                    }, 2000);

                    return true;
                } else {
                    BackHandler.exitApp();
                    return false;
                }
            });

            return () => backHandler.remove();
        }, [])
    );

    useFocusEffect(
        useCallback(() => {
            cargarEstadisticas();
        }, [])
    );

    const cargarEstadisticas = async () => {
        const data = await obtenerclientasConSaldo();
        const conDeuda = data.filter(c => c.tieneCuentaActiva && c.saldoActual > 0);
        const totalPorCobrar = conDeuda.reduce((sum, c) => sum + c.saldoActual, 0);

        setEstadisticas({
            clientasActivas: conDeuda.length,
            totalPorCobrar: totalPorCobrar,
            cuentasPendientes: conDeuda.length,
        });
    };

    const menuOptions = [
        {
            title: 'Punto de Venta',
            subtitle: 'Registrar nueva venta',
            icon: 'cart-outline',
            color: '#4CAF50',
            bgColor: '#E8F5E9',
            screen: 'PuntoVenta'
        },
        {
            title: 'Inventario',
            subtitle: 'Productos y stock',
            icon: 'cube-outline',
            color: '#9C27B0',
            bgColor: '#F3E5F5',
            screen: 'Inventario',
            showAddButton: true
        },
        {
            title: 'Cuentas Pendientes',
            subtitle: `${estadisticas.cuentasPendientes} cuentas activas`,
            icon: 'wallet-outline',
            color: '#FF6B6B',
            bgColor: '#FFE5E5',
            screen: 'CuentasPendientes',
            badge: estadisticas.cuentasPendientes > 0 ? estadisticas.cuentasPendientes : null
        },
        {
            title: 'Lista de Ventas',
            subtitle: 'Ver ventas del día',
            icon: 'receipt-outline',
            color: '#30acefff',
            bgColor: '#E1F5FE',
            screen: 'ListaVentas'
        },
        {
            title: 'Resumen',
            subtitle: 'Estadísticas y reportes',
            icon: 'stats-chart-outline',
            color: '#FFA726',
            bgColor: '#FFF3E0',
            screen: 'Resumen'
        },
        {
            title: 'Respaldo de Datos',
            subtitle: 'Protege tu información',
            icon: 'cloud-upload-outline',
            color: '#45beffff',
            bgColor: '#E1F5FE',
            screen: 'Configuracion',
            isBackup: true
        },
    ];

    const handleBackupPress = () => {
        navigation.navigate('Configuracion');
    };

    return (
        <View style={styles.container}>
            <Header
                title={storeName}
                showMenu={true}
                // leftIcon="cloud-upload-outline"
                onLeftPress={handleBackupPress}
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Estadísticas principales */}
                <View style={styles.statsSection}>
                    <View style={styles.statsGrid}>
                        {/* Card de Total por Cobrar */}
                        <View style={styles.statCardPrimary}>
                            <View style={styles.statCardHeader}>
                                <View style={styles.statIconPrimary}>
                                    <Ionicons name="cash-outline" size={20} color="#FFFFFF" />
                                </View>
                                <View style={styles.statBadge}>
                                    <Ionicons name="trending-up" size={14} color="#FFFFFF" />
                                    <Text style={styles.statBadgeText}>Pendiente</Text>
                                </View>
                            </View>
                            <View style={styles.statPrimaryContent}>
                                <Text style={styles.statPrimaryLabel}>TOTAL POR COBRAR</Text>
                                <Text style={styles.statPrimaryValue}>
                                    {formatCurrency(estadisticas.totalPorCobrar)}
                                </Text>
                            </View>
                            <View style={styles.statPrimaryFooter}>
                                <View style={styles.statPrimaryFooterItem}>
                                    <Ionicons name="people" size={16} color="rgba(255,255,255,0.85)" />
                                    <Text style={styles.statPrimaryFooterText}>
                                        {estadisticas.clientasActivas} {estadisticas.clientasActivas === 1 ? 'cliente' : 'clientes'}
                                    </Text>
                                </View>
                                <View style={styles.statPrimaryDivider} />
                                <View style={styles.statPrimaryFooterItem}>
                                    <Ionicons name="wallet" size={16} color="rgba(255,255,255,0.85)" />
                                    <Text style={styles.statPrimaryFooterText}>
                                        {estadisticas.cuentasPendientes} {estadisticas.cuentasPendientes === 1 ? 'cuenta' : 'cuentas'}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Sección de accesos rápidos */}
                <View style={styles.quickAccessSection}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionHeaderLeft}>
                            <Ionicons name="apps-outline" size={20} color={colors.text} />
                            <Text style={styles.sectionTitle}>Accesos Rápidos</Text>
                        </View>
                    </View>

                    <View style={styles.menuGrid}>
                        {menuOptions.map((option, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[
                                    styles.menuCard,
                                    option.isBackup && styles.menuCardBackup
                                ]}
                                onPress={() => navigation.navigate(option.screen, option.params)}
                                activeOpacity={0.7}
                            >
                                {option.badge && (
                                    <View style={[styles.menuBadge, { backgroundColor: option.color }]}>
                                        <Text style={styles.menuBadgeText}>{option.badge}</Text>
                                    </View>
                                )}
                                {option.isBackup && (
                                    <View style={styles.backupIndicator}>
                                        <Ionicons name="shield-checkmark" size={14} color="#4CAF50" />
                                    </View>
                                )}
                                {option.showAddButton && (
                                    <TouchableOpacity
                                        style={styles.addButton}
                                        onPress={(e) => {
                                            e.stopPropagation();
                                            navigation.navigate('AddProducto');
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.addButtonText}>Agregar</Text>
                                    </TouchableOpacity>
                                )}
                                <View style={[styles.menuIconContainer, { backgroundColor: option.bgColor }]}>
                                    <Ionicons name={option.icon} size={28} color={option.color} />
                                </View>
                                <View style={styles.menuContent}>
                                    <Text style={styles.menuTitle} numberOfLines={2}>
                                        {option.title}
                                    </Text>
                                    <Text style={styles.menuSubtitle} numberOfLines={2}>
                                        {option.subtitle}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Footer con información adicional */}
                <View style={styles.footerInfo}>
                    <View style={styles.footerIconContainer}>
                        <Ionicons name="shield-checkmark-outline" size={20} color="#66BB6A" />
                    </View>
                    <View style={styles.footerTextContainer}>
                        <Text style={styles.footerTitle}>Sistema seguro y confiable</Text>
                        <Text style={styles.footerSubtitle}>
                            Toda tu información está protegida localmente
                        </Text>
                    </View>
                </View>

                <View style={styles.bottomPadding} />
            </ScrollView>

            <Toast
                visible={toastVisible}
                message="Presiona nuevamente para salir"
                type="info"
                onHide={() => setToastVisible(false)}
            />

            <ExportReminderModal
                visible={showExportReminder}
                onClose={() => setShowExportReminder(false)}
                onExport={handleExportFromReminder}
            />
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
    scrollContent: {
        padding: 16,
    },

    // Estadísticas
    statsSection: {
        marginBottom: 10,
    },
    statsGrid: {
        gap: 10,
    },
    statCardPrimary: {
        backgroundColor: '#30acefff',
        borderRadius: 24,
        padding: 14,
        shadowColor: '#0EA5E9',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.45,
        shadowRadius: 10,
        elevation: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.25)',
        overflow: 'hidden',
    },
    statCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    statIconPrimary: {
        width: 46,
        height: 46,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.20)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.30)',
    },
    statBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.20)',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 20,
        gap: 6,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.30)',
    },
    statBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
    statPrimaryContent: {
        marginBottom: 8,
    },
    statPrimaryLabel: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.80)',
        fontWeight: '700',
        marginBottom: 8,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
    statPrimaryValue: {
        fontSize: 42,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: -1.5,
        textShadowColor: 'rgba(0, 0, 0, 0.15)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    statPrimaryFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.25)',
    },
    statPrimaryFooterItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    statPrimaryDivider: {
        width: 1,
        height: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        marginHorizontal: 12,
    },
    statPrimaryFooterText: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.90)',
        fontWeight: '600',
    },

    // Accesos rápidos
    quickAccessSection: {
        marginBottom: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: colors.text,
    },
    menuGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        justifyContent: 'space-between',
    },
    menuCard: {
        flexBasis: '48%',
        flexGrow: 0,
        flexShrink: 0,
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 0,
        position: 'relative',
        minHeight: 130,
        maxHeight: 160,
        justifyContent: 'space-between',
    },
    menuCardBackup: {
        borderWidth: 2,
        borderColor: '#45beffff',
        shadowColor: '#45beffff',
        shadowOpacity: 0.15,
        elevation: 5,
    },
    backupIndicator: {
        position: 'absolute',
        top: 8,
        left: 8,
        backgroundColor: '#E8F5E9',
        borderRadius: 12,
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    menuBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        minWidth: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 7,
        zIndex: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 3,
    },
    menuBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    addButton: {
        position: 'absolute',
        top: 12,
        right: 5,
        backgroundColor: '#9b27b0eb',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        zIndex: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 3,
    },
    addButtonText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    menuIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
        flexShrink: 0,
    },
    menuContent: {
        alignItems: 'center',
        width: '100%',
        flex: 1,
        justifyContent: 'center',
    },
    menuTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 3,
        textAlign: 'center',
        maxFontSizeMultiplier: 1.2,
    },
    menuSubtitle: {
        fontSize: 10,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 14,
        maxFontSizeMultiplier: 1.15,
    },

    // Footer
    footerInfo: {
        flexDirection: 'row',
        backgroundColor: '#E8F5E9',
        borderRadius: 14,
        padding: 10,
        alignItems: 'center',
        gap: 12,
        borderWidth: 1,
        borderColor: '#C8E6C9',
    },
    footerIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    footerTextContainer: {
        flex: 1,
    },
    footerTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#2D3436',
        marginBottom: 2,
    },
    footerSubtitle: {
        fontSize: 12,
        color: '#636E72',
        lineHeight: 16,
    },

    bottomPadding: {
        height: 20,
    },
});
