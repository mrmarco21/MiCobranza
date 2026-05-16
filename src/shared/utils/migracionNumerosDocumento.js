import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS } from '../../data/storage';

/**
 * Migración de números de documento al nuevo formato AAMM-0001
 * 
 * Convierte números antiguos como "03-0001" a formato mensual "2605-0001"
 * basándose en la fecha de la venta
 */
export const migrarNumerosDocumento = async () => {
  try {
    // console.log('🔄 Iniciando migración de números de documento...');
    
    // Obtener todas las ventas
    const ventasStr = await AsyncStorage.getItem(KEYS.VENTAS);
    if (!ventasStr) {
      // console.log('✅ No hay ventas para migrar');
      return { success: true, migradas: 0 };
    }
    
    const ventas = JSON.parse(ventasStr);
    let ventasMigradas = 0;
    
    // Agrupar ventas por mes para generar números correlativos
    const ventasPorMes = {};
    
    // Ordenar ventas por fecha (más antiguas primero)
    const ventasOrdenadas = ventas.sort((a, b) => 
      new Date(a.fecha || a.createdAt) - new Date(b.fecha || b.createdAt)
    );
    
    ventasOrdenadas.forEach(venta => {
      // Si ya tiene el formato nuevo (AAMM-0001), no migrar
      if (venta.numeroDocumento && /^\d{4}-\d{4}$/.test(venta.numeroDocumento)) {
        return;
      }
      
      // Obtener fecha de la venta
      const fechaVenta = new Date(venta.fecha || venta.createdAt);
      const year = fechaVenta.getFullYear().toString().slice(-2);
      const month = String(fechaVenta.getMonth() + 1).padStart(2, '0');
      const claveMs = `${year}${month}`;
      
      // Inicializar contador para este mes si no existe
      if (!ventasPorMes[claveMs]) {
        ventasPorMes[claveMs] = [];
      }
      
      ventasPorMes[claveMs].push(venta);
    });
    
    // Asignar números correlativos por mes
    Object.keys(ventasPorMes).forEach(claveMs => {
      const ventasDelMes = ventasPorMes[claveMs];
      
      ventasDelMes.forEach((venta, index) => {
        const numeroCorrelativo = (index + 1).toString().padStart(4, '0');
        const nuevoNumero = `${claveMs}-${numeroCorrelativo}`;
        
        // Actualizar el número de documento
        venta.numeroDocumento = nuevoNumero;
        ventasMigradas++;
        
        // console.log(`📝 Migrado: ${venta.numeroDocumento} (${new Date(venta.fecha).toLocaleDateString()})`);
      });
    });
    
    // Guardar ventas actualizadas
    if (ventasMigradas > 0) {
      await AsyncStorage.setItem(KEYS.VENTAS, JSON.stringify(ventas));
      // console.log(`✅ Migración completada: ${ventasMigradas} ventas actualizadas`);
    } else {
      // console.log('✅ No hay ventas que migrar');
    }
    
    return { success: true, migradas: ventasMigradas };
  } catch (error) {
    console.error('❌ Error en migración de números de documento:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Verificar si es necesario ejecutar la migración
 */
export const necesitaMigracion = async () => {
  try {
    const ventasStr = await AsyncStorage.getItem(KEYS.VENTAS);
    if (!ventasStr) return false;
    
    const ventas = JSON.parse(ventasStr);
    
    // Verificar si hay alguna venta con formato antiguo
    const tieneFormatoAntiguo = ventas.some(venta => {
      if (!venta.numeroDocumento) return true;
      // Formato antiguo: "03-0001" o similar
      // Formato nuevo: "2605-0001"
      return !/^\d{4}-\d{4}$/.test(venta.numeroDocumento);
    });
    
    return tieneFormatoAntiguo;
  } catch (error) {
    console.error('Error al verificar migración:', error);
    return false;
  }
};
