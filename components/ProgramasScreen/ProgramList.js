import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	RefreshControl
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { DataTable, Chip } from "react-native-paper";
import CardList from "./CardList";
import { Colors } from "../../constants/styles";

const ProgramList = ({ refresh, isLoading }) => {
	return (
		<ScrollView
			style={styles.mainContainer}
			refreshControl={
				<RefreshControl
					refreshing={isLoading}
					onRefresh={refresh}
					colors={["#9Bd35A", "#689F38"]}
					tintColor={Colors.primary500}
				/>
			}
		>
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
