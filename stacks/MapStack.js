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
			id="MapStack"
			screenOptions={{
				headerShown: false,
				headerTintColor: "white",
			}}
		>
			<Stack.Screen
				name="MapStackScreen"
				component={MapScreen}
				initialParams={{ data, selectedParcelas }}
			/>
		</Stack.Navigator>
	);
};

export default MapStack;
