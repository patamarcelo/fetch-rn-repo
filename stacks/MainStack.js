import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { Colors } from "../constants/styles";

import AppDrawer from "./AppDrawer";
import FarmsScreen from "../screens/FarmsScreen";
import MapStack from "./MapStack";
import PolygonFlowStack from "./PolygonFlowStack";
import NavigationMapScreen from "../screens/navigation/NavigationMapScreen";
import FarmBoxFlowStack from "./FarmBoxFlowStack";

const Stack = createNativeStackNavigator();

const MainStack = () => {
	return (
		<Stack.Navigator
			id="MainStack"
			screenOptions={{
				headerShown: false,
				headerTintColor: "white",
			}}
		>
			<Stack.Screen
				name="HomeStackScreen"
				component={AppDrawer}
			/>

			<Stack.Screen
				name="FarmsScren"
				component={FarmsScreen}
				options={{
					presentation: "fullScreenModal",
					headerShown: false,
					contentStyle: {
						backgroundColor: Colors.primary[901],
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

			<Stack.Screen
				name="FarmBoxFlowStack"
				component={FarmBoxFlowStack}
				options={{
					headerShown: false,
					presentation: "card",
					contentStyle: {
						backgroundColor: Colors.secondary[100],
					},
				}}
			/>
		</Stack.Navigator>
	);
};

export default MainStack;