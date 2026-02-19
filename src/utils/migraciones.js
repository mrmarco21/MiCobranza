import { getData, setData, KEYS } from '../data/storage';

/**
 * Migración: Agregar numeroCuenta a cuentas existentes
 * Esta función asigna un número de cuenta permanente a todas las cuentas activas
 * que no lo tengan, basándose en su orden de creación
 */
export const migrarNumeroCuentas = async () => {
  try {
    const cuentas = await getData(KEYS.CUENTAS);
    
    // Agrupar cuentas por clienta
    const cuentasPorClienta = {};
    cuentas.forEach(cuenta => {
      if (!cuentasPorClienta[cuenta.clientaId]) {
        cuentasPorClienta[cuenta.clientaId] = [];
      }
      cuentasPorClienta[cuenta.clientaId].push(cuenta);
    });

    // Asignar números de cuenta solo a las activas
    let cambiosRealizados = false;
    Object.keys(cuentasPorClienta).forEach(clientaId => {
      const cuentasClienta = cuentasPorClienta[clientaId];
      
      // Filtrar solo las activas
      const cuentasActivas = cuentasClienta.filter(c => c.estado === 'ACTIVA');
      
      // Ordenar por fecha de creación
      cuentasActivas.sort((a, b) => 
        new Date(a.fechaCreacion) - new Date(b.fechaCreacion)
      );

      // Asignar número si no existe
      cuentasActivas.forEach((cuenta, index) => {
        if (!cuenta.numeroCuenta) {
          cuenta.numeroCuenta = index + 1;
          cambiosRealizados = true;
        }
      });
    });

    // Guardar cambios si hubo modificaciones
    if (cambiosRealizados) {
      await setData(KEYS.CUENTAS, cuentas);
      console.log('Migración de numeroCuenta completada');
    }

    return true;
  } catch (error) {
    console.error('Error en migración de numeroCuenta:', error);
    return false;
  }
};
