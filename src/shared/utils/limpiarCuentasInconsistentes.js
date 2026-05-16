/**
 * Utilidad para limpiar cuentas inconsistentes
 * Cierra cuentas que tienen ventas anuladas o que no tienen movimientos
 */

import * as cuentasRepo from '../../data/cuentasRepository';
import * as ventasRepo from '../../data/ventasRepository';
import * as movimientosRepo from '../../data/movimientosRepository';

export const limpiarCuentasInconsistentes = async () => {
  try {
    // console.log('🧹 Iniciando limpieza de cuentas inconsistentes...');
    
    // Obtener todas las cuentas
    const todasLasCuentas = await cuentasRepo.getAll();
    // console.log(`📊 Total de cuentas: ${todasLasCuentas.length}`);
    
    // Obtener todas las ventas
    const todasLasVentas = await ventasRepo.getAll();
    
    // Obtener todos los movimientos
    const todosLosMovimientos = await movimientosRepo.getAll();
    
    let cuentasCorregidas = 0;
    
    for (const cuenta of todasLasCuentas) {
      // Buscar si esta cuenta tiene ventas asociadas
      const ventasAsociadas = todasLasVentas.filter(v => v.cuentaId === cuenta.id);
      
      // Verificar si todas las ventas están anuladas
      const todasAnuladas = ventasAsociadas.length > 0 && ventasAsociadas.every(v => v.anulada);
      
      // Verificar si la cuenta no tiene movimientos
      const movimientosCuenta = todosLosMovimientos.filter(m => m.cuentaId === cuenta.id);
      const noTieneMovimientos = movimientosCuenta.length === 0;
      
      // Si todas las ventas están anuladas O no tiene movimientos, cerrar/anular la cuenta
      if ((todasAnuladas || noTieneMovimientos) && cuenta.estado === 'ACTIVA') {
        // console.log(`🔧 Corrigiendo cuenta ${cuenta.id}:`, {
        //   ventasAsociadas: ventasAsociadas.length,
        //   todasAnuladas,
        //   movimientos: movimientosCuenta.length,
        //   saldoActual: cuenta.saldo
        // });
        
        // Eliminar todos los movimientos de esta cuenta
        for (const movimiento of movimientosCuenta) {
          await movimientosRepo.remove(movimiento.id);
        }
        
        // Cerrar la cuenta y marcarla como anulada si todas las ventas están anuladas
        await cuentasRepo.update(cuenta.id, {
          saldo: 0,
          estado: 'CERRADA',
          anulada: todasAnuladas, // Marcar como anulada solo si todas las ventas están anuladas
          fechaCierre: new Date().toISOString()
        });
        
        cuentasCorregidas++;
        // console.log(`✅ Cuenta ${cuenta.id} ${todasAnuladas ? 'anulada' : 'cerrada'} correctamente`);
      }
    }
    
    // console.log(`🎉 Limpieza completada. Cuentas corregidas: ${cuentasCorregidas}`);
    return { success: true, cuentasCorregidas };
    
  } catch (error) {
    console.error('❌ Error al limpiar cuentas:', error);
    return { success: false, error: error.message };
  }
};
