import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Platform } from "react-native";

import ProgramScreen from "../screens/ProgramScreen";
import { Colors } from "../constants/styles";

const Stack = createNativeStackNavigator();

const ProgramStack = () => {
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
				name="ProgramScreen"
				component={ProgramScreen}
				options={{
					title: "Programas",
				}}
			/>
		</Stack.Navigator>
	);
};

export default ProgramStack;