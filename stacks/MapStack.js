import { createNativeStackNavigator } from "@react-navigation/native-stack";

const Stack = createNativeStackNavigator();

import { Colors } from "../constants/styles";
import IconButton from "../components/ui/IconButton";
import MapScreen from "../screens/MapScreen";

const MapStack = () => {
	return (
		<Stack.Navigator
			screenOptions={{
				headerShown: false,
				// headerStyle: { backgroundColor: Colors.primary500 },
				headerTintColor: "white"
				// contentStyle: { backgroundColor: Colors.secondary[100] }
			}}
		>
			<Stack.Screen name="MapStackScreen" component={MapScreen} />
		</Stack.Navigator>
	);
};

export default MapStack;
