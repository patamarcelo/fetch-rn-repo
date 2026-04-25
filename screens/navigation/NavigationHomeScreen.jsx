// screens/navigation/NavigationHomeScreen.jsx

import { useMemo, useState } from "react";
import { useCallback } from "react";
import { StatusBar, setStatusBarStyle, setStatusBarBackgroundColor } from "expo-status-bar";
import { useFocusEffect } from "@react-navigation/native";
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	ScrollView,
	Platform,

} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import Ionicons from "@expo/vector-icons/Ionicons";
import { Colors } from "../../constants/styles";

const FARMS_DATA = [
	{
		fazenda_id: 4,
		fazenda_nome: "Fazenda Benção de Deus",
		fazenda_id_d: 4,
		capacidade_plantio_ha_dia: 80,
		projetos: [
			{
				projeto_id: 2,
				projeto_nome: "Projeto Benção de Deus",
				id_farmbox: 11946,
				storage_id_farmbox: 12742,
				area_produtiva: 4844.53,
				area_carr: 174.21,
				area_total: 8474.86,
				map_centro_id: {
					lat: -11.179872960526678,
					lng: -49.62888243146445,
				},
				map_zoom: 12.55,
			},
		],
	},
	{
		fazenda_id: 14,
		fazenda_nome: "Fazenda Biguá",
		fazenda_id_d: 14,
		capacidade_plantio_ha_dia: 30,
		projetos: [
			{
				projeto_id: 3,
				projeto_nome: "Projeto Biguá",
				id_farmbox: 12105,
				storage_id_farmbox: null,
				area_produtiva: 617,
				area_carr: null,
				area_total: null,
				map_centro_id: {
					lat: -10.4915414,
					lng: -49.61823509999999,
				},
				map_zoom: null,
			},
		],
	},
	{
		fazenda_id: 5,
		fazenda_nome: "Fazenda Campo Guapo",
		fazenda_id_d: 5,
		capacidade_plantio_ha_dia: 60,
		projetos: [
			{
				projeto_id: 4,
				projeto_nome: "Projeto Cacíque",
				id_farmbox: 11945,
				storage_id_farmbox: null,
				area_produtiva: 460.98,
				area_carr: 27.2,
				area_total: 689.42,
				map_centro_id: {
					lat: -10.878758519256559,
					lng: -49.951596323401986,
				},
				map_zoom: 15,
			},
			{
				projeto_id: 5,
				projeto_nome: "Projeto Campo Guapo",
				id_farmbox: 11944,
				storage_id_farmbox: 12741,
				area_produtiva: 2617.52,
				area_carr: 294.19,
				area_total: 5394.38,
				map_centro_id: {
					lat: -10.866807436913602,
					lng: -49.92217688505893,
				},
				map_zoom: 12.9,
			},
			{
				projeto_id: 18,
				projeto_nome: "Projeto Safira",
				id_farmbox: 11936,
				storage_id_farmbox: null,
				area_produtiva: 1047.9,
				area_carr: null,
				area_total: 1436.69,
				map_centro_id: {
					lat: -10.938202,
					lng: -49.9104749,
				},
				map_zoom: null,
			},
		],
	},
	{
		fazenda_id: 1,
		fazenda_nome: "Fazenda Diamante",
		fazenda_id_d: 1,
		capacidade_plantio_ha_dia: 60,
		projetos: [
			{
				projeto_id: 6,
				projeto_nome: "Projeto Capivara",
				id_farmbox: 11939,
				storage_id_farmbox: null,
				area_produtiva: 702.84,
				area_carr: null,
				area_total: 1008.06,
				map_centro_id: {
					lat: -10.643900691239134,
					lng: -49.819540325334195,
				},
				map_zoom: 14.4,
			},
			{
				projeto_id: 7,
				projeto_nome: "Projeto Cervo",
				id_farmbox: 11941,
				storage_id_farmbox: 12733,
				area_produtiva: 1628.78,
				area_carr: null,
				area_total: 2336.1,
				map_centro_id: {
					lat: -10.612383947499765,
					lng: -49.82730771743541,
				},
				map_zoom: 13.7,
			},
			{
				projeto_id: 8,
				projeto_nome: "Projeto Diamante",
				id_farmbox: 11929,
				storage_id_farmbox: null,
				area_produtiva: null,
				area_carr: null,
				area_total: 7703.36,
				map_centro_id: null,
				map_zoom: null,
			},
			{
				projeto_id: 11,
				projeto_nome: "Projeto Jacaré",
				id_farmbox: 11938,
				storage_id_farmbox: null,
				area_produtiva: 1549.98,
				area_carr: null,
				area_total: 2223.08,
				map_centro_id: {
					lat: -10.6689228,
					lng: -49.8262853,
				},
				map_zoom: null,
			},
			{
				projeto_id: 17,
				projeto_nome: "Projeto Praia Alta",
				id_farmbox: 11943,
				storage_id_farmbox: null,
				area_produtiva: 1039.99,
				area_carr: null,
				area_total: 3108.82,
				map_centro_id: null,
				map_zoom: null,
			},
			{
				projeto_id: 21,
				projeto_nome: "Projeto Tucano",
				id_farmbox: 11937,
				storage_id_farmbox: null,
				area_produtiva: 793.97,
				area_carr: null,
				area_total: 1138.76,
				map_centro_id: {
					lat: -10.689890455977272,
					lng: -49.81424317481932,
				},
				map_zoom: 14,
			},
			{
				projeto_id: 22,
				projeto_nome: "Projeto Tuiuiu",
				id_farmbox: 11940,
				storage_id_farmbox: null,
				area_produtiva: 695.38,
				area_carr: null,
				area_total: 997.36,
				map_centro_id: {
					lat: -10.64811106026552,
					lng: -49.8667839980361,
				},
				map_zoom: 14.2,
			},
		],
	},
	{
		fazenda_id: 8,
		fazenda_nome: "Fazenda Eldorado",
		fazenda_id_d: 8,
		capacidade_plantio_ha_dia: 30,
		projetos: [
			{
				projeto_id: 9,
				projeto_nome: "Projeto Eldorado",
				id_farmbox: 11948,
				storage_id_farmbox: 12745,
				area_produtiva: 866.82,
				area_carr: 217.19,
				area_total: 1679.55,
				map_centro_id: {
					lat: -11.016782916298087,
					lng: -49.79276597544605,
				},
				map_zoom: 13.85,
			},
		],
	},
	{
		fazenda_id: 9,
		fazenda_nome: "Fazenda Fazendinha",
		fazenda_id_d: 9,
		capacidade_plantio_ha_dia: 50,
		projetos: [
			{
				projeto_id: 10,
				projeto_nome: "Projeto Fazendinha",
				id_farmbox: 11949,
				storage_id_farmbox: null,
				area_produtiva: 318.05,
				area_carr: 3.33,
				area_total: 321.39,
				map_centro_id: {
					lat: -10.8103889,
					lng: -49.6605793,
				},
				map_zoom: 16,
			},
		],
	},
	{
		fazenda_id: 6,
		fazenda_nome: "Fazenda Lago Verde",
		fazenda_id_d: 6,
		capacidade_plantio_ha_dia: 30,
		projetos: [
			{
				projeto_id: 13,
				projeto_nome: "Projeto Lago Verde",
				id_farmbox: 11942,
				storage_id_farmbox: 12744,
				area_produtiva: 1109.04,
				area_carr: 106.57,
				area_total: 3048.34,
				map_centro_id: {
					lat: -10.9113323,
					lng: -49.7673034,
				},
				map_zoom: 13.2,
			},
		],
	},
	{
		fazenda_id: 10,
		fazenda_nome: "Fazenda Novo Acordo",
		fazenda_id_d: 10,
		capacidade_plantio_ha_dia: 50,
		projetos: [
			{
				projeto_id: 14,
				projeto_nome: "Projeto Novo Acordo",
				id_farmbox: 11950,
				storage_id_farmbox: null,
				area_produtiva: 281.22,
				area_carr: 11.29,
				area_total: 292.51,
				map_centro_id: {
					lat: -10.7756202,
					lng: -49.6209239,
				},
				map_zoom: 15.5,
			},
		],
	},
	{
		fazenda_id: 7,
		fazenda_nome: "Fazenda Santa Maria",
		fazenda_id_d: 7,
		capacidade_plantio_ha_dia: 40,
		projetos: [
			{
				projeto_id: 19,
				projeto_nome: "Projeto Santa Maria",
				id_farmbox: 11947,
				storage_id_farmbox: 12743,
				area_produtiva: 685.06,
				area_carr: 122.57,
				area_total: 923.97,
				map_centro_id: null,
				map_zoom: null,
			},
		],
	},
];


