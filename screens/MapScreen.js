import MapView, { PROVIDER_GOOGLE, Marker, Polygon } from "react-native-maps";
import { View, Text, StyleSheet, Platform, Linking, Alert } from "react-native";
import IconButton from "../components/ui/IconButton";
import { useState, useEffect, createRef, useRef, useMemo } from "react";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";

import { newMapArr } from "./plot-helper";
import BottomSheetApp from "../components/MapComp/BottomSheet";
import { useSelector } from "react-redux";
import { selectMapDataPlot } from "../store/redux/selector";
import Legend from "../components/MapComp/Legends";
import { Colors } from "../constants/styles";


const MapScreen = ({ navigation, route }) => {
	const mapPlotData = useSelector(selectMapDataPlot);

	const mapRef = createRef();
	const refRBSheet = useRef();

	const { data, selectedParcelas = [] } = route?.params || {};

	const [location, setLocation] = useState(null);
	const [errorMsg, setErrorMsg] = useState(null);

	const [farmName, setFarmName] = useState(null);
	const [filteredFarmArr, setfilteredFarmArr] = useState([]);
	const [getOperationAp, setGetOperationAp] = useState(null);

	const [isPressed, setIsPressed] = useState(null);
	const [propsToBottom, setPropsToBottom] = useState({});
	const [mapCoordsInit, setmapCoordsInit] = useState({
		latitude: "",
		latitudeDelta: null,
		longitude: "",
		longitudeDelta: null,
	});

	// Modo foco: quando ON, só selecionados mostram cores originais
	const [focusSelected, setFocusSelected] = useState(false);

	// Set de talhões selecionados (via params)
	const selectedSet = useMemo(() => {
		return new Set((selectedParcelas || []).map((p) => String(p.parcela).trim()));
	}, [selectedParcelas]);

	// Totais da seleção (para KPIs/Legend quando focusSelected ON)
	const totalsSelected = useMemo(() => {
		return (selectedParcelas || []).reduce(
			(acc, curr) => {
				const solic = Number(curr.areaSolicitada || 0);
				const apl = Number(curr.areaAplicada || 0);
				acc.total += solic;
				acc.aplicado += apl;
				acc.aberto += Math.max(solic - apl, 0);
				return acc;
			},
			{ aberto: 0, aplicado: 0, total: 0 }
		);
	}, [selectedParcelas]);

	// Helpers de cores (mantém exatamente o espírito do seu original)
	const getColor = (cultura, variedadeInside, colorInside = "green") => {
		if (cultura === "Arroz") return "rgba(251,191,112,1)";
		if (cultura === "Soja") return colorInside;
		if (variedadeInside === "Mungo Preto") return "rgba(170,88,57,1.0)";
		if (variedadeInside === "Mungo Verde") return "#82202B";
		if (variedadeInside === "Caupi") return "#3F4B7D";
		return "rgba(245,245,245,0.6)"; // branco translúcido original
	};

	// Linha (borda) original: usa fillColorParce se existir; senão branco
	const handleLineColor = (dataParcela) => {
		if (!dataParcela) return "white";
		return dataParcela?.fillColorParce || "white";
	};

	// Região inicial baseada nas coords da fazenda
	useEffect(() => {
		if (mapPlotData.length > 0 && farmName && data?.ciclo != null) {
			const dataFromMap = newMapArr(mapPlotData);

			const filteredFarm = dataFromMap
				.filter((p) => Number(data?.ciclo) === Number(p.ciclo))
				.filter(
					(p) =>
						p.farmName ==
						farmName.replace("Fazenda", "Projeto").replace("Cacique", "Cacíque")
				);

			if (filteredFarm.length === 0) {
				Alert.alert(
					"Problema para plotar o mapa",
					"Não existem talhões ativos na consulta.",
					[{ text: "OK", onPress: () => navigation.goBack() }],
					{ cancelable: false }
				);
				return;
			}

			const onlyCoords = filteredFarm.map((p) => p.coords);

			const getRegionForCoordinates = (coordinates) => {
				let minLat, maxLat, minLng, maxLng;

				coordinates.forEach((subArray) => {
					subArray.forEach((coord) => {
						const { latitude, longitude } = coord;
						minLat = minLat !== undefined ? Math.min(minLat, latitude) : latitude;
						maxLat = maxLat !== undefined ? Math.max(maxLat, latitude) : latitude;
						minLng = minLng !== undefined ? Math.min(minLng, longitude) : longitude;
						maxLng = maxLng !== undefined ? Math.max(maxLng, longitude) : longitude;
					});
				});

				const latitudeDelta = (maxLat - minLat) * 1.2;
				const longitudeDelta = (maxLng - minLng) * 1.2;

				return {
					latitude: (maxLat + minLat) / 2,
					longitude: (maxLng + minLng) / 2,
					latitudeDelta,
					longitudeDelta,
				};
			};

			const region = getRegionForCoordinates(onlyCoords);
			setmapCoordsInit(region);
			setfilteredFarmArr(filteredFarm);
		}
	}, [farmName, data, mapPlotData, navigation]);

	// Operação
	useEffect(() => {
		if (!data) return;
		const onlyOp = data.prods?.find((prod) => prod.type === "Operação");
		setGetOperationAp(onlyOp ? onlyOp.product : "Sem Operação");
	}, [data]);

	// Farm name
	useEffect(() => {
		setFarmName(data?.farmName);
		// se veio seleção, você pode optar por ligar foco por padrão
		if ((selectedParcelas?.length ?? 0) > 0) setFocusSelected(true);
	}, [data, selectedParcelas]);

	// Permissão localização
	useEffect(() => {
		const getLocationPermission = async () => {
			const { status } = await Location.getForegroundPermissionsAsync();

			if (status === "denied") {
				Alert.alert(
					"Location Permission Required",
					"Location permission is denied. Would you like to open the app settings to enable location access?",
					[
						{ text: "Cancel", style: "cancel" },
						{ text: "Open Settings", onPress: () => Linking.openSettings() },
					],
					{ cancelable: true }
				);
				return;
			}

			if (status !== "granted") {
				let req = await Location.requestForegroundPermissionsAsync();
				if (req.status !== "granted") {
					setErrorMsg("Permission to access location was denied");
					return;
				}
			}

			const loc = await Location.getCurrentPositionAsync({});
			setLocation(loc);
		};

		getLocationPermission();
	}, []);

	const handleSetLocation = () => {
		if (!location) return;

		mapRef.current?.animateToRegion({
			latitude: location.coords.latitude,
			longitude: location.coords.longitude,
			latitudeDelta: 0.0922,
			longitudeDelta: 0.0421,
		});
	};

	const handleCloseSheet = () => setIsPressed(null);

	if (!data) return <Text>Loading..</Text>;
	if (filteredFarmArr.length === 0) return <Text>Loading..</Text>;
	if (mapCoordsInit.latitude === null) return <Text>Loading..</Text>;

	// Totais para Legend: se foco ligado e há seleção, usa totalsSelected; senão, usa data
	const legendAplicado =
		focusSelected && selectedParcelas.length > 0 ? totalsSelected.aplicado : (data?.areaAplicada || 0);

	const legendSolicitado =
		focusSelected && selectedParcelas.length > 0 ? totalsSelected.total : (data?.areaSolicitada || 0);

	return (
		<View style={styles.container}>
			<MapView
				onRegionChangeComplete={() => { }}
				provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
				ref={mapRef}
				showsUserLocation={true}
				style={styles.map}
				initialRegion={{
					latitude: mapCoordsInit.latitude,
					longitude: mapCoordsInit.longitude,
					latitudeDelta: mapCoordsInit.latitudeDelta,
					longitudeDelta: mapCoordsInit.longitudeDelta,
				}}
				mapType="satellite"
			>
				{filteredFarmArr.map((coordArr, i) => {
					const talhaoKey = String(coordArr.talhao || "").trim();

					// parcela correspondente no “data.parcelas” (pra cultura/variedade/área)
					const canPress = (data?.parcelas || []).find(
						(parc) =>
							String(parc.parcela || "").split(" ").join("") ===
							talhaoKey.split(" ").join("")
					);

					const isSelected = selectedSet.has(talhaoKey);

					// Cor original (como antes)
					const cultura = canPress?.cultura || "";
					const variedade = canPress?.variedade || "";
					const originalFill = getColor(cultura, variedade, canPress?.fillColorParce || "green");
					const originalStroke = handleLineColor(canPress);

					// Branco translúcido “como antes”
					const whiteMutedFill = "rgba(245,245,245,0.6)";
					const whiteMutedStroke = "rgba(245,245,245,0.6)";

					// Efeito foco:
					// - focusSelected OFF: sempre originalFill/originalStroke
					// - focusSelected ON: se selecionado -> original, senão -> branco translúcido
					const fillColor =
						focusSelected && selectedParcelas.length > 0
							? (isSelected ? originalFill : whiteMutedFill)
							: originalFill;

					const strokeColor =
						focusSelected && selectedParcelas.length > 0
							? (isSelected ? originalStroke : whiteMutedStroke)
							: originalStroke;

					const isPressedHere = isPressed && isPressed === canPress?.parcela ? 1 : 0.6;

					return (
						<View key={i}>
							<Polygon
								coordinates={coordArr.coords}
								fillColor={fillColor.replace(/rgba\(([^)]+),\s*([0-9.]+)\)/, (m, rgb, a) => {
									// mantém a lógica antiga de “pressionado” ajustando alpha quando aplicável
									// se for rgba(...) mantemos alpha; se não for rgba, retorna como está
									return `rgba(${rgb},${isPressedHere})`;
								})}
								strokeColor={strokeColor}
								strokeWidth={2}
								tappable={true}
								onPress={() => {
									if (canPress) {
										setIsPressed(coordArr.talhao);

										const parcela = (data.parcelas || []).find((p) => p.parcela === coordArr.talhao);

										const objToAdd = {
											talhao: coordArr.talhao,
											prods: (data.prods || []).filter((p) => p.type !== "Operação"),
											area: parcela?.areaSolicitada,
											cultura: data.cultura,
											farmName: data.farmName,
										};

										setPropsToBottom(objToAdd);
										refRBSheet.current?.open();
										Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
									}
								}}
							/>

							<Marker
								key={i + "m"}
								hideCallout={true}
								showCallout={true}
								tracksViewChanges={false}
								coordinate={{
									latitude: coordArr.talhaoCenterGeo.lat,
									longitude: coordArr.talhaoCenterGeo.lng,
								}}
							>
								<Text>{coordArr.talhao}</Text>
							</Marker>
						</View>
					);
				})}
			</MapView>

			{/* Botões flutuantes (direita inferior) */}
			{!isPressed && (
				<View style={styles.fabRight}>
					{/* Foco: só aparece se veio seleção */}
					{selectedParcelas.length > 0 && (
						<IconButton
							type="awesome"
							icon={focusSelected ? "eye" : "eye-slash"}
							color={focusSelected ? Colors.primary[200] : "rgba(80,80,80,0.8)"}
							size={22}
							onPress={() => {
								Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
								setFocusSelected(v => !v);
							}}
							btnStyles={{
								backgroundColor: focusSelected
									? "rgba(13,110,253,0.18)"   // azul translúcido
									: "rgba(255,255,255,0.85)",
								borderRadius: 50,
								justifyContent: "center",
								alignItems: "center",
								height: 50,
								width: 50,
								borderWidth: focusSelected ? 1.5 : 0,
								borderColor: focusSelected ? Colors.primary[300] : "transparent",
								shadowColor: focusSelected ? Colors.primary[600] : "#000",
								shadowOpacity: focusSelected ? 0.35 : 0.15,
								shadowRadius: 6,
								elevation: focusSelected ? 6 : 2,
							}}
						/>

					)}

					<IconButton
						type={"paper"}
						icon="target-account"
						color={"grey"}
						size={28}
						onPress={handleSetLocation}
						btnStyles={styles.fabBtn}
					/>
				</View>
			)}

			{/* Back */}
			<View style={styles.fabLeftTop}>
				<IconButton
					type={""}
					icon="arrow-back-outline"
					color={"grey"}
					size={22}
					onPress={() => navigation.navigate("HomeStackScreen")}
					btnStyles={styles.fabBtn}
				/>
			</View>

			{/* Legend (usa totals da seleção quando foco ON) */}
			<View style={styles.legendWrap}>
				<Legend aplicado={legendAplicado} solicitado={legendSolicitado} />
			</View>

			{/* Header card */}
			<View style={styles.headerCard}>
				<View style={{ flexDirection: "column", alignItems: "center" }}>
					<Text style={{ fontWeight: "bold" }}>
						{String(data.code || "").replace(/([A-Za-z]+)(\d+)/, "$1 $2")}
					</Text>
					<Text>{getOperationAp ? " " + getOperationAp : ""}</Text>
				</View>
			</View>

			<BottomSheetApp
				refRBSheet={refRBSheet}
				data={propsToBottom}
				handleCloseSheet={handleCloseSheet}
			/>
		</View>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1 },
	map: { flex: 1, width: "100%", height: "100%" },

	fabBtn: {
		backgroundColor: "rgba(255,255,255,0.9)",
		borderRadius: 50,
		justifyContent: "center",
		alignItems: "center",
		height: 50,
		width: 50,
	},

	fabRight: {
		position: "absolute",
		bottom: "10%",
		left: "80%",
		zIndex: 10,
	},

	fabLeftTop: {
		position: "absolute",
		top: "8%",
		right: "84%",
		zIndex: 10,
	},

	legendWrap: {
		position: "absolute",
		bottom: "8%",
		right: "84%",
		borderRadius: 50,
	},

	headerCard: {
		width: 240,
		height: 40,
		backgroundColor: "rgba(255,255,255,0.8)",
		position: "absolute",
		top: "9.5%",
		right: "5%",
		zIndex: 10,
		borderRadius: 12,
		justifyContent: "center",
		alignItems: "center",
	},
});

export default MapScreen;
