import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from "../screens/LoginScreen"

import { Colors } from '../constants/styles';

const Stack = createStackNavigator();

const LoginStack = () => {
    return (
        <Stack.Navigator
        screenOptions={{
            cardStyle: { backgroundColor: Colors.primary[900] }, // Background color for all screens
        }}
        >
            <Stack.Screen 
                name="Login" 
                component={LoginScreen} 
                options={{
                    headerStyle: {
                        backgroundColor: Colors.primary[900], // Header background color
                    },
                    headerTintColor: '#fff', // Header text color
                }}
            />
        </Stack.Navigator>
    );
};

export default LoginStack;