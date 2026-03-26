import React, { useMemo, useState } from "react";
import {
	View,
	Text,
	StyleSheet,
	FlatList,
	TouchableOpacity,
	Alert,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import Ionicons from "@expo/vector-icons/Ionicons";

import { Colors } from "../../constants/styles";
import { selectPolygonItems } from "../../store/redux/polygonSelectors";
import { polygonActions } from "../../store/redux/polygon";
import { exportPolygonsToKml } from "../../utils/polygonKml";

function formatDateTimeBR(dateValue) {
	if (!dateValue) return "-";

	try {
		return new Date(dateValue).toLocaleString("pt-BR");
	} catch (error) {
		return "-";
	}
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
	return (
		<TouchableOpacity activeOpacity={0.88} style={styles.itemCard} onPress={onPress}>
			<View style={styles.itemHeader}>
				<View style={styles.itemHeaderLeft}>
					<Text style={styles.itemTitle}>{item?.name || "Polígono sem nome"}</Text>

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
						<Text style={styles.statusText}>{item?.status || "saved"}</Text>
					</View>
				</View>

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
					<TouchableOpacity
						style={styles.deleteButton}
						onPress={onDelete}
						hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
					>
						<Ionicons name="trash-outline" size={20} color="#B91C1C" />
					</TouchableOpacity>
				)}
			</View>

			<View style={styles.metaRow}>
				<View style={styles.metaItem}>
					<Text style={styles.metaLabel}>Fazenda</Text>
					<Text style={styles.metaValue}>{item?.farmName || "-"}</Text>
				</View>

				<View style={styles.metaItem}>
					<Text style={styles.metaLabel}>Modo</Text>
					<Text style={styles.metaValue}>{item?.mode || "-"}</Text>
				</View>
			</View>

			<View style={styles.metaRow}>
				<View style={styles.metaItem}>
					<Text style={styles.metaLabel}>Pontos</Text>
					<Text style={styles.metaValue}>{item?.points?.length || 0}</Text>
				</View>

				<View style={styles.metaItem}>
					<Text style={styles.metaLabel}>Criado em</Text>
					<Text style={styles.metaValue}>
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
	const items = useSelector(selectPolygonItems);

	const [isSelectionMode, setIsSelectionMode] = useState(false);
	const [selectedIds, setSelectedIds] = useState([]);

	const sortedItems = useMemo(() => {
		return [...items].sort((a, b) => {
			const dateA = new Date(a?.updatedAt || a?.createdAt || 0).getTime();
			const dateB = new Date(b?.updatedAt || b?.createdAt || 0).getTime();
			return dateB - dateA;
		});
	}, [items]);

	const selectedPolygons = useMemo(() => {
		return sortedItems.filter((item) => selectedIds.includes(item.id));
	}, [sortedItems, selectedIds]);

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
		if (!sortedItems.length) {
			Alert.alert("Sem polígonos", "Não há polígonos para exportar.");
			return;
		}

		try {
			await exportPolygonsToKml(sortedItems, "todos_os_poligonos.kml");
		} catch (error) {
			console.log("Erro ao exportar todos:", error);
			Alert.alert("Erro", "Não foi possível exportar o KML.");
		}
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
						data={sortedItems}
						keyExtractor={(item) => item.id}
						contentContainerStyle={styles.listContent}
						renderItem={({ item }) => (
							<PolygonItem
								item={item}
								isSelectionMode={isSelectionMode}
								isSelected={selectedIds.includes(item.id)}
								onPress={() => { }}
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
		paddingRight: 12,
	},
	itemTitle: {
		fontSize: 16,
		fontWeight: "800",
		color: "#111827",
		marginBottom: 8,
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
	metaRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginBottom: 10,
	},
	metaItem: {
		width: "48.5%",
		backgroundColor: "#F9FAFB",
		borderRadius: 14,
		paddingHorizontal: 12,
		paddingVertical: 10,
	},
	metaLabel: {
		fontSize: 11,
		fontWeight: "700",
		color: "#6B7280",
		textTransform: "uppercase",
		marginBottom: 4,
	},
	metaValue: {
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
		textTransform: "uppercase",
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
});