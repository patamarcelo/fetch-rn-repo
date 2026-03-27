import React, { useEffect, useMemo, useState } from "react";
import {
	View,
	Text,
	StyleSheet,
	TextInput,
	TouchableOpacity,
	ScrollView,
	FlatList,
	Alert,
	Switch,
	ActivityIndicator,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import MapView, { Polygon as MapPolygon, Polyline, Marker } from "react-native-maps";
import * as Location from "expo-location";

import { Colors } from "../../constants/styles";
import { polygonActions } from "../../store/redux/polygon";
import { farmsSelector } from "../../store/redux/selector";

function buildPreviewRegion(points, currentLocation) {
	const validPoints = Array.isArray(points)
		? points.filter(
			(point) =>
				Number.isFinite(Number(point?.latitude)) &&
				Number.isFinite(Number(point?.longitude))
		)
		: [];

	if (validPoints.length > 0) {
		const latitudes = validPoints.map((p) => Number(p.latitude));
		const longitudes = validPoints.map((p) => Number(p.longitude));

		if (
			currentLocation &&
			Number.isFinite(Number(currentLocation.latitude)) &&
			Number.isFinite(Number(currentLocation.longitude))
		) {
			latitudes.push(Number(currentLocation.latitude));
			longitudes.push(Number(currentLocation.longitude));
		}

		const minLat = Math.min(...latitudes);
		const maxLat = Math.max(...latitudes);
		const minLng = Math.min(...longitudes);
		const maxLng = Math.max(...longitudes);

		return {
			latitude: (minLat + maxLat) / 2,
			longitude: (minLng + maxLng) / 2,
			latitudeDelta: Math.max((maxLat - minLat) * 1.8, 0.0035),
			longitudeDelta: Math.max((maxLng - minLng) * 1.8, 0.0035),
		};
	}

	if (
		currentLocation &&
		Number.isFinite(Number(currentLocation.latitude)) &&
		Number.isFinite(Number(currentLocation.longitude))
	) {
		return {
			latitude: Number(currentLocation.latitude),
			longitude: Number(currentLocation.longitude),
			latitudeDelta: 0.008,
			longitudeDelta: 0.008,
		};
	}

	return {
		latitude: -14.235,
		longitude: -51.9253,
		latitudeDelta: 20,
		longitudeDelta: 20,
	};
}

function getModeLabel(mode) {
	if (mode === "tracking") return "Navegação automática";
	return "Ponto a ponto";
}

export default function PolygonManualScreen() {
	const dispatch = useDispatch();
	const navigation = useNavigation();

	const draft = useSelector((state) => state.polygon.draft);
	const farms = useSelector(farmsSelector) || [];

	const [farmQuery, setFarmQuery] = useState(draft?.farmName || "");
	const [currentLocation, setCurrentLocation] = useState(null);
	const [loadingLocation, setLoadingLocation] = useState(true);

	useEffect(() => {
		let mounted = true;

		const loadCurrentLocation = async () => {
			try {
				setLoadingLocation(true);

				const { status } = await Location.requestForegroundPermissionsAsync();

				if (status !== "granted") {
					return;
				}

				const location = await Location.getCurrentPositionAsync({
					accuracy: Location.Accuracy.High,
				});

				if (!mounted) return;

				setCurrentLocation({
					latitude: Number(location?.coords?.latitude),
					longitude: Number(location?.coords?.longitude),
				});
			} catch (error) {
				console.log("LOAD CURRENT LOCATION ERROR:", error);
			} finally {
				if (mounted) {
					setLoadingLocation(false);
				}
			}
		};

		loadCurrentLocation();

		return () => {
			mounted = false;
		};
	}, []);

	const validPoints = useMemo(() => {
		return (draft?.points || [])
			.map((point) => ({
				latitude: Number(point?.latitude),
				longitude: Number(point?.longitude),
			}))
			.filter(
				(point) =>
					Number.isFinite(point.latitude) &&
					Number.isFinite(point.longitude)
			);
	}, [draft?.points]);

	const previewRegion = useMemo(
		() => buildPreviewRegion(validPoints, currentLocation),
		[validPoints, currentLocation]
	);

	const farmSuggestions = useMemo(() => {
		const term = (farmQuery || "").trim().toLowerCase();

		if (term.length < 2) return [];

		return farms
			.filter((farm) => (farm || "").toLowerCase().includes(term))
			.slice(0, 8);
	}, [farmQuery, farms]);

	const updateMeta = (payload) => {
		dispatch(polygonActions.setPolygonMeta(payload));
	};

	const handleChangeName = (value) => {
		updateMeta({ name: value });
	};

	const handleChangeFarm = (value) => {
		setFarmQuery(value);
		updateMeta({ farmName: value });
	};

	const handleSelectFarm = (farmName) => {
		setFarmQuery(farmName);
		updateMeta({ farmName });
	};

	const handleChangeFollowMe = (value) => {
		updateMeta({ followMe: value });
	};

	const handleChangeAutoMinDistance = (value) => {
		const numeric = String(value).replace(/[^0-9]/g, "");
		updateMeta({
			autoMinDistance: numeric ? Number(numeric) : 0,
		});
	};

	const handleChangeAutoMinSeconds = (value) => {
		const numeric = String(value).replace(/[^0-9]/g, "");
		updateMeta({
			autoMinSeconds: numeric ? Number(numeric) : 0,
		});
	};

	const handleOpenMap = () => {
		navigation.navigate("PolygonMapPickerScreen");
	};

	const handleSaveDraft = () => {
		if (!(draft?.name || "").trim()) {
			Alert.alert("Nome obrigatório", "Informe um nome para o polígono.");
			return;
		}

		if (validPoints.length < 3) {
			Alert.alert("Pontos insuficientes", "Adicione ao menos 3 pontos válidos.");
			return;
		}

		dispatch(
			polygonActions.saveDraftAsPolygon({
				status: "sync_pending",
				syncPending: true,
			})
		);

		Alert.alert("Sucesso", "Polígono salvo localmente com sucesso.", [
			{
				text: "OK",
				onPress: () => navigation.replace("PolygonSavedListScreen"),
			},
		]);
	};

	const handleRemovePoint = (index) => {
		Alert.alert("Remover ponto", "Deseja remover este ponto?", [
			{ text: "Cancelar", style: "cancel" },
			{
				text: "Remover",
				style: "destructive",
				onPress: () => {
					dispatch(polygonActions.removeDraftPointAtIndex(index));
				},
			},
		]);
	};

	const handleOpenDraftPreview = () => {
		if (!validPoints.length) return;

		navigation.navigate("PolygonPreviewScreen", {
			source: "draft",
		});
	};

	return (
		<ScrollView style={styles.container} contentContainerStyle={styles.content}>
			<View style={styles.headerCard}>
				<View style={styles.headerTopRow}>
					<View style={styles.headerTitleWrap}>
						<Text style={styles.headerTitle}>
							{draft?.mode === "tracking" ? "Navegação automática" : "Ponto a ponto"}
						</Text>
					</View>
				</View>
				<Text style={styles.headerSubtitle}>
					{draft?.mode === "tracking"
						? "Configure a captura automática e depois abra o mapa para acompanhar o trajeto."
						: "Configure os dados e depois abra o mapa para marcar os pontos manualmente."}
				</Text>
			</View>

			<View style={styles.sectionCard}>
				<Text style={styles.sectionTitle}>Informações</Text>

				<Text style={styles.label}>Nome do polígono</Text>
				<TextInput
					style={styles.input}
					placeholder="Ex.: Talhão 01"
					placeholderTextColor="#9CA3AF"
					value={draft?.name || ""}
					onChangeText={handleChangeName}
				/>

				<Text style={styles.label}>Fazenda</Text>
				<TextInput
					style={styles.input}
					placeholder="Digite para buscar"
					placeholderTextColor="#9CA3AF"
					value={farmQuery}
					onChangeText={handleChangeFarm}
				/>

				{farmSuggestions.length > 0 ? (
					<View style={styles.suggestionsBox}>
						{farmSuggestions.map((farmName) => (
							<TouchableOpacity
								key={farmName}
								style={styles.suggestionItem}
								onPress={() => handleSelectFarm(farmName)}
							>
								<Text style={styles.suggestionText}>{farmName}</Text>
							</TouchableOpacity>
						))}
					</View>
				) : null}
			</View>

			{validPoints.length > 0 ? (
				<View style={styles.sectionCard}>
					<View style={styles.sectionHeaderRow}>
						<View>
							<Text style={styles.sectionTitle}>Pré-visualização</Text>
							<Text style={styles.previewCount}>{validPoints.length} ponto(s)</Text>
						</View>

						<TouchableOpacity
							style={styles.previewOpenButton}
							onPress={handleOpenDraftPreview}
						>
							<Ionicons name="expand-outline" size={16} color="#111827" />
							<Text style={styles.previewOpenButtonText}>Abrir</Text>
						</TouchableOpacity>
					</View>

					<TouchableOpacity
						activeOpacity={0.9}
						style={styles.previewWrap}
						onPress={handleOpenDraftPreview}
					>
						<MapView
							style={styles.previewMap}
							initialRegion={previewRegion}
							region={previewRegion}
							scrollEnabled={false}
							zoomEnabled={false}
							rotateEnabled={false}
							pitchEnabled={false}
							toolbarEnabled={false}
							moveOnMarkerPress={false}
							pointerEvents="none"
							showsUserLocation={false}
						>
							{validPoints.length >= 2 ? (
								<Polyline
									coordinates={validPoints}
									strokeColor="rgba(21,101,192,0.95)"
									strokeWidth={3}
								/>
							) : null}

							{validPoints.length >= 3 && draft?.isClosed ? (
								<MapPolygon
									coordinates={validPoints}
									strokeColor="rgba(21,101,192,0.95)"
									fillColor="rgba(21,101,192,0.20)"
									strokeWidth={2}
								/>
							) : null}

							{validPoints.map((point, index) => (
								<Marker
									key={`draft-point-${index}`}
									coordinate={point}
									pinColor={index === 0 ? "#16A34A" : "#DC2626"}
								/>
							))}

							{currentLocation ? (
								<Marker
									coordinate={currentLocation}
									pinColor="#2563EB"
									title="Sua localização"
								/>
							) : null}
						</MapView>

						<View style={styles.previewOverlayHint}>
							<Ionicons name="eye-outline" size={14} color="#fff" />
							<Text style={styles.previewOverlayHintText}>Toque para ampliar</Text>
						</View>
					</TouchableOpacity>
				</View>
			) : null}

			<View style={styles.sectionCard}>
				<Text style={styles.sectionTitle}>Configurações de captura</Text>

				<View style={styles.configRow}>
					<View style={styles.configTextWrap}>
						<Text style={styles.configTitle}>Siga Me</Text>
						<Text style={styles.configSubtitle}>
							O alvo acompanha a localização atual.
						</Text>
					</View>

					<Switch
						value={!!draft?.followMe}
						onValueChange={handleChangeFollowMe}
					/>
				</View>

				{draft?.mode === "tracking" ? (
					<>
						<View style={styles.inlineInputsRow}>
							<View style={styles.inlineInputBox}>
								<Text style={styles.label}>Distância mínima (m)</Text>
								<TextInput
									style={styles.input}
									value={String(draft?.autoMinDistance ?? 10)}
									onChangeText={handleChangeAutoMinDistance}
									keyboardType="number-pad"
									placeholder="10"
									placeholderTextColor="#9CA3AF"
								/>
							</View>

							<View style={styles.inlineInputBox}>
								<Text style={styles.label}>Tempo mínimo (s)</Text>
								<TextInput
									style={styles.input}
									value={String(draft?.autoMinSeconds ?? 3)}
									onChangeText={handleChangeAutoMinSeconds}
									keyboardType="number-pad"
									placeholder="3"
									placeholderTextColor="#9CA3AF"
								/>
							</View>
						</View>

						<Text style={styles.helperText}>
							No próximo passo, essa base vai controlar a captura automática por
							distância e tempo.
						</Text>
					</>
				) : (
					<Text style={styles.helperText}>
						No modo manual, você escolhe quando adicionar cada ponto no mapa.
					</Text>
				)}
			</View>

			<View style={styles.sectionCard}>
				<Text style={styles.sectionTitle}>Ações</Text>

				<TouchableOpacity style={styles.primaryButton} onPress={handleOpenMap}>
					<Ionicons name="map-outline" size={18} color="#fff" />
					<Text style={styles.primaryButtonText}>Abrir mapa</Text>
				</TouchableOpacity>

				<TouchableOpacity style={styles.secondaryButton} onPress={handleSaveDraft}>
					<Ionicons name="save-outline" size={18} color="#111827" />
					<Text style={styles.secondaryButtonText}>Salvar polígono</Text>
				</TouchableOpacity>
			</View>

			<View style={styles.sectionCard}>
				<Text style={styles.sectionTitle}>Pontos do rascunho</Text>

				{validPoints.length === 0 ? (
					<Text style={styles.emptyPointsText}>
						Ainda não há pontos adicionados.
					</Text>
				) : (
					<FlatList
						data={validPoints}
						keyExtractor={(_, index) => `point-${index}`}
						scrollEnabled={false}
						renderItem={({ item, index }) => (
							<View style={styles.pointRow}>
								<View style={styles.pointLeft}>
									<View style={styles.pointIndexBadge}>
										<Text style={styles.pointIndexText}>{index + 1}</Text>
									</View>

									<View style={styles.pointTextWrap}>
										<Text style={styles.pointText}>
											Lat: {Number(item.latitude).toFixed(6)}
										</Text>
										<Text style={styles.pointText}>
											Lng: {Number(item.longitude).toFixed(6)}
										</Text>
									</View>
								</View>

								<TouchableOpacity
									style={styles.removePointButton}
									onPress={() => handleRemovePoint(index)}
								>
									<Ionicons name="trash-outline" size={18} color="#B91C1C" />
								</TouchableOpacity>
							</View>
						)}
					/>
				)}
			</View>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: Colors.primary100 || "#F4F6F8",
	},
	content: {
		padding: 16,
		paddingBottom: 32,
	},
	headerCard: {
		backgroundColor: Colors.primary?.[901] || "#1F2937",
		borderRadius: 20,
		padding: 16,
		marginBottom: 14,
	},
	headerTopRow: {
		flexDirection: "row",
		alignItems: "flex-start",
		justifyContent: "space-between",
		gap: 12,
	},
	headerTitleWrap: {
		flex: 1,
	},
	headerTitle: {
		fontSize: 22,
		fontWeight: "800",
		color: "#fff",
	},
	headerSubtitle: {
		fontSize: 14,
		lineHeight: 20,
		color: "rgba(255,255,255,0.84)",
		marginTop: 8,
	},
	modeBadge: {
		backgroundColor: "rgba(255,255,255,0.14)",
		borderRadius: 999,
		paddingHorizontal: 10,
		paddingVertical: 6,
	},
	modeBadgeText: {
		color: "#fff",
		fontSize: 12,
		fontWeight: "800",
	},
	sectionCard: {
		backgroundColor: "#fff",
		borderRadius: 18,
		padding: 14,
		marginBottom: 14,
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: "800",
		color: "#111827",
		marginBottom: 12,
	},
	label: {
		fontSize: 13,
		fontWeight: "700",
		color: "#374151",
		marginBottom: 6,
		marginTop: 4,
	},
	input: {
		height: 46,
		borderRadius: 14,
		backgroundColor: "#F9FAFB",
		paddingHorizontal: 12,
		fontSize: 14,
		color: "#111827",
	},
	suggestionsBox: {
		marginTop: 8,
		borderRadius: 14,
		backgroundColor: "#F9FAFB",
		overflow: "hidden",
	},
	suggestionItem: {
		paddingHorizontal: 12,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: "#E5E7EB",
	},
	suggestionText: {
		fontSize: 14,
		color: "#111827",
		fontWeight: "600",
	},
	sectionHeaderRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 12,
	},
	previewCount: {
		fontSize: 12,
		fontWeight: "700",
		color: "#6B7280",
	},
	previewWrap: {
		height: 180,
		borderRadius: 16,
		overflow: "hidden",
		backgroundColor: "#E5E7EB",
	},
	previewMap: {
		flex: 1,
	},
	previewLoading: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "#F3F4F6",
	},
	previewLoadingText: {
		marginTop: 8,
		fontSize: 13,
		fontWeight: "600",
		color: "#6B7280",
	},
	configRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 12,
		gap: 12,
	},
	configTextWrap: {
		flex: 1,
	},
	configTitle: {
		fontSize: 15,
		fontWeight: "800",
		color: "#111827",
	},
	configSubtitle: {
		fontSize: 13,
		lineHeight: 18,
		color: "#6B7280",
		marginTop: 4,
	},
	inlineInputsRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		gap: 10,
	},
	inlineInputBox: {
		flex: 1,
	},
	helperText: {
		fontSize: 12,
		lineHeight: 18,
		color: "#6B7280",
		marginTop: 12,
	},
	primaryButton: {
		height: 48,
		borderRadius: 14,
		backgroundColor: "#2563EB",
		alignItems: "center",
		justifyContent: "center",
		flexDirection: "row",
		marginBottom: 10,
	},
	primaryButtonText: {
		color: "#fff",
		fontSize: 14,
		fontWeight: "800",
		marginLeft: 8,
	},
	secondaryButton: {
		height: 48,
		borderRadius: 14,
		backgroundColor: "#F3F4F6",
		alignItems: "center",
		justifyContent: "center",
		flexDirection: "row",
	},
	secondaryButtonText: {
		color: "#111827",
		fontSize: 14,
		fontWeight: "800",
		marginLeft: 8,
	},
	emptyPointsText: {
		fontSize: 14,
		color: "#6B7280",
	},
	pointRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingVertical: 10,
		borderBottomWidth: 1,
		borderBottomColor: "#F3F4F6",
	},
	pointLeft: {
		flexDirection: "row",
		alignItems: "center",
		flex: 1,
		paddingRight: 12,
	},
	pointIndexBadge: {
		width: 28,
		height: 28,
		borderRadius: 999,
		backgroundColor: "#DBEAFE",
		alignItems: "center",
		justifyContent: "center",
		marginRight: 10,
	},
	pointIndexText: {
		color: "#1D4ED8",
		fontSize: 12,
		fontWeight: "800",
	},
	pointTextWrap: {
		flex: 1,
	},
	pointText: {
		fontSize: 12,
		color: "#374151",
		fontWeight: "600",
	},
	removePointButton: {
		width: 36,
		height: 36,
		borderRadius: 12,
		backgroundColor: "rgba(185,28,28,0.08)",
		alignItems: "center",
		justifyContent: "center",
	},
	previewOpenButton: {
		height: 34,
		paddingHorizontal: 12,
		borderRadius: 999,
		backgroundColor: "#EEF2FF",
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
	},
	previewOpenButtonText: {
		marginLeft: 6,
		fontSize: 12,
		fontWeight: "800",
		color: "#111827",
	},
	previewOverlayHint: {
		position: "absolute",
		right: 10,
		top: 10,
		borderRadius: 999,
		paddingHorizontal: 10,
		paddingVertical: 6,
		backgroundColor: "rgba(17,24,39,0.72)",
		flexDirection: "row",
		alignItems: "center",
	},
	previewOverlayHintText: {
		marginLeft: 5,
		color: "#fff",
		fontSize: 11,
		fontWeight: "700",
	},
});