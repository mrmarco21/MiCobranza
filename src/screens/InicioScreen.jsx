import { useState, useCallback, useRef } from 'react';
import { View, ScrollView, TouchableOpacity, Text, StyleSheet, BackHandler } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { obtenerclientasConSaldo } from '../logic/clientasService';
import { formatCurrency } from '../utils/helpers';
import { useTheme } from '../hooks/useTheme';
import Header from '../components/Header';
import Toast from '../components/Toast';

export default function InicioScreen({ navigation }) {
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

    const showToast = () => {
        setToastVisible(true);
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
            title: 'Cuentas Pendientes',
            subtitle: `${estadisticas.cuentasPendientes} cuentas activas`,
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

    return (
        <View style={styles.container}>
            <Header title="Inicio" showMenu={true} />

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
                                    <Ionicons name="trending-up" size={24} color="#FFFFFF" />
                                </View>
                                <View style={styles.statBadge}>
                                    <Ionicons name="alert-circle" size={12} color="#38BDF8" />
                                    <Text style={styles.statBadgeText}>Activo</Text>
                                </View>
                            </View>
                            <Text style={styles.statPrimaryValue}>
                                {formatCurrency(estadisticas.totalPorCobrar)}
                            </Text>
                            <Text style={styles.statPrimaryLabel}>Total por cobrar</Text>
                            <View style={styles.statPrimaryFooter}>
                                <Ionicons name="people" size={14} color="rgba(255,255,255,0.75)" />
                                <Text style={styles.statPrimaryFooterText}>
                                    {estadisticas.clientasActivas} clientes activos
                                </Text>
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

    // Estadísticas
    statsSection: {
        marginBottom: 24,
    },
    statsGrid: {
        gap: 10,
    },
    statCardPrimary: {
        backgroundColor: '#30acefff',
        borderRadius: 20,
        padding: 10,
        shadowColor: '#0EA5E9',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.40,
        shadowRadius: 16,
        elevation: 8,
        borderWidth: 1,
        borderColor: 'rgba(56, 189, 248, 0.30)',
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
        borderRadius: 14,
        backgroundColor: 'rgba(56, 189, 248, 0.25)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(125, 211, 252, 0.40)',
    },
    statBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        paddingHorizontal: 10,
        paddingVertical: 2,
        borderRadius: 20,
        gap: 4,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.20)',
    },
    statBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#BAE6FD',
        letterSpacing: 0.5,
    },
    statPrimaryValue: {
        fontSize: 34,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 4,
        letterSpacing: -1,
    },
    statPrimaryLabel: {
        fontSize: 13,
        color: 'rgba(186, 230, 253, 0.90)',
        fontWeight: '500',
        marginBottom: 5,
        letterSpacing: 0.9,
    },
    statPrimaryFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: 'rgba(56, 189, 248, 0.25)',
    },
    statPrimaryFooterText: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.65)',
        fontWeight: '500',
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
