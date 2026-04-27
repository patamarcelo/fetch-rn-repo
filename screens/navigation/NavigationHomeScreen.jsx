// screens/navigation/NavigationHomeScreen.jsx

import { useCallback, useMemo, useState } from "react";

import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	ScrollView,
	Platform,
	ActivityIndicator,
	RefreshControl,
} from "react-native";

import { setStatusBarStyle, setStatusBarBackgroundColor } from "expo-status-bar";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useDispatch, useSelector } from "react-redux";

import Ionicons from "@expo/vector-icons/Ionicons";
import { Colors } from "../../constants/styles";

import { geralActions } from "../../store/redux/geral";
import {
	selectNavigationMapData,
	selectNavigationMapStatus,
	selectNavigationMapError,
	selectNavigationMapTotals,
	selectNavigationMapCurrentSafra,
	selectNavigationMapCurrentCiclo,
} from "../../store/redux/selector";

import { fetchNavigationMapData } from "../../store/redux/geral";



const formatHa = (value) => {
	if (value === null || value === undefined || Number.isNaN(Number(value))) {
		return "—";
	}

	return `${Number(value).toLocaleString("pt-BR", {
		minimumFractionDigits: 0,
		maximumFractionDigits: 2,
	})} ha`;
};

const normalizeProjectName = (name) => {
	if (!name) return "Projeto";
	return String(name).replace("Projeto ", "");
};

const groupNavigationDataByFarm = (data = []) => {
	const safeData = Array.isArray(data) ? data : [];
	const grouped = {};

	safeData.forEach((item) => {
		const farmName = item?.fazenda_grupo || "Sem fazenda";
		const projectName = item?.projeto || "Sem projeto";

		if (!grouped[farmName]) {
			grouped[farmName] = {
				fazenda_nome: farmName,
				fazenda_id: farmName,
				total_area: 0,
				total_parcelas: 0,
				projetosMap: {},
			};
		}

		if (!grouped[farmName].projetosMap[projectName]) {
			grouped[farmName].projetosMap[projectName] = {
				projeto_nome: projectName,
				projeto_id: item?.projeto_id || projectName,
				id_farmbox: item?.projeto_id_farmbox || null,
				map_centro_id: item?.map?.projeto_center || item?.map?.center || null,
				map_zoom: item?.map?.projeto_zoom || null,
				area_produtiva: 0,
				total_parcelas: 0,
				parcelas: [],
			};
		}

		const area = Number(item?.area || 0);

		grouped[farmName].total_area += area;
		grouped[farmName].total_parcelas += 1;

		grouped[farmName].projetosMap[projectName].area_produtiva += area;
		grouped[farmName].projetosMap[projectName].total_parcelas += 1;
		grouped[farmName].projetosMap[projectName].parcelas.push(item);
	});

	return Object.values(grouped)
		.map((farm) => ({
			...farm,
			projetos: Object.values(farm.projetosMap).sort((a, b) =>
				String(a.projeto_nome).localeCompare(String(b.projeto_nome))
			),
		}))
		.sort((a, b) => String(a.fazenda_nome).localeCompare(String(b.fazenda_nome)));
};



const NavigationHomeSkeleton = () => {
	return (
		<View style={styles.skeletonContainer}>
			{[1, 2, 3, 4, 5].map((item) => (
				<View key={item} style={styles.skeletonCard}>
					<View style={styles.skeletonMainRow}>
						<View style={styles.skeletonIcon} />

						<View style={styles.skeletonContent}>
							<View style={styles.skeletonTitle} />
							<View style={styles.skeletonMeta} />

							<View style={styles.skeletonChipRow}>
								<View style={styles.skeletonChip} />
								<View style={styles.skeletonChipSmall} />
								<View style={styles.skeletonChipSmall} />
							</View>
						</View>
					</View>

					<View style={styles.skeletonFooter}>
						<View style={styles.skeletonFooterText} />
						<View style={styles.skeletonButton} />
					</View>
				</View>
			))}
		</View>
	);
};

