import { createNativeStackNavigator } from "@react-navigation/native-stack";

const Stack = createNativeStackNavigator();

import { Colors } from "../constants/styles";
import IconButton from "../components/ui/IconButton";

import FarmBoxScreen from "../screens/FarmBoxScreen";
import CardFarmBox from "../components/FarmBox/CardFarmBox";
import FilterModalApps from "../components/FarmBox/FilterModalApps";

import { TouchableOpacity } from 'react-native'; // For touchable button functionality
import MaterialIcons from 'react-native-vector-icons/MaterialIcons'; // For Material Design icons

import { useRoute } from '@react-navigation/native';

const FarmBoxStack = () => {

	const route = useRoute();
	const data = route?.params?.data
	const farm = route?.params?.farm
	return (
		<Stack.Navigator

			screenOptions={{
				headerShown: false,
				// headerStyle: { backgroundColor: Colors.primary500 },
				headerTintColor: "white"
				// contentStyle: { backgroundColor: Colors.secondary[100] }
			}}
		>
			<Stack.Screen name="FarmBoxStack" component={FarmBoxScreen} />
			<Stack.Screen name="FarmBoxFarms" component={CardFarmBox} />
			<Stack.Screen name="FarmBoxFilterApps" component={FilterModalApps}
				options={{
					presentation: 'modal'
				}}
				initialParams={{ data: data, farm: farm }}  // Pass data as initialParams
			/>
		</Stack.Navigator>
	);
};

export default FarmBoxStack;
