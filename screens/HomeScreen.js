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

import Button from "../components/ui/Button";

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


import DateTimePicker from '@react-native-community/datetimepicker';
import createAndPrintPDF from "../components/Global/PrintPage";
import DateTimePickerModal from "react-native-modal-datetime-picker";


import * as Haptics from 'expo-haptics';



const FarmList = (itemData, filterByDate) => {
	return <CardListApp data={itemData.item} filterByDate={filterByDate} />;
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

	const [date, setDate] = useState()
	const [open, setOpen] = useState(false)
	const [mode, setMode] = useState('date');
	const [filterEndDate, setfilterEndDate] = useState();

	const [filterByDate, setFilterByDate] = useState(false);


	const farmTitle = selFarm ? selFarm : "Programações";

	const dispatch = useDispatch();

	const handlerSortData = () => {
		setFilterByDate(current => !current)
	}

	const handlerOpenCalendar = () => {
		console.log('Open Calendar')
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
		setDate(new Date())
		setOpen(true);
	}

	const handleClearDate = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
		setDate()
		setfilterEndDate()
		setOpen(false);
	}

	const onChange = (selectedDate) => {
		console.log('Selec Date', selectedDate)
		const currentDate = selectedDate;
		setOpen(false);
		setDate(currentDate);
		console.log("current Date here: ", currentDate.toLocaleDateString().split('/').reverse().join('-'))
		if (currentDate) {
			const formatDate = currentDate.toLocaleDateString().split('/').reverse().join('-')
			setfilterEndDate(formatDate)
		}
	};



	const handlerFarms = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
		console.log("logout");
		navigation.navigate("FarmsScren");
		// setModalVisible(true);
	};

	const handleClear = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
		dispatch(selectedFarm(""));
	};

	useEffect(() => {
		handleClear()
	}, []);

	useEffect(() => {
		navigation.setOptions({
			title: farmTitle.replace('Projeto ', '')
		});
	}, [farmTitle]);

	const handlerPrintData = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
		createAndPrintPDF(listToCardApp, selFarm, filterEndDate)
	}


	useLayoutEffect(() => {
		navigation.setOptions({
			title: farmTitle.replace('Projeto ', ''),
			tabBarLabel: "Programações",
			headerLeft: ({ tintColor }) => (
				<View style={{ flexDirection: "row" }}>
					{selFarm && (
						<>
							<IconButton
								type={"awesome"}
								icon="filter"
								color={selFarm ? '#3d8bfd' : tintColor}
								size={22}
								onPress={handlerFarms}
								btnStyles={{ marginLeft: 25, marginTop: 10 }}
							/>

							<IconButton
								type={""}
								icon="close-circle"
								color={tintColor}
								size={22}
								onPress={handleClear}
								btnStyles={{ marginLeft: 5, marginTop: 10 }}
							/>
						</>
					)}
				</View>
			),
			headerRight: ({ tintColor }) => (
				<View style={{ flexDirection: "row", alignItems: 'center' }}>
					{
						selFarm && listToCardApp.length > 0 &&
						<IconButton
							type={"awesome"}
							icon={!filterByDate ? "sort-alpha-asc" : "sort-alpha-desc"}
							color={'green'}
							size={18}
							onPress={handlerSortData}
							btnStyles={{ marginLeft: 5, marginTop: 10 }}
						/>
					}
					<IconButton
						type={"awesome"}
						icon="calendar"
						color={date ? '#3d8bfd' : tintColor}
						size={22}
						onPress={handlerOpenCalendar}
						btnStyles={{ marginRight: 25, marginTop: 10 }}
					/>

					{date && (
						<IconButton
							type={""}
							icon="close-circle"
							color={tintColor}
							size={22}
							onPress={handleClear}
							btnStyles={{ marginLeft: 5, marginTop: 10 }}
						/>
					)}
				</View>
			)
		});
	}, []);

	useEffect(() => {
		navigation.setOptions({
			title: farmTitle.replace('Projeto ', ''),
			tabBarLabel: "Programações",
			headerLeft: ({ tintColor }) => (
				<View style={{ flexDirection: "row" }}>
					{selFarm && (
						<>
							<IconButton
								type={"awesome"}
								icon="filter"
								color={selFarm ? '#3d8bfd' : tintColor}
								size={22}
								onPress={handlerFarms}
								btnStyles={{ marginLeft: 25, marginTop: 10 }}
							/>

							<IconButton
								type={""}
								icon="close-circle-outline"
								color={tintColor}
								size={22}
								onPress={handleClear}
								btnStyles={{ marginLeft: 5, marginTop: 10 }}
							/>
						</>
					)}
				</View>
			),
			headerRight: ({ tintColor }) => (
				<View style={{ flexDirection: "row", alignItems: 'center', gap: 5 }}>
					{
						selFarm && listToCardApp.length > 0 &&
						<>
							<IconButton
								type={"awesome"}
								icon={'print'}
								color={tintColor}
								size={22}
								onPress={handlerPrintData}
								btnStyles={{ marginLeft: 5, marginTop: 10 }}
							/>
							<IconButton
								type={"awesome"}
								icon={!filterByDate ? "sort-alpha-asc" : "sort-alpha-desc"}
								color={'green'}
								size={18}
								onPress={handlerSortData}
								btnStyles={{ marginLeft: 5, marginTop: 10 }}
							/>
						</>

					}
					<IconButton
						type={"awesome"}
						icon="calendar"
						color={date ? '#3d8bfd' : tintColor}
						size={22}
						onPress={handlerOpenCalendar}
						btnStyles={{ marginRight: date ? 4 : 25, marginTop: 10 }}
					/>
					{date && (
						<IconButton
							type={""}
							icon="close-circle"
							color={'whitesmoke'}
							size={22}
							onPress={handleClearDate}
							btnStyles={{ marginTop: 10 }}
						/>
					)}
				</View>
			)
		});
	}, [selFarm, date, filterByDate, listToCardApp]);

	useEffect(() => {
		if (selFarm) {
			const newArr = dataPlantioServer?.filter(
				(data) => data.fazenda === selFarm
			)
			const result = formatDataServer(newArr, filterEndDate)
			setListToCardApp(result)
		}
	}, [selFarm, dataPlantioServer, filterEndDate, filterByDate]);

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
			const formDataServer = data.dados_plantio.filter((data) => data.dados.plantio_finalizado === true)
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
		<>
			{open && date && (
				<View
					style={{
						justifyContent: 'center',
						flex: 1,
						alignItems: 'center'
					}}
				>
					{/* <DateTimePicker
						testID="dateTimePicker"
						value={date}
						mode={mode}
						is24Hour={true}
						onChange={onChange}
						display="calendar"
						// timeZoneName={'Europe/Prague'}
						locale="pt-BR"
					/> */}
					<DateTimePickerModal
						isVisible={open}
						mode="date"
						onConfirm={onChange}
						onCancel={handleClearDate}
						locale="pt-BR"
						confirmTextIOS="Confirmar"
						cancelTextIOS="Cancelar"
						display="inline"
					/>
				</View>
			)}
			{!open &&
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
						<View style={styles.buttonContainer}>
							<Button onPress={handlerFarms} btnStyles={{ backgroundColor: Colors.primary[500] }}>
								Selecione um Projeto
							</Button>
						</View>
					)}
					{selFarm && (
						<View
							style={[
								styles.dataContainer,
								{ marginTop: 3, paddingBottom: tabBarHeight + 5 }
							]}
						>
							{/* <PrintPage /> */}
							{listToCardApp.length > 0 ? (
								<FlatList
									// scrollEnabled={false}
									ref={ref}
									data={listToCardApp}
									// data={dataFromServer.filter(
									// 	(data) => data.fazenda === selFarm
									// )}
									keyExtractor={(item, i) => i}
									renderItem={(item) => FarmList(item, filterByDate)}
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
			}
		</>
	);
};

const styles = StyleSheet.create({
	buttonContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center"
	},
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
		backgroundColor: "whitesmoke",
		width: "100%",
		alignItems: "center"
	}
});

export default HomeScreen;
