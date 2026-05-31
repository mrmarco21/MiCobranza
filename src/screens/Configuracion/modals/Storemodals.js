import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

const STORE_LOGO_KEY = 'store_logo';

/**
 * Agrupa toda la lógica de modales relacionados a personalización de la tienda.
 * Recibe showModal, showToast, setStoreLogo como dependencias.
 */

export function createStoreModals({ showModal, showToast, setStoreLogo }) {

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

    const handleRemoveLogo = () => {
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

    return { handlePickImage, handleRemoveLogo };
}