const formatHa = (value) => {
	if (value === null || value === undefined || Number.isNaN(Number(value))) {
		return "—";
	}

	return `${Number(value).toLocaleString("pt-BR", {
		minimumFractionDigits: 0,
		maximumFractionDigits: 2,
	})} ha`;
};

const sumProjectsArea = (projects, field) => {
	return projects.reduce((total, item) => {
		const value = Number(item?.[field] || 0);
		return total + value;
	}, 0);
};

const NavigationHomeScreen = ({ navigation }) => {
	const [expandedFarmId, setExpandedFarmId] = useState(null);

	const summary = useMemo(() => {
		const totalFarms = FARMS_DATA.length;
		const totalProjects = FARMS_DATA.reduce(
			(total, farm) => total + farm.projetos.length,
			0
		);

		return {
			totalFarms,
			totalProjects,
		};
	}, []);


	useFocusEffect(
		useCallback(() => {
			setStatusBarStyle("dark");
			setStatusBarBackgroundColor("#D6E3F3", true);

			return () => {
				setStatusBarStyle("light");
				setStatusBarBackgroundColor(Colors.primary[901], true);
			};
		}, [])
	);

	const handleToggleDetails = (farmId) => {
		setExpandedFarmId((current) => (current === farmId ? null : farmId));
	};

	const handleOpenFarmMap = (farm) => {
		const projectsWithMapCenter = farm.projetos.filter(
			(project) => !!project?.map_centro_id?.lat && !!project?.map_centro_id?.lng
		);

		const parentNavigation = navigation.getParent();
		const rootNavigation = parentNavigation?.getParent?.() || parentNavigation || navigation;

		rootNavigation.navigate("NavigationMapScreen", {
			farm,
			farmId: farm.fazenda_id,
			farmName: farm.fazenda_nome,
			projects: farm.projetos,
			projectsWithMapCenter,
		});
	};

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
				</View>

				<ScrollView
					style={styles.scroll}
					contentContainerStyle={styles.scrollContent}
					showsVerticalScrollIndicator={false}
				>
					{FARMS_DATA.map((farm) => {
						const isExpanded = expandedFarmId === farm.fazenda_id;

						const totalProductiveArea = sumProjectsArea(
							farm.projetos,
							"area_produtiva"
						);

						const totalArea = sumProjectsArea(farm.projetos, "area_total");

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
										<Ionicons name="navigate-outline" size={21} color="#FFFFFF" />
									</View>

									<View style={styles.farmContent}>
										<Text style={styles.farmName} numberOfLines={1}>
											{farm.fazenda_nome}
										</Text>

										<Text style={styles.farmMeta} numberOfLines={1}>
											{farm.projetos.length}{" "}
											{farm.projetos.length === 1 ? "projeto" : "projetos"} ·{" "}
											{farm.capacidade_plantio_ha_dia || "—"} ha/dia
										</Text>

										<View style={styles.projectPreviewRow}>
											{visibleProjects.map((project) => (
												<View key={project.projeto_id} style={styles.projectMiniChip}>
													<Text style={styles.projectMiniChipText} numberOfLines={1}>
														{project.projeto_nome.replace("Projeto ", "")}
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
												<Text style={styles.expandedMetricLabel}>Área produtiva</Text>
												<Text style={styles.expandedMetricValue}>
													{formatHa(totalProductiveArea)}
												</Text>
											</View>

											<View style={styles.expandedMetric}>
												<Text style={styles.expandedMetricLabel}>Área total</Text>
												<Text style={styles.expandedMetricValue}>
													{formatHa(totalArea)}
												</Text>
											</View>
										</View>

										<View style={styles.expandedProjects}>
											{farm.projetos.map((project) => {
												const hasMapCenter =
													!!project?.map_centro_id?.lat && !!project?.map_centro_id?.lng;

												return (
													<View key={project.projeto_id} style={styles.expandedProjectRow}>
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

														<Text style={styles.expandedProjectName} numberOfLines={1}>
															{project.projeto_nome}
														</Text>

														<Text style={styles.expandedProjectArea}>
															{formatHa(project.area_produtiva)}
														</Text>
													</View>
												);
											})}
										</View>
									</View>
								)}
							</View>
						);
					})}
				</ScrollView>
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
		minHeight: 26,
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
});