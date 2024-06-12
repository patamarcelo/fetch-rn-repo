import { createNativeStackNavigator } from "@react-navigation/native-stack";

const Stack = createNativeStackNavigator();

import { Colors } from "../constants/styles";
import IconButton from "../components/ui/IconButton";

import FarmBoxScreen from "../screens/FarmBoxScreen";

const FarmBoxStack = () => {
	return (
		<Stack.Navigator
			screenOptions={{
				headerShown: false,
				// headerStyle: { backgroundColor: Colors.primary500 },
				headerTintColor: "white"
				// contentStyle: { backgroundColor: Colors.secondary[100] }
			}}
		>
			<Stack.Screen name="FarmBoxStack" component={FarmBoxScreen} />
		</Stack.Navigator>
	);
};

export default FarmBoxStack;
