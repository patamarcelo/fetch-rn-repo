import { createNativeStackNavigator } from "@react-navigation/native-stack";

const Stack = createNativeStackNavigator();
import { Colors } from "../constants/styles";
import IconButton from "../components/ui/IconButton";

import HomeStack from "./HomeStack";
import FarmsScreen from "../screens/FarmsScreen";

const MainStack = () => {
	const handlerLogout = () => {
		console.log("handler Logout");
	};
	return (
		<Stack.Navigator
			screenOptions={{
				headerShown: false,
				// headerStyle: { backgroundColor: Colors.primary500 },
				headerTintColor: "white"
				// contentStyle: { backgroundColor: Colors.secondary[100] }
			}}
		>
			<Stack.Screen name="HomeStackScreen" component={HomeStack} />
			<Stack.Screen
				name="FarmsScren"
				component={FarmsScreen}
				options={{
					// headerShown: true,
					presentation: "modal",
					title: "Redefinir a Senha",
					contentStyle: {
						backgroundColor: Colors.primary[901],
						height: "70%"
					},
					cardStyle: {
						height: "10%"
					}
				}}
			/>
		</Stack.Navigator>
	);
};

export default MainStack;
