import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as movimientosRepo from '../data/movimientosRepository';
import * as clientasRepo from '../data/clientasRepository';
import * as cuentasRepo from '../data/cuentasRepository';
import { formatDate, formatCurrency } from '../shared/utils/helpers';

const REPORTES_KEY = 'reportes_semanales';

// Función para redondear montos a .00 o .50
const redondearMonto = (monto) => {
    // Redondear al múltiplo de 0.50 más cercano
    const redondeado = Math.round(monto * 2) / 2;
    console.log(`🔄 Redondeo: ${monto.toFixed(2)} → ${redondeado.toFixed(2)}`);
    return redondeado;
};

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

// Obtener inicio y fin de una semana (Lunes a Domingo)
const obtenerRangoSemana = (fecha = new Date()) => {
    const hoy = new Date(fecha);
    const diaSemana = hoy.getDay();
    // Ajustar para que lunes sea el inicio (getDay: 0=domingo, 1=lunes, etc.)
    // Si es domingo (0), retroceder 6 días; si no, retroceder (diaSemana - 1) días
    const diasDesdeInicio = diaSemana === 0 ? 6 : diaSemana - 1;
    const inicio = new Date(hoy);
    inicio.setDate(hoy.getDate() - diasDesdeInicio);
    inicio.setHours(0, 0, 0, 0);
    const fin = new Date(inicio);
    fin.setDate(inicio.getDate() + 6); // Domingo
    fin.setHours(23, 59, 59, 999);
    return { inicio, fin };
};

// Generar ID único para la semana
const generarIdSemana = (fecha) => {
    const { inicio } = obtenerRangoSemana(fecha);
    return `semana_${inicio.toISOString().split('T')[0]}`;
};

// Parsear prendas desde el comentario del cargo
const parsearPrendas = (comentario) => {
    if (!comentario) return [];
    
    const partes = comentario.split(' | ');
    return partes.map(parte => {
        // Formato nuevo con cantidad y categoría: "Blusa roja (S/25.00) x 2 [01/01/2026] {categoria-id}"
        const matchConCantidad = parte.match(/^(.+?)\s*\(S\/(\d+\.?\d*)\)\s*x\s*(\d+)\s*\[(\d{2}\/\d{2}\/\d{4})\]\s*\{(.+?)\}$/);
        if (matchConCantidad) {
            const categoria = matchConCantidad[5].toLowerCase();
            console.log('✅ Prenda parseada con cantidad y categoría:', {
                descripcion: matchConCantidad[1].trim(),
                monto: parseFloat(matchConCantidad[2]),
                cantidad: parseInt(matchConCantidad[3]),
                categoria: categoria,
                comentarioOriginal: parte
            });
            return {
                descripcion: matchConCantidad[1].trim(),
                monto: parseFloat(matchConCantidad[2]),
                cantidad: parseInt(matchConCantidad[3]),
                fecha: matchConCantidad[4],
                categoria: categoria
            };
        }
        
        // Formato con categoría pero sin cantidad: "Blusa roja (S/25.00) [01/01/2026] {categoria-id}"
        const matchCompleto = parte.match(/^(.+?)\s*\(S\/(\d+\.?\d*)\)\s*\[(\d{2}\/\d{2}\/\d{4})\]\s*\{(.+?)\}$/);
        if (matchCompleto) {
            const categoria = matchCompleto[4].toLowerCase();
            console.log('✅ Prenda parseada con categoría (sin cantidad):', {
                descripcion: matchCompleto[1].trim(),
                categoria: categoria,
                comentarioOriginal: parte
            });
            return {
                descripcion: matchCompleto[1].trim(),
                monto: parseFloat(matchCompleto[2]),
                cantidad: 1,
                fecha: matchCompleto[3],
                categoria: categoria
            };
        }
        
        // Formato con fecha pero sin categoría (datos antiguos)
        const matchConFecha = parte.match(/^(.+?)\s*\(S\/(\d+\.?\d*)\)\s*\[(\d{2}\/\d{2}\/\d{4})\]$/);
        if (matchConFecha) {
            console.log('⚠️ Prenda sin categoría (formato antiguo con fecha):', parte);
            return {
                descripcion: matchConFecha[1].trim(),
                monto: parseFloat(matchConFecha[2]),
                cantidad: 1,
                fecha: matchConFecha[3],
                categoria: 'ropa-otros'
            };
        }
        
        // Formato antiguo sin fecha
        const matchSinFecha = parte.match(/^(.+?)\s*\(S\/(\d+\.?\d*)\)$/);
        if (matchSinFecha) {
            console.log('⚠️ Prenda sin categoría (formato antiguo sin fecha):', parte);
            return {
                descripcion: matchSinFecha[1].trim(),
                monto: parseFloat(matchSinFecha[2]),
                cantidad: 1,
                fecha: null,
                categoria: 'ropa-otros'
            };
        }
        
        console.log('❌ Prenda con formato no reconocido:', parte);
        return { descripcion: parte, monto: null, cantidad: 1, fecha: null, categoria: 'ropa-otros' };
    }).filter(p => p.descripcion);
};

