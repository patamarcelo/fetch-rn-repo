import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { DataTable, Chip } from "react-native-paper";
import CardList from "./CardList";

const ProgramList = () => {
	return (
		<ScrollView style={styles.mainContainer}>
			<CardList />
			<CardList />
			<CardList />
			<CardList />
			<CardList />
			<CardList />
			<CardList />
			<CardList />
			<CardList />
		</ScrollView>
	);
};

const styles = StyleSheet.create({
	mainContainer: {
		flex: 1,
		width: "100%"
		// justifyContent: "center"
	}
});

export default ProgramList;
