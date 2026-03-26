import React, { useMemo } from "react";
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import { useSelector } from "react-redux";
import Ionicons from "@expo/vector-icons/Ionicons";
import MapView, { Polygon as MapPolygon, Marker } from "react-native-maps";

import { Colors } from "../../constants/styles";
import { selectPolygonItems } from "../../store/redux/polygonSelectors";

function formatDateTimeBR(dateValue) {
	if (!dateValue) return "-";

	try {
		return new Date(dateValue).toLocaleString("pt-BR");
	} catch (error) {
		return "-";
	}
}

function getStatusLabel(status, syncPending) {
	if (status === "synced") return "Sincronizado";
	if (status === "sync_error") return "Erro";
	if (syncPending || status === "sync_pending") return "Pendente";
	return "Pendente";
}

function getModeLabel(mode) {
	if (mode === "manual") return "Manual";
	if (mode === "tracking") return "Rastreamento";
	return mode || "-";
}

function buildRegion(points) {
	if (!Array.isArray(points) || points.length === 0) {
		return {
			latitude: -14.235,
			longitude: -51.9253,
			latitudeDelta: 20,
			longitudeDelta: 20,
		};
	}

	const validPoints = points.filter(
		(point) =>
			Number.isFinite(Number(point?.latitude)) &&
			Number.isFinite(Number(point?.longitude))
	);

	if (!validPoints.length) {
		return {
			latitude: -14.235,
			longitude: -51.9253,
			latitudeDelta: 20,
			longitudeDelta: 20,
		};
	}

	const latitudes = validPoints.map((p) => Number(p.latitude));
	const longitudes = validPoints.map((p) => Number(p.longitude));

	const minLat = Math.min(...latitudes);
	const maxLat = Math.max(...latitudes);
	const minLng = Math.min(...longitudes);
	const maxLng = Math.max(...longitudes);

	return {
		latitude: (minLat + maxLat) / 2,
		longitude: (minLng + maxLng) / 2,
		latitudeDelta: Math.max((maxLat - minLat) * 1.6, 0.0035),
		longitudeDelta: Math.max((maxLng - minLng) * 1.6, 0.0035),
	};
}

