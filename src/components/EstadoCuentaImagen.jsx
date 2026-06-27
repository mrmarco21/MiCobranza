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

    const acento = esCerrada ? '#16A34A' : '#0EA5E9';

    return (
        <View style={styles.container}>
            {/* ===== Encabezado ===== */}
            <View style={[styles.header, { backgroundColor: acento }]}>
                <View style={styles.headerTop}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.tituloPequeno}>ESTADO DE CUENTA</Text>
                        <Text style={styles.clienteNombre}>{clientaNombre}</Text>
                    </View>
                    <View style={styles.numeroBadge}>
                        <Text style={styles.numeroLabel}>CUENTA</Text>
                        <Text style={styles.numeroTexto}>#{numeroCuenta}</Text>
                    </View>
                </View>

                <View style={styles.headerChips}>
                    <View style={styles.chip}>
                        <Text style={styles.chipLabel}>Apertura</Text>
                        <Text style={styles.chipValor}>{formatDate(fechaCreacion)}</Text>
                    </View>
                    {fechaCierre && (
                        <View style={styles.chip}>
                            <Text style={styles.chipLabel}>Cierre</Text>
                            <Text style={styles.chipValor}>{formatDate(fechaCierre)}</Text>
                        </View>
                    )}
                    {esCerrada && (
                        <View style={[styles.chip, styles.chipPagada]}>
                            <Text style={styles.chipPagadaTexto}>✓ PAGADA</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* ===== Saldo ===== */}
            <View style={[
                styles.saldoContainer,
                { borderColor: esCerrada ? '#16A34A' : '#FF6B6B', backgroundColor: esCerrada ? '#F0FDF4' : '#FFF5F5' }
            ]}>
                <Text style={styles.saldoLabel}>{esCerrada ? 'SALDO FINAL' : 'SALDO PENDIENTE'}</Text>
                <Text style={[styles.saldoMonto, { color: esCerrada ? '#16A34A' : '#FF6B6B' }]}>
                    {formatCurrency(saldo)}
                </Text>
                {esCerrada && saldo === 0 && (
                    <Text style={styles.saldoPagadoTexto}>Totalmente pagado</Text>
                )}
            </View>

            {/* ===== Movimientos ===== */}
            {movimientos.length > 0 && (
                <View style={styles.movimientosContainer}>
                    <Text style={styles.seccionTitulo}>HISTORIAL DE MOVIMIENTOS</Text>

                    {movsOrdenados.map((mov) => {
                        const esCargo = mov.tipo === 'CARGO';
                        const fechaMov = formatDate(mov.fecha);
                        const prendas = esCargo ? parsearPrendas(mov.comentario) : [];
                        const tienePrendas = prendas.length > 0 && prendas.some(p => p.monto !== null);
                        const descripcionAbono = !esCargo ? extraerDescripcionAbono(mov.comentario) : '';

                        return (
                            <View
                                key={mov.id}
                                style={[
                                    styles.movimientoCard,
                                    { borderLeftColor: esCargo ? '#FF6B6B' : '#16A34A' }
                                ]}
                            >
                                {/* Cabecera del movimiento: tipo + fecha (una sola vez) y monto */}
                                <View style={styles.movimientoHeader}>
                                    <View style={styles.movimientoTipoWrap}>
                                        <View style={[
                                            styles.tipoBadge,
                                            { backgroundColor: esCargo ? '#FFE5E5' : '#DCFCE7' }
                                        ]}>
                                            <Text style={[
                                                styles.tipoTexto,
                                                { color: esCargo ? '#DC2626' : '#16A34A' }
                                            ]}>
                                                {esCargo ? 'CARGO' : 'ABONO'}
                                            </Text>
                                        </View>
                                        <Text style={styles.movimientoFecha}>{fechaMov}</Text>
                                    </View>
                                    <Text style={[
                                        styles.movimientoMonto,
                                        { color: esCargo ? '#DC2626' : '#16A34A' }
                                    ]}>
                                        {esCargo ? '+' : '−'} {formatCurrency(mov.monto)}
                                    </Text>
                                </View>

                                {/* Detalle de prendas (CARGO) */}
                                {esCargo && tienePrendas && (
                                    <View style={styles.prendasDetalle}>
                                        {prendas.map((prenda, i) => {
                                            const categoria = prenda.categoria
                                                ? categorias.find(c => c.id === prenda.categoria)
                                                : null;
                                            // Mostrar la fecha de la prenda SOLO si es distinta a la del movimiento
                                            const mostrarFechaPrenda = prenda.fecha && prenda.fecha !== fechaMov;

                                            return (
                                                <View key={i} style={styles.prendaItem}>
                                                    <Text style={styles.prendaNumero}>{i + 1}</Text>
                                                    <View style={styles.prendaInfo}>
                                                        <Text style={styles.prendaDesc}>
                                                            {prenda.descripcion}
                                                            {prenda.cantidad > 1 && (
                                                                <Text style={styles.prendaCantidad}>  ×{prenda.cantidad}</Text>
                                                            )}
                                                        </Text>
                                                        <View style={styles.prendaMetaRow}>
                                                            {/* {categoria && (
                                                                <View style={[
                                                                    styles.categoriaBadge,
                                                                    { backgroundColor: categoria.color + '1A', borderColor: categoria.color + '55' }
                                                                ]}>
                                                                    <Text style={[styles.categoriaTexto, { color: categoria.color }]}>
                                                                        {categoria.nombre}
                                                                    </Text>
                                                                </View>
                                                            )}
                                                            {mostrarFechaPrenda && (
                                                                <Text style={styles.prendaFecha}>{prenda.fecha}</Text>
                                                            )} */}
                                                        </View>
                                                    </View>
                                                    {prenda.monto !== null && (
                                                        <Text style={styles.prendaMonto}>{formatCurrency(prenda.monto)}</Text>
                                                    )}
                                                </View>
                                            );
                                        })}
                                    </View>
                                )}

                                {/* Nota del abono (sin repetir la fecha) */}
                                {!esCargo && descripcionAbono ? (
                                    <View style={styles.abonoDetalle}>
                                        <Text style={styles.abonoDesc}>{descripcionAbono}</Text>
                                    </View>
                                ) : null}
                            </View>
                        );
                    })}
                </View>
            )}

            {/* ===== Resumen ===== */}
            <View style={styles.resumenContainer}>
                <Text style={styles.resumenTitulo}>RESUMEN</Text>
                <View style={styles.resumenRow}>
                    <Text style={styles.resumenLabel}>Total cargos</Text>
                    <Text style={styles.resumenValorCargo}>{formatCurrency(totalCargos)}</Text>
                </View>
                <View style={styles.resumenRow}>
                    <Text style={styles.resumenLabel}>Total abonos</Text>
                    <Text style={styles.resumenValorAbono}>− {formatCurrency(totalAbonos)}</Text>
                </View>
                <View style={[styles.resumenRow, styles.resumenTotal]}>
                    <Text style={styles.resumenLabelTotal}>Saldo pendiente</Text>
                    <Text style={[styles.resumenValorTotal, { color: esCerrada ? '#16A34A' : '#FF6B6B' }]}>
                        {formatCurrency(saldo)}
                    </Text>
                </View>
            </View>

            {/* ===== Footer ===== */}
            <View style={styles.footer}>
                <Text style={styles.footerTexto}>Generado el {formatDate(new Date().toISOString())}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#FFFFFF',
        padding: 22,
        width: 600,
    },

    // Header
    header: {
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    tituloPequeno: {
        fontSize: 12,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.85)',
        letterSpacing: 2,
        marginBottom: 4,
    },
    clienteNombre: {
        fontSize: 24,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    numeroBadge: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 10,
        alignItems: 'center',
    },
    numeroLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.85)',
        letterSpacing: 1,
    },
    numeroTexto: {
        fontSize: 18,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    headerChips: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 16,
        flexWrap: 'wrap',
    },
    chip: {
        backgroundColor: 'rgba(255,255,255,0.18)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    chipLabel: {
        fontSize: 9,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    chipValor: {
        fontSize: 13,
        color: '#FFFFFF',
        fontWeight: '700',
    },
    chipPagada: {
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
    },
    chipPagadaTexto: {
        fontSize: 12,
        fontWeight: '800',
        color: '#16A34A',
        letterSpacing: 0.5,
    },

    // Saldo
    saldoContainer: {
        padding: 18,
        borderRadius: 14,
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1.5,
    },
    saldoLabel: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '700',
        marginBottom: 4,
        letterSpacing: 1.5,
    },
    saldoMonto: {
        fontSize: 36,
        fontWeight: '800',
    },
    saldoPagadoTexto: {
        fontSize: 13,
        color: '#16A34A',
        fontWeight: '700',
        marginTop: 4,
    },

    // Movimientos
    movimientosContainer: {
        marginBottom: 20,
    },
    seccionTitulo: {
        fontSize: 12,
        fontWeight: '800',
        color: '#94A3B8',
        marginBottom: 12,
        letterSpacing: 1,
    },
    movimientoCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#EDF1F5',
        borderLeftWidth: 4,
        padding: 14,
        marginBottom: 10,
    },
    movimientoHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    movimientoTipoWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    tipoBadge: {
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 6,
    },
    tipoTexto: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    movimientoFecha: {
        fontSize: 13,
        color: '#64748B',
        fontWeight: '600',
    },
    movimientoMonto: {
        fontSize: 17,
        fontWeight: '800',
    },
    prendasDetalle: {
        backgroundColor: '#F8FAFC',
        padding: 12,
        borderRadius: 10,
        marginTop: 12,
        gap: 8,
    },
    prendaItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    prendaNumero: {
        fontSize: 11,
        fontWeight: '700',
        color: '#FFFFFF',
        backgroundColor: '#CBD5E1',
        width: 18,
        height: 18,
        borderRadius: 9,
        textAlign: 'center',
        lineHeight: 18,
        marginRight: 10,
        overflow: 'hidden',
    },
    prendaInfo: {
        flex: 1,
    },
    prendaDesc: {
        fontSize: 13,
        color: '#1E293B',
        fontWeight: '500',
    },
    prendaCantidad: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '700',
    },
    prendaMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 3,
        flexWrap: 'wrap',
    },
    categoriaBadge: {
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 1,
    },
    categoriaTexto: {
        fontSize: 9,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    prendaFecha: {
        fontSize: 10,
        color: '#94A3B8',
        fontWeight: '600',
    },
    prendaMonto: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1E293B',
        marginLeft: 8,
    },
    abonoDetalle: {
        backgroundColor: '#F8FAFC',
        padding: 10,
        borderRadius: 10,
        marginTop: 10,
    },
    abonoDesc: {
        fontSize: 12,
        color: '#475569',
        fontStyle: 'italic',
    },

    // Resumen
    resumenContainer: {
        backgroundColor: '#F8FAFC',
        padding: 18,
        borderRadius: 14,
        marginBottom: 16,
    },
    resumenTitulo: {
        fontSize: 12,
        fontWeight: '800',
        color: '#94A3B8',
        marginBottom: 12,
        letterSpacing: 1,
    },
    resumenRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    resumenLabel: {
        fontSize: 13,
        color: '#64748B',
        fontWeight: '500',
    },
    resumenValorCargo: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FF6B6B',
    },
    resumenValorAbono: {
        fontSize: 14,
        fontWeight: '700',
        color: '#16A34A',
    },
    resumenTotal: {
        marginTop: 4,
        marginBottom: 0,
        paddingTop: 12,
        borderTopWidth: 1.5,
        borderTopColor: '#E2E8F0',
    },
    resumenLabelTotal: {
        fontSize: 15,
        fontWeight: '800',
        color: '#1E293B',
    },
    resumenValorTotal: {
        fontSize: 18,
        fontWeight: '800',
    },

    // Footer
    footer: {
        alignItems: 'center',
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: '#EDF1F5',
    },
    footerTexto: {
        fontSize: 11,
        color: '#94A3B8',
    },
});
