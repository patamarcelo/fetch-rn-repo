import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
	View,
	Text,
	StyleSheet,
	Pressable,
	ScrollView,
	ActivityIndicator,
	RefreshControl,
	StatusBar,
	Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import Ionicons from "@expo/vector-icons/Ionicons";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import * as Haptics from "expo-haptics";

import { Colors } from "../../constants/styles";
import { LINKMachine } from "../../utils/api";

const formatHour = (value) => {
	if (value === null || value === undefined || value === "") return "-";

	const numberValue = Number(value);

	if (Number.isNaN(numberValue)) return "-";

	return numberValue.toLocaleString("pt-BR", {
		minimumFractionDigits: numberValue % 1 === 0 ? 0 : 1,
		maximumFractionDigits: 1,
	});
};

const formatDateTimeBR = (value) => {
	if (!value) return "-";

	const date = new Date(value);

	if (Number.isNaN(date.getTime())) return "-";

	return date.toLocaleString("pt-BR", {
		day: "2-digit",
		month: "2-digit",
		year: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	});
};

const cleanMachineLocation = (value) => {
	const cleaned = String(value || "")
		.replace(/\bProjeto\b\s*[:\-–—]?\s*/gi, "")
		.replace(/\bFazenda\b\s*[:\-–—]?\s*/gi, "")
		.replace(/\s{2,}/g, " ")
		.trim();

	return cleaned || "Não informada";
};

const normalizeHistoryResponse = (response) => {
	const data =
		response?.data ||
		response?.results ||
		response?.maintenance_records ||
		response?.records ||
		response;

	return Array.isArray(data) ? data : [];
};

const getRecordDate = (item) => {
	return item?.performed_at || item?.created_at || item?.date || null;
};

const getRecordHourmeter = (item) => {
	return item?.hourmeter || item?.revision_hourmeter || item?.value || null;
};

const getPlanName = (item) => {
	return (
		item?.maintenance_plan_name ||
		item?.plan_name ||
		item?.maintenance_plan?.name ||
		item?.plan?.name ||
		"Revisão"
	);
};

const getMachineIcon = (machineType, color = Colors.primary[800]) => {
	if (machineType === "tractor") {
		return <FontAwesome5 name="tractor" size={23} color={color} />;
	}

	if (machineType === "sprayer") {
		return <Ionicons name="water-outline" size={26} color={color} />;
	}

	if (machineType === "harvester") {
		return <FontAwesome5 name="truck-monster" size={22} color={color} />;
	}

	return <Ionicons name="construct-outline" size={25} color={color} />;
};

const MachineHeaderCard = ({ machine }) => {
	const machineName =
		machine?.description ||
		machine?.identifier ||
		machine?.machine_type_label ||
		"Máquina";

	const machineLocation = cleanMachineLocation(
		machine?.fazenda_name || machine?.farm_name || machine?.location_name
	);

	return (
		<View style={styles.machineCard}>
			<View style={styles.machineHeader}>
				<View style={styles.machineIconBox}>
					{getMachineIcon(machine?.machine_type)}
				</View>

				<View style={styles.machineTextBox}>
					<Text style={styles.machineCode} numberOfLines={1}>
						{machine?.identifier || "Sem código"}
					</Text>

					<Text style={styles.machineName} numberOfLines={2}>
						{machineName}
					</Text>

					<View style={styles.locationLine}>
						<Ionicons
							name="location-outline"
							size={13}
							color="rgba(15,23,42,0.44)"
						/>
						<Text style={styles.locationText} numberOfLines={1}>
							{machineLocation}
						</Text>
					</View>
				</View>
			</View>

			<View style={styles.currentGrid}>
				<View style={styles.currentBox}>
					<Text style={styles.currentLabel}>Última revisão</Text>
					<Text style={styles.currentValue}>
						{formatHour(machine?.last_revision_hourmeter)} h
					</Text>
				</View>

				<View style={styles.currentBoxGreen}>
					<Text style={styles.currentLabel}>Próxima revisão</Text>
					<Text style={styles.currentValueGreen}>
						{formatHour(machine?.next_revision_hourmeter)} h
					</Text>
				</View>
			</View>
		</View>
	);
};

