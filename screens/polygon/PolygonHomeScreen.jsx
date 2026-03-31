import React from "react";
import { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { Colors } from "../../constants/styles";
import { polygonActions } from "../../store/redux/polygon";

import {
	selectPolygonItems,
	selectPolygonStats,
} from "../../store/redux/polygonSelectors";


import { geralActions } from "../../store/redux/geral";
import { farmsSelected } from "../../store/redux/selector";
import { fetchFarmsFromPlantioApi } from "../../services/farmsLoader";
import { runPolygonAutoSyncIfNeeded } from "../../services/polygonAutoSync";
import { SafeAreaView } from "react-native-safe-area-context";



function ActionCard({ title, subtitle, icon, onPress }) {
	return (
		<View style={styles.cardShadow}>
			<Text onPress={onPress} style={styles.actionCardPressable}>
				<View style={styles.actionCard}>
					<View style={styles.actionIconWrap}>
						<Ionicons name={icon} size={24} color="#fff" />
					</View>

					<View style={styles.actionTextWrap}>
						<Text style={styles.actionTitle}>{title}</Text>
						<Text style={styles.actionSubtitle}>{subtitle}</Text>
					</View>

					<Ionicons name="chevron-forward" size={22} color="#6B7280" />
				</View>
			</Text>
		</View>
	);
}
function StatCard({ label, value, icon, color, onPress }) {
	return (
		<Pressable style={styles.statCard} onPress={value !== 0 ? onPress : () => console.log('sem')}>
			<View>

				<View style={[styles.statIconWrap, { backgroundColor: color }]}>
					<Ionicons name={icon} size={18} color="#fff" />
				</View>
				<Text style={styles.statValue}>{value}</Text>
				<Text style={styles.statLabel}>{label}</Text>
			</View>
			{
				onPress && value !== 0 &&
				<View>
					<Ionicons name="chevron-forward" size={20} color={Colors.primary500} />
				</View>
			}
		</Pressable>
	);
}

export default function PolygonHomeScreen() {
	const dispatch = useDispatch();
	const navigation = useNavigation();

	const { setFarms } = geralActions;
	const [isLoadingFarms, setIsLoadingFarms] = useState(false);

	const polygonItems = useSelector(selectPolygonItems);
	const polygonStats = useSelector(selectPolygonStats);
	const farmList = useSelector(farmsSelected)

	const user = useSelector((state) => state.auth.user);

	useEffect(() => {
		const ensureFarmsLoaded = async () => {
			if (farmList.length > 0) return;

			try {
				setIsLoadingFarms(true);
				const result = await fetchFarmsFromPlantioApi();
				dispatch(setFarms(result.farms));
			} catch (error) {
				console.log("Erro ao carregar fazendas nos polígonos:", error);
				Alert.alert(
					"Erro",
					"Não foi possível carregar a lista de fazendas."
				);
			} finally {
				setIsLoadingFarms(false);
			}
		};

		ensureFarmsLoaded();
	}, [dispatch, farmList.length, setFarms]);


	useEffect(() => {
		const pendingPolygons = polygonItems.filter(
			(item) =>
				item?.syncPending === true ||
				item?.status === "sync_pending" ||
				item?.status === "sync_error"
		);

		const runAutoSync = async () => {
			await runPolygonAutoSyncIfNeeded({
				user,
				pendingPolygons,
				onSuccessItem: (result) => {
					dispatch(
						polygonActions.markPolygonAsSynced({
							id: result.localId,
							serverId: result.serverId,
						})
					);
				},
				onErrorItem: (result) => {
					dispatch(
						polygonActions.markPolygonAsSyncError({
							id: result.localId,
							error: result.error || "Erro ao sincronizar",
						})
					);
				},
			});
		};

		runAutoSync();
	}, [dispatch, user, polygonItems]);





	const goToPolygonFlow = (screenName, params = {}) => {
		const parent = navigation.getParent?.();

		if (parent) {
			parent.navigate("PolygonFlowStackScreen", {
				screen: screenName,
				params,
			});
			return;
		}

		navigation.navigate("PolygonFlowStackScreen", {
			screen: screenName,
			params,
		});
	};

	const startNewDraft = (mode = "manual") => {
		dispatch(
			polygonActions.startPolygonDraft({
				mode,
			})
		);

		goToPolygonFlow("PolygonManualScreen", { mode });
	};

	return (
		<SafeAreaView style={{flex: 1}} edges={[]}>
			<ScrollView style={styles.container} contentContainerStyle={styles.content}>
				<View style={styles.heroCard}>
					<Text style={styles.heroTitle}>Polígonos</Text>
					<Text style={styles.heroSubtitle}>
						Crie, visualize, exporte e sincronize polígonos das áreas da fazenda.
					</Text>
				</View>
				<View style={styles.statsGrid}>
					<StatCard
						label="Total salvos"
						value={polygonStats?.total || 0}
						icon="layers"
						color="#8B5CF6"
						onPress={() => goToPolygonFlow("PolygonSavedListScreen")}
					/>
					<StatCard
						label="Pendentes"
						value={polygonStats?.pending || 0}
						icon="cloud-upload"
						color="#F59E0B"
						onPress={() => goToPolygonFlow("PolygonSyncScreen")}
					/>
					<StatCard
						label="Sincronizados"
						value={polygonStats?.synced || 0}
						icon="checkmark-done"
						color="#10B981"
					/>
					<StatCard
						label="Com erro"
						value={polygonStats?.error || 0}
						icon="alert-circle"
						color="#EF4444"
					/>
				</View>
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Criar novo polígono</Text>

					<ActionCard
						title="Ponto a ponto"
						subtitle="Marque os vértices manualmente. Você controla cada ponto."
						icon="location-outline"
						onPress={() => startNewDraft("manual")}
					/>

					<ActionCard
						title="Navegação automática"
						subtitle="Use a mesma tela, com configurações para captura automática."
						icon="navigate-outline"
						onPress={() => startNewDraft("tracking")}
					/>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Gerenciar</Text>

					<ActionCard
						title="Polígonos salvos"
						subtitle="Veja, exporte e abra os polígonos em modo visualização."
						icon="map-outline"
						onPress={() => goToPolygonFlow("PolygonSavedListScreen")}
					/>

					<ActionCard
						title="Sincronização"
						subtitle="Enviar pendentes para o backend."
						icon="cloud-upload-outline"
						onPress={() => goToPolygonFlow("PolygonSyncScreen")}
					/>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: Colors.secondary[200] || "#F4F6F8",
		paddingBottom: 60
	},
	content: {
		padding: 16,
		paddingBottom: 92,
	},
	heroCard: {
		backgroundColor: Colors.primary?.[901] || "#1F2937",
		borderRadius: 20,
		padding: 18,
		marginBottom: 18,
	},
	heroTitle: {
		fontSize: 22,
		fontWeight: "800",
		color: "#fff",
	},
	heroSubtitle: {
		fontSize: 14,
		lineHeight: 21,
		color: "rgba(255,255,255,0.85)",
		marginTop: 8,
	},
	section: {
		marginBottom: 18,
	},
	sectionTitle: {
		fontSize: 17,
		fontWeight: "800",
		color: "#111827",
		marginBottom: 12,
	},
	cardShadow: {
		marginBottom: 12,
	},
	actionCardPressable: {
	},
	actionCard: {
		backgroundColor: "#fff",
		borderRadius: 18,
		padding: 16,
		flexDirection: "row",
		alignItems: "center",
	},
	actionIconWrap: {
		width: 48,
		height: 48,
		borderRadius: 14,
		backgroundColor: "#2563EB",
		alignItems: "center",
		justifyContent: "center",
		marginRight: 14,
	},
	actionTextWrap: {
		flex: 1,
		paddingRight: 8,
	},
	actionTitle: {
		fontSize: 16,
		fontWeight: "800",
		color: "#111827",
	},
	actionSubtitle: {
		fontSize: 13,
		lineHeight: 18,
		color: "#6B7280",
		marginTop: 4,
	},
	statsGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		justifyContent: "space-between",
		marginBottom: 18,
	},
	statCard: {
		width: "48.5%",
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		backgroundColor: "#fff",
		borderRadius: 20,
		padding: 14,
		marginBottom: 12,
	},
	statIconWrap: {
		width: 34,
		height: 34,
		borderRadius: 10,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 10,
	},
	statValue: {
		fontSize: 24,
		fontWeight: "800",
		color: "#111827",
	},
	statLabel: {
		fontSize: 13,
		color: "#6B7280",
		marginTop: 4,
	},
});