import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CollapsibleSection from '../../../shared/components/CollapsibleSection';

export default function AparienciaSection({ colors, isDark, toggleTheme }) {
    const styles = createStyles(colors);

    return (
        <CollapsibleSection
            title="Apariencia"
            description={isDark ? 'Modo oscuro activado' : 'Modo claro activado'}
            icon="color-palette-outline"
            iconColor="#45beffff"
            defaultExpanded={false}
        >
            <View style={styles.themeCard}>
                <View style={styles.themeContainer}>
                    <View style={styles.themeInfo}>
                        <View style={styles.themeIcon}>
                            <Ionicons
                                name={isDark ? 'moon' : 'sunny'}
                                size={20}
                                color={isDark ? '#FFA726' : '#FFD54F'}
                            />
                        </View>
                        <View style={styles.themeTextWrap}>
                            <Text style={styles.themeText}>
                                {isDark ? 'Modo Oscuro' : 'Modo Claro'}
                            </Text>
                            <Text style={styles.themeCaption}>
                                {isDark ? 'Ideal para ambientes con poca luz' : 'Mejor visibilidad durante el día'}
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={[
                            styles.toggleButton,
                            isDark ? styles.toggleButtonActive : styles.toggleButtonInactive,
                        ]}
                        onPress={toggleTheme}
                    >
                        <View style={[styles.toggleCircle, isDark && styles.toggleCircleActive]} />
                    </TouchableOpacity>
                </View>

                <View style={styles.themeDescriptionBox}>
                    <Ionicons name="eye-outline" size={16} color={colors.textSecondary} />
                    <Text style={styles.themeDescription}>
                        El modo oscuro reduce el brillo de la pantalla y es más cómodo para los ojos en ambientes con poca luz.
                    </Text>
                </View>
            </View>
        </CollapsibleSection>
    );
}

const createStyles = (colors) => StyleSheet.create({
    themeCard: {
        gap: 10,
    },
    themeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.surfaceVariant,
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
    },
    themeInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
        paddingRight: 12,
    },
    themeIcon: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    themeTextWrap: {
        flex: 1,
    },
    themeText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
    },
    themeCaption: {
        fontSize: 11,
        color: colors.textSecondary,
        marginTop: 2,
    },
    themeDescriptionBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        backgroundColor: colors.surfaceVariant,
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 12,
    },
    themeDescription: {
        flex: 1,
        fontSize: 12,
        color: colors.textSecondary,
        lineHeight: 17,
    },
    toggleButton: {
        width: 44,
        height: 24,
        borderRadius: 12,
        padding: 3,
        justifyContent: 'center',
    },
    toggleButtonActive: {
        backgroundColor: '#4CAF50',
        alignItems: 'flex-end',
    },
    toggleButtonInactive: {
        backgroundColor: colors.border,
        alignItems: 'flex-start',
    },
    toggleCircle: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: colors.card,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
    toggleCircleActive: {},
});
