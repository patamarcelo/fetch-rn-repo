import { View, Text, StyleSheet } from "react-native";
import { DataTable } from "react-native-paper";
import { Colors } from "../../constants/styles";
const CardList = () => {
	return (
		<DataTable>
			<View style={styles.headerTitleContainer}>
				<Text style={{ color: "whitesmoke", fontWeight: "bold" }}>
					DESSECACAO
				</Text>
				<Text style={{ fontWeight: 10, color: "lightgrey" }}>
					0 DAP
				</Text>
			</View>
			{/* <DataTable.Header>
				<DataTable.Title sortDirection="descending">
					Produto
				</DataTable.Title>
				<DataTable.Title numeric>Tipo</DataTable.Title>
				<DataTable.Title numeric>Dose (kg/lt p/ ha)</DataTable.Title>
			</DataTable.Header> */}
			<DataTable.Row style={{ backgroundColor: "lightgrey" }}>
				<DataTable.Cell>1</DataTable.Cell>
				<DataTable.Cell numeric>2</DataTable.Cell>
				<DataTable.Cell numeric>3</DataTable.Cell>
			</DataTable.Row>
			<DataTable.Row>
				<DataTable.Cell>1</DataTable.Cell>
				<DataTable.Cell numeric>2</DataTable.Cell>
				<DataTable.Cell numeric>3</DataTable.Cell>
			</DataTable.Row>
			<DataTable.Row style={{ backgroundColor: "lightgrey" }}>
				<DataTable.Cell>1</DataTable.Cell>
				<DataTable.Cell numeric>2</DataTable.Cell>
				<DataTable.Cell numeric>3</DataTable.Cell>
			</DataTable.Row>
		</DataTable>
	);
};

const styles = StyleSheet.create({
	headerTitleContainer: {
		flexDirection: "row",
		justifyContent: "space-between",
		paddingHorizontal: 10,
		paddingBottom: 3,
		alignItems: "flex-end",
		backgroundColor: Colors.primary[600],
		height: 45
	}
});

export default CardList;
