import React, { useEffect, useState, useRef } from 'react';
import { View, Image, StyleSheet, Text, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { migrarNumeroCuentas } from '../../../src/shared/utils/migraciones';

const STORE_NAME_KEY = 'store_name';
const STORE_LOGO_KEY = 'store_logo';

export default function SplashScreen({ onFinish }) {
    const [storeName, setStoreName] = useState('Mi Cobranza');
    const [storeLogo, setStoreLogo] = useState(null);

    // Animaciones
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const dot1Anim = useRef(new Animated.Value(0)).current;
    const dot2Anim = useRef(new Animated.Value(0)).current;
    const dot3Anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Animación del logo
        Animated.parallel([
            Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 10,
                friction: 3,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
        ]).start();

        // Animación de los puntos (secuencial y en loop)
        const animateDots = () => {
            Animated.sequence([
                Animated.timing(dot1Anim, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }),
                Animated.timing(dot2Anim, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }),
                Animated.timing(dot3Anim, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }),
                Animated.parallel([
                    Animated.timing(dot1Anim, {
                        toValue: 0,
                        duration: 0,
                        useNativeDriver: true,
                    }),
                    Animated.timing(dot2Anim, {
                        toValue: 0,
                        duration: 0,
                        useNativeDriver: true,
                    }),
                    Animated.timing(dot3Anim, {
                        toValue: 0,
                        duration: 0,
                        useNativeDriver: true,
                    }),
                ]),
            ]).start(() => animateDots());
        };

        animateDots();

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
            <Animated.View
                style={[
                    styles.logoContainer,
                    {
                        opacity: fadeAnim,
                        transform: [{ scale: scaleAnim }],
                    },
                ]}
            >
                {storeLogo ? (
                    <Image
                        source={{ uri: storeLogo }}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                ) : (
                    <Image
                        source={require('../../../assets/icon_app.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                )}
            </Animated.View>

            <Animated.Text style={[styles.appName, { opacity: fadeAnim }]}>
                {storeName}
            </Animated.Text>

            <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Cargando</Text>
                <View style={styles.dotsContainer}>
                    <Animated.View
                        style={[
                            styles.dot,
                            {
                                opacity: dot1Anim,
                                transform: [
                                    {
                                        translateY: dot1Anim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0, -8],
                                        }),
                                    },
                                ],
                            },
                        ]}
                    />
                    <Animated.View
                        style={[
                            styles.dot,
                            {
                                opacity: dot2Anim,
                                transform: [
                                    {
                                        translateY: dot2Anim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0, -8],
                                        }),
                                    },
                                ],
                            },
                        ]}
                    />
                    <Animated.View
                        style={[
                            styles.dot,
                            {
                                opacity: dot3Anim,
                                transform: [
                                    {
                                        translateY: dot3Anim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0, -8],
                                        }),
                                    },
                                ],
                            },
                        ]}
                    />
                </View>
            </View>
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
    logoContainer: {
        marginBottom: 20,
    },
    logo: {
        width: 140,
        height: 140,
        borderRadius: 35,
    },
    appName: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 50,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        fontSize: 16,
        color: '#FFFFFF',
        fontWeight: '600',
        marginRight: 8,
    },
    dotsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FFFFFF',
    },
});
