// screens/navigation/NavigationMapScreen.jsx

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	Platform,
	ScrollView,
	ActivityIndicator,
	Alert,
	Linking,
} from "react-native";

import MapView, { Polygon, Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { useDispatch, useSelector } from "react-redux";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";

import Ionicons from "@expo/vector-icons/Ionicons";
import { Colors } from "../../constants/styles";

import { fetchNavigationMapData, geralActions } from "../../store/redux/geral";
import {
	selectNavigationMapData,
	selectNavigationMapStatus,
	selectNavigationMapError,
	selectNavigationMapFilters,
	selectNavigationMapSelectedParcels,
} from "../../store/redux/selector";

const FALLBACK_SAFRA_OPTIONS = ["2024/2025", "2025/2026", "2026/2027"];
const FALLBACK_CICLO_OPTIONS = ["1", "2", "3"];

const DEFAULT_REGION = {
	latitude: -10.85,
	longitude: -49.85,
	latitudeDelta: 0.25,
	longitudeDelta: 0.25,
};

const formatHa = (value) => {
	if (value === null || value === undefined || Number.isNaN(Number(value))) {
		return "—";
	}

	return `${Number(value).toLocaleString("pt-BR", {
		minimumFractionDigits: 0,
		maximumFractionDigits: 2,
	})} ha`;
};

const formatNumber = (value, digits = 2) => {
	if (value === null || value === undefined || Number.isNaN(Number(value))) {
		return "—";
	}

	return Number(value).toLocaleString("pt-BR", {
		minimumFractionDigits: 0,
		maximumFractionDigits: digits,
	});
};

const normalizeProjectName = (name) => {
	if (!name) return "Projeto";
	return String(name).replace("Projeto ", "");
};

const normalizeNumber = (value) => {
	if (value === null || value === undefined || value === "") return null;

	const parsed = Number(String(value).replace(",", "."));

	if (Number.isNaN(parsed)) return null;

	return parsed;
};

const normalizeLongitude = (value) => {
	const lng = normalizeNumber(value);

	if (lng === null) return null;

	if (lng > 0) return lng * -1;

	return lng;
};

const normalizeCoordinate = (point) => {
	if (!point) return null;

	const latitude =
		normalizeNumber(point.latitude) ??
		normalizeNumber(point.lat) ??
		normalizeNumber(point[0]);

	const longitude =
		normalizeLongitude(point.longitude) ??
		normalizeLongitude(point.lng) ??
		normalizeLongitude(point[1]);

	if (latitude === null || longitude === null) return null;

	return {
		latitude,
		longitude,
	};
};

const getItemMapCenter = (item) => {
	return item?.map?.center || item?.map_centro_id || null;
};

const getItemProjectCenter = (item) => {
	return item?.map?.projeto_center || item?.map?.center || null;
};

const getPolygonCoordinates = (item) => {
	const points = item?.map?.geo_points || item?.map_geo_points || [];

	if (!Array.isArray(points)) return [];

	return points
		.map((point) => normalizeCoordinate(point))
		.filter(Boolean);
};

const getCenterCoordinate = (item) => {
	const center = getItemMapCenter(item) || getItemProjectCenter(item);
	return normalizeCoordinate(center);
};

const getCoordinatesCenter = (coordinates = []) => {
	if (!coordinates.length) return null;

	const total = coordinates.reduce(
		(acc, coord) => {
			acc.latitude += coord.latitude;
			acc.longitude += coord.longitude;
			return acc;
		},
		{ latitude: 0, longitude: 0 }
	);

	return {
		latitude: total.latitude / coordinates.length,
		longitude: total.longitude / coordinates.length,
	};
};

const hexToRgba = (hex, opacity = 0.55) => {
	if (!hex || typeof hex !== "string") {
		return `rgba(34,197,94,${opacity})`;
	}

	let cleaned = hex.replace("#", "");

	if (cleaned.length === 3) {
		cleaned = cleaned
			.split("")
			.map((char) => char + char)
			.join("");
	}

	if (cleaned.length !== 6) {
		return `rgba(34,197,94,${opacity})`;
	}

	const r = parseInt(cleaned.slice(0, 2), 16);
	const g = parseInt(cleaned.slice(2, 4), 16);
	const b = parseInt(cleaned.slice(4, 6), 16);

	if ([r, g, b].some((value) => Number.isNaN(value))) {
		return `rgba(34,197,94,${opacity})`;
	}

	return `rgba(${r},${g},${b},${opacity})`;
};

const getCultureText = (item) => {
	const cultura = item?.cultura;
	const variedade = item?.variedade || item?.variedade_nome;

	if (!cultura && !variedade) return null;

	if (cultura && variedade) return `${cultura} · ${variedade}`;

	return cultura || variedade;
};

const getPolygonVisual = ({ item, isSelected, isDimmed }) => {
	const fillColor = item?.map?.fill_color || "#22C55E";
	const lineColor = item?.map?.line_color || "#14532D";

	if (isSelected) {
		return {
			fillColor: "rgba(37,99,235,0.62)",
			strokeColor: "#1D4ED8",
			strokeWidth: 3,
		};
	}

	if (isDimmed) {
		return {
			fillColor: "rgba(255,255,255,0.22)",
			strokeColor: "rgba(71,85,105,0.55)",
			strokeWidth: 1,
		};
	}

	if (item?.status === "sem_planejamento") {
		return {
			fillColor: "rgba(255,255,255,0.45)",
			strokeColor: "rgba(100,116,139,0.75)",
			strokeWidth: 1,
		};
	}

	if (item?.status === "em_plantio") {
		return {
			fillColor: "rgba(250,204,21,0.55)",
			strokeColor: "#A16207",
			strokeWidth: 2,
		};
	}

	if (item?.status === "colhido") {
		return {
			fillColor: "rgba(161,98,7,0.48)",
			strokeColor: "#854D0E",
			strokeWidth: 2,
		};
	}

	return {
		fillColor: hexToRgba(fillColor, item?.status === "planejado" ? 0.36 : 0.52),
		strokeColor: lineColor,
		strokeWidth: 1.5,
	};
};

const MapParcelLabel = memo(function MapParcelLabel({
	parcela,
	area,
	cultureText,
	statusLabel,
	isSelected,
	showDetails,
}) {
	return (
		<View
			collapsable={false}
			style={[styles.labelWrap, isSelected && styles.labelWrapSelected]}
		>
			<Text
				style={[styles.labelTitle, isSelected && styles.labelTitleSelected]}
				numberOfLines={1}
			>
				{parcela}
			</Text>

			<Text
				style={[
					styles.labelSubtitle,
					isSelected && styles.labelSubtitleSelected,
					showDetails ? styles.labelSubtitleVisible : styles.labelSubtitleHidden,
				]}
				numberOfLines={1}
			>
				{formatHa(area)}
			</Text>

			{!!cultureText && (
				<Text
					style={[
						styles.labelCulture,
						isSelected && styles.labelSubtitleSelected,
						showDetails ? styles.labelCultureVisible : styles.labelCultureHidden,
					]}
					numberOfLines={1}
				>
					{cultureText}
				</Text>
			)}

			{!!statusLabel && isSelected && (
				<Text style={styles.labelStatus} numberOfLines={1}>
					{statusLabel}
				</Text>
			)}
		</View>
	);
});

const ParcelInfoCard = ({ item, onClose, onSelect, isSelected }) => {
	if (!item) return null;

	return (
		<View style={styles.infoCard}>
			<View style={styles.infoHeader}>
				<View style={styles.infoTitleBox}>
					<Text style={styles.infoTitle}>Parcela {item.parcela || "—"}</Text>
					<Text style={styles.infoSubtitle} numberOfLines={1}>
						{item.projeto || "Projeto não informado"}
					</Text>
				</View>

				<TouchableOpacity activeOpacity={0.82} onPress={onClose} style={styles.infoClose}>
					<Ionicons name="close" size={18} color="#0F172A" />
				</TouchableOpacity>
			</View>

			<View style={styles.infoGrid}>
				<View style={styles.infoMetric}>
					<Text style={styles.infoMetricLabel}>Área</Text>
					<Text style={styles.infoMetricValue}>{formatHa(item.area)}</Text>
				</View>

				<View style={styles.infoMetric}>
					<Text style={styles.infoMetricLabel}>Status</Text>
					<Text style={styles.infoMetricValue}>{item.status_label || item.status || "—"}</Text>
				</View>

				<View style={styles.infoMetric}>
					<Text style={styles.infoMetricLabel}>Cultura</Text>
					<Text style={styles.infoMetricValue}>{item.cultura || "—"}</Text>
				</View>

				<View style={styles.infoMetric}>
					<Text style={styles.infoMetricLabel}>Variedade</Text>
					<Text style={styles.infoMetricValue}>{item.variedade || item.variedade_nome || "—"}</Text>
				</View>
			</View>

			<View style={styles.infoRows}>
				<Text style={styles.infoRowText}>
					Plantio: {item.data_plantio || item.data_prevista_plantio || "—"}
				</Text>
				<Text style={styles.infoRowText}>
					Colheita prevista: {item.data_prevista_colheita || "—"}
				</Text>
				<Text style={styles.infoRowText}>
					Peso: {formatNumber(item.peso_scs, 2)} scs · {formatNumber(item.peso_kg, 2)} kg
				</Text>
				<Text style={styles.infoRowText}>
					Produtividade: {formatNumber(item.produtividade, 2)}
				</Text>
			</View>

			<TouchableOpacity
				activeOpacity={0.86}
				onPress={onSelect}
				style={[styles.infoSelectButton, isSelected && styles.infoSelectButtonActive]}
			>
				<Ionicons
					name={isSelected ? "checkmark-circle" : "add-circle-outline"}
					size={18}
					color="#FFFFFF"
				/>
				<Text style={styles.infoSelectButtonText}>
					{isSelected ? "Selecionada" : "Selecionar parcela"}
				</Text>
			</TouchableOpacity>
		</View>
	);
};

const NavigationMapScreen = ({ navigation, route }) => {
	const dispatch = useDispatch();
	const mapRef = useRef(null);

	const {
		farmName,
		projectName,
		selectedFarm: selectedFarmParam,
		selectedProject: selectedProjectParam,
		safra,
		ciclo,
	} = route.params || {};

	const navigationMapDataRaw = useSelector(selectNavigationMapData);
	const navigationMapStatus = useSelector(selectNavigationMapStatus);
	const navigationMapError = useSelector(selectNavigationMapError);
	const navigationMapFilters = useSelector(selectNavigationMapFilters);
	const selectedParcelsRaw = useSelector(selectNavigationMapSelectedParcels);
	const navigationMapByKey = useSelector((state) => state.geral.navigationMapByKey);

	const navigationMapData = Array.isArray(navigationMapDataRaw)
		? navigationMapDataRaw
		: [];

	const selectedParcels = Array.isArray(selectedParcelsRaw)
		? selectedParcelsRaw
		: [];

	const [selectedSafra, setSelectedSafra] = useState(safra || "2026/2027");
	const [selectedCiclo, setSelectedCiclo] = useState(ciclo || "1");
	const [filtersVisible, setFiltersVisible] = useState(false);
	const [selectedStatus, setSelectedStatus] = useState([]);
	const [selectedCulture, setSelectedCulture] = useState([]);
	const [selectedProjectLocal, setSelectedProjectLocal] = useState(
		selectedProjectParam || null
	);

	const [currentRegion, setCurrentRegion] = useState(null);
	const [trackMarkers, setTrackMarkers] = useState(true);
	const [mapReady, setMapReady] = useState(false);

	const [userLocation, setUserLocation] = useState(null);
	const [followUser, setFollowUser] = useState(false);
	const [infoMode, setInfoMode] = useState(false);
	const [infoParcel, setInfoParcel] = useState(null);
	const [sheetExpanded, setSheetExpanded] = useState(false);

	const resolvedFarmName =
		selectedProjectLocal ||
		projectName ||
		farmName ||
		selectedProjectParam ||
		selectedFarmParam ||
		"Mapa";

	const refreshMarkers = useCallback(() => {
		setTrackMarkers(true);

		setTimeout(() => {
			setTrackMarkers(false);
		}, 700);
	}, []);

	useEffect(() => {
		if (!mapReady) return;
		refreshMarkers();
	}, [mapReady, selectedParcels.length, selectedStatus, selectedCulture, selectedProjectLocal, refreshMarkers]);

	const showDetailedLabels = useMemo(() => {
		return (currentRegion?.latitudeDelta ?? 999) < 0.08;
	}, [currentRegion]);

	const showBasicLabels = useMemo(() => {
		return (currentRegion?.latitudeDelta ?? 999) < 0.22;
	}, [currentRegion]);

	useEffect(() => {
		const loadLocation = async () => {
			try {
				const currentPermission = await Location.getForegroundPermissionsAsync();

				if (currentPermission.status === "denied") {
					Alert.alert(
						"Permissão de localização",
						"A localização está desativada para este app. Ative nas configurações para acompanhar sua posição no mapa.",
						[
							{ text: "Cancelar", style: "cancel" },
							{ text: "Abrir ajustes", onPress: () => Linking.openSettings() },
						]
					);
					return;
				}

				let finalPermission = currentPermission;

				if (currentPermission.status !== "granted") {
					finalPermission = await Location.requestForegroundPermissionsAsync();
				}

				if (finalPermission.status !== "granted") return;

				const loc = await Location.getCurrentPositionAsync({
					accuracy: Location.Accuracy.Balanced,
				});

				setUserLocation(loc);
			} catch (error) {
				console.log("Erro ao buscar localização:", error);
			}
		};

		loadLocation();
	}, []);

	const safraOptions = useMemo(() => {
		const fromFilters = Array.isArray(navigationMapFilters?.safras)
			? navigationMapFilters.safras
			: [];

		const fromCurrentData = navigationMapData
			.map((item) => item?.safra)
			.filter(Boolean);

		const fromCache = Object.values(navigationMapByKey || {})
			.map((item) => item?.safra)
			.filter(Boolean);

		return [...new Set([...FALLBACK_SAFRA_OPTIONS, ...fromFilters, ...fromCurrentData, ...fromCache])]
			.sort((a, b) => String(a).localeCompare(String(b)));
	}, [navigationMapFilters, navigationMapData, navigationMapByKey]);

	const cicloOptions = useMemo(() => {
		const normalizeCiclo = (value) => {
			if (value === null || value === undefined || value === "") return null;

			const parsed = Number(String(value).trim());

			if (Number.isNaN(parsed)) return String(value).trim();

			return String(parsed);
		};

		const fromFilters = Array.isArray(navigationMapFilters?.ciclos)
			? navigationMapFilters.ciclos
			: [];

		const fromCurrentData = navigationMapData
			.map((item) => normalizeCiclo(item?.ciclo))
			.filter(Boolean);

		const fromCache = Object.values(navigationMapByKey || {})
			.map((item) => normalizeCiclo(item?.ciclo))
			.filter(Boolean);

		return [
			...new Set(
				[...FALLBACK_CICLO_OPTIONS, ...fromFilters, ...fromCurrentData, ...fromCache]
					.map(normalizeCiclo)
					.filter(Boolean)
			),
		].sort((a, b) => Number(a) - Number(b));
	}, [navigationMapFilters, navigationMapData, navigationMapByKey]);

	const statusOptions = useMemo(() => {
		if (navigationMapFilters?.statuses?.length > 0) {
			return navigationMapFilters.statuses;
		}

		return [
			{ key: "sem_planejamento", label: "Sem planejamento" },
			{ key: "planejado", label: "Planejado" },
			{ key: "em_plantio", label: "Em plantio" },
			{ key: "plantado", label: "Plantado" },
			{ key: "colhido", label: "Colhido" },
		];
	}, [navigationMapFilters]);

	const cultureOptions = useMemo(() => {
		const fromApi = navigationMapFilters?.culturas;

		if (Array.isArray(fromApi) && fromApi.length > 0) {
			return fromApi;
		}

		return [
			...new Set(
				navigationMapData
					.map((item) => item?.cultura)
					.filter(Boolean)
			),
		].sort((a, b) => String(a).localeCompare(String(b)));
	}, [navigationMapFilters, navigationMapData]);

	useEffect(() => {
		dispatch(
			geralActions.setNavigationMapCurrentFilter({
				safra: selectedSafra,
				ciclo: selectedCiclo,
			})
		);

		dispatch(fetchNavigationMapData({ safra: selectedSafra, ciclo: selectedCiclo }));
	}, [dispatch, selectedSafra, selectedCiclo]);

	const mapData = useMemo(() => {
		let data = [...navigationMapData];

		if (selectedFarmParam) {
			data = data.filter((item) => item.fazenda_grupo === selectedFarmParam);
		}

		if (selectedProjectLocal) {
			data = data.filter((item) => item.projeto === selectedProjectLocal);
		}

		if (selectedStatus.length > 0) {
			data = data.filter((item) => selectedStatus.includes(item.status));
		}

		if (selectedCulture.length > 0) {
			data = data.filter((item) => selectedCulture.includes(item.cultura));
		}

		return data;
	}, [
		navigationMapData,
		selectedFarmParam,
		selectedProjectLocal,
		selectedStatus,
		selectedCulture,
	]);

	const polygonsData = useMemo(() => {
		return mapData
			.map((item) => {
				const coordinates = getPolygonCoordinates(item);
				const parcelId = item?.id_farmbox || item?.id;
				const center =
					getCenterCoordinate(item) || getCoordinatesCenter(coordinates);

				return {
					item,
					parcelId,
					coordinates,
					center,
				};
			})
			.filter((polygon) => polygon.coordinates.length >= 3);
	}, [mapData]);

	const allCoordinates = useMemo(() => {
		return polygonsData.flatMap((polygon) => polygon.coordinates);
	}, [polygonsData]);

	const initialRegion = useMemo(() => {
		const firstCenter = polygonsData.find((polygon) => polygon.center)?.center;

		if (firstCenter) {
			return {
				latitude: firstCenter.latitude,
				longitude: firstCenter.longitude,
				latitudeDelta: 0.08,
				longitudeDelta: 0.08,
			};
		}

		const firstCoordinate = allCoordinates?.[0];

		if (firstCoordinate) {
			return {
				latitude: firstCoordinate.latitude,
				longitude: firstCoordinate.longitude,
				latitudeDelta: 0.08,
				longitudeDelta: 0.08,
			};
		}

		return DEFAULT_REGION;
	}, [polygonsData, allCoordinates]);

	useEffect(() => {
		if (!mapRef.current || allCoordinates.length === 0) return;

		const timer = setTimeout(() => {
			try {
				mapRef.current.fitToCoordinates(allCoordinates, {
					edgePadding: {
						top: 120,
						right: 40,
						bottom: 250,
						left: 40,
					},
					animated: true,
				});
			} catch (error) {
				console.log("Erro ao centralizar mapa:", error);
			}
		}, 450);

		return () => clearTimeout(timer);
	}, [allCoordinates]);

	const totalArea = useMemo(() => {
		return mapData.reduce((total, item) => total + Number(item?.area || 0), 0);
	}, [mapData]);

	const selectedData = useMemo(() => {
		return mapData.filter((item) => {
			const id = item?.id_farmbox || item?.id;
			return selectedParcels.includes(id);
		});
	}, [mapData, selectedParcels]);

	const selectedAreaTotal = useMemo(() => {
		return selectedData.reduce((total, item) => total + Number(item?.area || 0), 0);
	}, [selectedData]);

	const projects = useMemo(() => {
		const grouped = {};

		navigationMapData
			.filter((item) => {
				if (selectedFarmParam) {
					return item.fazenda_grupo === selectedFarmParam;
				}

				return true;
			})
			.forEach((item) => {
				const project = item?.projeto || "Sem projeto";

				if (!grouped[project]) {
					grouped[project] = {
						projeto_nome: project,
						projeto_id: item?.projeto_id || project,
						id_farmbox: item?.projeto_id_farmbox || null,
						map_centro_id: getItemProjectCenter(item),
						map_zoom: item?.map?.projeto_zoom || null,
						area_produtiva: 0,
						total_parcelas: 0,
					};
				}

				grouped[project].area_produtiva += Number(item?.area || 0);
				grouped[project].total_parcelas += 1;
			});

		return Object.values(grouped).sort((a, b) =>
			String(a.projeto_nome).localeCompare(String(b.projeto_nome))
		);
	}, [navigationMapData, selectedFarmParam]);

	const isLoading = navigationMapStatus === "pending";
	const hasMapData = polygonsData.length > 0;
	const hasAnyFilter =
		selectedStatus.length > 0 ||
		selectedCulture.length > 0 ||
		!!selectedProjectLocal;

	const handleToggleStatus = (statusKey) => {
		setSelectedStatus((current) => {
			if (current.includes(statusKey)) {
				return current.filter((item) => item !== statusKey);
			}

			return [...current, statusKey];
		});
	};

	const handleToggleCulture = (culture) => {
		setSelectedCulture((current) => {
			if (current.includes(culture)) {
				return current.filter((item) => item !== culture);
			}

			return [...current, culture];
		});
	};

	const handleToggleProject = (projectNameValue) => {
		setSelectedProjectLocal((current) => {
			if (current === projectNameValue) return null;
			return projectNameValue;
		});

		setInfoParcel(null);
		dispatch(geralActions.clearNavigationMapSelectedParcels());
	};

	const handleToggleParcel = (item) => {
		const parcelId = item?.id_farmbox || item?.id;
		if (!parcelId) return;

		dispatch(geralActions.toggleNavigationMapSelectedParcel(parcelId));
	};

	const handlePolygonPress = (item) => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

		if (infoMode) {
			setInfoParcel(item);
			return;
		}

		handleToggleParcel(item);
	};

	const handleClearFilters = () => {
		setSelectedStatus([]);
		setSelectedCulture([]);
		setSelectedProjectLocal(null);
		setInfoParcel(null);
		dispatch(geralActions.clearNavigationMapSelectedParcels());
	};

	const handleCenterUser = async () => {
		try {
			let loc = userLocation;

			if (!loc) {
				const permission = await Location.requestForegroundPermissionsAsync();

				if (permission.status !== "granted") {
					Alert.alert(
						"Localização",
						"Permita o acesso à localização para acompanhar sua posição no mapa."
					);
					return;
				}

				loc = await Location.getCurrentPositionAsync({
					accuracy: Location.Accuracy.High,
				});

				setUserLocation(loc);
			}

			setFollowUser(true);

			mapRef.current?.animateToRegion(
				{
					latitude: loc.coords.latitude,
					longitude: loc.coords.longitude,
					latitudeDelta: 0.015,
					longitudeDelta: 0.015,
				},
				650
			);
		} catch (error) {
			console.log("Erro ao centralizar localização:", error);
		}
	};

	const handleToggleInfoMode = () => {
		setInfoMode((current) => {
			const next = !current;
			if (!next) setInfoParcel(null);
			return next;
		});
	};



	const hasSelectedArea = selectedParcels.length > 0 && Number(selectedAreaTotal || 0) > 0;

	const floatingBottom = sheetExpanded
		? Platform.OS === "ios"
			? 330
			: 310
		: Platform.OS === "ios"
			? 104
			: 92;

	const infoCardBottom = sheetExpanded
		? Platform.OS === "ios"
			? 330
			: 310
		: Platform.OS === "ios"
			? 104
			: 92;

	return (
		<View style={styles.container}>
			<MapView
				ref={mapRef}
				style={styles.map}
				provider={Platform.OS === "android" ? PROVIDER_GOOGLE : PROVIDER_GOOGLE}
				initialRegion={initialRegion}
				mapType="satellite"
				showsUserLocation={followUser}
				showsMyLocationButton={false}
				showsCompass
				toolbarEnabled={false}
				followsUserLocation={followUser}
				onMapReady={() => {
					setMapReady(true);
					refreshMarkers();
				}}
				onRegionChangeComplete={(region) => {
					setCurrentRegion(region);
					if (followUser) setFollowUser(false);
				}}
			>
				{polygonsData.map(({ item, parcelId, coordinates }) => {
					const isSelected = selectedParcels.includes(parcelId);
					const isDimmed = selectedParcels.length > 0 && !isSelected && !infoMode;
					const visual = getPolygonVisual({ item, isSelected, isDimmed });

					return (
						<Polygon
							key={`polygon-${item.id || "id"}-${item.id_farmbox || "fb"}-${item.projeto_id || item.projeto || "proj"}-${item.parcela || "parcela"}-${item.safra || "safra"}-${item.ciclo || "ciclo"}`}
							coordinates={coordinates}
							tappable
							onPress={() => handlePolygonPress(item)}
							fillColor={visual.fillColor}
							strokeColor={visual.strokeColor}
							strokeWidth={visual.strokeWidth}
						/>
					);
				})}

				{showBasicLabels &&
					polygonsData.slice(0, 250).map(({ item, parcelId, center }) => {
						if (!center) return null;

						const isSelected = selectedParcels.includes(parcelId);
						const cultureText = getCultureText(item);
						const shouldShowDetails = showDetailedLabels || isSelected || infoMode;

						return (
							<Marker
								key={`label-${item.id || "id"}-${item.id_farmbox || "fb"}-${item.projeto_id || item.projeto || "proj"}-${item.parcela || "parcela"}-${item.safra || "safra"}-${item.ciclo || "ciclo"}`}
								hideCallout
								tracksViewChanges={trackMarkers}
								coordinate={center}
								anchor={{ x: 0.5, y: 0.5 }}
							>
								<MapParcelLabel
									parcela={item.parcela}
									area={item.area}
									cultureText={cultureText}
									statusLabel={item.status_label}
									isSelected={isSelected}
									showDetails={shouldShowDetails}
								/>
							</Marker>
						);
					})}
			</MapView>

			{!hasMapData && (
				<View style={styles.emptyMapOverlay}>
					<Ionicons name="map-outline" size={34} color={Colors.primary[700]} />
					<Text style={styles.emptyMapTitle}>Sem polígonos para exibir</Text>
					<Text style={styles.emptyMapText}>
						Verifique a fazenda, safra, ciclo ou filtros aplicados.
					</Text>
				</View>
			)}

			<View style={styles.topBar}>
				<TouchableOpacity
					activeOpacity={0.82}
					style={styles.backButton}
					onPress={() => navigation.goBack()}
				>
					<Ionicons name="chevron-back" size={24} color="#FFFFFF" />
				</TouchableOpacity>

				<View style={styles.titleBox}>
					<Text style={styles.title} numberOfLines={1}>
						{resolvedFarmName}
					</Text>

					<Text style={styles.subtitle} numberOfLines={1}>
						{projects.length} {projects.length === 1 ? "projeto" : "projetos"} ·{" "}
						{mapData.length} parcelas · {formatHa(totalArea)}
					</Text>
				</View>

				<TouchableOpacity
					activeOpacity={0.82}
					style={[
						styles.filterButton,
						filtersVisible && styles.filterButtonActive,
					]}
					onPress={() => setFiltersVisible((current) => !current)}
				>
					<Ionicons
						name="options-outline"
						size={22}
						color={filtersVisible ? "#07130C" : "#FFFFFF"}
					/>
				</TouchableOpacity>
			</View>

			<View style={[styles.fabColumn, { bottom: floatingBottom }]}>
				<TouchableOpacity
					activeOpacity={0.86}
					style={[styles.fabButton, followUser && styles.fabButtonActive]}
					onPress={handleCenterUser}
				>
					<Ionicons
						name="person"
						size={22}
						color={followUser ? "#07130C" : "#334155"}
					/>
				</TouchableOpacity>

				<TouchableOpacity
					activeOpacity={0.86}
					style={[styles.fabButton, infoMode && styles.fabButtonActive]}
					onPress={handleToggleInfoMode}
				>
					<Ionicons
						name="information"
						size={24}
						color={infoMode ? "#07130C" : "#334155"}
					/>
				</TouchableOpacity>
			</View>

			{isLoading && (
				<View style={styles.loadingFloating}>
					<ActivityIndicator size="small" color={Colors.primary[700]} />
					<Text style={styles.loadingFloatingText}>Atualizando...</Text>
				</View>
			)}

			{navigationMapError && (
				<View style={styles.errorFloating}>
					<Text style={styles.errorText}>{navigationMapError}</Text>
				</View>
			)}

			{filtersVisible && (
				<View style={styles.filtersPanel}>
					<View style={styles.filterPanelHeader}>
						<Text style={styles.filterPanelTitle}>Filtros do mapa</Text>

						{hasAnyFilter && (
							<TouchableOpacity activeOpacity={0.82} onPress={handleClearFilters}>
								<Text style={styles.clearFiltersText}>Limpar</Text>
							</TouchableOpacity>
						)}
					</View>

					<View style={styles.filterSection}>
						<Text style={styles.filterLabel}>Safra</Text>

						<ScrollView
							horizontal
							showsHorizontalScrollIndicator={false}
							contentContainerStyle={styles.chipsRow}
						>
							{safraOptions.map((option) => {
								const isSelected = selectedSafra === option;

								return (
									<TouchableOpacity
										key={option}
										activeOpacity={0.82}
										onPress={() => setSelectedSafra(option)}
										style={[
											styles.filterChip,
											isSelected && styles.filterChipSelected,
										]}
									>
										<Text
											style={[
												styles.filterChipText,
												isSelected && styles.filterChipTextSelected,
											]}
										>
											{option}
										</Text>
									</TouchableOpacity>
								);
							})}
						</ScrollView>
					</View>

					<View style={styles.filterSection}>
						<Text style={styles.filterLabel}>Ciclo</Text>

						<ScrollView
							horizontal
							showsHorizontalScrollIndicator={false}
							contentContainerStyle={styles.chipsRow}
						>
							{cicloOptions.map((option) => {
								const normalizedOption = String(option).trim();
								const isSelected = String(selectedCiclo).trim() === normalizedOption;

								return (
									<TouchableOpacity
										key={`ciclo-${normalizedOption}`}
										activeOpacity={0.82}
										onPress={() => setSelectedCiclo(normalizedOption)}
										style={[
											styles.filterChip,
											isSelected && styles.filterChipSelected,
										]}
									>
										<Text
											style={[
												styles.filterChipText,
												isSelected && styles.filterChipTextSelected,
											]}
										>
											Ciclo {normalizedOption}
										</Text>
									</TouchableOpacity>
								);
							})}
						</ScrollView>
					</View>

					<View style={styles.filterSection}>
						<Text style={styles.filterLabel}>Status</Text>

						<ScrollView
							horizontal
							showsHorizontalScrollIndicator={false}
							contentContainerStyle={styles.chipsRow}
						>
							{statusOptions.map((option) => {
								const isSelected = selectedStatus.includes(option.key);

								return (
									<TouchableOpacity
										key={option.key}
										activeOpacity={0.82}
										onPress={() => handleToggleStatus(option.key)}
										style={[
											styles.filterChip,
											isSelected && styles.filterChipSelected,
										]}
									>
										<Text
											style={[
												styles.filterChipText,
												isSelected && styles.filterChipTextSelected,
											]}
										>
											{option.label}
										</Text>
									</TouchableOpacity>
								);
							})}
						</ScrollView>
					</View>

					{cultureOptions.length > 0 && (
						<View style={styles.filterSectionLast}>
							<Text style={styles.filterLabel}>Cultura</Text>

							<ScrollView
								horizontal
								showsHorizontalScrollIndicator={false}
								contentContainerStyle={styles.chipsRow}
							>
								{cultureOptions.map((culture) => {
									const isSelected = selectedCulture.includes(culture);

									return (
										<TouchableOpacity
											key={culture}
											activeOpacity={0.82}
											onPress={() => handleToggleCulture(culture)}
											style={[
												styles.filterChip,
												isSelected && styles.filterChipSelected,
											]}
										>
											<Text
												style={[
													styles.filterChipText,
													isSelected && styles.filterChipTextSelected,
												]}
											>
												{culture}
											</Text>
										</TouchableOpacity>
									);
								})}
							</ScrollView>
						</View>
					)}
				</View>
			)}

			{infoMode && infoParcel ? (
				<View style={[styles.infoCardFloatingWrap, { bottom: infoCardBottom }]}>
					<ParcelInfoCard
						item={infoParcel}
						onClose={() => setInfoParcel(null)}
						isSelected={selectedParcels.includes(infoParcel?.id_farmbox || infoParcel?.id)}
						onSelect={() => handleToggleParcel(infoParcel)}
					/>
				</View>
			) : hasSelectedArea ? (
				<View style={[styles.selectionCounter, { bottom: floatingBottom }]}>
					<Text style={styles.selectionCounterTitle}>
						{selectedParcels.length} selecionadas
					</Text>

					<Text style={styles.selectionCounterText}>
						{formatHa(selectedAreaTotal)}
					</Text>
				</View>
			) : null}

			<View
				style={[
					styles.bottomSheet,
					sheetExpanded ? styles.bottomSheetExpanded : styles.bottomSheetCollapsed,
				]}
			>
				<TouchableOpacity
					activeOpacity={0.85}
					onPress={() => setSheetExpanded((current) => !current)}
					style={styles.sheetHandleArea}
				>
					<View style={styles.sheetHandle} />

					<View style={styles.sheetHeader}>
						<View>
							<Text style={styles.sheetTitle}>Mapa operacional</Text>
							<Text style={styles.sheetSubtitle}>
								Safra {selectedSafra} · Ciclo {selectedCiclo}
							</Text>
						</View>

						<View style={styles.sheetHeaderRight}>
							<View style={styles.sheetBadge}>
								<Text style={styles.sheetBadgeText}>{mapData.length}</Text>
							</View>

							<Ionicons
								name={sheetExpanded ? "chevron-down" : "chevron-up"}
								size={20}
								color="rgba(15,23,42,0.58)"
							/>
						</View>
					</View>
				</TouchableOpacity>

				{sheetExpanded && (
					<>
						<ScrollView
							horizontal
							showsHorizontalScrollIndicator={false}
							contentContainerStyle={styles.projectsRow}
						>
							<TouchableOpacity
								activeOpacity={0.84}
								onPress={() => handleToggleProject(null)}
								style={[
									styles.projectCard,
									!selectedProjectLocal && styles.projectCardSelected,
								]}
							>
								<View style={styles.projectCardHeader}>
									<View
										style={[
											styles.projectStatusDot,
											{ backgroundColor: Colors.primary[700] },
										]}
									/>

									<Text style={styles.projectName} numberOfLines={1}>
										Todos
									</Text>
								</View>

								<Text style={styles.projectArea}>{formatHa(totalArea)}</Text>

								<Text style={styles.projectMeta}>{mapData.length} parcelas</Text>
							</TouchableOpacity>

							{projects.map((project) => {
								const hasMapCenter =
									!!project?.map_centro_id?.lat ||
									!!project?.map_centro_id?.latitude;

								const isSelected = selectedProjectLocal === project.projeto_nome;

								return (
									<TouchableOpacity
										key={`project-${project.projeto_id || project.projeto_nome}-${project.projeto_nome}`}
										activeOpacity={0.84}
										onPress={() => handleToggleProject(project.projeto_nome)}
										style={[
											styles.projectCard,
											isSelected && styles.projectCardSelected,
										]}
									>
										<View style={styles.projectCardHeader}>
											<View
												style={[
													styles.projectStatusDot,
													{
														backgroundColor: hasMapCenter ? "#16A34A" : "#CBD5E1",
													},
												]}
											/>

											<Text style={styles.projectName} numberOfLines={1}>
												{normalizeProjectName(project.projeto_nome)}
											</Text>
										</View>

										<Text style={styles.projectArea}>
											{formatHa(project.area_produtiva)}
										</Text>

										<Text style={styles.projectMeta}>
											{project.total_parcelas} parcelas
										</Text>
									</TouchableOpacity>
								);
							})}
						</ScrollView>

						<ScrollView
							horizontal
							showsHorizontalScrollIndicator={false}
							contentContainerStyle={styles.parcelsRow}
						>
							{mapData.slice(0, 80).map((item) => {
								const parcelId = item?.id_farmbox || item?.id;
								const isSelected = selectedParcels.includes(parcelId);

								return (
									<TouchableOpacity
										key={`parcel-chip-${item.id || "id"}-${item.id_farmbox || "fb"}-${item.projeto_id || item.projeto || "proj"}-${item.parcela || "parcela"}-${item.safra || "safra"}-${item.ciclo || "ciclo"}`}
										activeOpacity={0.84}
										onPress={() => handlePolygonPress(item)}
										style={[
											styles.parcelChip,
											isSelected && styles.parcelChipSelected,
										]}
									>
										<View
											style={[
												styles.parcelColorDot,
												{ backgroundColor: item?.map?.fill_color || "#CBD5E1" },
											]}
										/>

										<Text
											style={[
												styles.parcelChipText,
												isSelected && styles.parcelChipTextSelected,
											]}
										>
											{item.parcela}
										</Text>
									</TouchableOpacity>
								);
							})}
						</ScrollView>
					</>
				)}
			</View>
		</View>
	);
};

