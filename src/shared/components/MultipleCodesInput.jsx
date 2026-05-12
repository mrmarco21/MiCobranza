import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';

export default function MultipleCodesInput({
    label = 'Código Alternativo',
    codes = [],
    onCodesChange,
    placeholder = 'Agregar código',
    allowBarcode = false,
    onScanBarcode,
    onValidateCode, // Nueva prop para validar códigos
}) {
    const { colors } = useTheme();
    const [inputValue, setInputValue] = useState('');

    const handleAddCode = async () => {
        const trimmedValue = inputValue.trim();

        if (!trimmedValue) return;

        if (codes.includes(trimmedValue)) {
            // Código ya existe en este producto
            Alert.alert('Código duplicado', 'Este código ya está agregado a este producto');
            return;
        }

        // Si hay función de validación, usarla
        if (onValidateCode) {
            const isValid = await onValidateCode(trimmedValue);
            if (!isValid) {
                // La función de validación ya mostró el error
                return;
            }
        }

        // Agregar el código
        onCodesChange([...codes, trimmedValue]);
        setInputValue('');
    };

    const handleRemoveCode = (codeToRemove) => {
        onCodesChange(codes.filter(code => code !== codeToRemove));
    };

    const styles = createStyles(colors);

    return (
        <View style={styles.container}>
            {/* Lista de códigos agregados como chips */}
            {codes.length > 0 && (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.codesScroll}
                    contentContainerStyle={styles.codesScrollContent}
                >
                    {codes.map((code, index) => (
                        <View key={index} style={styles.codeChip}>
                            <Text style={styles.codeChipText}>{code}</Text>
                            <TouchableOpacity
                                onPress={() => handleRemoveCode(code)}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Ionicons name="close" size={18} color="#2C3E50" />
                            </TouchableOpacity>
                        </View>
                    ))}
                </ScrollView>
            )}

            {/* Input para agregar nuevo código con label flotante */}
            <View style={styles.inputSection}>
                <Text style={styles.floatingLabel}>{label}</Text>
                <View style={styles.inputRow}>
                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.input}
                            value={inputValue}
                            onChangeText={setInputValue}
                            placeholder=""
                            placeholderTextColor="#A0A0A0"
                            onSubmitEditing={handleAddCode}
                            returnKeyType="done"
                        />
                    </View>

                    {/* Botón Agregar */}
                    <TouchableOpacity
                        style={[styles.addButton, !inputValue.trim() && styles.addButtonDisabled]}
                        onPress={handleAddCode}
                        activeOpacity={0.7}
                        disabled={!inputValue.trim()}
                    >
                        <Text style={styles.addButtonText}>Agregar</Text>
                    </TouchableOpacity>

                    {/* Botón de escaneo */}
                    {allowBarcode && onScanBarcode && (
                        <TouchableOpacity
                            style={styles.scanButton}
                            onPress={onScanBarcode}
                            activeOpacity={0.7}
                        >
                            <MaterialCommunityIcons name="barcode-scan" size={28} color="#29B6F6" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </View>
    );
}

const createStyles = (colors) => StyleSheet.create({
    container: {
        marginBottom: 14,
    },
    codesScroll: {
        marginBottom: 12,
    },
    codesScrollContent: {
        gap: 10,
        paddingRight: 16,
    },
    codeChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#D5D8DC',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 25,
        gap: 10,
    },
    codeChipText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#2C3E50',
    },
    inputSection: {
        position: 'relative',
    },
    floatingLabel: {
        position: 'absolute',
        top: -8,
        left: 14,
        backgroundColor: colors.background,
        paddingHorizontal: 6,
        fontSize: 12,
        fontWeight: '600',
        color: '#29B6F6',
        zIndex: 1,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    inputWrapper: {
        flex: 1,
        borderWidth: 2,
        borderColor: '#29B6F6',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: colors.card,
    },
    input: {
        fontSize: 16,
        color: colors.text,
        padding: 0,
    },
    addButton: {
        backgroundColor: '#29B6F6',
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderRadius: 12,
        minWidth: 100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addButtonDisabled: {
        backgroundColor: '#BDC3C7',
        opacity: 0.5,
    },
    addButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#FFF',
    },
    scanButton: {
        padding: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