// Parsear fecha de abono
const parsearFechaAbono = (comentario) => {
    if (!comentario) return null;
    const match = comentario.match(/\[(\d{2}\/\d{2}\/\d{4})\]$/);
    return match ? match[1] : null;
};

// Extraer descripción sin fecha
const extraerDescripcionSinFecha = (comentario) => {
    if (!comentario) return '';
    return comentario.replace(/\s*\[\d{2}\/\d{2}\/\d{4}\]$/, '').trim();
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

    // Enriquecer movimientos con datos de clienta y prendas parseadas
    const movimientosEnriquecidos = await Promise.all(
        movimientos.map(async (mov) => {
            const cuenta = cuentas.find(c => c.id === mov.cuentaId);
            const clienta = cuenta ? clientas.find(cl => cl.id === cuenta.clientaId) : null;
            
            let prendas = [];
            let fechaMovimiento = null;
            let descripcionLimpia = mov.comentario || '';
            
            if (mov.tipo === 'CARGO') {
                prendas = parsearPrendas(mov.comentario);
            } else {
                fechaMovimiento = parsearFechaAbono(mov.comentario);
                descripcionLimpia = extraerDescripcionSinFecha(mov.comentario);
            }
            
            return {
                ...mov,
                clientaNombre: clienta?.nombre || 'Desconocido',
                prendas,
                fechaMovimiento,
                descripcionLimpia,
            };
        })
    );

    const totalCargos = movimientos
        .filter(m => m.tipo === 'CARGO')
        .reduce((sum, m) => sum + m.monto, 0);
    
    const totalAbonos = movimientos
        .filter(m => m.tipo === 'ABONO')
        .reduce((sum, m) => sum + m.monto, 0);

    // Contar total de prendas
    const totalPrendas = movimientosEnriquecidos
        .filter(m => m.tipo === 'CARGO')
        .reduce((sum, m) => sum + (m.prendas.length || 1), 0);

    return {
        id: generarIdSemana(fecha),
        fechaInicio: inicio.toISOString(),
        fechaFin: fin.toISOString(),
        fechaGeneracion: new Date().toISOString(),
        movimientos: movimientosEnriquecidos,
        totalCargos,
        totalAbonos,
        totalMovimientos: movimientos.length,
        totalPrendas,
    };
};

// Guardar reporte semanal
export const guardarReporteSemanal = async (fecha = new Date()) => {
    const reporte = await generarDatosReporte(fecha);
    
    // No guardar si no hay movimientos
    if (reporte.movimientos.length === 0) {
        return null;
    }
    
    const reportes = await getReportesData();
    
    // Verificar si ya existe el reporte de esta semana
    const index = reportes.findIndex(r => r.id === reporte.id);
    if (index !== -1) {
        reportes[index] = reporte;
    } else {
        reportes.push(reporte);
    }
    
    await setReportesData(reportes);
    return reporte;
};

