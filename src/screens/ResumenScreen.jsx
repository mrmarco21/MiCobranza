import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { obtenerAbonosDelDia, obtenerAbonosDeLaSemana } from '../logic/movimientosService';
import {
    verificarYGuardarReporteAutomatico,
    obtenerReportesGuardados,
    exportarReporteSemanaActual,
    exportarReporteCSV,
    guardarReporteSemanal
} from '../logic/reportesService';
import { formatCurrency, sumarMontos, formatDate } from '../utils/helpers';
import Header from '../components/Header';
import CustomModal from '../components/CustomModal';

export default function ResumenScreen() {
    const [cobroHoy, setCobroHoy] = useState(0);
    const [cobroSemana, setCobroSemana] = useState(0);
    const [reportes, setReportes] = useState([]);
    const [exportando, setExportando] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [modalConfig, setModalConfig] = useState({});

    const showModal = (config) => {
        setModalConfig(config);
        setModalVisible(true);
    };

    useFocusEffect(
        useCallback(() => {
            cargarDatos();
        }, [])
    );

    const cargarDatos = async () => {
        const abonosHoy = await obtenerAbonosDelDia();
        const abonosSemana = await obtenerAbonosDeLaSemana();
        setCobroHoy(sumarMontos(abonosHoy));
        setCobroSemana(sumarMontos(abonosSemana));

        await verificarYGuardarReporteAutomatico();

        const reportesGuardados = await obtenerReportesGuardados();
        setReportes(reportesGuardados);
    };

    const handleExportarSemanaActual = async () => {
        try {
            setExportando(true);
            await exportarReporteSemanaActual();
        } catch (error) {
            if (error.message === 'No hay movimientos esta semana') {
                showModal({
                    type: 'warning',
                    title: 'Sin datos',
                    message: 'No hay movimientos registrados esta semana para exportar',
                });
            } else {
                showModal({
                    type: 'error',
                    title: 'Error',
                    message: 'No se pudo exportar. Intenta de nuevo.',
                });
                console.log('Error exportar:', error);
            }
        } finally {
            setExportando(false);
        }
    };

    const handleExportarReporte = async (reporte) => {
        if (reporte.movimientos.length === 0) {
            showModal({
                type: 'warning',
                title: 'Sin datos',
                message: 'Este reporte no tiene movimientos',
            });
            return;
        }
        try {
            setExportando(true);
            await exportarReporteCSV(reporte);
        } catch (error) {
            showModal({
                type: 'error',
                title: 'Error',
                message: 'No se pudo exportar. Intenta de nuevo.',
            });
            console.log('Error exportar reporte:', error);
        } finally {
            setExportando(false);
        }
    };

    const handleGuardarSemanaActual = async () => {
        try {
            await guardarReporteSemanal();
            const reportesGuardados = await obtenerReportesGuardados();
            setReportes(reportesGuardados);
            showModal({
                type: 'success',
                title: 'Guardado',
                message: 'Reporte de la semana guardado correctamente',
            });
        } catch (error) {
            showModal({
                type: 'error',
                title: 'Error',
                message: 'No se pudo guardar el reporte',
            });
        }
    };

    const hoy = new Date().toLocaleDateString('es-MX', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

    return (
        <View style={styles.container}>
            <Header title="Resumen de Cobros" />
            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.contenido}>
                    {/* Fecha */}
                    <View style={styles.fechaContainer}>
                        <Ionicons name="calendar" size={16} color="#636E72" />
                        <Text style={styles.fecha}>{hoy}</Text>
                    </View>

                    {/* Cards de resumen en grid */}
                    <View style={styles.cardsGrid}>
                        {/* Card Cobrado Hoy */}
                        <View style={styles.cardHoy}>
                            <View style={styles.cardHeader}>
                                <View style={styles.cardIcono}>
                                    <Ionicons name="today" size={22} color="#4CAF50" />
                                </View>
                                <View style={styles.cardBadge}>
                                    <Text style={styles.cardBadgeText}>HOY</Text>
                                </View>
                            </View>
                            <Text style={styles.cardLabel}>Cobrado hoy</Text>
                            <Text style={styles.cardMonto}>{formatCurrency(cobroHoy)}</Text>
                            <View style={styles.cardFooter}>
                                <Ionicons name="arrow-up-circle" size={14} color="#4CAF50" />
                                <Text style={styles.cardDesc}>Total de abonos</Text>
                            </View>
                        </View>

                        {/* Card Cobrado Semana */}
                        <View style={styles.cardSemana}>
                            <View style={styles.cardHeader}>
                                <View style={styles.cardIconoSemana}>
                                    <Ionicons name="calendar" size={22} color="#6C5CE7" />
                                </View>
                                <View style={styles.cardBadgeSemana}>
                                    <Text style={styles.cardBadgeTextSemana}>SEMANA</Text>
                                </View>
                            </View>
                            <Text style={styles.cardLabelSemana}>Esta semana</Text>
                            <Text style={styles.cardMontoSemana}>{formatCurrency(cobroSemana)}</Text>
                            <View style={styles.cardFooter}>
                                <Ionicons name="trending-up" size={14} color="#6C5CE7" />
                                <Text style={styles.cardDescSemana}>Acumulado</Text>
                            </View>
                        </View>
                    </View>

                    {/* Sección de acciones */}
                    <View style={styles.seccionCard}>
                        <View style={styles.seccionHeader}>
                            <Ionicons name="settings-outline" size={20} color="#2D3436" />
                            <Text style={styles.seccionTitulo}>Acciones rápidas</Text>
                        </View>

                        <TouchableOpacity
                            style={styles.botonExportar}
                            onPress={handleExportarSemanaActual}
                            disabled={exportando}
                            activeOpacity={0.7}
                        >
                            <View style={styles.botonContenido}>
                                <View style={styles.botonIconoWrapper}>
                                    {exportando ? (
                                        <ActivityIndicator size="small" color="#6C5CE7" />
                                    ) : (
                                        <Ionicons name="download" size={22} color="#6C5CE7" />
                                    )}
                                </View>
                                <View style={styles.botonTextos}>
                                    <Text style={styles.botonTitulo}>Exportar semana actual</Text>
                                    <Text style={styles.botonSubtitulo}>Descargar como CSV</Text>
                                </View>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#B0B0B0" />
                        </TouchableOpacity>

                        <View style={styles.divisor} />

                        <TouchableOpacity
                            style={styles.botonGuardar}
                            onPress={handleGuardarSemanaActual}
                            activeOpacity={0.7}
                        >
                            <View style={styles.botonContenido}>
                                <View style={styles.botonIconoWrapperGuardar}>
                                    <Ionicons name="save" size={22} color="#4CAF50" />
                                </View>
                                <View style={styles.botonTextos}>
                                    <Text style={styles.botonTituloGuardar}>Guardar reporte</Text>
                                    <Text style={styles.botonSubtitulo}>Semana actual</Text>
                                </View>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#B0B0B0" />
                        </TouchableOpacity>
                    </View>

                    {/* Lista de reportes guardados */}
                    {reportes.length > 0 && (
                        <View style={styles.seccionCard}>
                            <View style={styles.reportesHeader}>
                                <View style={styles.seccionHeader}>
                                    <Ionicons name="folder-open-outline" size={20} color="#2D3436" />
                                    <Text style={styles.seccionTitulo}>Reportes guardados</Text>
                                </View>
                                <View style={styles.contadorBadge}>
                                    <Text style={styles.contadorTexto}>{reportes.length}</Text>
                                </View>
                            </View>

                            <View style={styles.reportesLista}>
                                {reportes.map((reporte, index) => (
                                    <View key={reporte.id}>
                                        {index > 0 && <View style={styles.divisor} />}
                                        <TouchableOpacity
                                            style={styles.reporteCard}
                                            onPress={() => handleExportarReporte(reporte)}
                                            activeOpacity={0.7}
                                        >
                                            <View style={styles.reporteIcono}>
                                                <Ionicons name="document-text" size={20} color="#6C5CE7" />
                                            </View>
                                            <View style={styles.reporteInfo}>
                                                <Text style={styles.reporteFechas}>
                                                    {formatDate(reporte.fechaInicio)} - {formatDate(reporte.fechaFin)}
                                                </Text>
                                                <View style={styles.reporteDetalles}>
                                                    <View style={styles.reporteDetallePill}>
                                                        <Ionicons name="swap-horizontal" size={12} color="#636E72" />
                                                        <Text style={styles.reporteDetalle}>
                                                            {reporte.totalMovimientos}
                                                        </Text>
                                                    </View>
                                                    <View style={styles.reporteDetallePill}>
                                                        <Ionicons name="cash" size={12} color="#4CAF50" />
                                                        <Text style={[styles.reporteDetalle, { color: '#4CAF50', fontWeight: '600' }]}>
                                                            {formatCurrency(reporte.totalAbonos)}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </View>
                                            <View style={styles.reporteAccion}>
                                                <Ionicons name="download-outline" size={20} color="#6C5CE7" />
                                            </View>
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Info sobre guardado automático */}
                    <View style={styles.infoContainer}>
                        <View style={styles.infoIcono}>
                            <Ionicons name="information-circle" size={20} color="#6C5CE7" />
                        </View>
                        <Text style={styles.infoTexto}>
                            Los reportes se guardan automáticamente cada semana. Toca un reporte para descargarlo.
                        </Text>
                    </View>
                </View>
            </ScrollView>

            <CustomModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                {...modalConfig}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFBFC',
    },
    scrollView: {
        flex: 1,
    },
    contenido: {
        padding: 16,
    },
    fechaContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 15,
        // paddingVertical: 8,
    },
    fecha: {
        fontSize: 14,
        color: '#636E72',
        textTransform: 'capitalize',
        fontWeight: '500',
    },
    cardsGrid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 15,
    },
    cardHoy: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        padding: 18,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#E8F5E9',
    },
    cardSemana: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        padding: 18,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#F0EBFF',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    cardIcono: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#E8F5E9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardIconoSemana: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#F0EBFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardBadge: {
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    cardBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#4CAF50',
        letterSpacing: 0.5,
    },
    cardBadgeSemana: {
        backgroundColor: '#F0EBFF',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    cardBadgeTextSemana: {
        fontSize: 10,
        fontWeight: '700',
        color: '#6C5CE7',
        letterSpacing: 0.5,
    },
    cardLabel: {
        fontSize: 12,
        color: '#95A5A6',
        marginBottom: 6,
        fontWeight: '500',
    },
    cardLabelSemana: {
        fontSize: 12,
        color: '#95A5A6',
        marginBottom: 6,
        fontWeight: '500',
    },
    cardMonto: {
        fontSize: 24,
        fontWeight: '700',
        color: '#4CAF50',
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    cardMontoSemana: {
        fontSize: 24,
        fontWeight: '700',
        color: '#6C5CE7',
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    cardDesc: {
        fontSize: 11,
        color: '#4CAF50',
        fontWeight: '500',
    },
    cardDescSemana: {
        fontSize: 11,
        color: '#6C5CE7',
        fontWeight: '500',
    },
    seccionCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F5F5F5',
    },
    seccionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    seccionTitulo: {
        fontSize: 16,
        fontWeight: '700',
        color: '#2D3436',
    },
    botonExportar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
    },
    botonGuardar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
    },
    botonContenido: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    botonIconoWrapper: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#F0EBFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    botonIconoWrapperGuardar: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#E8F5E9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    botonTextos: {
        flex: 1,
    },
    botonTitulo: {
        fontSize: 15,
        fontWeight: '600',
        color: '#2D3436',
        marginBottom: 2,
    },
    botonTituloGuardar: {
        fontSize: 15,
        fontWeight: '600',
        color: '#2D3436',
        marginBottom: 2,
    },
    botonSubtitulo: {
        fontSize: 12,
        color: '#95A5A6',
    },
    divisor: {
        height: 1,
        backgroundColor: '#F0F0F0',
        marginVertical: 4,
    },
    reportesHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    contadorBadge: {
        backgroundColor: '#F0EBFF',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        minWidth: 28,
        alignItems: 'center',
    },
    contadorTexto: {
        fontSize: 13,
        fontWeight: '700',
        color: '#6C5CE7',
    },
    reportesLista: {
        marginTop: 8,
    },
    reporteCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
    },
    reporteIcono: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: '#F0EBFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    reporteInfo: {
        flex: 1,
    },
    reporteFechas: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2D3436',
        marginBottom: 6,
    },
    reporteDetalles: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    reporteDetallePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#F8F9FA',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    reporteDetalle: {
        fontSize: 12,
        color: '#636E72',
        fontWeight: '500',
    },
    reporteAccion: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#F0EBFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#F0EBFF',
        padding: 12,
        borderRadius: 12,
        marginBottom: 10,
        gap: 12,
    },
    infoIcono: {
        marginTop: 1,
    },
    infoTexto: {
        fontSize: 13,
        color: '#6C5CE7',
        flex: 1,
        lineHeight: 19,
        fontWeight: '500',
    },
});