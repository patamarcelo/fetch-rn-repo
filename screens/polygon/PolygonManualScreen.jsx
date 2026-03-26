import React, { useEffect, useMemo, useState } from "react";
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	Alert,
	ScrollView,
	TextInput,
	ActivityIndicator,
} from "react-native";
import MapView, { Marker, Polyline, Polygon } from "react-native-maps";
import * as Location from "expo-location";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useDispatch, useSelector } from "react-redux";

import { Colors } from "../../constants/styles";
import { polygonActions } from "../../store/redux/polygon";
import { selectPolygonDraft } from "../../store/redux/polygonSelectors";
import { farmsSelected, farmsSelector } from "../../store/redux/selector";

const FALLBACK_REGION = {
	latitude: -15.7801,
	longitude: -47.9292,
	latitudeDelta: 0.03,
	longitudeDelta: 0.03,
};

function sanitizePoints(points = []) {
	return points
		.filter(
			(point) =>
				point &&
				typeof point.latitude !== "undefined" &&
				typeof point.longitude !== "undefined"
		)
		.map((point) => ({
			latitude: Number(point.latitude),
			longitude: Number(point.longitude),
			accuracy: point.accuracy ?? null,
			recordedAt: point.recordedAt || new Date().toISOString(),
		}))
		.filter(
			(point) =>
				!Number.isNaN(point.latitude) &&
				!Number.isNaN(point.longitude)
		);
}