const NavigationHomeScreen = ({ navigation }) => {
	const dispatch = useDispatch();

	const navigationMapDataRaw = useSelector(selectNavigationMapData);
	const navigationMapStatus = useSelector(selectNavigationMapStatus);
	const navigationMapError = useSelector(selectNavigationMapError);
	const navigationMapTotals = useSelector(selectNavigationMapTotals);
	const currentSafra = useSelector(selectNavigationMapCurrentSafra);
	const currentCiclo = useSelector(selectNavigationMapCurrentCiclo);

	const navigationMapData = Array.isArray(navigationMapDataRaw)
		? navigationMapDataRaw
		: [];

	const [expandedFarmId, setExpandedFarmId] = useState(null);

	const farmsData = useMemo(() => {
		return groupNavigationDataByFarm(navigationMapData);
	}, [navigationMapData]);

	const summary = useMemo(() => {
		const totalFarms = farmsData.length;
		const totalProjects = farmsData.reduce(
			(total, farm) => total + farm.projetos.length,
			0
		);

		return {
			totalFarms,
			totalProjects,
			totalParcels:
				navigationMapTotals?.total_parcelas || navigationMapData.length || 0,
			totalArea: navigationMapTotals?.area_total || 0,
		};
	}, [farmsData, navigationMapData.length, navigationMapTotals]);

	const handleRefreshNavigationData = useCallback(() => {
		dispatch(fetchNavigationMapData());
	}, [dispatch]);

	useFocusEffect(
		useCallback(() => {
			dispatch(geralActions.hydrateNavigationMapState());

			setStatusBarStyle("dark");
			setStatusBarBackgroundColor("#D6E3F3", true);

			return () => {
				setStatusBarStyle("light");
				setStatusBarBackgroundColor(Colors.primary[901], true);
			};
		}, [dispatch])
	);

	const handleToggleDetails = (farmId) => {
		setExpandedFarmId((current) => (current === farmId ? null : farmId));
	};

	const handleOpenFarmMap = (farm) => {
		dispatch(geralActions.setNavigationMapSelectedFarm(farm.fazenda_nome));
		dispatch(geralActions.setNavigationMapSelectedProject(null));
		dispatch(geralActions.clearNavigationMapSelectedParcels());

		const parentNavigation = navigation.getParent();
		const rootNavigation =
			parentNavigation?.getParent?.() || parentNavigation || navigation;

		rootNavigation.navigate("NavigationMapScreen", {
			farmName: farm.fazenda_nome,
			selectedFarm: farm.fazenda_nome,
			selectedProject: null,
			safra: currentSafra,
			ciclo: currentCiclo,
		});
	};

	const handleOpenProjectMap = (farm, project) => {
		dispatch(geralActions.setNavigationMapSelectedFarm(farm.fazenda_nome));
		dispatch(geralActions.setNavigationMapSelectedProject(project.projeto_nome));
		dispatch(geralActions.clearNavigationMapSelectedParcels());

		const parentNavigation = navigation.getParent();
		const rootNavigation =
			parentNavigation?.getParent?.() || parentNavigation || navigation;

		rootNavigation.navigate("NavigationMapScreen", {
			farmName: farm.fazenda_nome,
			projectName: project.projeto_nome,
			selectedFarm: farm.fazenda_nome,
			selectedProject: project.projeto_nome,
			safra: currentSafra,
			ciclo: currentCiclo,
		});
	};

	const hasData = farmsData.length > 0;
	const isFirstLoading = navigationMapStatus === "pending" && !hasData;
	const isRefreshing = navigationMapStatus === "pending" && hasData;
	const hasError = navigationMapStatus === "failed" || !!navigationMapError;

	return (
		<SafeAreaView style={styles.safeArea} edges={["top"]}>
			<View style={styles.container}>
				<View style={styles.header}>
					<View style={styles.headerTextBox}>
						<Text style={styles.title}>Navegação</Text>

						<Text style={styles.subtitle}>
							Selecione uma fazenda para abrir o mapa operacional.
						</Text>
					</View>

					<View style={styles.summaryPill}>
						<Ionicons name="map-outline" size={16} color={Colors.primary[700]} />

						<Text style={styles.summaryPillText}>
							{summary.totalFarms} fazendas · {summary.totalProjects} projetos
						</Text>
					</View>

					<View style={styles.filterInfoPill}>
						<Text style={styles.filterInfoText}>
							Safra {currentSafra || "—"} · Ciclo {currentCiclo || "—"} ·{" "}
							{summary.totalParcels} parcelas · {formatHa(summary.totalArea)}
						</Text>
					</View>

					{isRefreshing && (
						<View style={styles.refreshPill}>
							<View style={styles.refreshSpinnerBox}>
								<ActivityIndicator size="small" color={Colors.primary[700]} />
							</View>

							<View>
								<Text style={styles.refreshPillText}>Atualizando dados</Text>
								<Text style={styles.refreshPillSubText}>Sincronizando parcelas e projetos...</Text>
							</View>
						</View>
					)}
				</View>

				{isFirstLoading ? (
					<NavigationHomeSkeleton />
				) : hasError && !hasData ? (
					<View style={styles.emptyBox}>
						<Ionicons name="warning-outline" size={30} color="#B45309" />
						<Text style={styles.emptyTitle}>Não foi possível carregar</Text>
						<Text style={styles.emptyText}>
							{navigationMapError || "Erro ao carregar dados de navegação."}
						</Text>
					</View>
				) : !hasData ? (
					<View style={styles.emptyBox}>
						<Ionicons name="map-outline" size={30} color={Colors.primary[700]} />
						<Text style={styles.emptyTitle}>Nenhum dado encontrado</Text>
						<Text style={styles.emptyText}>
							Não há parcelas disponíveis para a safra/ciclo atual.
						</Text>
					</View>
				) : (
					<ScrollView
						style={styles.scroll}
						contentContainerStyle={styles.scrollContent}
						showsVerticalScrollIndicator={false}
						refreshControl={
							<RefreshControl
								refreshing={isRefreshing}
								onRefresh={handleRefreshNavigationData}
								tintColor={Colors.primary[700]}
								colors={[Colors.primary[700]]}
								progressBackgroundColor="#FFFFFF"
							/>
						}
					>
						{farmsData.map((farm) => {
							const isExpanded = expandedFarmId === farm.fazenda_id;

							const visibleProjects = farm.projetos.slice(0, 3);
							const hiddenProjectsCount = Math.max(farm.projetos.length - 3, 0);

							return (
								<View key={farm.fazenda_id} style={styles.farmCard}>
									<TouchableOpacity
										activeOpacity={0.88}
										onPress={() => handleOpenFarmMap(farm)}
										style={styles.farmMainButton}
									>
										<View style={styles.farmIconBox}>
											<Ionicons
												name="navigate-outline"
												size={21}
												color="#FFFFFF"
											/>
										</View>

										<View style={styles.farmContent}>
											<Text style={styles.farmName} numberOfLines={1}>
												{farm.fazenda_nome}
											</Text>

											<Text style={styles.farmMeta} numberOfLines={1}>
												{farm.projetos.length}{" "}
												{farm.projetos.length === 1 ? "projeto" : "projetos"} ·{" "}
												{farm.total_parcelas} parcelas · {formatHa(farm.total_area)}
											</Text>

											<View style={styles.projectPreviewRow}>
												{visibleProjects.map((project) => (
													<View
														key={project.projeto_id}
														style={styles.projectMiniChip}
													>
														<Text
															style={styles.projectMiniChipText}
															numberOfLines={1}
														>
															{normalizeProjectName(project.projeto_nome)}
														</Text>
													</View>
												))}

												{hiddenProjectsCount > 0 && (
													<View style={styles.projectMoreChip}>
														<Text style={styles.projectMoreChipText}>
															+{hiddenProjectsCount}
														</Text>
													</View>
												)}
											</View>
										</View>

										<Ionicons
											name="chevron-forward"
											size={22}
											color="rgba(15,23,42,0.38)"
										/>
									</TouchableOpacity>

									<View style={styles.cardFooter}>
										<TouchableOpacity
											activeOpacity={0.82}
											onPress={() => handleToggleDetails(farm.fazenda_id)}
											style={styles.detailsButton}
										>
											<Text style={styles.detailsButtonText}>
												{isExpanded ? "Ocultar detalhes" : "Ver detalhes"}
											</Text>

											<Ionicons
												name={isExpanded ? "chevron-up" : "chevron-down"}
												size={16}
												color={Colors.primary[700]}
											/>
										</TouchableOpacity>

										<TouchableOpacity
											activeOpacity={0.88}
											onPress={() => handleOpenFarmMap(farm)}
											style={styles.openButton}
										>
											<Text style={styles.openButtonText}>Abrir mapa</Text>
										</TouchableOpacity>
									</View>

									{isExpanded && (
										<View style={styles.expandedBox}>
											<View style={styles.expandedMetricsRow}>
												<View style={styles.expandedMetric}>
													<Text style={styles.expandedMetricLabel}>Área total</Text>
													<Text style={styles.expandedMetricValue}>
														{formatHa(farm.total_area)}
													</Text>
												</View>

												<View style={styles.expandedMetric}>
													<Text style={styles.expandedMetricLabel}>Parcelas</Text>
													<Text style={styles.expandedMetricValue}>
														{farm.total_parcelas}
													</Text>
												</View>
											</View>

											<View style={styles.expandedProjects}>
												{farm.projetos.map((project) => {
													const hasMapCenter =
														!!project?.map_centro_id?.lat ||
														!!project?.map_centro_id?.latitude;

													return (
														<TouchableOpacity
															key={project.projeto_id}
															activeOpacity={0.84}
															onPress={() => handleOpenProjectMap(farm, project)}
															style={styles.expandedProjectRow}
														>
															<View
																style={[
																	styles.projectDot,
																	{
																		backgroundColor: hasMapCenter
																			? "#16A34A"
																			: "#CBD5E1",
																	},
																]}
															/>

															<Text
																style={styles.expandedProjectName}
																numberOfLines={1}
															>
																{project.projeto_nome}
															</Text>

															<Text style={styles.expandedProjectArea}>
																{formatHa(project.area_produtiva)}
															</Text>
														</TouchableOpacity>
													);
												})}
											</View>
										</View>
									)}
								</View>
							);
						})}
					</ScrollView>
				)}
			</View>
		</SafeAreaView>
	);
};

