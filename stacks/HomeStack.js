import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import { Colors } from "../constants/styles";

import HomeScreen from "../screens/HomeScreen";
import NextScreen from "../screens/NextScreen";

import IconButton from "../components/ui/IconButton";
import Ionicons from "@expo/vector-icons/Ionicons";

const Stack = createNativeStackNavigator();

const Tab = createBottomTabNavigator();

const HomeStack = () => {
	const handlerLogout = () => {
		console.log("logout");
	};
	return (
		<Tab.Navigator
			screenOptions={{
				headerStyle: { backgroundColor: Colors.primary500 },
				headerTintColor: "white",
				contentStyle: { backgroundColor: Colors.primary100 },
				tabBarStyle: {
					backgroundColor: "transparent",
					elevation: 0,
					height: 90,
					paddingHorizontal: 5,
					paddingTop: 0,
					backgroundColor: Colors.primary100,
					position: "absolute",
					borderTopWidth: 0
				}
			}}
		>
			<Tab.Screen
				name="Home"
				component={HomeScreen}
				options={{
					title: "Home Page",
					tabBarLabel: "Home",
					// headerRight: ({ tintColor }) => (
					// 	<IconButton
					// 		type={"awesome"}
					// 		icon="power-off"
					// 		color={tintColor}
					// 		size={22}
					// 		onPress={handlerLogout}
					// 		btnStyles={{ marginRight: 15, marginTop: 0 }}
					// 	/>
					// ),
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="home" color={color} size={size} />
					)
				}}
			/>
			<Tab.Screen
				name="Next"
				component={NextScreen}
				options={{
					title: "Home Page",
					tabBarLabel: "Home",
					headerRight: ({ tintColor }) => (
						<IconButton
							type={"awesome"}
							icon="power-off"
							color={tintColor}
							size={22}
							onPress={handlerLogout}
							btnStyles={{ marginRight: 15, marginTop: 0 }}
						/>
					),
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="car" color={color} size={size} />
					)
				}}
			/>
		</Tab.Navigator>
	);
};

export default HomeStack;
