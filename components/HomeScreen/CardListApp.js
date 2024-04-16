import {
	ActivityIndicator,
	View,
	Text,
	StyleSheet,
	FlatList,
	RefreshControl
} from "react-native";
import { Colors } from "../../constants/styles";

const CardListApp = (props) => {
	console.log(props);
	const {
		data: { aplicacao, programa, app }
	} = props;

	const formatData = (data) => {
		const date = data.replaceAll("-", "");
		const year = date?.slice(2, 4);
		const month = date?.slice(4, 6);
		const day = date?.slice(6, 8);
		return `${day}/${month}/${year}`;
	};

	const totalArea = app.reduce((acc, curr) => (acc += curr.area), 0);

	return (
		<View style={styles.mainConatiner}>
			<View style={styles.headerView}>
				<View style={styles.headerStlTitle}>
					<View>
						<Text style={{fontWeight: 'bold'}}>{programa.replace("Programa", "")}</Text>
					</View>
					<View style={styles.totalAreaHeader}>
					<Text style={{fontStyle: 'italic'}}>
						{totalArea.toLocaleString("pt-br", {
							minimumFractionDigits: 2,
							maximumFractionDigits: 2
						})}
					</Text>
						</View>
				</View>
				<View style={[{ width: "100%", alignItems: "center" }, styles.programHeader]}>
					<Text style={styles.textApp}>{aplicacao}</Text>
				</View>
			</View>
			<View style={styles.dataContainer}>
				{app &&
					app.length > 0 &&
					app.map((data, i) => {
						return (
							// <View style={[styles.rowTable, {backgroundColor: i % 2 === 0 ? Colors.secondary[100] : Colors.primary[200]}]} key={i}>
							<View style={[styles.rowTable]} key={i}>
								<Text style={[styles.textData,{width: 30}]}>{data.parcela}</Text>
								<Text style={[styles.textData,{width: 60}]}>{formatData(data.dataPlantio)}</Text>
								<Text style={[styles.textData,{width: 30}]}>{data.dap}</Text>
								<Text style={[styles.textData,{width: 40}]}>{data.variedade}</Text>
								<Text style={[styles.textData,{width: 30}]}>
									{data.area.toLocaleString("pt-br", {
										minimumFractionDigits: 2,
										maximumFractionDigits: 2
									})}
								</Text>
								<Text style={[styles.textData,{width: 60}]}>
									{formatData(data.dataPrevAp)}
								</Text>
							</View>
						);
					})}
			</View>
		</View>
	);
};
const styles = StyleSheet.create({
	totalAreaHeader:{
		borderBottomColor: 'black',
		borderBottomWidth: 1
	},	
	programHeader:{
		backgroundColor: Colors.primary500,
		borderRadius: 12,
		paddingHorizontal: 6,
		paddingVertical: 10,
		width: '90%',
		elevation: 2, // For Android
	},
	headerStlTitle: {
		width: "100%",
		alignItems: "center",
		flexDirection: "row",
		justifyContent: "space-between",
		marginBottom: 10,
		paddingRight: 10

	},
	textApp: {
		fontSize: 12,
		fontWeight: "bold",
		color: 'whitesmoke'
	},
	headerTable: {
		flexDirection: "row",
		justifyContent: "space-between",
		gap: 10,
		width: "100%",
		marginBottom: 10,
	},
	rowTable: {
		flexDirection: "row",
		justifyContent: "space-between",
		gap: 10,
		width: "100%",
		paddingVertical: 5,
		alignItems: 'center',
		borderRadius: 8,
		paddingHorizontal: 12,


	},
	headerView: {
		justifyContent: "center",
		alignItems: "center",
		gap: 5,
		marginBottom: 10,
		// marginHorizontal: 10
	},
	textData: {
		fontSize: 10,
		// marginBottom: 5,
		textAlign: 'center'
	},
	mainConatiner: {
		backgroundColor: "#fff",
		borderRadius: 8,
		// padding: 20,
		marginBottom: 5,
		elevation: 2, // For Android
		shadowColor: "#000", // For iOS
		shadowOpacity: 0.1, // For iOS
		shadowRadius: 5, // For iOS
		shadowOffset: { width: 0, height: 2 }, // For iOS
		marginHorizontal: 5,
		paddingVertical: 20,
		
		// 	flex: 1,
		// flexDirection: "column",
		// justifyContent: "space-between",
		// width: "100%",
		// paddingHorizontal: 10,
		// paddingVertical: 10,
		// backgroundColor: Colors.secondary[400]
	}
});
export default CardListApp;
