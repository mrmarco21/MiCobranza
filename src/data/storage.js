import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  clientas: 'clientas',
  CUENTAS: 'cuentas',
  MOVIMIENTOS: 'movimientos',
  CATEGORIAS: 'categorias',
  PIN: 'user_pin',
  PIN_ATTEMPTS: 'pin_attempts',
  STORE_NAME: 'store_name',
  STORE_LOGO: 'store_logo',
  GASTOS: 'gastos',
  PEDIDOS: 'pedidos',
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

// Funciones para manejo de PIN
export const savePin = async (pin) => {
  await AsyncStorage.setItem(KEYS.PIN, pin);
};

export const getPin = async () => {
  return await AsyncStorage.getItem(KEYS.PIN);
};

export const deletePin = async () => {
  await AsyncStorage.removeItem(KEYS.PIN);
  await AsyncStorage.removeItem(KEYS.PIN_ATTEMPTS);
};

export const savePinAttempts = async (attempts) => {
  await AsyncStorage.setItem(KEYS.PIN_ATTEMPTS, JSON.stringify({ count: attempts }));
};

export const getPinAttempts = async () => {
  const data = await AsyncStorage.getItem(KEYS.PIN_ATTEMPTS);
  return data ? JSON.parse(data).count : 0;
};

export { KEYS };
