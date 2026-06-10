import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { createNativeBottomTabNavigator } from "@react-navigation/bottom-tabs/unstable";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

import { Colors } from "../constants/styles";

import ProgramacoesStack from "./ProgramacoesStack";
import ProgramStack from "./ProgramStack";
import FarmBoxStack from "./FarmBoxStack";
import PlantioStack from "./PlantioStack";
import NavigationHomeScreen from "../screens/navigation/NavigationHomeScreen";

import { useSelector } from "react-redux";
import { selectColheitaDataToggle } from "../store/redux/selector";

const NativeTab = createNativeBottomTabNavigator();
const JsTab = createBottomTabNavigator();

const isIOS = Platform.OS === "ios";

const getPlantioTabMeta = (filters = {}) => {
	const selectedSafraCiclo = Array.isArray(filters?.safra_ciclo)
		? filters.safra_ciclo[0]
		: "";

	const raw = String(selectedSafraCiclo || "").toLowerCase();

	if (raw.includes("plantio")) {
		return {
			title: "Plantio",
			iosIcon: "leaf",
			androidIcon: "sprout",
			key: "plantio",
		};
	}

	if (raw.includes("colheita")) {
		return {
			title: "Colheita",
			iosIcon: "box.truck",
			androidIcon: "tractor",
			key: "colheita",
		};
	}

	return {
		title: "Colheita",
		iosIcon: "box.truck",
		androidIcon: "tractor",
		key: "colheita",
	};
};

const iosIcon = (name) => ({
	type: "sfSymbol",
	name,
});

const AndroidTabs = ({ plantioTabMeta }) => {
	const iconSize = 21;
	const insets = useSafeAreaInsets();

	const TAB_HEIGHT = 60;
	const bottomInset = Math.max(insets.bottom, 0);

	return (
		<JsTab.Navigator
			screenOptions={{
				headerShown: false,
				tabBarActiveTintColor: "#FFFFFF",
				tabBarInactiveTintColor: "rgba(255,255,255,0.62)",
				tabBarStyle: {
					backgroundColor: Colors.primary[901],
					borderTopWidth: 0,
					elevation: 0,

					// antes: height: 60
					height: TAB_HEIGHT + bottomInset,

					paddingTop: 5,

					// antes: paddingBottom: 6
					paddingBottom: bottomInset > 0 ? bottomInset + 6 : 8,
				},
				tabBarItemStyle: {
					paddingVertical: 2,
				},
				tabBarLabelStyle: {
					fontSize: 9,
					fontWeight: "600",
					marginTop: -2,
				},
			}}
		>
			<JsTab.Screen
				name="Next"
				component={ProgramStack}
				options={{
					title: "Programas",
					tabBarIcon: ({ color }) => (
						<Ionicons name="book" color={color} size={iconSize} />
					),
				}}
			/>

			<JsTab.Screen
				name="NavigationTab"
				component={NavigationHomeScreen}
				options={{
					title: "Navegação",
					tabBarIcon: ({ color }) => (
						<Ionicons name="navigate-outline" color={color} size={iconSize} />
					),
				}}
			/>

			<JsTab.Screen
				name="FarmBoxStackT"
				component={FarmBoxStack}
				options={{
					title: "FarmBox",
					tabBarIcon: ({ color }) => (
						<Ionicons name="hourglass-outline" color={color} size={iconSize} />
					),
				}}
			/>

			<JsTab.Screen
				name="Programações"
				component={ProgramacoesStack}
				options={{
					title: "Programações",
					tabBarIcon: ({ color }) => (
						<Ionicons name="timer" color={color} size={iconSize} />
					),
				}}
			/>

			<JsTab.Screen
				key={`plantio-colheita-${plantioTabMeta.key}`}
				name="Plantio / Colheita"
				component={PlantioStack}
				options={{
					title: plantioTabMeta.title,
					tabBarIcon: ({ color }) => (
						<MaterialCommunityIcons
							name={plantioTabMeta.androidIcon}
							color={color}
							size={iconSize}
						/>
					),
				}}
			/>
		</JsTab.Navigator>
	);
};

const IOSTabs = ({ plantioTabMeta }) => {
	return (
		<NativeTab.Navigator
			screenOptions={{
				tabBarActiveTintColor: Colors.primary[700],
				tabBarInactiveTintColor: "rgba(15,23,42,0.46)",
			}}
		>
			<NativeTab.Screen
				name="Next"
				component={ProgramStack}
				options={{
					title: "Programas",
					tabBarIcon: iosIcon("book"),
				}}
			/>

			<NativeTab.Screen
				name="NavigationTab"
				component={NavigationHomeScreen}
				options={{
					title: "Navegação",
					tabBarIcon: iosIcon("location"),
				}}
			/>

			<NativeTab.Screen
				name="FarmBoxStackT"
				component={FarmBoxStack}
				options={{
					title: "FarmBox",
					tabBarIcon: iosIcon("hourglass"),
				}}
			/>

			<NativeTab.Screen
				name="Programações"
				component={ProgramacoesStack}
				options={{
					title: "Programações",
					tabBarIcon: iosIcon("timer"),
				}}
			/>

			<NativeTab.Screen
				key={`plantio-colheita-${plantioTabMeta.key}`}
				name="Plantio / Colheita"
				component={PlantioStack}
				options={{
					title: plantioTabMeta.title,
					tabBarIcon: iosIcon(plantioTabMeta.iosIcon),
				}}
			/>
		</NativeTab.Navigator>
	);
};

const HomeStack = () => {
	const colheitaFilters = useSelector(selectColheitaDataToggle);
	const plantioTabMeta = getPlantioTabMeta(colheitaFilters);

	if (isIOS) {
		return <IOSTabs plantioTabMeta={plantioTabMeta} />;
	}

	return <AndroidTabs plantioTabMeta={plantioTabMeta} />;
};

export default HomeStack;