import { View, Text, StyleSheet } from "react-native";
import { Colors } from "../constants/styles";

import Button from "../components/ui/Button";

const HomeScreen = () => {
	const handleRefresh = () => {
		console.log("atualizar");
	};
	return (
		<View style={styles.mainContainer}>
			<Text style={{ color: "blue" }}>Home Screen</Text>
			<Button onPress={handleRefresh}>Atualizar</Button>
			{/* <Text style={{ color: "whitesmoke" }}>Home Screen</Text> */}
		</View>
	);
};

const styles = StyleSheet.create({
	mainContainer: {
		backgroundColor: Colors.primary100,
		flex: 1,
		justifyContent: "center",
		alignItems: "center"
	}
});

export default HomeScreen;
