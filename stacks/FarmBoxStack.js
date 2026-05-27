import { createNativeStackNavigator } from "@react-navigation/native-stack";

const Stack = createNativeStackNavigator();

import { Colors } from "../constants/styles";

import FarmBoxScreen from "../screens/FarmBoxScreen";
import CardFarmBox from "../components/FarmBox/CardFarmBox";
import FilterModalApps from "../components/FarmBox/FilterModalApps";

import { useRoute } from "@react-navigation/native";

const FarmBoxStack = () => {
	const route = useRoute();
	const data = route?.params?.data;
	const farm = route?.params?.farm;

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
				name="FarmBoxStack"
				component={FarmBoxScreen}
				options={{
					title: "FarmBox",
				}}
			/>

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
					title: "Filtros",
					presentation: "modal",
				}}
				initialParams={{ data: data, farm: farm }}
			/>
		</Stack.Navigator>
	);
};

export default FarmBoxStack;