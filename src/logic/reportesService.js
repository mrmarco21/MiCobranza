import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as movimientosRepo from '../data/movimientosRepository';
import * as clientasRepo from '../data/clientasRepository';
import * as cuentasRepo from '../data/cuentasRepository';
import { formatDate, formatCurrency } from '../utils/helpers';

const REPORTES_KEY = 'reportes_semanales';

// Funciones auxiliares para storage de reportes
const getReportesData = async () => {
    try {
        const data = await AsyncStorage.getItem(REPORTES_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
};

const setReportesData = async (data) => {
    await AsyncStorage.setItem(REPORTES_KEY, JSON.stringify(data));
};

// Obtener inicio y fin de una semana
const obtenerRangoSemana = (fecha = new Date()) => {
    const hoy = new Date(fecha);
    const diaSemana = hoy.getDay();
    const inicio = new Date(hoy);
    inicio.setDate(hoy.getDate() - diaSemana);
    inicio.setHours(0, 0, 0, 0);
    const fin = new Date(inicio);
    fin.setDate(inicio.getDate() + 6);
    fin.setHours(23, 59, 59, 999);
    return { inicio, fin };
};

// Generar ID único para la semana
const generarIdSemana = (fecha) => {
    const { inicio } = obtenerRangoSemana(fecha);
    return `semana_${inicio.toISOString().split('T')[0]}`;
};

// Obtener movimientos de una semana específica
export const obtenerMovimientosSemana = async (fecha = new Date()) => {
    const { inicio, fin } = obtenerRangoSemana(fecha);
    const movimientos = await movimientosRepo.getAll();
    
    return movimientos.filter(m => {
        const fechaMov = new Date(m.fecha);
        return fechaMov >= inicio && fechaMov <= fin;
    }).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
};

// Generar datos del reporte semanal
export const generarDatosReporte = async (fecha = new Date()) => {
    const { inicio, fin } = obtenerRangoSemana(fecha);
    const movimientos = await obtenerMovimientosSemana(fecha);
    const clientas = await clientasRepo.getAll();
    const cuentas = await cuentasRepo.getAll();

    // Enriquecer movimientos con datos de clienta
    const movimientosEnriquecidos = await Promise.all(
        movimientos.map(async (mov) => {
            const cuenta = cuentas.find(c => c.id === mov.cuentaId);
            const clienta = cuenta ? clientas.find(cl => cl.id === cuenta.clientaId) : null;
            return {
                ...mov,
                clientaNombre: clienta?.nombre || 'Desconocido',
            };
        })
    );

    const totalCargos = movimientos
        .filter(m => m.tipo === 'CARGO')
        .reduce((sum, m) => sum + m.monto, 0);
    
    const totalAbonos = movimientos
        .filter(m => m.tipo === 'ABONO')
        .reduce((sum, m) => sum + m.monto, 0);

    return {
        id: generarIdSemana(fecha),
        fechaInicio: inicio.toISOString(),
        fechaFin: fin.toISOString(),
        fechaGeneracion: new Date().toISOString(),
        movimientos: movimientosEnriquecidos,
        totalCargos,
        totalAbonos,
        totalMovimientos: movimientos.length,
    };
};

// Guardar reporte semanal
export const guardarReporteSemanal = async (fecha = new Date()) => {
    const reporte = await generarDatosReporte(fecha);
    const reportes = await getReportesData();
    
    // Verificar si ya existe el reporte de esta semana
    const index = reportes.findIndex(r => r.id === reporte.id);
    if (index !== -1) {
        reportes[index] = reporte; // Actualizar
    } else {
        reportes.push(reporte); // Agregar nuevo
    }
    
    await setReportesData(reportes);
    return reporte;
};

// Obtener todos los reportes guardados
export const obtenerReportesGuardados = async () => {
    const reportes = await getReportesData();
    return reportes.sort((a, b) => new Date(b.fechaInicio) - new Date(a.fechaInicio));
};

// Generar contenido HTML para el reporte
const generarHTML = (reporte) => {
    const fechaInicioStr = formatDate(reporte.fechaInicio);
    const fechaFinStr = formatDate(reporte.fechaFin);
    
    let movimientosHTML = '';
    reporte.movimientos.forEach(mov => {
        const colorTipo = mov.tipo === 'CARGO' ? '#FF6B6B' : '#4CAF50';
        movimientosHTML += `
            <tr>
                <td>${formatDate(mov.fecha)}</td>
                <td>${mov.clientaNombre}</td>
                <td style="color: ${colorTipo}; font-weight: bold;">${mov.tipo}</td>
                <td style="text-align: right;">${formatCurrency(mov.monto)}</td>
                <td>${mov.comentario || '-'}</td>
            </tr>
        `;
    });

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h1 { color: #6C5CE7; text-align: center; }
                .periodo { text-align: center; color: #666; margin-bottom: 20px; }
                .resumen { display: flex; justify-content: space-around; margin: 20px 0; }
                .resumen-item { text-align: center; padding: 15px; border-radius: 10px; }
                .cargos { background: #FFEBEE; }
                .abonos { background: #E8F5E9; }
                .resumen-valor { font-size: 24px; font-weight: bold; }
                .cargos .resumen-valor { color: #FF6B6B; }
                .abonos .resumen-valor { color: #4CAF50; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th { background: #6C5CE7; color: white; padding: 12px; text-align: left; }
                td { padding: 10px; border-bottom: 1px solid #eee; }
                tr:nth-child(even) { background: #f9f9f9; }
            </style>
        </head>
        <body>
            <h1>Reporte Semanal</h1>
            <p class="periodo">${fechaInicioStr} - ${fechaFinStr}</p>
            
            <div class="resumen">
                <div class="resumen-item cargos">
                    <div>Total Cargos</div>
                    <div class="resumen-valor">${formatCurrency(reporte.totalCargos)}</div>
                </div>
                <div class="resumen-item abonos">
                    <div>Total Abonos</div>
                    <div class="resumen-valor">${formatCurrency(reporte.totalAbonos)}</div>
                </div>
            </div>
            
            <h3>Detalle de Movimientos (${reporte.totalMovimientos})</h3>
            <table>
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Clienta</th>
                        <th>Tipo</th>
                        <th>Monto</th>
                        <th>Comentario</th>
                    </tr>
                </thead>
                <tbody>
                    ${movimientosHTML}
                </tbody>
            </table>
            
            <p style="text-align: center; color: #999; margin-top: 30px;">
                Generado: ${formatDate(reporte.fechaGeneracion)}
            </p>
        </body>
        </html>
    `;
};

// Exportar reporte a PDF
export const exportarReporteCSV = async (reporte) => {
    try {
        const html = generarHTML(reporte);
        
        // Generar PDF
        const { uri } = await Print.printToFileAsync({ html });
        
        // Compartir el archivo
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
            await Sharing.shareAsync(uri, {
                mimeType: 'application/pdf',
                dialogTitle: 'Exportar Reporte Semanal',
            });
        }
        
        return uri;
    } catch (error) {
        console.log('Error exportando:', error);
        throw error;
    }
};

// Exportar reporte de la semana actual
export const exportarReporteSemanaActual = async () => {
    const reporte = await generarDatosReporte();
    if (reporte.movimientos.length === 0) {
        throw new Error('No hay movimientos esta semana');
    }
    return await exportarReporteCSV(reporte);
};

// Verificar y guardar reporte automáticamente si es nueva semana
export const verificarYGuardarReporteAutomatico = async () => {
    const reportes = await obtenerReportesGuardados();
    const idSemanaAnterior = generarIdSemana(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    
    // Si no existe reporte de la semana anterior, guardarlo
    const existeAnterior = reportes.some(r => r.id === idSemanaAnterior);
    if (!existeAnterior) {
        const fechaAnterior = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        await guardarReporteSemanal(fechaAnterior);
    }
    
    return reportes;
};
