import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';

export default function ExportReminderModal({ visible, onClose, onExport }) {
    const { colors } = useTheme();
    const styles = createStyles(colors);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="cloud-upload-outline" size={48} color="#45beffff" />
                    </View>

                    <Text style={styles.title}>Protege tus Datos</Text>

                    <Text style={styles.message}>
                        Han pasado varios días desde tu último respaldo manual.
                        {'\n\n'}
                        Aunque tenemos respaldos automáticos locales, te recomendamos exportar tus datos y guardarlos en la nube (Google Drive, WhatsApp, etc.) para mayor seguridad.
                    </Text>

                    <View style={styles.infoBox}>
                        <Ionicons name="information-circle" size={18} color="#3498db" />
                        <Text style={styles.infoText}>
                            Los respaldos locales se pierden si el dispositivo se daña o se pierde.
                        </Text>
                    </View>

                    <View style={styles.buttons}>
                        <TouchableOpacity
                            style={[styles.button, styles.buttonSecondary]}
                            onPress={onClose}
                        >
                            <Text style={styles.buttonTextSecondary}>Más Tarde</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, styles.buttonPrimary]}
                            onPress={() => {
                                onClose();
                                onExport();
                            }}
                        >
                            <Ionicons name="download-outline" size={18} color="#FFF" />
                            <Text style={styles.buttonTextPrimary}>Exportar Ahora</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const createStyles = (colors) => StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    container: {
        backgroundColor: colors.surface,
        borderRadius: 20,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    iconContainer: {
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: colors.text,
        textAlign: 'center',
        marginBottom: 12,
    },
    message: {
        fontSize: 15,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 16,
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: colors.infoLight,
        padding: 12,
        borderRadius: 8,
        marginBottom: 20,
        gap: 10,
    },
    infoText: {
        flex: 1,
        fontSize: 12,
        color: colors.info,
        lineHeight: 16,
    },
    buttons: {
        flexDirection: 'row',
        gap: 12,
    },
    button: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 10,
        gap: 6,
    },
    buttonPrimary: {
        backgroundColor: '#45beffff',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    buttonSecondary: {
        backgroundColor: colors.surfaceVariant,
        borderWidth: 1,
        borderColor: colors.border,
    },
    buttonTextPrimary: {
        fontSize: 15,
        fontWeight: '600',
        color: '#FFF',
    },
    buttonTextSecondary: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.text,
    },
});
