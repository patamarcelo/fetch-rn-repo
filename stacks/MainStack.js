import { createNativeStackNavigator } from "@react-navigation/native-stack";

const Stack = createNativeStackNavigator();
import { Colors } from "../constants/styles";

import HomeStack from "./HomeStack";
import FarmsScreen from "../screens/FarmsScreen";
import MapStack from "./MapStack";
import PolygonFlowStack from "./PolygonFlowStack";
import NavigationMapScreen from "../screens/navigation/NavigationMapScreen";

const MainStack = () => {
	return (
		<Stack.Navigator
			id="MainStack"
			screenOptions={{
				headerShown: false,
				headerTintColor: "white",
			}}
		>
			<Stack.Screen name="HomeStackScreen" component={HomeStack} />

			<Stack.Screen
				name="FarmsScren"
				component={FarmsScreen}
				options={{
					presentation: "modal",
					title: "Redefinir a Senha",
					contentStyle: {
						backgroundColor: Colors.primary[901],
						height: "70%",
					},
					cardStyle: {
						height: "10%",
					},
				}}
			/>

			<Stack.Screen
				name="MapsCreenStack"
				component={MapStack}
				options={{
					presentation: "card",
				}}
			/>

			<Stack.Screen
				name="PolygonFlowStackScreen"
				component={PolygonFlowStack}
				options={{
					presentation: "card",
				}}
			/>

			<Stack.Screen
				name="NavigationMapScreen"
				component={NavigationMapScreen}
				options={{
					presentation: "card",
					headerShown: false,
				}}
			/>
		</Stack.Navigator>
	);
};

export default MainStack;