import { useRef, useEffect, useState, useLayoutEffect, useMemo, useCallback } from "react";

import {
	BottomSheetModal,
	BottomSheetBackdrop,
	BottomSheetScrollView,
} from "@gorhom/bottom-sheet";

import IconButton from "../components/ui/IconButton";

import {
	ActivityIndicator,
	View,
	Text,
	StyleSheet,
	Pressable,
	ScrollView,
	Alert,
	StatusBar,
	Platform
	// SafeAreaView
} from "react-native";
import Button from "../components/ui/Button";
import { SafeAreaView } from "react-native-safe-area-context"; // e não da RN padrão
import { useSafeAreaInsets } from 'react-native-safe-area-context';


import { EXPO_PUBLIC_REACT_APP_DJANGO_TOKEN } from "@env";
import { Colors } from "../constants/styles";

import { useDispatch, useSelector } from "react-redux";
import { geralActions } from "../store/redux/geral";
import { programasSelector, programSelector, dataProgramSelector, selectAreaTotal } from "../store/redux/selector";

import BottomSheetList from "../components/ProgramasScreen/BottomSheetList";

import { LINK } from "../utils/api";

import ProgramList from "../components/ProgramasScreen/ProgramList";
import { useFocusEffect, useScrollToTop } from "@react-navigation/native";

import PrintProgramPage from "../components/Global/PrintProgramPage";

import * as Haptics from 'expo-haptics';
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";

// import { logout } from "../store/redux/authSlice";





