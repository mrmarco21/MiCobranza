import React, { useEffect } from 'react';
import { View, Image, StyleSheet, ActivityIndicator, Text } from 'react-native';

export default function SplashScreen({ onFinish }) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onFinish();
        }, 2500);

        return () => clearTimeout(timer);
    }, [onFinish]);

    return (
        <View style={styles.container}>
            <Image
                source={require('../../assets/icon_app.jpg')}
                style={styles.logo}
                resizeMode="contain"
            />
            <Text style={styles.appName}>Mi Cobranza</Text>
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
        backgroundColor: '#9b59b6',
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
