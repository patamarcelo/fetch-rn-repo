import { useRef, useEffect, useState, useLayoutEffect } from "react";
import BottomSheet, { BottomSheetMethods } from "@devvie/bottom-sheet";

import IconButton from "../components/ui/IconButton";

import {
	ActivityIndicator,
	View,
	Text,
	StyleSheet,
	Pressable,
	ScrollView,
	Alert,
	SafeAreaView
} from "react-native";
import Button from "../components/ui/Button";

import { EXPO_PUBLIC_REACT_APP_DJANGO_TOKEN } from "@env";
import { Colors } from "../constants/styles";

import { useDispatch, useSelector } from "react-redux";
import { geralActions } from "../store/redux/geral";
import { programasSelector, programSelector, dataProgramSelector, selectAreaTotal } from "../store/redux/selector";

import BottomSheetList from "../components/ProgramasScreen/BottomSheetList";

import { LINK } from "../utils/api";

import ProgramList from "../components/ProgramasScreen/ProgramList";
import { useScrollToTop } from "@react-navigation/native";

import PrintProgramPage from "../components/Global/PrintProgramPage";

import * as Haptics from 'expo-haptics';

import { logout } from "../store/redux/authSlice";

import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';




const ProgramScreen = ({ navigation }) => {
	const sheetRef = useRef(null);
	const [isLoading, setIsLoading] = useState();
	const ref = useRef(null);
	const tabBarHeight = useBottomTabBarHeight(); 


	const dispatch = useDispatch();
	const {
		setProgramsAvaiable,
		setSelectedProgram,
		setDataProgram,
		setEstagiosProgram,
		setAreaTotal
	} = geralActions;
	const programasAvai = useSelector(programasSelector);
	const programSelected = useSelector(programSelector);
	const dataProgram = useSelector(dataProgramSelector);
	const areaTotalPrograms = useSelector(selectAreaTotal);

	const [printableData, setPrintableData] = useState(null);

	const handleSelectProgram = () => {
		console.log("selecionar um programa");
		sheetRef.current?.open();
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
	};

	const handleClose = () => {
		sheetRef.current?.close();
	};

	useEffect(() => {
		dispatch(setSelectedProgram(null));
	}, []);

	// useEffect(() => {
	// 	console.log(programasAvai);
	// }, [programasAvai]);

	useScrollToTop(
		useRef({
			scrollToTop: () => ref.current?.scrollTo({ y: 0 })
		})
	);


	const handlerPrintData = () => {
		console.log("print Program")
		const filteredProds = dataProgram.filter((data) => data.operacao__programa__nome === programSelected.nome).sort((a, b) => a.defensivo__tipo.localeCompare(b.defensivo__tipo))
		const onlyEstagios = filteredProds.sort((a, b) => a.operacao__prazo_dap - b.operacao__prazo_dap).map((data) => {
			const newName = `${data.operacao__estagio} | ${data.operacao__prazo_dap}`
			return newName
		})
		const filteredEstagios = [...new Set(onlyEstagios)]
		const areaTotalProgram = areaTotalPrograms.find((program) => program.programa__nome === programSelected.nome)
		PrintProgramPage(programSelected, filteredProds, filteredEstagios, areaTotalProgram)
	}

	const handleLogout = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
		dispatch(logout());
	};

	useEffect(() => {
		navigation.setOptions({
			headerShadowVisible: false, // applied here,
			title: programSelected
				? programSelected.nome_fantasia.replace("Programa", "").replace("Aplicação ", '')
				: "Programas",
			headerLeft: ({ tintColor }) => {
				if (
					programSelected !== "Programas" &&
					programSelected !== null
				) {
					return (
						<View style={{ flexDirection: "row" }}>
							<IconButton
								type={"awesome"}
								icon="filter"
								color={tintColor}
								size={22}
								onPress={handleSelectProgram}
								btnStyles={{ marginLeft: 25, marginTop: 10 }}
							/>
						</View>
					);
				}
			},
			headerRight: ({ tintColor }) => {
				return (
					<View style={{ flexDirection: "row", marginRight: 10 }}>
						{
							programSelected !== "Programas" &&
								programSelected !== null ?
								<IconButton
									type={"awesome"}
									icon={'print'}
									color={tintColor}
									size={22}
									onPress={handlerPrintData}
									btnStyles={{ marginLeft: 5, marginTop: 10 }}
								/>
								:
								<IconButton
									type={"awesome"}
									icon={'power-off'}
									color={tintColor}
									size={22}
									onPress={handleLogout}
									btnStyles={{ marginLeft: 5, marginTop: 10 }}
								/>
						}
					</View>
				)
			}
		}
		);
	}, [programSelected]);

	useScrollToTop(ref);

	useLayoutEffect(() => {
		navigation.setOptions({
			title: "",
			tabBarLabel: "Programas"
		});
	}, []);

	const getData = async () => {
		console.log("pegando os dados");
		setIsLoading(true);
		try {
			const response = await fetch(`${LINK}/programas/get_operacoes/`, {
				headers: {
					Authorization: `Token ${EXPO_PUBLIC_REACT_APP_DJANGO_TOKEN}`,
					"Content-Type": "application/json"
				},
				method: "POST"
			});

			const data = await response.json();
			dispatch(setProgramsAvaiable(data.programas));
			dispatch(setEstagiosProgram(data.estagios));
			dispatch(setDataProgram(data.dados));
			dispatch(setAreaTotal(data.area_total));
		} catch (error) {
			console.log("erro ao pegar os dados", error);
			Alert.alert(
				`Problema na API', 'possível erro de internet para pegar os dados ${error}`
			);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		getData();
	}, []);

	const handlerRefresh = () => {
		getData();
	};




	if (isLoading && dataProgram.length === 0) {
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
			{programSelected === null && (
				<View style={styles.mainContainer}>
					<Button onPress={handleSelectProgram}>
						Selecione um Programa
					</Button>
				</View>
			)}
			{programSelected !== null && (
				<SafeAreaView style={{flex: 1, marginBottom: tabBarHeight}}>
					<ProgramList
						innerRef={ref}
						refresh={handlerRefresh}
						isLoading={isLoading}
						setPrintableData={setPrintableData}
					/>
				</SafeAreaView>
			)}
			<BottomSheet ref={sheetRef} style={styles.bottomSheetStl}>
				<ScrollView>
					<BottomSheetList onClose={handleClose} />
				</ScrollView>
			</BottomSheet>
		</>
	);
};

const styles = StyleSheet.create({
	pressed: {
		opacity: 0.75
	},
	bottomSheetStl: {
		backgroundColor: Colors.primary[901],
		paddingHorizontal: 20
	},
	mainContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center"
	}
});

export default ProgramScreen;
