import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { Colors } from "../constants/styles";

import CardFarmBox from "../components/FarmBox/CardFarmBox";
import FilterModalApps from "../components/FarmBox/FilterModalApps";

const Stack = createNativeStackNavigator();

const FarmBoxFlowStack = () => {
	return (
		<Stack.Navigator
			initialRouteName="FarmBoxFarms"
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
				contentStyle: {
					backgroundColor: Colors.secondary[100],
				},
			}}
		>
			<Stack.Screen
				name="FarmBoxFarms"
				component={CardFarmBox}
				options={({ route }) => ({
					title: route.params?.farm
						? route.params.farm.replace("Fazenda ", "")
						: "Aplicações",
				})}
			/>

			<Stack.Screen
				name="FarmBoxFilterApps"
				component={FilterModalApps}
				options={{
					headerShown: false,
					presentation: "fullScreenModal",
					animation: "slide_from_bottom",
					statusBarStyle: "dark",
					statusBarColor: Colors.secondary[100],
					navigationBarColor: Colors.secondary[100],
					contentStyle: {
						backgroundColor: Colors.secondary[100],
					},
				}}
			/>
		</Stack.Navigator>
	);
};

export default FarmBoxFlowStack;