import { createNativeStackNavigator } from "@react-navigation/native-stack";

import MachineryScreen from "../screens/MachineryScreen";
import MachineDetailScreen from "../screens/machine/MachineDetailScreen";

// Futuras telas:
import MachineHourmeterFormScreen from "../screens/machine/MachineHourmeterFormScreen";
import MachineTransferFarmScreen from "../screens/machine/MachineTransferFarmScreen";

import MachineMaintenanceFormScreen from "../screens/machine/MachineMaintenanceFormScreen";

import MachineReadingsHistoryScreen from "../screens/machine/MachineReadingsHistoryScreen";
import MachineMaintenanceHistoryScreen from "../screens/machine/MachineMaintenanceHistoryScreen";

import MachineFiltersScreen from "../screens/machine/MachineFiltersScreen";
import MachineStatusFormScreen from "../screens/machine/MachineStatusFormScreen";

const Stack = createNativeStackNavigator();

const MachineStack = () => {
	return (
		<Stack.Navigator
			screenOptions={{
				headerShown: false,
			}}
		>
			<Stack.Screen
				name="MachineryScreen"
				component={MachineryScreen}
			/>

			<Stack.Screen
				name="MachineDetailScreen"
				component={MachineDetailScreen}
			/>


			<Stack.Screen
				name="MachineHourmeterFormScreen"
				component={MachineHourmeterFormScreen}
			/>

			<Stack.Screen
				name="MachineTransferFarmScreen"
				component={MachineTransferFarmScreen}
			/>

			<Stack.Screen
				name="MachineMaintenanceFormScreen"
				component={MachineMaintenanceFormScreen}
			/>


			<Stack.Screen
				name="MachineReadingsHistoryScreen"
				component={MachineReadingsHistoryScreen}
			/>

			<Stack.Screen
				name="MachineMaintenanceHistoryScreen"
				component={MachineMaintenanceHistoryScreen}
			/>

			<Stack.Screen
				name="MachineFiltersScreen"
				component={MachineFiltersScreen}
			/>


			<Stack.Screen
				name="MachineStatusFormScreen"
				component={MachineStatusFormScreen}
			/>

		</Stack.Navigator>
	);
};

export default MachineStack;