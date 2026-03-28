import React, { useEffect, useMemo, useRef, useState } from "react";
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
	AppState,
	Platform
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import MapView, { Polygon as MapPolygon, Polyline, Marker } from "react-native-maps";
import * as Location from "expo-location";

import { Colors } from "../../constants/styles";
import { polygonActions } from "../../store/redux/polygon";
import { farmsSelector } from "../../store/redux/selector";

const POLYGON_DRAFT_STORAGE_KEY = "@polygon_manual_draft_backup_v1";


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

function ValidationItem({ ok, label }) {
	return (
		<View style={styles.validationItem}>
			<Ionicons
				name={ok ? "checkmark-circle" : "close-circle"}
				size={16}
				color={ok ? "#16A34A" : "#DC2626"}
			/>
			<Text
				style={[
					styles.validationText,
					ok ? styles.validationTextOk : styles.validationTextError,
				]}
			>
				{label}
			</Text>
		</View>
	);
}

function hasMeaningfulDraft(draft, farmQuery) {
	return Boolean(
		(draft?.name || "").trim() ||
		(draft?.farmName || "").trim() ||
		(farmQuery || "").trim() ||
		(draft?.observation || "").trim() ||
		(Array.isArray(draft?.points) && draft.points.length > 0)
	);
}

function PointMarker() {
	return (
		<View style={styles.pointMarkerOuter}>
			<View style={styles.pointMarkerInner} />
		</View>
	);
}

