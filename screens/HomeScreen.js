import {
	ActivityIndicator,
	View,
	Text,
	StyleSheet,
	FlatList,
	RefreshControl,
	Alert,
	Modal
} from "react-native";
import { EXPO_PUBLIC_REACT_APP_DJANGO_TOKEN } from "@env";

import { useDispatch, useSelector } from "react-redux";
import { geralActions } from "../store/redux/geral";
import { farmsSelected, selectDataPlantio } from "../store/redux/selector";

import { Colors } from "../constants/styles";
import IconButton from "../components/ui/IconButton";
import { useEffect, useState, useLayoutEffect, useRef } from "react";


import FarmScreen from "./FarmsScreen";

import { LINK } from "../utils/api";

import { useScrollToTop } from "@react-navigation/native";

import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

import formatDataServer from '../utils/data-program'
import CardListApp from "../components/HomeScreen/CardListApp";


const FarmList = (itemData) => {
	return <CardListApp data={itemData.item} />;
};

const HomeScreen = ({ navigation }) => {
	const { setFarms, selectedFarm, setDataPlantio } = geralActions;

	const [isLoading, setIsLoading] = useState(false);
	const selFarm = useSelector(farmsSelected);
	const dataPlantioServer = useSelector(selectDataPlantio)
	const ref = useRef(null);

	const tabBarHeight = useBottomTabBarHeight();

	const [modalVisible, setModalVisible] = useState(false);
	const [listToCardApp, setListToCardApp] = useState([]);

	const farmTitle = selFarm ? selFarm : "Plantio";

	const dispatch = useDispatch();

	const handlerFarms = () => {
		console.log("logout");
		navigation.navigate("FarmsScren");
		// setModalVisible(true);
	};

	const handleClear = () => {
		dispatch(selectedFarm(""));
	};

	useEffect(() => {
		handleClear()
	}, []);

	useEffect(() => {
		navigation.setOptions({
			title: farmTitle
		});
	}, [farmTitle]);

	useLayoutEffect(() => {
		navigation.setOptions({
			title: farmTitle,
			tabBarLabel: "Programações",
			headerLeft: ({ tintColor }) => (
				<View style={{ flexDirection: "row" }}>
					<IconButton
						type={"awesome"}
						icon="filter"
						color={tintColor}
						size={22}
						onPress={handlerFarms}
						btnStyles={{ marginLeft: 25, marginTop: 10 }}
					/>
					{selFarm && (
						<IconButton
							type={""}
							icon="close-circle"
							color={tintColor}
							size={22}
							onPress={handleClear}
							btnStyles={{ marginLeft: 25, marginTop: 10 }}
						/>
					)}
				</View>
			)
		});
	}, []);

	useEffect(() => {
		navigation.setOptions({
			title: farmTitle,
			tabBarLabel: "Programações",
			headerLeft: ({ tintColor }) => (
				<View style={{ flexDirection: "row" }}>
					<IconButton
						type={"awesome"}
						icon="filter"
						color={tintColor}
						size={22}
						onPress={handlerFarms}
						btnStyles={{ marginLeft: 25, marginTop: 10 }}
					/>
					{selFarm && (
						<IconButton
							type={""}
							icon="close-circle-outline"
							color={tintColor}
							size={22}
							onPress={handleClear}
							btnStyles={{ marginLeft: 25, marginTop: 10 }}
						/>
					)}
				</View>
			)
		});
	}, [selFarm]);

	useEffect(() => {
		if (selFarm) {
			const newArr = dataPlantioServer?.filter(
				(data) => data.fazenda === selFarm
			)
			const result = formatDataServer(newArr)
			setListToCardApp(result)
			console.log('result', result)

		}
	}, [selFarm]);

	const safraCiclo = {
		safra: "2023/2024",
		ciclo: "3"
	};

	useEffect(() => {
		getData();
	}, []);

	useEffect(() => {
		if (dataPlantioServer.length > 0) {
			const onlyFarm = dataPlantioServer?.map((data, i) => {
				return data.fazenda;
			});
			const setFiltFarms = [...new Set(onlyFarm)];
			dispatch(setFarms(setFiltFarms));
		}
	}, [dataPlantioServer]);
	console.log('expo token: ', EXPO_PUBLIC_REACT_APP_DJANGO_TOKEN)
	const getData = async () => {
		console.log("pegando os dados");
		setIsLoading(true);
		try {
			const response = await fetch(
				`${LINK}/plantio/get_plantio_operacoes_detail_json_program/`,
				{
					headers: {
						Authorization: `Token ${EXPO_PUBLIC_REACT_APP_DJANGO_TOKEN}`,
						"Content-Type": "application/json"
					},
					body: JSON.stringify(safraCiclo),
					method: "POST"
				}
			);

			const data = await response.json();
			console.table(data.dados_plantio);
			const formDataServer = data.dados_plantio
				.sort((a, b) => a.parcela.localeCompare(b.parcela))
				.sort((a, b) => a.fazenda.localeCompare(b.fazenda))

			dispatch(setDataPlantio(formDataServer))
		} catch (error) {
			console.log("erro ao pegar os dados", error);
			Alert.alert(
				`Problema na API', 'possível erro de internet para pegar os dados ${error}`
			);
		} finally {
			setIsLoading(false);
		}
	};

	useScrollToTop(ref);

	if (isLoading && dataPlantioServer.length === 0) {
		return (
			<View
				style={{
					flex: 1,
					justifyContent: "center",
					backgroundColor: "whitesmoke"
				}}
			>
				<ActivityIndicator size="large" color="#0000ff" />
			</View>
		);
	}

	return (
		<View style={styles.mainContainer}>
			{/* <View style={styles.header}>
				<Button onPress={getData}>Pegar Dados</Button>
			</View> */}
			<Modal
				animationType="slide"
				transparent={true}
				visible={modalVisible}
				onRequestClose={() => {
					Alert.alert("Modal has been closed.");
					setModalVisible(!modalVisible);
				}}
			>
				<FarmScreen
					setModalVisible={setModalVisible}
					modalVisible={modalVisible}
				/>
			</Modal>

			{!selFarm && (
				<View>
					<Text>Dados do Plantio</Text>
				</View>
			)}
			{selFarm && (
				<View
					style={[
						styles.dataContainer,
						{ marginTop: 3, paddingBottom: tabBarHeight + 5 }
					]}
				>
					{listToCardApp.length > 0 ? (
						<FlatList
							// scrollEnabled={false}
							ref={ref}
							data={listToCardApp}
							// data={dataFromServer.filter(
							// 	(data) => data.fazenda === selFarm
							// )}
							keyExtractor={(item, i) => i}
							renderItem={FarmList}
							ItemSeparatorComponent={() => (
								<View style={{ height: 12 }} />
							)}
							refreshControl={
								<RefreshControl
									refreshing={isLoading}
									onRefresh={getData}
									colors={["#9Bd35A", "#689F38"]}
									tintColor={Colors.primary500}
								/>
							}
						/>
					) :
						<View style={{ justifyContent: 'center', alignItems: 'center', flex: 1 }}>
							<Text style={{ fontWeight: 'bold' }}>Sem Aplicações para este período</Text>
						</View>
					}
				</View>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	mainContainer: {
		backgroundColor: "whitesmoke",
		flex: 1,
		justifyContent: "space-around",
		alignItems: "center"
	},
	header: {
		height: 100,
		padding: 20
	},
	dataContainer: {
		flex: 1,
		// backgroundColor: "red",
		width: "100%",
		alignItems: "center"
	}
});

export default HomeScreen;
