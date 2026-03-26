import React, { useMemo, useState } from "react";
import {
	View,
	Text,
	StyleSheet,
	FlatList,
	TouchableOpacity,
	Alert,
	TextInput,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import MapView, { Polygon as MapPolygon, Marker } from "react-native-maps";

import { Colors } from "../../constants/styles";
import { selectPolygonItems } from "../../store/redux/polygonSelectors";
import { polygonActions } from "../../store/redux/polygon";
import { exportPolygonsToKml } from "../../utils/polygonKml";

function formatDateTimeBR(dateValue) {
	if (!dateValue) return "-";

	try {
		const date = new Date(dateValue);
		return date.toLocaleDateString("pt-BR");
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

function buildPreviewRegion(points) {
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

	const latitude = (minLat + maxLat) / 2;
	const longitude = (minLng + maxLng) / 2;

	const latitudeDelta = Math.max((maxLat - minLat) * 1.8, 0.0035);
	const longitudeDelta = Math.max((maxLng - minLng) * 1.8, 0.0035);

	return {
		latitude,
		longitude,
		latitudeDelta,
		longitudeDelta,
	};
}

function PolygonMiniPreview({ points }) {
	const region = useMemo(() => buildPreviewRegion(points), [points]);

	const validPoints = useMemo(() => {
		if (!Array.isArray(points)) return [];
		return points
			.map((point) => ({
				latitude: Number(point?.latitude),
				longitude: Number(point?.longitude),
			}))
			.filter(
				(point) =>
					Number.isFinite(point.latitude) &&
					Number.isFinite(point.longitude)
			);
	}, [points]);

	if (!validPoints.length) {
		return (
			<View style={styles.previewEmpty}>
				<Ionicons name="map-outline" size={20} color="#9CA3AF" />
				<Text style={styles.previewEmptyText}>Sem pontos válidos</Text>
			</View>
		);
	}

	return (
		<View style={styles.previewWrap}>
			<MapView
				style={styles.previewMap}
				initialRegion={region}
				scrollEnabled={false}
				zoomEnabled={false}
				rotateEnabled={false}
				pitchEnabled={false}
				toolbarEnabled={false}
				moveOnMarkerPress={false}
				pointerEvents="none"
			>
				<MapPolygon
					coordinates={validPoints}
					strokeColor="rgba(21,101,192,0.95)"
					fillColor="rgba(21,101,192,0.22)"
					strokeWidth={2}
				/>
				{validPoints.slice(0, 1).map((point, index) => (
					<Marker
						key={`start-${index}`}
						coordinate={point}
						pinColor="#16A34A"
					/>
				))}
			</MapView>

			<View style={styles.previewBadge}>
				<Ionicons name="eye-outline" size={13} color="#fff" />
				<Text style={styles.previewBadgeText}>Visualização</Text>
			</View>
		</View>
	);
}

function PolygonItem({
	item,
	isSelected,
	isSelectionMode,
	onToggleSelect,
	onDelete,
	onExport,
	onPress,
}) {
	const statusLabel = getStatusLabel(item?.status, item?.syncPending);

	return (
		<TouchableOpacity activeOpacity={0.9} style={styles.itemCard} onPress={onPress}>
			<View style={styles.itemHeader}>
				<View style={styles.itemHeaderLeft}>
					<View style={styles.titleRow}>
						<Text style={styles.itemTitle} numberOfLines={1}>
							{item?.name || "Polígono sem nome"}
						</Text>

						<View
							style={[
								styles.statusBadge,
								item?.status === "synced"
									? styles.statusSynced
									: item?.status === "sync_error"
										? styles.statusError
										: styles.statusPending,
							]}
						>
							<Text style={styles.statusText}>{statusLabel}</Text>
						</View>
					</View>

					<Text style={styles.itemFarmName} numberOfLines={1}>
						{item?.farmName || "Sem fazenda"}
					</Text>
				</View>

				<View style={styles.headerRightActions}>
					{
						!isSelectionMode &&
						<TouchableOpacity
							style={styles.openButton}
							onPress={onPress}
							hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
						>
							<Ionicons name="chevron-forward" size={20} color="#111827" />
						</TouchableOpacity>
					}

					{isSelectionMode ? (
						<TouchableOpacity
							style={[
								styles.selectButton,
								isSelected && styles.selectButtonActive,
							]}
							onPress={onToggleSelect}
						>
							<Ionicons
								name={isSelected ? "checkmark-circle" : "ellipse-outline"}
								size={22}
								color={isSelected ? "#16A34A" : "#6B7280"}
							/>
						</TouchableOpacity>
					) : (
						null
					)}
				</View>
			</View>

			<PolygonMiniPreview points={item?.points || []} />

			<View style={styles.infoRowThree}>
				<View style={styles.infoCardThree}>
					<Text style={styles.infoLabel}>Modo</Text>
					<Text style={styles.infoValue} numberOfLines={1}>
						{getModeLabel(item?.mode)}
					</Text>
				</View>

				<View style={styles.infoCardThree}>
					<Text style={styles.infoLabel}>Pontos</Text>
					<Text style={styles.infoValue} numberOfLines={1}>
						{item?.points?.length || 0}
					</Text>
				</View>

				<View style={styles.infoCardThree}>
					<Text style={styles.infoLabel}>Criado em</Text>
					<Text style={styles.infoValue} numberOfLines={1}>
						{formatDateTimeBR(item?.createdAt || item?.updatedAt)}
					</Text>
				</View>
			</View>

			<View style={styles.cardActionsRow}>
				<TouchableOpacity style={styles.cardActionButton} onPress={onExport}>
					<Ionicons name="download-outline" size={18} color="#111827" />
					<Text style={styles.cardActionText}>Exportar</Text>
				</TouchableOpacity>

				{!isSelectionMode ? (
					<TouchableOpacity style={styles.cardActionButton} onPress={onDelete}>
						<Ionicons name="trash-outline" size={18} color="#B91C1C" />
						<Text style={[styles.cardActionText, styles.deleteText]}>Excluir</Text>
					</TouchableOpacity>
				) : null}
			</View>

			{item?.syncError ? (
				<View style={styles.errorBox}>
					<Ionicons name="alert-circle-outline" size={16} color="#B91C1C" />
					<Text style={styles.errorText}>{item.syncError}</Text>
				</View>
			) : null}
		</TouchableOpacity>
	);
}

const PolygonSavedListScreen = () => {
	const dispatch = useDispatch();
	const navigation = useNavigation();
	const items = useSelector(selectPolygonItems);

	const [isSelectionMode, setIsSelectionMode] = useState(false);
	const [selectedIds, setSelectedIds] = useState([]);
	const [searchText, setSearchText] = useState("");

	const sortedItems = useMemo(() => {
		return [...items].sort((a, b) => {
			const dateA = new Date(a?.updatedAt || a?.createdAt || 0).getTime();
			const dateB = new Date(b?.updatedAt || b?.createdAt || 0).getTime();
			return dateB - dateA;
		});
	}, [items]);

	const filteredItems = useMemo(() => {
		const term = (searchText || "").trim().toLowerCase();

		if (!term) return sortedItems;

		return sortedItems.filter((item) => {
			const haystack = [
				item?.name,
				item?.farmName,
				item?.mode,
				getStatusLabel(item?.status, item?.syncPending),
				item?.observation,
			]
				.filter(Boolean)
				.join(" ")
				.toLowerCase();

			return haystack.includes(term);
		});
	}, [sortedItems, searchText]);

	const selectedPolygons = useMemo(() => {
		return filteredItems.filter((item) => selectedIds.includes(item.id));
	}, [filteredItems, selectedIds]);

	const handleDeletePolygon = (polygon) => {
		Alert.alert(
			"Excluir polígono",
			`Deseja excluir "${polygon?.name || "Polígono sem nome"}"?`,
			[
				{ text: "Cancelar", style: "cancel" },
				{
					text: "Excluir",
					style: "destructive",
					onPress: () => {
						try {
							dispatch(polygonActions.deletePolygon(polygon.id));
							setSelectedIds((prev) => prev.filter((id) => id !== polygon.id));
						} catch (error) {
							console.log("Erro ao excluir polígono:", error);
							Alert.alert("Erro", "Não foi possível excluir o polígono.");
						}
					},
				},
			]
		);
	};

	const handleToggleSelect = (polygonId) => {
		setSelectedIds((prev) =>
			prev.includes(polygonId)
				? prev.filter((id) => id !== polygonId)
				: [...prev, polygonId]
		);
	};

	const handleToggleSelectionMode = () => {
		setIsSelectionMode((prev) => !prev);
		setSelectedIds([]);
	};

	const handleExportOne = async (polygon) => {
		try {
			await exportPolygonsToKml(
				[polygon],
				`${(polygon?.name || "poligono").replace(/\s+/g, "_")}.kml`
			);
		} catch (error) {
			console.log("Erro ao exportar um polígono:", error);
			Alert.alert("Erro", "Não foi possível exportar o KML.");
		}
	};

	const handleExportSelected = async () => {
		if (!selectedPolygons.length) {
			Alert.alert("Nenhum selecionado", "Selecione ao menos um polígono.");
			return;
		}

		try {
			await exportPolygonsToKml(selectedPolygons, "poligonos_selecionados.kml");
		} catch (error) {
			console.log("Erro ao exportar selecionados:", error);
			Alert.alert("Erro", "Não foi possível exportar o KML.");
		}
	};

	const handleExportAll = async () => {
		if (!filteredItems.length) {
			Alert.alert("Sem polígonos", "Não há polígonos para exportar.");
			return;
		}

		try {
			await exportPolygonsToKml(filteredItems, "todos_os_poligonos.kml");
		} catch (error) {
			console.log("Erro ao exportar todos:", error);
			Alert.alert("Erro", "Não foi possível exportar o KML.");
		}
	};

	const handleOpenPreview = (polygon) => {
		navigation.navigate("PolygonPreviewScreen", {
			polygonId: polygon?.id,
		});
	};

	return (
		<View style={styles.container}>
			{sortedItems.length === 0 ? (
				<View style={styles.emptyWrap}>
					<Ionicons name="map-outline" size={54} color="#9CA3AF" />
					<Text style={styles.emptyTitle}>Nenhum polígono salvo ainda</Text>
					<Text style={styles.emptyText}>
						Crie um polígono manual ou automático para começar.
					</Text>
				</View>
			) : (
				<>
					<View style={styles.topActionsWrap}>
						<TouchableOpacity
							style={styles.topActionButton}
							onPress={handleExportAll}
						>
							<Ionicons name="download-outline" size={18} color="#111827" />
							<Text style={styles.topActionText}>Exportar todos</Text>
						</TouchableOpacity>

						<TouchableOpacity
							style={styles.topActionButton}
							onPress={handleToggleSelectionMode}
						>
							<Ionicons
								name={isSelectionMode ? "close-outline" : "checkmark-done-outline"}
								size={18}
								color="#111827"
							/>
							<Text style={styles.topActionText}>
								{isSelectionMode ? "Cancelar seleção" : "Selecionar vários"}
							</Text>
						</TouchableOpacity>
					</View>

					<View style={styles.searchWrap}>
						<View style={styles.searchInputWrap}>
							<Ionicons name="search-outline" size={18} color="#6B7280" />
							<TextInput
								style={styles.searchInput}
								placeholder="Buscar por fazenda, polígono, modo ou status"
								placeholderTextColor="#9CA3AF"
								value={searchText}
								onChangeText={setSearchText}
								autoCorrect={false}
								autoCapitalize="none"
							/>
							{!!searchText && (
								<TouchableOpacity onPress={() => setSearchText("")}>
									<Ionicons name="close-circle" size={18} color="#9CA3AF" />
								</TouchableOpacity>
							)}
						</View>
					</View>

					{isSelectionMode ? (
						<View style={styles.selectionBar}>
							<Text style={styles.selectionBarText}>
								{selectedIds.length} selecionado(s)
							</Text>

							<TouchableOpacity
								style={styles.exportSelectedButton}
								onPress={handleExportSelected}
							>
								<Ionicons name="download-outline" size={18} color="#fff" />
								<Text style={styles.exportSelectedText}>Exportar selecionados</Text>
							</TouchableOpacity>
						</View>
					) : null}

					<FlatList
						data={filteredItems}
						keyExtractor={(item) => String(item.id)}
						contentContainerStyle={styles.listContent}
						keyboardShouldPersistTaps="handled"
						ListEmptyComponent={
							<View style={styles.emptySearchWrap}>
								<Ionicons name="search-outline" size={42} color="#9CA3AF" />
								<Text style={styles.emptySearchTitle}>Nenhum resultado encontrado</Text>
								<Text style={styles.emptySearchText}>
									Tente buscar por outro nome de fazenda, polígono ou status.
								</Text>
							</View>
						}
						renderItem={({ item }) => (
							<PolygonItem
								item={item}
								isSelectionMode={isSelectionMode}
								isSelected={selectedIds.includes(item.id)}
								onPress={() => handleOpenPreview(item)}
								onToggleSelect={() => handleToggleSelect(item.id)}
								onDelete={() => handleDeletePolygon(item)}
								onExport={() => handleExportOne(item)}
							/>
						)}
					/>
				</>
			)}
		</View>
	);
};

export default PolygonSavedListScreen;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: Colors.primary100 || "#F4F6F8",
	},
	topActionsWrap: {
		paddingHorizontal: 16,
		paddingTop: 16,
		flexDirection: "row",
		justifyContent: "space-between",
	},
	topActionButton: {
		width: "48.5%",
		minHeight: 46,
		borderRadius: 14,
		backgroundColor: "#fff",
		alignItems: "center",
		justifyContent: "center",
		flexDirection: "row",
	},
	topActionText: {
		marginLeft: 8,
		fontSize: 13,
		fontWeight: "700",
		color: "#111827",
	},
	searchWrap: {
		paddingHorizontal: 16,
		paddingTop: 12,
		paddingBottom: 6,
	},
	searchInputWrap: {
		minHeight: 48,
		borderRadius: 16,
		backgroundColor: "#fff",
		paddingHorizontal: 14,
		flexDirection: "row",
		alignItems: "center",
	},
	searchInput: {
		flex: 1,
		marginLeft: 10,
		fontSize: 14,
		color: "#111827",
	},
	selectionBar: {
		marginTop: 12,
		marginHorizontal: 16,
		marginBottom: 4,
		backgroundColor: Colors.primary[901] || "#1F2937",
		borderRadius: 16,
		padding: 14,
	},
	selectionBarText: {
		color: "#fff",
		fontSize: 14,
		fontWeight: "700",
		marginBottom: 10,
	},
	exportSelectedButton: {
		minHeight: 46,
		borderRadius: 14,
		backgroundColor: "rgba(255,255,255,0.12)",
		alignItems: "center",
		justifyContent: "center",
		flexDirection: "row",
	},
	exportSelectedText: {
		marginLeft: 8,
		color: "#fff",
		fontSize: 14,
		fontWeight: "800",
	},
	listContent: {
		padding: 16,
		paddingBottom: 120,
	},
	itemCard: {
		backgroundColor: "#fff",
		borderRadius: 18,
		padding: 14,
		marginBottom: 12,
	},
	itemHeader: {
		flexDirection: "row",
		alignItems: "flex-start",
		justifyContent: "space-between",
		marginBottom: 12,
	},
	itemHeaderLeft: {
		flex: 1,
		paddingRight: 8,
	},
	titleRow: {
		flexDirection: "row",
		alignItems: "center",
		flexWrap: "wrap",
		gap: 8,
	},
	itemTitle: {
		flexShrink: 1,
		fontSize: 16,
		fontWeight: "800",
		color: "#111827",
	},
	itemFarmName: {
		marginTop: 4,
		fontSize: 13,
		fontWeight: "600",
		color: "#6B7280",
	},
	headerRightActions: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	openButton: {
		width: 38,
		height: 38,
		borderRadius: 12,
		backgroundColor: "#EEF2FF",
		alignItems: "center",
		justifyContent: "center",
	},
	deleteButton: {
		width: 38,
		height: 38,
		borderRadius: 12,
		backgroundColor: "rgba(185,28,28,0.08)",
		alignItems: "center",
		justifyContent: "center",
	},
	selectButton: {
		width: 38,
		height: 38,
		borderRadius: 12,
		backgroundColor: "#F3F4F6",
		alignItems: "center",
		justifyContent: "center",
	},
	selectButtonActive: {
		backgroundColor: "rgba(22,163,74,0.10)",
	},
	previewWrap: {
		height: 148,
		borderRadius: 16,
		overflow: "hidden",
		backgroundColor: "#E5E7EB",
		marginBottom: 12,
		position: "relative",
	},
	previewMap: {
		flex: 1,
	},
	previewBadge: {
		position: "absolute",
		right: 10,
		top: 10,
		borderRadius: 999,
		paddingHorizontal: 10,
		paddingVertical: 6,
		backgroundColor: "rgba(17,24,39,0.72)",
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
	},
	previewBadgeText: {
		color: "#fff",
		fontSize: 11,
		fontWeight: "700",
	},
	previewEmpty: {
		height: 148,
		borderRadius: 16,
		backgroundColor: "#F3F4F6",
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 12,
	},
	previewEmptyText: {
		marginTop: 8,
		fontSize: 12,
		fontWeight: "600",
		color: "#6B7280",
	},
	infoRowThree: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginBottom: 10,
	},
	infoCardThree: {
		width: "31.5%",
		backgroundColor: "#F9FAFB",
		borderRadius: 14,
		paddingHorizontal: 10,
		paddingVertical: 10,
	},
	infoLabel: {
		fontSize: 10,
		fontWeight: "700",
		color: "#6B7280",
		textTransform: "uppercase",
		marginBottom: 4,
	},
	infoValue: {
		fontSize: 11,
		fontWeight: "700",
		color: "#111827",
	},
	cardActionsRow: {
		marginTop: 4,
		flexDirection: "row",
		justifyContent: "space-between",
	},
	cardActionButton: {
		width: "48.5%",
		minHeight: 44,
		borderRadius: 14,
		backgroundColor: "#F3F4F6",
		alignItems: "center",
		justifyContent: "center",
		flexDirection: "row",
	},
	cardActionText: {
		marginLeft: 8,
		fontSize: 13,
		fontWeight: "700",
		color: "#111827",
	},
	deleteText: {
		color: "#B91C1C",
	},
	statusBadge: {
		alignSelf: "flex-start",
		paddingHorizontal: 10,
		paddingVertical: 5,
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
	errorBox: {
		marginTop: 10,
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
	emptySearchWrap: {
		alignItems: "center",
		justifyContent: "center",
		paddingTop: 42,
		paddingHorizontal: 24,
	},
	emptySearchTitle: {
		fontSize: 18,
		fontWeight: "800",
		color: "#111827",
		marginTop: 12,
		marginBottom: 6,
		textAlign: "center",
	},
	emptySearchText: {
		fontSize: 14,
		lineHeight: 21,
		color: "#6B7280",
		textAlign: "center",
	},
});