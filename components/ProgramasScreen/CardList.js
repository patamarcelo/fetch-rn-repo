import { View, Text, StyleSheet } from "react-native";
import { DataTable } from "react-native-paper";
import { Colors } from "../../constants/styles";
const CardList = (props) => {
	const {
		estagioData: { estagio, prazo_dap },
		applications
	} = props;

	return (
		<DataTable>
			<View style={styles.headerTitleContainer}>
				<Text style={{ color: "whitesmoke", fontWeight: "bold" }}>
					{estagio}
				</Text>
				<Text style={{ fontSize: 10, color: "lightgrey" }}>
					{prazo_dap} DAP
				</Text>
			</View>
			{applications?.length > 0 &&
				applications.map((app, i) => {
					const formatDose =
						app.dose <= 10
							? app.dose.toFixed(3).replace(".", ",")
							: app.dose;
					return (
						<DataTable.Row
							key={i}
							style={{
								backgroundColor: i % 2 == 0 && "lightgrey",
								minHeight: 30
							}}
						>
							<DataTable.Cell style>
								<Text style={{ fontSize: 10 }}>
									{app.defensivo__produto}
								</Text>
							</DataTable.Cell>
							<DataTable.Cell numeric>
								<Text style={{ fontSize: 10 }}>
									{app.defensivo__tipo}
								</Text>
							</DataTable.Cell>
							<DataTable.Cell numeric>
								<Text style={{ fontSize: 10 }}>
									{formatDose}
								</Text>
							</DataTable.Cell>
						</DataTable.Row>
					);
				})}
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
