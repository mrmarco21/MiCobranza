import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Image,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../shared/hooks/useTheme';
import Header from '../../shared/components/Header';
import ConfirmModal from '../../shared/components/ConfirmModal';
import Toast from '../../shared/components/Toast';
import CollapsibleSection from '../../shared/components/CollapsibleSection';
import { exportData, importData, applyImportedData, mergeImportedData } from '../../shared/utils/backupService';
import { clearAllData } from '../../data/storage';
import AutoBackupManager from './components/AutoBackupManager';
import GestionCategoriasUnidades from './components/GestionCategoriasUnidades';

const LOCK_TIMEOUT_KEY = 'lock_timeout';
const PIN_KEY = 'user_pin';
const PIN_ENABLED_KEY = 'pin_enabled';
const SECURITY_QUESTION_KEY = 'security_question';
const SECURITY_ANSWER_KEY = 'security_answer';
const STORE_NAME_KEY = 'store_name';
const STORE_LOGO_KEY = 'store_logo';

const TIMEOUT_OPTIONS = [
    { label: 'Inmediato', value: 0, description: 'Pide PIN al salir de la app' },
    { label: '30 segundos', value: 30000, description: 'Pide PIN después de 30 segundos' },
    { label: '1 minuto', value: 60000, description: 'Pide PIN después de 1 minuto' },
    { label: '5 minutos', value: 300000, description: 'Pide PIN después de 5 minutos' },
    { label: '15 minutos', value: 900000, description: 'Pide PIN después de 15 minutos' },
    { label: 'Nunca', value: -1, description: 'Solo pide PIN al abrir la app' },
];

