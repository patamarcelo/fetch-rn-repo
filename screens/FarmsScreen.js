import { View, Text, StyleSheet } from "react-native";

const FarmsScreen = () => {
	return (
		<View style={styles.mainContainer}>
			<Text style={{ color: "whitesmoke", fontSize: 20, paddingTop: 20 }}>
				Selecione a Fazenda
			</Text>
		</View>
	);
};

const styles = StyleSheet.create({
	mainContainer: {
		flex: 1,
		alignItems: "center"
	}
});
export default FarmsScreen;
