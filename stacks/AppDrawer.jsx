import React from "react";
import {
	View,
	Text,
	StyleSheet,
	Pressable,
	Image,
	StatusBar,
} from "react-native";
import {
	createDrawerNavigator,
	DrawerContentScrollView,
} from "@react-navigation/drawer";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { useDispatch } from "react-redux";

import HomeStack from "./HomeStack";
import PolygonHomeScreen from "../screens/polygon/PolygonHomeScreen";
import MachineryScreen from "../screens/MachineryScreen";

import { logout } from "../store/redux/authSlice";
import { Colors } from "../constants/styles";

import diamanteLogo from "../assets/diamond.png";

const Drawer = createDrawerNavigator();

const DrawerItem = ({ label, icon, iconType = "ion", focused, onPress }) => {
	const Icon = iconType === "fa5" ? FontAwesome5 : Ionicons;

	return (
		<Pressable
			onPress={onPress}
			style={({ pressed }) => [
				styles.drawerItem,
				focused && styles.drawerItemActive,
				pressed && styles.pressed,
			]}
		>
			<View style={[styles.drawerIconBox, focused && styles.drawerIconBoxActive]}>
				<Icon
					name={icon}
					size={16}
					color={focused ? "#FFFFFF" : "rgba(255,255,255,0.72)"}
				/>
			</View>

			<Text style={[styles.drawerItemText, focused && styles.drawerItemTextActive]}>
				{label}
			</Text>
		</Pressable>
	);
};

const CustomDrawerContent = (props) => {
	const dispatch = useDispatch();
	const currentRouteName = props.state.routeNames[props.state.index];

	const goTo = (routeName) => {
		props.navigation.navigate(routeName);
		props.navigation.closeDrawer();
	};

	const handleLogout = () => {
		dispatch(logout());
	};

	return (
		<SafeAreaView style={styles.drawerRoot} edges={["top", "bottom"]}>
			<StatusBar barStyle="light-content" />

			<DrawerContentScrollView
				{...props}
				contentContainerStyle={styles.drawerScroll}
				showsVerticalScrollIndicator={false}
			>
				<View style={styles.drawerHeader}>
					<View style={styles.brandLogoBox}>
						<Image
							source={diamanteLogo}
							style={styles.brandLogo}
							resizeMode="contain"
						/>
					</View>

					<View style={styles.brandTextBox}>
						<Text style={styles.brandTitle}>Diamante</Text>
						<Text style={styles.brandSubtitle}>Aplicações agrícolas</Text>
					</View>
				</View>

				<View style={styles.drawerSection}>
					<Text style={styles.drawerSectionTitle}>Menu</Text>

					<DrawerItem
						label="Início"
						icon="grid-outline"
						focused={currentRouteName === "HomeTabs"}
						onPress={() => goTo("HomeTabs")}
					/>

					<DrawerItem
						label="Polígonos"
						icon="map"
						iconType="fa5"
						focused={currentRouteName === "PolygonHomeDrawer"}
						onPress={() => goTo("PolygonHomeDrawer")}
					/>

					<DrawerItem
						label="Maquinário"
						icon="tractor"
						iconType="fa5"
						focused={currentRouteName === "MachineryScreen"}
						onPress={() => goTo("MachineryScreen")}
					/>
				</View>
			</DrawerContentScrollView>

			<View style={styles.drawerFooter}>
				<Pressable
					onPress={handleLogout}
					style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed]}
				>
					<Ionicons name="log-out-outline" size={18} color="#FFFFFF" />
					<Text style={styles.logoutText}>Sair do app</Text>
				</Pressable>
			</View>
		</SafeAreaView>
	);
};

const buildBackToHomeButton = (navigation) => {
	return (
		<Pressable
			onPress={() => navigation.navigate("HomeTabs")}
			style={({ pressed }) => [styles.headerIconButton, pressed && styles.pressed]}
			hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
		>
			<Ionicons name="arrow-back" size={24} color="whitesmoke" />
		</Pressable>
	);
};

const buildDrawerButton = (navigation) => {
	return (
		<Pressable
			onPress={() => navigation.openDrawer()}
			style={({ pressed }) => [styles.headerIconButtonRight, pressed && styles.pressed]}
			hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
		>
			<Ionicons name="menu" size={26} color="whitesmoke" />
		</Pressable>
	);
};

