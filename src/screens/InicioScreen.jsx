import { useState, useCallback, useRef } from 'react';
import { View, ScrollView, TouchableOpacity, Text, StyleSheet, BackHandler } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { obtenerclientasConSaldo } from '../logic/clientasService';
import { formatCurrency } from '../utils/helpers';
import { useTheme } from '../hooks/useTheme';
import Header from '../components/Header';
import Toast from '../components/Toast';

import AsyncStorage from '@react-native-async-storage/async-storage';
const STORE_NAME_KEY = 'store_name';

export default function InicioScreen({ navigation }) {
    const { colors } = useTheme();
    const styles = createStyles(colors);
    const [estadisticas, setEstadisticas] = useState({
        clientasActivas: 0,
        totalPorCobrar: 0,
        cuentasPendientes: 0,
    });
    const [toastVisible, setToastVisible] = useState(false);
    const backPressCount = useRef(0);
    const [storeName, setStoreName] = useState(null);

    const showToast = () => {
        setToastVisible(true);
    };

    const loadStoreConfig = async () => {
        try {
            const name = await AsyncStorage.getItem(STORE_NAME_KEY);
            console.log('[InicioScreen] store_name desde AsyncStorage:', JSON.stringify(name));
            setStoreName(name ?? 'Mi Cobranza');
        } catch (error) {
            console.error('Error loading store config:', error);
            setStoreName('Mi Cobranza');
        }
    };

    const cargarEstadisticas = async () => {
        const data = await obtenerclientasConSaldo();
        const conDeuda = data.filter(c => c.tieneCuentaActiva && c.saldoActual > 0);
        const totalPorCobrar = conDeuda.reduce((sum, c) => sum + c.saldoActual, 0);
        const totalCuentas = conDeuda.reduce((sum, c) => sum + c.numeroCuentasActivas, 0);

        setEstadisticas({
            clientasActivas: conDeuda.length,
            totalPorCobrar,
            cuentasPendientes: totalCuentas,
        });
    };

    // Un solo useFocusEffect para cargar datos al enfocar la pantalla
    useFocusEffect(
        useCallback(() => {
            loadStoreConfig();
            cargarEstadisticas();
        }, [])
    );

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

    const menuOptions = [
        {
            title: 'Cuentas Pendientes',
            subtitle: `${estadisticas.cuentasPendientes} deudor${estadisticas.cuentasPendientes !== 1 ? 'es' : ''}`,
            icon: 'wallet-outline',
            color: '#FF6B6B',
            bgColor: '#FFE5E5',
            screen: 'CuentasPendientes',
            badge: estadisticas.cuentasPendientes > 0 ? estadisticas.cuentasPendientes : null
        },
        {
            title: 'Gestionar clientes',
            subtitle: 'Ver y administrar clientes',
            icon: 'people-outline',
            color: '#29B6F6',
            bgColor: '#E1F5FE',
            screen: 'clientas'
        },
        {
            title: 'Deudas Canceladas',
            subtitle: 'Historial de pagos',
            icon: 'checkmark-done-outline',
            color: '#66BB6A',
            bgColor: '#E8F5E9',
            screen: 'CuentasCanceladas'
        },
        {
            title: 'Resumen',
            subtitle: 'Estadísticas y reportes',
            icon: 'stats-chart-outline',
            color: '#FFA726',
            bgColor: '#FFF3E0',
            screen: 'Resumen'
        },
    ];

    // Accesos rápidos secundarios (fila horizontal)
    const quickLinks = [
        {
            title: 'Movimientos del Día',
            icon: 'swap-vertical-outline',
            color: '#0EA5E9',
            bgColor: '#EFF6FF',
            screen: 'MovimientosDiarios',
        },
        {
            title: 'Backup',
            icon: 'cloud-outline',
            color: '#8B5CF6',
            bgColor: '#F5F3FF',
            screen: 'Configuracion',
            params: { openBackup: true },
        },
    ];

    return (
        <View style={styles.container}>
            <Header title={storeName ?? ''}
                showMenu={true} />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Card principal — Resumen financiero */}
                <View style={styles.statsSection}>
                    <View style={styles.statCardPrimary}>
                        {/* Fila superior: ícono + badge */}
                        <View style={styles.statCardHeader}>
                            <View style={styles.statIconPrimary}>
                                <Ionicons name="wallet" size={22} color="#FFFFFF" />
                            </View>
                            <View style={styles.statBadge}>
                                <View style={styles.statBadgeDot} />
                                <Text style={styles.statBadgeText}>En curso</Text>
                            </View>
                        </View>

                        {/* Monto principal */}
                        <Text style={styles.statPrimaryLabel}>Total por cobrar</Text>
                        <Text style={styles.statPrimaryValue}>
                            {formatCurrency(estadisticas.totalPorCobrar)}
                        </Text>

                        {/* Divisor */}
                        <View style={styles.statDivider} />

                        {/* Fila de métricas secundarias */}
                        <View style={styles.statMetricsRow}>
                            <View style={styles.statMetric}>
                                <View style={styles.statMetricIconWrap}>
                                    <Ionicons name="people" size={15} color="rgba(255,255,255,0.85)" />
                                </View>
                                <View>
                                    <Text style={styles.statMetricValue}>
                                        {estadisticas.clientasActivas}
                                    </Text>
                                    <Text style={styles.statMetricLabel}>
                                        {estadisticas.clientasActivas === 1 ? 'Deudor' : 'Deudores'}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.statMetricSep} />

                            <View style={styles.statMetric}>
                                <View style={styles.statMetricIconWrap}>
                                    <Ionicons name="receipt" size={15} color="rgba(255,255,255,0.85)" />
                                </View>
                                <View>
                                    <Text style={styles.statMetricValue}>
                                        {estadisticas.cuentasPendientes}
                                    </Text>
                                    <Text style={styles.statMetricLabel}>Cuentas</Text>
                                </View>
                            </View>

                            <View style={styles.statMetricSep} />

                            <TouchableOpacity
                                style={styles.statActionBtn}
                                onPress={() => navigation.navigate('CuentasPendientes')}
                                activeOpacity={0.75}
                            >
                                <Text style={styles.statActionBtnText}>Ver detalle</Text>
                                <Ionicons name="arrow-forward" size={13} color="#0EA5E9" />
                            </TouchableOpacity>
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
                                style={styles.menuCard}
                                onPress={() => navigation.navigate(option.screen, option.params)}
                                activeOpacity={0.7}
                            >
                                {option.badge && (
                                    <View style={[styles.menuBadge, { backgroundColor: option.color }]}>
                                        <Text style={styles.menuBadgeText}>{option.badge}</Text>
                                    </View>
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

                {/* Quick links — Movimientos del Día y Backup */}
                <View style={styles.quickLinksRow}>
                    {quickLinks.map((link, i) => (
                        <TouchableOpacity
                            key={i}
                            style={styles.quickLinkCard}
                            onPress={() => navigation.navigate(link.screen, link.params)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.quickLinkIcono, { backgroundColor: link.bgColor }]}>
                                <Ionicons name={link.icon} size={22} color={link.color} />
                            </View>
                            <Text style={styles.quickLinkTexto} numberOfLines={2}>
                                {link.title}
                            </Text>
                            <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
                        </TouchableOpacity>
                    ))}
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

    // Card principal
    statsSection: {
        marginBottom: 15,
    },
    statCardPrimary: {
        borderRadius: 24,
        padding: 10,
        // Gradiente simulado con capas
        backgroundColor: '#0EA5E9',
        shadowColor: '#0369A1',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.45,
        shadowRadius: 20,
        elevation: 5,
        overflow: 'hidden',
    },
    statCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    statIconPrimary: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.18)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.25)',
    },
    statBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 20,
        gap: 6,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.20)',
    },
    statBadgeDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: '#86EFAC',
    },
    statBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.92)',
        letterSpacing: 0.3,
    },
    statPrimaryLabel: {
        fontSize: 13,
        color: 'rgba(186,230,253,0.90)',
        fontWeight: '500',
        letterSpacing: 0.5,
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    statPrimaryValue: {
        fontSize: 38,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: -1.5,
        marginBottom: 14,
    },
    statDivider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.15)',
        marginBottom: 16,
    },
    statMetricsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    statMetric: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statMetricIconWrap: {
        width: 30,
        height: 30,
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.12)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    statMetricValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
        lineHeight: 20,
    },
    statMetricLabel: {
        fontSize: 10,
        color: 'rgba(186,230,253,0.80)',
        fontWeight: '500',
        letterSpacing: 0.2,
    },
    statMetricSep: {
        width: 1,
        height: 32,
        backgroundColor: 'rgba(255,255,255,0.15)',
    },
    statActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 20,
    },
    statActionBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#0EA5E9',
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

    // Quick links
    quickLinksRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 16,
    },
    quickLinkCard: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: colors.card,
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    quickLinkIcono: {
        width: 38,
        height: 38,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    quickLinkTexto: {
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
        color: colors.text,
        lineHeight: 18,
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
