import React, { useMemo, useState } from "react";
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	Platform,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import { useSelector, useDispatch } from "react-redux";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import MapView, { Polygon as MapPolygon, Marker, Polyline } from "react-native-maps";

import { Colors } from "../../constants/styles";
import { selectPolygonItems } from "../../store/redux/polygonSelectors";
import { polygonActions } from "../../store/redux/polygon";

import * as Haptics from "expo-haptics";

function toRad(value) {
	return (Number(value) * Math.PI) / 180;
}

function distanceBetweenPointsInMeters(pointA, pointB) {
	const lat1 = Number(pointA?.latitude);
	const lon1 = Number(pointA?.longitude);
	const lat2 = Number(pointB?.latitude);
	const lon2 = Number(pointB?.longitude);

	if (
		!Number.isFinite(lat1) ||
		!Number.isFinite(lon1) ||
		!Number.isFinite(lat2) ||
		!Number.isFinite(lon2)
	) {
		return 0;
	}

	const earthRadius = 6371000;
	const dLat = toRad(lat2 - lat1);
	const dLon = toRad(lon2 - lon1);

	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(toRad(lat1)) *
		Math.cos(toRad(lat2)) *
		Math.sin(dLon / 2) *
		Math.sin(dLon / 2);

	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return earthRadius * c;
}

function calculatePerimeterInMeters(points, isClosed) {
	if (!Array.isArray(points) || points.length < 2) return 0;

	let perimeter = 0;

	for (let index = 0; index < points.length - 1; index += 1) {
		perimeter += distanceBetweenPointsInMeters(points[index], points[index + 1]);
	}

	if (isClosed && points.length >= 3) {
		perimeter += distanceBetweenPointsInMeters(
			points[points.length - 1],
			points[0]
		);
	}

	return perimeter;
}

function calculatePolygonAreaInM2(points) {
	if (!Array.isArray(points) || points.length < 3) return 0;

	const valid = points.filter(
		(point) =>
			Number.isFinite(Number(point?.latitude)) &&
			Number.isFinite(Number(point?.longitude))
	);

	if (valid.length < 3) return 0;

	const earthRadius = 6378137;
	const avgLat =
		valid.reduce((sum, point) => sum + Number(point.latitude), 0) / valid.length;

	const projected = valid.map((point) => {
		const lat = Number(point.latitude);
		const lng = Number(point.longitude);

		return {
			x: earthRadius * toRad(lng) * Math.cos(toRad(avgLat)),
			y: earthRadius * toRad(lat),
		};
	});

	let area = 0;

	for (let index = 0; index < projected.length; index += 1) {
		const current = projected[index];
		const next = projected[(index + 1) % projected.length];
		area += current.x * next.y - next.x * current.y;
	}

	return Math.abs(area / 2);
}

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


function PointMarker() {
	return (
		<View style={styles.pointMarkerOuter}>
			<View style={styles.pointMarkerInner} />
		</View>
	);
}

