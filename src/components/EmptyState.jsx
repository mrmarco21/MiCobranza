import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function EmptyState({ message, iconName = 'alert-circle-outline' }) {
    return (
        <View style={styles.container}>
            <View style={styles.iconContainer}>
                <Ionicons name={iconName} size={64} color="#DFE6E9" />
            </View>
            <Text style={styles.titulo}>Sin resultados</Text>
            <Text style={styles.mensaje}>{message}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        paddingVertical: 60,
    },
    iconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#F8F9FA',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    titulo: {
        fontSize: 18,
        fontWeight: '700',
        color: '#2D3436',
        marginBottom: 8,
        textAlign: 'center',
    },
    mensaje: {
        fontSize: 13,
        color: '#636E72',
        textAlign: 'center',
        lineHeight: 22,
    },
});
