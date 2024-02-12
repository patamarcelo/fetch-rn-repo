import { View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import { Colors } from "../constants/styles";

import HomeScreen from "../screens/HomeScreen";
import ProgramScreen from "../screens/ProgramScreen";

import IconButton from "../components/ui/IconButton";
import Ionicons from "@expo/vector-icons/Ionicons";

import { useNavigation } from "@react-navigation/native";
import MapStack from "./MapStack";

const Stack = createNativeStackNavigator();

const Tab = createBottomTabNavigator();

const HomeStack = () => {
	const navigation = useNavigation();

	return (
		<Tab.Navigator
			screenOptions={{
				headerStyle: { backgroundColor: Colors.primary[901] },
				headerTintColor: "white",
				contentStyle: { backgroundColor: Colors.primary100 },
				tabBarStyle: {
					backgroundColor: "transparent",
					elevation: 0,
					height: 90,
					paddingHorizontal: 5,
					paddingTop: 0,
					backgroundColor: Colors.primary[901],
					position: "absolute",
					borderTopWidth: 0
				}
			}}
		>
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
				name="Maps"
				component={MapStack}
				listeners={{
					tabPress: e => {
					  // Prevent default action
					  e.preventDefault();
				
					  //Any custom code here
					  navigation.navigate('MapsCreenStack')
					},
				}}
				options={{
					title: "Mapas",
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="map" color={color} size={size} />
					)
				}}
			/>
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
			
		</Tab.Navigator>
	);
};

export default HomeStack;
