import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Modal, BackHandler } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { registrarMovimiento, editarMovimiento, obtenerMovimientoPorId } from '../logic/movimientosService';
import { abrirNuevaCuenta } from '../logic/cuentasService';
import * as cuentasRepo from '../data/cuentasRepository';
import * as categoriasRepo from '../data/categoriasRepository';
import Header from '../components/Header';
import CustomModal from '../components/CustomModal';
import Toast from '../components/Toast';
import { useTheme } from '../hooks/useTheme';

export default function AddMovimientoScreen({ route, navigation }) {
    const { cuentaId, clientaId, nuevaCuenta, tipo, movimientoId } = route.params;
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const [monto, setMonto] = useState('');
    const [comentario, setComentario] = useState('');
    const [fechaAbono, setFechaAbono] = useState(new Date());
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [modalConfig, setModalConfig] = useState({});
    const [toastVisible, setToastVisible] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [saldoCuenta, setSaldoCuenta] = useState(0);
    const [categorias, setCategorias] = useState([]);

    // Método de pago (abono)
    const [metodoPago, setMetodoPago] = useState('efectivo'); // 'efectivo' | 'yape' | 'transferencia' | 'mixto'
    const [mixtoEfectivo, setMixtoEfectivo] = useState('');
    const [mixtoYape, setMixtoYape] = useState('');
    const [mixtoTransferencia, setMixtoTransferencia] = useState('');

    // Modal para agregar categoría
    const [modalAgregarCategoriaVisible, setModalAgregarCategoriaVisible] = useState(false);
    const [nuevaCategoriaNombre, setNuevaCategoriaNombre] = useState('');
    const [nuevaCategoriaIcono, setNuevaCategoriaIcono] = useState('pricetag-outline');

    // Dropdown para seleccionar categoría
    const [dropdownVisible, setDropdownVisible] = useState({});

    // Estado para múltiples prendas (solo para cargos)
    const [prendas, setPrendas] = useState([
        { monto: '', descripcion: '', fecha: new Date(), categoria: 'ropa-otros' },
        { monto: '', descripcion: '', fecha: new Date(), categoria: 'ropa-otros' }
    ]);

    // Refs para los inputs de monto
    const montoInputRefs = useRef([]);

    // Date picker nativo para abono
    const [showDatePickerAbono, setShowDatePickerAbono] = useState(false);

    // Date picker manual (solo para prendas en cargos)
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [datePickerIndex, setDatePickerIndex] = useState(0);
    const [datePickerForAbono, setDatePickerForAbono] = useState(false);
    const [tempDay, setTempDay] = useState('');
    const [tempMonth, setTempMonth] = useState('');
    const [tempYear, setTempYear] = useState('');

    const esEdicion = !!movimientoId;
    const esCargo = tipo === 'CARGO';

    const showModal = (config) => {
        setModalConfig(config);
        setModalVisible(true);
    };

    const showToast = (message) => {
        setToastMessage(message);
        setToastVisible(true);
    };

    useEffect(() => {
        const cargarDatos = async () => {
            await cargarCategorias();
            if (esEdicion) {
                await cargarMovimiento();
            }
            if (cuentaId && !nuevaCuenta) {
                cargarSaldoCuenta();
            }
        };

        cargarDatos();

        // Manejar el botón de retroceso del hardware
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            navigation.goBack();
            return true;
        });

        return () => backHandler.remove();
    }, [movimientoId, cuentaId]);

    const cargarCategorias = async () => {
        const cats = await categoriasRepo.getCategorias();
        setCategorias(cats);
    };

    const agregarNuevaCategoria = async () => {
        if (!nuevaCategoriaNombre.trim()) {
            showToast('Ingresa un nombre para la categoría');
            return;
        }

        const nuevaCategoria = {
            id: nuevaCategoriaNombre.toLowerCase().replace(/\s+/g, '-'),
            nombre: nuevaCategoriaNombre.trim(),
            icono: nuevaCategoriaIcono,
            color: '#45beffff'
        };

        await categoriasRepo.addCategoria(nuevaCategoria);
        await cargarCategorias();
        setModalAgregarCategoriaVisible(false);
        setNuevaCategoriaNombre('');
        setNuevaCategoriaIcono('pricetag-outline');
        showToast('Categoría agregada exitosamente');
    };

    const cargarSaldoCuenta = async () => {
        if (cuentaId) {
            const cuenta = await cuentasRepo.getById(cuentaId);
            if (cuenta) {
                setSaldoCuenta(cuenta.saldo);
            }
        }
    };

    // Parsear descripción existente para obtener prendas
    const parsearDescripcionAPrendas = (comentario, fechaMovimiento) => {
        const defaultCategoria = categorias.length > 0 ? categorias[0].id : 'ropa-otros';
        if (!comentario) return [{ monto: '', descripcion: '', fecha: new Date(fechaMovimiento), categoria: defaultCategoria }];

        const partes = comentario.split(' | ');
        const prendasParseadas = partes.map(parte => {
            // Formato nuevo con cantidad y categoría ID: "Blusa roja (S/25.00) x 1 [01/01/2026] {ropa-otros}"
            // El "x <cantidad>" es opcional; se multiplica por el precio para preservar el total
            const matchCompleto = parte.match(/^(.+?)\s*\(S\/(\d+\.?\d*)\)\s*(?:x\s*(\d+))?\s*\[(\d{2}\/\d{2}\/\d{4})\]\s*\{(.+?)\}$/);
            if (matchCompleto) {
                const [dia, mes, anio] = matchCompleto[4].split('/');
                const cantidad = matchCompleto[3] ? parseInt(matchCompleto[3]) : 1;
                return {
                    descripcion: matchCompleto[1].trim(),
                    monto: String(parseFloat(matchCompleto[2]) * cantidad),
                    fecha: new Date(anio, mes - 1, dia),
                    categoria: matchCompleto[5]
                };
            }

            // Formato con fecha (y cantidad opcional) pero sin categoría (datos antiguos)
            const matchConFecha = parte.match(/^(.+?)\s*\(S\/(\d+\.?\d*)\)\s*(?:x\s*(\d+))?\s*\[(\d{2}\/\d{2}\/\d{4})\]$/);
            if (matchConFecha) {
                const [dia, mes, anio] = matchConFecha[4].split('/');
                const cantidad = matchConFecha[3] ? parseInt(matchConFecha[3]) : 1;
                return {
                    descripcion: matchConFecha[1].trim(),
                    monto: String(parseFloat(matchConFecha[2]) * cantidad),
                    fecha: new Date(anio, mes - 1, dia),
                    categoria: defaultCategoria
                };
            }

            // Formato sin fecha: "tajadores (S/20.00)" (cantidad opcional)
            const matchSinFecha = parte.match(/^(.+?)\s*\(S\/(\d+\.?\d*)\)\s*(?:x\s*(\d+))?$/);
            if (matchSinFecha) {
                const cantidad = matchSinFecha[3] ? parseInt(matchSinFecha[3]) : 1;
                return {
                    descripcion: matchSinFecha[1].trim(),
                    monto: String(parseFloat(matchSinFecha[2]) * cantidad),
                    fecha: new Date(fechaMovimiento),
                    categoria: defaultCategoria
                };
            }

            return {
                descripcion: parte,
                monto: '',
                fecha: new Date(fechaMovimiento),
                categoria: defaultCategoria
            };
        });

        return prendasParseadas.length > 0 ? prendasParseadas : [{ monto: '', descripcion: '', fecha: new Date(fechaMovimiento), categoria: defaultCategoria }];
    };

    // Parsear fecha del abono desde comentario
    const parsearFechaAbono = (comentario, fechaMovimiento) => {
        if (!comentario) return new Date(fechaMovimiento);
        const match = comentario.match(/\[(\d{2}\/\d{2}\/\d{4})\]$/);
        if (match) {
            const [dia, mes, anio] = match[1].split('/');
            return new Date(anio, mes - 1, dia);
        }
        return new Date(fechaMovimiento);
    };

    // Extraer descripción sin fecha
    const extraerDescripcionSinFecha = (comentario) => {
        if (!comentario) return '';
        return comentario.replace(/\s*\[\d{2}\/\d{2}\/\d{4}\]$/, '');
    };

    const cargarMovimiento = async () => {
        const mov = await obtenerMovimientoPorId(movimientoId);
        if (mov) {
            setMonto(mov.monto.toString());

            if (tipo === 'CARGO') {
                const prendasParseadas = parsearDescripcionAPrendas(mov.comentario, mov.fecha);
                setPrendas(prendasParseadas);
            } else {
                setComentario(extraerDescripcionSinFecha(mov.comentario));
                // La fecha real del movimiento (no la del comentario)
                setFechaAbono(new Date(mov.fecha));
                // Cargar método de pago existente
                if (mov.metodosPago) {
                    const mp = mov.metodosPago;
                    const activos = Object.entries(mp).filter(([, v]) => v > 0);
                    if (activos.length > 1) {
                        setMetodoPago('mixto');
                        setMixtoEfectivo(mp.efectivo > 0 ? mp.efectivo.toString() : '');
                        setMixtoYape(mp.yape > 0 ? mp.yape.toString() : '');
                        setMixtoTransferencia(mp.transferencia > 0 ? mp.transferencia.toString() : '');
                    } else if (activos.length === 1) {
                        setMetodoPago(activos[0][0]); // 'efectivo' | 'yape' | 'transferencia'
                    }
                }
            }
        }
    };

    const calcularTotal = () => {
        return prendas.reduce((total, prenda) => {
            const montoNum = parseFloat(prenda.monto) || 0;
            return total + montoNum;
        }, 0);
    };

    const actualizarPrenda = (index, campo, valor) => {
        const nuevasPrendas = [...prendas];
        nuevasPrendas[index][campo] = valor;
        setPrendas(nuevasPrendas);
    };

    const agregarPrenda = () => {
        const defaultCategoria = categorias.length > 0 ? categorias[0].id : 'ropa-otros';
        const nuevasPrendas = [...prendas, { monto: '', descripcion: '', fecha: new Date(), categoria: defaultCategoria }];
        setPrendas(nuevasPrendas);

        // Enfocar el nuevo input después de que se renderice
        setTimeout(() => {
            const nuevoIndex = nuevasPrendas.length - 1;
            if (montoInputRefs.current[nuevoIndex]) {
                montoInputRefs.current[nuevoIndex].focus();
            }
        }, 100);
    };

    const eliminarPrenda = (index) => {
        if (prendas.length > 1) {
            const nuevasPrendas = prendas.filter((_, i) => i !== index);
            setPrendas(nuevasPrendas);
        }
    };

    const formatearFecha = (fecha) => {
        const d = new Date(fecha);
        const dia = d.getDate().toString().padStart(2, '0');
        const mes = (d.getMonth() + 1).toString().padStart(2, '0');
        const anio = d.getFullYear();
        return `${dia}/${mes}/${anio}`;
    };

    const formatearFechaCorta = (fecha) => {
        const d = new Date(fecha);
        const dia = d.getDate().toString().padStart(2, '0');
        const mes = (d.getMonth() + 1).toString().padStart(2, '0');
        return `${dia}/${mes}`;
    };

    const abrirDatePicker = (index, forAbono = false) => {
        if (forAbono) {
            // Para abono: usar el DateTimePicker nativo
            setShowDatePickerAbono(true);
            return;
        }
        // Para prendas de cargo: usar el modal manual
        const fecha = prendas[index].fecha;
        setTempDay(fecha.getDate().toString());
        setTempMonth((fecha.getMonth() + 1).toString());
        setTempYear(fecha.getFullYear().toString());
        setDatePickerIndex(index);
        setDatePickerForAbono(false);
        setShowDatePicker(true);
    };

    // Cambio en el DateTimePicker nativo (abono)
    const onChangeFechaAbono = (event, selectedDate) => {
        if (Platform.OS === 'android') {
            setShowDatePickerAbono(false);
        }
        if (selectedDate) {
            setFechaAbono(selectedDate);
        }
    };

    const confirmarFecha = () => {
        const dia = parseInt(tempDay) || 1;
        const mes = parseInt(tempMonth) || 1;
        const anio = parseInt(tempYear) || new Date().getFullYear();

        if (dia < 1 || dia > 31 || mes < 1 || mes > 12 || anio < 2020 || anio > 2030) {
            showModal({
                type: 'error',
                title: 'Fecha inválida',
                message: 'Ingresa una fecha válida',
            });
            return;
        }

        const nuevaFecha = new Date(anio, mes - 1, dia);
        if (nuevaFecha > new Date()) {
            showModal({
                type: 'error',
                title: 'Fecha inválida',
                message: 'La fecha no puede ser mayor a hoy',
            });
            return;
        }

        if (datePickerForAbono) {
            setFechaAbono(nuevaFecha);
        } else {
            actualizarPrenda(datePickerIndex, 'fecha', nuevaFecha);
        }
        setShowDatePicker(false);
    };

    const generarDescripcion = () => {
        const descripciones = prendas
            .filter(p => p.descripcion.trim() !== '' && parseFloat(p.monto) > 0)
            .map(p => `${p.descripcion} (S/${parseFloat(p.monto).toFixed(2)}) [${formatearFecha(p.fecha)}] {${p.categoria}}`);
        return descripciones.join(' | ');
    };

    const generarDescripcionAbono = () => {
        const desc = comentario.trim();
        return desc || 'Abono'; // Por defecto 'Abono' si no hay descripción
    };

    // Construye el objeto metodosPago según la selección actual (sin transferencia)
    const construirMetodosPago = (montoTotal) => {
        if (metodoPago === 'mixto') {
            return {
                efectivo: parseFloat(mixtoEfectivo) || 0,
                yape: parseFloat(mixtoYape) || 0,
                transferencia: 0, // eliminado de la UI, siempre 0
            };
        }
        return {
            efectivo: metodoPago === 'efectivo' ? montoTotal : 0,
            yape: metodoPago === 'yape' ? montoTotal : 0,
            transferencia: 0,
        };
    };

    // Valida que en modo mixto la suma coincida con el monto
    const validarMixto = (montoTotal) => {
        if (metodoPago !== 'mixto') return true;
        const suma = (parseFloat(mixtoEfectivo) || 0) + (parseFloat(mixtoYape) || 0);
        return Math.abs(suma - montoTotal) < 0.01;
    };

    // Autocompleta el otro campo mixto cuando el usuario edita uno
    const handleMixtoEfectivoChange = (valor) => {
        setMixtoEfectivo(valor);
        const montoNum = parseFloat(monto) || 0;
        const efectivoNum = parseFloat(valor) || 0;
        const resto = montoNum - efectivoNum;
        setMixtoYape(resto > 0 ? resto.toFixed(2) : '');
    };

    const handleMixtoYapeChange = (valor) => {
        setMixtoYape(valor);
        const montoNum = parseFloat(monto) || 0;
        const yapeNum = parseFloat(valor) || 0;
        const resto = montoNum - yapeNum;
        setMixtoEfectivo(resto > 0 ? resto.toFixed(2) : '');
    };

    const handleGuardar = async () => {
        let montoNum, descripcionFinal;

        if (esCargo) {
            montoNum = calcularTotal();
            descripcionFinal = generarDescripcion();

            const prendasValidas = prendas.filter(p => parseFloat(p.monto) > 0);
            if (prendasValidas.length === 0) {
                showModal({
                    type: 'error',
                    title: 'Monto inválido',
                    message: 'Ingresa al menos un monto válido mayor a cero',
                });
                return;
            }
        } else {
            montoNum = parseFloat(monto);
            descripcionFinal = generarDescripcionAbono();

            if (!monto || isNaN(montoNum) || montoNum <= 0) {
                showModal({
                    type: 'error',
                    title: 'Monto inválido',
                    message: 'Ingresa un monto válido mayor a cero',
                });
                return;
            }

            // Validar que el abono no sea mayor al saldo de la cuenta
            if (!esEdicion && !nuevaCuenta && saldoCuenta > 0 && montoNum > saldoCuenta) {
                showModal({
                    type: 'error',
                    title: 'Abono excesivo',
                    message: `El abono (S/. ${montoNum.toFixed(2)}) no puede ser mayor a la deuda actual (S/. ${saldoCuenta.toFixed(2)})`,
                });
                return;
            }

            // Validar modo mixto
            if (!validarMixto(montoNum)) {
                const suma = (parseFloat(mixtoEfectivo) || 0) + (parseFloat(mixtoYape) || 0);
                showModal({
                    type: 'error',
                    title: 'Monto mixto incorrecto',
                    message: `La suma efectivo + yape (S/. ${suma.toFixed(2)}) debe ser igual al monto total (S/. ${montoNum.toFixed(2)})`,
                });
                return;
            }
        }

        setLoading(true);
        try {
            if (esEdicion) {
                if (!esCargo) {
                    // Para abonos: pasar la fecha real y los métodos de pago
                    const metodosPago = construirMetodosPago(montoNum);
                    await editarMovimiento(movimientoId, montoNum, descripcionFinal, fechaAbono, metodosPago);
                } else {
                    await editarMovimiento(movimientoId, montoNum, descripcionFinal);
                }
                showToast('Movimiento actualizado correctamente');
            } else {
                let idCuenta = cuentaId;

                if (nuevaCuenta && clientaId) {
                    const cuenta = await abrirNuevaCuenta(clientaId);
                    idCuenta = cuenta.id;
                }

                if (!esCargo) {
                    const metodosPago = construirMetodosPago(montoNum);
                    // Pasar la fecha elegida por el usuario para que m.fecha quede en el día correcto
                    await registrarMovimiento(idCuenta, tipo, montoNum, descripcionFinal, metodosPago, fechaAbono);
                } else {
                    await registrarMovimiento(idCuenta, tipo, montoNum, descripcionFinal);
                }
                showToast(esCargo ? 'Cargo registrado correctamente' : 'Abono registrado correctamente');
            }
            setTimeout(() => navigation.goBack(), 1500);
        } catch (error) {
            showModal({
                type: 'error',
                title: 'Error',
                message: error.message,
            });
            setLoading(false);
        }
    };

    // Formulario compacto para prendas
    const renderFormularioPrendas = () => (
        <View style={styles.formulario}>
            {/* Lista de prendas compacta */}
            {prendas.map((prenda, index) => (
                <View key={index} style={styles.prendaCompacta}>
                    {/* Selector de categoría por prenda */}
                    <View style={styles.categoriaPrendaRow}>
                        <View style={styles.prendaNumeroCompacto}>
                            <Text style={styles.prendaNumeroTexto}>{index + 1}</Text>
                        </View>
                        <View style={styles.categoriaPrendaContainer}>
                            <TouchableOpacity
                                style={styles.categoriaSelector}
                                onPress={() => {
                                    setDropdownVisible(prev => ({ ...prev, [index]: !prev[index] }));
                                }}
                                activeOpacity={0.7}
                            >
                                <View style={styles.categoriaSelectorContent}>
                                    {(() => {
                                        const catSeleccionada = categorias.find(c => c.id === prenda.categoria);
                                        return catSeleccionada ? (
                                            <>
                                                <Ionicons name={catSeleccionada.icono} size={16} color="#45beffff" />
                                                <Text style={styles.categoriaSelectorTexto}>{catSeleccionada.nombre}</Text>
                                            </>
                                        ) : (
                                            <Text style={styles.categoriaSelectorTexto}>Seleccionar categoría</Text>
                                        );
                                    })()}
                                </View>
                                <Ionicons name={dropdownVisible[index] ? "chevron-up" : "chevron-down"} size={16} color="#636E72" />
                            </TouchableOpacity>

                            {dropdownVisible[index] && (
                                <View style={styles.dropdownMenu}>
                                    <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                                        {categorias.map((cat) => (
                                            <TouchableOpacity
                                                key={cat.id}
                                                style={styles.dropdownItem}
                                                onPress={() => {
                                                    actualizarPrenda(index, 'categoria', cat.id);
                                                    setDropdownVisible(prev => ({ ...prev, [index]: false }));
                                                }}
                                                activeOpacity={0.7}
                                            >
                                                <Ionicons name={cat.icono} size={16} color="#45beffff" />
                                                <Text style={styles.dropdownItemTexto}>{cat.nombre}</Text>
                                                {prenda.categoria === cat.id && (
                                                    <Ionicons name="checkmark" size={16} color="#4CAF50" />
                                                )}
                                            </TouchableOpacity>
                                        ))}
                                        <TouchableOpacity
                                            style={styles.dropdownItemAgregar}
                                            onPress={() => {
                                                setDropdownVisible(prev => ({ ...prev, [index]: false }));
                                                setModalAgregarCategoriaVisible(true);
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <Ionicons name="add-circle-outline" size={16} color="#45beffff" />
                                            <Text style={styles.dropdownItemAgregarTexto}>Nueva categoría</Text>
                                        </TouchableOpacity>
                                    </ScrollView>
                                </View>
                            )}
                        </View>

                        {/* Eliminar */}
                        {prendas.length > 1 && (
                            <TouchableOpacity
                                onPress={() => eliminarPrenda(index)}
                                style={styles.eliminarCompactoBtn}
                            >
                                <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={styles.prendaRow}>
                        {/* Monto */}
                        <View style={styles.montoCompactoContainer}>
                            <Text style={styles.monedaCompacta}>S/</Text>
                            <TextInput
                                ref={(ref) => montoInputRefs.current[index] = ref}
                                style={styles.inputMontoCompacto}
                                value={prenda.monto}
                                onChangeText={(valor) => actualizarPrenda(index, 'monto', valor)}
                                placeholder="0.00"
                                placeholderTextColor="#A0A0A0"
                                keyboardType="decimal-pad"
                            />
                        </View>

                        {/* Fecha */}
                        <TouchableOpacity
                            style={styles.fechaCompactaBtn}
                            onPress={() => abrirDatePicker(index)}
                        >
                            <Ionicons name="calendar-outline" size={14} color="#29B6F6" />
                            <Text style={styles.fechaCompactaTexto}>{formatearFechaCorta(prenda.fecha)}</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Descripción */}
                    < TextInput
                        style={styles.inputDescripcionCompacta}
                        value={prenda.descripcion}
                        onChangeText={(valor) => actualizarPrenda(index, 'descripcion', valor)}
                        placeholder={prenda.categoria === 'UTILES' ? "Descripción (ej: Cuaderno A4 x3)" : "Descripción (ej: Blusa roja talla M)"}
                        placeholderTextColor="#A0A0A0"
                    />
                </View>
            ))
            }

            {/* Botón agregar */}
            <TouchableOpacity
                style={styles.agregarCompactoBtn}
                onPress={agregarPrenda}
                activeOpacity={0.7}
            >
                <Ionicons name="add" size={20} color="#29B6F6" />
                <Text style={styles.agregarCompactoTexto}>Agregar producto</Text>
            </TouchableOpacity>
        </View >
    );

    // Formulario para abonos — rediseño profesional con DateTimePicker nativo
    const renderFormularioAbono = () => {
        const montoNum = parseFloat(monto) || 0;
        const sumaMixto = (parseFloat(mixtoEfectivo) || 0) + (parseFloat(mixtoYape) || 0);
        const faltaMixto = montoNum - sumaMixto;
        const mixtoValido = metodoPago !== 'mixto' || Math.abs(faltaMixto) < 0.01;

        const METODOS = [
            { id: 'efectivo', label: 'Efectivo', icon: 'cash-outline', color: '#10B981' },
            { id: 'yape', label: 'Yape', icon: 'phone-portrait-outline', color: '#9333EA' },
            { id: 'mixto', label: 'Mixto', icon: 'layers-outline', color: '#F97316' },
        ];

        const esHoy = (() => {
            const hoy = new Date();
            return (
                fechaAbono.getDate() === hoy.getDate() &&
                fechaAbono.getMonth() === hoy.getMonth() &&
                fechaAbono.getFullYear() === hoy.getFullYear()
            );
        })();

        return (
            <View style={styles.abonoWrapper}>
                {/* ── Monto ─────────────────────────────────────── */}
                <View style={styles.abonoMontoCard}>
                    <Text style={styles.abonoMontoEtiqueta}>MONTO DEL ABONO</Text>
                    <View style={styles.abonoMontoRow}>
                        <Text style={styles.abonoMontoSol}>S/</Text>
                        <TextInput
                            style={styles.abonoMontoInput}
                            value={monto}
                            onChangeText={setMonto}
                            placeholder="0.00"
                            placeholderTextColor="rgba(255,255,255,0.5)"
                            keyboardType="decimal-pad"
                        />
                    </View>
                </View>

                {/* ── Fecha con DateTimePicker nativo ───────────── */}
                <View style={styles.abonoSeccion}>
                    <Text style={styles.abonoSeccionLabel}>FECHA</Text>
                    <TouchableOpacity
                        style={styles.abonoFechaBtn}
                        onPress={() => abrirDatePicker(0, true)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.abonoFechaBtnIzq}>
                            <View style={styles.abonoFechaIconoWrap}>
                                <Ionicons name="calendar" size={20} color="#0EA5E9" />
                            </View>
                            <View>
                                <Text style={styles.abonoFechaTextoNuevo}>{formatearFecha(fechaAbono)}</Text>
                                <Text style={styles.abonoFechaSubtexto}>
                                    {esHoy ? 'Hoy' : fechaAbono.toLocaleDateString('es-PE', { weekday: 'long' })}
                                </Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                    </TouchableOpacity>

                    {showDatePickerAbono && (
                        <DateTimePicker
                            value={fechaAbono}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={onChangeFechaAbono}
                            maximumDate={new Date()}
                        />
                    )}
                </View>

                {/* ── Método de pago ──────────────────────────── */}
                <View style={styles.abonoSeccion}>
                    <Text style={styles.abonoSeccionLabel}>MÉTODO DE PAGO</Text>
                    <View style={styles.metodoPagoGrid}>
                        {METODOS.map(m => {
                            const activo = metodoPago === m.id;
                            return (
                                <TouchableOpacity
                                    key={m.id}
                                    style={[
                                        styles.metodoPagoChip,
                                        activo && { backgroundColor: m.color, borderColor: m.color }
                                    ]}
                                    onPress={() => setMetodoPago(m.id)}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons
                                        name={m.icon}
                                        size={16}
                                        color={activo ? '#FFFFFF' : m.color}
                                    />
                                    <Text style={[
                                        styles.metodoPagoChipTexto,
                                        activo && { color: '#FFFFFF' }
                                    ]}>
                                        {m.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Inputs mixto: solo Efectivo y Yape. El segundo se autocompleta */}
                    {metodoPago === 'mixto' && (
                        <View style={styles.mixtoContainer}>
                            {/* Efectivo */}
                            <View style={styles.mixtoRow}>
                                <View style={[styles.mixtoIcono, { backgroundColor: '#D1FAE5' }]}>
                                    <Ionicons name="cash" size={16} color="#10B981" />
                                </View>
                                <Text style={styles.mixtoNombreTexto}>Efectivo</Text>
                                <View style={styles.mixtoInputWrap}>
                                    <Text style={styles.mixtoPrefix}>S/</Text>
                                    <TextInput
                                        style={styles.mixtoInput}
                                        value={mixtoEfectivo}
                                        onChangeText={handleMixtoEfectivoChange}
                                        placeholder="0.00"
                                        placeholderTextColor="#A0A0A0"
                                        keyboardType="decimal-pad"
                                    />
                                </View>
                            </View>

                            {/* Yape */}
                            <View style={styles.mixtoRow}>
                                <View style={[styles.mixtoIcono, { backgroundColor: '#EDE9FE' }]}>
                                    <Ionicons name="phone-portrait" size={16} color="#9333EA" />
                                </View>
                                <Text style={styles.mixtoNombreTexto}>Yape</Text>
                                <View style={styles.mixtoInputWrap}>
                                    <Text style={styles.mixtoPrefix}>S/</Text>
                                    <TextInput
                                        style={styles.mixtoInput}
                                        value={mixtoYape}
                                        onChangeText={handleMixtoYapeChange}
                                        placeholder="0.00"
                                        placeholderTextColor="#A0A0A0"
                                        keyboardType="decimal-pad"
                                    />
                                </View>
                            </View>

                            {/* Barra de estado: falta / completo */}
                            {montoNum > 0 && (
                                <View style={[
                                    styles.mixtoSuma,
                                    {
                                        borderColor: mixtoValido ? '#10B981' : '#F97316',
                                        backgroundColor: mixtoValido ? '#F0FFF4' : '#FFF7ED'
                                    }
                                ]}>
                                    {mixtoValido ? (
                                        <Text style={[styles.mixtoSumaTexto, { color: '#10B981' }]}>
                                            ✓ Total cubierto: S/ {sumaMixto.toFixed(2)}
                                        </Text>
                                    ) : (
                                        <Text style={[styles.mixtoSumaTexto, { color: '#F97316' }]}>
                                            Falta S/ {faltaMixto.toFixed(2)}  (suma actual: S/ {sumaMixto.toFixed(2)})
                                        </Text>
                                    )}
                                </View>
                            )}
                        </View>
                    )}
                </View>

                {/* Nota opcional — si está vacía se guarda 'Abono' por defecto */}
                <View style={styles.abonoSeccion}>
                    <Text style={styles.abonoSeccionLabel}>NOTA (opcional)</Text>
                    <TextInput
                        style={styles.abonoNotaInput}
                        value={comentario}
                        onChangeText={setComentario}
                        placeholder="Por defecto: Abono"
                        placeholderTextColor="#A0A0A0"
                        multiline
                        numberOfLines={2}
                    />
                </View>
            </View>
        );
    };

    const styles = createStyles(colors);

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <Header title={esEdicion ? (esCargo ? 'Editar Cargo' : 'Editar Abono') : (esCargo ? 'Nuevo Cargo' : 'Nuevo Abono')} showBack />

            {/* Header compacto */}
            <View style={styles.headerCompacto}>
                <View style={[styles.iconoCompacto, esCargo ? styles.iconoCargo : styles.iconoAbono]}>
                    <Ionicons
                        name={esCargo ? "arrow-up" : "arrow-down"}
                        size={20}
                        color={esCargo ? "#FF6B6B" : "#4CAF50"}
                    />
                </View>
                <View style={styles.headerTextos}>
                    <Text style={styles.headerTitulo}>
                        {esCargo ? 'Cargo' : 'Abono'}
                    </Text>
                    <Text style={styles.headerSubtitulo}>
                        {esCargo ? 'Aumenta la deuda' : 'Reduce la deuda'}
                    </Text>
                </View>
            </View>

            {/* Total fijo para cargos */}
            {esCargo && (
                <View style={styles.totalFijo}>
                    <Text style={styles.totalFijoLabel}>Total</Text>
                    <Text style={styles.totalFijoMonto}>S/ {calcularTotal().toFixed(2)}</Text>
                </View>
            )}

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {esCargo ? renderFormularioPrendas() : renderFormularioAbono()}
            </ScrollView>

            {/* Botón guardar */}
            <View style={[styles.footerContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
                <TouchableOpacity
                    style={[styles.botonGuardar, loading && styles.botonDisabled]}
                    onPress={handleGuardar}
                    activeOpacity={0.7}
                    disabled={loading}
                >
                    <Ionicons name="checkmark" size={22} color="#FFF" />
                    <Text style={styles.botonGuardarTexto}>
                        {esEdicion ? 'Guardar' : 'Registrar'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Modal selector de fecha */}
            <Modal
                visible={showDatePicker}
                transparent
                animationType="fade"
                onRequestClose={() => setShowDatePicker(false)}
            >
                <TouchableOpacity
                    style={styles.dateModalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowDatePicker(false)}
                >
                    <View style={styles.dateModalContainer} onStartShouldSetResponder={() => true}>
                        <Text style={styles.dateModalTitulo}>Seleccionar fecha</Text>

                        <View style={styles.dateInputsRow}>
                            <View style={styles.dateInputContainer}>
                                <Text style={styles.dateInputLabel}>Día</Text>
                                <TextInput
                                    style={styles.dateInput}
                                    value={tempDay}
                                    onChangeText={setTempDay}
                                    keyboardType="number-pad"
                                    maxLength={2}
                                    placeholder="DD"
                                    placeholderTextColor="#A0A0A0"
                                />
                            </View>
                            <View style={styles.dateInputContainer}>
                                <Text style={styles.dateInputLabel}>Mes</Text>
                                <TextInput
                                    style={styles.dateInput}
                                    value={tempMonth}
                                    onChangeText={setTempMonth}
                                    keyboardType="number-pad"
                                    maxLength={2}
                                    placeholder="MM"
                                    placeholderTextColor="#A0A0A0"
                                />
                            </View>
                            <View style={styles.dateInputContainer}>
                                <Text style={styles.dateInputLabel}>Año</Text>
                                <TextInput
                                    style={styles.dateInput}
                                    value={tempYear}
                                    onChangeText={setTempYear}
                                    keyboardType="number-pad"
                                    maxLength={4}
                                    placeholder="AAAA"
                                    placeholderTextColor="#A0A0A0"
                                />
                            </View>
                        </View>

                        <View style={styles.dateModalBotones}>
                            <TouchableOpacity
                                style={styles.dateModalBtnCancelar}
                                onPress={() => setShowDatePicker(false)}
                            >
                                <Text style={styles.dateModalBtnCancelarTexto}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.dateModalBtnConfirmar}
                                onPress={confirmarFecha}
                            >
                                <Text style={styles.dateModalBtnConfirmarTexto}>Confirmar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>

            <CustomModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                {...modalConfig}
            />

            {/* Modal para agregar categoría */}
            <Modal
                visible={modalAgregarCategoriaVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setModalAgregarCategoriaVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalAgregarCategoria}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitulo}>Nueva Categoría</Text>
                            <TouchableOpacity onPress={() => setModalAgregarCategoriaVisible(false)}>
                                <Ionicons name="close" size={24} color="#636E72" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalBody}>
                            <Text style={styles.label}>Nombre de la categoría</Text>
                            <TextInput
                                style={styles.input}
                                value={nuevaCategoriaNombre}
                                onChangeText={setNuevaCategoriaNombre}
                                placeholder="Ej: Accesorios, Calzado, etc."
                                placeholderTextColor="#A0A0A0"
                            />

                            <Text style={styles.label}>Selecciona un ícono</Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={styles.iconosScroll}
                            >
                                {['pricetag-outline', 'shirt-outline', 'footsteps-outline', 'cart-outline',
                                    'gift-outline', 'home-outline',
                                    'bag-handle-outline', 'car-outline', 'phone-portrait-outline', 'laptop-outline'].map((icono) => (
                                        <TouchableOpacity
                                            key={icono}
                                            style={[styles.iconoBtn, nuevaCategoriaIcono === icono && styles.iconoBtnActivo]}
                                            onPress={() => setNuevaCategoriaIcono(icono)}
                                        >
                                            <Ionicons
                                                name={icono}
                                                size={24}
                                                color={nuevaCategoriaIcono === icono ? '#FFFFFF' : '#45beffff'}
                                            />
                                        </TouchableOpacity>
                                    ))}
                            </ScrollView>
                        </View>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={styles.btnCancelar}
                                onPress={() => setModalAgregarCategoriaVisible(false)}
                            >
                                <Text style={styles.btnCancelarTexto}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.btnGuardar}
                                onPress={agregarNuevaCategoria}
                            >
                                <Text style={styles.btnGuardarTexto}>Agregar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Toast
                visible={toastVisible}
                message={toastMessage}
                type="success"
                onHide={() => setToastVisible(false)}
            />
        </KeyboardAvoidingView>
    );
}


const createStyles = (colors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background
    },
    scrollView: {
        flex: 1,
    },
    // Header compacto
    headerCompacto: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    iconoCompacto: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    iconoCargo: {
        backgroundColor: '#FFE5E5',
    },
    iconoAbono: {
        backgroundColor: '#E8F5E9',
    },
    headerTextos: {
        flex: 1,
    },
    headerTitulo: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
    },
    headerSubtitulo: {
        fontSize: 13,
        color: colors.textSecondary,
        marginTop: 2,
    },
    formulario: {
        padding: 16,
    },
    // Total fijo para cargos
    totalFijo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#45beffff',
        paddingVertical: 8,
        paddingHorizontal: 18,
        borderBottomWidth: 2,
        borderBottomColor: '#5B4BC4',
    },
    totalFijoLabel: {
        fontSize: 15,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: '500',
    },
    totalFijoMonto: {
        fontSize: 24,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    // Prenda compacta
    prendaCompacta: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: colors.border,
    },
    categoriaPrendaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        gap: 8,
    },
    categoriaPrendaBotones: {
        flex: 1,
        flexDirection: 'row',
        gap: 6,
    },
    categoriaPrendaBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 6,
        paddingHorizontal: 8,
        borderRadius: 8,
        backgroundColor: colors.card,
        borderWidth: 1.5,
        borderColor: '#45beffff',
    },
    categoriaPrendaBtnActivo: {
        backgroundColor: '#45beffff',
        borderColor: '#45beffff',
    },
    categoriaPrendaBtnTexto: {
        fontSize: 12,
        fontWeight: '600',
        color: '#45beffff',
        marginLeft: 4,
    },
    categoriaPrendaBtnTextoActivo: {
        color: '#FFFFFF',
    },
    prendaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    prendaNumeroCompacto: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: '#45beffff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    prendaNumeroTexto: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    montoCompactoContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceVariant,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
        marginRight: 8,
    },
    monedaCompacta: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.textSecondary,
        marginRight: 4,
    },
    inputMontoCompacto: {
        flex: 1,
        fontSize: 17,
        fontWeight: '700',
        color: colors.text,
        padding: 0,
    },
    fechaCompactaBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E1F5FE',
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 8,
        marginRight: 8,
    },
    fechaCompactaTexto: {
        fontSize: 13,
        color: '#45beffff',
        fontWeight: '600',
        marginLeft: 4,
    },
    eliminarCompactoBtn: {
        padding: 6,
    },
    inputDescripcionCompacta: {
        backgroundColor: colors.surfaceVariant,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        color: colors.text,
    },
    agregarCompactoBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#45beffff',
        borderStyle: 'dashed',
        backgroundColor: '#FAFAFF',
    },
    agregarCompactoTexto: {
        fontSize: 14,
        fontWeight: '600',
        color: '#38a6d9c8',
        marginLeft: 6,
    },
    // Formulario abono
    montoAbonoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.card,
        borderRadius: 16,
        paddingVertical: 24,
        paddingHorizontal: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    monedaGrande: {
        fontSize: 28,
        fontWeight: '600',
        color: colors.textSecondary,
        marginRight: 8,
    },
    inputMontoGrande: {
        fontSize: 42,
        fontWeight: '700',
        color: colors.text,
        minWidth: 120,
        textAlign: 'center',
    },
    abonoDetalles: {
        marginBottom: 12,
    },
    fechaAbonoBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#E1F5FE',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 10,
    },
    fechaAbonoTexto: {
        fontSize: 15,
        color: '#45beffff',
        fontWeight: '600',
        marginLeft: 8,
    },
    inputComentarioAbono: {
        backgroundColor: colors.card,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 15,
        color: colors.text,
        borderWidth: 1,
        borderColor: colors.border,
    },

    // ── Abono rediseño ───────────────────────────────────────────
    abonoWrapper: {
        padding: 16,
        gap: 15,
    },
    abonoMontoCard: {
        backgroundColor: '#10B981',
        borderRadius: 20,
        paddingVertical: 5,
        paddingHorizontal: 24,
        alignItems: 'center',
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
        elevation: 2,
    },
    abonoMontoEtiqueta: {
        fontSize: 12,
        fontWeight: '800',
        color: 'rgba(255, 255, 255, 0.89)',
        letterSpacing: 1.5,
        marginBottom: 5,
    },
    abonoMontoRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    abonoMontoSol: {
        fontSize: 25,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.8)',
        marginRight: 6,
        alignSelf: 'center',
    },
    abonoMontoInput: {
        fontSize: 45,
        fontWeight: '800',
        color: '#FFFFFF',
        minWidth: 140,
        textAlign: 'center',
        letterSpacing: -1,
    },
    abonoSeccion: {
        gap: 8,
    },
    abonoSeccionLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: colors.textTertiary,
        letterSpacing: 1.2,
    },
    abonoFechaBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.card,
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    abonoFechaBtnIzq: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    abonoFechaIconoWrap: {
        width: 38,
        height: 38,
        borderRadius: 11,
        backgroundColor: '#EFF6FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    abonoFechaTextoNuevo: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 2,
    },
    abonoFechaSubtexto: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '500',
        textTransform: 'capitalize',
    },
    abonoNotaInput: {
        backgroundColor: colors.card,
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 15,
        color: colors.text,
        borderWidth: 1,
        borderColor: colors.border,
        minHeight: 52,
        textAlignVertical: 'top',
    },

    // ── Método de pago ────────────────────────────────────────────
    metodoPagoSection: {
        marginBottom: 12,
    },
    metodoPagoLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.textSecondary,
        marginBottom: 10,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    metodoPagoGrid: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
    },
    metodoPagoChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: colors.border,
        backgroundColor: colors.surfaceVariant,
    },
    metodoPagoChipTexto: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    // Inputs mixto
    mixtoContainer: {
        marginTop: 12,
        backgroundColor: colors.surfaceVariant,
        borderRadius: 14,
        padding: 14,
        gap: 10,
        borderWidth: 1,
        borderColor: colors.border,
    },
    mixtoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    mixtoIcono: {
        width: 30,
        height: 30,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
    },
    mixtoNombreTexto: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.text,
        width: 90,
    },
    mixtoInputWrap: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 10,
        paddingVertical: 7,
    },
    mixtoPrefix: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.textSecondary,
        marginRight: 4,
    },
    mixtoInput: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        color: colors.text,
        padding: 0,
    },
    mixtoSuma: {
        borderRadius: 10,
        borderWidth: 1.5,
        paddingHorizontal: 12,
        paddingVertical: 8,
        alignItems: 'center',
    },
    mixtoSumaTexto: {
        fontSize: 13,
        fontWeight: '700',
    },

    // Footer
    footerContainer: {
        backgroundColor: colors.card,
        paddingHorizontal: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    botonGuardar: {
        backgroundColor: '#45beffff',
        paddingVertical: 14,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    botonGuardarTexto: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        marginLeft: 8,
    },
    botonDisabled: {
        opacity: 0.6,
    },
    // Modal de fecha
    dateModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dateModalContainer: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 24,
        width: '85%',
        maxWidth: 340,
    },
    dateModalTitulo: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
        textAlign: 'center',
        marginBottom: 20,
    },
    dateInputsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    dateInputContainer: {
        flex: 1,
        marginHorizontal: 6,
    },
    dateInputLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        marginBottom: 6,
        textAlign: 'center',
    },
    dateInput: {
        backgroundColor: '#F8F9FA',
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: 8,
        fontSize: 18,
        fontWeight: '600',
        color: '#2D3436',
        textAlign: 'center',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    dateModalBotones: {
        flexDirection: 'row',
        gap: 12,
    },
    dateModalBtnCancelar: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 10,
        backgroundColor: '#F8F9FA',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    dateModalBtnCancelarTexto: {
        fontSize: 15,
        fontWeight: '600',
        color: '#636E72',
        textAlign: 'center',
    },
    dateModalBtnConfirmar: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 10,
        backgroundColor: '#45beffff',
    },
    dateModalBtnConfirmarTexto: {
        fontSize: 15,
        fontWeight: '600',
        color: '#FFFFFF',
        textAlign: 'center',
    },
    categoriaSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.surfaceVariant,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: colors.border,
    },
    categoriaSelectorContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    categoriaSelectorTexto: {
        fontSize: 13,
        color: colors.text,
        fontWeight: '500',
    },
    dropdownMenu: {
        position: 'absolute',
        top: 42,
        left: 0,
        right: 0,
        backgroundColor: colors.card,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        maxHeight: 180,
        zIndex: 1000,
        elevation: 5,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
    },
    dropdownScroll: {
        maxHeight: 180,
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        gap: 8,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    dropdownItemTexto: {
        flex: 1,
        fontSize: 13,
        color: colors.text,
    },
    dropdownItemAgregar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        gap: 8,
        backgroundColor: colors.surfaceVariant,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    dropdownItemAgregarTexto: {
        flex: 1,
        fontSize: 13,
        color: '#45beffff',
        fontWeight: '600',
    },
    categoriaPrendaContainer: {
        flex: 1,
        marginRight: 8,
    },
    categoriaPrendaScroll: {
        flexGrow: 0,
    },
    categoriaPrendaScrollContent: {
        paddingRight: 8,
    },
    categoriaPrendaBtnAgregar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#45beffff',
        borderStyle: 'dashed',
        backgroundColor: '#F8F9FA',
        gap: 4,
    },
    categoriaPrendaBtnAgregarTexto: {
        fontSize: 12,
        color: '#45beffff',
        fontWeight: '600',
    },
    modalAgregarCategoria: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        width: '85%',
        maxWidth: 320,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitulo: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
    },
    modalBody: {
        marginBottom: 16,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: '#636E72',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#F8F9FA',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        color: '#2D3436',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        marginBottom: 16,
    },
    iconosScroll: {
        marginTop: 4,
    },
    iconoBtn: {
        width: 44,
        height: 44,
        borderRadius: 10,
        backgroundColor: '#E1F5FE',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    iconoBtnActivo: {
        backgroundColor: '#45beffff',
        borderColor: '#29B6F6',
    },
    modalFooter: {
        flexDirection: 'row',
        gap: 10,
    },
    btnCancelar: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: '#F8F9FA',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    btnCancelarTexto: {
        fontSize: 13,
        fontWeight: '600',
        color: '#636E72',
    },
    btnGuardar: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: '#45beffff',
        alignItems: 'center',
    },
    btnGuardarTexto: {
        fontSize: 13,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
});