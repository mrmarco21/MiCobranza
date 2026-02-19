import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Modal, BackHandler } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

    // Estado para el date picker
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
            // Formato nuevo con categoría ID: "Blusa roja (S/25.00) [01/01/2026] {ropa-otros}"
            const matchCompleto = parte.match(/^(.+?)\s*\(S\/(\d+\.?\d*)\)\s*\[(\d{2}\/\d{2}\/\d{4})\]\s*\{(.+?)\}$/);
            if (matchCompleto) {
                const [dia, mes, anio] = matchCompleto[3].split('/');
                return {
                    descripcion: matchCompleto[1].trim(),
                    monto: matchCompleto[2],
                    fecha: new Date(anio, mes - 1, dia),
                    categoria: matchCompleto[4]
                };
            }

            // Formato con fecha pero sin categoría (datos antiguos)
            const matchConFecha = parte.match(/^(.+?)\s*\(S\/(\d+\.?\d*)\)\s*\[(\d{2}\/\d{2}\/\d{4})\]$/);
            if (matchConFecha) {
                const [dia, mes, anio] = matchConFecha[3].split('/');
                return {
                    descripcion: matchConFecha[1].trim(),
                    monto: matchConFecha[2],
                    fecha: new Date(anio, mes - 1, dia),
                    categoria: defaultCategoria
                };
            }

            // Formato sin fecha: "tajadores (S/20.00)"
            const matchSinFecha = parte.match(/^(.+?)\s*\(S\/(\d+\.?\d*)\)$/);
            if (matchSinFecha) {
                return {
                    descripcion: matchSinFecha[1].trim(),
                    monto: matchSinFecha[2],
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
                setFechaAbono(parsearFechaAbono(mov.comentario, mov.fecha));
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
        const fecha = forAbono ? fechaAbono : prendas[index].fecha;
        setTempDay(fecha.getDate().toString());
        setTempMonth((fecha.getMonth() + 1).toString());
        setTempYear(fecha.getFullYear().toString());
        setDatePickerIndex(index);
        setDatePickerForAbono(forAbono);
        setShowDatePicker(true);
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
        const fechaStr = `[${formatearFecha(fechaAbono)}]`;
        return desc ? `${desc} ${fechaStr}` : fechaStr;
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
        }

        setLoading(true);
        try {
            if (esEdicion) {
                await editarMovimiento(movimientoId, montoNum, descripcionFinal);
                showToast('Movimiento actualizado correctamente');
            } else {
                let idCuenta = cuentaId;

                if (nuevaCuenta && clientaId) {
                    const cuenta = await abrirNuevaCuenta(clientaId);
                    idCuenta = cuenta.id;
                }

                await registrarMovimiento(idCuenta, tipo, montoNum, descripcionFinal);
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

    // Formulario para abonos
    const renderFormularioAbono = () => (
        <View style={styles.formulario}>
            {/* Monto grande */}
            <View style={styles.montoAbonoContainer}>
                <Text style={styles.monedaGrande}>S/</Text>
                <TextInput
                    style={styles.inputMontoGrande}
                    value={monto}
                    onChangeText={setMonto}
                    placeholder="0.00"
                    placeholderTextColor="#A0A0A0"
                    keyboardType="decimal-pad"
                />
            </View>

            {/* Fecha y descripción en fila */}
            <View style={styles.abonoDetalles}>
                <TouchableOpacity
                    style={styles.fechaAbonoBtn}
                    onPress={() => abrirDatePicker(0, true)}
                >
                    <Ionicons name="calendar-outline" size={18} color="#29B6F6" />
                    <Text style={styles.fechaAbonoTexto}>{formatearFecha(fechaAbono)}</Text>
                </TouchableOpacity>
            </View>

            <TextInput
                style={styles.inputComentarioAbono}
                value={comentario}
                onChangeText={setComentario}
                placeholder="Nota opcional (ej: Pago parcial)"
                placeholderTextColor="#A0A0A0"
            />
        </View>
    );

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