import { createNativeStackNavigator } from "@react-navigation/native-stack";

const Stack = createNativeStackNavigator();

import { Colors } from "../constants/styles";
import IconButton from "../components/ui/IconButton";
import MapScreen from "../screens/MapScreen";

import { useRoute } from '@react-navigation/native';
import PlantioScreen from "../screens/Plantio";
import PlantioTalhoesDescription from "../screens/PlantioTalhoes";


import { StatusBar, Platform } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import FilterPlantioScreen from "../screens/FilterPlantio";

import { useSelector } from "react-redux";
import { selectColheitaDataToggle } from "../store/redux/selector";


const getPlantioTabMeta = (filters = {}) => {
    const selectedSafraCiclo = Array.isArray(filters?.safra_ciclo)
        ? filters.safra_ciclo[0]
        : "";

    const raw = String(selectedSafraCiclo || "").toLowerCase();

    if (raw.includes("plantio")) {
        return {
            title: "Plantio",
            icon: "leaf",
        };
    }

    if (raw.includes("colheita")) {
        return {
            title: "Colheita",
            icon: "scissors",
        };
    }

    return {
        title: "Colheita",
        icon: "leaf",
    };
};



const PlantioStack = () => {
    // const route = useRoute();
    // const newData =  route.params.data

    const filters = useSelector(selectColheitaDataToggle);
    const meta = getPlantioTabMeta(filters);
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: true, // Make sure the header is visible
                headerTintColor: "whitesmoke", // Header text color
                headerStyle: {
                    backgroundColor: Colors.primary800,
                    ...(Platform.OS === 'ios' && { headerBlurEffect: 'regular' }), // Avoids crash on Android
                },
                headerTitleStyle: {
                    // fontSize: 36, // Large title font size
                    fontWeight: 'bold', // You can change this as needed
                },
                // headerLargeTitle: true, // Enable large title for iOS
                headerTitleAlign: 'center', // Align title to the center
            }}
        >
            <Stack.Screen
                name="PlantioScreen"
                component={PlantioScreen}
                options={{
                    title: meta.title,
                }}
            />
            <Stack.Screen
                name="PlantioTalhoesScreen"
                component={PlantioTalhoesDescription}
                options={({ route, navigation }) => ({
                    title: route.params?.farm ? route.params.farm.replace('Projeto ', '') : 'Plantio Description',
                    ...(Platform.OS === 'ios' && { headerBlurEffect: 'regular' }),
                    headerTransparent: true,
                    headerLeft: () => (
                        <IconButton
                            icon="arrow-back"
                            color="whitesmoke"
                            size={24}
                            onPress={() => navigation.goBack()}
                        />
                    ),
                })}
            />
            <Stack.Screen
                name="FilterPlantioScreen"
                component={FilterPlantioScreen}
                options={({ navigation }) => ({
                    title: 'Filtros',
                    // headerShown: false,
                    headerLargeTitle: false,
                    headerLeft: () => (
                        <IconButton
                            icon="close"
                            color="whitesmoke"
                            size={24}
                            onPress={() => navigation.goBack()}
                        />
                    ),
                })}
            />

        </Stack.Navigator>
    );
};

export default PlantioStack;
