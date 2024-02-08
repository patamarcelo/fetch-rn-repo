import {
	ActivityIndicator,
	View,
	Text,
	StyleSheet,
	FlatList,
	RefreshControl
} from "react-native";

const CardList = (props) => {
	const {
		data: { fazenda, parcela }
	} = props;

	const {
		data: {
			dados: { area_colheita }
		}
	} = props;
	return (
		<View style={styles.mainConatiner}>
			<View>
				<Text>
					{fazenda} - {parcela}
				</Text>
			</View>
			<View>
				<Text>{area_colheita.toFixed(2).replace(".", ",")}</Text>
			</View>
		</View>
	);
};
const styles = StyleSheet.create({
	mainConatiner: {
		flex: 1,
		flexDirection: "row",
		justifyContent: "space-between",
		width: "100%",
		paddingHorizontal: 10
	}
});
export default CardList;
