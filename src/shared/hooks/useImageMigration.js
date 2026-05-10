import { useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { migrateBase64ImagesToFiles } from '../../data/productosRepository';

const MIGRATION_KEY = 'image_migration_completed';

/**
 * Hook para migrar automáticamente imágenes Base64 a archivos
 * Solo se ejecuta una vez por instalación
 */
export const useImageMigration = () => {
  const hasRun = useRef(false);

  useEffect(() => {
    const runMigration = async () => {
      // Evitar ejecuciones múltiples
      if (hasRun.current) return;
      hasRun.current = true;

      try {
        // Verificar si la migración ya se ejecutó
        const migrationCompleted = await AsyncStorage.getItem(MIGRATION_KEY);
        
        if (migrationCompleted === 'true') {
          console.log('✅ Migración de imágenes ya completada anteriormente');
          return;
        }

        console.log('🔄 Iniciando migración de imágenes Base64 a archivos...');
        
        // Ejecutar migración
        const result = await migrateBase64ImagesToFiles();
        
        if (result.success) {
          // Marcar migración como completada
          await AsyncStorage.setItem(MIGRATION_KEY, 'true');
          
          if (result.migrated > 0) {
            console.log(`✅ Migración exitosa: ${result.migrated} imágenes migradas`);
          }
        } else {
          console.error('❌ Error en migración:', result.error);
        }
      } catch (error) {
        console.error('❌ Error ejecutando migración:', error);
      }
    };

    runMigration();
  }, []);
};

/**
 * Función para forzar una nueva migración (útil para desarrollo/testing)
 */
export const resetMigration = async () => {
  await AsyncStorage.removeItem(MIGRATION_KEY);
  console.log('🔄 Flag de migración reseteado');
};
