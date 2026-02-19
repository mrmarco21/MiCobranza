import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import InicioScreen from '../screens/InicioScreen';
import CuentasPendientesScreen from '../screens/CuentasPendientesScreen';
import ClientasScreen from '../screens/ClientasScreen';
import AddClientaScreen from '../screens/AddClientaScreen';
import ClientaDetailScreen from '../screens/ClientaDetailScreen';
import AddMovimientoScreen from '../screens/AddMovimientoScreen';
import HistorialCuentasScreen from '../screens/HistorialCuentasScreen';
import DetalleCuentaScreen from '../screens/DetalleCuentaScreen';
import CuentasCanceladasScreen from '../screens/CuentasCanceladasScreen';
import ResumenScreen from '../screens/ResumenScreen';
import ConfiguracionScreen from '../screens/ConfiguracionScreen';
import ProductosVendidosScreen from '../screens/ProductosVendidosScreen';
import GastosScreen from '../screens/GastosScreen';
import AddGastoScreen from '../screens/AddGastoScreen';
import InformesScreen from '../screens/InformesScreen';

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
            <Stack.Screen name="Inicio" component={InicioScreen} />
            <Stack.Screen name="CuentasPendientes" component={CuentasPendientesScreen} />
            <Stack.Screen name="clientas" component={ClientasScreen} />
            <Stack.Screen name="AddClienta" component={AddClientaScreen} />
            <Stack.Screen name="ClientaDetail" component={ClientaDetailScreen} />
            <Stack.Screen name="AddMovimiento" component={AddMovimientoScreen} />
            <Stack.Screen name="HistorialClientaCuentas" component={HistorialCuentasScreen} />
            <Stack.Screen name="DetalleCuenta" component={DetalleCuentaScreen} />
            <Stack.Screen name="CuentasCanceladas" component={CuentasCanceladasScreen} />
            <Stack.Screen name="Resumen" component={ResumenScreen} />
            <Stack.Screen name="Configuracion" component={ConfiguracionScreen} />
            <Stack.Screen name="ProductosVendidos" component={ProductosVendidosScreen} />
            <Stack.Screen name="Gastos" component={GastosScreen} />
            <Stack.Screen name="AddGasto" component={AddGastoScreen} />
            <Stack.Screen name="Informes" component={InformesScreen} />
        </Stack.Navigator>
    );
}