const MaintenanceRecordCard = ({ item }) => {
	const planName = getPlanName(item);
	const date = getRecordDate(item);
	const hourmeter = getRecordHourmeter(item);

	return (
		<View style={styles.historyCard}>
			<View style={styles.historyTopLine}>
				<View style={styles.historyIconBox}>
					<Ionicons name="construct-outline" size={18} color={Colors.primary[800]} />
				</View>

				<View style={styles.historyTextBox}>
					<Text style={styles.historyTitle} numberOfLines={1}>
						{planName}
					</Text>
					<Text style={styles.historyDate}>{formatDateTimeBR(date)}</Text>
				</View>

				<View style={styles.valueBox}>
					<Text style={styles.valueLabel}>Horímetro</Text>
					<Text style={styles.valueText}>{formatHour(hourmeter)} h</Text>
				</View>
			</View>

			<View style={styles.historyMetaRow}>
				<View style={styles.metaPill}>
					<Ionicons name="checkmark-circle-outline" size={13} color={Colors.primary[800]} />
					<Text style={styles.metaPillText}>Revisão realizada</Text>
				</View>

				{item?.source ? (
					<View style={styles.metaPill}>
						<Ionicons name="cloud-outline" size={13} color="rgba(15,23,42,0.48)" />
						<Text style={styles.metaPillText}>{item.source}</Text>
					</View>
				) : null}
			</View>

			{item?.description ? (
				<View style={styles.notesBox}>
					<Text style={styles.notesText}>{item.description}</Text>
				</View>
			) : null}
		</View>
	);
};

const EmptyState = () => {
	return (
		<View style={styles.emptyCard}>
			<View style={styles.emptyIconBox}>
				<Ionicons name="construct-outline" size={25} color={Colors.primary[800]} />
			</View>

			<Text style={styles.emptyTitle}>Nenhuma revisão encontrada</Text>
			<Text style={styles.emptyDescription}>
				As revisões registradas para esta máquina aparecerão aqui.
			</Text>
		</View>
	);
};

