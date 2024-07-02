import {
	ActivityIndicator,
	View,
	Text,
	StyleSheet,
	FlatList,
	RefreshControl,
	Pressable,
	Image,
	Dimensions,
	Modal,
	Button,
	SafeAreaView
} from "react-native";
import ImageViewer from 'react-native-image-zoom-viewer';
import { Colors } from "../../constants/styles";


import { useEffect, useState } from "react";
import * as Haptics from 'expo-haptics';

import FontAwesome5 from '@expo/vector-icons/FontAwesome5';


import { LINK } from "../../utils/api";
import { EXPO_PUBLIC_REACT_APP_DJANGO_TOKEN } from "@env";
import { Skeleton } from '@rneui/themed';

import { useSelector } from "react-redux";
import { farmsSelected } from "../../store/redux/selector";


const customWidth = Dimensions.get('window').width;

const { width, height } = Dimensions.get('window');


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


const iconDict = [
	{ cultura: "Feijão", icon: require('../../utils/assets/icons/beans2.png'), alt: "feijao" },
	{ cultura: "Arroz", icon: require('../../utils/assets/icons/rice.png'), alt: "arroz" },
	{ cultura: "Soja", icon: require('../../utils/assets/icons/soy.png'), alt: "soja" },
	{ cultura: undefined, icon: require('../../utils/assets/icons/question.png'), alt: "?" }
];

const filteredIcon = (data) => {
	const filtered = iconDict.filter((dictD) => dictD.cultura === data);

	if (filtered.length > 0) {
		return filtered[0].icon;
	}
	return iconDict[3].icon;
	// return "";
};
const getCultura = cultura => filteredIcon(cultura)



