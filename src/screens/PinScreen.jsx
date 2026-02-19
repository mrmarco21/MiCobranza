import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Vibration,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Alert,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../hooks/useTheme';

const PIN_KEY = 'user_pin';
const MAX_ATTEMPTS = 5;
const ATTEMPT_KEY = 'pin_attempts';
const SECURITY_QUESTION_KEY = 'security_question';
const SECURITY_ANSWER_KEY = 'security_answer';

const SECURITY_QUESTIONS = [
    '¿Cuál es el nombre de tu primera mascota?',
    '¿En qué ciudad naciste?',
    '¿Cuál es tu comida favorita?',
    '¿Nombre de tu mejor amigo de la infancia?',
    '¿Cuál es tu color favorito?',
    '¿Nombre de tu calle favorita?',
];

export default function PinScreen({ onSuccess }) {
    const { colors } = useTheme();
    const styles = createStyles(colors);

    const [pin, setPin] = useState('');
    const [isSettingPin, setIsSettingPin] = useState(false);
    const [confirmPin, setConfirmPin] = useState('');
    const [step, setStep] = useState('enter'); // 'enter', 'confirm', 'security'
    const [numbers, setNumbers] = useState([]);
    const [shakeAnimation] = useState(new Animated.Value(0));
    const [attempts, setAttempts] = useState(0);
    const [isBlocked, setIsBlocked] = useState(false);
    const [showRecovery, setShowRecovery] = useState(false);

    // Estados para pregunta de seguridad
    const [selectedQuestion, setSelectedQuestion] = useState(0);
    const [securityAnswer, setSecurityAnswer] = useState('');
    const [recoveryAnswer, setRecoveryAnswer] = useState('');
    const [showQuestionSelector, setShowQuestionSelector] = useState(false);
    const [savedQuestion, setSavedQuestion] = useState('');

    useEffect(() => {
        checkPinExists();
        shuffleNumbers();
    }, []);

    const checkPinExists = async () => {
        try {
            const savedPin = await AsyncStorage.getItem(PIN_KEY);
            const savedAttempts = await AsyncStorage.getItem(ATTEMPT_KEY);
            const question = await AsyncStorage.getItem(SECURITY_QUESTION_KEY);

            if (question) {
                setSavedQuestion(question);
            }

            if (savedAttempts) {
                const attemptsData = JSON.parse(savedAttempts);
                if (attemptsData.count >= MAX_ATTEMPTS) {
                    setIsBlocked(true);
                    setAttempts(attemptsData.count);
                } else {
                    setAttempts(attemptsData.count);
                }
            }

            setIsSettingPin(!savedPin);
        } catch (error) {
            console.error('Error checking PIN:', error);
        }
    };

    const shuffleNumbers = () => {
        const nums = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
        for (let i = nums.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [nums[i], nums[j]] = [nums[j], nums[i]];
        }
        setNumbers(nums);
    };

    const handleNumberPress = (number) => {
        if (pin.length < 4) {
            const newPin = pin + number;
            setPin(newPin);

            if (newPin.length === 4) {
                setTimeout(() => {
                    handlePinComplete(newPin);
                }, 100);
            }
        }
    };

    const handlePinComplete = async (completedPin) => {
        if (isSettingPin) {
            if (step === 'enter') {
                setConfirmPin(completedPin);
                setPin('');
                setStep('confirm');
                shuffleNumbers();
            } else if (step === 'confirm') {
                if (completedPin === confirmPin) {
                    setPin('');
                    setStep('security');
                } else {
                    shakeError();
                    setPin('');
                    setConfirmPin('');
                    setStep('enter');
                    shuffleNumbers();
                }
            }
        } else {
            const savedPin = await AsyncStorage.getItem(PIN_KEY);
            if (completedPin === savedPin) {
                await AsyncStorage.setItem(ATTEMPT_KEY, JSON.stringify({ count: 0 }));
                onSuccess();
            } else {
                const newAttempts = attempts + 1;
                setAttempts(newAttempts);
                await AsyncStorage.setItem(ATTEMPT_KEY, JSON.stringify({ count: newAttempts }));

                if (newAttempts >= MAX_ATTEMPTS) {
                    setIsBlocked(true);
                }

                shakeError();
                setPin('');
                shuffleNumbers();
            }
        }
    };

    const handleSecuritySetup = async () => {
        if (!securityAnswer.trim()) {
            Alert.alert('Error', 'Por favor ingresa una respuesta');
            return;
        }

        try {
            await AsyncStorage.setItem(PIN_KEY, confirmPin);
            await AsyncStorage.setItem(SECURITY_QUESTION_KEY, SECURITY_QUESTIONS[selectedQuestion]);
            await AsyncStorage.setItem(SECURITY_ANSWER_KEY, securityAnswer.toLowerCase().trim());
            onSuccess();
        } catch (error) {
            Alert.alert('Error', 'No se pudo guardar la configuración');
        }
    };

    const handleRecovery = async () => {
        if (!recoveryAnswer.trim()) {
            Alert.alert('Error', 'Por favor ingresa tu respuesta');
            return;
        }

        try {
            const savedAnswer = await AsyncStorage.getItem(SECURITY_ANSWER_KEY);
            if (recoveryAnswer.toLowerCase().trim() === savedAnswer) {
                // Respuesta correcta, permitir cambiar PIN
                setShowRecovery(false);
                setIsBlocked(false);
                setAttempts(0);
                setIsSettingPin(true);
                setStep('enter');
                setPin('');
                setConfirmPin('');
                setRecoveryAnswer('');
                await AsyncStorage.setItem(ATTEMPT_KEY, JSON.stringify({ count: 0 }));
                shuffleNumbers();
                Alert.alert('Éxito', 'Ahora puedes crear un nuevo PIN');
            } else {
                Alert.alert('Error', 'Respuesta incorrecta');
                setRecoveryAnswer('');
            }
        } catch (error) {
            Alert.alert('Error', 'No se pudo verificar la respuesta');
        }
    };

    const handleDelete = () => {
        setPin(pin.slice(0, -1));
    };

    const shakeError = () => {
        Vibration.vibrate(500);
        Animated.sequence([
            Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnimation, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]).start();
    };

    const getTitle = () => {
        if (showRecovery) return 'Recuperar PIN';
        if (isBlocked) return 'Bloqueado';
        if (isSettingPin) {
            if (step === 'security') return 'Pregunta de Seguridad';
            return step === 'enter' ? 'Crear PIN' : 'Confirmar PIN';
        }
        return 'Ingresa tu PIN';
    };

    const getSubtitle = () => {
        if (showRecovery) return 'Responde tu pregunta de seguridad';
        if (isBlocked) {
            return `Demasiados intentos fallidos (${attempts}/${MAX_ATTEMPTS})`;
        }
        if (isSettingPin) {
            if (step === 'security') return 'Configura una pregunta para recuperar tu PIN';
            return step === 'enter'
                ? 'Crea un PIN de 4 dígitos'
                : 'Ingresa nuevamente tu PIN';
        }
        return attempts > 0
            ? `Intentos: ${attempts}/${MAX_ATTEMPTS}`
            : 'Ingresa tu PIN para continuar';
    };

    // Vista de recuperación
    if (showRecovery) {
        return (
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContainer}
                    keyboardShouldPersistTaps="handled"
                >
                    <Ionicons name="help-circle-outline" size={60} color="#45beffff" />
                    <Text style={styles.title}>{getTitle()}</Text>
                    <Text style={styles.subtitle}>{getSubtitle()}</Text>

                    <View style={styles.recoveryContainer}>
                        <Text style={styles.questionText}>{savedQuestion}</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Tu respuesta"
                            value={recoveryAnswer}
                            onChangeText={setRecoveryAnswer}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={handleRecovery}
                        >
                            <Text style={styles.primaryButtonText}>Verificar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.secondaryButton}
                            onPress={() => {
                                setShowRecovery(false);
                                setRecoveryAnswer('');
                            }}
                        >
                            <Text style={styles.secondaryButtonText}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        );
    }

    // Vista de configuración de pregunta de seguridad
    if (isSettingPin && step === 'security') {
        return (
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContainer}
                    keyboardShouldPersistTaps="handled"
                >
                    <Ionicons name="shield-checkmark-outline" size={60} color="#45beffff" />
                    <Text style={styles.title}>{getTitle()}</Text>
                    <Text style={styles.subtitle}>{getSubtitle()}</Text>

                    <View style={styles.securityContainer}>
                        <TouchableOpacity
                            style={styles.questionSelector}
                            onPress={() => setShowQuestionSelector(!showQuestionSelector)}
                        >
                            <Text style={styles.questionSelectorText}>
                                {SECURITY_QUESTIONS[selectedQuestion]}
                            </Text>
                            <Ionicons
                                name={showQuestionSelector ? "chevron-up" : "chevron-down"}
                                size={24}
                                color="#666"
                            />
                        </TouchableOpacity>

                        {showQuestionSelector && (
                            <View style={styles.questionList}>
                                {SECURITY_QUESTIONS.map((question, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={[
                                            styles.questionOption,
                                            selectedQuestion === index && styles.questionOptionSelected
                                        ]}
                                        onPress={() => {
                                            setSelectedQuestion(index);
                                            setShowQuestionSelector(false);
                                        }}
                                    >
                                        <Text style={[
                                            styles.questionOptionText,
                                            selectedQuestion === index && styles.questionOptionTextSelected
                                        ]}>
                                            {question}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        <TextInput
                            style={styles.input}
                            placeholder="Tu respuesta"
                            value={securityAnswer}
                            onChangeText={setSecurityAnswer}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />

                        <Text style={styles.warningText}>
                            ⚠️ Recuerda tu respuesta, la necesitarás si olvidas tu PIN
                        </Text>

                        <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={handleSecuritySetup}
                        >
                            <Text style={styles.primaryButtonText}>Finalizar</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        );
    }

    // Vista bloqueada
    if (isBlocked) {
        return (
            <View style={styles.container}>
                <Ionicons name="lock-closed" size={80} color="#e74c3c" />
                <Text style={styles.title}>{getTitle()}</Text>
                <Text style={styles.subtitle}>{getSubtitle()}</Text>
                <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => setShowRecovery(true)}
                >
                    <Text style={styles.primaryButtonText}>Recuperar PIN</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Vista del teclado PIN
    return (
        <View style={styles.container}>
            {/* Logo en la parte superior */}
            <View style={styles.logoSection}>
                <Image
                    source={require('../../assets/icon_app.jpg')}
                    style={styles.pinLogo}
                />
            </View>

            {/* Espaciador flexible */}
            <View style={styles.spacer} />

            {/* Sección del PIN - parte inferior */}
            <View style={styles.pinSection}>
                <Ionicons name="lock-closed-outline" size={48} color="#45beffff" />
                <Text style={styles.title}>{getTitle()}</Text>
                <Text style={styles.subtitle}>{getSubtitle()}</Text>

                <Animated.View
                    style={[
                        styles.pinContainer,
                        { transform: [{ translateX: shakeAnimation }] }
                    ]}
                >
                    {[0, 1, 2, 3].map((index) => (
                        <View
                            key={index}
                            style={[
                                styles.pinDot,
                                pin.length > index && styles.pinDotFilled,
                            ]}
                        />
                    ))}
                </Animated.View>

                {!isSettingPin && attempts > 0 && (
                    <TouchableOpacity
                        style={styles.forgotButton}
                        onPress={() => setShowRecovery(true)}
                    >
                        <Text style={styles.forgotButtonText}>¿Olvidaste tu PIN?</Text>
                    </TouchableOpacity>
                )}

                <View style={styles.keypadContainer}>
                    <View style={styles.keypadRow}>
                        {numbers.slice(0, 3).map((num) => (
                            <TouchableOpacity
                                key={num}
                                style={styles.keypadButton}
                                onPress={() => handleNumberPress(num.toString())}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.keypadButtonText}>{num}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <View style={styles.keypadRow}>
                        {numbers.slice(3, 6).map((num) => (
                            <TouchableOpacity
                                key={num}
                                style={styles.keypadButton}
                                onPress={() => handleNumberPress(num.toString())}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.keypadButtonText}>{num}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <View style={styles.keypadRow}>
                        {numbers.slice(6, 9).map((num) => (
                            <TouchableOpacity
                                key={num}
                                style={styles.keypadButton}
                                onPress={() => handleNumberPress(num.toString())}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.keypadButtonText}>{num}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <View style={styles.keypadRow}>
                        <View style={styles.keypadButton} />
                        <TouchableOpacity
                            style={styles.keypadButton}
                            onPress={() => handleNumberPress(numbers[9].toString())}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.keypadButtonText}>{numbers[9]}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.keypadButton}
                            onPress={handleDelete}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="backspace-outline" size={28} color="#333" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );
}

const createStyles = (colors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: 'space-between',
        paddingTop: 0,
    },
    logoSection: {
        alignItems: 'center',
        paddingTop: 150,
        paddingBottom: 10,
        backgroundColor: 'transparent',
    },
    pinLogo: {
        width: 150,
        height: 150,
        borderRadius: 20,
    },
    spacer: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    pinSection: {
        alignItems: 'center',
        paddingBottom: 0,
        width: '100%',
        backgroundColor: 'transparent',
    },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.text,
        marginTop: 20,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 40,
        textAlign: 'center',
    },
    pinContainer: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    pinDot: {
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#45beffff',
        marginHorizontal: 10,
    },
    pinDotFilled: {
        backgroundColor: '#45beffff',
    },
    forgotButton: {
        marginBottom: 20,
    },
    forgotButtonText: {
        color: '#45beffff',
        fontSize: 14,
        textDecorationLine: 'underline',
    },
    keypadContainer: {
        width: '100%',
        paddingTop: 30,
        paddingBottom: 20,
        paddingHorizontal: 0,
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 64,
        borderTopRightRadius: 64,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        // borderTopWidth: 1,
        // borderColor: '#e0e0e0b5',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        // elevation: ,
    },
    keypadRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
    },
    keypadButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    keypadButtonText: {
        fontSize: 28,
        fontWeight: '600',
        color: '#333',
    },
    securityContainer: {
        width: '100%',
        maxWidth: 400,
        paddingHorizontal: 20,
    },
    recoveryContainer: {
        width: '100%',
        maxWidth: 400,
        paddingHorizontal: 20,
    },
    questionSelector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        padding: 15,
        borderRadius: 10,
        marginBottom: 15,
    },
    questionSelectorText: {
        flex: 1,
        fontSize: 14,
        color: '#333',
        marginRight: 10,
    },
    questionList: {
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    questionOption: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    questionOptionSelected: {
        backgroundColor: '#F0E6F6',
    },
    questionOptionText: {
        fontSize: 14,
        color: '#333',
    },
    questionOptionTextSelected: {
        color: '#45beffff',
        fontWeight: '600',
    },
    questionText: {
        fontSize: 16,
        color: '#333',
        marginBottom: 15,
        fontWeight: '600',
    },
    input: {
        backgroundColor: '#F5F5F5',
        padding: 15,
        borderRadius: 10,
        fontSize: 16,
        marginBottom: 15,
    },
    warningText: {
        fontSize: 12,
        color: '#e67e22',
        marginBottom: 20,
        textAlign: 'center',
    },
    primaryButton: {
        backgroundColor: '#45beffff',
        paddingVertical: 15,
        paddingHorizontal: 30,
        borderRadius: 10,
        alignItems: 'center',
        marginBottom: 10,
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    secondaryButton: {
        paddingVertical: 15,
        paddingHorizontal: 30,
        borderRadius: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#45beffff',
    },
    secondaryButtonText: {
        color: '#45beffff',
        fontSize: 16,
        fontWeight: '600',
    },
});

