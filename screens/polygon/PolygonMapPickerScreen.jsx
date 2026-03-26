import React, { useEffect, useMemo, useRef, useState } from "react";
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ActivityIndicator,
	Alert,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import * as Location from "expo-location";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useDispatch, useSelector } from "react-redux";

import { Colors } from "../../constants/styles";
import { polygonActions } from "../../store/redux/polygon";
import { selectPolygonDraft } from "../../store/redux/polygonSelectors";

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

const PolygonMapPickerScreen = ({ navigation, route }) => {
	const dispatch = useDispatch();
	const draft = useSelector(selectPolygonDraft);
	const mapRef = useRef(null);

	const initialEditIndex =
		typeof route?.params?.editIndex === "number" ? route.params.editIndex : null;

	const [loading, setLoading] = useState(true);
	const [region, setRegion] = useState(null);
	const [feedbackMessage, setFeedbackMessage] = useState("");
	const [selectedPointIndex, setSelectedPointIndex] = useState(null);
	const [dragEditIndex, setDragEditIndex] = useState(initialEditIndex);
	const [localPoints, setLocalPoints] = useState(draft?.points || []);
	const [mapVersion, setMapVersion] = useState(0);
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		initialize();
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
		if (dragEditIndex === null) return;
		if (!localPoints[dragEditIndex]) {
			setDragEditIndex(null);
		}
	}, [localPoints, dragEditIndex]);

	const initialize = async () => {
		try {
			setLoading(true);

			const { status } = await Location.requestForegroundPermissionsAsync();
			if (status !== "granted") {
				Alert.alert("Permissão necessária", "Ative a localização para usar o mapa.");
				navigation.goBack();
				return;
			}

			if (initialEditIndex !== null && localPoints[initialEditIndex]) {
				const point = localPoints[initialEditIndex];
				setRegion(buildRegion(point.latitude, point.longitude));
				return;
			}

			const location = await Location.getCurrentPositionAsync({
				accuracy: Location.Accuracy.High,
			});

			setRegion(
				buildRegion(location.coords.latitude, location.coords.longitude)
			);
		} catch (error) {
			console.log("INIT ERROR:", error);
			Alert.alert("Erro", "Não foi possível abrir o mapa.");
			navigation.goBack();
		} finally {
			setLoading(false);
		}
	};

	const handleRegionChangeComplete = (nextRegion) => {
		if (dragEditIndex !== null) return;
		if (isSaving) return;
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

			setRegion(nextRegion);

			if (mapRef.current) {
				mapRef.current.animateToRegion(nextRegion, 700);
			}
		} catch (error) {
			console.log("CENTER USER ERROR:", error);
			Alert.alert("Erro", "Não foi possível obter sua localização atual.");
		}
	};

	const handleConfirmPoint = () => {
		if (dragEditIndex !== null) {
			setFeedbackMessage(`Ponto ${dragEditIndex + 1} atualizado.`);
			setSelectedPointIndex(null);
			setDragEditIndex(null);
			return;
		}

		if (!region?.latitude || !region?.longitude) {
			Alert.alert("Erro", "Não foi possível obter o ponto central do mapa.");
			return;
		}

		const point = {
			latitude: Number(region.latitude),
			longitude: Number(region.longitude),
			accuracy: null,
			recordedAt: new Date().toISOString(),
		};

		if (Number.isNaN(point.latitude) || Number.isNaN(point.longitude)) {
			Alert.alert("Erro", "As coordenadas do ponto são inválidas.");
			return;
		}

		try {
			console.log("ADD POINT:", point);
			setLocalPoints((prev) => [...prev, point]);
			setFeedbackMessage("Ponto adicionado com sucesso.");
		} catch (error) {
			console.log("ADD POINT ERROR:", error);
			Alert.alert("Erro", "Não foi possível adicionar o ponto.");
		}
	};

	const handleRequestClosePolygon = () => {
		if (dragEditIndex !== null) {
			Alert.alert(
				"Concluir edição",
				"Conclua a edição do ponto antes de fechar o polígono."
			);
			return;
		}

		if (!region?.latitude || !region?.longitude) {
			Alert.alert("Erro", "Não foi possível obter o ponto central do mapa.");
			return;
		}

		Alert.alert(
			"Fechar polígono",
			"Deseja fechar o polígono e voltar para preencher os dados?",
			[
				{ text: "Cancelar", style: "cancel" },
				{
					text: "Salvar",
					onPress: () => {
						const closingPoint = {
							latitude: Number(region.latitude),
							longitude: Number(region.longitude),
							accuracy: null,
							recordedAt: new Date().toISOString(),
						};

						const finalPoints = sanitizePoints([...localPoints, closingPoint]);

						console.log("CLOSE 1 - closingPoint:", closingPoint);
						console.log("CLOSE 2 - finalPoints sanitized:", finalPoints);

						if (finalPoints.length < 3) {
							Alert.alert(
								"Polígono incompleto",
								"É necessário ter ao menos 3 pontos."
							);
							return;
						}

						try {
							setIsSaving(true);
							setSelectedPointIndex(null);
							setDragEditIndex(null);
							setFeedbackMessage("");

							setTimeout(() => {
								try {
									console.log("CLOSE 3 - setDraftPoints");
									dispatch(polygonActions.setDraftPoints(finalPoints));

									console.log("CLOSE 4 - finishPolygonDraft");
									dispatch(
										polygonActions.finishPolygonDraft({
											isClosed: true,
										})
									);

									console.log("CLOSE 5 - goBack");
									navigation.goBack();
								} catch (closeError) {
									console.log("CLOSE FLOW ERROR:", closeError);
									setIsSaving(false);
									Alert.alert("Erro", "Não foi possível fechar o polígono.");
								}
							}, 180);
						} catch (error) {
							console.log("CLOSE OUTER ERROR:", error);
							setIsSaving(false);
							Alert.alert("Erro", "Não foi possível fechar o polígono.");
						}
					},
				},
			]
		);
	};

	
	const handleMarkerPress = (index) => {
		if (dragEditIndex !== null) return;
		if (isSaving) return;
		setFeedbackMessage("");
		setSelectedPointIndex(index);
	};

	const handleStartEditPoint = () => {
		if (selectedPointIndex === null) return;

		const point = localPoints[selectedPointIndex];
		if (!point) {
			setSelectedPointIndex(null);
			return;
		}

		setDragEditIndex(selectedPointIndex);
		setSelectedPointIndex(null);
		setFeedbackMessage("");

		const nextRegion = buildRegion(point.latitude, point.longitude);
		setRegion(nextRegion);

		if (mapRef.current) {
			mapRef.current.animateToRegion(nextRegion, 400);
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
					onPress: () => {
						try {
							console.log("REMOVE 1 - index:", indexToRemove);

							setSelectedPointIndex(null);
							setDragEditIndex(null);
							setFeedbackMessage("");
							setIsSaving(true);

							requestAnimationFrame(() => {
								setTimeout(() => {
									try {
										console.log("REMOVE 2 - before:", localPoints);

										const nextPoints = localPoints.filter(
											(_, index) => index !== indexToRemove
										);

										console.log("REMOVE 3 - after:", nextPoints);

										setLocalPoints(nextPoints);
										setMapVersion((prev) => prev + 1);

										setTimeout(() => {
											setIsSaving(false);
										}, 120);
									} catch (removeError) {
										console.log("REMOVE FLOW ERROR:", removeError);
										setIsSaving(false);
										Alert.alert("Erro", "Não foi possível remover o ponto.");
									}
								}, 180);
							});
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


	const getRootNavigation = () => {
		let parentNav = navigation;

		while (parentNav?.getParent?.()) {
			parentNav = parentNav.getParent();
		}

		return parentNav;
	};

	const navigatePolygonFlow = (screen, params = {}) => {
		const rootNav = getRootNavigation();

		rootNav.navigate("PolygonFlowStackScreen", {
			screen,
			params,
		});
	};

	const navigatePolygonTabHome = () => {
		const rootNav = getRootNavigation();

		rootNav.navigate("HomeStackScreen", {
			screen: "PoligonosTab",
		});
	};
	const polylineCoords = useMemo(() => {
		return sanitizePoints(localPoints).map((point) => ({
			latitude: point.latitude,
			longitude: point.longitude,
		}));
	}, [localPoints]);

	const centerCoordinate =
		region?.latitude && region?.longitude
			? {
				latitude: region.latitude,
				longitude: region.longitude,
			}
			: null;

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
				key={`polygon-map-${mapVersion}`}
				ref={mapRef}
				style={styles.map}
				initialRegion={region}
				onRegionChangeComplete={handleRegionChangeComplete}
				showsUserLocation
				showsMyLocationButton={false}
				toolbarEnabled={false}
			>
				{!isSaving &&
					polylineCoords.map((coord, index) => {
						const isDraggingThisPoint = dragEditIndex === index;

						return (
							<Marker
								key={`draft-point-${index}`}
								coordinate={coord}
								pinColor={isDraggingThisPoint ? "#F59E0B" : "#DC2626"}
								title={`Ponto ${index + 1}`}
								description={
									isDraggingThisPoint
										? "Arraste para editar"
										: "Toque para editar ou remover"
								}
								draggable={isDraggingThisPoint}
								onPress={() => handleMarkerPress(index)}
								onDragEnd={(event) => {
									if (!isDraggingThisPoint) return;

									const newCoord = event?.nativeEvent?.coordinate;
									if (!newCoord?.latitude || !newCoord?.longitude) return;

									try {
										console.log("DRAG 1 - old index:", index);
										console.log("DRAG 2 - new coord:", newCoord);

										setLocalPoints((prev) =>
											prev.map((point, pointIndex) =>
												pointIndex === index
													? {
														...point,
														latitude: Number(newCoord.latitude),
														longitude: Number(newCoord.longitude),
														recordedAt: new Date().toISOString(),
													}
													: point
											)
										);

										setRegion((prev) => ({
											...(prev || DEFAULT_DELTA),
											latitude: Number(newCoord.latitude),
											longitude: Number(newCoord.longitude),
										}));
									} catch (error) {
										console.log("DRAG ERROR:", error);
										Alert.alert("Erro", "Não foi possível atualizar o ponto.");
									}
								}}
							/>
						);
					})}

				{!isSaving && polylineCoords.length >= 2 ? (
					<Polyline
						coordinates={polylineCoords}
						strokeWidth={3}
						strokeColor="#DC2626"
					/>
				) : null}

				{centerCoordinate && dragEditIndex === null && !isSaving ? (
					<Marker coordinate={centerCoordinate} opacity={0} />
				) : null}
			</MapView>

			{dragEditIndex === null && selectedPointIndex === null && !isSaving ? (
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
					<Ionicons name="arrow-back" size={22} color="#111827" />
				</TouchableOpacity>

				<View style={styles.topInfo}>
					<Text style={styles.topTitle}>
						{dragEditIndex !== null ? "Editar ponto" : "Adicionar pontos"}
					</Text>
					<Text style={styles.topSubtitle}>
						{dragEditIndex !== null
							? "Arraste o marcador amarelo para ajustar a posição"
							: "Use o alvo central para adicionar. Toque em um ponto para editar ou remover"}
					</Text>
				</View>

				<TouchableOpacity style={styles.iconButton} onPress={handleCenterUser}>
					<Ionicons name="locate" size={22} color="#111827" />
				</TouchableOpacity>
			</View>

			{selectedPointIndex !== null && !isSaving ? (
				<View style={styles.pointActionSheet}>
					<Text style={styles.pointActionTitle}>
						Ponto {selectedPointIndex + 1}
					</Text>

					<TouchableOpacity
						style={styles.pointActionButton}
						onPress={handleStartEditPoint}
					>
						<Ionicons name="create-outline" size={18} color="#111827" />
						<Text style={styles.pointActionButtonText}>Editar ponto</Text>
					</TouchableOpacity>

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
						<Text style={styles.pointActionCancelText}>Cancelar</Text>
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

					<Text style={styles.coordLabel}>
						{dragEditIndex !== null ? "Ponto em edição" : "Coordenadas do centro"}
					</Text>

					<Text style={styles.coordValue}>
						Lat {Number(region.latitude).toFixed(6)} • Lon {Number(region.longitude).toFixed(6)}
					</Text>

					<TouchableOpacity
						style={[styles.confirmButton, isSaving && styles.disabledButton]}
						onPress={handleConfirmPoint}
						disabled={isSaving}
					>
						<Ionicons
							name={dragEditIndex !== null ? "save-outline" : "checkmark-circle"}
							size={22}
							color="#fff"
						/>
						<Text style={styles.confirmButtonText}>
							{dragEditIndex !== null ? "Concluir edição" : "Confirmar ponto"}
						</Text>
					</TouchableOpacity>

					{dragEditIndex === null && localPoints.length >= 3 ? (
						<TouchableOpacity
							style={[styles.closePolygonButton, isSaving && styles.disabledButton]}
							onPress={handleRequestClosePolygon}
							disabled={isSaving}
						>
							<Ionicons name="git-network-outline" size={22} color="#fff" />
							<Text style={styles.closePolygonButtonText}>
								Fechar polígono
							</Text>
						</TouchableOpacity>
					) : null}

					<TouchableOpacity
						style={[styles.secondaryActionButton, isSaving && styles.disabledButton]}
						onPress={() => navigation.goBack()}
						disabled={isSaving}
					>
						<Ionicons name="arrow-back" size={20} color="#111827" />
						<Text style={styles.secondaryActionButtonText}>
							Voltar para o rascunho
						</Text>
					</TouchableOpacity>
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
		top: 54,
		left: 16,
		right: 16,
		flexDirection: "row",
		alignItems: "center",
	},
	iconButton: {
		width: 46,
		height: 46,
		borderRadius: 23,
		backgroundColor: "rgba(255,255,255,0.95)",
		alignItems: "center",
		justifyContent: "center",
	},
	topInfo: {
		flex: 1,
		marginHorizontal: 12,
		backgroundColor: "rgba(17,24,39,0.82)",
		borderRadius: 16,
		paddingHorizontal: 14,
		paddingVertical: 10,
	},
	topTitle: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "800",
	},
	topSubtitle: {
		color: "rgba(255,255,255,0.88)",
		fontSize: 12,
		lineHeight: 16,
		marginTop: 4,
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
		width: 34,
		height: 34,
		borderRadius: 17,
		borderWidth: 2,
		borderColor: "#DC2626",
		backgroundColor: "rgba(255,255,255,0.28)",
		alignItems: "center",
		justifyContent: "center",
	},
	crosshairInner: {
		width: 10,
		height: 10,
		borderRadius: 5,
		backgroundColor: "#DC2626",
	},
	pointActionSheet: {
		position: "absolute",
		left: 16,
		right: 16,
		bottom: 22,
		backgroundColor: "rgba(255,255,255,0.98)",
		borderRadius: 22,
		padding: 16,
	},
	pointActionTitle: {
		fontSize: 16,
		fontWeight: "800",
		color: "#111827",
		marginBottom: 12,
	},
	pointActionButton: {
		height: 48,
		borderRadius: 14,
		backgroundColor: "#F3F4F6",
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 10,
	},
	pointActionButtonText: {
		fontSize: 15,
		fontWeight: "700",
		color: "#111827",
		marginLeft: 8,
	},
	removeText: {
		color: "#B91C1C",
	},
	pointActionCancel: {
		height: 42,
		alignItems: "center",
		justifyContent: "center",
	},
	pointActionCancelText: {
		fontSize: 14,
		fontWeight: "700",
		color: "#6B7280",
	},
	bottomCard: {
		position: "absolute",
		left: 16,
		right: 16,
		bottom: 22,
		backgroundColor: "rgba(255,255,255,0.96)",
		borderRadius: 22,
		padding: 16,
	},
	feedbackText: {
		marginBottom: 8,
		fontSize: 13,
		fontWeight: "700",
		color: "#16A34A",
	},
	savingText: {
		marginBottom: 8,
		fontSize: 13,
		fontWeight: "700",
		color: "#2563EB",
	},
	coordLabel: {
		fontSize: 12,
		color: "#6B7280",
		marginBottom: 4,
	},
	coordValue: {
		fontSize: 15,
		fontWeight: "700",
		color: "#111827",
		marginBottom: 14,
	},
	confirmButton: {
		height: 52,
		borderRadius: 16,
		backgroundColor: Colors.primary[901] || "#1F2937",
		alignItems: "center",
		justifyContent: "center",
		flexDirection: "row",
	},
	confirmButtonText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "800",
		marginLeft: 10,
	},
	closePolygonButton: {
		height: 52,
		borderRadius: 16,
		backgroundColor: "#16A34A",
		alignItems: "center",
		justifyContent: "center",
		flexDirection: "row",
		marginTop: 10,
	},
	closePolygonButtonText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "800",
		marginLeft: 10,
	},
	secondaryActionButton: {
		height: 48,
		borderRadius: 14,
		backgroundColor: "#F3F4F6",
		alignItems: "center",
		justifyContent: "center",
		flexDirection: "row",
		marginTop: 10,
	},
	secondaryActionButtonText: {
		color: "#111827",
		fontSize: 15,
		fontWeight: "800",
		marginLeft: 8,
	},
	disabledButton: {
		opacity: 0.5,
	},
});