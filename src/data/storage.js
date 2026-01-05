import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  CLIENTAS: 'clientas',
  CUENTAS: 'cuentas',
  MOVIMIENTOS: 'movimientos',
};

export const getData = async (key) => {
  const data = await AsyncStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

export const setData = async (key, data) => {
  await AsyncStorage.setItem(key, JSON.stringify(data));
};

// Función para limpiar todos los datos
export const clearAllData = async () => {
  await AsyncStorage.clear();
  console.log('Todos los datos han sido eliminados');
};

export { KEYS };