export default function PolygonPreviewScreen() {
	const route = useRoute();
	const dispatch = useDispatch();
	const insets = useSafeAreaInsets();

	const items = useSelector(selectPolygonItems);
	const draft = useSelector((state) => state.polygon.draft);

	const [mapType, setMapType] = useState("satellite");
	const [sheetExpanded, setSheetExpanded] = useState(false);

	const [showDragHint, setShowDragHint] = useState(false);

	const polygonId = route?.params?.polygonId;
	const source = route?.params?.source;

	const polygon = useMemo(() => {
		if (source === "draft") {
			return {
				id: draft?.id || "draft-preview",
				name: draft?.name || "Rascunho",
				farmName: draft?.farmName || "Sem fazenda",
				mode: draft?.mode || "manual",
				points: draft?.points || [],
				isClosed: !!draft?.isClosed,
				observation: draft?.observation || "",
				status: "sync_pending",
				syncPending: true,
				createdAt: draft?.startedAt || null,
				updatedAt: draft?.finishedAt || null,
				areaM2: draft?.areaM2 || null,
				areaHa: draft?.areaHa || null,
				perimeterM: draft?.perimeterM || null,
			};
		}

		return (items || []).find((item) => item?.id === polygonId);
	}, [items, polygonId, source, draft]);

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

	const fallbackAreaM2 = useMemo(() => {
		if (points.length < 3) return 0;
		return calculatePolygonAreaInM2(points);
	}, [points]);

	const fallbackAreaHa = useMemo(() => fallbackAreaM2 / 10000, [fallbackAreaM2]);

	const fallbackPerimeterM = useMemo(() => {
		return calculatePerimeterInMeters(points, points.length >= 3);
	}, [points]);

	const displayAreaHa = useMemo(() => {
		if (Number.isFinite(Number(polygon?.areaHa)) && Number(polygon?.areaHa) > 0) {
			return Number(polygon.areaHa);
		}

		if (Number.isFinite(Number(polygon?.areaM2)) && Number(polygon?.areaM2) > 0) {
			return Number(polygon.areaM2) / 10000;
		}

		return fallbackAreaHa;
	}, [polygon?.areaHa, polygon?.areaM2, fallbackAreaHa]);

	const displayPerimeterM = useMemo(() => {
		if (Number.isFinite(Number(polygon?.perimeterM)) && Number(polygon?.perimeterM) > 0) {
			return Number(polygon.perimeterM);
		}

		return fallbackPerimeterM;
	}, [polygon?.perimeterM, fallbackPerimeterM]);

	const region = useMemo(() => buildRegion(points), [points]);

	const shouldRenderClosedShape =
		points.length >= 3 && (polygon?.isClosed || source === "draft");

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

	const handleEditDraft = () => {
		if (source !== "draft") return;
		// edição real continua no MapPicker
	};


	const handleMarkerPress = async () => {
		setShowDragHint(true);

		try {
			await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		} catch (error) {
			console.log("HAPTIC SELECT ERROR:", error);
		}

		setTimeout(() => {
			setShowDragHint(false);
		}, 2200);
	};
	return (
		<SafeAreaView
			style={styles.container}
			edges={Platform.OS === "android" ? ["bottom"] : []}
		>
			<MapView
				style={styles.map}
				initialRegion={region}
				mapType={mapType}
			>
				{points.length > 0 ? (
					<>
						{points.length >= 2 ? (
							<Polyline
								coordinates={points}
								strokeColor="rgba(21,101,192,0.95)"
								strokeWidth={3}
							/>
						) : null}

						{shouldRenderClosedShape ? (
							<MapPolygon
								coordinates={points}
								strokeColor="rgba(21,101,192,0.95)"
								fillColor="rgba(21,101,192,0.22)"
								strokeWidth={3}
							/>
						) : null}

						{points.map((point, index) => (
							<Marker
								key={`preview-point-${index}`}
								coordinate={point}
								draggable={source === "draft"}
								tracksViewChanges={false}
								onPress={handleMarkerPress}
								onDragStart={async () => {
									setShowDragHint(false);

									try {
										await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
									} catch (error) {
										console.log("HAPTIC DRAG START ERROR:", error);
									}
								}}
								onDragEnd={async (event) => {
									if (source !== "draft") return;
									const newCoord = event?.nativeEvent?.coordinate;
									if (!newCoord?.latitude || !newCoord?.longitude) return;

									const nextPoints = points.map((item, idx) =>
										idx === index
											? {
												latitude: Number(newCoord.latitude),
												longitude: Number(newCoord.longitude),
											}
											: item
									);

									dispatch(polygonActions.setDraftPoints(nextPoints));

									try {
										await Haptics.notificationAsync(
											Haptics.NotificationFeedbackType.Success
										);
									} catch (error) {
										console.log("HAPTIC DRAG END ERROR:", error);
									}
								}}
							>
								<PointMarker />
							</Marker>
						))}
					</>
				) : null}
			</MapView>

			<View style={styles.mapControls}>
				<TouchableOpacity
					style={styles.mapButton}
					onPress={() =>
						setMapType((prev) =>
							prev === "satellite" ? "standard" : "satellite"
						)
					}
				>
					<Ionicons name="layers-outline" size={18} color="#111827" />
				</TouchableOpacity>
			</View>
			{showDragHint && source === "draft" ? (
				<View style={styles.dragHintPill}>
					<Ionicons name="move-outline" size={15} color="#111827" />
					<Text style={styles.dragHintPillText}>Arraste a bola verde</Text>
				</View>
			) : null}

			<View
				style={[
					styles.bottomSheet,
					{
						paddingBottom: Math.max(insets.bottom, 10),
						minHeight: sheetExpanded ? 220 : 108,
					},
				]}
			>
				<TouchableOpacity
					style={styles.dragHandleWrap}
					onPress={async () => {
						try {
							await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
						} catch (error) {
							console.log("HAPTIC SHEET ERROR:", error);
						}

						setSheetExpanded((prev) => !prev);
					}}
					activeOpacity={0.8}
				>
					<View style={styles.dragHandleRow}>
						<Ionicons
							name={sheetExpanded ? "chevron-down" : "chevron-up"}
							size={18}
							color="#6B7280"
						/>
					</View>
				</TouchableOpacity>

				<View style={styles.titleRow}>
					<View style={styles.titleBlock}>
						<Text style={styles.title}>{polygon?.name}</Text>
						<Text style={styles.subtitle}>{polygon?.farmName}</Text>
					</View>

					<View
						style={[
							styles.statusBadge,
							source === "draft"
								? styles.statusPending
								: polygon?.status === "synced"
									? styles.statusSynced
									: polygon?.status === "sync_error"
										? styles.statusError
										: styles.statusPending,
						]}
					>
						<Text style={styles.statusText}>
							{source === "draft"
								? "Rascunho"
								: getStatusLabel(polygon?.status, polygon?.syncPending)}
						</Text>
					</View>
				</View>

				<View style={styles.infoRow}>
					<Text style={styles.infoMini}>📍 {points.length} pontos</Text>
					<Text style={styles.infoMini}>🌱 {displayAreaHa?.toFixed(2)} ha</Text>
					<Text style={styles.infoMini}>📏 {displayPerimeterM?.toFixed(0)} m</Text>
				</View>

				{sheetExpanded ? (
					<View style={styles.expandedContent}>
						<View style={styles.infoLine}>
							<Text style={styles.infoLabel}>Modo</Text>
							<Text style={styles.infoValue}>{getModeLabel(polygon?.mode)}</Text>
						</View>

						<View style={styles.infoLine}>
							<Text style={styles.infoLabel}>
								{source === "draft" ? "Rascunho iniciado" : "Criado em"}
							</Text>
							<Text style={styles.infoValue}>
								{formatDateTimeBR(polygon?.createdAt || polygon?.updatedAt)}
							</Text>
						</View>

						<View style={styles.infoLineColumn}>
							<Text style={styles.infoLabel}>Observação</Text>
							<Text style={styles.infoValueMultiline}>
								{polygon?.observation || "-"}
							</Text>
						</View>

						{source === "draft" ? (
							<Text style={styles.editHint}>
								Você pode arrastar os pontos diretamente no mapa para ajustar.
							</Text>
						) : null}
					</View>
				) : null}
			</View>
		</SafeAreaView>
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
	mapControls: {
		position: "absolute",
		top: 30,
		right: 16,
	},
	mapButton: {
		backgroundColor: "rgba(255,255,255,0.9)",
		padding: 10,
		borderRadius: 999,
	},
	bottomSheet: {
		position: "absolute",
		bottom: 0,
		left: 0,
		right: 0,
		backgroundColor: "rgba(255,255,255,0.96)",
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		paddingHorizontal: 14,
		paddingTop: 8,
	},
	dragHandleWrap: {
		alignItems: "center",
		paddingBottom: 8,
	},
	dragHandle: {
		width: 42,
		height: 5,
		borderRadius: 999,
		backgroundColor: "#D1D5DB",
	},
	titleRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "flex-start",
		gap: 12,
	},
	titleBlock: {
		flex: 1,
	},
	title: {
		fontSize: 18,
		fontWeight: "800",
		color: "#111827",
	},
	subtitle: {
		marginTop: 4,
		fontSize: 13,
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
	infoRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginTop: 10,
	},
	infoMini: {
		fontSize: 13,
		fontWeight: "700",
		color: "#374151",
	},
	expandedContent: {
		marginTop: 14,
		paddingTop: 10,
		borderTopWidth: 1,
		borderTopColor: "#E5E7EB",
	},
	infoLine: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 10,
		gap: 12,
	},
	infoLineColumn: {
		marginBottom: 10,
	},
	infoLabel: {
		fontSize: 12,
		fontWeight: "700",
		color: "#6B7280",
		textTransform: "uppercase",
	},
	infoValue: {
		flex: 1,
		textAlign: "right",
		fontSize: 13,
		fontWeight: "700",
		color: "#111827",
	},
	infoValueMultiline: {
		marginTop: 6,
		fontSize: 13,
		lineHeight: 18,
		color: "#111827",
		fontWeight: "600",
	},
	editHint: {
		marginTop: 4,
		fontSize: 12,
		lineHeight: 18,
		color: "#2563EB",
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
	pointMarkerOuter: {
		width: 22,
		height: 22,
		borderRadius: 11,
		backgroundColor: "rgba(255,255,255,0.92)",
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 1,
		borderColor: "rgba(0,0,0,0.12)",
	},

	pointMarkerInner: {
		width: 14,
		height: 14,
		borderRadius: 7,
		backgroundColor: "#22C55E",
	},

	dragHandleRow: {
		width: 44,
		height: 22,
		borderRadius: 999,
		backgroundColor: "#F3F4F6",
		alignItems: "center",
		justifyContent: "center",
	},
	dragHintPill: {
		position: "absolute",
		top: 132,
		alignSelf: "center",
		backgroundColor: "rgba(255,255,255,0.94)",
		borderRadius: 999,
		paddingHorizontal: 14,
		paddingVertical: 8,
		flexDirection: "row",
		alignItems: "center",
	},

	dragHintPillText: {
		fontSize: 12,
		fontWeight: "800",
		color: "#111827",
		marginLeft: 6,
	},
});