const CardListApp = (props) => {
	const {
		data: { aplicacao, programa, app }
	} = props;


	const culturaIcon = app[0]['cultura']

	const { data, filterByDate } = props

	const dapAp = data.dap

	const selFarm = useSelector(farmsSelected);

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

	const [farmPlotMap, setFarmPlotMap] = useState();
	const [parcelasPlotMap, setParcelasPlotMap] = useState([]);
	const [displayMap, setDisplayMap] = useState("");
	const [isLoadingMap, setIsLoadingMap] = useState(false);

	const [modalVisible, setModalVisible] = useState(false);


	useEffect(() => {
		setDisplayMap("")
	}, [selFarm]);

	const formatNumber = (number, decimal) => {
		return Number(number)?.toLocaleString("pt-br", {
			minimumFractionDigits: decimal,
			maximumFractionDigits: decimal
		})
	}

	useEffect(() => {
		if (data) {
			const farmMap = data?.app?.[0]?.projetoIdFarmbox
			const parcelasMap = data?.app?.map((parc) => parc.plantioIdFarmbox)
			setFarmPlotMap(farmMap)
			setParcelasPlotMap(parcelasMap)
		}
	}, [data]);

	const handleDetailAp = (data) => {

		const totalAp = data.app.reduce((acc, curr) => acc += curr.area, 0)
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


	const handleSendApiApp = async (idFarm) => {
		console.log('gerando o mapa')
		setIsLoadingMap(true)
		const params = JSON.stringify({
			projeto: farmPlotMap,
			parcelas: parcelasPlotMap,
			safra: {
				safra: '2024/2025',
				ciclo: 1
			}
		});
		try {
			const response = await fetch(LINK + "/plantio/get_matplot_draw/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Token ${EXPO_PUBLIC_REACT_APP_DJANGO_TOKEN}`,
				},
				body: params
			});
			const json = await response.text()
			setDisplayMap(json)
		} catch (error) {
			console.log('erro ao gerar o mapa')
			console.error(error);
			setIsLoadingMap(false)
		} finally {
			setIsLoadingMap(false)
		}
	};


	const handleMapApi = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
		if (displayMap.length === 0) {
			handleSendApiApp()
		} else {
			setDisplayMap('')

		}
	}

	const images = [
		{
			url: displayMap,
		},
	];

	return (
		<>
			<Pressable
				style={({ pressed }) => [
					styles.mainConatiner,
					pressed && styles.pressed]}
				onPress={handleDetailAp.bind(this, data)}>
				<View style={styles.headerView}>
					<View style={styles.headerStlTitle}>
						<View style={{ marginLeft: 5 }}>
							<Text style={{ fontWeight: '600' }}>{programa.replace("Programa", "")}</Text>
							<Text style={{ marginLeft: 4, fontSize: 10, color: Colors.secondary[400] }}>{dapAp} Dias</Text>
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
					<View style={[{ width: "100%", alignItems: "center", flexDirection: 'row', justifyContent: 'center', gap: 10 }, styles.programHeader]}>
						<Text style={styles.textApp}>{aplicacao}</Text>
						<Image source={getCultura(culturaIcon)}
							style={{ width: 20, height: 20 }}
						/>
					</View>
				</View>
				<View style={styles.dataContainer}>
					{app &&
						app.length > 0 &&
						app.sort((a, b) =>
							filterByDate ? a.dataPrevAp.localeCompare(b.dataPrevAp) :
								a.parcela.localeCompare(b.parcela)
						).map((data, i) => {
							console.log('data Here: ', data.cultura)
							return (
								// <View style={[styles.rowTable, {backgroundColor: i % 2 === 0 ? Colors.secondary[100] : Colors.primary[200]}]} key={i}>
								<View style={[styles.rowTable]} key={i}>
									<Text style={[styles.textData, { width: 30 }]}>{data.parcela}</Text>
									<Text style={[styles.textData, { width: 60 }]}>{formatData(data.dataPlantio)}</Text>
									<Text style={[styles.textData, { width: 20 }]}>{data.dap}</Text>
									<Text style={[styles.textData, { width: 80 }]}>{data.variedade}</Text>
									<Text style={[styles.textData, { width: 34 }]} numberOfLines={1}>
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
						<Text style={{ fontWeight: 'bold', color: 'whitesmoke', fontSize: 12 }}>PRODUTOS</Text>
					</View>
				}
				{showProds && arrProds.length > 0 &&
					arrProds.filter((op) => op.tipo !== 'operacao').sort((a, b) => a.tipo.localeCompare(b.tipo)).map((prods, index) => {
						console.log(prods.tipo)
						return (
							<View style={styles.detailProdView} key={index}>
								<Text style={{ textAlign: 'left', width: 50, fontSize: 10, marginBottom: 2 }}>{formatNumber(prods.dose, 3)}</Text>
								<View style={{ backgroundColor: getColorChip(prods.tipo), borderRadius: 6, padding: 3, paddingLeft: 5, marginBottom: 2 }}>
									<Text style={{ textAlign: 'left', width: 150, fontWeight: 'bold', fontSize: 10, color: 'whitesmoke' }} numberOfLines={1}>{prods.produto}</Text>
								</View>
								<Text style={{ textAlign: 'right', width: 50, fontSize: 10, marginBottom: 2 }}>{formatNumber(prods.totalApp, 2)}</Text>
							</View>
						)
					})
				}
				<View>
					<Pressable
						style={({ pressed }) => [
							styles.mapContainer,
							pressed && styles.pressed]}
						onPress={handleMapApi}
					>
						<FontAwesome5 name="map-marked-alt" size={24} color="black" />
					</Pressable>
				</View>

			</Pressable>
			{
				displayMap.length > 0 && !isLoadingMap &&
				<Pressable style={styles.imageContainer} onPress={() => setModalVisible(true)}>
					<Image
						style={styles.image}
						source={{ uri: displayMap }}
						resizeMode="contain"
						onError={(error) => console.log('Error loading image:', error)}
					/>
				</Pressable>
			}
			{
				isLoadingMap &&
				<View style={styles.skelContainer}>
					<Skeleton
						animation="wave"
						width={customWidth - (customWidth * 0.05)}
						height={300}
					/>
				</View>
			}
			<Modal
				animationType="slide"
				transparent={false}
				visible={modalVisible}
				onRequestClose={() => setModalVisible(false)}
			>
				{/* <Pressable style={styles.modalView} onPress={() => setModalVisible(false)}> */}
				<SafeAreaView>
					<View style={[styles.programHeader, {
						width: width - (width * 0.10),
						justifyContent: 'center',
						alignItems: 'center',
						marginHorizontal: 20,
						flexDirection: 'row',
						gap: 10
					}]}>
						<Text style={styles.textApp}>{aplicacao}</Text>
						<Image source={getCultura(culturaIcon)}
							style={{ width: 20, height: 20 }}
						/>
					</View>
				</SafeAreaView>
				<ImageViewer
					imageUrls={images}
					enableSwipeDown
					onSwipeDown={() => setModalVisible(false)}
					backgroundColor="#fff"
					renderFooter={() => (
						<View style={styles.buttonContainer}>
							{/* <Button title="Save to Camera Roll" onPress={handleSave} /> */}
							<Button title="Close" onPress={() => setModalVisible(false)} />
						</View>
					)}
				/>
				{/* </Pressable> */}
			</Modal>
		</>
	);
};
const styles = StyleSheet.create({
	buttonContainer: {
		position: 'absolute',
		bottom: 30,
		left: 0,
		right: 0,
		flexDirection: 'row',
		justifyContent: 'space-around',
	},
	modalView: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: 'white',
	},
	skelContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		marginVertical: 10
	},
	imageContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center'
	},
	image: {
		width: 300,
		height: 300,
	},
	mapContainer: {
		marginRight: 10,
		paddingTop: 10,
		paddingRight: 10,
		justifyContent: 'flex-end',
		alignItems: 'flex-end'
	},
	pressed: {
		opacity: 0.7
	},
	headerContainerProds: {
		// flex: 1, 
		justifyContent: 'center',
		alignItems: 'center',
		marginVertical: 10,
		backgroundColor: Colors.primary[800]
	},
	detailProdView: {
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
