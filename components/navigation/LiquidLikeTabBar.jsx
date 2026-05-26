import React from "react";
import {
	View,
	Text,
	Pressable,
	StyleSheet,
	Platform,
} from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { Colors } from "../../constants/styles";
import * as Haptics from "expo-haptics";

const getIcon = (routeName, focused, color, size) => {
	if (routeName === "Next") {
		return <Ionicons name={focused ? "book" : "book-outline"} color={color} size={size} />;
	}

	if (routeName === "NavigationTab") {
		return <Ionicons name="navigate-outline" color={color} size={size} />;
	}

	if (routeName === "FarmBoxStackT") {
		return <Ionicons name="hourglass-outline" color={color} size={size} />;
	}

	if (routeName === "Programações") {
		return <Ionicons name={focused ? "timer" : "timer-outline"} color={color} size={size} />;
	}

	if (routeName === "Plantio / Colheita") {
		return <MaterialCommunityIcons name="sprout" color={color} size={size} />;
	}

	return <Ionicons name="ellipse-outline" color={color} size={size} />;
};

const getLabel = (route) => {
	if (route.name === "Next") return "Programas";
	if (route.name === "NavigationTab") return "Navegação";
	if (route.name === "FarmBoxStackT") return "FarmBox";
	if (route.name === "Programações") return "Programações";
	if (route.name === "Plantio / Colheita") return "Colheita";

	return route.name;
};

const LiquidLikeTabBar = ({ state, descriptors, navigation }) => {
	const insets = useSafeAreaInsets();

	return (
		<View
			pointerEvents="box-none"
			style={[
				styles.wrapper,
				{
					paddingBottom: Platform.OS === "ios" ? 18 : 18,
				},
			]}
		>
			<View style={styles.shadowLayer}>
				<View style={styles.barClip}>
					{Platform.OS === "ios" ? (
						<BlurView
							tint="light"
							intensity={96}
							style={StyleSheet.absoluteFillObject}
						/>
					) : (
						<View style={styles.androidBg} />
					)}

					<View style={styles.glassOverlay} />

					<View style={styles.itemsRow}>
						{state.routes.map((route, index) => {
							const focused = state.index === index;
							const { options } = descriptors[route.key];

							const onPress = async () => {
								if (!focused) {
									Haptics.selectionAsync();
								}

								const event = navigation.emit({
									type: "tabPress",
									target: route.key,
									canPreventDefault: true,
								});

								if (!focused && !event.defaultPrevented) {
									navigation.navigate(route.name);
								}
							};

							const color = focused ? Colors.primary[800] : "rgba(15,23,42,0.48)";

							return (
								<Pressable
									key={route.key}
									accessibilityRole="button"
									accessibilityState={focused ? { selected: true } : {}}
									accessibilityLabel={options.tabBarAccessibilityLabel}
									onPress={onPress}
									style={({ pressed }) => [
										styles.item,
										pressed && styles.itemPressed,
									]}
								>
									<View style={[styles.iconPill, focused && styles.iconPillActive]}>
										{getIcon(route.name, focused, color, focused ? 23 : 22)}
									</View>

									<Text
										numberOfLines={1}
										style={[
											styles.label,
											focused && styles.labelActive,
										]}
									>
										{getLabel(route)}
									</Text>
								</Pressable>
							);
						})}
					</View>
				</View>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	wrapper: {
		position: "absolute",
		left: 0,
		right: 0,
		bottom: 0,
		alignItems: "center",
		paddingHorizontal: 12,
	},

	shadowLayer: {
		width: "100%",
		maxWidth: 620,
		borderRadius: 34,
		backgroundColor: "rgba(255,255,255,0.44)",
		shadowColor: "#000",
		shadowOpacity: Platform.OS === "ios" ? 0.14 : 0,
		shadowRadius: 32,
		shadowOffset: { width: 0, height: 18 },
		elevation: Platform.OS === "android" ? 12 : 0,
	},

	barClip: {
		height: Platform.OS === "ios" ? 84 : 72,
		borderRadius: 32,
		overflow: "hidden",
		borderWidth: 1,
		borderColor: Platform.OS === "ios"
			? "rgba(255,255,255,0.72)"
			: "rgba(15,23,42,0.08)",
		backgroundColor: Platform.OS === "ios"
			? "rgba(255,255,255,0.22)"
			: "#FFFFFF",
	},

	androidBg: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: "#FFFFFF",
	},

	glassOverlay: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: Platform.OS === "ios"
			? "rgba(255,255,255,0.24)"
			: "transparent",
	},

	itemsRow: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 8,
		paddingTop: 3,
		paddingBottom: 3,
	},

	item: {
		flex: 1,
		height: "100%",
		alignItems: "center",
		justifyContent: "center",
		gap: 2,
		borderRadius: 24,
		paddingTop: 6,
		paddingBottom: 6,
	},
	itemPressed: {
		opacity: 0.72,
	},

	iconPill: {
		width: 44,
		height: 34,
		borderRadius: 18,
		alignItems: "center",
		justifyContent: "center",
	},

	iconPillActive: {
		backgroundColor: Platform.OS === "ios"
			? "rgba(255,255,255,0.62)"
			: "rgba(232,238,247,0.95)",
		borderWidth: 1,
		borderColor: Platform.OS === "ios"
			? "rgba(255,255,255,0.78)"
			: "rgba(15,23,42,0.08)",
	},

	label: {
		maxWidth: 76,
		fontSize: 9,
		fontWeight: "800",
		color: "rgba(15,23,42,0.46)",
	},

	labelActive: {
		color: Colors.primary[900],
		fontWeight: "900",
	},
});

export default LiquidLikeTabBar;