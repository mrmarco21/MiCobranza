import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { obtenerResumenPorCategoria, obtenerMovimientosPorCategoria } from '../logic/reportesService';
import * as categoriasRepo from '../data/categoriasRepository';
import Header from '../components/Header';
import { useTheme } from '../hooks/useTheme';

export default function ProductosVendidosScreen({ navigation }) {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(true);
    const [resumen, setResumen] = useState(null);
    const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('TODAS');
    const [movimientos, setMovimientos] = useState([]);
    const [rangoFecha, setRangoFecha] = useState('MES');
    const [mesSeleccionado, setMesSeleccionado] = useState(new Date().getMonth());
    const [anioSeleccionado, setAnioSeleccionado] = useState(new Date().getFullYear());
    const [fechaInicio, setFechaInicio] = useState(null);
    const [fechaFin, setFechaFin] = useState(null);
    const [ordenamiento, setOrdenamiento] = useState('FECHA_DESC');
    const [showModalOrden, setShowModalOrden] = useState(false);
    const [categorias, setCategorias] = useState([]);
    const [showDatePickerInicio, setShowDatePickerInicio] = useState(false);
    const [showDatePickerFin, setShowDatePickerFin] = useState(false);
    const [tempFechaInicio, setTempFechaInicio] = useState(new Date());
    const [tempFechaFin, setTempFechaFin] = useState(new Date());

    const meses = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const styles = useMemo(() => createStyles(colors), [colors]);

    useEffect(() => {
        cargarCategorias();
        cargarDatos();
    }, [rangoFecha, mesSeleccionado, anioSeleccionado, fechaInicio, fechaFin]);

    const cargarCategorias = async () => {
        const cats = await categoriasRepo.getCategorias();
        setCategorias(cats);
    };

    useEffect(() => {
        if (resumen) {
            cargarMovimientos();
        }
    }, [categoriaSeleccionada, resumen, ordenamiento]);

    const obtenerRangoFechas = () => {
        let inicio, fin;

        if (rangoFecha === 'SEMANA') {
            const hoy = new Date();
            // Fin es hoy a las 23:59:59
            fin = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59, 999);
            // Inicio es hace 6 días a las 00:00:00
            inicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 6, 0, 0, 0, 0);
        } else if (rangoFecha === 'MES') {
            console.log('Calculando rango MES:', { mesSeleccionado, anioSeleccionado });
            inicio = new Date(anioSeleccionado, mesSeleccionado, 1, 0, 0, 0, 0);
            fin = new Date(anioSeleccionado, mesSeleccionado + 1, 0, 23, 59, 59, 999);
            console.log('Rango calculado:', {
                inicio: inicio.toISOString(),
                fin: fin.toISOString(),
                inicioLocal: inicio.toString(),
                finLocal: fin.toString()
            });
        } else if (rangoFecha === 'PERSONALIZADO' && fechaInicio && fechaFin) {
            inicio = new Date(fechaInicio);
            inicio.setHours(0, 0, 0, 0);
            fin = new Date(fechaFin);
            fin.setHours(23, 59, 59, 999);
        } else {
            const hoy = new Date();
            inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1, 0, 0, 0, 0);
            fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59, 999);
        }

        return { inicio, fin };
    };

    const obtenerAniosDisponibles = () => {
        const anioActual = new Date().getFullYear();
        const anios = [];
        for (let i = anioActual; i >= anioActual - 5; i--) {
            anios.push(i);
        }
        return anios;
    };

    const seleccionarMes = (mes, anio) => {
        setRangoFecha('MES');
        setMesSeleccionado(mes);
        setAnioSeleccionado(anio);
        setShowModalMes(false);
    };

    const aplicarFechaPersonalizada = (inicio, fin) => {
        setFechaInicio(inicio);
        setFechaFin(fin);
        setRangoFecha('PERSONALIZADO');
        setShowModalFecha(false);
    };

    const ordenarMovimientos = (movs) => {
        const movimientosOrdenados = [...movs];

        movimientosOrdenados.sort((a, b) => {
            if (ordenamiento === 'FECHA_DESC') {
                return new Date(b.fecha) - new Date(a.fecha);
            } else if (ordenamiento === 'FECHA_ASC') {
                return new Date(a.fecha) - new Date(b.fecha);
            } else if (ordenamiento === 'MONTO_DESC') {
                const totalA = a.prendas.reduce((sum, p) => sum + (p.monto || 0), 0);
                const totalB = b.prendas.reduce((sum, p) => sum + (p.monto || 0), 0);
                return totalB - totalA;
            } else if (ordenamiento === 'MONTO_ASC') {
                const totalA = a.prendas.reduce((sum, p) => sum + (p.monto || 0), 0);
                const totalB = b.prendas.reduce((sum, p) => sum + (p.monto || 0), 0);
                return totalA - totalB;
            }
            return 0;
        });

        return movimientosOrdenados;
    };

    const cargarDatos = async () => {
        setLoading(true);
        try {
            const { inicio, fin } = obtenerRangoFechas();
            const data = await obtenerResumenPorCategoria(inicio, fin);
            setResumen(data);
        } catch (error) {
            console.error('Error cargando resumen:', error);
        } finally {
            setLoading(false);
        }
    };

    const cargarMovimientos = async () => {
        if (categoriaSeleccionada === 'TODAS') {
            setMovimientos([]);
            return;
        }

        try {
            const { inicio, fin } = obtenerRangoFechas();
            const data = await obtenerMovimientosPorCategoria(categoriaSeleccionada, inicio, fin);
            const ordenados = ordenarMovimientos(data);
            setMovimientos(ordenados);
        } catch (error) {
            console.error('Error cargando movimientos:', error);
        }
    };

    const formatCurrency = (value) => {
        return `S/ ${parseFloat(value).toFixed(2)}`;
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const [dia, mes, anio] = dateString.split('/');
        return `${dia}/${mes}/${anio}`;
    };

    const obtenerTextoRango = () => {
        if (rangoFecha === 'SEMANA') {
            return 'Últimos 7 días';
        } else if (rangoFecha === 'MES') {
            const mesNombre = meses[mesSeleccionado];
            return `${mesNombre} ${anioSeleccionado}`;
        } else if (rangoFecha === 'PERSONALIZADO' && fechaInicio && fechaFin) {
            const inicio = new Date(fechaInicio);
            const fin = new Date(fechaFin);
            return `${inicio.getDate()}/${inicio.getMonth() + 1} - ${fin.getDate()}/${fin.getMonth() + 1}`;
        }
        return 'Mes actual';
    };

    const onChangeFechaInicio = (event, selectedDate) => {
        setShowDatePickerInicio(Platform.OS === 'ios');
        if (selectedDate) {
            setTempFechaInicio(selectedDate);
            setFechaInicio(selectedDate);
            setRangoFecha('PERSONALIZADO');
        }
    };

    const onChangeFechaFin = (event, selectedDate) => {
        setShowDatePickerFin(Platform.OS === 'ios');
        if (selectedDate) {
            setTempFechaFin(selectedDate);
            setFechaFin(selectedDate);
            setRangoFecha('PERSONALIZADO');
        }
    };

    const cambiarMes = (direccion) => {
        let nuevoMes = mesSeleccionado + direccion;
        let nuevoAnio = anioSeleccionado;

        if (nuevoMes > 11) {
            nuevoMes = 0;
            nuevoAnio++;
        } else if (nuevoMes < 0) {
            nuevoMes = 11;
            nuevoAnio--;
        }

        setMesSeleccionado(nuevoMes);
        setAnioSeleccionado(nuevoAnio);
    };

    const obtenerIconoOrden = () => {
        if (ordenamiento.includes('FECHA')) {
            return ordenamiento === 'FECHA_DESC' ? 'arrow-down' : 'arrow-up';
        } else {
            return ordenamiento === 'MONTO_DESC' ? 'arrow-down' : 'arrow-up';
        }
    };

    const obtenerTextoOrden = () => {
        const textos = {
            'FECHA_DESC': 'Más recientes',
            'FECHA_ASC': 'Más antiguos',
            'MONTO_DESC': 'Mayor monto',
            'MONTO_ASC': 'Menor monto'
        };
        return textos[ordenamiento] || 'Ordenar';
    };

    const renderResumenCard = (categoriaId, datos, icono, color) => {
        const esSeleccionada = categoriaSeleccionada === categoriaId;
        const cat = categorias.find(c => c.id === categoriaId);
        const nombreCategoria = cat ? cat.nombre : categoriaId;

        return (
            <TouchableOpacity
                key={categoriaId}
                style={[
                    styles.resumenCard,
                    esSeleccionada && styles.resumenCardActiva
                ]}
                onPress={() => setCategoriaSeleccionada(categoriaId)}
                activeOpacity={0.7}
            >
                <View style={styles.resumenCardHeader}>
                    <View style={[styles.iconoCategoria, { backgroundColor: color + '15' }]}>
                        <Ionicons name={icono} size={20} color={color} />
                    </View>
                    <View style={styles.resumenCardInfo}>
                        <Text style={styles.resumenLabel}>{nombreCategoria}</Text>
                        <Text style={styles.resumenCantidad}>{datos.cantidad} artículos</Text>
                    </View>
                    {esSeleccionada && (
                        <View style={[styles.checkIcon, { backgroundColor: color }]}>
                            <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                        </View>
                    )}
                </View>
                <View style={styles.resumenCardFooter}>
                    <Text style={[styles.resumenMonto, { color }]}>{formatCurrency(datos.total)}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    const renderArticulo = (articulo, index, clientaNombre, fechaMovimiento) => (
        <View key={index} style={styles.articuloItem}>
            <View style={[
                styles.articuloIcono,
                { backgroundColor: categorias.find(c => c.id === articulo.categoria)?.color + '15' || '#E1F5FE' }
            ]}>
                <Ionicons
                    name={categorias.find(c => c.id === articulo.categoria)?.icono || 'pricetag-outline'}
                    size={20}
                    color={categorias.find(c => c.id === articulo.categoria)?.color || '#45beffff'}
                />
            </View>
            <View style={styles.articuloInfo}>
                <Text style={styles.articuloDescripcion} numberOfLines={1}>{articulo.descripcion}</Text>
                <View style={styles.articuloMetadata}>
                    <Ionicons name="person-outline" size={12} color={colors.textTertiary} />
                    <Text style={styles.articuloCliente} numberOfLines={1}>{clientaNombre}</Text>
                    <View style={styles.separator} />
                    <Ionicons name="calendar-outline" size={12} color={colors.textTertiary} />
                    <Text style={styles.articuloFecha}>{formatDate(articulo.fecha || fechaMovimiento)}</Text>
                </View>
            </View>
            <Text style={styles.articuloMonto}>{formatCurrency(articulo.monto)}</Text>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.container}>
                <Header title="Productos Vendidos" showBack />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#45beffff" />
                    <Text style={styles.loadingText}>Cargando datos...</Text>
                </View>
            </View>
        );
    }

    const totalGeneral = Object.values(resumen || {}).reduce((sum, cat) => sum + (cat.total || 0), 0);
    const cantidadTotal = Object.values(resumen || {}).reduce((sum, cat) => sum + (cat.cantidad || 0), 0);
    const promedioVenta = cantidadTotal > 0 ? totalGeneral / cantidadTotal : 0;

    return (
        <View style={styles.container}>
            <Header title="Productos Vendidos" showBack />

            {/* Barra de filtros */}
            <View style={styles.filtrosContainer}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filtrosScroll}
                >
                    <TouchableOpacity
                        style={[styles.filtroChip, rangoFecha === 'SEMANA' && styles.filtroChipActivo]}
                        onPress={() => setRangoFecha('SEMANA')}
                    >
                        <Ionicons
                            name="calendar-outline"
                            size={14}
                            color={rangoFecha === 'SEMANA' ? '#FFFFFF' : colors.textSecondary}
                        />
                        <Text style={[styles.filtroChipTexto, rangoFecha === 'SEMANA' && styles.filtroChipTextoActivo]}>
                            Últimos 7 días
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.filtroChip, rangoFecha === 'MES' && styles.filtroChipActivo]}
                        onPress={() => setRangoFecha('MES')}
                    >
                        <Ionicons
                            name="calendar"
                            size={14}
                            color={rangoFecha === 'MES' ? '#FFFFFF' : colors.textSecondary}
                        />
                        <Text style={[styles.filtroChipTexto, rangoFecha === 'MES' && styles.filtroChipTextoActivo]}>
                            {obtenerTextoRango()}
                        </Text>
                    </TouchableOpacity>

                    {rangoFecha === 'MES' && (
                        <>
                            <TouchableOpacity
                                style={styles.mesNavBtn}
                                onPress={() => cambiarMes(-1)}
                            >
                                <Ionicons name="chevron-back" size={16} color="#45beffff" />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.mesNavBtn}
                                onPress={() => cambiarMes(1)}
                            >
                                <Ionicons name="chevron-forward" size={16} color="#45beffff" />
                            </TouchableOpacity>
                        </>
                    )}

                    <TouchableOpacity
                        style={[styles.filtroChip, rangoFecha === 'PERSONALIZADO' && styles.filtroChipActivo]}
                        onPress={() => {
                            setRangoFecha('PERSONALIZADO');
                            if (!fechaInicio) setFechaInicio(new Date());
                            if (!fechaFin) setFechaFin(new Date());
                        }}
                    >
                        <Ionicons
                            name="options-outline"
                            size={14}
                            color={rangoFecha === 'PERSONALIZADO' ? '#FFFFFF' : colors.textSecondary}
                        />
                        <Text style={[styles.filtroChipTexto, rangoFecha === 'PERSONALIZADO' && styles.filtroChipTextoActivo]}>
                            {rangoFecha === 'PERSONALIZADO' ? obtenerTextoRango() : 'Personalizado'}
                        </Text>
                    </TouchableOpacity>
                </ScrollView>

                {/* Selectores de fecha personalizada */}
                {rangoFecha === 'PERSONALIZADO' && (
                    <View style={styles.fechasPersonalizadas}>
                        <TouchableOpacity
                            style={styles.fechaSelector}
                            onPress={() => setShowDatePickerInicio(true)}
                        >
                            <Ionicons name="calendar-outline" size={16} color="#45beffff" />
                            <View style={styles.fechaSelectorInfo}>
                                <Text style={styles.fechaSelectorLabel}>Desde</Text>
                                <Text style={styles.fechaSelectorFecha}>
                                    {fechaInicio ? new Date(fechaInicio).toLocaleDateString('es-PE', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric'
                                    }) : 'Seleccionar'}
                                </Text>
                            </View>
                        </TouchableOpacity>

                        <View style={styles.fechaSeparador}>
                            <Ionicons name="arrow-forward" size={14} color={colors.textTertiary} />
                        </View>

                        <TouchableOpacity
                            style={styles.fechaSelector}
                            onPress={() => setShowDatePickerFin(true)}
                        >
                            <Ionicons name="calendar-outline" size={16} color="#45beffff" />
                            <View style={styles.fechaSelectorInfo}>
                                <Text style={styles.fechaSelectorLabel}>Hasta</Text>
                                <Text style={styles.fechaSelectorFecha}>
                                    {fechaFin ? new Date(fechaFin).toLocaleDateString('es-PE', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric'
                                    }) : 'Seleccionar'}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                )}

                {categoriaSeleccionada !== 'TODAS' && movimientos.length > 0 && (
                    <TouchableOpacity
                        style={styles.ordenBtn}
                        onPress={() => setShowModalOrden(true)}
                    >
                        <Ionicons name={obtenerIconoOrden()} size={14} color="#45beffff" />
                        <Text style={styles.ordenTexto}>{obtenerTextoOrden()}</Text>
                        <Ionicons name="chevron-down" size={12} color="#45beffff" />
                    </TouchableOpacity>
                )}
            </View>

            {/* DateTimePickers */}
            {showDatePickerInicio && (
                <DateTimePicker
                    value={tempFechaInicio}
                    mode="date"
                    display="default"
                    onChange={onChangeFechaInicio}
                    maximumDate={fechaFin || new Date()}
                />
            )}

            {showDatePickerFin && (
                <DateTimePicker
                    value={tempFechaFin}
                    mode="date"
                    display="default"
                    onChange={onChangeFechaFin}
                    minimumDate={fechaInicio}
                    maximumDate={new Date()}
                />
            )}

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Card de total general */}
                <View style={styles.totalCard}>
                    <View style={styles.totalHeader}>
                        <View style={styles.totalIconContainer}>
                            <Ionicons name="analytics" size={24} color="#FFFFFF" />
                        </View>
                        <View style={styles.totalHeaderInfo}>
                            <Text style={styles.totalLabel}>Total de Ventas</Text>
                            <Text style={styles.totalPeriodo}>{obtenerTextoRango()}</Text>
                        </View>
                    </View>

                    <Text style={styles.totalMonto}>{formatCurrency(totalGeneral)}</Text>

                    <View style={styles.totalDivisor} />

                    <View style={styles.totalStats}>
                        <View style={styles.statItem}>
                            <View style={styles.statIconContainer}>
                                <Ionicons name="cube-outline" size={18} color="rgba(255,255,255,0.9)" />
                            </View>
                            <View style={styles.statInfo}>
                                <Text style={styles.statValor}>{cantidadTotal}</Text>
                                <Text style={styles.statLabel}>Artículos vendidos</Text>
                            </View>
                        </View>

                        <View style={styles.statItem}>
                            <View style={styles.statIconContainer}>
                                <Ionicons name="trending-up-outline" size={18} color="rgba(255,255,255,0.9)" />
                            </View>
                            <View style={styles.statInfo}>
                                <Text style={styles.statValor}>{formatCurrency(promedioVenta)}</Text>
                                <Text style={styles.statLabel}>Venta promedio</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Sección de categorías */}
                <View style={styles.seccionContainer}>
                    <View style={styles.seccionHeader}>
                        <Text style={styles.seccionTitulo}>Categorías</Text>
                        <Text style={styles.seccionSubtitulo}>Selecciona para ver detalle</Text>
                    </View>

                    <View style={styles.categoriasGrid}>
                        <TouchableOpacity
                            style={[
                                styles.resumenCard,
                                styles.todasCard,
                                categoriaSeleccionada === 'TODAS' && styles.resumenCardActiva
                            ]}
                            onPress={() => setCategoriaSeleccionada('TODAS')}
                            activeOpacity={0.7}
                        >
                            <View style={styles.resumenCardHeader}>
                                <View style={[styles.iconoCategoria, { backgroundColor: '#9C27B015' }]}>
                                    <Ionicons name="grid-outline" size={20} color="#9C27B0" />
                                </View>
                                <View style={styles.resumenCardInfo}>
                                    <Text style={styles.resumenLabel}>Todas</Text>
                                    <Text style={styles.resumenCantidad}>{cantidadTotal} artículos</Text>
                                </View>
                                {categoriaSeleccionada === 'TODAS' && (
                                    <View style={[styles.checkIcon, { backgroundColor: '#9C27B0' }]}>
                                        <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                                    </View>
                                )}
                            </View>
                            <View style={styles.resumenCardFooter}>
                                <Text style={[styles.resumenMonto, { color: '#9C27B0' }]}>{formatCurrency(totalGeneral)}</Text>
                            </View>
                        </TouchableOpacity>

                        {resumen && categorias.map(cat =>
                            resumen[cat.id] && renderResumenCard(cat.id, resumen[cat.id], cat.icono, cat.color)
                        )}
                    </View>
                </View>

                {/* Lista de artículos detallados */}
                {categoriaSeleccionada !== 'TODAS' && movimientos.length > 0 && (
                    <View style={styles.seccionContainer}>
                        <View style={styles.seccionHeader}>
                            <Text style={styles.seccionTitulo}>
                                Detalle de {categorias.find(c => c.id === categoriaSeleccionada)?.nombre || 'Productos'}
                            </Text>
                            <Text style={styles.seccionSubtitulo}>{movimientos.reduce((sum, mov) => sum + mov.prendas.length, 0)} artículos</Text>
                        </View>

                        <View style={styles.listaArticulos}>
                            {movimientos.map((mov, idx) => (
                                <View key={idx}>
                                    {mov.prendas.map((prenda, pIdx) =>
                                        renderArticulo(prenda, `${idx}-${pIdx}`, mov.clientaNombre, mov.fecha)
                                    )}
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {categoriaSeleccionada !== 'TODAS' && movimientos.length === 0 && (
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIconContainer}>
                            <Ionicons name="cube-outline" size={48} color={colors.textTertiary} />
                        </View>
                        <Text style={styles.emptyTitulo}>Sin productos</Text>
                        <Text style={styles.emptyTexto}>
                            No hay productos en esta categoría{'\n'}para el período seleccionado
                        </Text>
                    </View>
                )}

                <View style={styles.bottomPadding} />
            </ScrollView>

            {/* Modales */}
            <ModalOrdenamiento
                visible={showModalOrden}
                onClose={() => setShowModalOrden(false)}
                ordenActual={ordenamiento}
                onSeleccionar={(orden) => {
                    setOrdenamiento(orden);
                    setShowModalOrden(false);
                }}
            />
        </View>
    );
}

// Componente Modal Ordenamiento
function ModalOrdenamiento({ visible, onClose, ordenActual, onSeleccionar }) {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const opciones = [
        { id: 'FECHA_DESC', icono: 'time-outline', texto: 'Más recientes primero', subtexto: 'Ordenar por fecha descendente' },
        { id: 'FECHA_ASC', icono: 'time-outline', texto: 'Más antiguos primero', subtexto: 'Ordenar por fecha ascendente' },
        { id: 'MONTO_DESC', icono: 'cash-outline', texto: 'Mayor monto primero', subtexto: 'Ordenar por monto descendente' },
        { id: 'MONTO_ASC', icono: 'cash-outline', texto: 'Menor monto primero', subtexto: 'Ordenar por monto ascendente' },
    ];

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
                <View style={[styles.modalContainer, styles.modalOrden]} onStartShouldSetResponder={() => true}>
                    <View style={styles.modalHeader}>
                        <View>
                            <Text style={styles.modalTitulo}>Ordenar listado</Text>
                            <Text style={styles.modalSubtitulo}>Elige el criterio de ordenamiento</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
                            <Ionicons name="close-circle" size={28} color={colors.textTertiary} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.ordenOpciones}>
                        {opciones.map((opcion) => {
                            const esActual = ordenActual === opcion.id;
                            return (
                                <TouchableOpacity
                                    key={opcion.id}
                                    style={[styles.ordenOpcion, esActual && styles.ordenOpcionActiva]}
                                    onPress={() => onSeleccionar(opcion.id)}
                                    activeOpacity={0.7}
                                >
                                    <View style={[
                                        styles.ordenIconContainer,
                                        esActual && styles.ordenIconContainerActivo
                                    ]}>
                                        <Ionicons
                                            name={opcion.icono}
                                            size={20}
                                            color={esActual ? '#45beffff' : colors.textSecondary}
                                        />
                                    </View>
                                    <View style={styles.ordenTextos}>
                                        <Text style={[styles.ordenOpcionTexto, esActual && styles.ordenOpcionTextoActivo]}>
                                            {opcion.texto}
                                        </Text>
                                        <Text style={styles.ordenOpcionSubtexto}>{opcion.subtexto}</Text>
                                    </View>
                                    {esActual && (
                                        <View style={styles.ordenCheckContainer}>
                                            <Ionicons name="checkmark-circle" size={24} color="#45beffff" />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            </TouchableOpacity>
        </Modal>
    );
}

const createStyles = (colors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
        color: colors.textSecondary,
        marginTop: 8,
    },
    scrollView: {
        flex: 1,
    },

    // Filtros
    filtrosContainer: {
        backgroundColor: colors.card,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    filtrosScroll: {
        paddingHorizontal: 16,
        gap: 8,
    },
    filtroChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 20,
        backgroundColor: colors.surfaceVariant,
        gap: 6,
        borderWidth: 1,
        borderColor: colors.border,
    },
    filtroChipActivo: {
        backgroundColor: '#45beffff',
        borderColor: '#45beffff',
    },
    filtroChipTexto: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    filtroChipTextoActivo: {
        color: '#FFFFFF',
    },
    ordenBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        marginLeft: 16,
        marginTop: 8,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 16,
        backgroundColor: colors.primaryLight,
        gap: 4,
    },
    ordenTexto: {
        fontSize: 12,
        fontWeight: '600',
        color: '#45beffff',
    },
    mesNavBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 4,
    },
    fechasPersonalizadas: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 12,
        gap: 8,
    },
    fechaSelector: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 10,
        gap: 8,
        borderWidth: 1,
        borderColor: colors.border,
    },
    fechaSelectorInfo: {
        flex: 1,
    },
    fechaSelectorLabel: {
        fontSize: 10,
        color: colors.textSecondary,
        fontWeight: '600',
        marginBottom: 2,
        textTransform: 'uppercase',
    },
    fechaSelectorFecha: {
        fontSize: 13,
        color: colors.text,
        fontWeight: '600',
    },
    fechaSeparador: {
        paddingHorizontal: 4,
    },

    // Total Card
    totalCard: {
        backgroundColor: '#45beffff',
        margin: 16,
        padding: 20,
        borderRadius: 16,
        shadowColor: '#45beffff',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
    },
    totalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 12,
    },
    totalIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    totalHeaderInfo: {
        flex: 1,
    },
    totalLabel: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.85)',
        fontWeight: '500',
        letterSpacing: 0.3,
    },
    totalPeriodo: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.7)',
        marginTop: 2,
    },
    totalMonto: {
        fontSize: 38,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 16,
        letterSpacing: -0.5,
    },
    totalDivisor: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.2)',
        marginBottom: 16,
    },
    totalStats: {
        flexDirection: 'row',
        gap: 16,
    },
    statItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    statIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    statInfo: {
        flex: 1,
    },
    statValor: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.75)',
        fontWeight: '500',
    },

    // Sección
    seccionContainer: {
        marginBottom: 20,
    },
    seccionHeader: {
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    seccionTitulo: {
        fontSize: 17,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 4,
    },
    seccionSubtitulo: {
        fontSize: 13,
        color: colors.textSecondary,
    },

    // Categorías Grid
    categoriasGrid: {
        paddingHorizontal: 16,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    resumenCard: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 12,
        borderWidth: 2,
        borderColor: colors.border,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        width: '48%',
    },
    resumenCardActiva: {
        borderColor: '#45beffff',
        backgroundColor: colors.cardActiva,
    },
    todasCard: {
        borderColor: colors.border,
        width: '100%',
    },
    resumenCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    iconoCategoria: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    resumenCardInfo: {
        flex: 1,
    },
    resumenLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 2,
    },
    resumenCantidad: {
        fontSize: 11,
        color: colors.textTertiary,
    },
    checkIcon: {
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    resumenCardFooter: {
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    resumenMonto: {
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: -0.5,
    },

    // Lista de artículos
    listaArticulos: {
        paddingHorizontal: 16,
        gap: 8,
    },
    articuloItem: {
        flexDirection: 'row',
        backgroundColor: colors.card,
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 2,
        elevation: 1,
    },
    articuloIcono: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    articuloInfo: {
        flex: 1,
        gap: 4,
    },
    articuloDescripcion: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
    },
    articuloMetadata: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    articuloCliente: {
        fontSize: 12,
        color: colors.textTertiary,
        flex: 1,
    },
    separator: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: colors.border,
        marginHorizontal: 4,
    },
    articuloFecha: {
        fontSize: 11,
        color: colors.textTertiary,
    },
    articuloMonto: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
        marginLeft: 8,
    },

    // Empty State
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        paddingHorizontal: 40,
    },
    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.surfaceVariant,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyTitulo: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textSecondary,
        marginBottom: 8,
    },
    emptyTexto: {
        fontSize: 13,
        color: colors.textTertiary,
        textAlign: 'center',
        lineHeight: 20,
    },

    // Modales
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContainer: {
        backgroundColor: colors.card,
        borderRadius: 20,
        padding: 24,
        width: '100%',
        maxWidth: 420,
        maxHeight: '85%',
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    modalOrden: {
        maxHeight: 500,
    },
    modalCalendario: {
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24,
    },
    modalTitulo: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 4,
    },
    modalSubtitulo: {
        fontSize: 13,
        color: colors.textSecondary,
    },
    modalCloseBtn: {
        padding: 4,
    },

    // Modal Mes
    anioSelector: {
        marginBottom: 20,
    },
    selectorLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textSecondary,
        marginBottom: 10,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    anioChips: {
        flexDirection: 'row',
        gap: 8,
    },
    anioChip: {
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 20,
        backgroundColor: colors.surfaceVariant,
        borderWidth: 2,
        borderColor: colors.surfaceVariant,
    },
    anioChipActivo: {
        backgroundColor: '#E1F5FE',
        borderColor: '#45beffff',
    },
    anioChipTexto: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    anioChipTextoActivo: {
        color: '#45beffff',
    },
    mesSelector: {
        marginTop: 8,
    },
    mesesScroll: {
        maxHeight: 350,
    },
    mesesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    mesChip: {
        width: '31%',
        paddingVertical: 16,
        borderRadius: 12,
        backgroundColor: colors.surfaceVariant,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.surfaceVariant,
    },
    mesChipActivo: {
        backgroundColor: '#E1F5FE',
        borderColor: '#45beffff',
    },
    mesChipTexto: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    mesChipTextoActivo: {
        color: '#45beffff',
    },

    // Selector de Día
    diaSelector: {
        marginTop: 8,
    },
    diasScroll: {
        maxHeight: 180,
    },
    diasGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    diaChip: {
        width: '13%',
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: colors.surfaceVariant,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.surfaceVariant,
    },
    diaChipActivo: {
        backgroundColor: '#E1F5FE',
        borderColor: '#45beffff',
    },
    diaChipTexto: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    diaChipTextoActivo: {
        color: '#45beffff',
    },

    // Modal Rango Personalizado
    modoSelector: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    modoChip: {
        flex: 1,
        flexDirection: 'row',
        padding: 14,
        borderRadius: 12,
        backgroundColor: colors.surfaceVariant,
        borderWidth: 2,
        borderColor: colors.surfaceVariant,
        alignItems: 'center',
        gap: 10,
    },
    modoChipActivo: {
        backgroundColor: '#E1F5FE',
        borderColor: '#45beffff',
    },
    modoChipInfo: {
        flex: 1,
    },
    modoChipLabel: {
        fontSize: 11,
        color: colors.textSecondary,
        fontWeight: '500',
        marginBottom: 4,
    },
    modoChipLabelActivo: {
        color: '#45beffff',
    },
    modoChipFecha: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.text,
    },
    modoChipFechaActiva: {
        color: '#45beffff',
    },
    fechaControles: {
        gap: 14,
        marginBottom: 24,
        backgroundColor: colors.surfaceVariant,
        padding: 16,
        borderRadius: 12,
    },
    controlRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    controlLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
        width: 50,
    },
    controlBotones: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 8,
    },
    controlBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.surfaceVariant,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    controlValor: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
        minWidth: 40,
        textAlign: 'center',
    },
    atajosContainer: {
        marginBottom: 16,
    },
    atajosLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.textSecondary,
        marginBottom: 10,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    atajosGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    atajoChip: {
        flex: 1,
        minWidth: '22%',
        flexDirection: 'row',
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderRadius: 10,
        backgroundColor: colors.surfaceVariant,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    atajoChipTexto: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    aplicarBtn: {
        flexDirection: 'row',
        backgroundColor: '#45beffff',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        shadowColor: '#45beffff',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
        marginTop: 16,
    },
    aplicarBtnDisabled: {
        backgroundColor: '#95A5A6',
        shadowOpacity: 0,
        elevation: 0,
    },
    aplicarBtnTexto: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF',
    },

    // Calendario
    rangoSeleccionado: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.surfaceVariant,
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
    },
    fechaBox: {
        flex: 1,
        alignItems: 'center',
    },
    fechaBoxLabel: {
        fontSize: 11,
        color: colors.textSecondary,
        fontWeight: '600',
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    fechaBoxValor: {
        fontSize: 16,
        color: colors.text,
        fontWeight: '700',
    },
    atajosRapidos: {
        gap: 10,
    },
    atajosScroll: {
        marginBottom: 16,
    },
    atajosHorizontal: {
        flexDirection: 'row',
        gap: 8,
        paddingHorizontal: 2,
    },
    atajoBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 10,
        backgroundColor: colors.surfaceVariant,
        borderWidth: 1,
        borderColor: colors.border,
    },
    atajoBtnTexto: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    calendario: {
        borderRadius: 12,
        marginBottom: 8,
    },

    // Modal Ordenamiento
    ordenOpciones: {
        gap: 8,
    },
    ordenOpcion: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: colors.surfaceVariant,
        gap: 12,
    },
    ordenOpcionActiva: {
        backgroundColor: '#E1F5FE',
    },
    ordenIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.card,
        justifyContent: 'center',
        alignItems: 'center',
    },
    ordenIconContainerActivo: {
        backgroundColor: '#FFFFFF',
    },
    ordenTextos: {
        flex: 1,
    },
    ordenOpcionTexto: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2D3436',
        marginBottom: 2,
    },
    ordenOpcionTextoActivo: {
        color: '#45beffff',
    },
    ordenOpcionSubtexto: {
        fontSize: 12,
        color: '#95A5A6',
    },
    ordenCheckContainer: {
        marginLeft: 8,
    },

    bottomPadding: {
        height: 40,
    },
});