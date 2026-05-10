import { useState, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider } from './src/shared/context/ThemeContext';
import { ToastProvider } from './src/shared/context/ToastContext';
import AppNavigator from './src/navigation/AppNavigator';
import SplashScreen from './src/screens/Splash/SplashScreen';
import PinScreen from './src/screens/Pin/PinScreen';
import { migrarCategoriasProductosVendidos } from './src/shared/utils/migraciones';
import { useImageMigration } from './src/shared/hooks/useImageMigration';
import { useAutoBackup } from './src/shared/hooks/useAutoBackup';
import { migrarNumerosDocumento, necesitaMigracion } from './src/shared/utils/migracionNumerosDocumento';

const DEFAULT_LOCK_TIMEOUT = 60000; // 60 segundos por defecto
const LAST_ACTIVE_KEY = 'last_active_time';
const LOCK_TIMEOUT_KEY = 'lock_timeout';
const PIN_KEY = 'user_pin';
const PIN_ENABLED_KEY = 'pin_enabled';
const MIGRATION_CATEGORIAS_KEY = 'migration_categorias_v1_completed';
const MIGRATION_NUMEROS_DOC_KEY = 'migration_numeros_documento_v1_completed';

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [appState, setAppState] = useState('active');
  const [lockTimeout, setLockTimeout] = useState(DEFAULT_LOCK_TIMEOUT);
  const [hasPin, setHasPin] = useState(false);
  const [pinEnabled, setPinEnabled] = useState(true);
  const appStateRef = useRef('active');
  const [showExportReminder, setShowExportReminder] = useState(false);

  // Ejecutar migración de imágenes automáticamente
  useImageMigration();

  // Ejecutar respaldos automáticos y recordatorios
  useAutoBackup(() => {
    // Mostrar recordatorio de exportación
    setShowExportReminder(true);
  });

  useEffect(() => {
    checkPinStatus();
    loadLockTimeout();
    ejecutarMigraciones();
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Revisar periódicamente si se debe forzar el setup del PIN
    const interval = setInterval(async () => {
      const forcePinSetup = await AsyncStorage.getItem('force_pin_setup');
      if (forcePinSetup === 'true') {
        await checkPinStatus();
      }
    }, 1000);

    return () => {
      subscription?.remove();
      clearInterval(interval);
    };
  }, [isAuthenticated]);

  const ejecutarMigraciones = async () => {
    try {
      // Migración 1: Categorías en productos vendidos
      const migracionCategoriasCompletada = await AsyncStorage.getItem(MIGRATION_CATEGORIAS_KEY);
      
      if (!migracionCategoriasCompletada) {
        console.log('🔄 Ejecutando migración de categorías en productos vendidos...');
        const resultado = await migrarCategoriasProductosVendidos();
        
        if (resultado.success) {
          await AsyncStorage.setItem(MIGRATION_CATEGORIAS_KEY, 'true');
          console.log('✅ Migración de categorías completada exitosamente');
        } else {
          console.error('❌ Error en migración de categorías:', resultado.error);
        }
      }

      // Migración 2: Números de documento al formato AAMM-0001
      const migracionNumerosCompletada = await AsyncStorage.getItem(MIGRATION_NUMEROS_DOC_KEY);
      
      if (!migracionNumerosCompletada) {
        const necesita = await necesitaMigracion();
        
        if (necesita) {
          console.log('🔄 Ejecutando migración de números de documento...');
          const resultado = await migrarNumerosDocumento();
          
          if (resultado.success) {
            await AsyncStorage.setItem(MIGRATION_NUMEROS_DOC_KEY, 'true');
            console.log(`✅ Migración de números de documento completada: ${resultado.migradas} ventas actualizadas`);
          } else {
            console.error('❌ Error en migración de números de documento:', resultado.error);
          }
        } else {
          // Marcar como completada si no hay nada que migrar
          await AsyncStorage.setItem(MIGRATION_NUMEROS_DOC_KEY, 'true');
          console.log('✅ No hay números de documento para migrar');
        }
      }
    } catch (error) {
      console.error('❌ Error ejecutando migraciones:', error);
    }
  };

  const checkPinStatus = async () => {
    try {
      const pin = await AsyncStorage.getItem(PIN_KEY);
      const enabled = await AsyncStorage.getItem(PIN_ENABLED_KEY);
      const forcePinSetup = await AsyncStorage.getItem('force_pin_setup');
      
      // Si se forzó la configuración del PIN, eliminar el flag y mostrar pantalla de PIN
      if (forcePinSetup === 'true') {
        await AsyncStorage.removeItem('force_pin_setup');
        setHasPin(false);
        setPinEnabled(true);
        setIsAuthenticated(false);
        return;
      }
      
      setHasPin(!!pin);
      setPinEnabled(enabled !== 'false'); // Por defecto true
    } catch (error) {
      console.error('Error checking PIN status:', error);
    }
  };

  const loadLockTimeout = async () => {
    try {
      const timeout = await AsyncStorage.getItem(LOCK_TIMEOUT_KEY);
      if (timeout) {
        setLockTimeout(parseInt(timeout));
      }
    } catch (error) {
      console.error('Error loading lock timeout:', error);
    }
  };

  const handleAppStateChange = async (nextAppState) => {
    // Si la app pasa a background (inactive o background)
    if (
      appStateRef.current === 'active' &&
      (nextAppState === 'inactive' || nextAppState === 'background')
    ) {
      // Guardar el tiempo actual
      await AsyncStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
    }

    // Si la app vuelve a foreground (active)
    if (
      (appStateRef.current === 'inactive' || appStateRef.current === 'background') &&
      nextAppState === 'active' &&
      isAuthenticated
    ) {
      // Recargar la configuración por si cambió
      await loadLockTimeout();
      await checkPinStatus();
      
      // Si el PIN no está activado, no bloquear
      if (!pinEnabled) {
        appStateRef.current = nextAppState;
        setAppState(nextAppState);
        return;
      }
      
      // Si lockTimeout es -1, nunca bloquear automáticamente
      if (lockTimeout === -1) {
        appStateRef.current = nextAppState;
        setAppState(nextAppState);
        return;
      }

      // Si lockTimeout es 0, bloquear inmediatamente
      if (lockTimeout === 0) {
        setIsAuthenticated(false);
        appStateRef.current = nextAppState;
        setAppState(nextAppState);
        return;
      }

      // Verificar cuánto tiempo pasó
      const lastActiveTime = await AsyncStorage.getItem(LAST_ACTIVE_KEY);
      if (lastActiveTime) {
        const timePassed = Date.now() - parseInt(lastActiveTime);
        
        // Si pasó más del tiempo límite, pedir PIN nuevamente
        if (timePassed > lockTimeout) {
          setIsAuthenticated(false);
        }
      }
    }

    appStateRef.current = nextAppState;
    setAppState(nextAppState);
  };

  if (isLoading) {
    return (
      <>
        <SplashScreen onFinish={() => setIsLoading(false)} />
        <StatusBar style="light" />
      </>
    );
  }

  if (!isAuthenticated) {
    // Si el PIN está desactivado, saltar directamente a la app (sin importar si existe o no)
    if (!pinEnabled) {
      return (
        <ThemeProvider>
          <SafeAreaProvider>
            <ToastProvider>
              <NavigationContainer>
                <AppNavigator />
                <StatusBar style="light" />
              </NavigationContainer>
            </ToastProvider>
          </SafeAreaProvider>
        </ThemeProvider>
      );
    }

    // Si el PIN está activado, mostrar pantalla de autenticación
    return (
      <ThemeProvider>
        <SafeAreaProvider>
          <ToastProvider>
            <PinScreen onSuccess={() => {
              setIsAuthenticated(true);
              checkPinStatus(); // Recargar estado después de crear PIN
            }} />
            <StatusBar style="dark" />
          </ToastProvider>
        </SafeAreaProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <ToastProvider>
          <NavigationContainer>
            <AppNavigator />
            <StatusBar style="light" />
          </NavigationContainer>
        </ToastProvider>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
