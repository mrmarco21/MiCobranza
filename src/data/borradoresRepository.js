import AsyncStorage from '@react-native-async-storage/async-storage';

const BORRADORES_KEY = '@borradores_punto_venta';

// Obtener todos los borradores
export const getBorradores = async () => {
    try {
        const borradoresStr = await AsyncStorage.getItem(BORRADORES_KEY);
        if (borradoresStr) {
            const borradores = JSON.parse(borradoresStr);
            // Ordenar por timestamp descendente (más reciente primero)
            return borradores.sort((a, b) => b.timestamp - a.timestamp);
        }
        return [];
    } catch (error) {
        console.error('Error al obtener borradores:', error);
        return [];
    }
};

// Guardar un nuevo borrador
export const guardarBorrador = async (borrador) => {
    try {
        const borradores = await getBorradores();
        const nuevoBorrador = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            ...borrador,
        };
        borradores.push(nuevoBorrador);
        await AsyncStorage.setItem(BORRADORES_KEY, JSON.stringify(borradores));
        return nuevoBorrador;
    } catch (error) {
        console.error('Error al guardar borrador:', error);
        throw error;
    }
};

// Eliminar un borrador
export const eliminarBorrador = async (borradorId) => {
    try {
        const borradores = await getBorradores();
        const borradoresFiltrados = borradores.filter(b => b.id !== borradorId);
        await AsyncStorage.setItem(BORRADORES_KEY, JSON.stringify(borradoresFiltrados));
    } catch (error) {
        console.error('Error al eliminar borrador:', error);
        throw error;
    }
};

// Limpiar todos los borradores
export const limpiarBorradores = async () => {
    try {
        await AsyncStorage.removeItem(BORRADORES_KEY);
    } catch (error) {
        console.error('Error al limpiar borradores:', error);
        throw error;
    }
};
