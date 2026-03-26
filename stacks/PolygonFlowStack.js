import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";
import { TouchableOpacity } from "react-native";
import { Colors } from "../constants/styles";

import PolygonManualScreen from "../screens/polygon/PolygonManualScreen";
import PolygonMapPickerScreen from "../screens/polygon/PolygonMapPickerScreen";
import PolygonTrackingScreen from "../screens/polygon/PolygonTrackingScreen";
import PolygonSavedListScreen from "../screens/polygon/PolygonSavedListScreen";

const Stack = createNativeStackNavigator();

function buildBackButton(navigation) {
	return (
		<TouchableOpacity
			onPress={() => navigation.goBack()}
			style={{ paddingHorizontal: 8, paddingVertical: 4 }}
			hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
		>
			<Ionicons name="arrow-back" size={24} color="whitesmoke" />
		</TouchableOpacity>
	);
}

const PolygonFlowStack = () => {
	return (
		<Stack.Navigator
			initialRouteName="PolygonManualScreen"
			screenOptions={{
				headerShown: true,
				headerStyle: { backgroundColor: Colors.primary[901] },
				headerTintColor: "whitesmoke",
				contentStyle: { backgroundColor: Colors.primary100 },
				headerTitleStyle: {
					fontWeight: "800",
				},
				headerBackTitleVisible: false,
			}}
		>
			<Stack.Screen
				name="PolygonManualScreen"
				component={PolygonManualScreen}
				options={({ navigation }) => ({
					title: "Ponto a ponto",
					headerLeft: () => buildBackButton(navigation),
				})}
			/>

			<Stack.Screen
				name="PolygonMapPickerScreen"
				component={PolygonMapPickerScreen}
				options={{
					headerShown: false,
				}}
			/>

			<Stack.Screen
				name="PolygonTrackingScreen"
				component={PolygonTrackingScreen}
				options={({ navigation }) => ({
					title: "Navegação automática",
					headerLeft: () => buildBackButton(navigation),
				})}
			/>

			<Stack.Screen
				name="PolygonSavedListScreen"
				component={PolygonSavedListScreen}
				options={({ navigation }) => ({
					title: "Polígonos salvos",
					headerLeft: () => buildBackButton(navigation),
				})}
			/>
		</Stack.Navigator>
	);
};

export default PolygonFlowStack;