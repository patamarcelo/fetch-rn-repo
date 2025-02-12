import { createNativeStackNavigator } from "@react-navigation/native-stack";

const Stack = createNativeStackNavigator();

import { Colors } from "../constants/styles";
import IconButton from "../components/ui/IconButton";
import MapScreen from "../screens/MapScreen";

import { useRoute } from '@react-navigation/native';
import PlantioScreen from "../screens/Plantio";
import PlantioTalhoesDescription from "../screens/PlantioTalhoes";


import { StatusBar } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";

const PlantioStack = () => {
    // const route = useRoute();
    // const newData =  route.params.data
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: true, // Make sure the header is visible
                headerTintColor: "whitesmoke", // Header text color
                headerStyle: {
                    headerBlurEffect: 'regular',
                    headerTransparent: true,
                    backgroundColor: Colors.primary800
                },
                headerTitleStyle: {
                    // fontSize: 36, // Large title font size
                    fontWeight: 'bold', // You can change this as needed
                },
                headerLargeTitle: true, // Enable large title for iOS
                headerTitleAlign: 'center', // Align title to the center
            }}
        >
            <Stack.Screen
                name="PlantioScreen"
                component={PlantioScreen}
                options={{
                    title: 'Colheitas', // Title to show in the header
                }}
            />
            <Stack.Screen
                name="PlantioTalhoesScreen"
                component={PlantioTalhoesDescription}
                options={({ route }) => ({
                    title: route.params?.farm ? route.params.farm.replace('Projeto ', '') : 'PlantioDescription',
                    headerBlurEffect: 'regular',
                    headerTransparent: true,
                    // headerSearchBarOptions:{
                    //     placeholder: 'teste buscar',
                    //     // hideWhenScrolling: false
                    // }
                })}
            />

        </Stack.Navigator>
    );
};

export default PlantioStack;