const ProgramScreen = ({ navigation }) => {
	const sheetRef = useRef(null);
	const [isLoading, setIsLoading] = useState();
	const ref = useRef(null);
	const insets = useSafeAreaInsets();

	const tabBarHeight = Platform.OS === "ios" ? 84 : 72;
	const tabBarBottomOffset = Platform.OS === "ios" ? 6 : 8;
	const [isSheetOpen, setIsSheetOpen] = useState(false);




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
	const [isPrinting, setIsPrinting] = useState(false);

	useFocusEffect(
		useCallback(() => {
			StatusBar.setBarStyle("light-content");

			if (Platform.OS === "android") {
				StatusBar.setBackgroundColor(Colors.primary[901]);
			}
		}, [])
	);


	const handleOpenDrawer = () => {
		const parent = navigation.getParent?.();
		const grandParent = parent?.getParent?.();

		if (navigation.openDrawer) {
			navigation.openDrawer();
			return;
		}

		if (parent?.openDrawer) {
			parent.openDrawer();
			return;
		}

		if (grandParent?.openDrawer) {
			grandParent.openDrawer();
		}
	};

	const handleSelectProgram = () => {
		console.log("selecionar um programa");
		StatusBar.setBarStyle("light-content");
		sheetRef.current?.present();
		setIsSheetOpen(true);
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
	};

	const handleClose = () => {
		sheetRef.current?.dismiss();
		setIsSheetOpen(false);
	};

	const renderBackdrop = useCallback(
		(props) => (
			<BottomSheetBackdrop
				{...props}
				appearsOnIndex={0}
				disappearsOnIndex={-1}
				pressBehavior="close"
				opacity={0.35}
			/>
		),
		[]
	);

	useEffect(() => {
		console.log('sheetref', sheetRef.current)
	}, [sheetRef]);

	useEffect(() => {
		dispatch(setSelectedProgram(null));
	}, []);

	// useEffect(() => {
	// 	console.log(programasAvai);
	// }, [programasAvai]);




	const handlerPrintData = async () => {
		if (isPrinting || !programSelected) return;

		try {
			setIsPrinting(true);
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

			// dá tempo para o React renderizar o spinner antes do processamento do print
			await new Promise((resolve) => {
				requestAnimationFrame(() => {
					setTimeout(resolve, 80);
				});
			});

			console.log("print Program");

			const filteredProds = dataProgram
				.filter((data) => data.operacao__programa__nome === programSelected.nome)
				.sort((a, b) =>
					String(a.defensivo__tipo || "").localeCompare(
						String(b.defensivo__tipo || "")
					)
				);

			const onlyEstagios = filteredProds
				.sort((a, b) => a.operacao__prazo_dap - b.operacao__prazo_dap)
				.map((data) => `${data.operacao__estagio} | ${data.operacao__prazo_dap}`);

			const filteredEstagios = [...new Set(onlyEstagios)];

			const areaTotalProgram = areaTotalPrograms.find(
				(program) => program.programa__nome === programSelected.nome
			);

			await Promise.resolve(
				PrintProgramPage(
					programSelected,
					filteredProds,
					filteredEstagios,
					areaTotalProgram
				)
			);
		} catch (error) {
			console.log("erro ao imprimir programa", error);
			Alert.alert("Erro ao imprimir", "Não foi possível gerar a impressão do programa.");
		} finally {
			setIsPrinting(false);
		}
	};

	// const handleLogout = () => {
	// 	Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
	// 	dispatch(logout());
	// };

	useEffect(() => {
		const hasProgramSelected = !!programSelected;

		navigation.setOptions({
			headerShadowVisible: false,

			/*
			 * Força o header a não usar aparência translúcida/blur no iOS.
			 */
			headerTransparent: false,

			headerStyle: {
				backgroundColor: Colors.primary[901],
			},

			headerBackground: () => (
				<View
					style={{
						flex: 1,
						backgroundColor: Colors.primary[901],
					}}
				/>
			),

			headerTintColor: "#FFFFFF",

			headerTitleStyle: {
				color: "#FFFFFF",
				fontWeight: "900",
			},

			headerLeftContainerStyle: {
				paddingLeft: 8,
				backgroundColor: Colors.primary[901],
			},

			headerRightContainerStyle: {
				paddingRight: 8,
				backgroundColor: Colors.primary[901],
			},

			title: programSelected
				? programSelected.nome_fantasia
					?.replace("Programa", "")
					?.replace("Aplicação ", "")
				: "Programas",

			headerLeft: () => (
				<Pressable
					onPress={handleOpenDrawer}
					hitSlop={12}
					style={({ pressed }) => [
						styles.headerIconButtonForced,
						pressed && styles.headerIconButtonForcedPressed,
					]}
				>
					<Ionicons
						name="menu-outline"
						size={30}
						color="#FFFFFF"
					/>
				</Pressable>
			),

			headerRight: () => {
				if (!hasProgramSelected) {
					return null;
				}

				return (
					<Pressable
						onPress={handlerPrintData}
						disabled={isPrinting}
						hitSlop={12}
						style={({ pressed }) => [
							styles.headerIconButtonForced,
							pressed &&
							!isPrinting &&
							styles.headerIconButtonForcedPressed,
							isPrinting && styles.headerIconButtonLoading,
						]}
					>
						{isPrinting ? (
							<ActivityIndicator
								size="small"
								color="#FFFFFF"
							/>
						) : (
							<FontAwesome5
								name="print"
								size={20}
								color="#FFFFFF"
							/>
						)}
					</Pressable>
				);
			},
		});
	}, [
		navigation,
		programSelected,
		isPrinting,
		dataProgram,
		areaTotalPrograms,
	]);

	const scrollToTopRef = useRef({
		scrollToTop: () => {
			try {
				ref.current?.scrollToLocation?.({
					sectionIndex: 0,
					itemIndex: 0,
					animated: true,
					viewOffset: 0,
				});
			} catch (error) {
				console.log("Erro ao voltar SectionList para o topo:", error);
			}
		},
	});

	useScrollToTop(scrollToTopRef);

	useLayoutEffect(() => {
		navigation.setOptions({
			tabBarLabel: "Programas",
		});
	}, [navigation]);

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

	const snapPoints = useMemo(() => ["72%", "100%"], []);



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
				<SafeAreaView
					style={{ flex: 1, marginTop: -10 }}
					edges={['left', 'right']} // 👈 IGNORA o 'bottom'
				>
					<ProgramList
						innerRef={ref}
						refresh={handlerRefresh}
						isLoading={isLoading}
						setPrintableData={setPrintableData}
					/>
				</SafeAreaView>
			)}
			{programSelected !== null && !isSheetOpen && (
				<Pressable
					onPress={handleSelectProgram}
					style={({ pressed }) => [
						styles.programFilterFab,
						pressed && styles.programFilterFabPressed,
						{
							bottom: Platform.OS === 'ios' ? tabBarHeight + tabBarBottomOffset : tabBarBottomOffset + 10,
						}
					]}
				>
					<IconButton
						type="awesome"
						icon="filter"
						color={Colors.primary[800]}
						size={16}
						onPress={handleSelectProgram}
						btnStyles={styles.programFilterFabIcon}
					/>

					<View style={styles.programFilterFabTextBox}>
						<Text style={styles.programFilterFabLabel}>Programa</Text>
						<Text style={styles.programFilterFabValue} numberOfLines={1}>
							{programSelected?.nome_fantasia
								?.replace("Programa", "")
								?.replace("Aplicação ", "") || "Selecionado"}
						</Text>
					</View>
				</Pressable>
			)}
			<BottomSheetModal
				ref={sheetRef}
				index={0}
				snapPoints={snapPoints}
				topInset={Platform.OS === "ios" ? insets.top : 0}
				enablePanDownToClose
				backdropComponent={renderBackdrop}
				onDismiss={() => {
					StatusBar.setBarStyle("light-content");

					if (Platform.OS === "android") {
						StatusBar.setBackgroundColor(Colors.primary[901]);
					}

					setIsSheetOpen(false);
				}}
				backgroundStyle={{ backgroundColor: Colors.primary[901] }}
				handleIndicatorStyle={{ backgroundColor: "#fff" }}
			>
				<BottomSheetScrollView
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator
					style={styles.bottomSheetScroll}
					contentContainerStyle={styles.bottomSheetScrollContent}
				>
					<BottomSheetList onClose={handleClose} />
				</BottomSheetScrollView>
			</BottomSheetModal>

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
	},
	headerPrintButton: {
		width: 42,
		height: 42,
		borderRadius: 21,
		alignItems: "center",
		justifyContent: "center",
		marginLeft: 5,
		marginTop: 4,
	},

	headerPrintButtonLoading: {
		opacity: 0.75,
	},

	headerPrintIcon: {
		marginLeft: 0,
		marginTop: 0,
	},
	headerLeftActions: {
		flexDirection: "row",
		alignItems: "center",
		// marginLeft: 14,
		marginTop: 6,
	},

	headerRightActions: {
		flexDirection: "row",
		alignItems: "center",
		// marginRight: 10,
	},

	headerMenuButton: {
		marginLeft: 0,
		marginTop: 0,
	},

	programFilterFab: {
		position: "absolute",
		left: 16,
		zIndex: 9999,
		elevation: 20,
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		backgroundColor: "#E8EEF7",
		borderRadius: 999,
		paddingLeft: 10,
		paddingRight: 14,
		paddingVertical: 10,
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.12)",
		shadowColor: "#000",
		shadowOpacity: 0.18,
		shadowRadius: 14,
		shadowOffset: { width: 0, height: 8 },
	},

	programFilterFabPressed: {
		opacity: 0.82,
		transform: [{ scale: 0.98 }],
	},

	programFilterFabIcon: {
		marginLeft: 0,
		marginTop: 0,
	},

	programFilterFabTextBox: {
		maxWidth: 170,
	},

	programFilterFabLabel: {
		color: "#0F172A",
		fontSize: 11,
		fontWeight: "900",
	},

	programFilterFabValue: {
		marginTop: 1,
		color: "rgba(15,23,42,0.54)",
		fontSize: 10,
		fontWeight: "800",
	},
	bottomSheetContainer: {
		zIndex: 99999,
		elevation: 99999,
	},
	headerIconButton: {
		width: 42,
		height: 42,
		borderRadius: 21,
		alignItems: "center",
		justifyContent: "center",

		backgroundColor: "rgba(255,255,255,0.12)",

		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.28)",

		marginTop: 2,
	},

	headerIconButtonPressed: {
		backgroundColor: "rgba(255,255,255,0.22)",
		borderColor: "rgba(255,255,255,0.42)",
		transform: [{ scale: 0.96 }],
	},

	headerIconButtonPressed: {
		backgroundColor: "rgba(255,255,255,0.10)",
		transform: [{ scale: 0.96 }],
	},

	headerIconButtonLoading: {
		opacity: 0.65,
	},
	bottomSheetScroll: {
		flex: 1,
		backgroundColor: Colors.primary[901],
	},

	bottomSheetScrollContent: {
		paddingBottom: 120,
		backgroundColor: Colors.primary[901],
	},
});

export default ProgramScreen;
