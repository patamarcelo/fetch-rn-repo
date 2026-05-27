import { createNativeStackNavigator } from "@react-navigation/native-stack";

import HomeScreen from "../screens/HomeScreen";
import { Colors } from "../constants/styles";

const Stack = createNativeStackNavigator();

const ProgramacoesStack = () => {
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
				name="ProgramacoesHome"
				component={HomeScreen}
				options={{
					title: "Programações",
				}}
			/>
		</Stack.Navigator>
	);
};

export default ProgramacoesStack;