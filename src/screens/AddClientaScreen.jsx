import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, BackHandler } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { registrarClienta, actualizarClienta, obtenerClientaPorId } from '../logic/clientasService';
import Header from '../components/Header';
import CustomModal from '../components/CustomModal';
import Toast from '../components/Toast';
import { useTheme } from '../hooks/useTheme';

export default function Addclientascreen({ route, navigation }) {
    const clientaId = route.params?.clientaId;
    const esEdicion = !!clientaId;
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();

    const [nombre, setNombre] = useState('');
    const [referencia, setReferencia] = useState('');
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [modalConfig, setModalConfig] = useState({});
    const [toastVisible, setToastVisible] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

    useEffect(() => {
        if (esEdicion) {
            cargarClienta();
        }

        // Manejar el botón de retroceso del hardware
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            navigation.goBack();
            return true;
        });

        return () => backHandler.remove();
    }, [clientaId]);

    const cargarClienta = async () => {
        const clienta = await obtenerClientaPorId(clientaId);
        if (clienta) {
            setNombre(clienta.nombre);
            setReferencia(clienta.referencia || '');
        }
    };

    const showModal = (config) => {
        setModalConfig(config);
        setModalVisible(true);
    };

    const showToast = (message) => {
        setToastMessage(message);
        setToastVisible(true);
    };

    const handleGuardar = async () => {
        if (!nombre.trim()) {
            showModal({
                type: 'error',
                title: 'Campo requerido',
                message: 'El nombre es obligatorio',
            });
            return;
        }

        setLoading(true);
        try {
            if (esEdicion) {
                await actualizarClienta(clientaId, { nombre, referencia });
                showToast('Cliente actualizado correctamente');
                setTimeout(() => navigation.goBack(), 1500);
            } else {
                await registrarClienta({ nombre, referencia });
                showToast('Cliente registrado correctamente');
                // Simplemente regresar a la pantalla anterior
                setTimeout(() => navigation.goBack(), 1500);
            }
        } catch (error) {
            showModal({
                type: 'error',
                title: 'Error',
                message: error.message,
            });
            setLoading(false);
        }
    };

    const styles = createStyles(colors);

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <Header title={esEdicion ? "Editar Cliente" : "Nuevo Cliente"} showBack />
            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
            >
                {/* Header informativo */}
                <View style={styles.headerInfo}>
                    <View style={styles.iconoHeader}>
                        <Ionicons name={esEdicion ? "create-outline" : "person-add"} size={25} color="#29B6F6" />
                    </View>
                    <Text style={styles.titulo}>{esEdicion ? "Editar Cliente" : "Nuevo Cliente"}</Text>
                    <Text style={styles.subtitulo}>
                        {esEdicion ? "Modifica la información del cliente" : "Complete la información del cliente"}
                    </Text>
                </View>

                {/* Formulario */}
                <View style={styles.formulario}>
                    {/* Campo Nombre */}
                    <View style={styles.campoContainer}>
                        <Text style={styles.label}>
                            Nombre completo
                            <Text style={styles.requerido}> *</Text>
                        </Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="person-outline" size={20} color="#A0A0A0" style={styles.inputIcono} />
                            <TextInput
                                style={styles.input}
                                value={nombre}
                                onChangeText={setNombre}
                                placeholder="Ej: María González"
                                placeholderTextColor="#A0A0A0"
                            />
                        </View>
                    </View>

                    {/* Campo Referencia */}
                    <View style={styles.campoContainer}>
                        <Text style={styles.label}>Referencia (quién la recomendó)</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="people-outline" size={20} color="#A0A0A0" style={styles.inputIcono} />
                            <TextInput
                                style={styles.input}
                                value={referencia}
                                onChangeText={setReferencia}
                                placeholder="Ej: Recomendada por Ana López"
                                placeholderTextColor="#A0A0A0"
                            />
                        </View>
                    </View>

                    {/* Nota informativa */}
                    <View style={styles.notaContainer}>
                        <Ionicons name="information-circle-outline" size={18} color="#29B6F6" />
                        <Text style={styles.notaTexto}>
                            El campo marcado con * es obligatorios
                        </Text>
                    </View>
                </View>
            </ScrollView>

            {/* Botón de guardar fijo */}
            <View style={[styles.footerContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                <TouchableOpacity
                    style={[styles.botonGuardar, loading && styles.botonDisabled]}
                    onPress={handleGuardar}
                    activeOpacity={0.8}
                    disabled={loading}
                >
                    <Ionicons name="checkmark-circle" size={24} color="#636E72" />
                    <Text style={styles.botonGuardarTexto}>
                        {esEdicion ? "Guardar cambios" : "Guardar Cliente"}
                    </Text>
                </TouchableOpacity>
            </View>

            <CustomModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                {...modalConfig}
            />

            <Toast
                visible={toastVisible}
                message={toastMessage}
                type="success"
                onHide={() => setToastVisible(false)}
            />
        </KeyboardAvoidingView>
    );
}

const createStyles = (colors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background
    },
    scrollView: {
        flex: 1,
    },
    headerInfo: {
        backgroundColor: colors.card,
        paddingTop: 24,
        paddingBottom: 24,
        paddingHorizontal: 20,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    iconoHeader: {
        width: 60,
        height: 60,
        borderRadius: 35,
        backgroundColor: '#E1F5FE',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    titulo: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 6,
    },
    subtitulo: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    formulario: {
        padding: 20,
    },
    campoContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 8,
    },
    requerido: {
        color: '#FF6B6B',
        fontWeight: '700',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        borderWidth: 1,
        borderColor: colors.border,
    },
    inputIcono: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: colors.text,
        padding: 0,
    },
    notaContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E1F5FE',
        padding: 12,
        borderRadius: 10,
        marginTop: 8,
    },
    notaTexto: {
        fontSize: 13,
        color: '#45beffff',
        marginLeft: 8,
        flex: 1,
    },
    footerContainer: {
        backgroundColor: colors.card,
        paddingHorizontal: 20,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 5,
    },
    botonGuardar: {
        backgroundColor: colors.surfaceVariant,
        paddingVertical: 16,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    botonGuardarTexto: {
        color: colors.text,
        fontSize: 17,
        fontWeight: '700',
        marginLeft: 8,
    },
    botonDisabled: {
        opacity: 0.6,
    },
})

