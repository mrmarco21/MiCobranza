import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import ROUTES from './routes';

// ── Screens ──────────────────────────────────────────────────────────────────
import InicioScreen from '../screens/Inicio/InicioScreen';
import ClientasScreen from '../screens/Clientas/ClientasScreen';
import AddClientaScreen from '../screens/Clientas/AddClientaScreen';
import ClientaDetailScreen from '../screens/Clientas/ClientaDetailScreen';
import CuentasPendientesScreen from '../screens/Cuentas/CuentasPendientesScreen';
import CuentasCanceladasScreen from '../screens/Cuentas/CuentasCanceladasScreen';
import DetalleCuentaScreen from '../screens/Cuentas/DetalleCuentaScreen';
import HistorialCuentasScreen from '../screens/Cuentas/HistorialCuentasScreen';
import CobroScreen from '../screens/Cuentas/CobroScreen';
import AddMovimientoScreen from '../screens/Movimientos/AddMovimientoScreen';
import MovimientosDiariosScreen from '../screens/MovimientosDiarios/MovimientosDiariosScreen';
import GastosScreen from '../screens/Gastos/GastosScreen';
import AddGastoScreen from '../screens/Gastos/AddGastoScreen';
import InventarioScreen from '../screens/Inventario/InventarioScreen';
import AddProductoScreen from '../screens/Inventario/AddProductoScreen';
import DetalleProductoScreen from '../screens/Inventario/DetalleProductoScreen';
import ProductosDesactivadosScreen from '../screens/Inventario/ProductosDesactivadosScreen';
import PuntoVentaScreen from '../screens/PuntoVenta/PuntoVentaScreen';
import SeleccionarProductosScreen from '../screens/PuntoVenta/SeleccionarProductosScreen';
import MetodoPagoScreen from '../screens/PuntoVenta/MetodoPagoScreen';
import BorradoresScreen from '../screens/PuntoVenta/BorradoresScreen';
import ProductosVendidosScreen from '../screens/ProductosVendidos/ProductosVendidosScreen';
import ResumenScreen from '../screens/Resumen/ResumenScreen';
import InformesScreen from '../screens/Informes/InformesScreen';
import ConfiguracionScreen from '../screens/Configuracion/ConfiguracionScreen';
import ListaVentasScreen from '../screens/ListaVentas/ListaVentasScreen';
import DetalleVentaScreen from '../screens/ListaVentas/DetalleVentaScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                animation: 'fade',
                animationDuration: 150,
            }}
        >
            <Stack.Screen name={ROUTES.INICIO} component={InicioScreen} />
            <Stack.Screen name={ROUTES.CUENTAS_PENDIENTES} component={CuentasPendientesScreen} />
            <Stack.Screen name={ROUTES.CLIENTAS} component={ClientasScreen} />
            <Stack.Screen name={ROUTES.ADD_CLIENTA} component={AddClientaScreen} />
            <Stack.Screen name={ROUTES.CLIENTA_DETAIL} component={ClientaDetailScreen} />
            <Stack.Screen name={ROUTES.ADD_MOVIMIENTO} component={AddMovimientoScreen} />
            <Stack.Screen name={ROUTES.MOVIMIENTOS_DIARIOS} component={MovimientosDiariosScreen} />
            <Stack.Screen name={ROUTES.HISTORIAL_CLIENTA_CUENTAS} component={HistorialCuentasScreen} />
            <Stack.Screen name={ROUTES.DETALLE_CUENTA} component={DetalleCuentaScreen} />
            <Stack.Screen name={ROUTES.COBRO} component={CobroScreen} />
            <Stack.Screen name={ROUTES.CUENTAS_CANCELADAS} component={CuentasCanceladasScreen} />
            <Stack.Screen name={ROUTES.RESUMEN} component={ResumenScreen} />
            <Stack.Screen name={ROUTES.CONFIGURACION} component={ConfiguracionScreen} />
            <Stack.Screen name={ROUTES.PRODUCTOS_VENDIDOS} component={ProductosVendidosScreen} />
            <Stack.Screen name={ROUTES.GASTOS} component={GastosScreen} />
            <Stack.Screen name={ROUTES.ADD_GASTO} component={AddGastoScreen} />
            <Stack.Screen name={ROUTES.INFORMES} component={InformesScreen} />
            <Stack.Screen name={ROUTES.INVENTARIO} component={InventarioScreen} />
            <Stack.Screen name={ROUTES.ADD_PRODUCTO} component={AddProductoScreen} />
            <Stack.Screen name={ROUTES.DETALLE_PRODUCTO} component={DetalleProductoScreen} />
            <Stack.Screen name={ROUTES.PRODUCTOS_DESACTIVADOS} component={ProductosDesactivadosScreen} />
            <Stack.Screen name={ROUTES.PUNTO_VENTA} component={PuntoVentaScreen} />
            <Stack.Screen name={ROUTES.SELECCIONAR_PRODUCTOS} component={SeleccionarProductosScreen} />
            <Stack.Screen name={ROUTES.METODO_PAGO} component={MetodoPagoScreen} />
            <Stack.Screen name={ROUTES.BORRADORES} component={BorradoresScreen} />
            <Stack.Screen name={ROUTES.LISTA_VENTAS} component={ListaVentasScreen} />
            <Stack.Screen name={ROUTES.DETALLE_VENTA} component={DetalleVentaScreen} />
        </Stack.Navigator>
    );
}