export default function ConfiguracionScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { colors, isDark, toggleTheme } = useTheme();
    const styles = createStyles(colors);
    const [selectedTimeout, setSelectedTimeout] = useState(60000);
    const [hasPin, setHasPin] = useState(false);
    const [pinEnabled, setPinEnabled] = useState(true);
    const [storeName, setStoreName] = useState('');
    const [storeLogo, setStoreLogo] = useState(null);
    const [editingName, setEditingName] = useState(false);
    const [tempStoreName, setTempStoreName] = useState('');
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);

    // Estados para modales
    const [modalConfig, setModalConfig] = useState({
        visible: false,
        title: '',
        message: '',
        icon: '',
        iconColor: '',
        buttons: [],
    });
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

    const showModal = (config) => {
        setModalConfig({ ...config, visible: true });
    };

    const closeModal = () => {
        setModalConfig({ ...modalConfig, visible: false });
    };

    const showToast = (message, type = 'success') => {
        setToast({ visible: true, message, type });
    };

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

            if (timeout) {
                setSelectedTimeout(parseInt(timeout));
            }

            setHasPin(!!pin);
            setPinEnabled(enabled !== 'false'); // Por defecto true si no existe
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

    const handleChangePinSecurity = () => {
        showModal({
            title: 'Cambiar PIN',
            message: '¿Deseas cambiar tu PIN y pregunta de seguridad?',
            icon: 'key-outline',
            iconColor: '#45beffff',
            buttons: [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Cambiar',
                    style: 'primary',
                    onPress: async () => {
                        try {
                            await AsyncStorage.removeItem(PIN_KEY);
                            await AsyncStorage.removeItem(SECURITY_QUESTION_KEY);
                            await AsyncStorage.removeItem(SECURITY_ANSWER_KEY);
                            showModal({
                                title: 'PIN Eliminado',
                                message: 'Cierra y vuelve a abrir la app para crear un nuevo PIN',
                                icon: 'checkmark-circle',
                                iconColor: '#4CAF50',
                                buttons: [{ text: 'OK', style: 'primary' }],
                            });
                        } catch (error) {
                            showToast('No se pudo eliminar el PIN', 'error');
                        }
                    },
                },
            ],
        });
    };

    const handleDisablePin = () => {
        const action = pinEnabled ? 'desactivar' : 'activar';
        const newState = !pinEnabled;

        showModal({
            title: newState ? 'Activar PIN' : 'Desactivar PIN',
            message: newState
                ? '¿Deseas activar la protección con PIN?'
                : '¿Estás seguro? Tu app quedará sin protección',
            icon: newState ? 'lock-closed-outline' : 'lock-open-outline',
            iconColor: newState ? '#4CAF50' : '#e74c3c',
            buttons: [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: newState ? 'Activar' : 'Desactivar',
                    style: newState ? 'primary' : 'destructive',
                    onPress: async () => {
                        try {
                            await AsyncStorage.setItem(PIN_ENABLED_KEY, newState.toString());
                            setPinEnabled(newState);
                            showToast(
                                newState
                                    ? 'PIN activado correctamente'
                                    : 'PIN desactivado. Reinicia la app para aplicar cambios'
                            );
                        } catch (error) {
                            showToast(`No se pudo ${action} el PIN`, 'error');
                        }
                    },
                },
            ],
        });
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

    const handlePickImage = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (status !== 'granted') {
                showModal({
                    title: 'Permiso necesario',
                    message: 'Necesitamos acceso a tus fotos para cambiar el logo',
                    icon: 'images-outline',
                    iconColor: '#FF9800',
                    buttons: [{ text: 'OK', style: 'primary' }],
                });
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled) {
                const imageUri = result.assets[0].uri;
                await AsyncStorage.setItem(STORE_LOGO_KEY, imageUri);
                setStoreLogo(imageUri);
                showToast('Logo actualizado correctamente');
            }
        } catch (error) {
            showToast('No se pudo cambiar el logo', 'error');
            console.error('Error picking image:', error);
        }
    };

    const handleRemoveLogo = async () => {
        showModal({
            title: 'Eliminar Logo',
            message: '¿Deseas usar el logo predeterminado?',
            icon: 'trash-outline',
            iconColor: '#e74c3c',
            buttons: [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await AsyncStorage.removeItem(STORE_LOGO_KEY);
                            setStoreLogo(null);
                            showToast('Se usará el logo predeterminado');
                        } catch (error) {
                            showToast('No se pudo eliminar el logo', 'error');
                        }
                    },
                },
            ],
        });
    };

    const handleExportData = async () => {
        showModal({
            title: 'Exportar Datos',
            message: 'Se creará un archivo ZIP con TODOS tus datos e imágenes. Podrás compartirlo directamente por WhatsApp, Drive, Email, etc.',
            icon: 'download-outline',
            iconColor: '#45beffff',
            buttons: [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Exportar',
                    style: 'primary',
                    onPress: async () => {
                        setIsExporting(true);
                        const result = await exportData();
                        setIsExporting(false);

                        if (result.success) {
                            showModal({
                                title: 'Exportación Exitosa',
                                message: result.message || `Archivo ZIP creado: ${result.fileName}`,
                                icon: 'checkmark-circle',
                                iconColor: '#4CAF50',
                                buttons: [{ text: 'OK', style: 'primary' }],
                            });
                        } else {
                            showModal({
                                title: 'Error',
                                message: `No se pudo exportar: ${result.error}`,
                                icon: 'alert-circle',
                                iconColor: '#e74c3c',
                                buttons: [{ text: 'OK', style: 'primary' }],
                            });
                        }
                    },
                },
            ],
        });
    };

    const handleImportData = async () => {
        showModal({
            title: 'Importar Datos',
            message: 'Selecciona un archivo de respaldo. Podrás elegir si reemplazar o fusionar con tus datos actuales.',
            icon: 'cloud-upload-outline',
            iconColor: '#45beffff',
            buttons: [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Seleccionar Archivo',
                    style: 'primary',
                    onPress: async () => {
                        setIsImporting(true);
                        const result = await importData();
                        setIsImporting(false);

                        if (result.canceled) {
                            return;
                        }

                        if (!result.success) {
                            showModal({
                                title: 'Error',
                                message: result.error || 'No se pudo leer el archivo',
                                icon: 'alert-circle',
                                iconColor: '#e74c3c',
                                buttons: [{ text: 'OK', style: 'primary' }],
                            });
                            return;
                        }

                        // Mostrar resumen y opciones
                        const { itemCount, exportDate } = result;
                        const date = new Date(exportDate);
                        const formattedDate = date.toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                        });

                        showModal({
                            title: 'Archivo Válido',
                            message: `Respaldo del ${formattedDate}\n\n` +
                                `• ${itemCount.clientas} clientes\n` +
                                `• ${itemCount.cuentas} cuentas\n` +
                                `• ${itemCount.movimientos} movimientos\n` +
                                `• ${itemCount.productos || 0} productos\n` +
                                `• ${itemCount.ventas || 0} ventas\n` +
                                `• ${itemCount.gastos || 0} gastos\n` +
                                `• ${itemCount.pedidos || 0} pedidos\n\n` +
                                `¿Cómo deseas importar?`,
                            icon: 'document-text',
                            iconColor: '#3498db',
                            buttons: [
                                { text: 'Cancelar', style: 'cancel' },
                                {
                                    text: 'Fusionar',
                                    style: 'primary',
                                    onPress: () => handleMergeData(result.data),
                                },
                                {
                                    text: 'Reemplazar Todo',
                                    style: 'destructive',
                                    onPress: () => handleReplaceData(result.data),
                                },
                            ],
                        });
                    },
                },
            ],
        });
    };

    const handleReplaceData = async (importedData) => {
        showModal({
            title: 'Confirmar Reemplazo',
            message: 'Esto ELIMINARÁ todos tus datos actuales y los reemplazará con los del respaldo. Esta acción no se puede deshacer.\n\n¿Estás seguro?',
            icon: 'warning',
            iconColor: '#FF9800',
            buttons: [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Sí, Reemplazar',
                    style: 'destructive',
                    onPress: async () => {
                        const result = await applyImportedData(importedData);
                        if (result.success) {
                            showModal({
                                title: 'Importación Exitosa',
                                message: 'Datos restaurados correctamente. Reinicia la app para ver los cambios.',
                                icon: 'checkmark-circle',
                                iconColor: '#4CAF50',
                                buttons: [{ text: 'OK', style: 'primary' }],
                            });
                        } else {
                            showModal({
                                title: 'Error',
                                message: `No se pudo importar: ${result.error}`,
                                icon: 'alert-circle',
                                iconColor: '#e74c3c',
                                buttons: [{ text: 'OK', style: 'primary' }],
                            });
                        }
                    },
                },
            ],
        });
    };

    const handleMergeData = async (importedData) => {
        const result = await mergeImportedData(importedData);
        if (result.success) {
            const { added } = result;
            const totalAdded = Object.values(added).reduce((sum, val) => sum + val, 0);

            showModal({
                title: 'Fusión Exitosa',
                message: `Se agregaron ${totalAdded} elementos nuevos:\n\n` +
                    `• ${added.clientas} clientes\n` +
                    `• ${added.cuentas} cuentas\n` +
                    `• ${added.movimientos} movimientos\n` +
                    `• ${added.productos} productos\n` +
                    `• ${added.ventas} ventas\n` +
                    `• ${added.gastos} gastos\n` +
                    `• ${added.pedidos} pedidos\n\n` +
                    `Reinicia la app para ver los cambios.`,
                icon: 'checkmark-circle',
                iconColor: '#4CAF50',
                buttons: [{ text: 'OK', style: 'primary' }],
            });
        } else {
            showModal({
                title: 'Error',
                message: `No se pudo fusionar: ${result.error}`,
                icon: 'alert-circle',
                iconColor: '#e74c3c',
                buttons: [{ text: 'OK', style: 'primary' }],
            });
        }
    };

    return (
        <View style={styles.container}>
            <Header title="Configuración" showBack onBack={() => navigation.goBack()} />

            <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 20) }}>
                {/* Sección de Apariencia */}
                <CollapsibleSection
                    title="Apariencia"
                    description={isDark ? "Modo oscuro activado" : "Modo claro activado"}
                    icon="color-palette-outline"
                    iconColor="#45beffff"
                    defaultExpanded={false}
                >
                    <View style={styles.themeContainer}>
                        <View style={styles.themeInfo}>
                            <Ionicons
                                name={isDark ? "moon" : "sunny"}
                                size={24}
                                color={isDark ? "#FFA726" : "#FFD54F"}
                            />
                            <Text style={styles.themeText}>
                                {isDark ? 'Modo Oscuro' : 'Modo Claro'}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={[
                                styles.toggleButton,
                                isDark ? styles.toggleButtonActive : styles.toggleButtonInactive
                            ]}
                            onPress={toggleTheme}
                        >
                            <View style={[
                                styles.toggleCircle,
                                isDark && styles.toggleCircleActive
                            ]} />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.themeDescription}>
                        El modo oscuro reduce el brillo de la pantalla y es más cómodo para los ojos en ambientes con poca luz.
                    </Text>
                </CollapsibleSection>

                {/* Sección de Personalización */}
                <CollapsibleSection
                    title="Personalización"
                    description="Nombre y logo de tu tienda"
                    icon="storefront-outline"
                    iconColor="#45beffff"
                    defaultExpanded={false}
                >
                    {/* Logo de la tienda */}
                    <View style={styles.logoContainer}>
                        <View style={styles.logoPreview}>
                            {storeLogo ? (
                                <Image source={{ uri: storeLogo }} style={styles.logoImage} />
                            ) : (
                                <Image
                                    source={require('../../../assets/icon_app.png')}
                                    style={styles.logoImage}
                                />
                            )}
                        </View>
                        <View style={styles.logoActions}>
                            <TouchableOpacity
                                style={styles.logoButton}
                                onPress={handlePickImage}
                            >
                                <Ionicons name="camera-outline" size={20} color="#45beffff" />
                                <Text style={styles.logoButtonText}>Cambiar Logo</Text>
                            </TouchableOpacity>
                            {storeLogo && (
                                <TouchableOpacity
                                    style={[styles.logoButton, styles.logoButtonDanger]}
                                    onPress={handleRemoveLogo}
                                >
                                    <Ionicons name="trash-outline" size={20} color="#e74c3c" />
                                    <Text style={[styles.logoButtonText, styles.logoButtonTextDanger]}>
                                        Eliminar
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {/* Nombre de la tienda */}
                    <View style={styles.nameContainer}>
                        <Text style={styles.nameLabel}>Nombre de la tienda</Text>
                        {editingName ? (
                            <View style={styles.nameEditContainer}>
                                <TextInput
                                    style={styles.nameInput}
                                    value={tempStoreName}
                                    onChangeText={setTempStoreName}
                                    placeholder="Nombre de tu tienda"
                                    autoFocus
                                />
                                <View style={styles.nameEditActions}>
                                    <TouchableOpacity
                                        style={styles.nameEditButton}
                                        onPress={handleSaveStoreName}
                                    >
                                        <Ionicons name="checkmark" size={20} color="#4CAF50" />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.nameEditButton}
                                        onPress={() => {
                                            setTempStoreName(storeName);
                                            setEditingName(false);
                                        }}
                                    >
                                        <Ionicons name="close" size={20} color="#e74c3c" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : (
                            <TouchableOpacity
                                style={styles.nameDisplay}
                                onPress={() => setEditingName(true)}
                            >
                                <Text style={styles.nameText}>{storeName}</Text>
                                <Ionicons name="pencil" size={20} color="#45beffff" />
                            </TouchableOpacity>
                        )}
                    </View>
                </CollapsibleSection>

                {/* Sección de Gestión de Categorías y Unidades */}
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

                {/* Sección de Respaldo y Restauración */}
                <CollapsibleSection
                    title="Respaldo y Restauración"
                    description="Protege tus datos automáticamente"
                    icon="cloud-upload-outline"
                    iconColor="#45beffff"
                    defaultExpanded={false}
                >
                    {/* Respaldos Automáticos */}
                    <AutoBackupManager
                        onRestore={handleReplaceData}
                        showModal={showModal}
                        showToast={showToast}
                    />

                    {/* Separador */}
                    <View style={styles.separator}>
                        <View style={styles.separatorLine} />
                        <Text style={styles.separatorText}>Exportación Manual</Text>
                        <View style={styles.separatorLine} />
                    </View>

                    <Text style={styles.sectionDescription}>
                        Exporta tus datos para guardarlos en Google Drive, WhatsApp o donde prefieras
                    </Text>

                    <TouchableOpacity
                        style={[styles.backupButton, isExporting && styles.backupButtonDisabled]}
                        onPress={handleExportData}
                        disabled={isExporting}
                    >
                        {isExporting ? (
                            <ActivityIndicator size="small" color="#45beffff" />
                        ) : (
                            <Ionicons name="download-outline" size={22} color="#45beffff" />
                        )}
                        <View style={styles.backupButtonContent}>
                            <Text style={styles.backupButtonTitle}>Exportar y Compartir</Text>
                            <Text style={styles.backupButtonDescription}>
                                Crear archivo y guardarlo en la nube
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#999" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.backupButton, isImporting && styles.backupButtonDisabled]}
                        onPress={handleImportData}
                        disabled={isImporting}
                    >
                        {isImporting ? (
                            <ActivityIndicator size="small" color="#45beffff" />
                        ) : (
                            <Ionicons name="cloud-upload-outline" size={22} color="#45beffff" />
                        )}
                        <View style={styles.backupButtonContent}>
                            <Text style={styles.backupButtonTitle}>Importar Datos</Text>
                            <Text style={styles.backupButtonDescription}>
                                Restaurar desde un archivo externo
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#999" />
                    </TouchableOpacity>

                    <View style={styles.backupInfo}>
                        <Ionicons name="shield-checkmark" size={18} color="#4CAF50" />
                        <Text style={styles.backupInfoText}>
                            Los respaldos incluyen todos tus datos: clientes, cuentas, movimientos, productos (con sus imágenes), ventas, gastos y configuración. El PIN no se exporta por seguridad.
                        </Text>
                    </View>
                </CollapsibleSection>

                {/* Sección de Datos de Prueba */}
                <CollapsibleSection
                    title="Datos de Prueba"
                    description="Eliminar todos los datos de la app"
                    icon="trash-outline"
                    iconColor="#e74c3c"
                    defaultExpanded={false}
                >
                    <Text style={styles.sectionDescription}>
                        Esta opción eliminará TODOS los datos de la aplicación, incluyendo clientes, cuentas, movimientos, gastos y configuración.
                    </Text>

                    <View style={styles.backupInfo}>
                        <Ionicons name="warning" size={18} color="#FF9800" />
                        <Text style={[styles.backupInfoText, { color: '#FF9800' }]}>
                            Esta acción no se puede deshacer. Te recomendamos hacer un respaldo antes de continuar.
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={[styles.actionButton, styles.dangerButton]}
                        onPress={() => {
                            showModal({
                                title: 'Eliminar Todos los Datos',
                                message: 'Esto eliminará PERMANENTEMENTE:\n\n• Todas las clientas\n• Todas las cuentas\n• Todos los movimientos\n• Todos los gastos\n• Configuración de la tienda\n• PIN y seguridad\n\n¿Estás completamente seguro?',
                                icon: 'warning',
                                iconColor: '#e74c3c',
                                buttons: [
                                    { text: 'Cancelar', style: 'cancel' },
                                    {
                                        text: 'Sí, Eliminar Todo',
                                        style: 'destructive',
                                        onPress: async () => {
                                            try {
                                                await clearAllData();
                                                showModal({
                                                    title: 'Datos Eliminados',
                                                    message: 'Todos los datos han sido eliminados. Cierra y vuelve a abrir la app para empezar de nuevo.',
                                                    icon: 'checkmark-circle',
                                                    iconColor: '#4CAF50',
                                                    buttons: [{ text: 'OK', style: 'primary' }],
                                                });
                                            } catch (error) {
                                                showToast('Error al eliminar los datos', 'error');
                                                console.error('Error clearing data:', error);
                                            }
                                        },
                                    },
                                ],
                            });
                        }}
                    >
                        <Ionicons name="trash-outline" size={20} color="#e74c3c" />
                        <Text style={[styles.actionButtonText, styles.dangerButtonText]}>
                            Eliminar Todos los Datos
                        </Text>
                    </TouchableOpacity>
                </CollapsibleSection>

                {/* Sección de Seguridad */}
                <CollapsibleSection
                    title="Seguridad"
                    description={hasPin ? (pinEnabled ? "PIN activado" : "PIN desactivado") : "Sin PIN"}
                    icon="lock-closed-outline"
                    iconColor="#45beffff"
                    defaultExpanded={false}
                >
                    {hasPin && (
                        <>
                            {/* Estado del PIN */}
                            <View style={styles.pinStatusContainer}>
                                <View style={styles.pinStatusInfo}>
                                    <Ionicons
                                        name={pinEnabled ? "shield-checkmark" : "shield-outline"}
                                        size={24}
                                        color={pinEnabled ? "#4CAF50" : "#999"}
                                    />
                                    <Text style={styles.pinStatusText}>
                                        PIN {pinEnabled ? 'activado' : 'desactivado'}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    style={[
                                        styles.toggleButton,
                                        pinEnabled ? styles.toggleButtonActive : styles.toggleButtonInactive
                                    ]}
                                    onPress={handleDisablePin}
                                >
                                    <View style={[
                                        styles.toggleCircle,
                                        pinEnabled && styles.toggleCircleActive
                                    ]} />
                                </TouchableOpacity>
                            </View>

                            {pinEnabled && (
                                <>
                                    <Text style={styles.sectionDescription}>
                                        Tiempo de bloqueo automático
                                    </Text>

                                    {TIMEOUT_OPTIONS.map((option) => (
                                        <TouchableOpacity
                                            key={option.value}
                                            style={[
                                                styles.option,
                                                selectedTimeout === option.value && styles.optionSelected,
                                            ]}
                                            onPress={() => handleTimeoutChange(option.value)}
                                        >
                                            <View style={styles.optionContent}>
                                                <Text
                                                    style={[
                                                        styles.optionLabel,
                                                        selectedTimeout === option.value && styles.optionLabelSelected,
                                                    ]}
                                                >
                                                    {option.label}
                                                </Text>
                                                <Text style={styles.optionDescription}>
                                                    {option.description}
                                                </Text>
                                            </View>
                                            {selectedTimeout === option.value && (
                                                <Ionicons name="checkmark-circle" size={24} color="#45beffff" />
                                            )}
                                        </TouchableOpacity>
                                    ))}

                                    <TouchableOpacity
                                        style={styles.actionButton}
                                        onPress={handleChangePinSecurity}
                                    >
                                        <Ionicons name="key-outline" size={20} color="#45beffff" />
                                        <Text style={styles.actionButtonText}>
                                            Cambiar PIN y Pregunta de Seguridad
                                        </Text>
                                    </TouchableOpacity>
                                </>
                            )}

                            {!pinEnabled && (
                                <View style={styles.pinDisabledInfo}>
                                    <Ionicons name="information-circle-outline" size={20} color="#FF9800" />
                                    <Text style={styles.pinDisabledText}>
                                        El PIN está desactivado. Tu app no está protegida. Actívalo usando el interruptor arriba.
                                    </Text>
                                </View>
                            )}
                        </>
                    )}

                    {!hasPin && (
                        <View style={styles.noPinContainer}>
                            <Ionicons name="lock-open-outline" size={48} color="#FF9800" />
                            <Text style={styles.noPinText}>
                                No tienes un PIN configurado
                            </Text>
                            <Text style={styles.noPinDescription}>
                                Protege tu app con un PIN de seguridad
                            </Text>
                            <TouchableOpacity
                                style={styles.createPinButton}
                                onPress={async () => {
                                    try {
                                        // Activar el PIN y forzar su creación
                                        await AsyncStorage.setItem(PIN_ENABLED_KEY, 'true');
                                        await AsyncStorage.setItem('force_pin_setup', 'true');

                                        showModal({
                                            title: 'Configuración Guardada',
                                            message: 'Ahora debes crear tu PIN de seguridad. La pantalla de configuración aparecerá en unos segundos.',
                                            icon: 'checkmark-circle',
                                            iconColor: '#4CAF50',
                                            buttons: [
                                                {
                                                    text: 'OK',
                                                    style: 'primary',
                                                    onPress: () => {
                                                        // Recargar la configuración
                                                        loadSettings();
                                                    }
                                                }
                                            ]
                                        });
                                    } catch (error) {
                                        showToast('Error al activar el PIN', 'error');
                                    }
                                }}
                            >
                                <Ionicons name="add-circle" size={20} color="#FFF" />
                                <Text style={styles.createPinButtonText}>Crear PIN</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </CollapsibleSection>

                <View style={styles.infoBox}>
                    <Ionicons name="information-circle" size={20} color="#3498db" />
                    <Text style={styles.infoText}>
                        El tiempo de bloqueo determina cuánto tiempo puede estar la app en segundo plano antes de pedir el PIN nuevamente.
                    </Text>
                </View>

                {/* Firma discreta */}
                <View style={styles.signatureContainer}>
                    <Text style={styles.signature}>Hecho con mucho amor por M. Erick MR</Text>
                    <Ionicons name="heart" size={14} color="#FF6B6B" />
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
                onHide={() => setToast({ ...toast, visible: false })}
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
        padding: 20,
    },
    section: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.text,
        marginLeft: 10,
    },
    sectionDescription: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 15,
    },
    themeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.surfaceVariant,
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
    },
    themeInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    themeText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },
    themeDescription: {
        fontSize: 13,
        color: colors.textSecondary,
        lineHeight: 18,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    logoPreview: {
        width: 120,
        height: 120,
        borderRadius: 20,
        backgroundColor: colors.surfaceVariant,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: colors.border,
    },
    logoImage: {
        width: '100%',
        height: '100%',
    },
    logoActions: {
        flexDirection: 'row',
        gap: 10,
    },
    logoButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: colors.primaryLight,
        borderRadius: 8,
    },
    logoButtonDanger: {
        backgroundColor: colors.errorLight,
    },
    logoButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.primary,
    },
    logoButtonTextDanger: {
        color: colors.error,
    },
    nameContainer: {
        marginTop: 10,
    },
    nameLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textSecondary,
        marginBottom: 8,
    },
    nameDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.surfaceVariant,
        padding: 15,
        borderRadius: 10,
    },
    nameText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },
    nameEditContainer: {
        gap: 10,
    },
    nameInput: {
        backgroundColor: colors.surfaceVariant,
        padding: 15,
        borderRadius: 10,
        fontSize: 16,
        color: colors.text,
        borderWidth: 2,
        borderColor: colors.primary,
    },
    nameEditActions: {
        flexDirection: 'row',
        gap: 10,
    },
    nameEditButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        backgroundColor: colors.surfaceVariant,
        borderRadius: 8,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 15,
        borderRadius: 10,
        backgroundColor: colors.surfaceVariant,
        marginBottom: 10,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    optionSelected: {
        backgroundColor: colors.primaryLight,
        borderColor: colors.primary,
    },
    optionContent: {
        flex: 1,
    },
    optionLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 4,
    },
    optionLabelSelected: {
        color: colors.primary,
    },
    optionDescription: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 15,
        borderRadius: 10,
        backgroundColor: colors.primaryLight,
        marginTop: 20,
    },
    actionButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.primary,
        marginLeft: 8,
    },
    dangerButton: {
        backgroundColor: colors.errorLight,
        marginTop: 10,
    },
    dangerButtonText: {
        color: colors.error,
    },
    noPinContainer: {
        alignItems: 'center',
        paddingVertical: 30,
    },
    noPinText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textSecondary,
        marginTop: 15,
        marginBottom: 8,
    },
    noPinDescription: {
        fontSize: 14,
        color: colors.textTertiary,
        textAlign: 'center',
        marginBottom: 20,
    },
    createPinButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.primary,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 10,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    createPinButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: colors.infoLight,
        padding: 15,
        borderRadius: 10,
        marginBottom: 20,
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        color: colors.info,
        marginLeft: 10,
        lineHeight: 18,
    },
    backupButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: colors.surfaceVariant,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    backupButtonDisabled: {
        opacity: 0.6,
    },
    backupButtonContent: {
        flex: 1,
        marginLeft: 12,
    },
    backupButtonTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 4,
    },
    backupButtonDescription: {
        fontSize: 13,
        color: colors.textSecondary,
    },
    backupInfo: {
        flexDirection: 'row',
        backgroundColor: colors.successLight,
        padding: 12,
        borderRadius: 8,
        marginTop: 8,
    },
    backupInfoText: {
        flex: 1,
        fontSize: 12,
        color: colors.success,
        marginLeft: 8,
        lineHeight: 16,
    },
    signatureContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 20,
    },
    signature: {
        fontSize: 11,
        color: colors.textTertiary,
        fontStyle: 'italic',
    },
    pinStatusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.surfaceVariant,
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
    },
    pinStatusInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    pinStatusText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },
    toggleButton: {
        width: 56,
        height: 32,
        borderRadius: 16,
        padding: 3,
        justifyContent: 'center',
    },
    toggleButtonActive: {
        backgroundColor: '#4CAF50',
        alignItems: 'flex-end',
    },
    toggleButtonInactive: {
        backgroundColor: colors.border,
        alignItems: 'flex-start',
    },
    toggleCircle: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: colors.card,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
    pinDisabledInfo: {
        flexDirection: 'row',
        backgroundColor: colors.warningLight,
        padding: 12,
        borderRadius: 8,
        marginTop: 12,
        gap: 10,
    },
    pinDisabledText: {
        flex: 1,
        fontSize: 13,
        color: colors.warning,
        lineHeight: 18,
    },
    separator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 20,
    },
    separatorLine: {
        flex: 1,
        height: 1,
        backgroundColor: colors.border,
    },
    separatorText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textSecondary,
        marginHorizontal: 12,
        textTransform: 'uppercase',
    },
});

