import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { registrarClienta, actualizarClienta, obtenerClientaPorId } from '../logic/clientasService';
import Header from '../components/Header';
import CustomModal from '../components/CustomModal';
import Toast from '../components/Toast';

export default function AddClientaScreen({ route, navigation }) {
    const clientaId = route.params?.clientaId;
    const esEdicion = !!clientaId;

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
                showToast('Clienta actualizada correctamente');
            } else {
                await registrarClienta({ nombre, referencia });
                showToast('Clienta registrada correctamente');
            }
            setTimeout(() => navigation.goBack(), 1500);
        } catch (error) {
            showModal({
                type: 'error',
                title: 'Error',
                message: error.message,
            });
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <Header title={esEdicion ? "Editar Clienta" : "Nueva Clienta"} showBack />
            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
            >
                {/* Header informativo */}
                <View style={styles.headerInfo}>
                    <View style={styles.iconoHeader}>
                        <Ionicons name={esEdicion ? "create-outline" : "person-add"} size={25} color="#6C5CE7" />
                    </View>
                    <Text style={styles.titulo}>{esEdicion ? "Editar Clienta" : "Nueva Clienta"}</Text>
                    <Text style={styles.subtitulo}>
                        {esEdicion ? "Modifica la información de la clienta" : "Complete la información de la clienta"}
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
                        <Ionicons name="information-circle-outline" size={18} color="#6C5CE7" />
                        <Text style={styles.notaTexto}>
                            El campo marcado con * es obligatorios
                        </Text>
                    </View>
                </View>
            </ScrollView>

            {/* Botón de guardar fijo */}
            <View style={styles.footerContainer}>
                <TouchableOpacity
                    style={[styles.botonGuardar, loading && styles.botonDisabled]}
                    onPress={handleGuardar}
                    activeOpacity={0.8}
                    disabled={loading}
                >
                    <Ionicons name="checkmark-circle" size={24} color="#636E72" />
                    <Text style={styles.botonGuardarTexto}>
                        {esEdicion ? "Guardar cambios" : "Guardar Clienta"}
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFBFC'
    },
    scrollView: {
        flex: 1,
    },
    headerInfo: {
        backgroundColor: '#FFFFFF',
        paddingTop: 24,
        paddingBottom: 24,
        paddingHorizontal: 20,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    iconoHeader: {
        width: 60,
        height: 60,
        borderRadius: 35,
        backgroundColor: '#F0EBFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    titulo: {
        fontSize: 24,
        fontWeight: '700',
        color: '#2D3436',
        marginBottom: 6,
    },
    subtitulo: {
        fontSize: 14,
        color: '#636E72',
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
        color: '#2D3436',
        marginBottom: 8,
    },
    requerido: {
        color: '#FF6B6B',
        fontWeight: '700',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    inputIcono: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#2D3436',
        padding: 0,
    },
    notaContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0EBFF',
        padding: 12,
        borderRadius: 10,
        marginTop: 8,
    },
    notaTexto: {
        fontSize: 13,
        color: '#6C5CE7',
        marginLeft: 8,
        flex: 1,
    },
    footerContainer: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 5,
    },
    botonGuardar: {
        backgroundColor: '#F8F9FA',
        paddingVertical: 16,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    botonGuardarTexto: {
        color: '#2D3436',
        fontSize: 17,
        fontWeight: '700',
        marginLeft: 8,
    },
    botonDisabled: {
        opacity: 0.6,
    },
})