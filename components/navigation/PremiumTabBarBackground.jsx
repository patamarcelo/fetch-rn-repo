import { Platform, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";

const PremiumTabBarBackground = () => {
	if (Platform.OS === "ios") {
		return (
			<BlurView
				tint="light"
				intensity={72}
				style={StyleSheet.absoluteFill}
			/>
		);
	}

	return <View style={styles.androidBackground} />;
};

const styles = StyleSheet.create({
	androidBackground: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: "#FFFFFF",
	},
});

export default PremiumTabBarBackground;