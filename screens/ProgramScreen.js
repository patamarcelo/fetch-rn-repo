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
import { programasSelector, programSelector } from "../store/redux/selector";

import BottomSheetList from "../components/ProgramasScreen/BottomSheetList";

import { LINK } from "../utils/api";

const ProgramScreen = ({ navigation }) => {
	const sheetRef = useRef(null);
	const [isLoading, setIsLoading] = useState();

	const dispatch = useDispatch();
	const { setProgramsAvaiable, setSelectedProgram } = geralActions;
	const programasAvai = useSelector(programasSelector);
	const programSelected = useSelector(programSelector);

	const programTitle = programSelected ? programSelected : "Programas";

	const handleSelectProgram = () => {
		console.log("selecionar um programa");
		sheetRef.current?.open();
	};

	const handleClose = () => {
		sheetRef.current?.close();
	};

	useEffect(() => {
		dispatch(setSelectedProgram(null));
	}, []);

	useEffect(() => {
		console.log(programasAvai);
	}, [programasAvai]);

	useEffect(() => {
		navigation.setOptions({
			title: programTitle.nome
		});
	}, [programTitle]);

	useLayoutEffect(() => {
		navigation.setOptions({
			title: "",
			tabBarLabel: "Programas",
			headerLeft: ({ tintColor }) => (
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
			)
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
			{programSelected === null && (
				<Button onPress={handleSelectProgram}>
					Selecione um programa
				</Button>
			)}
			<BottomSheet ref={sheetRef} style={styles.bottomSheetStl}>
				<ScrollView>
					<BottomSheetList onClose={handleClose} />
				</ScrollView>
			</BottomSheet>
		</View>
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
