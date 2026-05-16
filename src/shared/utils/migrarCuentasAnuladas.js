/**
 * Utilidad para migrar cuentas anuladas existentes
 * Marca correctamente las cuentas que fueron anuladas antes de implementar el campo 'anulada'
 */

import * as cuentasRepo from '../../data/cuentasRepository';
import * as ventasRepo from '../../data/ventasRepository';
import * as movimientosRepo from '../../data/movimientosRepository';

export const migrarCuentasAnuladas = async () => {
  try {
    // console.log('🔄 Iniciando migración de cuentas anuladas...');
    
    // Obtener todas las cuentas
    const todasLasCuentas = await cuentasRepo.getAll();
    // console.log(`📊 Total de cuentas: ${todasLasCuentas.length}`);
    
    // Obtener todas las ventas
    const todasLasVentas = await ventasRepo.getAll();
    
    // Obtener todos los movimientos
    const todosLosMovimientos = await movimientosRepo.getAll();
    
    let cuentasMigradas = 0;
    let cuentasYaMigradas = 0;
    
    for (const cuenta of todasLasCuentas) {
      // Si la cuenta ya tiene el campo 'anulada' definido, saltarla
      if (cuenta.anulada !== undefined) {
        cuentasYaMigradas++;
        continue;
      }
      
      // Buscar si esta cuenta tiene ventas asociadas
      const ventasAsociadas = todasLasVentas.filter(v => v.cuentaId === cuenta.id);
      
      // Verificar si todas las ventas están anuladas
      const todasAnuladas = ventasAsociadas.length > 0 && ventasAsociadas.every(v => v.anulada);
      
      // Verificar si la cuenta no tiene movimientos (indicador de anulación)
      const movimientosCuenta = todosLosMovimientos.filter(m => m.cuentaId === cuenta.id);
      const noTieneMovimientos = movimientosCuenta.length === 0;
      
      // Si la cuenta está cerrada Y (todas las ventas están anuladas O no tiene movimientos)
      // entonces fue anulada
      const fueAnulada = cuenta.estado === 'CERRADA' && (todasAnuladas || noTieneMovimientos);
      
      if (fueAnulada) {
        // console.log(`🔧 Migrando cuenta ${cuenta.id}:`, {
        //   ventasAsociadas: ventasAsociadas.length,
        //   todasAnuladas,
        //   movimientos: movimientosCuenta.length,
        //   estado: cuenta.estado
        // });
        
        // Marcar la cuenta como anulada
        await cuentasRepo.update(cuenta.id, {
          anulada: true
        });
        
        cuentasMigradas++;
      //   console.log(`✅ Cuenta ${cuenta.id} marcada como anulada`);
      // } else {
      //   // Marcar explícitamente como NO anulada
      //   await cuentasRepo.update(cuenta.id, {
      //     anulada: false
      //   });
      }
    }
    
    // console.log(`🎉 Migración completada.`);
    // console.log(`   - Cuentas migradas (marcadas como anuladas): ${cuentasMigradas}`);
    // console.log(`   - Cuentas ya migradas: ${cuentasYaMigradas}`);
    // console.log(`   - Total procesadas: ${todasLasCuentas.length}`);
    
    return { 
      success: true, 
      cuentasMigradas,
      cuentasYaMigradas,
      totalProcesadas: todasLasCuentas.length
    };
    
  } catch (error) {
    console.error('❌ Error al migrar cuentas:', error);
    return { success: false, error: error.message };
  }
};