const AppDrawer = () => {
	return (
		<Drawer.Navigator
			id="AppDrawer"
			drawerContent={(props) => <CustomDrawerContent {...props} />}
			screenOptions={{
				headerShown: false,
				drawerType: "front",
				overlayColor: "rgba(0,0,0,0.42)",
				drawerStyle: {
					width: 292,
					backgroundColor: Colors.drawerBg,
				},
				sceneStyle: {
					backgroundColor: "#D6E3F3",
				},
			}}
		>
			<Drawer.Screen name="HomeTabs" component={HomeStack} />

			<Drawer.Screen
				name="PolygonHomeDrawer"
				component={PolygonHomeScreen}
				options={({ navigation }) => ({
					headerShown: true,
					title: "Polígonos",
					headerStyle: {
						backgroundColor: Colors.primary[901],
					},
					headerTintColor: "whitesmoke",
					headerTitleStyle: {
						fontWeight: "900",
					},
					headerLeft: () => buildBackToHomeButton(navigation),
					headerRight: () => buildDrawerButton(navigation),
				})}
			/>

			<Drawer.Screen
				name="MachineryScreen"
				component={MachineryScreen}
				options={({ navigation }) => ({
					headerShown: true,
					title: "Maquinário",
					headerStyle: {
						backgroundColor: Colors.primary[901],
					},
					headerTintColor: "whitesmoke",
					headerTitleStyle: {
						fontWeight: "900",
					},
					headerLeft: () => buildBackToHomeButton(navigation),
					headerRight: () => buildDrawerButton(navigation),
				})}
			/>
		</Drawer.Navigator>
	);
};

const styles = StyleSheet.create({
	drawerRoot: {
		flex: 1,
		backgroundColor: Colors.drawerBg,
	},

	drawerScroll: {
		paddingTop: 12,
		paddingHorizontal: 14,
	},

	drawerHeader: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		paddingHorizontal: 4,
		paddingTop: 10,
		paddingBottom: 24,
	},

	brandLogoBox: {
		width: 48,
		height: 48,
		borderRadius: 17,
		// backgroundColor: "rgba(255,255,255,0.10)",
		alignItems: "center",
		justifyContent: "center",
		// borderWidth: 1,
		// borderColor: "rgba(255,255,255,0.14)",
	},

	brandLogo: {
		width: 34,
		height: 34,
	},

	brandTextBox: {
		flex: 1,
	},

	brandTitle: {
		color: "#FFFFFF",
		fontSize: 17,
		fontWeight: "900",
	},

	brandSubtitle: {
		marginTop: 1,
		color: "rgba(255,255,255,0.62)",
		fontSize: 11,
		fontWeight: "700",
	},

	drawerSection: {
		gap: 8,
	},

	drawerSectionTitle: {
		marginBottom: 2,
		paddingHorizontal: 6,
		color: "rgba(255,255,255,0.42)",
		fontSize: 10,
		fontWeight: "900",
		textTransform: "uppercase",
		letterSpacing: 0.8,
	},

	drawerItem: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		paddingHorizontal: 10,
		paddingVertical: 10,
		borderRadius: 18,
	},

	drawerItemActive: {
		backgroundColor: "rgba(255,255,255,0.12)",
	},

	drawerIconBox: {
		width: 32,
		height: 32,
		borderRadius: 12,
		backgroundColor: "rgba(255,255,255,0.08)",
		alignItems: "center",
		justifyContent: "center",
	},

	drawerIconBoxActive: {
		backgroundColor: Colors.primary[700],
	},

	drawerItemText: {
		color: "rgba(255,255,255,0.72)",
		fontSize: 13,
		fontWeight: "900",
	},

	drawerItemTextActive: {
		color: "#FFFFFF",
	},

	drawerFooter: {
		paddingHorizontal: 14,
		paddingTop: 14,
		paddingBottom: 10,
		borderTopWidth: 1,
		borderTopColor: "rgba(255,255,255,0.10)",
	},

	logoutButton: {
		height: 46,
		borderRadius: 16,
		backgroundColor: "#B42318",
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.14)",
	},

	logoutText: {
		color: "#FFFFFF",
		fontSize: 13,
		fontWeight: "900",
	},

	headerIconButton: {
		marginLeft: 14,
		width: 38,
		height: 38,
		borderRadius: 19,
		alignItems: "center",
		justifyContent: "center",
	},

	headerIconButtonRight: {
		marginRight: 14,
		width: 38,
		height: 38,
		borderRadius: 19,
		alignItems: "center",
		justifyContent: "center",
	},

	pressed: {
		opacity: 0.75,
	},
});

export default AppDrawer;