export default NavigationMapScreen;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#050816",
	},
	map: {
		flex: 1,
	},
	emptyMapOverlay: {
		position: "absolute",
		top: "36%",
		left: 24,
		right: 24,
		zIndex: 5,
		alignItems: "center",
		backgroundColor: "rgba(255,255,255,0.88)",
		borderRadius: 22,
		padding: 18,
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.08)",
	},
	emptyMapTitle: {
		marginTop: 8,
		color: "#0F172A",
		fontSize: 15,
		fontWeight: "900",
	},
	emptyMapText: {
		marginTop: 4,
		color: "rgba(15,23,42,0.58)",
		fontSize: 12,
		fontWeight: "700",
		textAlign: "center",
	},
	topBar: {
		position: "absolute",
		top: Platform.OS === "ios" ? 52 : 34,
		left: 14,
		right: 14,
		zIndex: 20,
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
	},
	backButton: {
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: "rgba(0,0,0,0.58)",
		alignItems: "center",
		justifyContent: "center",
	},
	titleBox: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.54)",
		borderRadius: 18,
		paddingHorizontal: 14,
		paddingVertical: 9,
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.10)",
	},
	title: {
		color: "#FFFFFF",
		fontSize: 15,
		fontWeight: "900",
	},
	subtitle: {
		marginTop: 1,
		color: "rgba(255,255,255,0.68)",
		fontSize: 11.5,
		fontWeight: "700",
	},
	filterButton: {
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: "rgba(0,0,0,0.58)",
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.10)",
	},
	filterButtonActive: {
		backgroundColor: "#72E6A1",
		borderColor: "#72E6A1",
	},
	fabButton: {
		width: 50,
		height: 50,
		borderRadius: 25,
		backgroundColor: "rgba(255,255,255,0.92)",
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.10)",
		shadowColor: "#000",
		shadowOpacity: 0.18,
		shadowRadius: 12,
		shadowOffset: { width: 0, height: 6 },
		elevation: 5,
	},
	fabButtonActive: {
		backgroundColor: "#72E6A1",
		borderColor: "#72E6A1",
	},
	loadingFloating: {
		position: "absolute",
		top: Platform.OS === "ios" ? 106 : 88,
		alignSelf: "center",
		zIndex: 18,
		flexDirection: "row",
		alignItems: "center",
		gap: 7,
		backgroundColor: "rgba(255,255,255,0.92)",
		borderRadius: 999,
		paddingHorizontal: 12,
		paddingVertical: 8,
	},
	loadingFloatingText: {
		color: Colors.primary[800],
		fontSize: 11,
		fontWeight: "900",
	},
	errorFloating: {
		position: "absolute",
		top: Platform.OS === "ios" ? 106 : 88,
		left: 16,
		right: 16,
		zIndex: 18,
		backgroundColor: "rgba(254,243,199,0.95)",
		borderRadius: 16,
		padding: 10,
		borderWidth: 1,
		borderColor: "rgba(180,83,9,0.2)",
	},
	errorText: {
		color: "#92400E",
		fontSize: 12,
		fontWeight: "800",
		textAlign: "center",
	},
	filtersPanel: {
		position: "absolute",
		top: Platform.OS === "ios" ? 106 : 88,
		left: 14,
		right: 14,
		zIndex: 19,
		backgroundColor: "rgba(10,16,12,0.88)",
		borderRadius: 22,
		padding: 14,
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.12)",
	},
	filterPanelHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 10,
	},
	filterPanelTitle: {
		color: "#FFFFFF",
		fontSize: 13,
		fontWeight: "900",
	},
	clearFiltersText: {
		color: "#72E6A1",
		fontSize: 12,
		fontWeight: "900",
	},
	filterSection: {
		marginBottom: 10,
	},
	filterSectionLast: {
		marginBottom: 0,
	},
	filterLabel: {
		color: "rgba(255,255,255,0.62)",
		fontSize: 11,
		fontWeight: "900",
		textTransform: "uppercase",
		letterSpacing: 0.8,
		marginBottom: 8,
	},
	chipsRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		paddingRight: 6,
	},
	filterChip: {
		borderRadius: 999,
		paddingHorizontal: 12,
		paddingVertical: 8,
		backgroundColor: "rgba(255,255,255,0.08)",
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.10)",
	},
	filterChipSelected: {
		backgroundColor: "#72E6A1",
		borderColor: "#72E6A1",
	},
	filterChipText: {
		color: "rgba(255,255,255,0.78)",
		fontSize: 12,
		fontWeight: "900",
	},
	filterChipTextSelected: {
		color: "#07130C",
	},
	selectionCounterTitle: {
		color: "rgba(15,23,42,0.56)",
		fontSize: 11,
		fontWeight: "800",
	},
	selectionCounterText: {
		marginTop: 1,
		color: Colors.primary[800],
		fontSize: 17,
		fontWeight: "950",
	},

	infoHeader: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 10,
	},
	infoTitleBox: {
		flex: 1,
	},
	infoTitle: {
		color: "#0F172A",
		fontSize: 17,
		fontWeight: "950",
	},
	infoSubtitle: {
		marginTop: 1,
		color: "rgba(15,23,42,0.52)",
		fontSize: 12,
		fontWeight: "800",
	},
	infoClose: {
		width: 34,
		height: 34,
		borderRadius: 17,
		backgroundColor: "rgba(15,23,42,0.06)",
		alignItems: "center",
		justifyContent: "center",
	},
	infoGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
	},
	infoMetric: {
		width: "48%",
		backgroundColor: "rgba(15,23,42,0.045)",
		borderRadius: 14,
		padding: 10,
	},
	infoMetricLabel: {
		color: "rgba(15,23,42,0.48)",
		fontSize: 10,
		fontWeight: "900",
		textTransform: "uppercase",
		letterSpacing: 0.5,
	},
	infoMetricValue: {
		marginTop: 3,
		color: "#0F172A",
		fontSize: 12,
		fontWeight: "900",
	},
	infoRows: {
		marginTop: 10,
		gap: 3,
	},
	infoRowText: {
		color: "rgba(15,23,42,0.62)",
		fontSize: 11.5,
		fontWeight: "750",
	},
	infoSelectButton: {
		marginTop: 12,
		height: 38,
		borderRadius: 999,
		backgroundColor: Colors.primary[700],
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 7,
	},
	infoSelectButtonActive: {
		backgroundColor: "#2563EB",
	},
	infoSelectButtonText: {
		color: "#FFFFFF",
		fontSize: 12,
		fontWeight: "900",
	},

	sheetHandle: {
		alignSelf: "center",
		width: 42,
		height: 5,
		borderRadius: 999,
		backgroundColor: "rgba(15,23,42,0.16)",
		marginBottom: 12,
	},

	sheetTitle: {
		color: "#0F172A",
		fontSize: 16,
		fontWeight: "900",
	},
	sheetSubtitle: {
		marginTop: 2,
		color: "rgba(15,23,42,0.52)",
		fontSize: 12,
		fontWeight: "700",
	},
	sheetBadge: {
		minWidth: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: Colors.primary[700],
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 8,
	},
	sheetBadgeText: {
		color: "#FFFFFF",
		fontSize: 13,
		fontWeight: "900",
	},
	projectsRow: {
		gap: 9,
		paddingRight: 4,
		marginTop: 14,
		marginBottom: 10,
	},

	parcelsRow: {
		gap: 7,
		paddingRight: 4,
		paddingBottom: 2,
	},
	projectCard: {
		width: 132,
		borderRadius: 18,
		backgroundColor: "rgba(15,23,42,0.045)",
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.07)",
		padding: 11,
	},
	projectCardSelected: {
		backgroundColor: "rgba(34,197,94,0.12)",
		borderColor: Colors.primary[700],
	},
	projectCardHeader: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 8,
	},
	projectStatusDot: {
		width: 7,
		height: 7,
		borderRadius: 4,
		marginRight: 7,
	},
	projectName: {
		flex: 1,
		color: "#0F172A",
		fontSize: 12,
		fontWeight: "900",
	},
	projectArea: {
		color: Colors.primary[800],
		fontSize: 13,
		fontWeight: "900",
	},
	projectMeta: {
		marginTop: 3,
		color: "rgba(15,23,42,0.45)",
		fontSize: 10.5,
		fontWeight: "800",
	},

	parcelChip: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		borderRadius: 999,
		paddingHorizontal: 10,
		paddingVertical: 7,
		backgroundColor: "rgba(15,23,42,0.045)",
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.07)",
	},
	parcelChipSelected: {
		backgroundColor: Colors.primary[700],
		borderColor: Colors.primary[700],
	},
	parcelColorDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
	},
	parcelChipText: {
		color: "#0F172A",
		fontSize: 11,
		fontWeight: "900",
	},
	parcelChipTextSelected: {
		color: "#FFFFFF",
	},
	labelWrap: {
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 2,
		paddingVertical: 1,
		maxWidth: 140,
	},
	labelWrapSelected: {
		transform: [{ scale: 1.04 }],
	},
	labelTitle: {
		fontSize: 11,
		fontWeight: "900",
		color: "#FFFFFF",
		textAlign: "center",
		textShadowColor: "rgba(0,0,0,0.88)",
		textShadowOffset: { width: 0, height: 1 },
		textShadowRadius: 3,
	},
	labelTitleSelected: {
		color: "#FFD54A",
	},
	labelSubtitle: {
		fontSize: 9,
		fontWeight: "800",
		color: "rgba(255,255,255,0.96)",
		textAlign: "center",
		textShadowColor: "rgba(0,0,0,0.88)",
		textShadowOffset: { width: 0, height: 1 },
		textShadowRadius: 3,
	},
	labelSubtitleSelected: {
		color: "#FFF4C2",
	},
	labelSubtitleVisible: {
		opacity: 1,
		height: 12,
		marginTop: 0,
	},
	labelSubtitleHidden: {
		opacity: 0,
		height: 0,
		marginTop: 0,
	},
	labelCulture: {
		fontSize: 8,
		fontWeight: "800",
		color: "rgba(255,255,255,0.96)",
		textAlign: "center",
		textShadowColor: "rgba(0,0,0,0.88)",
		textShadowOffset: { width: 0, height: 1 },
		textShadowRadius: 3,
		maxWidth: 130,
	},
	labelCultureVisible: {
		opacity: 1,
		height: 11,
		marginTop: 0,
	},
	labelCultureHidden: {
		opacity: 0,
		height: 0,
		marginTop: 0,
	},
	labelStatus: {
		marginTop: 1,
		fontSize: 7.5,
		fontWeight: "900",
		color: "#FFFFFF",
		backgroundColor: "rgba(37,99,235,0.9)",
		paddingHorizontal: 5,
		paddingVertical: 1,
		borderRadius: 999,
		overflow: "hidden",
	},

	fabColumn: {
		position: "absolute",
		right: 14,
		zIndex: 22,
		gap: 10,
	},

	selectionCounter: {
		position: "absolute",
		left: 14,
		zIndex: 21,
		backgroundColor: "rgba(255,255,255,0.94)",
		borderRadius: 18,
		paddingHorizontal: 14,
		paddingVertical: 10,
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.08)",
		shadowColor: "#000",
		shadowOpacity: 0.14,
		shadowRadius: 12,
		shadowOffset: { width: 0, height: 6 },
		elevation: 5,
	},

	infoCardFloatingWrap: {
		position: "absolute",
		left: 12,
		right: 12,
		zIndex: 23,
	},

	infoCard: {
		backgroundColor: "rgba(255,255,255,0.97)",
		borderRadius: 24,
		padding: 14,
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.08)",
		shadowColor: "#000",
		shadowOpacity: 0.18,
		shadowRadius: 20,
		shadowOffset: { width: 0, height: 10 },
		elevation: 8,
	},

	bottomSheet: {
		position: "absolute",
		left: 12,
		right: 12,
		bottom: Platform.OS === "ios" ? 20 : 12,
		backgroundColor: "rgba(255,255,255,0.95)",
		borderRadius: 24,
		paddingHorizontal: 14,
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.08)",
		shadowColor: "#000",
		shadowOpacity: 0.18,
		shadowRadius: 20,
		shadowOffset: { width: 0, height: 10 },
		elevation: 8,
	},

	bottomSheetCollapsed: {
		paddingTop: 8,
		paddingBottom: 10,
	},

	bottomSheetExpanded: {
		paddingTop: 8,
		paddingBottom: 14,
	},

	sheetHandleArea: {
		paddingTop: 0,
	},

	sheetHandle: {
		alignSelf: "center",
		width: 42,
		height: 5,
		borderRadius: 999,
		backgroundColor: "rgba(15,23,42,0.16)",
		marginBottom: 12,
	},

	sheetHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 0,
	},

	sheetHeaderRight: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
});