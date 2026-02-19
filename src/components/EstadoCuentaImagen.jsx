import { View, Text, StyleSheet } from 'react-native';
import { formatCurrency, formatDate } from '../utils/helpers';

export default function EstadoCuentaImagen({
    clientaNombre,
    numeroCuenta,
    fechaCreacion,
    fechaCierre,
    saldo,
    movimientos,
    parsearPrendas,
    parsearFechaAbono,
    extraerDescripcionAbono,
    categorias = [],
    esCerrada = false
}) {
    // Ordenar movimientos por fecha (más reciente primero)
    const movsOrdenados = [...movimientos].sort((a, b) =>
        new Date(b.fecha) - new Date(a.fecha)
    );

    // Calcular totales
    const totalCargos = movimientos
        .filter(m => m.tipo === 'CARGO')
        .reduce((sum, m) => sum + m.monto, 0);
    const totalAbonos = movimientos
        .filter(m => m.tipo === 'ABONO')
        .reduce((sum, m) => sum + m.monto, 0);

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, esCerrada && styles.headerCerrada]}>
                <View style={styles.headerTop}>
                    <View>
                        <Text style={styles.titulo}>ESTADO DE CUENTA</Text>
                        {esCerrada && (
                            <View style={styles.cuentaCerradaBadge}>
                                <Text style={styles.cuentaCerradaTexto}>CUENTA PAGADA</Text>
                            </View>
                        )}
                    </View>
                    <View style={[styles.numeroBadge, esCerrada && styles.numeroBadgeCerrada]}>
                        <Text style={styles.numeroTexto}>#{numeroCuenta}</Text>
                    </View>
                </View>
                <View style={[styles.divider, esCerrada && styles.dividerCerrada]} />
                <View style={styles.infoCliente}>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Cliente:</Text>
                        <Text style={styles.infoValor}>{clientaNombre}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Fecha apertura:</Text>
                        <Text style={styles.infoValor}>{formatDate(fechaCreacion)}</Text>
                    </View>
                    {fechaCierre && (
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Fecha cierre:</Text>
                            <Text style={[styles.infoValor, styles.infoValorCerrada]}>{formatDate(fechaCierre)}</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Saldo actual */}
            <View style={[styles.saldoContainer, esCerrada && styles.saldoContainerCerrada]}>
                <Text style={styles.saldoLabel}>{esCerrada ? 'SALDO FINAL' : 'SALDO ACTUAL'}</Text>
                <Text style={[styles.saldoMonto, esCerrada && styles.saldoMontoCerrada]}>{formatCurrency(saldo)}</Text>
                {esCerrada && saldo === 0 && (
                    <Text style={styles.saldoPagadoTexto}>✓ Totalmente pagado</Text>
                )}
            </View>

            {/* Movimientos */}
            {movimientos.length > 0 && (
                <View style={styles.movimientosContainer}>
                    <Text style={styles.seccionTitulo}>HISTORIAL DE MOVIMIENTOS</Text>
                    <View style={styles.dividerSeccion} />

                    {movsOrdenados.map((mov, index) => {
                        const prendas = mov.tipo === 'CARGO' ? parsearPrendas(mov.comentario) : [];
                        const tienePrendas = prendas.length > 0 && prendas.some(p => p.monto !== null);
                        const descripcionAbono = mov.tipo === 'ABONO' ? extraerDescripcionAbono(mov.comentario) : '';
                        const fechaAbono = mov.tipo === 'ABONO' ? parsearFechaAbono(mov.comentario) : null;

                        return (
                            <View key={mov.id} style={styles.movimientoItem}>
                                <View style={styles.movimientoHeader}>
                                    <View style={styles.movimientoTipo}>
                                        <View style={[
                                            styles.tipoIndicador,
                                            mov.tipo === 'CARGO' ? styles.indicadorCargo : styles.indicadorAbono
                                        ]} />
                                        <Text style={styles.tipoTexto}>{mov.tipo}</Text>
                                    </View>
                                    <Text style={[
                                        styles.movimientoMonto,
                                        mov.tipo === 'CARGO' ? styles.montoCargo : styles.montoAbono
                                    ]}>
                                        {mov.tipo === 'CARGO' ? '+' : '-'}{formatCurrency(mov.monto)}
                                    </Text>
                                </View>
                                <Text style={styles.movimientoFecha}>{formatDate(mov.fecha)}</Text>

                                {mov.tipo === 'CARGO' && tienePrendas && (
                                    <View style={styles.prendasDetalle}>
                                        {prendas.map((prenda, i) => {
                                            const categoria = prenda.categoria
                                                ? categorias.find(c => c.id === prenda.categoria)
                                                : null;

                                            return (
                                                <View key={i} style={styles.prendaItem}>
                                                    <Text style={styles.prendaNumero}>{i + 1}.</Text>
                                                    <View style={styles.prendaInfo}>
                                                        <View style={styles.prendaDescRow}>
                                                            <Text style={styles.prendaDesc}>{prenda.descripcion}</Text>
                                                            {categoria && (
                                                                <View style={[
                                                                    styles.categoriaBadge,
                                                                    {
                                                                        backgroundColor: categoria.color + '20',
                                                                        borderColor: categoria.color
                                                                    }
                                                                ]}>
                                                                    <Text style={[
                                                                        styles.categoriaTexto,
                                                                        { color: categoria.color }
                                                                    ]}>
                                                                        {categoria.nombre}
                                                                    </Text>
                                                                </View>
                                                            )}
                                                        </View>
                                                        {prenda.fecha && (
                                                            <Text style={styles.prendaFecha}>{prenda.fecha}</Text>
                                                        )}
                                                    </View>
                                                    {prenda.monto !== null && (
                                                        <Text style={styles.prendaMonto}>{formatCurrency(prenda.monto)}</Text>
                                                    )}
                                                </View>
                                            );
                                        })}
                                    </View>
                                )}

                                {mov.tipo === 'ABONO' && (descripcionAbono || fechaAbono) && (
                                    <View style={styles.abonoDetalle}>
                                        {descripcionAbono && (
                                            <Text style={styles.abonoDesc}>{descripcionAbono}</Text>
                                        )}
                                        {fechaAbono && (
                                            <Text style={styles.abonoFecha}>Fecha: {fechaAbono}</Text>
                                        )}
                                    </View>
                                )}

                                {index < movsOrdenados.length - 1 && <View style={styles.movimientoDivider} />}
                            </View>
                        );
                    })}
                </View>
            )}

            {/* Resumen */}
            <View style={styles.resumenContainer}>
                <Text style={styles.resumenTitulo}>RESUMEN</Text>
                <View style={styles.dividerSeccion} />
                <View style={styles.resumenRow}>
                    <Text style={styles.resumenLabel}>Total cargos:</Text>
                    <Text style={styles.resumenValorCargo}>{formatCurrency(totalCargos)}</Text>
                </View>
                <View style={styles.resumenRow}>
                    <Text style={styles.resumenLabel}>Total abonos:</Text>
                    <Text style={styles.resumenValorAbono}>{formatCurrency(totalAbonos)}</Text>
                </View>
                <View style={[styles.resumenRow, styles.resumenTotal]}>
                    <Text style={styles.resumenLabelTotal}>Saldo pendiente:</Text>
                    <Text style={styles.resumenValorTotal}>{formatCurrency(saldo)}</Text>
                </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
                <Text style={styles.footerTexto}>
                    Generado el {formatDate(new Date().toISOString())}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#FFFFFF',
        padding: 24,
        width: 600,
    },
    header: {
        marginBottom: 20,
    },
    headerCerrada: {
        backgroundColor: '#F0FFF4',
        padding: 16,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#4CAF50',
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    titulo: {
        fontSize: 24,
        fontWeight: '700',
        color: '#2D3436',
        letterSpacing: 1,
    },
    cuentaCerradaBadge: {
        backgroundColor: '#4CAF50',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 6,
        marginTop: 6,
        alignSelf: 'flex-start',
    },
    cuentaCerradaTexto: {
        fontSize: 11,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
    numeroBadge: {
        backgroundColor: '#29B6F6',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 8,
    },
    numeroBadgeCerrada: {
        backgroundColor: '#4CAF50',
    },
    numeroTexto: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    divider: {
        height: 2,
        backgroundColor: '#2D3436',
        marginBottom: 12,
    },
    dividerCerrada: {
        backgroundColor: '#4CAF50',
    },
    dividerSeccion: {
        height: 1,
        backgroundColor: '#E0E0E0',
        marginBottom: 12,
    },
    infoCliente: {
        gap: 6,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    infoLabel: {
        fontSize: 14,
        color: '#636E72',
        fontWeight: '500',
    },
    infoValor: {
        fontSize: 14,
        color: '#2D3436',
        fontWeight: '600',
    },
    infoValorCerrada: {
        color: '#4CAF50',
    },
    saldoContainer: {
        backgroundColor: '#FFF5F5',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 2,
        borderColor: '#FF6B6B',
    },
    saldoContainerCerrada: {
        backgroundColor: '#F0FFF4',
        borderColor: '#4CAF50',
    },
    saldoLabel: {
        fontSize: 12,
        color: '#636E72',
        fontWeight: '600',
        marginBottom: 4,
        letterSpacing: 1,
    },
    saldoMonto: {
        fontSize: 32,
        fontWeight: '700',
        color: '#FF6B6B',
    },
    saldoMontoCerrada: {
        color: '#4CAF50',
    },
    saldoPagadoTexto: {
        fontSize: 13,
        color: '#4CAF50',
        fontWeight: '600',
        marginTop: 4,
    },
    movimientosContainer: {
        marginBottom: 20,
    },
    seccionTitulo: {
        fontSize: 14,
        fontWeight: '700',
        color: '#2D3436',
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    movimientoItem: {
        marginBottom: 12,
    },
    movimientoHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    movimientoTipo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    tipoIndicador: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    indicadorCargo: {
        backgroundColor: '#FF6B6B',
    },
    indicadorAbono: {
        backgroundColor: '#4CAF50',
    },
    tipoTexto: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2D3436',
    },
    movimientoMonto: {
        fontSize: 16,
        fontWeight: '700',
    },
    montoCargo: {
        color: '#FF6B6B',
    },
    montoAbono: {
        color: '#4CAF50',
    },
    movimientoFecha: {
        fontSize: 12,
        color: '#636E72',
        marginBottom: 6,
    },
    prendasDetalle: {
        backgroundColor: '#F8F9FA',
        padding: 12,
        borderRadius: 8,
        marginTop: 6,
    },
    prendaItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 6,
    },
    prendaNumero: {
        fontSize: 12,
        fontWeight: '600',
        color: '#636E72',
        marginRight: 8,
        width: 20,
    },
    prendaInfo: {
        flex: 1,
    },
    prendaDescRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
    },
    prendaDesc: {
        fontSize: 12,
        color: '#2D3436',
        flex: 1,
    },
    categoriaBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 3,
        borderWidth: 1,
    },
    categoriaTexto: {
        fontSize: 8,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    prendaFecha: {
        fontSize: 10,
        color: '#636E72',
        marginTop: 2,
    },
    prendaMonto: {
        fontSize: 12,
        fontWeight: '600',
        color: '#2D3436',
    },
    abonoDetalle: {
        backgroundColor: '#F8F9FA',
        padding: 12,
        borderRadius: 8,
        marginTop: 6,
    },
    abonoDesc: {
        fontSize: 12,
        color: '#2D3436',
        marginBottom: 4,
    },
    abonoFecha: {
        fontSize: 11,
        color: '#636E72',
    },
    movimientoDivider: {
        height: 1,
        backgroundColor: '#F0F0F0',
        marginTop: 12,
    },
    resumenContainer: {
        backgroundColor: '#F8F9FA',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
    },
    resumenTitulo: {
        fontSize: 14,
        fontWeight: '700',
        color: '#2D3436',
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    resumenRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    resumenLabel: {
        fontSize: 13,
        color: '#636E72',
    },
    resumenValorCargo: {
        fontSize: 13,
        fontWeight: '600',
        color: '#FF6B6B',
    },
    resumenValorAbono: {
        fontSize: 13,
        fontWeight: '600',
        color: '#4CAF50',
    },
    resumenTotal: {
        marginTop: 8,
        paddingTop: 12,
        borderTopWidth: 2,
        borderTopColor: '#E0E0E0',
    },
    resumenLabelTotal: {
        fontSize: 14,
        fontWeight: '700',
        color: '#2D3436',
    },
    resumenValorTotal: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FF6B6B',
    },
    footer: {
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
    },
    footerTexto: {
        fontSize: 11,
        color: '#95A5A6',
    },
});