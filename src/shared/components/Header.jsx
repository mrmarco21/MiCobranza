import { View, Text, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { useTheme } from '../hooks/useTheme';
import MenuModal from './MenuModal';

export default function Header({ title, subtitle, subtitleSecondary, showBack = false, showMenu = false, leftIcon, onLeftPress, rightIcon, onRightPress, rightButtons, searchMode = false, searchValue = '', onSearchChange, searchPlaceholder = 'Buscar...', whiteBackground = false }) {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();
    const [menuVisible, setMenuVisible] = useState(false);
    const { colors } = useTheme();
    const styles = createStyles(colors, whiteBackground);

    return (
        <>
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <View style={styles.content}>
                    {/* Botón izquierdo */}
                    {showBack ? (
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => navigation.goBack()}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="arrow-back" size={24} color={whiteBackground ? "#2C3E50" : "#fff"} />
                        </TouchableOpacity>
                    ) : showMenu ? (
                        <View style={styles.leftButtonsContainer}>
                            {leftIcon && onLeftPress && (
                                <TouchableOpacity
                                    style={styles.leftIconButton}
                                    onPress={onLeftPress}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name={leftIcon} size={22} color={whiteBackground ? "#2C3E50" : "#fff"} />
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                style={styles.backButton}
                                onPress={() => setMenuVisible(true)}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="menu" size={26} color={whiteBackground ? "#2C3E50" : "#fff"} />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.placeholder} />
                    )}

                    {/* Modo búsqueda o título normal */}
                    {searchMode ? (
                        <View style={styles.searchContainer}>
                            <Ionicons name="search" size={20} color={whiteBackground ? "#2C3E50" : "#fff"} style={styles.searchIcon} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder={searchPlaceholder}
                                placeholderTextColor={whiteBackground ? "rgba(44, 62, 80, 0.5)" : "rgba(255, 255, 255, 0.6)"}
                                value={searchValue}
                                onChangeText={onSearchChange}
                                autoFocus
                                returnKeyType="search"
                                autoCorrect={false}
                                autoCapitalize="words"
                            />
                        </View>
                    ) : (
                        <View style={styles.titleContainer}>
                            {subtitle && !subtitleSecondary ? (
                                // Modo simple: título con subtitle debajo
                                <View>
                                    <Text style={styles.title}>{title}</Text>
                                    <Text style={styles.subtitleBelow}>{subtitle}</Text>
                                </View>
                            ) : (
                                // Modo con subtitleSecondary: título a la izquierda, subtitle a la derecha
                                <View style={styles.titleRow}>
                                    <Text style={styles.title}>{title}</Text>
                                    {subtitle && (
                                        <View style={styles.subtitleContainer}>
                                            <Text style={styles.subtitleMain}>{subtitle}</Text>
                                            {subtitleSecondary && (
                                                <Text style={styles.subtitleSecondary}>{subtitleSecondary}</Text>
                                            )}
                                        </View>
                                    )}
                                </View>
                            )}
                        </View>
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
                                    <Ionicons name={button.icon} size={24} color={whiteBackground ? "#2C3E50" : "#fff"} />
                                    {button.badge && button.badge > 0 && (
                                        <View style={styles.badge}>
                                            <Text style={styles.badgeText}>
                                                {button.badge > 99 ? '99+' : button.badge}
                                            </Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    ) : rightIcon && onRightPress ? (
                        <TouchableOpacity
                            style={styles.rightButton}
                            onPress={onRightPress}
                            activeOpacity={0.7}
                        >
                            <Ionicons name={rightIcon} size={24} color={whiteBackground ? "#2C3E50" : "#fff"} />
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

const createStyles = (colors, whiteBackground) => StyleSheet.create({
    container: {
        backgroundColor: whiteBackground ? '#FFFFFF' : colors.primary,
        borderBottomWidth: whiteBackground ? 1 : 0,
        borderBottomColor: whiteBackground ? '#E0E0E0' : 'transparent',
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
    leftButtonsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 0,
        marginLeft: -8,
    },
    leftIconButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
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
    titleContainer: {
        flex: 1,
        marginLeft: 8,
        // borderWidth: 1,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        // borderWidth: 1
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: whiteBackground ? '#2C3E50' : '#fff',
        textAlign: 'left',
    },
    subtitleBelow: {
        fontSize: 12,
        fontWeight: '500',
        color: whiteBackground ? 'rgba(44, 62, 80, 0.7)' : 'rgba(255, 255, 255, 0.8)',
        textAlign: 'left',
        marginTop: 0,
        letterSpacing: 0.6,
    },
    subtitleContainer: {
        flex: 1,
        alignItems: 'flex-end',
    },
    subtitleMain: {
        fontSize: 18,
        fontWeight: '700',
        color: whiteBackground ? '#2C3E50' : '#fff',
        textAlign: 'right',
    },
    subtitleSecondary: {
        fontSize: 12,
        fontWeight: '500',
        color: whiteBackground ? 'rgba(44, 62, 80, 0.7)' : 'rgba(255, 255, 255, 0.85)',
        textAlign: 'right',
        marginTop: 0,
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: whiteBackground ? 'rgba(44, 62, 80, 0.1)' : 'rgba(255, 255, 255, 0.2)',
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
        color: whiteBackground ? '#2C3E50' : '#fff',
        padding: 0,
    },
    badge: {
        position: 'absolute',
        top: 6,
        right: 6,
        backgroundColor: '#FF6B6B',
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
        borderWidth: 2,
        borderColor: colors.primary,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#FFF',
    }
});
