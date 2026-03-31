import React, { useEffect, useMemo, useRef, useState } from "react";
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ActivityIndicator,
	Alert,
} from "react-native";
import MapView, { Marker, Polyline, Polygon as MapPolygon } from "react-native-maps";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useDispatch, useSelector } from "react-redux";
import { useKeepAwake } from "expo-keep-awake";

import { Colors } from "../../constants/styles";
import { polygonActions } from "../../store/redux/polygon";
import { selectPolygonDraft } from "../../store/redux/polygonSelectors";
import { savePolygonDraftBackup } from "../../services/polygonDraftStorage";

const DEFAULT_DELTA = {
	latitudeDelta: 0.008,
	longitudeDelta: 0.008,
};

function buildRegion(latitude, longitude) {
	return {
		latitude,
		longitude,
		...DEFAULT_DELTA,
	};
}

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

function getDistanceInMeters(pointA, pointB) {
	if (!pointA || !pointB) return 0;

	const toRad = (value) => (value * Math.PI) / 180;

	const lat1 = Number(pointA.latitude);
	const lon1 = Number(pointA.longitude);
	const lat2 = Number(pointB.latitude);
	const lon2 = Number(pointB.longitude);

	if (
		![lat1, lon1, lat2, lon2].every((value) => Number.isFinite(value))
	) {
		return 0;
	}

	const R = 6371000;
	const dLat = toRad(lat2 - lat1);
	const dLon = toRad(lon2 - lon1);

	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(toRad(lat1)) *
		Math.cos(toRad(lat2)) *
		Math.sin(dLon / 2) *
		Math.sin(dLon / 2);

	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

	return R * c;
}

function getSecondsBetween(dateA, dateB) {
	if (!dateA || !dateB) return 999999;

	const timeA = new Date(dateA).getTime();
	const timeB = new Date(dateB).getTime();

	if (!Number.isFinite(timeA) || !Number.isFinite(timeB)) return 999999;

	return Math.abs(timeB - timeA) / 1000;
}

function PointMarker({ selected }) {
	return (
		<View
			style={[
				styles.pointMarkerOuter,
				selected && styles.pointMarkerOuterSelected,
			]}
		>
			<View
				style={[
					styles.pointMarkerInner,
					selected && styles.pointMarkerInnerSelected,
				]}
			/>
		</View>
	);
}

