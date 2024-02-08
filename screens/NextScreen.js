import { View, Text, StyleSheet } from "react-native";
const NextScreen = () => {
	return (
		<View style={styles.mainContainer}>
			<Text>NextScreen</Text>
		</View>
	);
};

const styles = StyleSheet.create({
	mainContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center"
	}
});

export default NextScreen;