export default function PolygonManualScreen() {
	const dispatch = useDispatch();
	const navigation = useNavigation();

	const draft = useSelector((state) => state.polygon.draft);
	const farms = useSelector(farmsSelector) || [];

	const [farmQuery, setFarmQuery] = useState(draft?.farmName || "");
	const [currentLocation, setCurrentLocation] = useState(null);
	const [showFarmSuggestions, setShowFarmSuggestions] = useState(false);
	const [didTryRestore, setDidTryRestore] = useState(false);

	const persistTimeoutRef = useRef(null);

	useEffect(() => {
		let mounted = true;

		const loadCurrentLocation = async () => {
			try {
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
			}
		};

		loadCurrentLocation();

		return () => {
			mounted = false;
		};
	}, []);

	useEffect(() => {
		let mounted = true;

		const restoreDraftFromStorage = async () => {
			try {
				const raw = await AsyncStorage.getItem(POLYGON_DRAFT_STORAGE_KEY);

				if (!raw) {
					setDidTryRestore(true);
					return;
				}

				const backup = JSON.parse(raw);

				if (!backup || !backup.draft) {
					setDidTryRestore(true);
					return;
				}

				const currentHasData = hasMeaningfulDraft(draft, farmQuery);

				if (!currentHasData && mounted) {
					dispatch(
						polygonActions.startPolygonDraft({
							...backup.draft,
						})
					);

					setFarmQuery(backup?.farmQuery || backup?.draft?.farmName || "");
				}
			} catch (error) {
				console.log("RESTORE POLYGON DRAFT ERROR:", error);
			} finally {
				if (mounted) {
					setDidTryRestore(true);
				}
			}
		};

		restoreDraftFromStorage();

		return () => {
			mounted = false;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [dispatch]);

	const persistDraftBackup = async () => {
		try {
			if (!hasMeaningfulDraft(draft, farmQuery)) {
				await AsyncStorage.removeItem(POLYGON_DRAFT_STORAGE_KEY);
				return;
			}

			const payload = {
				draft: {
					id: draft?.id || null,
					name: draft?.name || "",
					farmId: draft?.farmId || null,
					farmName: draft?.farmName || "",
					mode: draft?.mode || "manual",
					points: Array.isArray(draft?.points) ? draft.points : [],
					isClosed: !!draft?.isClosed,
					observation: draft?.observation || "",
					followMe: !!draft?.followMe,
					autoMinDistance: Number(draft?.autoMinDistance ?? 10),
					autoMinSeconds: Number(draft?.autoMinSeconds ?? 3),
					startedAt: draft?.startedAt || null,
				},
				farmQuery: farmQuery || "",
				savedAt: new Date().toISOString(),
			};

			await AsyncStorage.setItem(
				POLYGON_DRAFT_STORAGE_KEY,
				JSON.stringify(payload)
			);
		} catch (error) {
			console.log("SAVE POLYGON DRAFT BACKUP ERROR:", error);
		}
	};

	useEffect(() => {
		if (!didTryRestore) return;

		if (persistTimeoutRef.current) {
			clearTimeout(persistTimeoutRef.current);
		}

		persistTimeoutRef.current = setTimeout(() => {
			persistDraftBackup();
		}, 250);

		return () => {
			if (persistTimeoutRef.current) {
				clearTimeout(persistTimeoutRef.current);
			}
		};
	}, [
		didTryRestore,
		draft?.id,
		draft?.name,
		draft?.farmId,
		draft?.farmName,
		draft?.mode,
		draft?.isClosed,
		draft?.observation,
		draft?.followMe,
		draft?.autoMinDistance,
		draft?.autoMinSeconds,
		draft?.startedAt,
		JSON.stringify(draft?.points || []),
		farmQuery,
	]);



	useEffect(() => {
		if (draft?.mode === "manual") {
			updateMeta({ followMe: false });
		} else {
			updateMeta({ followMe: true });
		}
	}, [draft?.mode]);

	useEffect(() => {
		const subscription = AppState.addEventListener("change", (nextState) => {
			if (nextState === "inactive" || nextState === "background") {
				persistDraftBackup();
			}
		});

		return () => {
			subscription?.remove?.();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [draft, farmQuery]);

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

	const measuredAreaM2 = useMemo(() => {
		if (!draft?.isClosed || validPoints.length < 3) return 0;
		return calculatePolygonAreaInM2(validPoints);
	}, [validPoints, draft?.isClosed]);

	const measuredAreaHa = useMemo(() => {
		return measuredAreaM2 / 10000;
	}, [measuredAreaM2]);

	const measuredPerimeterM = useMemo(() => {
		return calculatePerimeterInMeters(validPoints, !!draft?.isClosed);
	}, [validPoints, draft?.isClosed]);

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


	const isNameValid = (draft?.name || "").trim().length > 0;
	const isFarmValid = (draft?.farmName || "").trim().length > 0;
	const isPolygonClosed = draft?.isClosed === true;
	const hasMinimumPoints = validPoints.length >= 3;

	const isValidPolygon = useMemo(() => {
		return isNameValid && isFarmValid && hasMinimumPoints && isPolygonClosed;
	}, [isNameValid, isFarmValid, hasMinimumPoints, isPolygonClosed]);

	const updateMeta = (payload) => {
		dispatch(polygonActions.setPolygonMeta(payload));
	};

	const handleChangeName = (value) => {
		updateMeta({ name: value });
	};

	const handleChangeFarm = (value) => {
		setFarmQuery(value);
		updateMeta({ farmName: "" });

		const hasTerm = (value || "").trim().length >= 2;
		setShowFarmSuggestions(hasTerm);
	};

	const handleSelectFarm = (farmName) => {
		setFarmQuery(farmName);
		updateMeta({ farmName });
		setShowFarmSuggestions(false);
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

	const clearLocalDraftBackup = async () => {
		try {
			await AsyncStorage.removeItem(POLYGON_DRAFT_STORAGE_KEY);
		} catch (error) {
			console.log("CLEAR POLYGON DRAFT BACKUP ERROR:", error);
		}
	};

	const handleSaveDraft = async () => {
		if (!(draft?.name || "").trim()) {
			Alert.alert("Nome obrigatório", "Informe um nome para o polígono.");
			return;
		}

		if (!(draft?.farmName || "").trim()) {
			Alert.alert("Fazenda obrigatória", "Selecione uma fazenda da lista.");
			return;
		}

		if (validPoints.length < 3) {
			Alert.alert("Pontos insuficientes", "Adicione ao menos 3 pontos válidos.");
			return;
		}

		if (!draft?.isClosed) {
			Alert.alert("Polígono aberto", "Feche o polígono antes de salvar.");
			return;
		}

		const areaM2 = Number(measuredAreaM2.toFixed(2));
		const areaHa = Number(measuredAreaHa.toFixed(4));
		const perimeterM = Number(measuredPerimeterM.toFixed(2));

		dispatch(
			polygonActions.saveDraftAsPolygon({
				status: "sync_pending",
				syncPending: true,
				areaM2,
				areaHa,
				perimeterM,
				observation: (draft?.observation || "").trim(),
			})
		);

		await clearLocalDraftBackup();

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

	const handleClearAllPoints = () => {
		Alert.alert(
			"Limpar rascunho",
			"Deseja remover todo o rascunho atual? Isso apaga pontos, nome, fazenda, observação e o backup local.",
			[
				{ text: "Cancelar", style: "cancel" },
				{
					text: "Limpar tudo",
					style: "destructive",
					onPress: async () => {
						await clearLocalDraftBackup();
						setFarmQuery("");
						setShowFarmSuggestions(false);
						dispatch(
							polygonActions.resetPolygonDraft({
								mode: "manual",
								followMe: false,
							})
						);
					},
				},
			]
		);
	};

	const handleOpenDraftPreview = () => {
		if (!validPoints.length) return;

		navigation.navigate("PolygonPreviewScreen", {
			source: "draft",
		});
	};

	return (
		<SafeAreaView style={styles.screen}
			edges={Platform.OS === "android" ? ["bottom"] : []}
		>
			<ScrollView style={styles.container} contentContainerStyle={styles.content}>
				<View style={styles.headerCard}>
					<View style={styles.headerTopRow}>
						<View style={styles.headerTitleWrap}>
							<Text style={styles.headerTitle}>
								{draft?.mode === "tracking"
									? "Navegação automática"
									: "Ponto a ponto"}
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

					{showFarmSuggestions && farmSuggestions.length > 0 ? (
						<View style={styles.suggestionsBox}>
							{farmSuggestions.map((farmName) => (
								<TouchableOpacity
									key={farmName}
									style={styles.suggestionItem}
									onPress={() => handleSelectFarm(farmName)}
								>
									<Text style={styles.suggestionText}>
										{farmName?.replace("Projeto ", "")}
									</Text>
								</TouchableOpacity>
							))}
						</View>
					) : null}

					{!!farmQuery && !draft?.farmName ? (
						<Text style={styles.fieldHintError}>
							Selecione uma fazenda da lista.
						</Text>
					) : null}

					<Text style={styles.label}>Observação</Text>
					<TextInput
						style={[styles.input, styles.textArea]}
						placeholder="Digite uma observação"
						placeholderTextColor="#9CA3AF"
						value={draft?.observation || ""}
						onChangeText={(value) => updateMeta({ observation: value })}
						multiline
						textAlignVertical="top"
					/>
				</View>

				<View style={styles.sectionCard}>
					<Text style={styles.sectionTitle}>Validação para salvar</Text>

					<View style={styles.validationList}>
						<ValidationItem ok={isNameValid} label="Nome preenchido" />
						<ValidationItem ok={isFarmValid} label="Fazenda selecionada da lista" />
						<ValidationItem ok={hasMinimumPoints} label="Mínimo de 3 pontos válidos" />
						<ValidationItem ok={isPolygonClosed} label="Polígono fechado" />
					</View>
				</View>

				<View style={styles.sectionCard}>
					<Text style={styles.sectionTitle}>Ações</Text>

					<TouchableOpacity style={styles.primaryButton} onPress={handleOpenMap}>
						<Ionicons name="map-outline" size={18} color="#fff" />
						<Text style={styles.primaryButtonText}>Abrir mapa</Text>
					</TouchableOpacity>

					{!isValidPolygon ? (
						<Text style={styles.saveHintText}>
							Preencha o nome, selecione a fazenda na lista, adicione ao menos 3
							pontos e feche o polígono.
						</Text>
					) : null}
				</View>

				{validPoints.length > 0 ? (
					<View style={styles.sectionCard}>
						<View style={styles.sectionHeaderRow}>
							<View>
								<Text style={styles.sectionTitle}>Pré-visualização</Text>
								<Text style={styles.previewCount}>
									{validPoints.length} ponto(s)
								</Text>
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
								key={`preview-${validPoints.length}-${draft?.isClosed ? "closed" : "open"}`}
								style={styles.previewMap}
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
										lineCap="round"
										lineJoin="round"
									/>
								) : null}

								{draft?.isClosed && validPoints.length >= 3 ? (
									<>
										<MapPolygon
											coordinates={validPoints}
											strokeColor="rgba(21,101,192,0.95)"
											fillColor="rgba(21,101,192,0.20)"
											strokeWidth={2}
										/>

										<Polyline
											coordinates={[validPoints[validPoints.length - 1], validPoints[0]]}
											strokeColor="rgba(21,101,192,0.95)"
											strokeWidth={3}
											lineCap="round"
											lineJoin="round"
										/>
									</>
								) : null}

								{validPoints.map((point, index) => (
									<Marker
										key={`draft-point-${index}`}
										coordinate={point}
										tracksViewChanges={false}
									>
										<PointMarker />
									</Marker>
								))}

								{currentLocation && validPoints.length === 0 ? (
									<Marker
										coordinate={currentLocation}
										pinColor="#2563EB"
										title="Sua localização"
									/>
								) : null}
							</MapView>

							<View style={styles.previewOverlayHint}>
								<Ionicons name="eye-outline" size={14} color="#fff" />
								<Text style={styles.previewOverlayHintText}>
									Toque para ampliar
								</Text>
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
				{validPoints.length > 0 && (
					<View style={styles.sectionCard}>
						<View style={styles.sectionHeaderRow}>
							<Text style={styles.sectionTitleNoMargin}>Pontos do rascunho ({validPoints?.length} )</Text>

							{hasMeaningfulDraft(draft, farmQuery) ? (
								<TouchableOpacity
									style={styles.clearAllButton}
									onPress={handleClearAllPoints}
								>
									<Ionicons name="trash-outline" size={16} color="#B91C1C" />
									<Text style={styles.clearAllButtonText}>Limpar tudo</Text>
								</TouchableOpacity>
							) : null}
						</View>

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
				)}
			</ScrollView>

			<View style={styles.footer}>
				<TouchableOpacity
					style={[
						styles.footerSaveButton,
						isValidPolygon
							? styles.footerSaveButtonActive
							: styles.footerSaveButtonDisabled,
					]}
					onPress={handleSaveDraft}
					disabled={!isValidPolygon}
				>
					<Ionicons
						name="save-outline"
						size={20}
						color={isValidPolygon ? "#fff" : "whitesmoke"}
					/>
					<Text
						style={[
							styles.footerSaveButtonText,
							isValidPolygon && styles.footerSaveButtonTextActive,
						]}
					>
						Salvar polígono
					</Text>
				</TouchableOpacity>
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
		backgroundColor: Colors.secondary?.[200] || "#F4F6F8",
		paddingBottom: 62,
	},
	container: {
		flex: 1,
		backgroundColor: Colors.secondary[200] || "#F4F6F8",
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
	sectionTitleNoMargin: {
		fontSize: 16,
		fontWeight: "800",
		color: "#111827",
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
		borderWidth: 1,
		borderColor: "#E5E7EB",
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
	fieldHintError: {
		fontSize: 12,
		color: "#B91C1C",
		marginTop: 6,
		fontWeight: "600",
	},
	validationList: {
		gap: 10,
	},
	validationItem: {
		flexDirection: "row",
		alignItems: "center",
	},
	validationText: {
		marginLeft: 8,
		fontSize: 13,
		fontWeight: "600",
		color: "#6B7280",
	},
	validationTextOk: {
		color: "#166534",
	},
	validationTextError: {
		color: "#B91C1C",
	},
	sectionHeaderRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 12,
		gap: 10,
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
	saveHintText: {
		color: "#6B7280",
		fontSize: 12,
		marginTop: 8,
		lineHeight: 18,
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
	clearAllButton: {
		height: 34,
		paddingHorizontal: 12,
		borderRadius: 999,
		backgroundColor: "rgba(185,28,28,0.08)",
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
	},
	clearAllButtonText: {
		marginLeft: 6,
		fontSize: 12,
		fontWeight: "800",
		color: "#B91C1C",
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
	textArea: {
		height: 96,
		paddingTop: 12,
		paddingBottom: 12,
	},
	footer: {
		position: "absolute",
		left: 0,
		right: 0,
		bottom: 0,
		paddingHorizontal: 16,
		paddingTop: 10,
		paddingBottom: 18,
		backgroundColor: "rgba(244,246,248,0.98)",
		borderTopWidth: 1,
		borderTopColor: "#E5E7EB",
	},
	footerSaveButton: {
		height: 56,
		borderRadius: 16,
		alignItems: "center",
		justifyContent: "center",
		flexDirection: "row",
	},
	footerSaveButtonActive: {
		backgroundColor: "#16A34A",
	},
	footerSaveButtonDisabled: {
		backgroundColor: "grey",
	},
	footerSaveButtonText: {
		fontSize: 16,
		fontWeight: "900",
		marginLeft: 10,
		color: "whitesmoke",
	},
	footerSaveButtonTextActive: {
		color: "#fff",
	},
	pointMarkerOuter: {
		width: 18,
		height: 18,
		borderRadius: 9,
		backgroundColor: "rgba(255,255,255,0.95)",
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 1,
		borderColor: "rgba(0,0,0,0.15)",
	},

	pointMarkerInner: {
		width: 10,
		height: 10,
		borderRadius: 5,
		backgroundColor: "#22C55E",
	},
});