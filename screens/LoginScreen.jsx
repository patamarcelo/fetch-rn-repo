import React, { useLayoutEffect, useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity, Image, Platform } from 'react-native';


import { KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard } from 'react-native';

import { useDispatch, useSelector } from 'react-redux';
import { login, recoverPassword, clearError } from '../store/redux/authSlice';
import { ActivityIndicator } from 'react-native-paper';

import Ionicons from "@expo/vector-icons/Ionicons";

import { Colors } from '../constants/styles';

import * as Haptics from "expo-haptics";

import { expo } from "../app.json";
// import { ScrollView } from 'react-native-gesture-handler';
import { ScrollView } from 'react-native';



const LoginScreen = ({ navigation }) => {

    const dispatch = useDispatch();
    const { loading, error } = useSelector((state) => state.auth);


    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(true);

    const isDisabled = loading || !email || !password;
    const isDisabledRecover = loading || !email;


    const [keyboardVisible, setKeyboardVisible] = useState(false);


    useEffect(() => {
        const keyboardDidShow = Keyboard.addListener('keyboardDidShow', () => {
            setKeyboardVisible(true);
        });
        const keyboardDidHide = Keyboard.addListener('keyboardDidHide', () => {
            setKeyboardVisible(false);
        });

        return () => {
            keyboardDidShow.remove();
            keyboardDidHide.remove();
        };
    }, []);
    const handleLogin = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
        if (!email || !password) {
            Alert.alert('Erro', 'por favor inserir E-mail e Senha.');
            return;
        }
        dispatch(login({ email, password }));
    };

    const handleForgotPass = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
        if (!email) {
            Alert.alert('Erro', 'Por favor informar um e-mail.');
            return;
        }
        // Dispatch recoverPassword action
        const result = await dispatch(recoverPassword(email));

        // Check the result to determine whether to show success or error
        if (recoverPassword.fulfilled.match(result)) {
            Alert.alert('Feito!!', result.payload); // Success message
        } else if (recoverPassword.rejected.match(result)) {
            Alert.alert('Erro', result.payload); // Error message
        }

    }

    const dismissKeyboard = () => {
        Keyboard.dismiss();
    };

    const handleShowPassword = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
        setShowPassword(!showPassword)
    }

    useLayoutEffect(() => {
        navigation.setOptions({
            headerShadowVisible: false, // applied here,
            title: ''
        })
    }, []);

    const handleBlur = () => {
        dispatch(clearError()); // Clear the Redux error
    };


    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0} // adjust for header if needed
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1, paddingTop: Platform.OS === 'ios' ? 30 : 0 }}
                    keyboardShouldPersistTaps="handled"

                >
                    <View style={styles.content}>
                        <View style={styles.shadowContainer}>
                            <Text style={styles.title}>Applicações</Text>
                        </View>
                        <TextInput
                            style={styles.input}
                            placeholder="Email"
                            placeholderTextColor="grey"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            onBlur={handleBlur} // Clear errors when the input loses focus

                            returnKeyType="next"
                        />
                        <View style={styles.iconCointainer}>
                            <TextInput
                                style={styles.inputIcon}
                                placeholder="Senha"
                                placeholderTextColor="grey"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={showPassword}
                                onBlur={handleBlur} // Clear errors when the input loses focus


                                returnKeyType="go"
                                onSubmitEditing={handleLogin}
                            />
                            <Ionicons
                                style={styles.icon}
                                name={!showPassword ? "eye" : "eye-off"}
                                color={"grey"}
                                size={24}
                                onPress={handleShowPassword}
                            />
                        </View>
                        <TouchableOpacity
                            style={[styles.button, isDisabled && styles.buttonDisabled]}
                            onPress={handleLogin}
                            disabled={isDisabled}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                                <Text style={styles.buttonText}>Entrar</Text>
                            )}
                        </TouchableOpacity>
                        {error && <Text style={styles.error}>{error}</Text>}
                        <TouchableOpacity
                            style={[styles.forgetPassContainer, isDisabledRecover && styles.buttonDisabledRecover]}
                            onPress={handleForgotPass}
                            disabled={isDisabledRecover}
                        >
                            <Text style={styles.forgetPassText}>Esqueci a Senha</Text>
                        </TouchableOpacity>
                        {!keyboardVisible && (
                            <View style={[styles.footer]}>
                                <View style={styles.shadowContainer}>
                                    <Image
                                        source={require("../assets/diamond.png")}
                                        style={styles.image}
                                    />
                                </View>
                                <Text style={{ color: "grey", opacity: 0.5, fontWeight: 'bold' }}>
                                    {expo.version}
                                </Text>
                            </View>
                        )}
                    </View>
                </ScrollView>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    footer: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 35 : 20,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    version: {
        color: 'grey',
        opacity: 0.5,
        fontWeight: 'bold',
    },
    shadowContainer: {
        shadowColor: "#000",  // Shadow color
        shadowOffset: { width: 3, height: 5 },  // Offset for drop shadow effect
        shadowOpacity: 0.4,  // Opacity of shadow
        shadowRadius: 4,  // Spread of shadow
        elevation: 8,  // Required for Android
        bottom: 0
    },
    content: {
        flex: 1,
        justifyContent: "center",
        padding: 20,
    },
    forgetPassContainer: {
        marginTop: 15
    },
    forgetPassText: {
        color: Colors.gold[500],
        textDecorationLine: 'underline',
        textAlign: 'center',
    },
    iconCointainer: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        paddingHorizontal: 10,
        marginBottom: 10,
    },
    titleContainer: {
        position: "absolute",
        bottom: 20,
        width: "100%",
        alignItems: "center",
    },
    image: {
        width: 50,
        height: 50,
        marginBottom: 10,
    },
    container: {
        flex: 1,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        color: 'whitesmoke',
        textAlign: 'center'
    },
    inputIcon: {
        flex: 1,
        height: 40,
        fontSize: 16,
        paddingHorizontal: 5,
        borderColor: 'gray',
        color: 'whitesmoke'
    },
    input: {
        height: 40,
        borderColor: "#ccc",
        borderWidth: 1,
        borderRadius: 5,
        marginBottom: 20,
        paddingHorizontal: 10,
        color: 'white'
    },
    error: {
        color: 'red',
        marginTop: 10,
    },
    button: {
        backgroundColor: '#007BFF', // Blue color
        padding: 15,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 30
    },
    buttonDisabled: {
        backgroundColor: Colors.secondary[300], // Lighter blue when disabled
        opacity: 0.5
    },
    buttonDisabledRecover: {
        color: Colors.gold[100], // Lighter blue when disabled
        opacity: 0.5
    },
    buttonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default LoginScreen;