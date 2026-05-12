import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, StatusBar, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatCurrency, obtenerNombreProductoCompleto } from '../../shared/utils/helpers';
import Header from '../../shared/components/Header';
import { useTheme } from '../../shared/hooks/useTheme';
import { obtenerCuentaActiva, abrirNuevaCuenta } from '../../services/cuentasService';
import { registrarMovimiento } from '../../services/movimientosService';
import { create as crearVenta, generarNumeroDocumento } from '../../data/ventasRepository';
import { actualizarStock } from '../../data/productosRepository';

const PUNTO_VENTA_STORAGE_KEY = '@punto_venta_temp';

export default function MetodoPagoScreen({ route, navigation }) {
    const { productosSeleccionados, clienteSeleccionado, totalVenta, cuentaId, nuevaCuenta } = route.params || {};
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();

    const [tipoPago, setTipoPago] = useState('contado'); // 'contado', 'credito' o 'parcial'
    const [metodosPago, setMetodosPago] = useState([
        { id: 'efectivo', nombre: 'EFECTIVO', monto: totalVenta || 0, activo: true }
    ]);
    const [modalEditarMonto, setModalEditarMonto] = useState(false);
    const [metodoEditando, setMetodoEditando] = useState(null);
    const [montoTemporal, setMontoTemporal] = useState('');

    // Estados para pago parcial
    const [montoParcial, setMontoParcial] = useState('');

    // Estados para crédito
    const [numeroCuotas, setNumeroCuotas] = useState(1);
    const [periodo, setPeriodo] = useState('Mensual');
    const [fechaPrimeraCuota, setFechaPrimeraCuota] = useState(new Date());

    // Estados para comentario
    const [modalComentario, setModalComentario] = useState(false);
    const [comentario, setComentario] = useState('');

    // Estado local para el cliente seleccionado
    const [clienteActual, setClienteActual] = useState(clienteSeleccionado);

    React.useEffect(() => {
        StatusBar.setBarStyle('dark-content');
        return () => {
            StatusBar.setBarStyle('light-content');
        };
    }, []);

    // Manejar el retorno del cliente seleccionado
    React.useEffect(() => {
        if (route.params?.clienteSeleccionado) {
            setClienteActual(route.params.clienteSeleccionado);
        }
    }, [route.params?.clienteSeleccionado]);

    const metodosDisponibles = [
        { id: 'efectivo', nombre: 'EFECTIVO', icon: 'cash-outline' },
        { id: 'yape', nombre: 'Yape', icon: 'phone-portrait-outline' },
        { id: 'deposito', nombre: 'Depósito o Transferencia', icon: 'card-outline' },
    ];

    const handleAgregarMetodo = (metodo) => {
        const existe = metodosPago.find(m => m.id === metodo.id);
        if (!existe) {
            const montoFaltante = calcularFaltante();
            setMetodosPago([...metodosPago, { ...metodo, monto: montoFaltante > 0 ? montoFaltante : 0, activo: true }]);
        }
    };

    const handleEliminarMetodo = (metodoId) => {
        setMetodosPago(metodosPago.filter(m => m.id !== metodoId));
    };

    const handleCambiarMonto = (metodoId, nuevoMonto) => {
        const monto = parseFloat(nuevoMonto) || 0;
        setMetodosPago(metodosPago.map(m =>
            m.id === metodoId ? { ...m, monto, activo: monto > 0 } : m
        ));
    };

    const handleAbrirEditarMonto = (metodo) => {
        setMetodoEditando(metodo);
        setMontoTemporal(metodo.monto > 0 ? metodo.monto.toString() : '');
        setModalEditarMonto(true);
    };

    const handleGuardarMonto = () => {
        if (metodoEditando) {
            handleCambiarMonto(metodoEditando.id, montoTemporal);
        }
        setModalEditarMonto(false);
        setMetodoEditando(null);
        setMontoTemporal('');
    };

    const handleCancelarEdicion = () => {
        setModalEditarMonto(false);
        setMetodoEditando(null);
        setMontoTemporal('');
    };

    const handleAbrirComentario = () => {
        setModalComentario(true);
    };

    const handleGuardarComentario = () => {
        setModalComentario(false);
    };

    const handleCancelarComentario = () => {
        setModalComentario(false);
    };

    const handleSeleccionarCliente = () => {
        navigation.navigate('clientas', {
            fromPuntoVenta: true,
            productosSeleccionados: productosSeleccionados,
            totalVenta: totalVenta,
            returnToMetodoPago: true,
        });
    };

    const calcularMontoRecibido = () => {
        return metodosPago.reduce((sum, m) => sum + m.monto, 0);
    };

    const calcularFaltante = () => {
        return totalVenta - calcularMontoRecibido();
    };

    const handleCobrar = async () => {
        try {
            // Generar número de documento (formato AAMM-0001)
            const numeroDocumento = await generarNumeroDocumento();

            if (tipoPago === 'contado') {
                // Venta al contado
                const venta = {
                    numeroDocumento,
                    tipo: 'CONTADO',
                    clienteId: clienteActual?.id || null,
                    clienteNombre: clienteActual?.nombre || 'Cliente Genérico',
                    productos: productosSeleccionados.map(p => ({
                        id: p.id,
                        nombre: p.nombre,
                        marca: p.marca || '',
                        modelo: p.modelo || '',
                        color: p.color || '',
                        talla: p.talla || '',
                        cantidad: p.cantidad || 1,
                        precioVenta: p.precioVenta,
                        categoria: p.categoria || 'ropa-otros'
                    })),
                    total: totalVenta,
                    metodoPago: metodosPago.length === 1 ? metodosPago[0].nombre : 'MIXTO',
                    metodosPago: metodosPago.filter(m => m.monto > 0),
                    estadoDespacho: 'PENDIENTE',
                    estadoPago: 'PAGADO',
                    deuda: 0,
                    comentario: comentario || '',
                    cuentaId: null,
                    fecha: new Date().toISOString()
                };

                await crearVenta(venta);

                // Actualizar stock de productos vendidos
                await actualizarStock(productosSeleccionados.map(p => ({
                    productoId: p.id,
                    cantidad: p.cantidad || 1
                })));

                Alert.alert('Éxito', 'Venta al contado registrada');

                // Limpiar el storage temporal
                await AsyncStorage.removeItem(PUNTO_VENTA_STORAGE_KEY);

                // Resetear el stack de navegación incluyendo PuntoVenta limpio
                navigation.reset({
                    index: 1,
                    routes: [
                        { name: 'Inicio' },
                        { name: 'PuntoVenta', params: { limpiarEstado: true } },
                        { name: 'ListaVentas' }
                    ],
                });
            } else if (tipoPago === 'parcial') {
                // Pago parcial: valida que haya cliente y monto
                if (!clienteActual) {
                    Alert.alert('Error', 'Debe seleccionar un cliente para pago parcial');
                    return;
                }

                const montoParcialNum = parseFloat(montoParcial) || 0;
                if (montoParcialNum <= 0) {
                    Alert.alert('Error', 'Ingrese un monto válido mayor a cero');
                    return;
                }

                if (montoParcialNum >= totalVenta) {
                    Alert.alert('Error', 'El monto parcial debe ser menor al total. Use "CONTADO" para pagar el total');
                    return;
                }

                await procesarVentaParcial(montoParcialNum);
            } else {
                // Crédito: Guardar en cuenta pendiente
                if (!clienteActual) {
                    Alert.alert('Error', 'Debe seleccionar un cliente para venta a crédito');
                    return;
                }

                // SIEMPRE crear una nueva cuenta para cada venta
                // Cada venta tiene su propia cuenta independiente
                const cuenta = await abrirNuevaCuenta(clienteActual.id);

                // Procesar la venta con la nueva cuenta
                await procesarVentaCredito(false, cuenta);
            }
        } catch (error) {
            console.error('Error al cobrar:', error);
            Alert.alert('Error', 'No se pudo registrar la venta');
        }
    };

    // Función auxiliar para procesar venta a crédito
    const procesarVentaCredito = async (crearNuevaCuenta, cuentaExistente = null) => {
        try {
            let cuenta;

            if (crearNuevaCuenta) {
                // Crear una nueva cuenta
                cuenta = await abrirNuevaCuenta(clienteActual.id);
            } else if (cuentaExistente) {
                // Usar la cuenta existente
                cuenta = cuentaExistente;
            } else {
                // Esto no debería pasar, pero por seguridad
                Alert.alert('Error', 'No se pudo determinar la cuenta');
                return;
            }

            // Generar número de documento (formato AAMM-0001)
            const numeroDocumento = await generarNumeroDocumento();

            // Crear el comentario con los productos
            console.log('🔍 Productos seleccionados antes de guardar:', productosSeleccionados);
            const comentarioProductos = productosSeleccionados.map(p => {
                console.log('📦 Producto completo:', {
                    nombre: p.nombre,
                    marca: p.marca,
                    modelo: p.modelo,
                    color: p.color,
                    talla: p.talla,
                    categoria: p.categoria,
                    categoriaType: typeof p.categoria
                });
                const fecha = new Date().toLocaleDateString('es-PE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });
                // Formato: "Nombre Completo (S/Precio) x Cantidad [Fecha] {categoria}"
                // Usar nombre completo del producto
                const nombreCompleto = obtenerNombreProductoCompleto(p);
                console.log('✅ Nombre completo generado:', nombreCompleto);
                const categoria = (p.categoria || 'ropa-otros').toLowerCase();
                const cantidad = p.cantidad || 1;
                console.log('💾 Guardando con categoría:', categoria);
                return `${nombreCompleto} (S/${p.precioVenta.toFixed(2)}) x ${cantidad} [${fecha}] {${categoria}}`;
            }).join(' | ');

            console.log('📝 Comentario final:', comentarioProductos);

            // Agregar el cargo a la cuenta
            await registrarMovimiento(
                cuenta.id,
                'CARGO',
                totalVenta,
                comentarioProductos
            );

            // Guardar la venta a crédito
            const venta = {
                numeroDocumento,
                tipo: 'CREDITO',
                clienteId: clienteActual.id,
                clienteNombre: clienteActual.nombre,
                productos: productosSeleccionados.map(p => ({
                    id: p.id,
                    nombre: p.nombre,
                    marca: p.marca || '',
                    modelo: p.modelo || '',
                    color: p.color || '',
                    talla: p.talla || '',
                    cantidad: p.cantidad || 1,
                    precioVenta: p.precioVenta,
                    categoria: p.categoria || 'ropa-otros'
                })),
                total: totalVenta,
                metodoPago: 'CREDITO',
                metodosPago: [],
                estadoDespacho: 'PENDIENTE',
                estadoPago: 'PENDIENTE',
                deuda: totalVenta,
                comentario: comentario || '',
                cuentaId: cuenta.id,
                fecha: new Date().toISOString()
            };

            await crearVenta(venta);

            // Actualizar stock de productos vendidos
            await actualizarStock(productosSeleccionados.map(p => ({
                productoId: p.id,
                cantidad: p.cantidad || 1
            })));

            Alert.alert('Éxito', 'Venta a crédito registrada correctamente');

            // Limpiar el storage temporal
            await AsyncStorage.removeItem(PUNTO_VENTA_STORAGE_KEY);

            // Resetear el stack de navegación para ir al inicio, limpiar PuntoVenta y luego al detalle de la clienta
            // Esto evita que al presionar atrás regrese a MetodoPago
            navigation.reset({
                index: 2,
                routes: [
                    { name: 'Inicio' },
                    { name: 'PuntoVenta', params: { limpiarEstado: true } },
                    { name: 'ClientaDetail', params: { clientaId: clienteActual.id } }
                ],
            });
        } catch (error) {
            console.error('Error al procesar venta a crédito:', error);
            Alert.alert('Error', 'No se pudo registrar la venta');
        }
    };

    // Función auxiliar para procesar venta parcial
    const procesarVentaParcial = async (montoPagado) => {
        try {
            // SIEMPRE crear una nueva cuenta para cada venta
            // Cada venta tiene su propia cuenta independiente
            const cuenta = await abrirNuevaCuenta(clienteActual.id);

            await finalizarVentaParcial(cuenta, montoPagado);
        } catch (error) {
            console.error('Error al procesar venta parcial:', error);
            Alert.alert('Error', 'No se pudo registrar la venta parcial');
        }
    };

    const finalizarVentaParcial = async (cuenta, montoPagado) => {
        try {
            const numeroDocumento = await generarNumeroDocumento();

            // Crear el comentario con los productos
            console.log('🔍 [PARCIAL] Productos seleccionados antes de guardar:', productosSeleccionados);
            const comentarioProductos = productosSeleccionados.map(p => {
                console.log('📦 [PARCIAL] Producto completo:', {
                    nombre: p.nombre,
                    marca: p.marca,
                    modelo: p.modelo,
                    color: p.color,
                    talla: p.talla,
                    categoria: p.categoria
                });
                const fecha = new Date().toLocaleDateString('es-PE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });
                // Usar nombre completo del producto
                const nombreCompleto = obtenerNombreProductoCompleto(p);
                console.log('✅ [PARCIAL] Nombre completo generado:', nombreCompleto);
                const categoria = (p.categoria || 'ropa-otros').toLowerCase();
                const cantidad = p.cantidad || 1;
                return `${nombreCompleto} (S/${p.precioVenta.toFixed(2)}) x ${cantidad} [${fecha}] {${categoria}}`;
            }).join(' | ');

            console.log('📝 [PARCIAL] Comentario final:', comentarioProductos);

            // IMPORTANTE: Primero registrar el CARGO del total de la venta
            await registrarMovimiento(
                cuenta.id,
                'CARGO',
                totalVenta,
                comentarioProductos
            );

            // Luego registrar el ABONO del pago inicial
            const fechaAbono = new Date().toLocaleDateString('es-PE', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
            // Incluir el comentario del usuario si existe
            const comentarioAbono = comentario.trim()
                ? `${comentario.trim()} [${fechaAbono}]`
                : `Pago inicial [${fechaAbono}]`;

            await registrarMovimiento(
                cuenta.id,
                'ABONO',
                montoPagado,
                comentarioAbono
            );

            // Guardar la venta como PARCIAL
            const venta = {
                numeroDocumento,
                tipo: 'PARCIAL',
                clienteId: clienteActual.id,
                clienteNombre: clienteActual.nombre,
                productos: productosSeleccionados.map(p => ({
                    id: p.id,
                    nombre: p.nombre,
                    marca: p.marca || '',
                    modelo: p.modelo || '',
                    color: p.color || '',
                    talla: p.talla || '',
                    cantidad: p.cantidad || 1,
                    precioVenta: p.precioVenta,
                    categoria: p.categoria || 'ropa-otros'
                })),
                total: totalVenta,
                metodoPago: 'PARCIAL',
                metodosPago: [{ id: 'parcial', nombre: 'PAGO PARCIAL', monto: montoPagado }],
                estadoDespacho: 'PENDIENTE',
                estadoPago: 'PARCIAL',
                deuda: totalVenta - montoPagado, // Deuda pendiente después del pago inicial
                montoPagado: montoPagado,
                comentario: comentario || '',
                cuentaId: cuenta.id,
                fecha: new Date().toISOString()
            };

            await crearVenta(venta);

            // Actualizar stock de productos vendidos
            await actualizarStock(productosSeleccionados.map(p => ({
                productoId: p.id,
                cantidad: p.cantidad || 1
            })));

            Alert.alert(
                'Éxito',
                `Venta registrada:\n• Pagó: ${formatCurrency(montoPagado)}\n• Queda a crédito: ${formatCurrency(totalVenta - montoPagado)}`
            );

            // Limpiar el storage temporal
            await AsyncStorage.removeItem(PUNTO_VENTA_STORAGE_KEY);

            // Navegar al detalle del cliente, incluyendo PuntoVenta limpio en el stack
            navigation.reset({
                index: 2,
                routes: [
                    { name: 'Inicio' },
                    { name: 'PuntoVenta', params: { limpiarEstado: true } },
                    { name: 'ClientaDetail', params: { clientaId: clienteActual.id } }
                ],
            });
        } catch (error) {
            console.error('Error al finalizar venta parcial:', error);
            Alert.alert('Error', 'No se pudo completar la venta parcial');
        }
    };

    const montoRecibido = calcularMontoRecibido();
    const faltante = calcularFaltante();

    const styles = createStyles(colors);

    return (
        <View style={styles.container}>
            <Header
                title={`NOTA DE VENTA - ${formatCurrency(totalVenta)} (${productosSeleccionados?.length || 0})`}
                showBack
                whiteBackground
            // rightButtons={[
            //     {
            //         icon: 'ellipsis-vertical',
            //         onPress: () => { }
            //     }
            // ]}
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: Math.max(insets.bottom + 100, 100) }
                ]}
                showsVerticalScrollIndicator={false}
            >
                {/* Información del cliente */}
                <View style={styles.section}>
                    <TouchableOpacity
                        style={styles.clienteBtn}
                        onPress={handleSeleccionarCliente}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="person-outline" size={20} color="#5DADE2" />
                        <Text style={styles.clienteTexto}>
                            {clienteActual ? clienteActual.nombre : 'Elegir cliente'}
                        </Text>
                        {clienteActual && (
                            <Text style={styles.cambiarTexto}>Cambiar</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.comentarioBtn}
                        onPress={handleAbrirComentario}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="chatbox-outline" size={16} color="#5DADE2" />
                        <Text style={styles.comentarioTexto}>
                            {comentario ? 'Editar comentario' : 'Agregar comentario'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Tabs Contado/Parcial/Crédito */}
                <View style={styles.tabsContainer}>
                    <TouchableOpacity
                        style={[styles.tab, tipoPago === 'contado' && styles.tabActive]}
                        onPress={() => setTipoPago('contado')}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.tabTexto, tipoPago === 'contado' && styles.tabTextoActive]}>
                            CONTADO
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, tipoPago === 'parcial' && styles.tabActive]}
                        onPress={() => setTipoPago('parcial')}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.tabTexto, tipoPago === 'parcial' && styles.tabTextoActive]}>
                            PARCIAL
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, tipoPago === 'credito' && styles.tabActive]}
                        onPress={() => setTipoPago('credito')}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.tabTexto, tipoPago === 'credito' && styles.tabTextoActive]}>
                            CRÉDITO
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Contenido según tipo de pago */}
                {tipoPago === 'contado' ? (
                    <View style={styles.contadoContainer}>
                        {/* Métodos de pago activos */}
                        {metodosPago.map((metodo) => (
                            <View key={metodo.id} style={styles.metodoPagoCard}>
                                <Text style={styles.metodoPagoNombre}>{metodo.nombre}</Text>
                                <View style={styles.metodoPagoRight}>
                                    <Text style={styles.monedaSymbol}>S/</Text>
                                    <Text style={styles.montoTexto}>
                                        {metodo.monto > 0 ? metodo.monto.toFixed(2) : '0.00'}
                                    </Text>
                                    <TouchableOpacity
                                        style={styles.editBtn}
                                        onPress={() => handleAbrirEditarMonto(metodo)}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name="create-outline" size={20} color="#5DADE2" />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.deleteBtn}
                                        onPress={() => handleEliminarMetodo(metodo.id)}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}

                        {/* Resumen */}
                        <View style={styles.resumenContainer}>
                            <View style={styles.resumenRow}>
                                <Text style={styles.resumenLabel}>Monto recibido:</Text>
                                <Text style={styles.resumenValor}>{formatCurrency(montoRecibido)}</Text>
                            </View>
                            {faltante > 0 && (
                                <View style={[styles.resumenRow, styles.resumenFaltante]}>
                                    <Text style={styles.resumenLabelFaltante}>Faltan:</Text>
                                    <View style={styles.faltanteContainer}>
                                        <Text style={styles.resumenValorFaltante}>{formatCurrency(faltante)}</Text>
                                        <Ionicons name="warning" size={20} color="#FFF" style={styles.warningIcon} />
                                    </View>
                                </View>
                            )}
                            <View style={[styles.resumenRow, styles.resumenTotal]}>
                                <Text style={styles.resumenLabelTotal}>Total:</Text>
                                <Text style={styles.resumenValorTotal}>{formatCurrency(totalVenta)}</Text>
                            </View>
                        </View>

                        {/* Métodos de pago disponibles - solo mostrar si hay faltante */}
                        {faltante > 0 && (
                            <View style={styles.metodosDisponiblesContainer}>
                                <Text style={styles.metodosDisponiblesLabel}>
                                    Seleccione un método de pago
                                </Text>
                                <Text style={styles.metodosDisponiblesSubLabel}>
                                    Presiona un método de pago para agregar el monto exacto o MANTEN PRESIONADO la casilla para ver las opciones avanzadas
                                </Text>
                                <View style={styles.metodosGrid}>
                                    {metodosDisponibles.map((metodo) => {
                                        const yaAgregado = metodosPago.find(m => m.id === metodo.id);
                                        const estaDeshabilitado = yaAgregado ? true : false;
                                        return (
                                            <TouchableOpacity
                                                key={metodo.id}
                                                style={[
                                                    styles.metodoBtn,
                                                    yaAgregado && styles.metodoBtnActivo
                                                ]}
                                                onPress={() => handleAgregarMetodo(metodo)}
                                                activeOpacity={0.7}
                                                disabled={estaDeshabilitado}
                                            >
                                                <Ionicons
                                                    name={metodo.icon}
                                                    size={32}
                                                    color={yaAgregado ? '#48C9B0' : '#7F8C8D'}
                                                />
                                                <Text style={[
                                                    styles.metodoBtnTexto,
                                                    yaAgregado && styles.metodoBtnTextoActivo
                                                ]}>
                                                    {metodo.nombre}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        )}
                    </View>
                ) : tipoPago === 'parcial' ? (
                    <View style={styles.parcialContainer}>
                        {/* Resumen del pago parcial */}
                        <View style={styles.parcialCard}>
                            <View style={styles.parcialHeader}>
                                <Ionicons name="cash-outline" size={24} color="#FF9800" />
                                <Text style={styles.parcialHeaderTexto}>Pago Parcial</Text>
                            </View>

                            <View style={styles.parcialInfoRow}>
                                <Text style={styles.parcialLabel}>Total de la venta:</Text>
                                <Text style={styles.parcialValor}>{formatCurrency(totalVenta)}</Text>
                            </View>

                            <View style={styles.parcialInputContainer}>
                                <Text style={styles.parcialInputLabel}>Monto que paga ahora:</Text>
                                <View style={styles.parcialInputWrapper}>
                                    <Text style={styles.parcialMonedaSymbol}>S/</Text>
                                    <TextInput
                                        style={styles.parcialInput}
                                        value={montoParcial}
                                        onChangeText={setMontoParcial}
                                        placeholder="0.00"
                                        placeholderTextColor="#BDC3C7"
                                        keyboardType="decimal-pad"
                                    />
                                </View>
                            </View>

                            {montoParcial && parseFloat(montoParcial) > 0 && (
                                <>
                                    <View style={styles.parcialDivider} />
                                    <View style={styles.parcialInfoRow}>
                                        <Text style={styles.parcialLabelDestacado}>Queda a crédito:</Text>
                                        <Text style={styles.parcialValorCredito}>
                                            {formatCurrency(totalVenta - (parseFloat(montoParcial) || 0))}
                                        </Text>
                                    </View>
                                </>
                            )}
                        </View>

                        {/* Advertencia */}
                        <View style={styles.parcialAdvertencia}>
                            <Ionicons name="information-circle-outline" size={20} color="#29B6F6" />
                            <Text style={styles.parcialAdvertenciaTexto}>
                                El monto restante se registrará como deuda en la cuenta del cliente
                            </Text>
                        </View>
                    </View>
                ) : (
                    <View style={styles.creditoContainer}>
                        {/* Configuración de cuotas */}
                        <View style={styles.cuotasConfig}>
                            <View style={styles.configRow}>
                                <Text style={styles.configLabel}># Cuotas</Text>
                                <View style={styles.cuotasSelector}>
                                    <TouchableOpacity
                                        style={styles.cuotasBtn}
                                        onPress={() => setNumeroCuotas(Math.max(1, numeroCuotas - 1))}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name="remove" size={20} color="#2C3E50" />
                                    </TouchableOpacity>
                                    <Text style={styles.cuotasTexto}>{numeroCuotas}</Text>
                                    <TouchableOpacity
                                        style={styles.cuotasBtn}
                                        onPress={() => setNumeroCuotas(numeroCuotas + 1)}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name="add" size={20} color="#2C3E50" />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.configRow}>
                                <Text style={styles.configLabel}>Periodo</Text>
                                <TouchableOpacity style={styles.periodoSelector} activeOpacity={0.7}>
                                    <Text style={styles.periodoTexto}>{periodo}</Text>
                                    <Ionicons name="chevron-down" size={20} color="#7F8C8D" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.configRow}>
                                <Text style={styles.configLabel}>Fecha de primera cuota</Text>
                                <TouchableOpacity style={styles.fechaSelector} activeOpacity={0.7}>
                                    <Text style={styles.fechaTexto}>
                                        {fechaPrimeraCuota.toLocaleDateString('es-PE')}
                                    </Text>
                                    <Ionicons name="calendar-outline" size={20} color="#5DADE2" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Lista de cuotas */}
                        <View style={styles.cuotasListaContainer}>
                            <View style={styles.cuotasListaHeader}>
                                <Text style={styles.cuotasListaHeaderTexto}>Cuota</Text>
                                <Text style={styles.cuotasListaHeaderTexto}>Fecha de pago</Text>
                            </View>
                            {Array.from({ length: numeroCuotas }).map((_, index) => {
                                const montoCuota = totalVenta / numeroCuotas;
                                const fechaCuota = new Date(fechaPrimeraCuota);
                                fechaCuota.setMonth(fechaCuota.getMonth() + index);

                                return (
                                    <View key={index} style={styles.cuotaRow}>
                                        <View style={styles.cuotaInfo}>
                                            <Text style={styles.cuotaNumero}>#{index + 1}</Text>
                                            <Text style={styles.cuotaMonto}>{formatCurrency(montoCuota)}</Text>
                                        </View>
                                        <View style={styles.cuotaFecha}>
                                            <Text style={styles.cuotaFechaTexto}>
                                                {fechaCuota.toLocaleDateString('es-PE')}
                                            </Text>
                                            <TouchableOpacity activeOpacity={0.7}>
                                                <Ionicons name="create-outline" size={18} color="#5DADE2" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                )}
            </ScrollView>

            {/* Modal para editar monto */}
            <Modal
                visible={modalEditarMonto}
                transparent={true}
                animationType="fade"
                onRequestClose={handleCancelarEdicion}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            Editar monto - {metodoEditando?.nombre}
                        </Text>
                        <View style={styles.modalInputContainer}>
                            <Text style={styles.modalMonedaSymbol}>S/</Text>
                            <TextInput
                                style={styles.modalInput}
                                value={montoTemporal}
                                onChangeText={setMontoTemporal}
                                keyboardType="numeric"
                                placeholder="0.00"
                                placeholderTextColor="#BDC3C7"
                                autoFocus
                            />
                        </View>
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.modalBtnCancelar}
                                onPress={handleCancelarEdicion}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.modalBtnCancelarTexto}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalBtnGuardar}
                                onPress={handleGuardarMonto}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.modalBtnGuardarTexto}>Guardar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Modal para agregar comentario */}
            <Modal
                visible={modalComentario}
                transparent={true}
                animationType="slide"
                onRequestClose={handleCancelarComentario}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, styles.modalComentarioContent]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Comentario de la venta</Text>
                            <TouchableOpacity
                                onPress={handleCancelarComentario}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="close" size={24} color="#7F8C8D" />
                            </TouchableOpacity>
                        </View>
                        <TextInput
                            style={styles.comentarioInput}
                            value={comentario}
                            onChangeText={setComentario}
                            placeholder="Escribe un comentario sobre esta venta..."
                            placeholderTextColor="#BDC3C7"
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                            autoFocus
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.modalBtnCancelar}
                                onPress={handleCancelarComentario}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.modalBtnCancelarTexto}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalBtnGuardar}
                                onPress={handleGuardarComentario}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.modalBtnGuardarTexto}>Guardar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Footer con botón cobrar */}
            <View style={[styles.footerContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
                <TouchableOpacity
                    style={[
                        styles.cobrarBtn,
                        (tipoPago === 'contado' && faltante > 0) && styles.cobrarBtnDisabled,
                        (tipoPago === 'parcial' && (!montoParcial || parseFloat(montoParcial) <= 0)) && styles.cobrarBtnDisabled
                    ]}
                    onPress={handleCobrar}
                    activeOpacity={0.7}
                    disabled={
                        (tipoPago === 'contado' && faltante > 0) ||
                        (tipoPago === 'parcial' && (!montoParcial || parseFloat(montoParcial) <= 0))
                    }
                >
                    <Text style={styles.cobrarTexto}>COBRAR</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const createStyles = (colors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
    },
    section: {
        marginTop: 16,
        gap: 12,
    },
    clienteBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        gap: 8,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    clienteTexto: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
        color: '#5DADE2',
    },
    cambiarTexto: {
        fontSize: 13,
        fontWeight: '600',
        color: '#48C9B0',
        textDecorationLine: 'underline',
    },
    genericoBtn: {
        backgroundColor: '#48C9B0',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
    },
    genericoTexto: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFF',
    },
    comentarioBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 8,
    },
    comentarioTexto: {
        fontSize: 13,
        color: '#5DADE2',
        textDecorationLine: 'underline',
    },
    tabsContainer: {
        flexDirection: 'row',
        marginTop: 20,
        gap: 0,
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 2,
        borderBottomColor: '#E0E0E0',
    },
    tabActive: {
        borderBottomColor: '#48C9B0',
    },
    tabTexto: {
        fontSize: 14,
        fontWeight: '600',
        color: '#7F8C8D',
    },
    tabTextoActive: {
        color: '#48C9B0',
    },
    contadoContainer: {
        marginTop: 20,
    },
    metodoPagoCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    metodoPagoNombre: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2C3E50',
    },
    metodoPagoRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    monedaSymbol: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2C3E50',
    },
    montoTexto: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2C3E50',
        minWidth: 80,
        textAlign: 'right',
    },
    editBtn: {
        padding: 4,
    },
    deleteBtn: {
        padding: 4,
    },
    resumenContainer: {
        marginTop: 20,
        gap: 12,
    },
    resumenRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    resumenLabel: {
        fontSize: 14,
        color: '#2C3E50',
    },
    resumenValor: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2C3E50',
    },
    resumenFaltante: {
        backgroundColor: '#FF6B6B',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    resumenLabelFaltante: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFF',
    },
    faltanteContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    resumenValorFaltante: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFF',
    },
    warningIcon: {
        marginLeft: 4,
    },
    resumenTotal: {
        backgroundColor: '#48C9B0',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    resumenLabelTotal: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFF',
    },
    resumenValorTotal: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFF',
    },
    metodosDisponiblesContainer: {
        marginTop: 24,
    },
    metodosDisponiblesLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2C3E50',
        marginBottom: 8,
    },
    metodosDisponiblesSubLabel: {
        fontSize: 12,
        color: '#7F8C8D',
        lineHeight: 18,
        marginBottom: 16,
    },
    metodosGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    metodoBtn: {
        width: '48%',
        aspectRatio: 1.5,
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        borderWidth: 2,
        borderColor: '#E0E0E0',
    },
    metodoBtnActivo: {
        borderColor: '#48C9B0',
        backgroundColor: '#E8F8F5',
    },
    metodoBtnTexto: {
        fontSize: 12,
        fontWeight: '600',
        color: '#7F8C8D',
        textAlign: 'center',
    },
    metodoBtnTextoActivo: {
        color: '#48C9B0',
    },
    creditoContainer: {
        marginTop: 20,
    },
    parcialContainer: {
        marginTop: 20,
    },
    parcialCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 20,
        borderWidth: 2,
        borderColor: '#FF9800',
    },
    parcialHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#FFE0B2',
    },
    parcialHeaderTexto: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FF9800',
    },
    parcialInfoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    parcialLabel: {
        fontSize: 14,
        color: '#7F8C8D',
        fontWeight: '500',
    },
    parcialValor: {
        fontSize: 16,
        fontWeight: '700',
        color: '#2C3E50',
    },
    parcialInputContainer: {
        marginTop: 8,
        marginBottom: 12,
    },
    parcialInputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2C3E50',
        marginBottom: 8,
    },
    parcialInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF3E0',
        borderRadius: 10,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderWidth: 2,
        borderColor: '#FF9800',
    },
    parcialMonedaSymbol: {
        fontSize: 24,
        fontWeight: '700',
        color: '#FF9800',
        marginRight: 8,
    },
    parcialInput: {
        flex: 1,
        fontSize: 24,
        fontWeight: '700',
        color: '#FF9800',
        padding: 0,
    },
    parcialDivider: {
        height: 1,
        backgroundColor: '#FFE0B2',
        marginVertical: 12,
    },
    parcialLabelDestacado: {
        fontSize: 15,
        fontWeight: '700',
        color: '#2C3E50',
    },
    parcialValorCredito: {
        fontSize: 18,
        fontWeight: '800',
        color: '#FF6B6B',
    },
    parcialAdvertencia: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E3F2FD',
        borderRadius: 8,
        padding: 12,
        marginTop: 16,
        gap: 10,
    },
    parcialAdvertenciaTexto: {
        flex: 1,
        fontSize: 13,
        color: '#1976D2',
        lineHeight: 18,
    },
    cuotasConfig: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 16,
        gap: 16,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    configRow: {
        gap: 8,
    },
    configLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#7F8C8D',
    },
    cuotasSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    cuotasBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F0F0F0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cuotasTexto: {
        fontSize: 18,
        fontWeight: '700',
        color: '#2C3E50',
        minWidth: 40,
        textAlign: 'center',
    },
    periodoSelector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#F8F9FA',
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 12,
    },
    periodoTexto: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2C3E50',
    },
    fechaSelector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#F8F9FA',
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 12,
    },
    fechaTexto: {
        fontSize: 14,
        fontWeight: '600',
        color: '#48C9B0',
    },
    cuotasListaContainer: {
        marginTop: 20,
    },
    cuotasListaHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#F8F9FA',
        borderRadius: 8,
        marginBottom: 8,
    },
    cuotasListaHeaderTexto: {
        fontSize: 12,
        fontWeight: '600',
        color: '#7F8C8D',
    },
    cuotaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    cuotaInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    cuotaNumero: {
        fontSize: 14,
        fontWeight: '600',
        color: '#7F8C8D',
    },
    cuotaMonto: {
        fontSize: 14,
        fontWeight: '700',
        color: '#2C3E50',
    },
    cuotaFecha: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    cuotaFechaTexto: {
        fontSize: 14,
        fontWeight: '600',
        color: '#48C9B0',
    },
    footerContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.card,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingHorizontal: 16,
        paddingTop: 12,
    },
    cobrarBtn: {
        backgroundColor: '#48C9B0',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
    },
    cobrarBtnDisabled: {
        backgroundColor: '#BDC3C7',
    },
    cobrarTexto: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFF',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 24,
        width: '100%',
        maxWidth: 400,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#2C3E50',
        marginBottom: 20,
        textAlign: 'center',
    },
    modalInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8F9FA',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 20,
    },
    modalMonedaSymbol: {
        fontSize: 20,
        fontWeight: '700',
        color: '#2C3E50',
        marginRight: 8,
    },
    modalInput: {
        flex: 1,
        fontSize: 20,
        fontWeight: '700',
        color: '#2C3E50',
        padding: 0,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    modalBtnCancelar: {
        flex: 1,
        backgroundColor: '#F0F0F0',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
    },
    modalBtnCancelarTexto: {
        fontSize: 15,
        fontWeight: '600',
        color: '#7F8C8D',
    },
    modalBtnGuardar: {
        flex: 1,
        backgroundColor: '#48C9B0',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
    },
    modalBtnGuardarTexto: {
        fontSize: 15,
        fontWeight: '600',
        color: '#FFF',
    },
    modalComentarioContent: {
        maxHeight: '60%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    comentarioInput: {
        backgroundColor: '#F8F9FA',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 14,
        color: '#2C3E50',
        minHeight: 120,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
});
