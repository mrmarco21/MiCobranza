import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { registrarMovimiento, editarMovimiento, obtenerMovimientoPorId } from '../logic/movimientosService';
import { abrirNuevaCuenta } from '../logic/cuentasService';
import Header from '../components/Header';
import CustomModal from '../components/CustomModal';
import Toast from '../components/Toast';

export default function AddMovimientoScreen({ route, navigation }) {
    const { cuentaId, clientaId, nuevaCuenta, tipo, movimientoId } = route.params;
    const [monto, setMonto] = useState('');
    const [comentario, setComentario] = useState('');
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [modalConfig, setModalConfig] = useState({});
    const [toastVisible, setToastVisible] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

    const esEdicion = !!movimientoId;
    const esCargo = tipo === 'CARGO';

    const showModal = (config) => {
        setModalConfig(config);
        setModalVisible(true);
    };

    const showToast = (message) => {
        setToastMessage(message);
        setToastVisible(true);
    };

    useEffect(() => {
        if (esEdicion) {
            cargarMovimiento();
        }
    }, [movimientoId]);

    const cargarMovimiento = async () => {
        const mov = await obtenerMovimientoPorId(movimientoId);
        if (mov) {
            setMonto(mov.monto.toString());
            setComentario(mov.comentario || '');
        }
    };

    const handleGuardar = async () => {
        const montoNum = parseFloat(monto);
        if (!monto || isNaN(montoNum) || montoNum <= 0) {
            showModal({
                type: 'error',
                title: 'Monto inválido',
                message: 'Ingresa un monto válido mayor a cero',
            });
            return;
        }

        setLoading(true);
        try {
            if (esEdicion) {
                await editarMovimiento(movimientoId, montoNum, comentario);
                showToast('Movimiento actualizado correctamente');
            } else {
                let idCuenta = cuentaId;

                if (nuevaCuenta && clientaId) {
                    const cuenta = await abrirNuevaCuenta(clientaId);
                    idCuenta = cuenta.id;
                }

                await registrarMovimiento(idCuenta, tipo, montoNum, comentario);
                showToast(esCargo ? 'Cargo registrado correctamente' : 'Abono registrado correctamente');
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
            <Header title={esEdicion ? 'Editar Movimiento' : (esCargo ? 'Nuevo Cargo' : 'Nuevo Abono')} showBack />
            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
            >
                {/* Header del tipo de movimiento */}
                <View style={styles.headerInfo}>
                    <View style={[styles.iconoHeader, esCargo ? styles.iconoCargo : styles.iconoAbono]}>
                        <Ionicons
                            name={esEdicion ? "create-outline" : (esCargo ? "arrow-up" : "arrow-down")}
                            size={25}
                            color={esCargo ? "#FF6B6B" : "#4CAF50"}
                        />
                    </View>
                    <Text style={styles.titulo}>
                        {esEdicion ? 'Editar movimiento' : (esCargo ? 'Nuevo cargo' : 'Nuevo abono')}
                    </Text>
                    <Text style={styles.subtitulo}>
                        {esEdicion
                            ? 'Modifica el monto o la descripción'
                            : (esCargo ? 'Aumenta la deuda de la clienta' : 'Reduce la deuda de la clienta')}
                    </Text>
                </View>

                {/* Formulario */}
                <View style={styles.formulario}>
                    {/* Campo Monto */}
                    <View style={styles.campoContainer}>
                        <Text style={styles.label}>
                            Monto
                            <Text style={styles.requerido}> *</Text>
                        </Text>
                        <View style={styles.inputWrapper}>
                            <Text style={styles.monedaSimbolo}>S/</Text>
                            <TextInput
                                style={styles.inputMonto}
                                value={monto}
                                onChangeText={setMonto}
                                placeholder="0.00"
                                placeholderTextColor="#A0A0A0"
                                keyboardType="decimal-pad"
                            />
                        </View>
                    </View>

                    {/* Campo Comentario */}
                    <View style={styles.campoContainer}>
                        <Text style={styles.label}>Descripción</Text>
                        <View style={[styles.inputWrapper, styles.inputMultiline]}>
                            <Ionicons name="document-text-outline" size={20} color="#A0A0A0" style={styles.inputIconoTop} />
                            <TextInput
                                style={[styles.input, styles.inputTextArea]}
                                value={comentario}
                                onChangeText={setComentario}
                                placeholder="Ej: Blusa roja talla M"
                                placeholderTextColor="#A0A0A0"
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                            />
                        </View>
                    </View>

                    {/* Nota informativa */}
                    <View style={styles.notaContainer}>
                        <Ionicons name="information-circle-outline" size={18} color="#636E72" />
                        <Text style={styles.notaTexto}>
                            {esCargo
                                ? 'El cargo se sumará al saldo actual de la cuenta'
                                : 'El abono se restará del saldo actual de la cuenta'}
                        </Text>
                    </View>
                </View>
            </ScrollView>

            {/* Botón de guardar */}
            <View style={styles.footerContainer}>
                <TouchableOpacity
                    style={[styles.botonGuardar, loading && styles.botonDisabled]}
                    onPress={handleGuardar}
                    activeOpacity={0.7}
                    disabled={loading}
                >
                    <Ionicons name="checkmark-outline" size={24} color="#2D3436" />
                    <Text style={styles.botonGuardarTexto}>
                        {esEdicion ? 'Guardar cambios' : `Registrar ${tipo.toLowerCase()}`}
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
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    iconoCargo: {
        backgroundColor: '#FFE5E5',
    },
    iconoAbono: {
        backgroundColor: '#E8F5E9',
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
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    inputMultiline: {
        alignItems: 'flex-start',
        paddingVertical: 12,
    },
    monedaSimbolo: {
        fontSize: 20,
        fontWeight: '600',
        color: '#636E72',
        marginRight: 8,
    },
    inputMonto: {
        flex: 1,
        fontSize: 24,
        fontWeight: '700',
        color: '#2D3436',
        padding: 0,
    },
    inputIconoTop: {
        marginRight: 12,
        marginTop: 2,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#2D3436',
        padding: 0,
    },
    inputTextArea: {
        minHeight: 100,
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
});
