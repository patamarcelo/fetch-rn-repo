// screens/navigation/NavigationMapScreen.jsx

import { useMemo, useState } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	Platform,
	ScrollView,
} from "react-native";

import Ionicons from "@expo/vector-icons/Ionicons";
import { Colors } from "../../constants/styles";

const SAFRA_OPTIONS = ["2024/2025", "2025/2026"];
const CICLO_OPTIONS = ["1", "2", "3"];

const formatHa = (value) => {
	if (value === null || value === undefined || Number.isNaN(Number(value))) {
		return "—";
	}

	return `${Number(value).toLocaleString("pt-BR", {
		minimumFractionDigits: 0,
		maximumFractionDigits: 2,
	})} ha`;
};

const NavigationMapScreen = ({ navigation, route }) => {
	const {
		farm,
		farmName,
		projects = [],
		projectsWithMapCenter = [],
	} = route.params || {};

	const [selectedSafra, setSelectedSafra] = useState("2024/2025");
	const [selectedCiclo, setSelectedCiclo] = useState("1");
	const [filtersVisible, setFiltersVisible] = useState(false);

	const resolvedFarmName = farmName || farm?.fazenda_nome || "Mapa da fazenda";

	const mapProjects = useMemo(() => {
		if (projectsWithMapCenter?.length > 0) {
			return projectsWithMapCenter;
		}

		return projects.filter(
			(project) => !!project?.map_centro_id?.lat && !!project?.map_centro_id?.lng
		);
	}, [projects, projectsWithMapCenter]);

	const totalProductiveArea = useMemo(() => {
		return projects.reduce((total, project) => {
			return total + Number(project?.area_produtiva || 0);
		}, 0);
	}, [projects]);

	const primaryProject = mapProjects?.[0];

	return (
		<View style={styles.container}>
			<View style={styles.mapPlaceholder}>
				<Text style={styles.mapPlaceholderTitle}>Mapa</Text>

				<Text style={styles.mapPlaceholderText}>
					Aqui vamos renderizar os polígonos/centros da fazenda.
				</Text>

				{primaryProject?.map_centro_id && (
					<View style={styles.debugBox}>
						<Text style={styles.debugText}>
							Centro inicial: {primaryProject.map_centro_id.lat},{" "}
							{primaryProject.map_centro_id.lng}
						</Text>

						<Text style={styles.debugText}>
							Zoom: {primaryProject.map_zoom || "padrão"}
						</Text>
					</View>
				)}
			</View>

			<View style={styles.topBar}>
				<TouchableOpacity
					activeOpacity={0.82}
					style={styles.backButton}
					onPress={() => navigation.goBack()}
				>
					<Ionicons name="chevron-back" size={24} color="#FFFFFF" />
				</TouchableOpacity>

				<View style={styles.titleBox}>
					<Text style={styles.title} numberOfLines={1}>
						{resolvedFarmName}
					</Text>

					<Text style={styles.subtitle} numberOfLines={1}>
						{projects.length} {projects.length === 1 ? "projeto" : "projetos"} ·{" "}
						{formatHa(totalProductiveArea)}
					</Text>
				</View>

				<TouchableOpacity
					activeOpacity={0.82}
					style={[
						styles.filterButton,
						filtersVisible && styles.filterButtonActive,
					]}
					onPress={() => setFiltersVisible((current) => !current)}
				>
					<Ionicons
						name="options-outline"
						size={22}
						color={filtersVisible ? "#07130C" : "#FFFFFF"}
					/>
				</TouchableOpacity>
			</View>

			{filtersVisible && (
				<View style={styles.filtersPanel}>
					<View style={styles.filterSection}>
						<Text style={styles.filterLabel}>Safra</Text>

						<ScrollView
							horizontal
							showsHorizontalScrollIndicator={false}
							contentContainerStyle={styles.chipsRow}
						>
							{SAFRA_OPTIONS.map((safra) => {
								const isSelected = selectedSafra === safra;

								return (
									<TouchableOpacity
										key={safra}
										activeOpacity={0.82}
										onPress={() => setSelectedSafra(safra)}
										style={[
											styles.filterChip,
											isSelected && styles.filterChipSelected,
										]}
									>
										<Text
											style={[
												styles.filterChipText,
												isSelected && styles.filterChipTextSelected,
											]}
										>
											{safra}
										</Text>
									</TouchableOpacity>
								);
							})}
						</ScrollView>
					</View>

					<View style={styles.filterSection}>
						<Text style={styles.filterLabel}>Ciclo</Text>

						<View style={styles.chipsRow}>
							{CICLO_OPTIONS.map((ciclo) => {
								const isSelected = selectedCiclo === ciclo;

								return (
									<TouchableOpacity
										key={ciclo}
										activeOpacity={0.82}
										onPress={() => setSelectedCiclo(ciclo)}
										style={[
											styles.filterChip,
											isSelected && styles.filterChipSelected,
										]}
									>
										<Text
											style={[
												styles.filterChipText,
												isSelected && styles.filterChipTextSelected,
											]}
										>
											Ciclo {ciclo}
										</Text>
									</TouchableOpacity>
								);
							})}
						</View>
					</View>
				</View>
			)}

			<View style={styles.bottomSheet}>
				<View style={styles.sheetHandle} />

				<View style={styles.sheetHeader}>
					<View>
						<Text style={styles.sheetTitle}>Projetos da fazenda</Text>
						<Text style={styles.sheetSubtitle}>
							Safra {selectedSafra} · Ciclo {selectedCiclo}
						</Text>
					</View>

					<View style={styles.sheetBadge}>
						<Text style={styles.sheetBadgeText}>{projects.length}</Text>
					</View>
				</View>

				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={styles.projectsRow}
				>
					{projects.map((project) => {
						const hasMapCenter =
							!!project?.map_centro_id?.lat && !!project?.map_centro_id?.lng;

						return (
							<View key={project.projeto_id} style={styles.projectCard}>
								<View style={styles.projectCardHeader}>
									<View
										style={[
											styles.projectStatusDot,
											{
												backgroundColor: hasMapCenter ? "#16A34A" : "#CBD5E1",
											},
										]}
									/>

									<Text style={styles.projectName} numberOfLines={1}>
										{project.projeto_nome.replace("Projeto ", "")}
									</Text>
								</View>

								<Text style={styles.projectArea}>
									{formatHa(project.area_produtiva)}
								</Text>

								<Text style={styles.projectMeta}>
									Farmbox #{project.id_farmbox || "—"}
								</Text>
							</View>
						);
					})}
				</ScrollView>
			</View>
		</View>
	);
};

