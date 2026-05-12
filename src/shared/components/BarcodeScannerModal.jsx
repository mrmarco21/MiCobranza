import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Alert, Dimensions } from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';

const { width, height } = Dimensions.get('window');

export default function BarcodeScannerModal({ visible, onClose, onBarcodeScanned }) {
    const { colors } = useTheme();
    const [hasPermission, setHasPermission] = useState(null);
    const [scanned, setScanned] = useState(false);

    useEffect(() => {
        if (visible) {
            requestCameraPermission();
            setScanned(false);
        }
    }, [visible]);

    const requestCameraPermission = async () => {
        try {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === 'granted');

            if (status !== 'granted') {
                Alert.alert(
                    'Permiso necesario',
                    'Se necesita permiso para usar la cámara y escanear códigos de barra',
                    [{ text: 'OK', onPress: onClose }]
                );
            }
        } catch (error) {
            console.error('Error requesting camera permission:', error);
            Alert.alert('Error', 'No se pudo solicitar permiso para la cámara');
            onClose();
        }
    };

    const handleBarCodeScanned = ({ type, data }) => {
        if (!scanned) {
            setScanned(true);
            onBarcodeScanned(data);
            onClose();
        }
    };

    const styles = createStyles(colors);

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={onClose}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="close" size={28} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Escanear Código de Barras</Text>
                    <View style={styles.placeholder} />
                </View>

                {/* Camera View */}
                {hasPermission === null ? (
                    <View style={styles.loadingContainer}>
                        <Text style={styles.loadingText}>Solicitando permiso de cámara...</Text>
                    </View>
                ) : hasPermission === false ? (
                    <View style={styles.loadingContainer}>
                        <Ionicons name="camera-off" size={64} color="#95A5A6" />
                        <Text style={styles.errorText}>No hay acceso a la cámara</Text>
                        <Text style={styles.errorSubtext}>
                            Por favor, habilita el permiso de cámara en la configuración
                        </Text>
                    </View>
                ) : (
                    <View style={styles.cameraContainer}>
                        <CameraView
                            style={styles.camera}
                            facing="back"
                            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                            barcodeScannerSettings={{
                                barcodeTypes: [
                                    'ean13',
                                    'ean8',
                                    'upc_a',
                                    'upc_e',
                                    'code39',
                                    'code128',
                                    'qr',
                                ],
                            }}
                        />

                        {/* Overlay con marco de escaneo */}
                        <View style={styles.overlay}>
                            <View style={styles.overlayTop} />
                            <View style={styles.overlayMiddle}>
                                <View style={styles.overlaySide} />
                                <View style={styles.scanFrame}>
                                    {/* Esquinas del marco */}
                                    <View style={[styles.corner, styles.cornerTopLeft]} />
                                    <View style={[styles.corner, styles.cornerTopRight]} />
                                    <View style={[styles.corner, styles.cornerBottomLeft]} />
                                    <View style={[styles.corner, styles.cornerBottomRight]} />
                                </View>
                                <View style={styles.overlaySide} />
                            </View>
                            <View style={styles.overlayBottom}>
                                <Text style={styles.instructionText}>
                                    Coloca el código de barras dentro del marco
                                </Text>
                            </View>
                        </View>
                    </View>
                )}
            </View>
        </Modal>
    );
}

const createStyles = (colors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 50,
        paddingBottom: 16,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
    },
    closeButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFF',
    },
    placeholder: {
        width: 44,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        fontSize: 16,
        color: '#FFF',
        marginTop: 16,
    },
    errorText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFF',
        marginTop: 16,
        textAlign: 'center',
    },
    errorSubtext: {
        fontSize: 14,
        color: '#BDC3C7',
        marginTop: 8,
        textAlign: 'center',
    },
    cameraContainer: {
        flex: 1,
        position: 'relative',
    },
    camera: {
        flex: 1,
    },
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    overlayTop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    overlayMiddle: {
        flexDirection: 'row',
        height: 250,
    },
    overlaySide: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    scanFrame: {
        width: width * 0.7,
        height: 250,
        position: 'relative',
    },
    corner: {
        position: 'absolute',
        width: 30,
        height: 30,
        borderColor: '#29B6F6',
    },
    cornerTopLeft: {
        top: 0,
        left: 0,
        borderTopWidth: 4,
        borderLeftWidth: 4,
    },
    cornerTopRight: {
        top: 0,
        right: 0,
        borderTopWidth: 4,
        borderRightWidth: 4,
    },
    cornerBottomLeft: {
        bottom: 0,
        left: 0,
        borderBottomWidth: 4,
        borderLeftWidth: 4,
    },
    cornerBottomRight: {
        bottom: 0,
        right: 0,
        borderBottomWidth: 4,
        borderRightWidth: 4,
    },
    overlayBottom: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    instructionText: {
        fontSize: 16,
        color: '#FFF',
        textAlign: 'center',
        fontWeight: '500',
    },
});