// Obtener todos los reportes guardados (solo con movimientos)
export const obtenerReportesGuardados = async () => {
    const reportes = await getReportesData();
    return reportes
        .filter(r => r.totalMovimientos > 0)
        .sort((a, b) => new Date(b.fechaInicio) - new Date(a.fechaInicio));
};

// Generar contenido HTML para el reporte
const generarHTML = (reporte) => {
    const fechaInicioStr = formatDate(reporte.fechaInicio);
    const fechaFinStr = formatDate(reporte.fechaFin);
    
    // Separar cargos y abonos
    const cargos = reporte.movimientos.filter(m => m.tipo === 'CARGO');
    const abonos = reporte.movimientos.filter(m => m.tipo === 'ABONO');
    
    // Generar HTML para cargos con detalle de prendas
    let cargosHTML = '';
    cargos.forEach(mov => {
        if (mov.prendas && mov.prendas.length > 0) {
            // Mostrar cada prenda como fila
            mov.prendas.forEach((prenda, idx) => {
                cargosHTML += `
                    <tr>
                        <td>${prenda.fecha || formatDate(mov.fecha)}</td>
                        <td>${mov.clientaNombre}</td>
                        <td>${prenda.descripcion}</td>
                        <td style="text-align: right; color: #FF6B6B; font-weight: 600;">
                            ${formatCurrency(prenda.monto || mov.monto)}
                        </td>
                    </tr>
                `;
            });
        } else {
            // Formato antiguo sin prendas
            cargosHTML += `
                <tr>
                    <td>${formatDate(mov.fecha)}</td>
                    <td>${mov.clientaNombre}</td>
                    <td>${mov.comentario || '-'}</td>
                    <td style="text-align: right; color: #FF6B6B; font-weight: 600;">
                        ${formatCurrency(mov.monto)}
                    </td>
                </tr>
            `;
        }
    });
    
    // Generar HTML para abonos
    let abonosHTML = '';
    abonos.forEach(mov => {
        abonosHTML += `
            <tr>
                <td>${mov.fechaMovimiento || formatDate(mov.fecha)}</td>
                <td>${mov.clientaNombre}</td>
                <td>${mov.descripcionLimpia || '-'}</td>
                <td style="text-align: right; color: #4CAF50; font-weight: 600;">
                    ${formatCurrency(mov.monto)}
                </td>
            </tr>
        `;
    });

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                * { box-sizing: border-box; }
                body { 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                    padding: 24px; 
                    background: #f5f5f5;
                    margin: 0;
                }
                .container {
                    max-width: 800px;
                    margin: 0 auto;
                    background: white;
                    border-radius: 16px;
                    padding: 24px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }
                h1 { 
                    color: #29B6F6; 
                    text-align: center; 
                    margin: 0 0 8px 0;
                    font-size: 28px;
                }
                .periodo { 
                    text-align: center; 
                    color: #666; 
                    margin-bottom: 24px;
                    font-size: 14px;
                }
                .resumen { 
                    display: flex; 
                    gap: 16px;
                    margin-bottom: 24px;
                }
                .resumen-item { 
                    flex: 1;
                    text-align: center; 
                    padding: 20px; 
                    border-radius: 12px;
                }
                .cargos-card { background: #FFF5F5; border: 1px solid #FFE5E5; }
                .abonos-card { background: #F0FFF4; border: 1px solid #E8F5E9; }
                .resumen-label { font-size: 13px; color: #666; margin-bottom: 8px; }
                .resumen-valor { font-size: 28px; font-weight: 700; }
                .cargos-card .resumen-valor { color: #FF6B6B; }
                .abonos-card .resumen-valor { color: #4CAF50; }
                .seccion { margin-bottom: 24px; }
                .seccion-titulo {
                    font-size: 16px;
                    font-weight: 600;
                    color: #2D3436;
                    margin-bottom: 12px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .badge {
                    background: #F0F0F0;
                    padding: 4px 10px;
                    border-radius: 12px;
                    font-size: 12px;
                    color: #666;
                }
                table { 
                    width: 100%; 
                    border-collapse: collapse;
                    font-size: 13px;
                }
                th { 
                    background: #F8F9FA; 
                    color: #2D3436; 
                    padding: 12px; 
                    text-align: left;
                    font-weight: 600;
                    border-bottom: 2px solid #E0E0E0;
                }
                td { 
                    padding: 12px; 
                    border-bottom: 1px solid #F0F0F0;
                    color: #2D3436;
                }
                tr:hover { background: #edeef0f7; }
                .footer {
                    text-align: center; 
                    color: #999; 
                    margin-top: 24px;
                    padding-top: 16px;
                    border-top: 1px solid #F0F0F0;
                    font-size: 12px;
                }
                .empty-msg {
                    text-align: center;
                    color: #999;
                    padding: 20px;
                    font-style: italic;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>📊 Reporte Semanal</h1>
                <p class="periodo">${fechaInicioStr} - ${fechaFinStr}</p>
                
                <div class="resumen">
                    <div class="resumen-item cargos-card">
                        <div class="resumen-label">Total Cargos</div>
                        <div class="resumen-valor">${formatCurrency(reporte.totalCargos)}</div>
                        <div class="resumen-label" style="margin-top: 8px;">${reporte.totalPrendas || cargos.length} prendas</div>
                    </div>
                    <div class="resumen-item abonos-card">
                        <div class="resumen-label">Total Abonos</div>
                        <div class="resumen-valor">${formatCurrency(reporte.totalAbonos)}</div>
                        <div class="resumen-label" style="margin-top: 8px;">${abonos.length} pagos</div>
                    </div>
                </div>
                
                ${cargos.length > 0 ? `
                <div class="seccion">
                    <div class="seccion-titulo">
                        🛍️ Cargos (Prendas vendidas)
                        <span class="badge">${reporte.totalPrendas || cargos.length}</span>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 100px;">Fecha</th>
                                <th>Clienta</th>
                                <th>Descripción</th>
                                <th style="width: 100px; text-align: right;">Monto</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${cargosHTML}
                        </tbody>
                    </table>
                </div>
                ` : ''}
                
                ${abonos.length > 0 ? `
                <div class="seccion">
                    <div class="seccion-titulo">
                        💰 Abonos (Pagos recibidos)
                        <span class="badge">${abonos.length}</span>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 100px;">Fecha</th>
                                <th>Clienta</th>
                                <th>Nota</th>
                                <th style="width: 100px; text-align: right;">Monto</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${abonosHTML}
                        </tbody>
                    </table>
                </div>
                ` : ''}
                
                <div class="footer">
                    Generado el ${formatDate(reporte.fechaGeneracion)}
                </div>
            </div>
        </body>
        </html>
    `;
};

// Exportar reporte a PDF
export const exportarReporteCSV = async (reporte) => {
    try {
        const html = generarHTML(reporte);
        
        const { uri } = await Print.printToFileAsync({ html });
        
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
    
    // Si no existe reporte de la semana anterior, intentar guardarlo
    const existeAnterior = reportes.some(r => r.id === idSemanaAnterior);
    if (!existeAnterior) {
        const fechaAnterior = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        await guardarReporteSemanal(fechaAnterior);
    }
    
    return reportes;
};


// Función auxiliar para buscar producto en inventario con matching inteligente
const buscarProductoEnInventario = (descripcion, productos) => {
    if (!descripcion || !productos || productos.length === 0) return null;
    
    const descripcionNormalizada = descripcion.toLowerCase().trim();
    
    // 1. Búsqueda exacta
    let producto = productos.find(p => 
        p.nombre.toLowerCase().trim() === descripcionNormalizada
    );
    
    if (producto) {
        console.log('✅ Match exacto encontrado:', { descripcion, productoNombre: producto.nombre, categoria: producto.categoria });
        return producto;
    }
    
    // 2. Búsqueda por similitud (contiene o está contenido)
    producto = productos.find(p => {
        const nombreProducto = p.nombre.toLowerCase().trim();
        return nombreProducto.includes(descripcionNormalizada) || 
               descripcionNormalizada.includes(nombreProducto);
    });
    
    if (producto) {
        console.log('✅ Match por similitud encontrado:', { descripcion, productoNombre: producto.nombre, categoria: producto.categoria });
        return producto;
    }
    
    // 3. Búsqueda por palabras clave (al menos 2 palabras coinciden)
    const palabrasDescripcion = descripcionNormalizada.split(/\s+/).filter(p => p.length > 2);
    if (palabrasDescripcion.length >= 2) {
        producto = productos.find(p => {
            const nombreProducto = p.nombre.toLowerCase().trim();
            const coincidencias = palabrasDescripcion.filter(palabra => 
                nombreProducto.includes(palabra)
            );
            return coincidencias.length >= 2;
        });
        
        if (producto) {
            console.log('✅ Match por palabras clave encontrado:', { descripcion, productoNombre: producto.nombre, categoria: producto.categoria });
            return producto;
        }
    }
    
    console.log('⚠️ No se encontró producto en inventario para:', descripcion);
    return null;
};

// Obtener resumen de ventas por categoría
export const obtenerResumenPorCategoria = async (fechaInicio, fechaFin) => {
    const movimientos = await movimientosRepo.getAll();
    const cuentas = await cuentasRepo.getAll();
    
    // Obtener productos del inventario para consultar categorías actuales
    const productosRepo = await import('../data/productosRepository');
    const productos = await productosRepo.getAll();
    
    console.log('📦 Total productos en inventario:', productos.length);
    
    // Obtener TODOS los movimientos de tipo CARGO, sin filtrar por fecha del movimiento
    const cargos = movimientos.filter(m => m.tipo === 'CARGO');

    const resumen = {};

    cargos.forEach(cargo => {
        const prendas = parsearPrendas(cargo.comentario);
        
        // Obtener la cuenta para verificar el estado de pago
        const cuenta = cuentas.find(c => c.id === cargo.cuentaId);
        const estadoCuenta = cuenta ? cuenta.estado : null;
        const saldoCuenta = cuenta ? cuenta.saldo : 0;
        
        // Obtener todos los movimientos de esta cuenta para calcular abonos
        const movimientosCuenta = movimientos.filter(m => m.cuentaId === cargo.cuentaId);
        const totalCargos = movimientosCuenta.filter(m => m.tipo === 'CARGO').reduce((sum, m) => sum + m.monto, 0);
        const totalAbonos = movimientosCuenta.filter(m => m.tipo === 'ABONO').reduce((sum, m) => sum + m.monto, 0);
        
        // Calcular proporción pagada de esta cuenta
        const proporcionPagada = totalCargos > 0 ? totalAbonos / totalCargos : 0;
        
        console.log('💰 Calculando proporción de pago:', {
            cuentaId: cargo.cuentaId,
            totalCargos,
            totalAbonos,
            proporcionPagada,
            saldoCuenta
        });
        
        prendas.forEach(prenda => {
            // Si la prenda tiene fecha en el comentario, verificar que esté en el rango
            if (prenda.fecha) {
                const [dia, mes, anio] = prenda.fecha.split('/');
                const fechaPrenda = new Date(parseInt(anio), parseInt(mes) - 1, parseInt(dia));
                fechaPrenda.setHours(0, 0, 0, 0);
                
                const inicioNormalizado = new Date(fechaInicio);
                inicioNormalizado.setHours(0, 0, 0, 0);
                const finNormalizado = new Date(fechaFin);
                finNormalizado.setHours(23, 59, 59, 999);
                
                // Solo incluir si la fecha de la prenda está en el rango
                if (fechaPrenda < inicioNormalizado || fechaPrenda > finNormalizado) {
                    return; // Saltar esta prenda
                }
            } else {
                // Si la prenda NO tiene fecha en el comentario, usar la fecha del movimiento
                const fechaMov = new Date(cargo.fecha);
                if (fechaMov < fechaInicio || fechaMov > fechaFin) {
                    return; // Saltar esta prenda
                }
            }
            
            // IMPORTANTE: Buscar el producto en el inventario para obtener su categoría ACTUAL
            const productoEnInventario = buscarProductoEnInventario(prenda.descripcion, productos);
            
            // Usar la categoría actual del inventario, o la del comentario como fallback
            const categoria = productoEnInventario?.categoria || prenda.categoria || 'ropa-otros';
            
            if (!resumen[categoria]) {
                resumen[categoria] = { 
                    cantidad: 0, 
                    total: 0, 
                    totalPagado: 0,
                    totalPendiente: 0,
                    articulos: [] 
                };
            }
            
            // Determinar estado de pago del producto
            let estadoPago = 'PENDIENTE';
            if (estadoCuenta === 'CERRADA' || saldoCuenta === 0) {
                estadoPago = 'PAGADO';
            } else if (totalAbonos > 0 && saldoCuenta > 0) {
                estadoPago = 'PARCIAL';
            }
            
            // Calcular cantidad y monto total considerando la cantidad de productos
            const cantidad = prenda.cantidad || 1;
            const precioUnitario = prenda.monto || 0;
            const montoTotal = precioUnitario * cantidad;
            
            // Calcular cuánto se ha pagado de este producto específico
            let montoPagadoProducto = montoTotal * proporcionPagada;
            let montoPendienteProducto = montoTotal - montoPagadoProducto;
            
            // Redondear montos a .00 o .50
            montoPagadoProducto = redondearMonto(montoPagadoProducto);
            // Calcular pendiente como diferencia para mantener el total exacto
            montoPendienteProducto = montoTotal - montoPagadoProducto;
            
            console.log('📦 Procesando prenda:', {
                descripcion: prenda.descripcion,
                categoriaOriginal: prenda.categoria,
                categoriaActual: categoria,
                cantidad,
                precioUnitario,
                montoTotal,
                proporcionPagada,
                montoPagadoProducto,
                montoPendienteProducto
            });
            
            resumen[categoria].cantidad += cantidad;
            resumen[categoria].total += montoTotal;
            resumen[categoria].totalPagado += montoPagadoProducto;
            resumen[categoria].totalPendiente += montoPendienteProducto;
            
            resumen[categoria].articulos.push({
                ...prenda,
                categoria, // Usar la categoría actualizada
                montoTotal,
                montoPagado: montoPagadoProducto,
                montoPendiente: montoPendienteProducto,
                estadoPago,
                cuentaId: cargo.cuentaId,
                saldoCuenta,
                proporcionPagada
            });
        });
    });

    console.log('📊 Resumen final por categoría:', JSON.stringify(resumen, null, 2));

    return resumen;
};

// Obtener movimientos filtrados por categoría
export const obtenerMovimientosPorCategoria = async (categoria, fechaInicio, fechaFin) => {
    const movimientos = await movimientosRepo.getAll();
    const clientas = await clientasRepo.getAll();
    const cuentas = await cuentasRepo.getAll();
    
    // Obtener productos del inventario para consultar categorías actuales
    const productosRepo = await import('../data/productosRepository');
    const productos = await productosRepo.getAll();

    const movimientosFiltrados = [];

    // Revisar TODOS los movimientos de tipo CARGO
    movimientos.forEach(m => {
        if (m.tipo === 'CARGO') {
            const prendas = parsearPrendas(m.comentario);
            
            // Obtener información de la cuenta
            const cuenta = cuentas.find(c => c.id === m.cuentaId);
            const estadoCuenta = cuenta ? cuenta.estado : null;
            const saldoCuenta = cuenta ? cuenta.saldo : 0;
            
            // Obtener todos los movimientos de esta cuenta para calcular proporción pagada
            const movimientosCuenta = movimientos.filter(mov => mov.cuentaId === m.cuentaId);
            const totalCargos = movimientosCuenta.filter(mov => mov.tipo === 'CARGO').reduce((sum, mov) => sum + mov.monto, 0);
            const totalAbonos = movimientosCuenta.filter(mov => mov.tipo === 'ABONO').reduce((sum, mov) => sum + mov.monto, 0);
            const proporcionPagada = totalCargos > 0 ? totalAbonos / totalCargos : 0;
            
            const prendasCategoria = prendas.filter(p => {
                // IMPORTANTE: Buscar el producto en el inventario para obtener su categoría ACTUAL
                const productoEnInventario = buscarProductoEnInventario(p.descripcion, productos);
                const categoriaActual = productoEnInventario?.categoria || p.categoria || 'ropa-otros';
                
                // Filtrar por categoría ACTUAL
                if (categoriaActual !== categoria) {
                    return false;
                }
                
                // Si la prenda tiene fecha en el comentario, verificar que esté en el rango
                if (p.fecha) {
                    const [dia, mes, anio] = p.fecha.split('/');
                    const fechaPrenda = new Date(parseInt(anio), parseInt(mes) - 1, parseInt(dia));
                    fechaPrenda.setHours(0, 0, 0, 0);
                    
                    const inicioNormalizado = new Date(fechaInicio);
                    inicioNormalizado.setHours(0, 0, 0, 0);
                    const finNormalizado = new Date(fechaFin);
                    finNormalizado.setHours(23, 59, 59, 999);
                    
                    // Solo incluir si la fecha de la prenda está en el rango
                    if (fechaPrenda < inicioNormalizado || fechaPrenda > finNormalizado) {
                        return false;
                    }
                } else {
                    // Si la prenda NO tiene fecha, usar la fecha del movimiento
                    const fechaMov = new Date(m.fecha);
                    if (fechaMov < fechaInicio || fechaMov > fechaFin) {
                        return false;
                    }
                }
                
                return true;
            }).map(p => {
                // Actualizar la categoría de cada prenda con la categoría actual del inventario
                const productoEnInventario = buscarProductoEnInventario(p.descripcion, productos);
                const categoriaActual = productoEnInventario?.categoria || p.categoria || 'ropa-otros';
                
                // Calcular estado de pago y montos
                let estadoPago = 'PENDIENTE';
                if (estadoCuenta === 'CERRADA' || saldoCuenta === 0) {
                    estadoPago = 'PAGADO';
                } else if (totalAbonos > 0 && saldoCuenta > 0) {
                    estadoPago = 'PARCIAL';
                }
                
                const cantidad = p.cantidad || 1;
                const precioUnitario = p.monto || 0;
                const montoTotal = precioUnitario * cantidad;
                let montoPagado = montoTotal * proporcionPagada;
                
                // Redondear monto pagado a .00 o .50
                montoPagado = redondearMonto(montoPagado);
                // Calcular pendiente como diferencia para mantener el total exacto
                let montoPendiente = montoTotal - montoPagado;
                
                return {
                    ...p,
                    categoria: categoriaActual, // Usar categoría actualizada
                    estadoPago,
                    saldoCuenta,
                    montoTotal,
                    montoPagado,
                    montoPendiente,
                    proporcionPagada
                };
            });
            
            if (prendasCategoria.length > 0) {
                const clienta = cuenta ? clientas.find(cl => cl.id === cuenta.clientaId) : null;
                
                // Determinar estado de pago general del movimiento
                let estadoPago = 'PENDIENTE';
                if (estadoCuenta === 'CERRADA') {
                    estadoPago = 'PAGADO';
                } else if (saldoCuenta === 0) {
                    estadoPago = 'PAGADO';
                } else if (saldoCuenta > 0 && saldoCuenta < m.monto) {
                    estadoPago = 'PARCIAL';
                }
                
                movimientosFiltrados.push({
                    ...m,
                    clientaNombre: clienta?.nombre || 'Desconocido',
                    prendas: prendasCategoria,
                    estadoPago,
                    saldoCuenta
                });
            }
        }
    });

    return movimientosFiltrados;
};
