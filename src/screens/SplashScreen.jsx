import React, { useEffect, useState } from 'react';
import { View, Image, StyleSheet, ActivityIndicator, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { migrarNumeroCuentas } from '../utils/migraciones';

const STORE_NAME_KEY = 'store_name';
const STORE_LOGO_KEY = 'store_logo';

export default function SplashScreen({ onFinish }) {
    const [storeName, setStoreName] = useState('Mi Cobranza');
    const [storeLogo, setStoreLogo] = useState(null);

    useEffect(() => {
        const inicializar = async () => {
            // Cargar configuración personalizada
            const name = await AsyncStorage.getItem(STORE_NAME_KEY);
            const logo = await AsyncStorage.getItem(STORE_LOGO_KEY);

            if (name) setStoreName(name);
            if (logo) setStoreLogo(logo);

            // Ejecutar migraciones
            await migrarNumeroCuentas();

            // Esperar un mínimo de tiempo para mostrar el splash
            const timer = setTimeout(() => {
                onFinish();
            }, 2500);

            return () => clearTimeout(timer);
        };

        inicializar();
    }, [onFinish]);

    return (
        <View style={styles.container}>
            {storeLogo ? (
                <Image
                    source={{ uri: storeLogo }}
                    style={styles.logo}
                    resizeMode="contain"
                />
            ) : (
                <Image
                    source={require('../../assets/icon_app.jpg')}
                    style={styles.logo}
                    resizeMode="contain"
                />
            )}
            <Text style={styles.appName}>{storeName}</Text>
            <ActivityIndicator
                size="large"
                color="#FFFFFF"
                style={styles.loader}
            />
            <Text style={styles.loadingText}>Cargando...</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#45beffff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    logo: {
        width: 140,
        height: 140,
        borderRadius: 35,
        marginBottom: 20,
    },
    appName: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 40,
    },
    loader: {
        marginBottom: 10,
    },
    loadingText: {
        fontSize: 14,
        color: '#FFFFFF',
        opacity: 0.8,
    },
});
