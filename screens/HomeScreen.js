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
import { farmsSelected } from "../store/redux/selector";

import { Colors } from "../constants/styles";
import IconButton from "../components/ui/IconButton";
import { useEffect, useState, useLayoutEffect, useRef } from "react";

import CardList from "../components/HomeScreen/CardList";
import FarmScreen from "./FarmsScreen";

import { LINK } from "../utils/api";

import { useScrollToTop } from "@react-navigation/native";

const FarmList = (itemData) => {
	return <CardList data={itemData.item} />;
};

const HomeScreen = ({ navigation }) => {
	const { setFarms } = geralActions;

	const [isLoading, setIsLoading] = useState(false);
	const [dataFromServer, setDataFromServer] = useState([]);
	const selFarm = useSelector(farmsSelected);
	const ref = useRef(null);

	const [modalVisible, setModalVisible] = useState(false);

	const farmTitle = selFarm ? selFarm : "Plantio";

	const dispatch = useDispatch();

	const handlerFarms = () => {
		console.log("logout");
		navigation.navigate("FarmsScren");
		// setModalVisible(true);
	};

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
					{/* <IconButton
								type={"awesome"}
								icon="map"
								color={tintColor}
								size={22}
								onPress={handlerFarms}
								btnStyles={{ marginLeft: 25, marginTop: 10 }}
							/> */}
				</View>
			)
		});
	}, []);

	const safraCiclo = {
		safra: "2023/2024",
		ciclo: "3"
	};

	useEffect(() => {
		getData();
	}, []);

	useEffect(() => {
		if (dataFromServer.length > 0) {
			const onlyFarm = dataFromServer.map((data, i) => {
				return data.fazenda;
			});
			const setFiltFarms = [...new Set(onlyFarm)];
			dispatch(setFarms(setFiltFarms));
		}
	}, [dataFromServer]);

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
			setDataFromServer(
				data.dados_plantio
					.sort((a, b) => a.parcela.localeCompare(b.parcela))
					.sort((a, b) => a.fazenda.localeCompare(b.fazenda))
			);
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

	if (isLoading) {
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
			<View style={styles.dataContainer}>
				{dataFromServer.length > 0 && (
					<FlatList
						// scrollEnabled={false}
						ref={ref}
						data={dataFromServer}
						keyExtractor={(item, i) => i}
						renderItem={FarmList}
						ItemSeparatorComponent={() => (
							<View style={{ height: 9 }} />
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
				)}
			</View>
			{/* <Text style={{ color: "whitesmoke" }}>Home Screen</Text> */}
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
