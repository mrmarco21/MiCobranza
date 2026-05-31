import AsyncStorage from '@react-native-async-storage/async-storage';

const PIN_KEY = 'user_pin';
const PIN_ENABLED_KEY = 'pin_enabled';
const SECURITY_QUESTION_KEY = 'security_question';
const SECURITY_ANSWER_KEY = 'security_answer';

/**
 * Agrupa toda la lógica de modales relacionados a seguridad y PIN.
 * Recibe showModal, showToast, pinEnabled, setPinEnabled, loadSettings como dependencias.
 */

export function createSecurityModals({ showModal, showToast, pinEnabled, setPinEnabled, loadSettings }) {

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
                            showToast(`No se pudo ${newState ? 'activar' : 'desactivar'} el PIN`, 'error');
                        }
                    },
                },
            ],
        });
    };

    const handleCreatePin = async () => {
        try {
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
                            loadSettings();
                        },
                    },
                ],
            });
        } catch (error) {
            showToast('Error al activar el PIN', 'error');
        }
    };

    return { handleChangePinSecurity, handleDisablePin, handleCreatePin };
}