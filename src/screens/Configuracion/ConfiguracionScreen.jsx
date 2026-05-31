import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../shared/hooks/useTheme';
import Header from '../../shared/components/Header';
import ConfirmModal from '../../shared/components/ConfirmModal';
import Toast from '../../shared/components/Toast';
import CollapsibleSection from '../../shared/components/CollapsibleSection';
import GestionCategoriasUnidades from './components/GestionCategoriasUnidades';

// Secciones modularizadas
import AparienciaSection from './sections/Aparienciasection';
import PersonalizacionSection from './sections/Personalizacionsection';
import RespaldoSection from './sections/Respaldosection';
import SeguridadSection from './sections/Seguridadsection';
import DatosPruebaSection from './sections/Datospruebasection';

// Lógica de modales modularizada
import { createBackupModals } from './modals/Backupmodals';
import { createSecurityModals } from './modals/Securitymodals';
import { createStoreModals } from './modals/Storemodals';

const LOCK_TIMEOUT_KEY = 'lock_timeout';
const STORE_NAME_KEY = 'store_name';
const STORE_LOGO_KEY = 'store_logo';
const PIN_KEY = 'user_pin';
const PIN_ENABLED_KEY = 'pin_enabled';

export default function ConfiguracionScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { colors, isDark, toggleTheme } = useTheme();
    const styles = createStyles(colors);

    // Estado general
    const [selectedTimeout, setSelectedTimeout] = useState(60000);
    const [hasPin, setHasPin] = useState(false);
    const [pinEnabled, setPinEnabled] = useState(true);
    const [storeName, setStoreName] = useState('');
    const [storeLogo, setStoreLogo] = useState(null);
    const [editingName, setEditingName] = useState(false);
    const [tempStoreName, setTempStoreName] = useState('');
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);

    // Estado de modales y toast
    const [modalConfig, setModalConfig] = useState({
        visible: false,
        title: '',
        message: '',
        icon: '',
        iconColor: '',
        buttons: [],
    });
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

    const showModal = (config) => setModalConfig({ ...config, visible: true });
    const closeModal = () => setModalConfig((prev) => ({ ...prev, visible: false }));
    const showToast = (message, type = 'success') => setToast({ visible: true, message, type });

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const timeout = await AsyncStorage.getItem(LOCK_TIMEOUT_KEY);
            const pin = await AsyncStorage.getItem(PIN_KEY);
            const enabled = await AsyncStorage.getItem(PIN_ENABLED_KEY);
            const name = await AsyncStorage.getItem(STORE_NAME_KEY);
            const logo = await AsyncStorage.getItem(STORE_LOGO_KEY);

            if (timeout) setSelectedTimeout(parseInt(timeout));
            setHasPin(!!pin);
            setPinEnabled(enabled !== 'false');
            setStoreName(name || 'Mi Cobranza');
            setTempStoreName(name || 'Mi Cobranza');
            setStoreLogo(logo);
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    };

    const handleTimeoutChange = async (value) => {
        try {
            await AsyncStorage.setItem(LOCK_TIMEOUT_KEY, value.toString());
            setSelectedTimeout(value);
            showToast('Configuración actualizada correctamente');
        } catch (error) {
            showToast('No se pudo guardar la configuración', 'error');
        }
    };

    const handleSaveStoreName = async () => {
        if (!tempStoreName.trim()) {
            showToast('El nombre no puede estar vacío', 'error');
            return;
        }
        try {
            await AsyncStorage.setItem(STORE_NAME_KEY, tempStoreName.trim());
            setStoreName(tempStoreName.trim());
            setEditingName(false);
            showToast('Nombre de la tienda actualizado');
        } catch (error) {
            showToast('No se pudo guardar el nombre', 'error');
        }
    };

    // Instanciar lógica de modales
    const { handleExportData, handleImportData, handleReplaceData } = createBackupModals({
        showModal,
        showToast,
        setIsExporting,
        setIsImporting,
    });

    const { handleChangePinSecurity, handleDisablePin, handleCreatePin } = createSecurityModals({
        showModal,
        showToast,
        pinEnabled,
        setPinEnabled,
        loadSettings,
    });

    const { handlePickImage, handleRemoveLogo } = createStoreModals({
        showModal,
        showToast,
        setStoreLogo,
    });

    return (
        <View style={styles.container}>
            <Header title="Configuración" showBack onBack={() => navigation.goBack()} />

            <ScrollView
                style={styles.content}
                contentContainerStyle={[
                    styles.contentContainer,
                    { paddingBottom: Math.max(insets.bottom, 24) },
                ]}
            >
                <View style={styles.heroCard}>
                    <View style={styles.heroIcon}>
                        <Ionicons name="settings-outline" size={22} color="#45beffff" />
                    </View>
                    <View style={styles.heroText}>
                        <Text style={styles.heroTitle}>Ajusta tu espacio de trabajo</Text>
                        <Text style={styles.heroDescription}>
                            Personaliza la app, protege tus datos y administra la información clave desde un solo lugar.
                        </Text>
                    </View>
                </View>

                <AparienciaSection
                    colors={colors}
                    isDark={isDark}
                    toggleTheme={toggleTheme}
                />

                <PersonalizacionSection
                    colors={colors}
                    storeName={storeName}
                    storeLogo={storeLogo}
                    editingName={editingName}
                    tempStoreName={tempStoreName}
                    setTempStoreName={setTempStoreName}
                    setEditingName={setEditingName}
                    handleSaveStoreName={handleSaveStoreName}
                    handlePickImage={handlePickImage}
                    handleRemoveLogo={handleRemoveLogo}
                />

                {/* Categorías y Unidades */}
                <CollapsibleSection
                    title="Categorías y Unidades"
                    description="Gestiona categorías y unidades de medida"
                    icon="list-outline"
                    iconColor="#45beffff"
                    defaultExpanded={false}
                >
                    <Text style={styles.sectionDescription}>
                        Administra las categorías de productos y las unidades de medida disponibles en tu inventario.
                    </Text>
                    <GestionCategoriasUnidades showToast={showToast} />
                </CollapsibleSection>

                <RespaldoSection
                    colors={colors}
                    isExporting={isExporting}
                    isImporting={isImporting}
                    handleExportData={handleExportData}
                    handleImportData={handleImportData}
                    handleReplaceData={handleReplaceData}
                    showModal={showModal}
                    showToast={showToast}
                />

                <DatosPruebaSection
                    colors={colors}
                    showModal={showModal}
                    showToast={showToast}
                />

                <SeguridadSection
                    colors={colors}
                    hasPin={hasPin}
                    pinEnabled={pinEnabled}
                    selectedTimeout={selectedTimeout}
                    handleTimeoutChange={handleTimeoutChange}
                    handleChangePinSecurity={handleChangePinSecurity}
                    handleDisablePin={handleDisablePin}
                    handleCreatePin={handleCreatePin}
                />

                <View style={styles.infoBox}>
                    <View style={styles.infoIcon}>
                        <Ionicons name="information-circle" size={18} color="#3498db" />
                    </View>
                    <View style={styles.infoContent}>
                        <Text style={styles.infoTitle}>Bloqueo automático</Text>
                        <Text style={styles.infoText}>
                            El tiempo de bloqueo determina cuánto tiempo puede estar la app en segundo plano antes de pedir el PIN nuevamente.
                        </Text>
                    </View>
                </View>

                {/* Firma discreta */}
                <View style={styles.signatureContainer}>
                    <Ionicons name="heart" size={13} color="#FF6B6B" />
                    <Text style={styles.signature}>Hecho con mucho amor por M. Erick MR</Text>
                </View>
            </ScrollView>

            <ConfirmModal
                visible={modalConfig.visible}
                onClose={closeModal}
                title={modalConfig.title}
                message={modalConfig.message}
                icon={modalConfig.icon}
                iconColor={modalConfig.iconColor}
                buttons={modalConfig.buttons}
            />

            <Toast
                visible={toast.visible}
                message={toast.message}
                type={toast.type}
                onHide={() => setToast((prev) => ({ ...prev, visible: false }))}
            />
        </View>
    );
}

const createStyles = (colors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        paddingHorizontal: 16,
        paddingTop: 14,
    },
    heroCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: colors.card,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 16,
        marginBottom: 14,
        gap: 12,
    },
    heroIcon: {
        width: 42,
        height: 42,
        borderRadius: 13,
        backgroundColor: colors.surfaceVariant,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroText: {
        flex: 1,
    },
    heroTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 4,
    },
    heroDescription: {
        fontSize: 12,
        color: colors.textSecondary,
        lineHeight: 18,
    },
    sectionDescription: {
        fontSize: 13,
        color: colors.textSecondary,
        marginBottom: 14,
        lineHeight: 18,
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: colors.infoLight,
        padding: 14,
        borderRadius: 14,
        marginTop: 2,
        marginBottom: 14,
        gap: 10,
    },
    infoIcon: {
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: colors.card,
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoContent: {
        flex: 1,
    },
    infoTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.info,
        marginBottom: 2,
    },
    infoText: {
        fontSize: 12,
        color: colors.info,
        lineHeight: 17,
    },
    signatureContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingTop: 6,
        paddingBottom: 10,
    },
    signature: {
        fontSize: 11,
        color: colors.textTertiary,
        fontStyle: 'italic',
    },
});