export default function PolygonPreviewScreen() {
	const route = useRoute();
	const items = useSelector(selectPolygonItems);
	const polygonId = route?.params?.polygonId;

	const polygon = useMemo(
		() => (items || []).find((item) => item?.id === polygonId),
		[items, polygonId]
	);

	const points = useMemo(() => {
		if (!Array.isArray(polygon?.points)) return [];
		return polygon.points
			.map((point) => ({
				latitude: Number(point?.latitude),
				longitude: Number(point?.longitude),
			}))
			.filter(
				(point) =>
					Number.isFinite(point.latitude) &&
					Number.isFinite(point.longitude)
			);
	}, [polygon]);

	const region = useMemo(() => buildRegion(points), [points]);

	if (!polygon) {
		return (
			<View style={styles.emptyWrap}>
				<Ionicons name="map-outline" size={54} color="#9CA3AF" />
				<Text style={styles.emptyTitle}>Polígono não encontrado</Text>
				<Text style={styles.emptyText}>
					Esse item não está mais disponível na lista local.
				</Text>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<MapView style={styles.map} initialRegion={region}>
				{points.length > 0 ? (
					<>
						<MapPolygon
							coordinates={points}
							strokeColor="rgba(21,101,192,0.95)"
							fillColor="rgba(21,101,192,0.22)"
							strokeWidth={3}
						/>
						<Marker coordinate={points[0]} pinColor="#16A34A" />
					</>
				) : null}
			</MapView>

			<ScrollView
				style={styles.bottomSheet}
				contentContainerStyle={styles.bottomSheetContent}
				showsVerticalScrollIndicator={false}
			>
				<View style={styles.titleRow}>
					<View style={styles.titleWrap}>
						<Text style={styles.title}>{polygon?.name || "Polígono sem nome"}</Text>
						<Text style={styles.subtitle}>
							{polygon?.farmName || "Sem fazenda"}
						</Text>
					</View>

					<View
						style={[
							styles.statusBadge,
							polygon?.status === "synced"
								? styles.statusSynced
								: polygon?.status === "sync_error"
									? styles.statusError
									: styles.statusPending,
						]}
					>
						<Text style={styles.statusText}>
							{getStatusLabel(polygon?.status, polygon?.syncPending)}
						</Text>
					</View>
				</View>

				<View style={styles.infoGrid}>
					<View style={styles.infoCard}>
						<Text style={styles.infoLabel}>Modo</Text>
						<Text style={styles.infoValue}>{getModeLabel(polygon?.mode)}</Text>
					</View>

					<View style={styles.infoCard}>
						<Text style={styles.infoLabel}>Pontos</Text>
						<Text style={styles.infoValue}>{points.length}</Text>
					</View>

					<View style={styles.infoCard}>
						<Text style={styles.infoLabel}>Área</Text>
						<Text style={styles.infoValue}>
							{polygon?.areaM2 ? `${polygon.areaM2} m²` : "-"}
						</Text>
					</View>

					<View style={styles.infoCard}>
						<Text style={styles.infoLabel}>Perímetro</Text>
						<Text style={styles.infoValue}>
							{polygon?.perimeterM ? `${polygon.perimeterM} m` : "-"}
						</Text>
					</View>
				</View>

				<View style={styles.infoBlock}>
					<Text style={styles.infoBlockLabel}>Criado em</Text>
					<Text style={styles.infoBlockValue}>
						{formatDateTimeBR(polygon?.createdAt || polygon?.updatedAt)}
					</Text>
				</View>

				<View style={styles.infoBlock}>
					<Text style={styles.infoBlockLabel}>Observação</Text>
					<Text style={styles.infoBlockValue}>
						{polygon?.observation || "-"}
					</Text>
				</View>

				{polygon?.syncError ? (
					<View style={styles.errorBox}>
						<Ionicons name="alert-circle-outline" size={16} color="#B91C1C" />
						<Text style={styles.errorText}>{polygon.syncError}</Text>
					</View>
				) : null}
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#fff",
	},
	map: {
		flex: 1,
	},
	bottomSheet: {
		maxHeight: "42%",
		backgroundColor: "#fff",
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		marginTop: -18,
	},
	bottomSheetContent: {
		padding: 18,
		paddingBottom: 32,
	},
	titleRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "flex-start",
		gap: 12,
		marginBottom: 16,
	},
	titleWrap: {
		flex: 1,
	},
	title: {
		fontSize: 20,
		fontWeight: "800",
		color: "#111827",
	},
	subtitle: {
		marginTop: 4,
		fontSize: 14,
		color: "#6B7280",
		fontWeight: "600",
	},
	statusBadge: {
		alignSelf: "flex-start",
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 999,
	},
	statusPending: {
		backgroundColor: "rgba(245,158,11,0.15)",
	},
	statusSynced: {
		backgroundColor: "rgba(16,185,129,0.15)",
	},
	statusError: {
		backgroundColor: "rgba(239,68,68,0.15)",
	},
	statusText: {
		fontSize: 11,
		fontWeight: "800",
		color: "#111827",
	},
	infoGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		justifyContent: "space-between",
		marginBottom: 14,
	},
	infoCard: {
		width: "48.5%",
		backgroundColor: "#F9FAFB",
		borderRadius: 14,
		paddingHorizontal: 12,
		paddingVertical: 12,
		marginBottom: 10,
	},
	infoLabel: {
		fontSize: 11,
		fontWeight: "700",
		color: "#6B7280",
		textTransform: "uppercase",
		marginBottom: 4,
	},
	infoValue: {
		fontSize: 14,
		fontWeight: "700",
		color: "#111827",
	},
	infoBlock: {
		backgroundColor: "#F9FAFB",
		borderRadius: 14,
		paddingHorizontal: 12,
		paddingVertical: 12,
		marginBottom: 10,
	},
	infoBlockLabel: {
		fontSize: 11,
		fontWeight: "700",
		color: "#6B7280",
		textTransform: "uppercase",
		marginBottom: 4,
	},
	infoBlockValue: {
		fontSize: 14,
		fontWeight: "600",
		color: "#111827",
	},
	errorBox: {
		marginTop: 6,
		backgroundColor: "rgba(185,28,28,0.08)",
		borderRadius: 12,
		paddingHorizontal: 10,
		paddingVertical: 8,
		flexDirection: "row",
		alignItems: "center",
	},
	errorText: {
		flex: 1,
		marginLeft: 8,
		fontSize: 12,
		color: "#B91C1C",
		fontWeight: "600",
	},
	emptyWrap: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 24,
		backgroundColor: Colors.primary100 || "#F4F6F8",
	},
	emptyTitle: {
		fontSize: 20,
		fontWeight: "800",
		color: "#111827",
		marginTop: 16,
		marginBottom: 8,
		textAlign: "center",
	},
	emptyText: {
		fontSize: 14,
		lineHeight: 21,
		color: "#6B7280",
		textAlign: "center",
	},
});