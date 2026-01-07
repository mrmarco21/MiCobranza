import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import InicioScreen from '../screens/InicioScreen';
import ClientasScreen from '../screens/ClientasScreen';
import AddClientaScreen from '../screens/AddClientaScreen';
import ClientaDetailScreen from '../screens/ClientaDetailScreen';
import AddMovimientoScreen from '../screens/AddMovimientoScreen';
import HistorialCuentasScreen from '../screens/HistorialCuentasScreen';
import DetalleCuentaScreen from '../screens/DetalleCuentaScreen';
import CuentasCanceladasScreen from '../screens/CuentasCanceladasScreen';
import ResumenScreen from '../screens/ResumenScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function InicioStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="InicioMain" component={InicioScreen} />
            <Stack.Screen name="Clientas" component={ClientasScreen} />
            <Stack.Screen name="AddClienta" component={AddClientaScreen} />
            <Stack.Screen name="ClientaDetail" component={ClientaDetailScreen} />
            <Stack.Screen name="AddMovimiento" component={AddMovimientoScreen} />
            <Stack.Screen name="HistorialCuentas" component={HistorialCuentasScreen} />
            <Stack.Screen name="DetalleCuenta" component={DetalleCuentaScreen} />
        </Stack.Navigator>
    );
}

function CanceladasStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="CuentasCanceladas" component={CuentasCanceladasScreen} />
            <Stack.Screen name="HistorialCuentas" component={HistorialCuentasScreen} />
            <Stack.Screen name="DetalleCuenta" component={DetalleCuentaScreen} />
        </Stack.Navigator>
    );
}

export default function AppNavigator() {
    const insets = useSafeAreaInsets();

    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: '#9b59b6',
                tabBarActiveBackgroundColor: '#9999992c',
                tabBarInactiveTintColor: '#999',
                tabBarStyle: {
                    paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
                    paddingTop: 2,
                    height: 60 + (insets.bottom > 0 ? insets.bottom : 5),
                    backgroundColor: '#FFFFFF',
                    borderTopWidth: 1,
                    borderTopColor: '#F0F0F0',
                },
                tabBarLabelStyle: { fontSize: 12 },
            }}
        >
            <Tab.Screen
                name="InicioTab"
                component={InicioStack}
                options={{
                    tabBarLabel: 'Inicio',
                    tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
                }}
                listeners={({ navigation }) => ({
                    tabPress: (e) => {
                        navigation.navigate('InicioTab', { screen: 'InicioMain' });
                    },
                })}
            />
            <Tab.Screen
                name="CanceladasTab"
                component={CanceladasStack}
                options={{
                    tabBarLabel: 'Canceladas',
                    tabBarIcon: ({ color, size }) => <Ionicons name="checkmark-done-outline" size={size} color={color} />,
                }}
                listeners={({ navigation }) => ({
                    tabPress: (e) => {
                        navigation.navigate('CanceladasTab', { screen: 'CuentasCanceladas' });
                    },
                })}
            />
            <Tab.Screen
                name="ResumenTab"
                component={ResumenScreen}
                options={{
                    tabBarLabel: 'Resumen',
                    tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart-outline" size={size} color={color} />,
                }}
            />
        </Tab.Navigator>
    );
}
