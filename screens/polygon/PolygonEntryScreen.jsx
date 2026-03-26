import React, { useEffect, useRef } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import { Colors } from "../../constants/styles";

const PolygonEntryScreen = () => {
	const navigation = useNavigation();
	const isFocused = useIsFocused();
	const redirectedRef = useRef(false);

	useEffect(() => {
		if (!isFocused) {
			redirectedRef.current = false;
			return;
		}

		if (redirectedRef.current) return;

		const parentNavigation = navigation.getParent();
		if (!parentNavigation) return;

		redirectedRef.current = true;

		const timeout = setTimeout(() => {
			parentNavigation.navigate("PolygonStackScreen", {
				screen: "PolygonHomeScreen",
			});
		}, 0);

		return () => clearTimeout(timeout);
	}, [isFocused, navigation]);

	return (
		<View style={styles.container}>
			<ActivityIndicator size="large" color={Colors.primary[901]} />
		</View>
	);
};

export default PolygonEntryScreen;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: Colors.primary100 || "#F4F6F8",
	},
});