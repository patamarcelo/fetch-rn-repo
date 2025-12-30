import { createNativeStackNavigator } from "@react-navigation/native-stack";

const Stack = createNativeStackNavigator();

import { Colors } from "../constants/styles";
import IconButton from "../components/ui/IconButton";
import MapScreen from "../screens/MapScreen";

import { useRoute } from '@react-navigation/native';


const MapStack = () => {

	const route = useRoute();
	const { data, selectedParcelas = [] } = route?.params || {};

	
	return (
		<Stack.Navigator
			screenOptions={{
				headerShown: false,
				// headerStyle: { backgroundColor: Colors.primary500 },
				headerTintColor: "white"
				// contentStyle: { backgroundColor: Colors.secondary[100] }
			}}
		>
			<Stack.Screen 
			name="MapStackScreen"
			component={MapScreen} 
			initialParams={{ data: data, selectedParcelas }}  // Pass data as initialParams
			/>
		</Stack.Navigator>
	);
};

export default MapStack;