export default NavigationMapScreen;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#050816",
	},
	mapPlaceholder: {
		flex: 1,
		backgroundColor: "#D6E3F3",
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 28,
	},
	mapPlaceholderTitle: {
		fontSize: 28,
		fontWeight: "900",
		color: "rgba(15,23,42,0.84)",
	},
	mapPlaceholderText: {
		marginTop: 8,
		fontSize: 14,
		fontWeight: "700",
		color: "rgba(15,23,42,0.58)",
		textAlign: "center",
	},
	debugBox: {
		marginTop: 18,
		backgroundColor: "rgba(255,255,255,0.70)",
		borderRadius: 16,
		padding: 12,
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.08)",
	},
	debugText: {
		fontSize: 12,
		fontWeight: "800",
		color: "rgba(15,23,42,0.62)",
	},
	topBar: {
		position: "absolute",
		top: Platform.OS === "ios" ? 52 : 34,
		left: 14,
		right: 14,
		zIndex: 20,
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
	},
	backButton: {
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: "rgba(0,0,0,0.58)",
		alignItems: "center",
		justifyContent: "center",
	},
	titleBox: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.54)",
		borderRadius: 18,
		paddingHorizontal: 14,
		paddingVertical: 9,
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.10)",
	},
	title: {
		color: "#FFFFFF",
		fontSize: 15,
		fontWeight: "900",
	},
	subtitle: {
		marginTop: 1,
		color: "rgba(255,255,255,0.68)",
		fontSize: 11.5,
		fontWeight: "700",
	},
	filterButton: {
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: "rgba(0,0,0,0.58)",
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.10)",
	},
	filterButtonActive: {
		backgroundColor: "#72E6A1",
		borderColor: "#72E6A1",
	},
	filtersPanel: {
		position: "absolute",
		top: Platform.OS === "ios" ? 106 : 88,
		left: 14,
		right: 14,
		zIndex: 19,
		backgroundColor: "rgba(10,16,12,0.88)",
		borderRadius: 22,
		padding: 14,
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.12)",
	},
	filterSection: {
		marginBottom: 10,
	},
	filterLabel: {
		color: "rgba(255,255,255,0.62)",
		fontSize: 11,
		fontWeight: "900",
		textTransform: "uppercase",
		letterSpacing: 0.8,
		marginBottom: 8,
	},
	chipsRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	filterChip: {
		borderRadius: 999,
		paddingHorizontal: 12,
		paddingVertical: 8,
		backgroundColor: "rgba(255,255,255,0.08)",
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.10)",
	},
	filterChipSelected: {
		backgroundColor: "#72E6A1",
		borderColor: "#72E6A1",
	},
	filterChipText: {
		color: "rgba(255,255,255,0.78)",
		fontSize: 12,
		fontWeight: "900",
	},
	filterChipTextSelected: {
		color: "#07130C",
	},
	bottomSheet: {
		position: "absolute",
		left: 12,
		right: 12,
		bottom: Platform.OS === "ios" ? 28 : 18,
		backgroundColor: "rgba(255,255,255,0.94)",
		borderRadius: 24,
		paddingTop: 8,
		paddingHorizontal: 14,
		paddingBottom: 14,
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.08)",
		shadowColor: "#000",
		shadowOpacity: 0.18,
		shadowRadius: 20,
		shadowOffset: { width: 0, height: 10 },
		elevation: 8,
	},
	sheetHandle: {
		alignSelf: "center",
		width: 42,
		height: 5,
		borderRadius: 999,
		backgroundColor: "rgba(15,23,42,0.16)",
		marginBottom: 12,
	},
	sheetHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 12,
	},
	sheetTitle: {
		color: "#0F172A",
		fontSize: 16,
		fontWeight: "900",
	},
	sheetSubtitle: {
		marginTop: 2,
		color: "rgba(15,23,42,0.52)",
		fontSize: 12,
		fontWeight: "700",
	},
	sheetBadge: {
		minWidth: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: Colors.primary[700],
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 8,
	},
	sheetBadgeText: {
		color: "#FFFFFF",
		fontSize: 13,
		fontWeight: "900",
	},
	projectsRow: {
		gap: 9,
		paddingRight: 4,
	},
	projectCard: {
		width: 132,
		borderRadius: 18,
		backgroundColor: "rgba(15,23,42,0.045)",
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.07)",
		padding: 11,
	},
	projectCardHeader: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 8,
	},
	projectStatusDot: {
		width: 7,
		height: 7,
		borderRadius: 4,
		marginRight: 7,
	},
	projectName: {
		flex: 1,
		color: "#0F172A",
		fontSize: 12,
		fontWeight: "900",
	},
	projectArea: {
		color: Colors.primary[800],
		fontSize: 13,
		fontWeight: "900",
	},
	projectMeta: {
		marginTop: 3,
		color: "rgba(15,23,42,0.45)",
		fontSize: 10.5,
		fontWeight: "800",
	},
});