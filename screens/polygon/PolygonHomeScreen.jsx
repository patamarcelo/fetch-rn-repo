import React, { useMemo } from "react";
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ScrollView,
	Pressable,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

import { Colors } from "../../constants/styles";
import { polygonActions } from "../../store/redux/polygon";
import {
	selectPolygonItems,
	selectPolygonStats,
} from "../../store/redux/polygonSelectors";
import { farmsSelected, farmsSelector } from "../../store/redux/selector";

function ActionCard({ title, subtitle, icon, iconLib = "ion", onPress }) {
	const IconComponent =
		iconLib === "material" ? MaterialCommunityIcons : Ionicons;

	return (
		<TouchableOpacity activeOpacity={0.88} onPress={onPress} style={styles.actionCard}>
			<View style={styles.actionIconWrap}>
				<IconComponent name={icon} size={24} color="#fff" />
			</View>

			<View style={styles.actionContent}>
				<Text style={styles.actionTitle}>{title}</Text>
				<Text style={styles.actionSubtitle}>{subtitle}</Text>
			</View>

			<Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.8)" />
		</TouchableOpacity>
	);
}

function StatCard({ label, value, icon, color, onPress }) {
	return (
		<Pressable style={styles.statCard} onPress={onPress}>
			<View>

				<View style={[styles.statIconWrap, { backgroundColor: color }]}>
					<Ionicons name={icon} size={18} color="#fff" />
				</View>
				<Text style={styles.statValue}>{value}</Text>
				<Text style={styles.statLabel}>{label}</Text>
			</View>
			{
				onPress &&
				<View>
					<Ionicons name="chevron-forward" size={20} color={Colors.primary500} />
				</View>
			}
		</Pressable>
	);
}

const PolygonHomeScreen = () => {
	const navigation = useNavigation();
	const dispatch = useDispatch();

	const polygonItems = useSelector(selectPolygonItems);
	const polygonStats = useSelector(selectPolygonStats);
	const selectedFarm = useSelector(farmsSelected);
	const farms = useSelector(farmsSelector);

	const selectedFarmData = useMemo(() => {
		if (!selectedFarm) return null;
		if (typeof selectedFarm === "object") return selectedFarm;

		return farms?.find(
			(item) =>
				item?.id === selectedFarm ||
				item?.fazenda_id === selectedFarm ||
				item?.nome === selectedFarm
		);
	}, [selectedFarm, farms]);

	const goToPolygonFlow = (screen) => {
		const parentNavigation = navigation.getParent();
		if (!parentNavigation) return;

		parentNavigation.navigate("PolygonFlowStackScreen", {
			screen,
		});
	};

	const startNewDraft = (mode) => {
		dispatch(
			polygonActions.startPolygonDraft({
				farmId:
					selectedFarmData?.id ||
					selectedFarmData?.fazenda_id ||
					null,
				farmName:
					selectedFarmData?.nome ||
					selectedFarmData?.fazenda ||
					"",
				mode,
			})
		);

		if (mode === "manual") {
			goToPolygonFlow("PolygonManualScreen");
			return;
		}

		goToPolygonFlow("PolygonTrackingScreen");
	};

	return (
		<ScrollView style={styles.container} contentContainerStyle={styles.content}>
			<View style={styles.heroCard}>

				<Text style={styles.heroTitle}>Polígonos</Text>
				<Text style={styles.heroSubtitle}>
					Crie áreas por GPS, salve offline no aparelho e sincronize depois com o backend.
				</Text>
				<View style={styles.heroBadge}>
					<Ionicons name="map" size={16} color="#fff" />
					<Text style={styles.heroBadgeText}>Módulo de Geolocalização</Text>
				</View>
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
					subtitle="Marque cada vértice manualmente usando a localização atual."
					icon="location"
					onPress={() => startNewDraft("manual")}
				/>

				<ActionCard
					title="Navegação automática"
					subtitle="Inicie a gravação e deixe o app capturar os pontos automaticamente."
					icon="navigate"
					onPress={() => startNewDraft("tracking")}
				/>
			</View>

			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Gerenciar</Text>

				<ActionCard
					title="Polígonos salvos"
					subtitle={`Visualize os ${polygonItems.length} polígonos armazenados no aparelho.`}
					icon="folder-open"
					onPress={() => goToPolygonFlow("PolygonSavedListScreen")}
				/>

				<ActionCard
					title="Sincronização"
					subtitle="Em breve: enviar pendentes para o backend quando houver internet."
					icon="cloud-upload-outline"
					onPress={() => goToPolygonFlow("PolygonSavedListScreen")}
				/>
			</View>
		</ScrollView>
	);
};

export default PolygonHomeScreen;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: Colors.secondary[100] || "#F4F6F8",
	},
	content: {
		padding: 16,
		paddingBottom: 120,
	},
	heroCard: {
		backgroundColor: Colors.primary[901] || "#1F2937",
		borderRadius: 24,
		padding: 18,
		marginBottom: 18,
	},
	heroBadge: {
		alignSelf: "flex-end",
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		backgroundColor: "rgba(255,255,255,0.12)",
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 999,
		marginBottom: 14,
	},
	heroBadgeText: {
		color: "#fff",
		fontSize: 12,
		fontWeight: "700",
	},
	heroTitle: {
		color: "#fff",
		fontSize: 28,
		fontWeight: "800",
		marginBottom: 8,
	},
	heroSubtitle: {
		color: "rgba(255,255,255,0.85)",
		fontSize: 14,
		lineHeight: 21,
		marginBottom: 16,
	},
	farmInfoBox: {
		backgroundColor: "rgba(255,255,255,0.10)",
		borderRadius: 16,
		padding: 12,
	},
	farmInfoLabel: {
		color: "rgba(255,255,255,0.70)",
		fontSize: 12,
		marginBottom: 4,
	},
	farmInfoValue: {
		color: "#fff",
		fontSize: 15,
		fontWeight: "700",
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
	section: {
		marginBottom: 20,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: "800",
		color: "#111827",
		marginBottom: 12,
	},
	actionCard: {
		backgroundColor: Colors.primary[901] || "#1F2937",
		borderRadius: 20,
		padding: 14,
		marginBottom: 12,
		flexDirection: "row",
		alignItems: "center",
	},
	actionIconWrap: {
		width: 46,
		height: 46,
		borderRadius: 14,
		backgroundColor: "rgba(255,255,255,0.14)",
		alignItems: "center",
		justifyContent: "center",
		marginRight: 12,
	},
	actionContent: {
		flex: 1,
	},
	actionTitle: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "800",
		marginBottom: 4,
	},
	actionSubtitle: {
		color: "rgba(255,255,255,0.78)",
		fontSize: 13,
		lineHeight: 18,
	},
});