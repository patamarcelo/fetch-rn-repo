import { createNativeStackNavigator } from "@react-navigation/native-stack";

const Stack = createNativeStackNavigator();

import { Colors } from "../constants/styles";
import IconButton from "../components/ui/IconButton";
import MapScreen from "../screens/MapScreen";

import { useRoute } from '@react-navigation/native';
import PlantioScreen from "../screens/Plantio";


const PlantioStack = () => {
    // const route = useRoute();
    // const newData =  route.params.data
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false, // Make sure the header is visible
                // headerTintColor: "white", // Header text color
                // headerStyle: {
                //     backgroundColor: '#1E90FF', // Background color for header (example)
                // },
                // headerTitleStyle: {
                //     fontSize: 36, // Large title font size
                //     fontWeight: 'bold', // You can change this as needed
                // },
                // headerLargeTitle: true, // Enable large title for iOS
                // headerTitleAlign: 'center', // Align title to the center
            }}
        >
            <Stack.Screen
                name="PlantioScreen"
                component={PlantioScreen}
                options={{
                    title: 'Plantio', // Title to show in the header
                }}
            />

        </Stack.Navigator>
    );
};

export default PlantioStack;