const PolygonMapPickerScreen = ({ navigation }) => {
	const dispatch = useDispatch();
	const draft = useSelector(selectPolygonDraft);
	const mapRef = useRef(null);
	const locationSubscription = useRef(null);
	const trackingPointLockRef = useRef(false);

	const [loading, setLoading] = useState(true);
	const [region, setRegion] = useState(null);
	const [feedbackMessage, setFeedbackMessage] = useState("");
	const [selectedPointIndex, setSelectedPointIndex] = useState(null);
	const [localPoints, setLocalPoints] = useState(draft?.points || []);
	const [isSaving, setIsSaving] = useState(false);
	const [currentLocation, setCurrentLocation] = useState(null);
	const [trackingActive, setTrackingActive] = useState(draft?.mode === "tracking");
	const [mapType, setMapType] = useState("satellite");

	const [dragPreviewPoint, setDragPreviewPoint] = useState(null);

	useKeepAwake();

	useEffect(() => {
		initialize();

		return () => {
			if (locationSubscription.current) {
				locationSubscription.current.remove();
				locationSubscription.current = null;
			}
		};
	}, []);

	useEffect(() => {
		dispatch(polygonActions.setDraftPoints(localPoints));
	}, [localPoints, dispatch]);

	useEffect(() => {
		if (selectedPointIndex === null) return;
		if (!localPoints[selectedPointIndex]) {
			setSelectedPointIndex(null);
		}
	}, [localPoints, selectedPointIndex]);

	useEffect(() => {
		if (draft?.mode !== "tracking") {
			setTrackingActive(false);
		}
	}, [draft?.mode]);

	const initialize = async () => {
		try {
			setLoading(true);

			const { status } = await Location.requestForegroundPermissionsAsync();
			if (status !== "granted") {
				Alert.alert("Permissão necessária", "Ative a localização para usar o mapa.");
				navigation.goBack();
				return;
			}

			const location = await Location.getCurrentPositionAsync({
				accuracy: Location.Accuracy.High,
			});

			const initialRegion = buildRegion(
				location.coords.latitude,
				location.coords.longitude
			);

			setCurrentLocation({
				latitude: Number(location.coords.latitude),
				longitude: Number(location.coords.longitude),
				accuracy: location.coords.accuracy ?? null,
				recordedAt: new Date().toISOString(),
			});

			setRegion(initialRegion);

			await startLocationWatch();
		} catch (error) {
			console.log("INIT ERROR:", error);
			Alert.alert("Erro", "Não foi possível abrir o mapa.");
			navigation.goBack();
		} finally {
			setLoading(false);
		}
	};

	const startLocationWatch = async () => {
		try {
			if (locationSubscription.current) {
				locationSubscription.current.remove();
				locationSubscription.current = null;
			}

			const subscription = await Location.watchPositionAsync(
				{
					accuracy: Location.Accuracy.High,
					timeInterval: 2000,
					distanceInterval: 2,
				},
				(location) => {
					const nextLocation = {
						latitude: Number(location?.coords?.latitude),
						longitude: Number(location?.coords?.longitude),
						accuracy: location?.coords?.accuracy ?? null,
						recordedAt: new Date().toISOString(),
					};

					if (
						!Number.isFinite(nextLocation.latitude) ||
						!Number.isFinite(nextLocation.longitude)
					) {
						return;
					}

					setCurrentLocation(nextLocation);

					if (draft?.followMe && !isSaving && selectedPointIndex === null) {
						const nextRegion = buildRegion(
							nextLocation.latitude,
							nextLocation.longitude
						);

						setRegion(nextRegion);

						if (mapRef.current) {
							mapRef.current.animateToRegion(nextRegion, 450);
						}
					}

					const shouldAutoTrack =
						draft?.mode === "tracking" &&
						trackingActive &&
						selectedPointIndex === null &&
						!isSaving;

					if (!shouldAutoTrack) return;
					if (trackingPointLockRef.current) return;

					trackingPointLockRef.current = true;

					try {
						setLocalPoints((prevPoints) => {
							const sanitizedPrev = sanitizePoints(prevPoints);
							const lastPoint =
								sanitizedPrev.length > 0
									? sanitizedPrev[sanitizedPrev.length - 1]
									: null;

							const minDistance = Number(draft?.autoMinDistance ?? 10);
							const minSeconds = Number(draft?.autoMinSeconds ?? 3);

							if (!lastPoint) {
								setFeedbackMessage("Primeiro ponto automático capturado.");
								return [...sanitizedPrev, nextLocation];
							}

							const distance = getDistanceInMeters(lastPoint, nextLocation);
							const seconds = getSecondsBetween(
								lastPoint.recordedAt,
								nextLocation.recordedAt
							);

							const passedDistance = distance >= Math.max(minDistance, 0);
							const passedTime = seconds >= Math.max(minSeconds, 0);

							if (passedDistance && passedTime) {
								setFeedbackMessage(
									`Ponto automático capturado (${Math.round(distance)} m).`
								);
								return [...sanitizedPrev, nextLocation];
							}

							return sanitizedPrev;
						});
					} catch (trackingError) {
						console.log("TRACKING WATCH ERROR:", trackingError);
					} finally {
						setTimeout(() => {
							trackingPointLockRef.current = false;
						}, 350);
					}
				}
			);

			locationSubscription.current = subscription;
		} catch (error) {
			console.log("WATCH ERROR:", error);
		}
	};

	const handleRegionChangeComplete = (nextRegion) => {
		if (isSaving) return;
		if (draft?.followMe) return;
		setRegion(nextRegion);
	};

	const handleCenterUser = async () => {
		try {
			const location = await Location.getCurrentPositionAsync({
				accuracy: Location.Accuracy.High,
			});

			const nextRegion = buildRegion(
				location.coords.latitude,
				location.coords.longitude
			);

			setCurrentLocation({
				latitude: Number(location.coords.latitude),
				longitude: Number(location.coords.longitude),
				accuracy: location.coords.accuracy ?? null,
				recordedAt: new Date().toISOString(),
			});

			setRegion(nextRegion);

			if (mapRef.current) {
				mapRef.current.animateToRegion(nextRegion, 700);
			}
		} catch (error) {
			console.log("CENTER USER ERROR:", error);
			Alert.alert("Erro", "Não foi possível obter sua localização atual.");
		}
	};

	const handleToggleMapType = () => {
		setMapType((prev) => (prev === "satellite" ? "standard" : "satellite"));
	};

	const handleConfirmPoint = async () => {
		if (!region?.latitude || !region?.longitude) {
			Alert.alert("Erro", "Não foi possível obter o alvo central do mapa.");
			return;
		}

		const point = {
			latitude: Number(region.latitude),
			longitude: Number(region.longitude),
			accuracy: currentLocation?.accuracy ?? null,
			recordedAt: new Date().toISOString(),
		};

		if (Number.isNaN(point.latitude) || Number.isNaN(point.longitude)) {
			Alert.alert("Erro", "As coordenadas do ponto são inválidas.");
			return;
		}

		try {
			await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
			setLocalPoints((prev) => [...prev, point]);
			setFeedbackMessage("Ponto adicionado com sucesso.");
		} catch (error) {
			console.log("ADD POINT ERROR:", error);
			Alert.alert("Erro", "Não foi possível adicionar o ponto.");
		}
	};

	const handleRequestClosePolygon = () => {
		Alert.alert(
			"Fechar polígono",
			"Deseja fechar o polígono e voltar para preencher os dados?",
			[
				{ text: "Cancelar", style: "cancel" },
				{
					text: "Salvar",
					onPress: async () => {
						const finalPoints = sanitizePoints(localPoints);

						if (finalPoints.length < 3) {
							Alert.alert(
								"Polígono incompleto",
								"É necessário ter ao menos 3 pontos."
							);
							return;
						}

						try {
							await Haptics.notificationAsync(
								Haptics.NotificationFeedbackType.Success
							);

							setIsSaving(true);
							setSelectedPointIndex(null);
							setFeedbackMessage("");

							const closedDraft = {
								...draft,
								points: finalPoints,
								isClosed: true,
								finishedAt: new Date().toISOString(),
							};

							dispatch(polygonActions.setDraftPoints(finalPoints));
							dispatch(
								polygonActions.finishPolygonDraft({
									isClosed: true,
								})
							);

							await savePolygonDraftBackup({
								draft: closedDraft,
								farmQuery: draft?.farmName || "",
							});

							navigation.goBack();
						} catch (error) {
							console.log("CLOSE FLOW ERROR:", error);
							setIsSaving(false);
							Alert.alert("Erro", "Não foi possível fechar o polígono.");
						}
					},
				},
			]
		);
	};

	const handleMarkerPress = async (index) => {
		if (isSaving) return;

		setFeedbackMessage("Ponto selecionado. Agora arraste a bola verde.");
		setSelectedPointIndex(index);

		try {
			await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		} catch (error) {
			console.log("HAPTIC SELECT ERROR:", error);
		}
	};

	const handleSafeRemovePoint = () => {
		if (selectedPointIndex === null) return;

		const indexToRemove = selectedPointIndex;

		Alert.alert(
			"Remover ponto",
			`Deseja remover o ponto ${indexToRemove + 1}?`,
			[
				{ text: "Cancelar", style: "cancel" },
				{
					text: "Remover",
					style: "destructive",
					onPress: async () => {
						try {
							await Haptics.notificationAsync(
								Haptics.NotificationFeedbackType.Warning
							);

							setSelectedPointIndex(null);
							setFeedbackMessage("");
							setIsSaving(true);

							setTimeout(() => {
								try {
									const nextPoints = localPoints.filter(
										(_, index) => index !== indexToRemove
									);

									setLocalPoints(nextPoints);

									setTimeout(() => {
										setIsSaving(false);
									}, 100);
								} catch (removeError) {
									console.log("REMOVE FLOW ERROR:", removeError);
									setIsSaving(false);
									Alert.alert("Erro", "Não foi possível remover o ponto.");
								}
							}, 120);
						} catch (error) {
							console.log("REMOVE OUTER ERROR:", error);
							setIsSaving(false);
							Alert.alert("Erro", "Não foi possível remover o ponto.");
						}
					},
				},
			]
		);
	};

	const handleToggleTracking = () => {
		if (draft?.mode !== "tracking") return;

		setTrackingActive((prev) => {
			const next = !prev;
			setFeedbackMessage(
				next ? "Captura automática ativada." : "Captura automática pausada."
			);
			return next;
		});
	};

	const polylineCoords = useMemo(() => {
		const basePoints = sanitizePoints(localPoints).map((point) => ({
			latitude: point.latitude,
			longitude: point.longitude,
		}));

		if (
			dragPreviewPoint &&
			dragPreviewPoint.index !== null &&
			basePoints[dragPreviewPoint.index]
		) {
			basePoints[dragPreviewPoint.index] = {
				latitude: Number(dragPreviewPoint.latitude),
				longitude: Number(dragPreviewPoint.longitude),
			};
		}

		return basePoints;
	}, [localPoints, dragPreviewPoint]);

	const isTrackingMode = draft?.mode === "tracking";

	if (loading || !region) {
		return (
			<View style={styles.centered}>
				<ActivityIndicator size="large" color="#fff" />
				<Text style={styles.loadingText}>Abrindo mapa...</Text>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<MapView
				ref={mapRef}
				style={styles.map}
				initialRegion={region}
				mapType={mapType}
				onRegionChangeComplete={handleRegionChangeComplete}
				showsUserLocation
				showsMyLocationButton={false}
				toolbarEnabled={false}
			>
				{!isSaving &&
					polylineCoords.map((coord, index) => (
						<Marker
							key={`draft-point-${index}`}
							coordinate={
								dragPreviewPoint && dragPreviewPoint.index === index
									? {
										latitude: Number(dragPreviewPoint.latitude),
										longitude: Number(dragPreviewPoint.longitude),
									}
									: coord
							}
							draggable
							tracksViewChanges={false}
							onPress={() => handleMarkerPress(index)}
							onDrag={(event) => {
								const newCoord = event?.nativeEvent?.coordinate;
								if (!newCoord?.latitude || !newCoord?.longitude) return;

								setDragPreviewPoint({
									index,
									latitude: Number(newCoord.latitude),
									longitude: Number(newCoord.longitude),
								});
							}}
							onDragStart={async () => {
								setSelectedPointIndex(index);
								setDragPreviewPoint({
									index,
									latitude: Number(coord.latitude),
									longitude: Number(coord.longitude),
								});
								setFeedbackMessage(`Arrastando ponto ${index + 1}...`);

								try {
									await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
								} catch (error) {
									console.log("HAPTIC DRAG START ERROR:", error);
								}
							}}
							onDragEnd={async (event) => {
								const newCoord = event?.nativeEvent?.coordinate;
								if (!newCoord?.latitude || !newCoord?.longitude) return;

								try {
									const latitude = Number(newCoord.latitude);
									const longitude = Number(newCoord.longitude);

									setLocalPoints((prev) =>
										prev.map((point, pointIndex) =>
											pointIndex === index
												? {
													...point,
													latitude,
													longitude,
													recordedAt: new Date().toISOString(),
												}
												: point
										)
									);

									setDragPreviewPoint(null);
									setSelectedPointIndex(index);
									setFeedbackMessage(`Ponto ${index + 1} ajustado.`);

									await Haptics.notificationAsync(
										Haptics.NotificationFeedbackType.Success
									);
								} catch (error) {
									console.log("DRAG ERROR:", error);
									Alert.alert("Erro", "Não foi possível atualizar o ponto.");
								}
							}}
						>
							<PointMarker selected={selectedPointIndex === index} />
						</Marker>
					))}

				{!isSaving && polylineCoords.length >= 2 && !draft?.isClosed ? (
					<Polyline
						coordinates={polylineCoords}
						strokeWidth={3}
						strokeColor="#22C55E"
					/>
				) : null}

				{!isSaving && polylineCoords.length >= 3 && draft?.isClosed ? (
					<MapPolygon
						coordinates={polylineCoords}
						strokeWidth={3}
						strokeColor="rgba(34,197,94,0.95)"
						fillColor="rgba(34,197,94,0.18)"
					/>
				) : null}
			</MapView>

			{selectedPointIndex === null && !isSaving ? (
				<View pointerEvents="none" style={styles.crosshairWrap}>
					<View style={styles.crosshairOuter}>
						<View style={styles.crosshairInner} />
					</View>
				</View>
			) : null}

			<View style={styles.topBar}>
				<TouchableOpacity
					style={styles.iconButton}
					onPress={() => navigation.goBack()}
				>
					<Ionicons name="arrow-back" size={20} color="#111827" />
				</TouchableOpacity>

				<View style={styles.topInfo}>
					<Text style={styles.topTitle}>
						{isTrackingMode ? "Navegação automática" : "Ponto a ponto"}
					</Text>
					<Text style={styles.topSubtitle}>
						{isTrackingMode
							? "Use o alvo central ou a captura automática"
							: "Posicione o alvo e confirme os pontos"}
					</Text>
				</View>

				<TouchableOpacity style={styles.iconButton} onPress={handleCenterUser}>
					<Ionicons name="locate" size={20} color="#111827" />
				</TouchableOpacity>

				<TouchableOpacity style={styles.iconButton} onPress={handleToggleMapType}>
					<Ionicons
						name={mapType === "satellite" ? "map-outline" : "earth-outline"}
						size={20}
						color="#111827"
					/>
				</TouchableOpacity>
			</View>

			{isTrackingMode && selectedPointIndex === null && !isSaving ? (
				<View style={styles.trackingPill}>
					<Ionicons
						name={trackingActive ? "radio-button-on" : "pause-circle-outline"}
						size={15}
						color={trackingActive ? "#16A34A" : "#92400E"}
					/>
					<Text style={styles.trackingPillText}>
						{trackingActive ? "Captura ativa" : "Captura pausada"}
					</Text>
				</View>
			) : null}
			{selectedPointIndex !== null && !isSaving ? (
				<View style={styles.dragHintPill}>
					<Ionicons name="move-outline" size={15} color="#111827" />
					<Text style={styles.dragHintPillText}>
						Ponto pronto para arrastar
					</Text>
				</View>
			) : null}

			{selectedPointIndex !== null && !isSaving ? (
				<View style={styles.pointActionSheet}>
					<Text style={styles.pointActionTitle}>
						Ponto {selectedPointIndex + 1}
					</Text>

					<Text style={styles.pointActionHint}>
						Arraste a bola verde para ajustar este ponto.
					</Text>

					<TouchableOpacity
						style={styles.pointActionButton}
						onPress={handleSafeRemovePoint}
					>
						<Ionicons name="trash-outline" size={18} color="#B91C1C" />
						<Text style={[styles.pointActionButtonText, styles.removeText]}>
							Remover ponto
						</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={styles.pointActionCancel}
						onPress={() => setSelectedPointIndex(null)}
					>
						<Text style={styles.pointActionCancelText}>Fechar</Text>
					</TouchableOpacity>
				</View>
			) : null}

			{selectedPointIndex === null ? (
				<View style={styles.bottomCard}>
					{feedbackMessage ? (
						<Text style={styles.feedbackText}>{feedbackMessage}</Text>
					) : null}

					{isSaving ? (
						<Text style={styles.savingText}>Processando...</Text>
					) : null}

					{isTrackingMode ? (
						<TouchableOpacity
							style={[
								styles.trackingToggleButton,
								trackingActive
									? styles.trackingPauseButton
									: styles.trackingStartButton,
								isSaving && styles.disabledButton,
							]}
							onPress={handleToggleTracking}
							disabled={isSaving}
						>
							<Ionicons
								name={trackingActive ? "pause-outline" : "play-outline"}
								size={20}
								color="#fff"
							/>
							<Text style={styles.trackingToggleButtonText}>
								{trackingActive ? "Pausar captura" : "Iniciar captura"}
							</Text>
						</TouchableOpacity>
					) : null}

					<TouchableOpacity
						style={[styles.confirmButton, isSaving && styles.disabledButton]}
						onPress={handleConfirmPoint}
						disabled={isSaving}
					>
						<Ionicons name="checkmark-circle" size={20} color="#fff" />
						<Text style={styles.confirmButtonText}>Confirmar ponto</Text>
					</TouchableOpacity>

					{localPoints.length >= 3 ? (
						<TouchableOpacity
							style={[styles.closePolygonButton, isSaving && styles.disabledButton]}
							onPress={handleRequestClosePolygon}
							disabled={isSaving}
						>
							<Ionicons name="git-network-outline" size={20} color="#fff" />
							<Text style={styles.closePolygonButtonText}>
								Fechar polígono
							</Text>
						</TouchableOpacity>
					) : null}
				</View>
			) : null}
		</View>
	);
};

export default PolygonMapPickerScreen;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#000",
	},
	map: {
		flex: 1,
	},
	centered: {
		flex: 1,
		backgroundColor: Colors.primary[901] || "#1F2937",
		alignItems: "center",
		justifyContent: "center",
	},
	loadingText: {
		marginTop: 12,
		color: "#fff",
		fontSize: 14,
	},
	topBar: {
		position: "absolute",
		top: 52,
		left: 12,
		right: 12,
		flexDirection: "row",
		alignItems: "center",
	},
	iconButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: "rgba(255,255,255,0.82)",
		alignItems: "center",
		justifyContent: "center",
		marginLeft: 6,
	},
	topInfo: {
		flex: 1,
		marginHorizontal: 8,
		backgroundColor: "rgba(17,24,39,0.50)",
		borderRadius: 14,
		paddingHorizontal: 12,
		paddingVertical: 8,
	},
	topTitle: {
		color: "#fff",
		fontSize: 14,
		fontWeight: "800",
	},
	topSubtitle: {
		color: "rgba(255,255,255,0.88)",
		fontSize: 11,
		lineHeight: 14,
		marginTop: 2,
	},
	trackingPill: {
		position: "absolute",
		top: 108,
		alignSelf: "center",
		backgroundColor: "rgba(255,255,255,0.85)",
		borderRadius: 999,
		paddingHorizontal: 12,
		paddingVertical: 7,
		flexDirection: "row",
		alignItems: "center",
	},
	trackingPillText: {
		fontSize: 11,
		fontWeight: "800",
		color: "#111827",
		marginLeft: 5,
	},
	crosshairWrap: {
		position: "absolute",
		left: 0,
		right: 0,
		top: 0,
		bottom: 0,
		alignItems: "center",
		justifyContent: "center",
	},
	crosshairOuter: {
		width: 32,
		height: 32,
		borderRadius: 16,
		borderWidth: 2,
		borderColor: "#EF4444",
		backgroundColor: "rgba(255,255,255,0.18)",
		alignItems: "center",
		justifyContent: "center",
	},
	crosshairInner: {
		width: 9,
		height: 9,
		borderRadius: 4.5,
		backgroundColor: "#EF4444",
	},
	pointMarkerOuter: {
		width: 22,
		height: 22,
		borderRadius: 11,
		backgroundColor: "rgba(255,255,255,0.90)",
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 1,
		borderColor: "rgba(0,0,0,0.15)",
	},
	pointMarkerOuterSelected: {
		width: 30,
		height: 30,
		borderRadius: 15,
	},
	pointMarkerInner: {
		width: 14,
		height: 14,
		borderRadius: 7,
		backgroundColor: "#22C55E",
	},
	pointMarkerInnerSelected: {
		width: 20,
		height: 20,
		borderRadius: 10,
		backgroundColor: "#16A34A",
	},
	pointActionSheet: {
		position: "absolute",
		left: 14,
		right: 14,
		bottom: 18,
		backgroundColor: "rgba(255,255,255,0.94)",
		borderRadius: 18,
		padding: 14,
	},
	pointActionTitle: {
		fontSize: 15,
		fontWeight: "800",
		color: "#111827",
		marginBottom: 6,
	},
	pointActionHint: {
		fontSize: 12,
		color: "#6B7280",
		marginBottom: 10,
		lineHeight: 17,
	},
	pointActionButton: {
		height: 44,
		borderRadius: 12,
		backgroundColor: "#F3F4F6",
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 8,
	},
	pointActionButtonText: {
		fontSize: 14,
		fontWeight: "700",
		color: "#111827",
		marginLeft: 8,
	},
	removeText: {
		color: "#B91C1C",
	},
	pointActionCancel: {
		height: 38,
		alignItems: "center",
		justifyContent: "center",
	},
	pointActionCancelText: {
		fontSize: 13,
		fontWeight: "700",
		color: "#6B7280",
	},
	bottomCard: {
		position: "absolute",
		left: 14,
		right: 14,
		bottom: 18,
		backgroundColor: "rgba(255,255,255,0.82)",
		borderRadius: 18,
		padding: 14,
	},
	feedbackText: {
		marginBottom: 6,
		fontSize: 12,
		fontWeight: "700",
		color: "#16A34A",
	},
	savingText: {
		marginBottom: 6,
		fontSize: 12,
		fontWeight: "700",
		color: "#2563EB",
	},
	coordValue: {
		fontSize: 13,
		fontWeight: "700",
		color: "#111827",
		marginBottom: 10,
	},
	trackingToggleButton: {
		height: 46,
		borderRadius: 14,
		alignItems: "center",
		justifyContent: "center",
		flexDirection: "row",
		marginBottom: 8,
	},
	trackingStartButton: {
		backgroundColor: "#16A34A",
	},
	trackingPauseButton: {
		backgroundColor: "#D97706",
	},
	trackingToggleButtonText: {
		color: "#fff",
		fontSize: 14,
		fontWeight: "800",
		marginLeft: 8,
	},
	confirmButton: {
		height: 48,
		borderRadius: 14,
		backgroundColor: Colors.primary[901] || "#1F2937",
		alignItems: "center",
		justifyContent: "center",
		flexDirection: "row",
	},
	confirmButtonText: {
		color: "#fff",
		fontSize: 15,
		fontWeight: "800",
		marginLeft: 8,
	},
	closePolygonButton: {
		height: 48,
		borderRadius: 14,
		backgroundColor: "#16A34A",
		alignItems: "center",
		justifyContent: "center",
		flexDirection: "row",
		marginTop: 8,
	},
	closePolygonButtonText: {
		color: "#fff",
		fontSize: 15,
		fontWeight: "800",
		marginLeft: 8,
	},
	disabledButton: {
		opacity: 0.5,
	},
	dragHintPill: {
		position: "absolute",
		top: 148,
		alignSelf: "center",
		backgroundColor: "rgba(255,255,255,0.92)",
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