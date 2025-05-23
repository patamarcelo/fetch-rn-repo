import { View, Platform } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import { Colors } from "../constants/styles";

import HomeScreen from "../screens/HomeScreen";
import ProgramScreen from "../screens/ProgramScreen";

import IconButton from "../components/ui/IconButton";
import Ionicons from "@expo/vector-icons/Ionicons";

import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";


import { useNavigation } from "@react-navigation/native";
import MapStack from "./MapStack";
import FarmBoxStack from "./FarmBoxStack";
import PlantioStack from "./PlantioStack";

const Stack = createNativeStackNavigator();

const Tab = createBottomTabNavigator();

const HomeStack = () => {
	const navigation = useNavigation();

	return (
		<Tab.Navigator
			screenOptions={{
				headerStyle: { backgroundColor: Colors.primary[901] },
				// headerStyle: { backgroundColor: 'whitesmoke' },
				headerTintColor: "whitesmoke",
				contentStyle: { backgroundColor: Colors.primary100 },
				tabBarStyle: {
					backgroundColor: "transparent",
					elevation: 0,
					height: Platform.OS === "ios" ? 80 : 60, // 90 for iOS, 60 (default) for Android
					paddingHorizontal: 5,
					paddingTop: 0,
					backgroundColor: Colors.primary[901],
					position: "absolute",
					borderTopWidth: 0
				}
			}}
		>
			<Tab.Screen
				name="Next"
				component={ProgramScreen}
				options={{
					title: "Programas",
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="book" color={color} size={size} />
					)
				}}
			/>
			<Tab.Screen
				name="FarmBoxStackT"
				component={FarmBoxStack}
				// listeners={{
				// 	tabPress: (e) => {
				// 		// Prevent default action
				// 		e.preventDefault();

				// 		//Any custom code here
				// 		navigation.navigate("FarmBoxStack");
				// 	}
				// }}
				options={{
					title: "FarmBox",
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="hourglass-outline" color={color} size={size} />
					)
				}}
			/>
			{/* <Tab.Screen
				name="Kmls"
				component={MapStack}
				listeners={{
					tabPress: (e) => {
						// Prevent default action
						e.preventDefault();

						//Any custom code here
						navigation.navigate("MapsCreenStack");
					}
				}}
				options={{
					title: "KML",
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="map" color={color} size={size} />
					)
				}}
			/> */}
			<Tab.Screen
				name="Programações"
				component={HomeScreen}
				options={{
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="timer" color={color} size={size} />
					)
				}}
			/>
			<Tab.Screen
				name="Plantio / Colheita"
				component={PlantioStack}
				options={{
					tabBarIcon: ({ color, size }) => (
						<MaterialCommunityIcons name="sprout" color={color} size={size} />
					),
					headerTitle: 'Colheita',
					title: 'Colheita',
					headerShown: false
				}}
			/>
		</Tab.Navigator>
	);
};

export default HomeStack;
