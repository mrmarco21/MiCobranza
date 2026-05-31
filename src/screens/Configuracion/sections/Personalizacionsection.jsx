import React from 'react';
import { View, Text, TouchableOpacity, TextInput, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CollapsibleSection from '../../../shared/components/CollapsibleSection';

export default function PersonalizacionSection({
    colors,
    storeName,
    storeLogo,
    editingName,
    tempStoreName,
    setTempStoreName,
    setEditingName,
    handleSaveStoreName,
    handlePickImage,
    handleRemoveLogo,
}) {
    const styles = createStyles(colors);

    return (
        <CollapsibleSection
            title="Personalización"
            description="Nombre y logo de tu tienda"
            icon="storefront-outline"
            iconColor="#45beffff"
            defaultExpanded={false}
        >
            <View style={styles.content}>
                {/* Logo de la tienda */}
                <View style={styles.logoCard}>
                    <View style={styles.logoHeader}>
                        <Text style={styles.cardTitle}>Logo de la tienda</Text>
                        <Text style={styles.cardSubtitle}>Identidad visual de tu negocio</Text>
                    </View>
                    <View style={styles.logoContainer}>
                        <View style={styles.logoPreview}>
                            {storeLogo ? (
                                <Image source={{ uri: storeLogo }} style={styles.logoImage} />
                            ) : (
                                <Image
                                    source={require('../../../../assets/icon_app.png')}
                                    style={styles.logoImage}
                                />
                            )}
                        </View>
                        <View style={styles.logoActions}>
                            <TouchableOpacity style={styles.logoButton} onPress={handlePickImage}>
                                <Ionicons name="camera-outline" size={18} color="#45beffff" />
                                <Text style={styles.logoButtonText}>Cambiar Logo</Text>
                            </TouchableOpacity>
                            {storeLogo && (
                                <TouchableOpacity
                                    style={[styles.logoButton, styles.logoButtonDanger]}
                                    onPress={handleRemoveLogo}
                                >
                                    <Ionicons name="trash-outline" size={18} color="#e74c3c" />
                                    <Text style={[styles.logoButtonText, styles.logoButtonTextDanger]}>
                                        Eliminar
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>

                {/* Nombre de la tienda */}
                <View style={styles.nameCard}>
                    <Text style={styles.nameLabel}>Nombre de la tienda</Text>
                    {editingName ? (
                        <View style={styles.nameEditContainer}>
                            <TextInput
                                style={styles.nameInput}
                                value={tempStoreName}
                                onChangeText={setTempStoreName}
                                placeholder="Nombre de tu tienda"
                                placeholderTextColor={colors.textTertiary}
                                autoFocus
                            />
                            <View style={styles.nameEditActions}>
                                <TouchableOpacity
                                    style={[styles.nameEditButton, styles.nameEditButtonPrimary]}
                                    onPress={handleSaveStoreName}
                                >
                                    <Ionicons name="checkmark" size={18} color="#4CAF50" />
                                    <Text style={styles.nameEditButtonText}>Guardar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.nameEditButton}
                                    onPress={() => {
                                        setTempStoreName(storeName);
                                        setEditingName(false);
                                    }}
                                >
                                    <Ionicons name="close" size={18} color="#e74c3c" />
                                    <Text style={styles.nameEditButtonText}>Cancelar</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={styles.nameDisplay}
                            onPress={() => setEditingName(true)}
                        >
                            <View style={styles.nameTextWrap}>
                                <Text style={styles.nameText}>{storeName}</Text>
                                <Text style={styles.nameHint}>Toca para editar el nombre visible</Text>
                            </View>
                            <View style={styles.nameEditIcon}>
                                <Ionicons name="pencil" size={16} color="#45beffff" />
                            </View>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </CollapsibleSection>
    );
}

const createStyles = (colors) => StyleSheet.create({
    content: {
        gap: 12,
    },
    logoCard: {
        backgroundColor: colors.surfaceVariant,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 14,
    },
    logoHeader: {
        alignItems: 'center',
        marginBottom: 12,
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text,
    },
    cardSubtitle: {
        fontSize: 11,
        color: colors.textSecondary,
        marginTop: 2,
    },
    logoContainer: {
        alignItems: 'center',
    },
    logoPreview: {
        width: 104,
        height: 104,
        borderRadius: 24,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 14,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
    },
    logoImage: {
        width: '100%',
        height: '100%',
    },
    logoActions: {
        flexDirection: 'row',
        gap: 10,
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    logoButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 9,
        backgroundColor: colors.primaryLight,
        borderRadius: 10,
    },
    logoButtonDanger: {
        backgroundColor: colors.errorLight,
    },
    logoButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.primary,
    },
    logoButtonTextDanger: {
        color: colors.error,
    },
    nameCard: {
        backgroundColor: colors.surfaceVariant,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 14,
    },
    nameLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 10,
    },
    nameDisplay: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        backgroundColor: colors.surface,
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 12,
    },
    nameTextWrap: {
        flex: 1,
    },
    nameText: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.text,
    },
    nameHint: {
        fontSize: 11,
        color: colors.textSecondary,
        marginTop: 2,
    },
    nameEditIcon: {
        width: 30,
        height: 30,
        borderRadius: 9,
        backgroundColor: colors.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    nameEditContainer: {
        gap: 10,
    },
    nameInput: {
        backgroundColor: colors.surface,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 12,
        fontSize: 15,
        color: colors.text,
        borderWidth: 1,
        borderColor: colors.primary,
    },
    nameEditActions: {
        flexDirection: 'row',
        gap: 10,
    },
    nameEditButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 11,
        backgroundColor: colors.surface,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
    },
    nameEditButtonPrimary: {
        borderColor: colors.primary,
    },
    nameEditButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.text,
    },
});
