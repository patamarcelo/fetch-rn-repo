import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { Colors } from "../constants/styles";
import FarmBoxScreen from "../screens/FarmBoxScreen";

const Stack = createNativeStackNavigator();

const FarmBoxStack = () => {
	return (
		<Stack.Navigator
			screenOptions={{
				headerShown: true,
				headerTintColor: "whitesmoke",
				headerStyle: {
					backgroundColor: Colors.primary[901],
				},
				headerTitleStyle: {
					fontWeight: "bold",
				},
				headerTitleAlign: "center",
			}}
		>
			<Stack.Screen
				name="FarmBoxStack"
				component={FarmBoxScreen}
				options={{
					title: "FarmBox",
				}}
			/>
		</Stack.Navigator>
	);
};

export default FarmBoxStack;