const PolygonManualScreen = ({ navigation }) => {
	const dispatch = useDispatch();
	const draft = useSelector(selectPolygonDraft);
	const selectedFarm = useSelector(farmsSelected);
	const farms = useSelector(farmsSelector);
	console.log('farmssssss', farms)

	const [userPreviewRegion, setUserPreviewRegion] = useState(null);
	const [polygonName, setPolygonName] = useState(draft?.name || "");
	const [farmName, setFarmName] = useState(draft?.farmName || "");
	const [farmSearch, setFarmSearch] = useState(draft?.farmName || "");
	const [isSaving, setIsSaving] = useState(false);
	const [mapVersion, setMapVersion] = useState(0);

	const points = draft?.points || [];
	const isClosed = !!draft?.isClosed;

	useEffect(() => {
		setPolygonName(draft?.name || "");
	}, [draft?.name]);

	useEffect(() => {
		if (draft?.farmName) {
			setFarmName(draft.farmName);
			setFarmSearch(draft.farmName);
			return;
		}

		if (typeof selectedFarm === "object") {
			const value = selectedFarm?.nome || selectedFarm?.fazenda || "";
			setFarmName(value);
			setFarmSearch(value);
			return;
		}

		if (selectedFarm && Array.isArray(farms)) {
			const foundFarm = farms.find((item) => {
				if (typeof item === "string") {
					return item === selectedFarm;
				}

				return (
					item?.id === selectedFarm ||
					item?.fazenda_id === selectedFarm ||
					item?.nome === selectedFarm ||
					item?.fazenda === selectedFarm
				);
			});

			if (foundFarm) {
				const value =
					typeof foundFarm === "string"
						? foundFarm
						: foundFarm?.nome || foundFarm?.fazenda || "";

				setFarmName(value);
				setFarmSearch(value);
			}
		}
	}, [draft?.farmName, selectedFarm, farms]);

	useEffect(() => {
		let mounted = true;

		const loadUserRegion = async () => {
			if (points.length > 0) return;

			try {
				const { status } = await Location.requestForegroundPermissionsAsync();
				if (status !== "granted") return;

				const location = await Location.getCurrentPositionAsync({
					accuracy: Location.Accuracy.High,
				});

				if (!mounted) return;

				setUserPreviewRegion({
					latitude: location.coords.latitude,
					longitude: location.coords.longitude,
					latitudeDelta: 0.01,
					longitudeDelta: 0.01,
				});
			} catch (error) {
				console.log("MANUAL PREVIEW LOCATION ERROR:", error);
			}
		};

		loadUserRegion();

		return () => {
			mounted = false;
		};
	}, [points.length]);

	const polygonCoords = useMemo(() => {
		return sanitizePoints(points).map((point) => ({
			latitude: point.latitude,
			longitude: point.longitude,
		}));
	}, [points]);

	const previewRegion = useMemo(() => {
		if (polygonCoords.length > 0) {
			return {
				latitude: polygonCoords[0].latitude,
				longitude: polygonCoords[0].longitude,
				latitudeDelta: 0.01,
				longitudeDelta: 0.01,
			};
		}

		return userPreviewRegion || FALLBACK_REGION;
	}, [polygonCoords, userPreviewRegion]);

	const farmSuggestions = useMemo(() => {
		const query = (farmSearch || "").trim().toLowerCase();

		const normalizedFarms = (farms || [])
			.map((item, index) => {
				if (typeof item === "string") {
					return {
						id: `farm-${index}-${item}`,
						label: item,
					};
				}

				return {
					id: item?.id || item?.fazenda_id || item?.nome || `farm-${index}`,
					label: item?.nome || item?.fazenda || "",
				};
			})
			.filter((item) => !!item.label);

		// 🔥 regra nova
		if (query.length < 3) {
			return [];
		}

		return normalizedFarms
			.filter((item) => item.label.toLowerCase().includes(query))
			.slice(0, 8);
	}, [farmSearch, farms]);

	const handleSelectFarm = (farm) => {
		setFarmName(farm.label);
		setFarmSearch(farm.label);

		dispatch(
			polygonActions.setPolygonMeta({
				farmId: farm.id,
				farmName: farm.label,
			})
		);
	};

	const handleAddByGps = async () => {
		try {
			const { status } = await Location.requestForegroundPermissionsAsync();
			if (status !== "granted") {
				Alert.alert("Permissão necessária", "Ative a localização para adicionar ponto por GPS.");
				return;
			}

			const location = await Location.getCurrentPositionAsync({
				accuracy: Location.Accuracy.High,
			});

			dispatch(
				polygonActions.addPointToDraft({
					latitude: location.coords.latitude,
					longitude: location.coords.longitude,
					accuracy: location.coords.accuracy ?? null,
					recordedAt: new Date().toISOString(),
				})
			);
		} catch (error) {
			console.log("MANUAL ADD GPS ERROR:", error);
			Alert.alert("Erro", "Não foi possível obter a localização atual.");
		}
	};

	const handleOpenMapForNewPoint = () => {
		navigation.navigate("PolygonMapPickerScreen");
	};

	const handleEditPoint = (index) => {
		navigation.navigate("PolygonMapPickerScreen", { editIndex: index });
	};

	const handleRemovePoint = (index) => {
		Alert.alert("Remover ponto", `Deseja remover o ponto ${index + 1}?`, [
			{ text: "Cancelar", style: "cancel" },
			{
				text: "Remover",
				onPress: () => {
					try {
						dispatch(polygonActions.removeDraftPointAtIndex(index));
						setMapVersion((prev) => prev + 1);
					} catch (error) {
						console.log("MANUAL REMOVE POINT ERROR:", error);
						Alert.alert("Erro", "Não foi possível remover o ponto.");
					}
				},
			},
		]);
	};

	const handleClearPoints = () => {
		if (!points.length) return;

		Alert.alert("Limpar pontos", "Deseja remover todos os pontos do rascunho?", [
			{ text: "Cancelar", style: "cancel" },
			{
				text: "Limpar tudo",
				onPress: () => {
					try {
						dispatch(polygonActions.clearDraftPoints());
						dispatch(
							polygonActions.finishPolygonDraft({
								isClosed: false,
							})
						);
						setMapVersion((prev) => prev + 1);
					} catch (error) {
						console.log("MANUAL CLEAR POINTS ERROR:", error);
						Alert.alert("Erro", "Não foi possível limpar os pontos.");
					}
				},
			},
		]);
	};

	const handleSavePolygon = () => {
		const trimmedName = (polygonName || "").trim();
		const trimmedFarm = (farmName || farmSearch || "").trim();
		const safePoints = sanitizePoints(points);

		if (!trimmedName) {
			Alert.alert("Nome obrigatório", "Informe o nome do polígono antes de salvar.");
			return;
		}

		if (!trimmedFarm) {
			Alert.alert("Fazenda obrigatória", "Informe a fazenda do polígono antes de salvar.");
			return;
		}

		if (safePoints.length < 3) {
			Alert.alert("Polígono incompleto", "É necessário ter ao menos 3 pontos.");
			return;
		}

		if (!isClosed) {
			Alert.alert(
				"Feche o polígono",
				"Antes de salvar, feche o polígono no mapa para concluir o contorno."
			);
			return;
		}

		try {
			setIsSaving(true);
			console.log("MANUAL SAVE 1 - setPolygonMeta");

			dispatch(
				polygonActions.setPolygonMeta({
					name: trimmedName,
					farmName: trimmedFarm,
				})
			);

			console.log("MANUAL SAVE 2 - setDraftPoints sanitized");
			dispatch(polygonActions.setDraftPoints(safePoints));

			setTimeout(() => {
				try {
					console.log("MANUAL SAVE 3 - saveDraftAsPolygon");
					dispatch(
						polygonActions.saveDraftAsPolygon({
							status: "sync_pending",
							syncPending: true,
						})
					);

					console.log("MANUAL SAVE 4 - navigate PolygonSavedListScreen");
					navigation.replace("PolygonSavedListScreen");

					setTimeout(() => {
						try {
							console.log("MANUAL SAVE 5 - resetPolygonDraft");
							dispatch(polygonActions.resetPolygonDraft());
						} catch (resetError) {
							console.log("MANUAL SAVE RESET ERROR:", resetError);
						}
					}, 500);
				} catch (saveError) {
					console.log("MANUAL SAVE FLOW ERROR:", saveError);
					setIsSaving(false);
					Alert.alert("Erro", "Não foi possível salvar o polígono.");
				}
			}, 180);
		} catch (error) {
			console.log("MANUAL SAVE OUTER ERROR:", error);
			setIsSaving(false);
			Alert.alert("Erro", "Não foi possível salvar o polígono.");
		}
	};

	const handleStartNewDraft = () => {
		Alert.alert(
			"Novo polígono",
			"Deseja limpar o rascunho atual e começar um novo?",
			[
				{ text: "Cancelar", style: "cancel" },
				{
					text: "Novo",
					onPress: () => {
						dispatch(
							polygonActions.startPolygonDraft({
								mode: "manual",
								farmName: farmName || "",
							})
						);
						setPolygonName("");
						setMapVersion((prev) => prev + 1);
					},
				},
			]
		);
	};

	return (
		<View style={styles.container}>
			<ScrollView
				contentContainerStyle={styles.content}
				showsVerticalScrollIndicator={false}
				key={`manual-scroll-${mapVersion}`}
			>
				<View style={styles.headerCard}>
					<View style={styles.headerTopRow}>
						<Text style={styles.title}>Criação manual</Text>

						<View style={styles.chipsRow}>
							<View style={styles.infoBadge}>
								<Text style={styles.infoBadgeText}>{points.length} pontos</Text>
							</View>

							<View
								style={[
									styles.statusChip,
									isClosed ? styles.statusClosed : styles.statusOpen,
								]}
							>
								<Text
									style={[
										styles.statusChipText,
										isClosed ? styles.statusClosedText : styles.statusOpenText,
									]}
								>
									{isClosed ? "Fechado" : "Aberto"}
								</Text>
							</View>
						</View>
					</View>

					<Text style={styles.subtitle}>
						Desenhe no mapa, feche o polígono e depois salve com nome e fazenda.
					</Text>
				</View>

				<View style={styles.formCard}>
					<Text style={styles.sectionTitle}>Dados do polígono</Text>

					<Text style={styles.inputLabel}>Nome do polígono</Text>
					<TextInput
						value={polygonName}
						onChangeText={setPolygonName}
						placeholder="Ex.: Talhão Sul, Área 01..."
						placeholderTextColor="#9CA3AF"
						style={styles.input}
					/>

					<Text style={styles.inputLabel}>Fazenda</Text>
					<TextInput
						value={farmSearch}
						onChangeText={(text) => {
							setFarmSearch(text);
							setFarmName(text);
						}}
						placeholder="Digite para buscar fazendas"
						placeholderTextColor="#9CA3AF"
						style={styles.input}
					/>

					{farmSuggestions.length > 0 ? (
						<View style={styles.suggestionsWrap}>
							{farmSuggestions.map((farm) => (
								<TouchableOpacity
									key={String(farm.id)}
									style={styles.suggestionItem}
									onPress={() => handleSelectFarm(farm)}
								>
									<Ionicons name="business-outline" size={16} color="#374151" />
									<Text style={styles.suggestionText}>{farm.label}</Text>
								</TouchableOpacity>
							))}
						</View>
					) : null}
				</View>

				<View style={styles.previewCard}>
					<Text style={styles.sectionTitle}>Pré-visualização</Text>

					{isSaving ? (
						<View style={styles.previewLoadingWrap}>
							<ActivityIndicator size="large" color={Colors.primary[901]} />
							<Text style={styles.previewLoadingText}>Salvando polígono...</Text>
						</View>
					) : (
						<View style={styles.previewMapWrap}>
							<MapView
								key={`manual-preview-map-${mapVersion}`}
								style={styles.previewMap}
								initialRegion={previewRegion}
								region={previewRegion}
								showsUserLocation
								scrollEnabled={false}
								zoomEnabled={false}
								rotateEnabled={false}
								pitchEnabled={false}
								toolbarEnabled={false}
							>
								{polygonCoords.map((coord, index) => (
									<Marker
										key={`preview-${index}`}
										coordinate={coord}
										pinColor="#DC2626"
										title={`Ponto ${index + 1}`}
									/>
								))}

								{polygonCoords.length >= 2 ? (
									<Polyline
										coordinates={polygonCoords}
										strokeWidth={3}
										strokeColor="#DC2626"
									/>
								) : null}

								{isClosed && polygonCoords.length >= 3 ? (
									<Polygon
										coordinates={polygonCoords}
										strokeWidth={2}
										strokeColor="#16A34A"
										fillColor="rgba(22,163,74,0.16)"
									/>
								) : null}
							</MapView>
						</View>
					)}
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Geometria</Text>

					<TouchableOpacity
						style={[styles.primaryButton, isSaving && styles.disabledButton]}
						onPress={handleOpenMapForNewPoint}
						disabled={isSaving}
					>
						<Ionicons name="map" size={20} color="#fff" />
						<Text style={styles.primaryButtonText}>
							{points.length ? "Continuar no mapa" : "Abrir mapa"}
						</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={[styles.secondaryButton, isSaving && styles.disabledButton]}
						onPress={handleAddByGps}
						disabled={isSaving}
					>
						<Ionicons name="location" size={20} color="#111827" />
						<Text style={styles.secondaryButtonText}>Adicionar ponto pelo GPS atual</Text>
					</TouchableOpacity>
				</View>

				<View style={styles.section}>
					<View style={styles.sectionHeader}>
						<Text style={styles.sectionTitle}>Pontos do rascunho</Text>

						<TouchableOpacity
							disabled={!points.length || isSaving}
							onPress={handleClearPoints}
							style={[
								styles.clearChip,
								(!points.length || isSaving) && styles.disabledChip,
							]}
						>
							<Text style={styles.clearChipText}>Limpar tudo</Text>
						</TouchableOpacity>
					</View>

					{points.length === 0 ? (
						<View style={styles.emptyCard}>
							<Ionicons name="location-outline" size={28} color="#9CA3AF" />
							<Text style={styles.emptyTitle}>Nenhum ponto adicionado</Text>
							<Text style={styles.emptyText}>
								Use o mapa full screen ou o GPS atual para começar.
							</Text>
						</View>
					) : (
						points.map((point, index) => (
							<View key={`point-item-${index}`} style={styles.pointCard}>
								<View style={styles.pointInfo}>
									<Text style={styles.pointTitle}>Ponto {index + 1}</Text>
									<Text style={styles.pointCoords}>
										Lat {Number(point.latitude).toFixed(6)} • Lon {Number(point.longitude).toFixed(6)}
									</Text>
								</View>

								<View style={styles.pointActions}>
									<TouchableOpacity
										style={styles.pointIconButton}
										onPress={() => handleEditPoint(index)}
										disabled={isSaving}
									>
										<Ionicons name="create-outline" size={18} color="#111827" />
									</TouchableOpacity>

									<TouchableOpacity
										style={styles.pointIconButton}
										onPress={() => handleRemovePoint(index)}
										disabled={isSaving}
									>
										<Ionicons name="trash-outline" size={18} color="#B91C1C" />
									</TouchableOpacity>
								</View>
							</View>
						))
					)}
				</View>

				<TouchableOpacity
					style={[
						styles.saveButton,
						(!isClosed || points.length < 3 || isSaving) && styles.disabledSaveButton,
					]}
					onPress={handleSavePolygon}
					disabled={!isClosed || points.length < 3 || isSaving}
				>
					<Ionicons name="save-outline" size={22} color="#fff" />
					<Text style={styles.saveButtonText}>Salvar polígono</Text>
				</TouchableOpacity>

				<TouchableOpacity
					style={[styles.newDraftButton, isSaving && styles.disabledButton]}
					onPress={handleStartNewDraft}
					disabled={isSaving}
				>
					<Ionicons name="add-circle-outline" size={20} color="#111827" />
					<Text style={styles.newDraftButtonText}>Novo rascunho</Text>
				</TouchableOpacity>
			</ScrollView>
		</View>
	);
};