const MachineMaintenanceHistoryScreen = ({ route, navigation }) => {
	const machineId = route?.params?.machineId;

	const machine = useSelector((state) =>
		(state?.maquinario?.machines || []).find(
			(item) => String(item?.id) === String(machineId)
		)
	);

	const [records, setRecords] = useState([]);
	const [isLoading, setIsLoading] = useState(false);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [error, setError] = useState(null);

	useFocusEffect(
		useCallback(() => {
			StatusBar.setBarStyle("dark-content");

			if (Platform.OS === "android") {
				StatusBar.setBackgroundColor("#D6E3F3");
			}
		}, [])
	);

	const sortedRecords = useMemo(() => {
		return [...records].sort((a, b) => {
			const dateA = new Date(getRecordDate(a) || 0).getTime();
			const dateB = new Date(getRecordDate(b) || 0).getTime();

			return dateB - dateA;
		});
	}, [records]);

	const handleBack = useCallback(() => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

		if (navigation?.canGoBack?.()) {
			navigation.goBack();
			return;
		}

		navigation.navigate("MachineDetailScreen", { machineId });
	}, [navigation, machineId]);

	const loadRecords = useCallback(
		async ({ refreshing = false } = {}) => {
			if (!machine?.id) return;

			try {
				if (refreshing) {
					setIsRefreshing(true);
				} else {
					setIsLoading(true);
				}

				setError(null);

				const response = await fetch(
					`${LINKMachine}/maquinario/machines/${machine.id}/maintenance_records/`,
					{
						method: "GET",
						headers: {
							"Content-Type": "application/json",
							Authorization: `Token ${process.env.EXPO_PUBLIC_REACT_APP_DJANGO_TOKEN}`,
						},
					}
				);

				if (!response.ok) {
					const text = await response.text();
					throw new Error(text || "Erro ao carregar revisões.");
				}

				const data = await response.json();
				setRecords(normalizeHistoryResponse(data));
			} catch (err) {
				console.log("Erro ao carregar revisões:", err);
				setError(err?.message || "Não foi possível carregar as revisões.");
			} finally {
				setIsLoading(false);
				setIsRefreshing(false);
			}
		},
		[machine?.id]
	);

	useEffect(() => {
		loadRecords();
	}, [loadRecords]);

	if (!machine) {
		return (
			<SafeAreaView style={styles.root} edges={["top"]}>
				<View style={styles.notFoundCard}>
					<Ionicons name="alert-circle-outline" size={32} color="#B42318" />
					<Text style={styles.notFoundTitle}>Máquina não encontrada</Text>
					<Text style={styles.notFoundDescription}>
						Volte para a lista e tente abrir novamente.
					</Text>

					<Pressable onPress={handleBack} style={styles.notFoundButton}>
						<Text style={styles.notFoundButtonText}>Voltar</Text>
					</Pressable>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.root} edges={["top"]}>
			<ScrollView
				showsVerticalScrollIndicator={false}
				contentContainerStyle={styles.scrollContent}
				refreshControl={
					<RefreshControl
						refreshing={isRefreshing}
						onRefresh={() => loadRecords({ refreshing: true })}
						colors={[Colors.primary[600]]}
						tintColor={Colors.primary[600]}
						titleColor={Colors.primary[600]}
						progressBackgroundColor="#FFFFFF"
					/>
				}
			>
				<View style={styles.topBar}>
					<Pressable
						onPress={handleBack}
						hitSlop={10}
						style={({ pressed }) => [
							styles.topIconButton,
							pressed && styles.pressed,
						]}
					>
						<Ionicons name="chevron-back" size={23} color="#0F172A" />
					</Pressable>

					<View style={styles.topTitleBox}>
						<Text style={styles.topTitle}>Histórico de revisões</Text>
						<Text style={styles.topSubtitle}>Manutenções realizadas</Text>
					</View>
				</View>

				<MachineHeaderCard machine={machine} />

				<View style={styles.sectionHeader}>
					<View>
						<Text style={styles.sectionTitle}>Revisões registradas</Text>
						<Text style={styles.sectionDescription}>
							{sortedRecords.length} registro{sortedRecords.length === 1 ? "" : "s"}
						</Text>
					</View>

					<Pressable
						onPress={() => loadRecords({ refreshing: true })}
						style={({ pressed }) => [
							styles.refreshButton,
							pressed && styles.pressed,
						]}
					>
						<Ionicons name="refresh-outline" size={16} color={Colors.primary[800]} />
					</Pressable>
				</View>

				{isLoading ? (
					<View style={styles.loadingCard}>
						<ActivityIndicator size="small" color={Colors.primary[700]} />
						<Text style={styles.loadingText}>Carregando revisões...</Text>
					</View>
				) : error ? (
					<View style={styles.errorCard}>
						<Text style={styles.errorTitle}>Não foi possível carregar</Text>
						<Text style={styles.errorDescription}>{error}</Text>

						<Pressable
							onPress={() => loadRecords()}
							style={styles.retryButton}
						>
							<Text style={styles.retryButtonText}>Tentar novamente</Text>
						</Pressable>
					</View>
				) : sortedRecords.length === 0 ? (
					<EmptyState />
				) : (
					sortedRecords.map((item, index) => (
						<MaintenanceRecordCard
							key={`${item?.id || "maintenance"}-${index}`}
							item={item}
						/>
					))
				)}
			</ScrollView>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	root: {
		flex: 1,
		backgroundColor: "#D6E3F3",
	},

	scrollContent: {
		paddingHorizontal: 16,
		paddingTop: 10,
		paddingBottom: 34,
	},

	topBar: {
		minHeight: 48,
		marginBottom: 10,
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
	},

	topIconButton: {
		width: 42,
		height: 42,
		borderRadius: 16,
		backgroundColor: "rgba(255,255,255,0.86)",
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.08)",
		alignItems: "center",
		justifyContent: "center",
		shadowColor: "#000",
		shadowOpacity: 0.04,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 5 },
		elevation: 1,
	},

	topTitleBox: {
		flex: 1,
	},

	topTitle: {
		color: "#0F172A",
		fontSize: 14,
		fontWeight: "900",
		letterSpacing: -0.2,
	},

	topSubtitle: {
		marginTop: 1,
		color: "rgba(15,23,42,0.48)",
		fontSize: 11,
		fontWeight: "800",
	},

	machineCard: {
		backgroundColor: "#FFFFFF",
		borderRadius: 26,
		padding: 16,
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.08)",
		shadowColor: "#000",
		shadowOpacity: 0.07,
		shadowRadius: 16,
		shadowOffset: { width: 0, height: 9 },
		elevation: 2,
	},

	machineHeader: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
	},

	machineIconBox: {
		width: 52,
		height: 52,
		borderRadius: 19,
		backgroundColor: "rgba(22,101,52,0.10)",
		borderWidth: 1,
		borderColor: "rgba(22,101,52,0.12)",
		alignItems: "center",
		justifyContent: "center",
	},

	machineTextBox: {
		flex: 1,
		minWidth: 0,
	},

	machineCode: {
		color: Colors.primary[800],
		fontSize: 11,
		fontWeight: "900",
		textTransform: "uppercase",
		letterSpacing: 0.45,
	},

	machineName: {
		marginTop: 3,
		color: "#0F172A",
		fontSize: 15,
		fontWeight: "900",
		lineHeight: 19,
		letterSpacing: -0.2,
	},

	locationLine: {
		marginTop: 5,
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
	},

	locationText: {
		flex: 1,
		color: "rgba(15,23,42,0.45)",
		fontSize: 10.5,
		fontWeight: "800",
	},

	currentGrid: {
		marginTop: 14,
		flexDirection: "row",
		gap: 9,
	},

	currentBox: {
		flex: 1,
		borderRadius: 18,
		padding: 13,
		backgroundColor: "rgba(100,116,139,0.08)",
		borderWidth: 1,
		borderColor: "rgba(100,116,139,0.13)",
	},

	currentBoxGreen: {
		flex: 1,
		borderRadius: 18,
		padding: 13,
		backgroundColor: "rgba(22,101,52,0.08)",
		borderWidth: 1,
		borderColor: "rgba(22,101,52,0.13)",
	},

	currentLabel: {
		color: "rgba(15,23,42,0.48)",
		fontSize: 10,
		fontWeight: "900",
		textTransform: "uppercase",
		letterSpacing: 0.25,
	},

	currentValue: {
		marginTop: 4,
		color: "#475569",
		fontSize: 17,
		fontWeight: "900",
		letterSpacing: -0.3,
	},

	currentValueGreen: {
		marginTop: 4,
		color: Colors.primary[800],
		fontSize: 17,
		fontWeight: "900",
		letterSpacing: -0.3,
	},

	sectionHeader: {
		marginTop: 18,
		marginBottom: 10,
		flexDirection: "row",
		alignItems: "flex-end",
		justifyContent: "space-between",
	},

	sectionTitle: {
		color: "#0F172A",
		fontSize: 15,
		fontWeight: "900",
	},

	sectionDescription: {
		marginTop: 2,
		color: "rgba(15,23,42,0.48)",
		fontSize: 11,
		fontWeight: "800",
	},

	refreshButton: {
		width: 36,
		height: 36,
		borderRadius: 14,
		backgroundColor: "rgba(255,255,255,0.86)",
		borderWidth: 1,
		borderColor: "rgba(22,101,52,0.14)",
		alignItems: "center",
		justifyContent: "center",
	},

	historyCard: {
		backgroundColor: "#FFFFFF",
		borderRadius: 22,
		padding: 13,
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.08)",
		marginBottom: 10,
		shadowColor: "#000",
		shadowOpacity: 0.05,
		shadowRadius: 12,
		shadowOffset: { width: 0, height: 7 },
		elevation: 2,
	},

	historyTopLine: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
	},

	historyIconBox: {
		width: 38,
		height: 38,
		borderRadius: 15,
		backgroundColor: "rgba(22,101,52,0.10)",
		alignItems: "center",
		justifyContent: "center",
	},

	historyTextBox: {
		flex: 1,
		minWidth: 0,
	},

	historyTitle: {
		color: "#0F172A",
		fontSize: 13,
		fontWeight: "900",
	},

	historyDate: {
		marginTop: 2,
		color: "rgba(15,23,42,0.48)",
		fontSize: 10.5,
		fontWeight: "800",
	},

	valueBox: {
		alignItems: "flex-end",
	},

	valueLabel: {
		color: "rgba(15,23,42,0.42)",
		fontSize: 9,
		fontWeight: "900",
		textTransform: "uppercase",
		letterSpacing: 0.25,
	},

	valueText: {
		marginTop: 3,
		color: Colors.primary[800],
		fontSize: 14,
		fontWeight: "900",
	},

	historyMetaRow: {
		marginTop: 11,
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 7,
	},

	metaPill: {
		borderRadius: 999,
		paddingHorizontal: 9,
		paddingVertical: 6,
		backgroundColor: "rgba(15,23,42,0.035)",
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
	},

	metaPillText: {
		color: "rgba(15,23,42,0.52)",
		fontSize: 10,
		fontWeight: "800",
	},

	notesBox: {
		marginTop: 10,
		paddingTop: 10,
		borderTopWidth: 1,
		borderTopColor: "rgba(15,23,42,0.06)",
	},

	notesText: {
		color: "rgba(15,23,42,0.58)",
		fontSize: 11,
		fontWeight: "700",
		lineHeight: 16,
	},

	loadingCard: {
		backgroundColor: "#FFFFFF",
		borderRadius: 22,
		padding: 22,
		alignItems: "center",
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.08)",
		gap: 8,
	},

	loadingText: {
		color: "rgba(15,23,42,0.55)",
		fontSize: 12,
		fontWeight: "800",
	},

	errorCard: {
		backgroundColor: "rgba(255,245,245,0.96)",
		borderRadius: 22,
		padding: 16,
		borderWidth: 1,
		borderColor: "rgba(180,35,24,0.16)",
	},

	errorTitle: {
		color: "#B42318",
		fontSize: 13,
		fontWeight: "900",
	},

	errorDescription: {
		marginTop: 4,
		color: "rgba(15,23,42,0.54)",
		fontSize: 11,
		fontWeight: "700",
		lineHeight: 16,
	},

	retryButton: {
		marginTop: 10,
		alignSelf: "flex-start",
		borderRadius: 999,
		paddingHorizontal: 12,
		paddingVertical: 8,
		backgroundColor: "rgba(180,35,24,0.10)",
	},

	retryButtonText: {
		color: "#B42318",
		fontSize: 11,
		fontWeight: "900",
	},

	emptyCard: {
		backgroundColor: "#FFFFFF",
		borderRadius: 22,
		padding: 22,
		alignItems: "center",
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.08)",
	},

	emptyIconBox: {
		width: 54,
		height: 54,
		borderRadius: 20,
		backgroundColor: "rgba(22,101,52,0.10)",
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 12,
	},

	emptyTitle: {
		color: "#0F172A",
		fontSize: 15,
		fontWeight: "900",
	},

	emptyDescription: {
		marginTop: 5,
		color: "rgba(15,23,42,0.52)",
		fontSize: 12,
		fontWeight: "700",
		textAlign: "center",
		lineHeight: 17,
	},

	notFoundCard: {
		margin: 18,
		marginTop: 80,
		backgroundColor: "#FFFFFF",
		borderRadius: 24,
		padding: 22,
		alignItems: "center",
		borderWidth: 1,
		borderColor: "rgba(180,35,24,0.16)",
	},

	notFoundTitle: {
		marginTop: 10,
		color: "#0F172A",
		fontSize: 16,
		fontWeight: "900",
	},

	notFoundDescription: {
		marginTop: 4,
		color: "rgba(15,23,42,0.52)",
		fontSize: 12,
		fontWeight: "700",
		textAlign: "center",
	},

	notFoundButton: {
		marginTop: 14,
		borderRadius: 999,
		paddingHorizontal: 16,
		paddingVertical: 10,
		backgroundColor: Colors.primary[800],
	},

	notFoundButtonText: {
		color: "#FFFFFF",
		fontSize: 12,
		fontWeight: "900",
	},

	pressed: {
		opacity: 0.78,
		transform: [{ scale: 0.99 }],
	},
});

export default MachineMaintenanceHistoryScreen;