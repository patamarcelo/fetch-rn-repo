import { Platform } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import { Colors } from "../constants/styles";

import HomeScreen from "../screens/HomeScreen";
import ProgramScreen from "../screens/ProgramScreen";
import PolygonHomeScreen from "../screens/polygon/PolygonHomeScreen";

import Ionicons from "@expo/vector-icons/Ionicons";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import FarmBoxStack from "./FarmBoxStack";
import PlantioStack from "./PlantioStack";
import NavigationHomeScreen from "../screens/navigation/NavigationHomeScreen";

const Tab = createBottomTabNavigator();

const HomeStack = () => {
	return (
		<Tab.Navigator
			screenOptions={{
				headerStyle: { backgroundColor: Colors.primary[901] },
				headerTintColor: "whitesmoke",
				contentStyle: { backgroundColor: Colors.primary100 },
				tabBarStyle: {
					backgroundColor: Colors.primary[901],
					elevation: 0,
					height: Platform.OS === "ios" ? 80 : 60,
					paddingHorizontal: 5,
					paddingTop: 0,
					position: "absolute",
					borderTopWidth: 0,
				},
			}}
		>
			<Tab.Screen
				name="Next"
				component={ProgramScreen}
				options={{
					title: "Programas",
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="book" color={color} size={size} />
					),
				}}
			/>
			
			<Tab.Screen
				name="NavigationTab"
				component={NavigationHomeScreen}
				options={{
					title: "Navegação",
					headerShown: false,
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="navigate-outline" color={color} size={size} />
					),
				}}
			/>

			<Tab.Screen
				name="FarmBoxStackT"
				component={FarmBoxStack}
				options={{
					title: "FarmBox",
					// headerShown: false,
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="hourglass-outline" color={color} size={size} />
					),
				}}
			/>

			<Tab.Screen
				name="Programações"
				component={HomeScreen}
				options={{
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="timer" color={color} size={size} />
					),
				}}
			/>

			<Tab.Screen
				name="PoligonosTab"
				component={PolygonHomeScreen}
				options={{
					title: "Polígonos",
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="map" color={color} size={size} />
					),
				}}
			/>

			<Tab.Screen
				name="Plantio / Colheita"
				component={PlantioStack}
				options={{
					tabBarIcon: ({ color, size }) => (
						<MaterialCommunityIcons name="sprout" color={color} size={size} />
					),
					headerTitle: "Colheita",
					title: "Colheita",
					headerShown: false,
				}}
			/>
		</Tab.Navigator>
	);
};

export default HomeStack;