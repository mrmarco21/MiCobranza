import { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';

export default function SortFilterModal({ visible, onClose, onApply, currentFilter, currentSort, showFilters = false }) {
    const { colors } = useTheme();
    const styles = createStyles(colors);
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedFilter, setSelectedFilter] = useState(currentFilter || 'all');
    const [selectedSort, setSelectedSort] = useState(currentSort || 'a-z');

    useEffect(() => {
        if (visible) {
            setSelectedFilter(currentFilter || 'all');
            setSelectedSort(currentSort || 'a-z');
            setModalVisible(true);
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    useNativeDriver: true,
                    tension: 100,
                    friction: 8,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                })
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(scaleAnim, {
                    toValue: 0,
                    duration: 150,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 150,
                    useNativeDriver: true,
                })
            ]).start(() => {
                setModalVisible(false);
            });
        }
    }, [visible]);

    const handleApply = () => {
        onApply({ filter: selectedFilter, sort: selectedSort });
        onClose();
    };

    const handleOptionSelect = (type, value) => {
        if (type === 'filter') {
            // Si el filtro ya está seleccionado, lo deseleccionamos (volvemos a 'all')
            const newFilter = selectedFilter === value ? 'all' : value;
            setSelectedFilter(newFilter);
            onApply({ filter: newFilter, sort: selectedSort });
        } else {
            setSelectedSort(value);
            onApply({ filter: selectedFilter, sort: value });
        }
        onClose();
    };

    const filterOptions = [
        { value: 'pending', label: 'Pendientes', icon: 'alert-circle' },
        { value: 'inactive', label: 'Sin cuenta activa', icon: 'close-circle' },
    ];

    const sortOptions = [
        { value: 'a-z', label: 'A-Z', icon: 'arrow-down' },
        { value: 'z-a', label: 'Z-A', icon: 'arrow-up' },
        { value: 'recent', label: 'Recientes', icon: 'time' },
        { value: 'oldest', label: 'Antiguos', icon: 'time-outline' },
        { value: 'highest', label: 'Saldo mayor', icon: 'trending-up' },
        { value: 'lowest', label: 'Saldo menor', icon: 'trending-down' },
    ];

    return (
        <Modal
            visible={modalVisible}
            transparent
            animationType="none"
            onRequestClose={onClose}
        >
            <TouchableOpacity
                style={styles.overlay}
                activeOpacity={1}
                onPress={onClose}
            >
                <Animated.View
                    style={[
                        styles.dropdownContainer,
                        {
                            opacity: fadeAnim,
                            transform: [{ scale: scaleAnim }]
                        }
                    ]}
                >
                    {/* Filtros */}
                    {showFilters && (
                        <>
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Filtrar</Text>
                            </View>

                            {filterOptions.map((option) => (
                                <TouchableOpacity
                                    key={option.value}
                                    style={styles.option}
                                    onPress={() => handleOptionSelect('filter', option.value)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.optionContent}>
                                        <Text style={styles.optionLabel}>{option.label}</Text>
                                    </View>
                                    <View style={[
                                        styles.radio,
                                        selectedFilter === option.value && styles.radioSelected
                                    ]}>
                                        {selectedFilter === option.value && (
                                            <View style={styles.radioInner} />
                                        )}
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </>
                    )}

                    {/* Ordenar */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Ordenar</Text>
                    </View>

                    {sortOptions.map((option) => (
                        <TouchableOpacity
                            key={option.value}
                            style={styles.option}
                            onPress={() => handleOptionSelect('sort', option.value)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.optionContent}>
                                <Text style={styles.optionLabel}>{option.label}</Text>
                            </View>
                            <View style={[
                                styles.radio,
                                selectedSort === option.value && styles.radioSelected
                            ]}>
                                {selectedSort === option.value && (
                                    <View style={styles.radioInner} />
                                )}
                            </View>
                        </TouchableOpacity>
                    ))}
                </Animated.View>
            </TouchableOpacity>
        </Modal>
    );
}

const createStyles = (colors) => StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        paddingTop: 60,
        paddingRight: 16,
        alignItems: 'flex-end',
    },
    dropdownContainer: {
        backgroundColor: colors.card,
        borderRadius: 12,
        minWidth: 220,
        maxWidth: 280,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    section: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 8,
        backgroundColor: colors.surfaceVariant,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    optionContent: {
        flex: 1,
    },
    optionLabel: {
        fontSize: 15,
        fontWeight: '500',
        color: colors.text,
    },
    radio: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: colors.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioSelected: {
        borderColor: colors.primary,
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: colors.primary,
    },
});
