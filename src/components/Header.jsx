import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export default function Header({ title, showBack = false }) {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();

    return (
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
                ) : (
                    <View style={styles.placeholder} />
                )}
                <Text style={styles.title}>{title}</Text>
                <View style={styles.placeholder} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#9b59b6',
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
    placeholder: {
        width: 40,
    },
    title: {
        flex: 1,
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
        textAlign: 'center',
    },
});
