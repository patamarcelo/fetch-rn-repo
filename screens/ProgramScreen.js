import { useRef, useEffect, useState, useLayoutEffect } from "react";
import BottomSheet, { BottomSheetMethods } from "@devvie/bottom-sheet";

import IconButton from "../components/ui/IconButton";

import {
	ActivityIndicator,
	View,
	Text,
	StyleSheet,
	Pressable,
	ScrollView
} from "react-native";
import Button from "../components/ui/Button";

import { EXPO_PUBLIC_REACT_APP_DJANGO_TOKEN } from "@env";
import { Colors } from "../constants/styles";

import { useDispatch, useSelector } from "react-redux";
import { geralActions } from "../store/redux/geral";
import { programasSelector, programSelector, dataProgramSelector } from "../store/redux/selector";

import BottomSheetList from "../components/ProgramasScreen/BottomSheetList";

import { LINK } from "../utils/api";

import ProgramList from "../components/ProgramasScreen/ProgramList";
import { useScrollToTop } from "@react-navigation/native";

import * as Haptics from 'expo-haptics';

const ProgramScreen = ({ navigation }) => {
	const sheetRef = useRef(null);
	const [isLoading, setIsLoading] = useState();
	const ref = useRef(null);

	const dispatch = useDispatch();
	const {
		setProgramsAvaiable,
		setSelectedProgram,
		setDataProgram,
		setEstagiosProgram
	} = geralActions;
	const programasAvai = useSelector(programasSelector);
	const programSelected = useSelector(programSelector);
	const dataProgram = useSelector(dataProgramSelector);

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

	console.log('EXPO_PUBLIC_REACT_APP_DJANGO_TOKEN', EXPO_PUBLIC_REACT_APP_DJANGO_TOKEN)

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
			}
		});
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
			// console.log(data);
			dispatch(setProgramsAvaiable(data.programas));
			dispatch(setEstagiosProgram(data.estagios));
			dispatch(setDataProgram(data.dados));
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
						Selecione um programa
					</Button>
				</View>
			)}
			{programSelected !== null && (
				<ProgramList
					innerRef={ref}
					refresh={handlerRefresh}
					isLoading={isLoading}
				/>
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