export default PolygonManualScreen;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: Colors.primary100 || "#F4F6F8",
	},
	content: {
		padding: 14,
		paddingBottom: 40,
	},
	headerCard: {
		backgroundColor: Colors.primary[901] || "#1F2937",
		borderRadius: 22,
		padding: 16,
		marginBottom: 14,
	},
	title: {
		color: "#fff",
		fontSize: 24,
		fontWeight: "800",
	},
	subtitle: {
		color: "rgba(255,255,255,0.84)",
		fontSize: 14,
		lineHeight: 20,
		marginTop: 8,
	},
	infoRow: {
		marginTop: 14,
		flexDirection: "row",
		alignItems: "center",
	},
	infoBadge: {
		backgroundColor: "rgba(255,255,255,0.12)",
		paddingHorizontal: 12,
		paddingVertical: 7,
		borderRadius: 999,
		marginRight: 10,
	},
	infoBadgeText: {
		color: "#fff",
		fontWeight: "800",
		fontSize: 12,
	},
	statusChip: {
		paddingHorizontal: 12,
		paddingVertical: 7,
		borderRadius: 999,
	},
	statusOpen: {
		backgroundColor: "rgba(245,158,11,0.16)",
	},
	statusClosed: {
		backgroundColor: "rgba(22,163,74,0.18)",
	},
	statusChipText: {
		fontWeight: "800",
		fontSize: 12,
	},
	statusOpenText: {
		color: "#F59E0B",
	},
	statusClosedText: {
		color: "#16A34A",
	},
	formCard: {
		backgroundColor: "#fff",
		borderRadius: 20,
		padding: 14,
		marginBottom: 14,
	},
	section: {
		marginBottom: 14,
	},
	sectionHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 10,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: "800",
		color: "#111827",
		marginBottom: 10,
	},
	inputLabel: {
		fontSize: 13,
		fontWeight: "700",
		color: "#374151",
		marginBottom: 8,
	},
	input: {
		height: 50,
		borderRadius: 14,
		backgroundColor: "#F9FAFB",
		paddingHorizontal: 14,
		fontSize: 15,
		color: "#111827",
		marginBottom: 10,
	},
	suggestionsWrap: {
		backgroundColor: "#F9FAFB",
		borderRadius: 14,
		overflow: "hidden",
		marginBottom: 4,
	},
	suggestionItem: {
		minHeight: 42,
		paddingHorizontal: 12,
		paddingVertical: 10,
		borderBottomWidth: 1,
		borderBottomColor: "#E5E7EB",
		flexDirection: "row",
		alignItems: "center",
	},
	suggestionText: {
		marginLeft: 8,
		fontSize: 14,
		fontWeight: "600",
		color: "#111827",
	},
	previewCard: {
		backgroundColor: "#fff",
		borderRadius: 20,
		padding: 14,
		marginBottom: 14,
	},
	previewMapWrap: {
		height: 220,
		borderRadius: 18,
		overflow: "hidden",
	},
	previewMap: {
		flex: 1,
	},
	previewLoadingWrap: {
		height: 220,
		borderRadius: 18,
		backgroundColor: "#F9FAFB",
		alignItems: "center",
		justifyContent: "center",
	},
	previewLoadingText: {
		marginTop: 12,
		fontSize: 14,
		fontWeight: "700",
		color: "#374151",
	},
	primaryButton: {
		height: 52,
		borderRadius: 16,
		backgroundColor: Colors.primary[901] || "#1F2937",
		alignItems: "center",
		justifyContent: "center",
		flexDirection: "row",
		marginBottom: 10,
	},
	primaryButtonText: {
		color: "#fff",
		fontSize: 15,
		fontWeight: "800",
		marginLeft: 10,
	},
	secondaryButton: {
		height: 52,
		borderRadius: 16,
		backgroundColor: "#fff",
		alignItems: "center",
		justifyContent: "center",
		flexDirection: "row",
	},
	secondaryButtonText: {
		color: "#111827",
		fontSize: 15,
		fontWeight: "800",
		marginLeft: 10,
	},
	clearChip: {
		backgroundColor: "rgba(185,28,28,0.08)",
		paddingHorizontal: 12,
		paddingVertical: 7,
		borderRadius: 999,
	},
	clearChipText: {
		color: "#B91C1C",
		fontSize: 12,
		fontWeight: "800",
	},
	disabledChip: {
		opacity: 0.4,
	},
	emptyCard: {
		backgroundColor: "#fff",
		borderRadius: 18,
		padding: 18,
		alignItems: "center",
	},
	emptyTitle: {
		fontSize: 16,
		fontWeight: "800",
		color: "#111827",
		marginTop: 10,
	},
	emptyText: {
		fontSize: 13,
		lineHeight: 19,
		color: "#6B7280",
		textAlign: "center",
		marginTop: 6,
	},
	pointCard: {
		backgroundColor: "#fff",
		borderRadius: 18,
		padding: 14,
		marginBottom: 10,
		flexDirection: "row",
		alignItems: "center",
	},
	pointInfo: {
		flex: 1,
	},
	pointTitle: {
		fontSize: 15,
		fontWeight: "800",
		color: "#111827",
		marginBottom: 4,
	},
	pointCoords: {
		fontSize: 13,
		color: "#4B5563",
	},
	pointActions: {
		flexDirection: "row",
		alignItems: "center",
		marginLeft: 10,
	},
	pointIconButton: {
		width: 40,
		height: 40,
		borderRadius: 12,
		backgroundColor: "#F3F4F6",
		alignItems: "center",
		justifyContent: "center",
		marginLeft: 8,
	},
	saveButton: {
		minHeight: 54,
		borderRadius: 16,
		backgroundColor: "#16A34A",
		alignItems: "center",
		justifyContent: "center",
		flexDirection: "row",
		marginTop: 6,
	},
	saveButtonText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "800",
		marginLeft: 10,
	},
	disabledSaveButton: {
		opacity: 0.5,
	},
	newDraftButton: {
		minHeight: 50,
		borderRadius: 16,
		backgroundColor: "#fff",
		alignItems: "center",
		justifyContent: "center",
		flexDirection: "row",
		marginTop: 10,
	},
	newDraftButtonText: {
		color: "#111827",
		fontSize: 15,
		fontWeight: "800",
		marginLeft: 8,
	},
	disabledButton: {
		opacity: 0.5,
	},
	headerTopRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},

	chipsRow: {
		flexDirection: "row",
		alignItems: "center",
		marginLeft: 4,
		gap: 4, // se não funcionar, usar marginLeft nos filhos
	},
});