export default NavigationHomeScreen;

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: "#D6E3F3",
	},
	container: {
		flex: 1,
		backgroundColor: "#D6E3F3",
		paddingTop: Platform.OS === "android" ? 18 : 0,
	},
	header: {
		paddingHorizontal: 18,
		paddingTop: 10,
		paddingBottom: 10,
	},
	headerTextBox: {
		marginBottom: 10,
	},
	title: {
		color: Colors.primary[900],
		fontSize: 23,
		fontWeight: "900",
		letterSpacing: -0.5,
	},
	subtitle: {
		marginTop: 3,
		color: "rgba(15,23,42,0.62)",
		fontSize: 13,
		lineHeight: 18,
		fontWeight: "600",
	},
	summaryPill: {
		alignSelf: "flex-start",
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		backgroundColor: "rgba(255,255,255,0.82)",
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.08)",
		paddingHorizontal: 11,
		paddingVertical: 7,
		borderRadius: 999,
	},
	summaryPillText: {
		color: Colors.primary[800],
		fontSize: 12,
		fontWeight: "800",
	},
	filterInfoPill: {
		alignSelf: "flex-start",
		marginTop: 8,
		backgroundColor: "rgba(15,23,42,0.06)",
		borderRadius: 999,
		paddingHorizontal: 11,
		paddingVertical: 6,
	},
	filterInfoText: {
		color: "rgba(15,23,42,0.64)",
		fontSize: 11,
		fontWeight: "800",
	},
	refreshPill: {
		alignSelf: "flex-start",
		marginTop: 8,
		flexDirection: "row",
		alignItems: "center",
		gap: 9,
		backgroundColor: "rgba(255,255,255,0.86)",
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.07)",
		borderRadius: 16,
		paddingHorizontal: 10,
		paddingVertical: 8,
		shadowColor: "#000",
		shadowOpacity: 0.06,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 5 },
		elevation: 1,
	},
	refreshPillText: {
		color: Colors.primary[800],
		fontSize: 11.5,
		fontWeight: "900",
	},
	loadingBox: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 28,
	},
	loadingText: {
		marginTop: 12,
		color: Colors.primary[800],
		fontSize: 13,
		fontWeight: "800",
	},
	emptyBox: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 28,
	},
	emptyTitle: {
		marginTop: 10,
		color: "#0F172A",
		fontSize: 16,
		fontWeight: "900",
	},
	emptyText: {
		marginTop: 4,
		color: "rgba(15,23,42,0.56)",
		fontSize: 13,
		fontWeight: "700",
		textAlign: "center",
	},
	scroll: {
		flex: 1,
	},
	scrollContent: {
		paddingHorizontal: 14,
		paddingTop: 2,
		paddingBottom: Platform.OS === "ios" ? 110 : 90,
	},
	farmCard: {
		backgroundColor: "#FFFFFF",
		borderRadius: 20,
		marginBottom: 10,
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.07)",
		shadowColor: "#000",
		shadowOpacity: 0.08,
		shadowRadius: 14,
		shadowOffset: { width: 0, height: 8 },
		elevation: 2,
		overflow: "hidden",
	},
	farmMainButton: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 14,
		paddingTop: 14,
		paddingBottom: 10,
	},
	farmIconBox: {
		width: 42,
		height: 42,
		borderRadius: 16,
		backgroundColor: Colors.primary[700],
		alignItems: "center",
		justifyContent: "center",
		marginRight: 11,
	},
	farmContent: {
		flex: 1,
		paddingRight: 8,
	},
	farmName: {
		color: "#0F172A",
		fontSize: 16,
		fontWeight: "900",
		letterSpacing: -0.25,
	},
	farmMeta: {
		marginTop: 2,
		color: "rgba(15,23,42,0.52)",
		fontSize: 12,
		fontWeight: "700",
	},
	projectPreviewRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		marginTop: 8,
	},
	projectMiniChip: {
		maxWidth: 92,
		backgroundColor: "rgba(15,23,42,0.05)",
		borderRadius: 999,
		paddingHorizontal: 8,
		paddingVertical: 4,
	},
	projectMiniChipText: {
		color: "rgba(15,23,42,0.66)",
		fontSize: 10.5,
		fontWeight: "800",
	},
	projectMoreChip: {
		backgroundColor: "rgba(22,101,52,0.10)",
		borderRadius: 999,
		paddingHorizontal: 8,
		paddingVertical: 4,
	},
	projectMoreChipText: {
		color: Colors.primary[800],
		fontSize: 10.5,
		fontWeight: "900",
	},
	cardFooter: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		borderTopWidth: 1,
		borderTopColor: "rgba(15,23,42,0.06)",
		paddingHorizontal: 14,
		paddingVertical: 10,
		backgroundColor: "rgba(248,250,252,0.72)",
	},
	detailsButton: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		paddingVertical: 4,
	},
	detailsButtonText: {
		color: Colors.primary[700],
		fontSize: 12,
		fontWeight: "900",
	},
	openButton: {
		backgroundColor: Colors.primary[700],
		borderRadius: 999,
		paddingHorizontal: 13,
		paddingVertical: 7,
	},
	openButtonText: {
		color: "#FFFFFF",
		fontSize: 12,
		fontWeight: "900",
	},
	expandedBox: {
		paddingHorizontal: 14,
		paddingTop: 12,
		paddingBottom: 14,
		backgroundColor: "#FFFFFF",
	},
	expandedMetricsRow: {
		flexDirection: "row",
		gap: 8,
		marginBottom: 12,
	},
	expandedMetric: {
		flex: 1,
		borderRadius: 14,
		padding: 10,
		backgroundColor: "rgba(15,23,42,0.035)",
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.06)",
	},
	expandedMetricLabel: {
		color: "rgba(15,23,42,0.48)",
		fontSize: 10,
		fontWeight: "800",
		textTransform: "uppercase",
		letterSpacing: 0.5,
	},
	expandedMetricValue: {
		marginTop: 3,
		color: "#0F172A",
		fontSize: 13,
		fontWeight: "900",
	},
	expandedProjects: {
		gap: 7,
	},
	expandedProjectRow: {
		flexDirection: "row",
		alignItems: "center",
		minHeight: 30,
	},
	projectDot: {
		width: 7,
		height: 7,
		borderRadius: 4,
		marginRight: 8,
	},
	expandedProjectName: {
		flex: 1,
		color: "rgba(15,23,42,0.74)",
		fontSize: 12,
		fontWeight: "800",
	},
	expandedProjectArea: {
		color: "rgba(15,23,42,0.52)",
		fontSize: 11,
		fontWeight: "800",
		marginLeft: 8,
	},
	skeletonContainer: {
		flex: 1,
		paddingHorizontal: 14,
		paddingTop: 2,
		paddingBottom: Platform.OS === "ios" ? 110 : 90,
	},
	skeletonCard: {
		backgroundColor: "rgba(255,255,255,0.74)",
		borderRadius: 20,
		marginBottom: 10,
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.06)",
		overflow: "hidden",
	},
	skeletonMainRow: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 14,
		paddingTop: 14,
		paddingBottom: 12,
	},
	skeletonIcon: {
		width: 42,
		height: 42,
		borderRadius: 16,
		backgroundColor: "rgba(15,23,42,0.08)",
		marginRight: 11,
	},
	skeletonContent: {
		flex: 1,
	},
	skeletonTitle: {
		width: "62%",
		height: 15,
		borderRadius: 999,
		backgroundColor: "rgba(15,23,42,0.09)",
	},
	skeletonMeta: {
		width: "82%",
		height: 10,
		borderRadius: 999,
		backgroundColor: "rgba(15,23,42,0.065)",
		marginTop: 8,
	},
	skeletonChipRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		marginTop: 10,
	},
	skeletonChip: {
		width: 78,
		height: 20,
		borderRadius: 999,
		backgroundColor: "rgba(15,23,42,0.06)",
	},
	skeletonChipSmall: {
		width: 54,
		height: 20,
		borderRadius: 999,
		backgroundColor: "rgba(15,23,42,0.055)",
	},
	skeletonFooter: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		borderTopWidth: 1,
		borderTopColor: "rgba(15,23,42,0.05)",
		paddingHorizontal: 14,
		paddingVertical: 10,
		backgroundColor: "rgba(248,250,252,0.54)",
	},
	skeletonFooterText: {
		width: 94,
		height: 12,
		borderRadius: 999,
		backgroundColor: "rgba(15,23,42,0.06)",
	},
	skeletonButton: {
		width: 86,
		height: 28,
		borderRadius: 999,
		backgroundColor: "rgba(22,101,52,0.12)",
	},
	refreshSpinnerBox: {
		width: 28,
		height: 28,
		borderRadius: 999,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "rgba(255,255,255,0.86)",
	},
	refreshPillSubText: {
		marginTop: 1,
		color: "rgba(15,23,42,0.46)",
		fontSize: 10.5,
		fontWeight: "700",
	},
});