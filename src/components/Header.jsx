import { View, Text, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { useTheme } from '../hooks/useTheme';
import MenuModal from './MenuModal';

export default function Header({ title, showBack = false, showMenu = false, rightIcon, onRightPress, rightButtons, searchMode = false, searchValue = '', onSearchChange, searchPlaceholder = 'Buscar...' }) {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();
    const [menuVisible, setMenuVisible] = useState(false);
    const { colors } = useTheme();
    const styles = createStyles(colors);

    return (
        <>
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <View style={styles.content}>
                    {showBack ? (
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => navigation.goBack()}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity>
                    ) : showMenu ? (
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => setMenuVisible(true)}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="menu" size={26} color="#fff" />
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.placeholder} />
                    )}

                    {/* Modo búsqueda o título normal */}
                    {searchMode ? (
                        <View style={styles.searchContainer}>
                            <Ionicons name="search" size={20} color="#fff" style={styles.searchIcon} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder={searchPlaceholder}
                                placeholderTextColor="rgba(255, 255, 255, 0.6)"
                                value={searchValue}
                                onChangeText={onSearchChange}
                                autoFocus
                                returnKeyType="search"
                                autoCorrect={false}
                                autoCapitalize="words"
                            />
                        </View>
                    ) : (
                        <Text style={styles.title}>{title}</Text>
                    )}

                    {/* Múltiples botones a la derecha */}
                    {rightButtons && rightButtons.length > 0 ? (
                        <View style={styles.rightButtonsContainer}>
                            {rightButtons.map((button, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={styles.rightButton}
                                    onPress={button.onPress}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name={button.icon} size={24} color="#fff" />
                                </TouchableOpacity>
                            ))}
                        </View>
                    ) : rightIcon && onRightPress ? (
                        <TouchableOpacity
                            style={styles.rightButton}
                            onPress={onRightPress}
                            activeOpacity={0.7}
                        >
                            <Ionicons name={rightIcon} size={24} color="#fff" />
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.placeholder} />
                    )}
                </View>
            </View>
            <MenuModal
                visible={menuVisible}
                onClose={() => setMenuVisible(false)}
                navigation={navigation}
            />
        </>
    );
}

const createStyles = (colors) => StyleSheet.create({
    container: {
        backgroundColor: colors.primary,
    },
    content: {
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: -8,
    },
    rightButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: -8,
    },
    rightButtonsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginRight: -8,
    },
    placeholder: {
        width: 40,
    },
    title: {
        flex: 1,
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
        textAlign: 'left',
        marginLeft: 8,
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 8,
        paddingHorizontal: 12,
        marginHorizontal: 8,
        height: 40,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#fff',
        padding: 0,
    }
});
