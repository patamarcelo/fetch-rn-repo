import {
	ActivityIndicator,
	View,
	Text,
	StyleSheet,
	FlatList,
	RefreshControl,
	Pressable
} from "react-native";
import { Colors } from "../../constants/styles";


import { useEffect, useState } from "react";
import * as Haptics from 'expo-haptics';
const colorDict = [
	{
		tipo: "inseticida",
		color: "rgb(218,78,75)"
	},
	{
		tipo: "herbicida",
		color: "rgb(166,166,54)"
	},
	{
		tipo: "adjuvante",
		color: "rgb(136,171,172)"
	},
	{
		tipo: "oleo_mineral",
		color: "rgb(120,161,144)"
	},
	{
		tipo: "micronutrientes",
		color: "rgb(118,192,226)"
	},
	{
		tipo: "fungicida",
		color: "rgb(238,165,56)"
	},
	{
		tipo: "fertilizante",
		color: "rgb(76,180,211)"
	},
	{
		tipo: "nutricao",
		color: "rgb(87,77,109)"
	},
	{
		tipo: "biologico",
		color: "rgb(69,133,255)"
	}
];

const getColorChip = (data) => {
	const folt = colorDict.filter((tipo) => tipo.tipo === data);
	if (folt.length > 0) {
		return folt[0].color;
	} else {
		return "rgb(255,255,255,0.1)";
	}
};


const CardListApp = (props) => {
	console.log(props);
	const {
		data: { aplicacao, programa, app }
	} = props;

	const { data, filterByDate } = props

	const formatData = (data) => {
		const date = data.replaceAll("-", "");
		const year = date?.slice(2, 4);
		const month = date?.slice(4, 6);
		const day = date?.slice(6, 8);
		return `${day}/${month}/${year}`;
	};

	const totalArea = app.reduce((acc, curr) => (acc += curr.area), 0);

	const [showProds, setShowProds] = useState(false);
	const [arrProds, setArrProds] = useState([]);
	
	const formatNumber = (number, decimal) => {
        return Number(number)?.toLocaleString("pt-br", {
            minimumFractionDigits: decimal,
            maximumFractionDigits: decimal
        })
    }
	const handleDetailAp = (data) => {
		const totalAp = data.app.reduce((acc, curr) => acc += curr.area, 0)
		console.log('Area Total: ', totalAp.toFixed(2))
		const totalProds = data.app[0].produtos.map((prods) => {
			const produto = prods.produto
			const dose = prods.dose
			const totalApp = (Number(dose) * totalAp).toFixed(2)
			const tipo = prods.tipo
			return ({
				produto,
				dose,
				totalApp,
				tipo
				})
				})
		setArrProds(totalProds)
		setShowProds(prev => !prev)
		// console.log('data da ap: ', data.app)
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
	}

	useEffect(() => {
		console.log('trocou novamente: , ', filterByDate)
	}, [filterByDate]);

	return (
		<Pressable
			style={({ pressed }) => [
				styles.mainConatiner,
				pressed && styles.pressed]}
			onPress={handleDetailAp.bind(this, data)}>
			<View style={styles.headerView}>
				<View style={styles.headerStlTitle}>
					<View style={{ marginLeft: 5 }}>
						<Text style={{ fontWeight: '600' }}>{programa.replace("Programa", "")}</Text>
					</View>
					<View style={styles.totalAreaHeader}>
						<Text style={{ fontStyle: 'italic' }}>
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
					app.sort((a, b) =>
						filterByDate ? a.dataPrevAp.localeCompare(b.dataPrevAp) :
							a.parcela.localeCompare(b.parcela)
					).map((data, i) => {
						return (
							// <View style={[styles.rowTable, {backgroundColor: i % 2 === 0 ? Colors.secondary[100] : Colors.primary[200]}]} key={i}>
							<View style={[styles.rowTable]} key={i}>
								<Text style={[styles.textData, { width: 30 }]}>{data.parcela}</Text>
								<Text style={[styles.textData, { width: 60 }]}>{formatData(data.dataPlantio)}</Text>
								<Text style={[styles.textData, { width: 20 }]}>{data.dap}</Text>
								<Text style={[styles.textData, { width: 80 }]}>{data.variedade}</Text>
								<Text style={[styles.textData, { width: 30 }]}>
									{data.area.toLocaleString("pt-br", {
										minimumFractionDigits: 2,
										maximumFractionDigits: 2
									})}
								</Text>
								<Text style={[styles.textData, { width: 60 }]}>
									{formatData(data.dataPrevAp)}
								</Text>
							</View>
						);
					})}
			</View>
			{
				showProds && arrProds.length > 0 &&	
				<View style={styles.headerContainerProds}>
					<Text style={{fontWeight: 'bold', color:'whitesmoke', fontSize: 12}}>PRODUTOS</Text>
				</View>
			}
			{showProds && arrProds.length > 0 &&
				arrProds.filter((op) => op.tipo !== 'operacao').sort((a,b) => a.tipo.localeCompare(b.tipo)).map((prods, index) =>{
					console.log(prods.tipo)
					return (
						<View style={styles.detailProdView} key={index}>
							<Text style={{textAlign: 'left', width: 50, fontSize: 10, marginBottom: 2}}>{formatNumber(prods.dose,3)}</Text>
							<View style={{backgroundColor: getColorChip(prods.tipo), borderRadius: 6, padding: 3,paddingLeft: 5, marginBottom: 2}}>
								<Text style={{textAlign: 'left', width: 150, fontSize: 10,color: 'whitesmoke'}} numberOfLines={1}>{prods.produto}</Text>
							</View>
							<Text style={{textAlign: 'right', width: 50, fontSize: 10, marginBottom: 2}}>{formatNumber(prods.totalApp,2)}</Text>
						</View>
					)
				})
			}
		</Pressable>
	);
};
const styles = StyleSheet.create({
	headerContainerProds:{
		// flex: 1, 
		justifyContent:  'center',
		alignItems: 'center',
		marginVertical: 10,
		backgroundColor: Colors.primary[800]
	},
	detailProdView:{
		flexDirection: 'row',
		// flex: 1,
		justifyContent: 'space-between',
		alignItems: 'center',
		marginHorizontal: 40,
	},
	totalAreaHeader: {
		borderBottomColor: 'black',
		borderBottomWidth: 1
	},
	programHeader: {
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
	},
	pressed: {
		opacity: 0.7
	},
});
export default CardListApp;
