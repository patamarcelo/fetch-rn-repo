import {
	StyleSheet,
	Pressable,
	View,
	Alert,
	ActivityIndicator,
	RefreshControl,
	ScrollView,
	Text,
	Share,
} from "react-native";

import { useEffect, useMemo, useRef, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { captureRef } from "react-native-view-shot";
import * as Haptics from "expo-haptics";

import { LINK } from "../utils/api";
import { EXPO_PUBLIC_REACT_APP_DJANGO_TOKEN } from "@env";

import FarmsPlantioScreen from "../components/Plantio";
import { Colors } from "../constants/styles";

import { useDispatch, useSelector } from "react-redux";
import { geralActions } from "../store/redux/geral";
import ProgressCircleCard from "../components/Plantio/Geral";

import {
	selectColheitaActiveSafraCiclo,
	selectColheitaData,
	selectRawColheitaData,
	selectColheitaTotals,
	selectColheitaDataToggle,
} from "../store/redux/selector";

// import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import Icon from "@expo/vector-icons/MaterialCommunityIcons";
import FilterPlantioScreen from "../components/Global/FilterPlantioComponent";

import {
	CUSTOM_TAB_BAR_CONTENT_PADDING,
} from "../constants/layout";

const PlantioScreen = () => {
	const dispatch = useDispatch();

	// Importante:
	// Não capturar o ScrollView diretamente.
	// Capturamos uma View interna com todo o conteúdo da lista.
	const contentCaptureRef = useRef(null);

	const { setColheitaData, clearColheitaFilter } = geralActions;

	const rawColheitaData = useSelector(selectRawColheitaData);
	const colheitaData = useSelector(selectColheitaData);
	const activeSafraCiclo = useSelector(selectColheitaActiveSafraCiclo);
	const totals = useSelector(selectColheitaTotals);
	const filters = useSelector(selectColheitaDataToggle);

	const [isLoadingData, setIsLoadingData] = useState(false);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [isSharingPrint, setIsSharingPrint] = useState(false);
	const [isCapturingFullContent, setIsCapturingFullContent] = useState(false);

	

	const isPlantioMode = String(
		activeSafraCiclo?.nome || activeSafraCiclo?.label || ""
	)
		.toLowerCase()
		.includes("plantio");

	const activeContext = useMemo(() => {
		let main = null;
		const details = [];

		if (activeSafraCiclo) {
			const nome = activeSafraCiclo?.label || activeSafraCiclo?.nome;
			const safra = activeSafraCiclo?.safra;
			const ciclo = activeSafraCiclo?.ciclo;

			if (nome || safra || ciclo) {
				main = `${nome || "Filtro"} • ${safra || "-"} • Ciclo ${ciclo || "-"}`;
			}
		}

		const formatLimitedList = (items = [], limit = 4) => {
			const cleanItems = items
				.filter(Boolean)
				.map((item) => String(item).trim())
				.filter(Boolean);

			if (!cleanItems.length) return null;

			const visibleItems = cleanItems.slice(0, limit);
			const hiddenCount = cleanItems.length - visibleItems.length;

			return hiddenCount > 0
				? `${visibleItems.join(", ")} +${hiddenCount}`
				: visibleItems.join(", ");
		};

		if (filters?.farm?.length > 0) {
			const farmText = formatLimitedList(
				filters.farm.map((item) => String(item).replace("Fazenda", "Faz.")),
				3
			);

			if (farmText) details.push(farmText);
		}

		if (filters?.proj?.length > 0) {
			const projText = formatLimitedList(
				filters.proj.map((item) => String(item).replace("Projeto", "Proj.")),
				3
			);

			if (projText) details.push(projText);
		}

		if (filters?.culture?.length > 0) {
			const cultureText = formatLimitedList(filters.culture, 4);

			if (cultureText) details.push(cultureText);
		}

		if (filters?.variety?.length > 0) {
			const varietyText = formatLimitedList(filters.variety, 5);

			if (varietyText) details.push(varietyText);
		}

		return {
			main,
			details: details.join(" • "),
		};
	}, [activeSafraCiclo, filters]);

	const fetchPlantioData = async ({
		showSuccessAlert = false,
		refreshing = false,
	} = {}) => {
		if (refreshing) {
			setIsRefreshing(true);
		} else {
			setIsLoadingData(true);
		}

		try {
			const response = await fetch(
				LINK + "/plantio/get_colheita_plantio_info_react_native/",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Token ${EXPO_PUBLIC_REACT_APP_DJANGO_TOKEN}`,
					},
				}
			);

			if (response.status === 200) {
				const data = await response.json();

				dispatch(setColheitaData(data));

				if (showSuccessAlert) {
					Alert.alert("Tudo Certo", "Dados atualizados com sucesso!!");
				}

				return data;
			}

			const errorText = await response.text();

			Alert.alert(
				"Problema em atualizar os dados",
				`Status ${response.status}: ${errorText}`
			);
		} catch (error) {
			console.error(error);
			Alert.alert("Problema em atualizar o banco de dados", `Erro: ${error}`);
		} finally {
			setIsLoadingData(false);
			setIsRefreshing(false);
		}
	};

	useEffect(() => {
		if (!rawColheitaData) {
			fetchPlantioData();
		}
	}, []);

	const handleUpdateApiData = async () => {
		await fetchPlantioData({
			showSuccessAlert: true,
			refreshing: true,
		});
	};

	const handleClearFilters = () => {
		dispatch(clearColheitaFilter());
	};

	const waitFrame = () =>
		new Promise((resolve) => requestAnimationFrame(resolve));

	const handleSharePrint = async () => {
		if (!contentCaptureRef.current || isSharingPrint) return;

		try {
			setIsSharingPrint(true);
			setIsCapturingFullContent(true);

			await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

			// Aguarda o React esconder o botão da câmera antes da captura.
			await waitFrame();
			await waitFrame();

			const uri = await captureRef(contentCaptureRef.current, {
				format: "png",
				quality: 1,
				result: "tmpfile",
			});

			await Share.share({
				url: uri,
				message: `Relatório de ${activeContext?.main || "Plantio/Colheita"}`,
			});
		} catch (error) {
			console.error("Erro ao gerar/compartilhar print completo:", error);

			Alert.alert(
				"Não foi possível enviar o print",
				"Tente novamente em alguns segundos."
			);
		} finally {
			setIsCapturingFullContent(false);
			setIsSharingPrint(false);
		}
	};

	const visibleGroupedData = colheitaData?.grouped_data || [];
	const hasVisibleData = visibleGroupedData.length > 0;

	if (isLoadingData) {
		return (
			<View style={styles.containerActivity}>
				<ActivityIndicator size="large" color="#1E90FF" />
			</View>
		);
	}

	return (
		<GestureHandlerRootView style={styles.containerGesture}>
			{isRefreshing && (
				<View style={styles.customRefreshContainer}>
					<ActivityIndicator size="large" color="#1E90FF" />

					<Text style={styles.customRefreshText}>Atualizando Dados...</Text>
				</View>
			)}

			<ScrollView
				style={styles.scrollView}
				contentContainerStyle={[
					styles.scrollContent,
					{ paddingBottom: CUSTOM_TAB_BAR_CONTENT_PADDING },
				]}
				contentInsetAdjustmentBehavior="automatic"
				refreshControl={
					<RefreshControl
						refreshing={isRefreshing}
						onRefresh={handleUpdateApiData}
						colors={["#1E90FF"]}
						tintColor="#1E90FF"
					/>
				}
			>
				<View
					ref={contentCaptureRef}
					collapsable={false}
					style={styles.captureContent}
				>
					{!!activeContext?.main && (
						<View style={styles.activeContextBar}>
							<View style={styles.activeContextIcon}>
								<Icon
									name={isPlantioMode ? "sprout-outline" : "tractor"}
									size={18}
									color={Colors.primary[800]}
								/>
							</View>

							<View style={styles.activeContextTextBox}>
								<Text style={styles.activeContextLabel}>Visualização atual</Text>

								<Text style={styles.activeContextTitle} numberOfLines={1}>
									{activeContext.main}
								</Text>

								{!!activeContext.details && (
									<Text style={styles.activeContextDetails} numberOfLines={2}>
										{activeContext.details}
									</Text>
								)}
							</View>

							{!isCapturingFullContent && (
								<Pressable
									onPress={handleSharePrint}
									disabled={isSharingPrint}
									hitSlop={8}
									style={({ pressed }) => [
										styles.printButton,
										pressed && styles.pressed,
										isSharingPrint && styles.printButtonDisabled,
									]}
								>
									{isSharingPrint ? (
										<ActivityIndicator
											size="small"
											color={Colors.primary[800]}
										/>
									) : (
										<Icon
											name="camera-outline"
											size={20}
											color={Colors.primary[800]}
										/>
									)}
								</Pressable>
							)}
						</View>
					)}

					{hasVisibleData && (
						<>
							<ProgressCircleCard
								sownArea={totals.realizado}
								plannedArea={totals.previsto}
								scsTotal={isPlantioMode ? 0 : totals.scsTotal}
								mediaGeral={isPlantioMode ? 0 : totals.mediaGeral}
								title={isPlantioMode ? "Plantado" : "Colhido"}
								plannedTitle={isPlantioMode ? "Previsto" : "Plantado"}
								abovePlannedTitle={isPlantioMode ? "A Plantar" : "A Colher"}
								showHarvestStats={!isPlantioMode}
							/>

							{visibleGroupedData.map((data, i) => {
								const newArr = (colheitaData?.data || []).filter(
									(item) => item.talhao__fazenda__nome === data.farm
								);

								const onlyCargas = newArr.flatMap((item) =>
									(item.cargas || []).map((carga) => ({
										...carga,
										variedade__cultura__cultura:
											item.variedade__cultura__cultura,
										variedade__nome_fantasia:
											item.variedade__nome_fantasia,
									}))
								);

								return (
									<FarmsPlantioScreen
										data={data}
										key={`${data.farm}-${i}`}
										newData={onlyCargas}
										isPlantioMode={isPlantioMode}
									/>
								);
							})}
						</>
					)}

					{!hasVisibleData && rawColheitaData && (
						<View style={styles.emptyCard}>
							<Icon
								name="magnify-remove-outline"
								size={48}
								color={Colors.secondary[400]}
							/>

							<Text style={styles.emptyTitle}>
								Nenhum resultado encontrado com os filtros selecionados.
							</Text>

							<Pressable
								onPress={handleClearFilters}
								style={({ pressed }) => [
									styles.clearButton,
									pressed && styles.pressed,
								]}
							>
								<Text style={styles.clearButtonText}>Limpar Filtros</Text>
							</Pressable>
						</View>
					)}
				</View>
			</ScrollView>

			{rawColheitaData?.filter_data && <FilterPlantioScreen />}
		</GestureHandlerRootView>
	);
};

export default PlantioScreen;

const styles = StyleSheet.create({
	containerGesture: {
		flex: 1,
	},

	scrollView: {
		flex: 1,
		backgroundColor: "#FFFFFF",
	},

	scrollContent: {
		flexGrow: 1,
		backgroundColor: "#FFFFFF",
	},

	captureContent: {
		width: "100%",
		backgroundColor: "#FFFFFF",
		paddingBottom: 12,
	},

	containerActivity: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},

	customRefreshContainer: {
		paddingVertical: 14,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "rgba(30,144,255,0.08)",
		borderBottomWidth: 1,
		borderColor: "rgba(30,144,255,0.25)",
	},

	customRefreshText: {
		marginTop: 8,
		fontSize: 12,
		fontWeight: "700",
		color: "#1E90FF",
	},

	activeContextBar: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		paddingHorizontal: 12,
		paddingVertical: 10,
		backgroundColor: Colors.primary[700],
		borderBottomWidth: 1,
		borderBottomColor: "rgba(255,255,255,0.12)",
	},

	activeContextIcon: {
		width: 34,
		height: 34,
		borderRadius: 17,
		backgroundColor: "rgba(255,255,255,0.88)",
		alignItems: "center",
		justifyContent: "center",
	},

	activeContextTextBox: {
		flex: 1,
		minWidth: 0,
	},

	activeContextLabel: {
		fontSize: 10,
		fontWeight: "800",
		color: "rgba(255,255,255,0.62)",
	},

	activeContextTitle: {
		marginTop: 1,
		fontSize: 13,
		fontWeight: "900",
		color: "#FFFFFF",
		lineHeight: 17,
	},

	activeContextDetails: {
		marginTop: 2,
		fontSize: 10,
		fontWeight: "700",
		color: "rgba(255,255,255,0.72)",
		lineHeight: 14,
	},

	printButton: {
		width: 36,
		height: 36,
		borderRadius: 18,
		backgroundColor: "rgba(255,255,255,0.88)",
		alignItems: "center",
		justifyContent: "center",
	},

	printButtonDisabled: {
		opacity: 0.7,
	},

	emptyCard: {
		padding: 20,
		margin: 20,
		backgroundColor: Colors.secondary[50],
		borderRadius: 12,
		borderWidth: 1,
		borderColor: Colors.secondary[200],
		alignItems: "center",
		justifyContent: "center",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 6,
		elevation: 3,
	},

	emptyTitle: {
		marginTop: 12,
		fontSize: 16,
		fontWeight: "500",
		color: Colors.secondary[600],
		textAlign: "center",
	},

	clearButton: {
		marginTop: 20,
		backgroundColor: Colors.primary[500],
		paddingVertical: 10,
		paddingHorizontal: 20,
		borderRadius: 8,
	},

	clearButtonText: {
		color: "#fff",
		fontWeight: "600",
	},

	pressed: {
		opacity: 0.8,
	},
});