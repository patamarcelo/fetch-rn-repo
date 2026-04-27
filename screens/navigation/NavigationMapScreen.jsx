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
	PanResponder,
	Animated,
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
	selectNavigationMapFiltersIndexFromCache
} from "../../store/redux/selector";

import { fetchParcelApplications } from "../../services/navigationApplicationsApi";
import ParcelApplicationsSheet from "./ParcelApplicationsSheet";

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
	const { fillColor, lineColor } = getItemBaseColors(item);
	const statusVisual = getStatusVisualStyle(item?.status);

	if (isSelected) {
		return {
			fillColor: hexToRgba(fillColor, 0.72),
			strokeColor: "#1D4ED8",
			strokeWidth: 3.5,
		};
	}

	if (isDimmed) {
		return {
			fillColor: hexToRgba(fillColor, 0.16),
			strokeColor: "rgba(71,85,105,0.45)",
			strokeWidth: 1,
		};
	}

	return {
		fillColor: hexToRgba(fillColor, statusVisual.opacity),
		strokeColor: statusVisual.strokeOverride || lineColor,
		strokeWidth: statusVisual.strokeWidth,
	};
};

const normalizeVarietyName = (value) => {
	if (!value) return "";

	return String(value)
		.trim()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase();
};

const getVarietySpecialColors = (item) => {
	const varietyName = normalizeVarietyName(
		item?.variedade || item?.variedade_nome
	);

	// Mungo Preto
	if (varietyName === "mungo preto") {
		return {
			fillColor: "#82202B",
			lineColor: "rgba(170,88,57,0.9)",
		};
	}

	// Mungo Verde
	if (varietyName === "mungo verde") {
		return {
			fillColor: "rgba(170,88,57,1.0)",
			lineColor: "rgba(130,32,43,0.9)",
		};
	}

	// Caupi
	if (varietyName === "caupi") {
		return {
			fillColor: "#3F4B7D",
			lineColor: "#3F4B7D",
		};
	}

	return null;
};

const getItemBaseColors = (item) => {
	const cultura = normalizeVarietyName(item?.cultura);
	const variedade = normalizeVarietyName(
		item?.variedade || item?.variedade_nome
	);

	// Arroz
	if (cultura === "arroz" || variedade.includes("arroz")) {
		return {
			fillColor: "#FACC15",
			lineColor: "#A16207",
		};
	}

	// Soja
	if (cultura === "soja" || variedade.includes("soja")) {
		return {
			fillColor: "#22C55E",
			lineColor: "#14532D",
		};
	}

	// Açaí
	if (
		cultura === "acai" ||
		cultura === "açai" ||
		cultura === "açaí" ||
		variedade.includes("acai") ||
		variedade.includes("açai") ||
		variedade.includes("açaí")
	) {
		return {
			fillColor: "#6D28D9",
			lineColor: "#4C1D95",
		};
	}

	// Feijão Mungo Preto
	if (variedade.includes("mungo preto")) {
		return {
			fillColor: "#82202B",
			lineColor: "#64151F",
		};
	}

	// Feijão Mungo Verde
	if (variedade.includes("mungo verde")) {
		return {
			fillColor: "#AA5839",
			lineColor: "#82202B",
		};
	}

	// Feijão Caupi
	if (variedade.includes("caupi")) {
		return {
			fillColor: "#3F4B7D",
			lineColor: "#2F3A63",
		};
	}

	// Sem cultura/sem planejamento
	// Fallback: usa cor enviada pela API quando existir
	return {
		fillColor: item?.map?.fill_color || "#FFFFFF",
		lineColor: item?.map?.line_color || "#334155",
	};
};


const getStatusVisualStyle = (status) => {
	if (status === "sem_planejamento") {
		return {
			opacity: 0.42,
			strokeWidth: 1,
			strokeOverride: "rgba(100,116,139,0.75)",
		};
	}

	if (status === "planejado") {
		return {
			opacity: 0.38,
			strokeWidth: 1.5,
			strokeOverride: null,
		};
	}

	if (status === "em_plantio") {
		return {
			opacity: 0.58,
			strokeWidth: 3,
			strokeOverride: null,
		};
	}

	if (status === "plantado") {
		return {
			opacity: 0.64,
			strokeWidth: 2,
			strokeOverride: null,
		};
	}

	if (status === "colhido") {
		return {
			opacity: 0.34,
			strokeWidth: 2,
			strokeOverride: null,
		};
	}

	return {
		opacity: 0.52,
		strokeWidth: 1.5,
		strokeOverride: null,
	};
};



const normalizeSafra = (value) => {
	if (value === null || value === undefined || value === "") return null;
	return String(value).trim();
};

const normalizeCiclo = (value) => {
	if (value === null || value === undefined || value === "") return null;

	const parsed = Number(String(value).trim());

	if (Number.isNaN(parsed)) return String(value).trim();

	return String(parsed);
};

const normalizeTextFilter = (value) => {
	if (value === null || value === undefined || value === "") return null;
	return String(value).trim();
};

const uniqSorted = (arr, sortNumeric = false) => {
	const clean = [...new Set(arr.filter(Boolean))];

	if (sortNumeric) {
		return clean.sort((a, b) => Number(a) - Number(b));
	}

	return clean.sort((a, b) => String(a).localeCompare(String(b)));
};

const getNavigationCacheRows = (navigationMapByKey = {}) => {
	const rows = [];

	Object.values(navigationMapByKey || {}).forEach((cacheItem) => {
		if (Array.isArray(cacheItem?.data)) {
			rows.push(...cacheItem.data);
		}
	});

	return rows;
};

const applyContextFilters = (data = [], filters = {}, ignoreKey = null) => {
	return data.filter((item) => {
		if (filters.fazenda && ignoreKey !== "fazenda") {
			if (item.fazenda_grupo !== filters.fazenda) return false;
		}

		if (filters.projeto && ignoreKey !== "projeto") {
			if (item.projeto !== filters.projeto) return false;
		}

		if (filters.safra && ignoreKey !== "safra") {
			if (normalizeSafra(item.safra) !== normalizeSafra(filters.safra)) {
				return false;
			}
		}

		if (filters.ciclo && ignoreKey !== "ciclo") {
			if (normalizeCiclo(item.ciclo) !== normalizeCiclo(filters.ciclo)) {
				return false;
			}
		}

		if (filters.cultura && ignoreKey !== "cultura") {
			if (normalizeTextFilter(item.cultura) !== normalizeTextFilter(filters.cultura)) {
				return false;
			}
		}

		if (filters.variedade && ignoreKey !== "variedade") {
			const itemVariedade = normalizeTextFilter(item.variedade || item.variedade_nome);
			if (itemVariedade !== normalizeTextFilter(filters.variedade)) {
				return false;
			}
		}

		return true;
	});
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
	const filtersIndex = useSelector(selectNavigationMapFiltersIndexFromCache);
	const navigationMapByKey = useSelector((state) => state.geral.navigationMapByKey);

	const navigationMapFiltersIndex = useSelector(
		(state) => state.geral.navigationMapFiltersIndex || []
	);


	const navigationMapData = Array.isArray(navigationMapDataRaw)
		? navigationMapDataRaw
		: [];

	const selectedParcels = Array.isArray(selectedParcelsRaw)
		? selectedParcelsRaw
		: [];

	const [selectedSafra, setSelectedSafra] = useState(safra || null);
	const [selectedCiclo, setSelectedCiclo] = useState(ciclo ? normalizeCiclo(ciclo) : null);
	const [filtersVisible, setFiltersVisible] = useState(false);
	const [selectedStatus, setSelectedStatus] = useState([]);
	const [selectedCulture, setSelectedCulture] = useState(null);
	const [selectedVariety, setSelectedVariety] = useState(null);
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



	const [applicationsMode, setApplicationsMode] = useState(false);
	const [applicationsParcel, setApplicationsParcel] = useState(null);
	const [applicationsData, setApplicationsData] = useState(null);
	const [applicationsLoading, setApplicationsLoading] = useState(false);
	const [applicationsError, setApplicationsError] = useState(null);
	const [applicationsSheetExpanded, setApplicationsSheetExpanded] = useState(false);

	const [showOperationalSheet, setShowOperationalSheet] = useState(false);




	const COLLAPSED_SHEET_HEIGHT = Platform.OS === "ios" ? 112 : 100;
	const EXPANDED_SHEET_HEIGHT = Platform.OS === "ios" ? 330 : 310;

	const sheetHeight = useRef(new Animated.Value(COLLAPSED_SHEET_HEIGHT)).current;
	const [sheetExpanded, setSheetExpanded] = useState(false);


	const FAB_BOTTOM_WITH_SHEET_COLLAPSED = Platform.OS === "ios" ? 128 : 116;
	const FAB_BOTTOM_WITH_SHEET_EXPANDED = Platform.OS === "ios" ? 350 : 330;
	const FAB_BOTTOM_WITHOUT_SHEET = Platform.OS === "ios" ? 34 : 26;

	const animatedFabBottom = useRef(
		new Animated.Value(FAB_BOTTOM_WITHOUT_SHEET)
	).current;


	const currentSafraFromRedux = useSelector(
		(state) => state.geral.navigationMapCurrentSafra
	);

	const currentCicloFromRedux = useSelector(
		(state) => state.geral.navigationMapCurrentCiclo
	);

	useEffect(() => {
		if (!selectedSafra && currentSafraFromRedux) {
			setSelectedSafra(currentSafraFromRedux);
		}
	}, [selectedSafra, currentSafraFromRedux]);

	useEffect(() => {
		if (!selectedCiclo && currentCicloFromRedux) {
			setSelectedCiclo(normalizeCiclo(currentCicloFromRedux));
		}
	}, [selectedCiclo, currentCicloFromRedux]);

	const filterIndexRows = useMemo(() => {
		const rows = Array.isArray(filtersIndex) && filtersIndex.length > 0
			? filtersIndex
			: Array.isArray(navigationMapFiltersIndex)
				? navigationMapFiltersIndex
				: [];

		return rows.filter((item) => {
			if (selectedFarmParam && item.fazenda_grupo !== selectedFarmParam) {
				return false;
			}

			if (selectedProjectLocal && item.projeto !== selectedProjectLocal) {
				return false;
			}

			return true;
		});
	}, [filtersIndex, navigationMapFiltersIndex, selectedFarmParam, selectedProjectLocal]);

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

	const showDetailedLabels = useMemo(() => {
		return (currentRegion?.latitudeDelta ?? 999) < 0.06;
	}, [currentRegion]);

	const showBasicLabels = useMemo(() => {
		return (currentRegion?.latitudeDelta ?? 999) < 0.22;
	}, [currentRegion]);


	useEffect(() => {
		if (!mapReady) return;

		refreshMarkers();
	}, [mapReady, showBasicLabels, showDetailedLabels, refreshMarkers]);


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

	const allNavigationRows = useMemo(() => {
		if (Array.isArray(filtersIndex) && filtersIndex.length > 0) {
			return filtersIndex;
		}

		const cacheRows = getNavigationCacheRows(navigationMapByKey);
		const merged = [...cacheRows, ...navigationMapData];

		const map = new Map();

		merged.forEach((item) => {
			const key = [
				item?.id || "id",
				item?.id_farmbox || "fb",
				item?.projeto_id || item?.projeto || "proj",
				item?.parcela || "parcela",
				item?.safra || "safra",
				item?.ciclo || "ciclo",
			].join("__");

			if (!map.has(key)) {
				map.set(key, item);
			}
		});

		return Array.from(map.values());
	}, [filtersIndex, navigationMapByKey, navigationMapData]);

	const contextFilterBase = useMemo(() => {
		return {
			fazenda: selectedFarmParam || null,
			projeto: selectedProjectLocal || null,
			safra: selectedSafra || null,
			ciclo: selectedCiclo || null,
			cultura: selectedCulture || null,
			variedade: selectedVariety || null,
		};
	}, [
		selectedFarmParam,
		selectedProjectLocal,
		selectedSafra,
		selectedCiclo,
		selectedCulture,
		selectedVariety,
	]);

	useEffect(() => {
		const hasFiltersIndex =
			Array.isArray(filtersIndex) && filtersIndex.length > 0;

		const hasRawFiltersIndex =
			Array.isArray(navigationMapFiltersIndex) && navigationMapFiltersIndex.length > 0;

		const hasData =
			Array.isArray(navigationMapData) && navigationMapData.length > 0;

		const isLoading = navigationMapStatus === "pending";

		if (!hasFiltersIndex && !hasRawFiltersIndex && !hasData && !isLoading) {
			dispatch(fetchNavigationMapData({}));
		}
	}, [
		dispatch,
		filtersIndex,
		navigationMapFiltersIndex,
		navigationMapData,
		navigationMapStatus,
	]);

	const safraOptions = useMemo(() => {
		return [
			...new Set(
				filterIndexRows
					.map((item) => String(item.safra || "").trim())
					.filter(Boolean)
			),
		].sort((a, b) => String(a).localeCompare(String(b)));
	}, [filterIndexRows]);

	const cicloOptions = useMemo(() => {
		return [
			...new Set(
				filterIndexRows
					.filter((item) => {
						if (!selectedSafra) return true;
						return String(item.safra || "").trim() === String(selectedSafra).trim();
					})
					.map((item) => String(item.ciclo || "").trim())
					.filter(Boolean)
			),
		].sort((a, b) => Number(a) - Number(b));
	}, [filterIndexRows, selectedSafra]);

	useEffect(() => {
		if (!selectedSafra && safraOptions.length > 0) {
			setSelectedSafra(safraOptions[0]);
		}
	}, [selectedSafra, safraOptions]);

	useEffect(() => {
		if (!selectedCiclo && cicloOptions.length > 0) {
			setSelectedCiclo(cicloOptions[0]);
		}
	}, [selectedCiclo, cicloOptions]);



	const cultureOptions = useMemo(() => {
		return [
			...new Set(
				filterIndexRows
					.filter((item) => {
						if (selectedSafra && String(item.safra).trim() !== String(selectedSafra).trim()) {
							return false;
						}

						if (selectedCiclo && String(item.ciclo).trim() !== String(selectedCiclo).trim()) {
							return false;
						}

						return true;
					})
					.map((item) => String(item.cultura || "").trim())
					.filter(Boolean)
			),
		].sort((a, b) => String(a).localeCompare(String(b)));
	}, [filterIndexRows, selectedSafra, selectedCiclo]);

	const varietyOptions = useMemo(() => {
		return [
			...new Set(
				filterIndexRows
					.filter((item) => {
						if (selectedSafra && String(item.safra).trim() !== String(selectedSafra).trim()) {
							return false;
						}

						if (selectedCiclo && String(item.ciclo).trim() !== String(selectedCiclo).trim()) {
							return false;
						}

						if (selectedCulture && String(item.cultura).trim() !== String(selectedCulture).trim()) {
							return false;
						}

						return true;
					})
					.map((item) => String(item.variedade || item.variedade_nome || "").trim())
					.filter(Boolean)
			),
		].sort((a, b) => String(a).localeCompare(String(b)));
	}, [filterIndexRows, selectedSafra, selectedCiclo, selectedCulture]);

	useEffect(() => {
		if (selectedSafra && safraOptions.length > 0 && !safraOptions.includes(selectedSafra)) {
			setSelectedSafra(safraOptions[0]);
		}
	}, [selectedSafra, safraOptions]);

	useEffect(() => {
		if (selectedCiclo && cicloOptions.length > 0 && !cicloOptions.includes(String(selectedCiclo))) {
			setSelectedCiclo(cicloOptions[0]);
		}
	}, [selectedCiclo, cicloOptions]);

	useEffect(() => {
		if (selectedCulture && cultureOptions.length > 0 && !cultureOptions.includes(selectedCulture)) {
			setSelectedCulture(null);
		}
	}, [selectedCulture, cultureOptions]);

	useEffect(() => {
		if (selectedVariety && varietyOptions.length > 0 && !varietyOptions.includes(selectedVariety)) {
			setSelectedVariety(null);
		}
	}, [selectedVariety, varietyOptions]);

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


	useEffect(() => {
		dispatch(
			geralActions.setNavigationMapCurrentFilter({
				safra: selectedSafra,
				ciclo: selectedCiclo,
			})
		);

		if (!selectedSafra || !selectedCiclo) return;

		const key = `${selectedSafra}__${normalizeCiclo(selectedCiclo)}`;
		const hasCache = Array.isArray(navigationMapByKey?.[key]?.data);

		if (!hasCache) {
			dispatch(fetchNavigationMapData({ safra: selectedSafra, ciclo: selectedCiclo }));
		}
	}, [dispatch, selectedSafra, selectedCiclo, navigationMapByKey]);


	const mapData = useMemo(() => {
		const selectedKey =
			selectedSafra && selectedCiclo
				? `${selectedSafra}__${normalizeCiclo(selectedCiclo)}`
				: null;

		const cachedData =
			selectedKey && Array.isArray(navigationMapByKey?.[selectedKey]?.data)
				? navigationMapByKey[selectedKey].data
				: null;

		let data = Array.isArray(cachedData)
			? [...cachedData]
			: [...navigationMapData];

		if (selectedSafra) {
			data = data.filter(
				(item) => normalizeSafra(item.safra) === normalizeSafra(selectedSafra)
			);
		}

		if (selectedCiclo) {
			data = data.filter(
				(item) => normalizeCiclo(item.ciclo) === normalizeCiclo(selectedCiclo)
			);
		}

		if (selectedFarmParam) {
			data = data.filter((item) => item.fazenda_grupo === selectedFarmParam);
		}

		if (selectedProjectLocal) {
			data = data.filter((item) => item.projeto === selectedProjectLocal);
		}

		if (selectedStatus.length > 0) {
			data = data.filter((item) => selectedStatus.includes(item.status));
		}

		if (selectedCulture) {
			data = data.filter(
				(item) =>
					normalizeTextFilter(item.cultura) === normalizeTextFilter(selectedCulture)
			);
		}

		if (selectedVariety) {
			data = data.filter((item) => {
				const itemVariety = normalizeTextFilter(
					item.variedade || item.variedade_nome
				);

				return itemVariety === normalizeTextFilter(selectedVariety);
			});
		}

		return data;
	}, [
		navigationMapByKey,
		navigationMapData,
		selectedSafra,
		selectedCiclo,
		selectedFarmParam,
		selectedProjectLocal,
		selectedStatus,
		selectedCulture,
		selectedVariety,
	]);


	const expandSheet = useCallback(() => {
		setSheetExpanded(true);

		Animated.spring(sheetHeight, {
			toValue: EXPANDED_SHEET_HEIGHT,
			useNativeDriver: false,
			bounciness: 4,
			speed: 14,
		}).start();
	}, [sheetHeight]);

	const collapseSheet = useCallback(() => {
		setSheetExpanded(false);

		Animated.spring(sheetHeight, {
			toValue: COLLAPSED_SHEET_HEIGHT,
			useNativeDriver: false,
			bounciness: 4,
			speed: 14,
		}).start();
	}, [sheetHeight]);


	const sheetPanResponder = useRef(
		PanResponder.create({
			onMoveShouldSetPanResponder: (_, gestureState) => {
				return Math.abs(gestureState.dy) > 8;
			},

			onPanResponderRelease: (_, gestureState) => {
				if (gestureState.dy < -24) {
					expandSheet();
					return;
				}

				if (gestureState.dy > 24) {
					collapseSheet();
				}
			},
		})
	).current;


	const floatingBottom =
		showOperationalSheet && !applicationsParcel
			? sheetExpanded
				? FAB_BOTTOM_WITH_SHEET_EXPANDED
				: FAB_BOTTOM_WITH_SHEET_COLLAPSED
			: FAB_BOTTOM_WITHOUT_SHEET;

	const infoCardBottom = floatingBottom;

	const selectionCounterBottom =
		!showOperationalSheet && !applicationsParcel
			? Platform.OS === "ios"
				? 78
				: 68
			: floatingBottom;

	useEffect(() => {
		const nextBottom =
			showOperationalSheet && !applicationsParcel
				? sheetExpanded
					? FAB_BOTTOM_WITH_SHEET_EXPANDED
					: FAB_BOTTOM_WITH_SHEET_COLLAPSED
				: FAB_BOTTOM_WITHOUT_SHEET;

		Animated.spring(animatedFabBottom, {
			toValue: nextBottom,
			useNativeDriver: false,
			bounciness: 5,
			speed: 16,
		}).start();
	}, [
		showOperationalSheet,
		applicationsParcel,
		sheetExpanded,
		animatedFabBottom,
		FAB_BOTTOM_WITH_SHEET_EXPANDED,
		FAB_BOTTOM_WITH_SHEET_COLLAPSED,
		FAB_BOTTOM_WITHOUT_SHEET,
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


	useEffect(() => {
		setSelectedStatus([]);
		setSelectedCulture(null);
		setSelectedVariety(null);
		setInfoParcel(null);
		dispatch(geralActions.clearNavigationMapSelectedParcels());
	}, [dispatch, selectedSafra, selectedCiclo]);

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

		mapData.forEach((item) => {
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
	}, [mapData]);

	const isLoading = navigationMapStatus === "pending";
	const hasMapData = polygonsData.length > 0;

	const hasAnyFilter =
		selectedStatus.length > 0 ||
		!!selectedCulture ||
		!!selectedVariety ||
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
			const next = current === culture ? null : culture;

			if (next !== current) {
				setSelectedVariety(null);
			}

			return next;
		});
	};

	const handleToggleVariety = (variety) => {
		setSelectedVariety((current) => {
			return current === variety ? null : variety;
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
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

		if (applicationsMode) {
			handleOpenApplicationsSheet(item);
			return;
		}

		if (infoMode) {
			setInfoParcel(item);
			return;
		}

		handleToggleParcel(item);
	};

	const handleClearFilters = () => {
		setSelectedStatus([]);
		setSelectedCulture(null);
		setSelectedVariety(null);
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


	const getPlantioIdFromMapItem = (item) => {
		return item?.id_farmbox || item?.id || null;
	};

	const handleToggleApplicationsMode = () => {
		setApplicationsMode((current) => {
			const next = !current;

			if (next) {
				setInfoMode(false);
				setInfoParcel(null);
			} else {
				setApplicationsParcel(null);
				setApplicationsData(null);
				setApplicationsError(null);
				setApplicationsSheetExpanded(false);
			}

			return next;
		});
	};

	const handleOpenApplicationsSheet = async (item) => {
		const plantioId = getPlantioIdFromMapItem(item);

		if (!plantioId) {
			Alert.alert("Parcela sem ID", "Não foi possível identificar o ID FarmBox dessa parcela.");
			return;
		}

		setApplicationsParcel(item);
		setApplicationsData(null);
		setApplicationsError(null);
		setApplicationsLoading(true);
		setApplicationsSheetExpanded(false);

		try {
			const data = await fetchParcelApplications(plantioId);
			setApplicationsData(data);
		} catch (error) {
			setApplicationsError(error.message);
		} finally {
			setApplicationsLoading(false);
		}
	};



	const hasSelectedArea = selectedParcels.length > 0 && Number(selectedAreaTotal || 0) > 0;

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

				{polygonsData.slice(0, 250).map(({ item, parcelId, center }) => {
					if (!center) return null;

					const isSelected = selectedParcels.includes(parcelId);
					const cultureText = getCultureText(item);
					const shouldShowDetails = showDetailedLabels || isSelected || infoMode;

					return (
						<Marker
							key={`label-${item.id || "id"}-${item.id_farmbox || "fb"}-${item.projeto_id || item.projeto || "proj"}-${item.parcela || "parcela"}-${item.safra || "safra"}-${item.ciclo || "ciclo"}-${showDetailedLabels ? "details" : "basic"}`}
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

			<Animated.View style={[styles.fabColumnLeft, { bottom: animatedFabBottom }]}>
				<TouchableOpacity
					activeOpacity={0.86}
					style={[styles.fabButton, followUser && styles.fabButtonActive]}
					onPress={handleCenterUser}
				>
					<Ionicons
						name="locate"
						size={22}
						color={followUser ? "#07130C" : "#334155"}
					/>
				</TouchableOpacity>

				<TouchableOpacity
					activeOpacity={0.86}
					style={[
						styles.fabButton,
						showOperationalSheet && styles.fabButtonActive,
					]}
					onPress={() => setShowOperationalSheet((current) => !current)}
				>
					<Ionicons
						name={showOperationalSheet ? "albums" : "albums-outline"}
						size={22}
						color={showOperationalSheet ? "#07130C" : "#334155"}
					/>
				</TouchableOpacity>
			</Animated.View>

			<Animated.View style={[styles.fabColumnRight, { bottom: animatedFabBottom }]}>
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

				<TouchableOpacity
					activeOpacity={0.86}
					style={[styles.fabButton, applicationsMode && styles.fabButtonActive]}
					onPress={handleToggleApplicationsMode}
				>
					<Ionicons
						name="shield-checkmark"
						size={22}
						color={applicationsMode ? "#07130C" : "#334155"}
					/>
				</TouchableOpacity>
			</Animated.View>

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
				<>
					<TouchableOpacity
						activeOpacity={1}
						style={styles.filtersBackdrop}
						onPress={() => setFiltersVisible(false)}
					/>

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
											key={`safra-${option}`}
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

								{safraOptions.length === 0 && (
									<View style={styles.filterChipDisabled}>
										<Text style={styles.filterChipDisabledText}>Sem safra disponível</Text>
									</View>
								)}
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
									const normalizedOption = normalizeCiclo(option);
									const isSelected = normalizeCiclo(selectedCiclo) === normalizedOption;

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

								{cicloOptions.length === 0 && (
									<View style={styles.filterChipDisabled}>
										<Text style={styles.filterChipDisabledText}>Sem ciclo disponível</Text>
									</View>
								)}
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
							<View style={styles.filterSection}>
								<Text style={styles.filterLabel}>Cultura</Text>

								<ScrollView
									horizontal
									showsHorizontalScrollIndicator={false}
									contentContainerStyle={styles.chipsRow}
								>
									{cultureOptions.map((culture) => {
										const isSelected = selectedCulture === culture;

										return (
											<TouchableOpacity
												key={`culture-${culture}`}
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

						{varietyOptions.length > 0 && (
							<View style={styles.filterSectionLast}>
								<Text style={styles.filterLabel}>Variedade</Text>

								<ScrollView
									horizontal
									showsHorizontalScrollIndicator={false}
									contentContainerStyle={styles.chipsRow}
								>
									{varietyOptions.map((variety) => {
										const isSelected = selectedVariety === variety;

										return (
											<TouchableOpacity
												key={`variety-${variety}`}
												activeOpacity={0.82}
												onPress={() => handleToggleVariety(variety)}
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
													{variety}
												</Text>
											</TouchableOpacity>
										);
									})}
								</ScrollView>
							</View>
						)}
					</View>
				</>
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
				<View style={[styles.selectionCounter, { bottom: selectionCounterBottom }]}>
					<View style={styles.selectionCounterPill}>
						<Text style={styles.selectionCounterPillText}>
							{selectedParcels.length}
						</Text>
					</View>

					<View style={styles.selectionCounterContent}>
						<Text style={styles.selectionCounterLabel}>
							Área selecionada
						</Text>

						<Text style={styles.selectionCounterValue}>
							{formatHa(selectedAreaTotal)}
						</Text>
					</View>

					<TouchableOpacity
						activeOpacity={0.82}
						onPress={() => dispatch(geralActions.clearNavigationMapSelectedParcels())}
						style={styles.selectionCounterClearButton}
					>
						<Ionicons name="close" size={16} color="#FFFFFF" />
					</TouchableOpacity>
				</View>
			) : null}

			{!showOperationalSheet && !applicationsParcel && (
				<View style={styles.mapFilterFooter}>
					<Text style={styles.mapFilterFooterText} numberOfLines={1}>
						{selectedSafra || "—"} · {selectedCiclo || "—"}
					</Text>
				</View>
			)}

			{showOperationalSheet && !applicationsParcel && (
				<Animated.View
					style={[
						styles.bottomSheet,
						{
							height: sheetHeight,
						},
					]}
				>
					<View
						style={styles.sheetHandleArea}
						{...sheetPanResponder.panHandlers}
					>
						<View style={styles.sheetHandle} />

						<View style={styles.sheetHeader}>
							<View>
								<Text style={styles.sheetTitle}>Mapa operacional</Text>
								<Text style={styles.sheetSubtitle}>
									Safra {selectedSafra || "—"} · Ciclo {selectedCiclo || "—"}
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
					</View>

					{sheetExpanded && (
						<ScrollView
							showsVerticalScrollIndicator={false}
							contentContainerStyle={styles.sheetScrollContent}
						>
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
													{
														backgroundColor: getItemBaseColors(item).fillColor || "#CBD5E1",
														borderWidth: getItemBaseColors(item).fillColor === "#FFFFFF" ? 1 : 0,
														borderColor: "rgba(15,23,42,0.22)",
													},
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
						</ScrollView>
					)}
				</Animated.View>
			)}

			<ParcelApplicationsSheet
				visible={applicationsMode && !!applicationsParcel}
				parcel={applicationsParcel}
				data={applicationsData}
				loading={applicationsLoading}
				error={applicationsError}
				expanded={applicationsSheetExpanded}
				onToggleExpanded={() =>
					setApplicationsSheetExpanded((current) => !current)
				}
				onClose={() => {
					setApplicationsParcel(null);
					setApplicationsData(null);
					setApplicationsError(null);
					setApplicationsSheetExpanded(false);
				}}
			/>
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
		alignSelf: "center",
		zIndex: 23,
		minHeight: 58,
		maxWidth: "82%",
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "rgba(255,255,255,0.96)",
		borderRadius: 999,
		paddingVertical: 8,
		paddingLeft: 9,
		paddingRight: 10,
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.08)",
		shadowColor: "#000",
		shadowOpacity: 0.18,
		shadowRadius: 16,
		shadowOffset: { width: 0, height: 8 },
		elevation: 8,
	},

	selectionCounterIcon: {
		width: 38,
		height: 38,
		borderRadius: 19,
		backgroundColor: Colors.primary[700],
		alignItems: "center",
		justifyContent: "center",
		marginRight: 10,
	},

	selectionCounterContent: {
		flexShrink: 1,
		paddingRight: 8,
	},

	selectionCounterLabel: {
		color: "rgba(15,23,42,0.52)",
		fontSize: 10.5,
		fontWeight: "900",
		textTransform: "uppercase",
		letterSpacing: 0.5,
	},

	selectionCounterValue: {
		marginTop: 1,
		color: "#0F172A",
		fontSize: 16,
		fontWeight: "950",
	},

	selectionCounterPill: {
		minWidth: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: "rgba(15,23,42,0.06)",
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 9,
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.06)",
	},

	selectionCounterPillText: {
		color: Colors.primary[800],
		fontSize: 13,
		fontWeight: "950",
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
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: "rgba(255,255,255,0.97)",
		borderTopLeftRadius: 28,
		borderTopRightRadius: 28,
		paddingHorizontal: 14,
		paddingTop: 8,
		paddingBottom: Platform.OS === "ios" ? 22 : 14,
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.08)",
		shadowColor: "#000",
		shadowOpacity: 0.18,
		shadowRadius: 20,
		shadowOffset: { width: 0, height: -8 },
		elevation: 12,
		overflow: "hidden",
	},

	sheetHandleArea: {
		paddingTop: 0,
		paddingBottom: 10,
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
	},

	sheetHeaderRight: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},

	sheetScrollContent: {
		paddingBottom: 14,
	},

	filterChipDisabled: {
		borderRadius: 999,
		paddingHorizontal: 12,
		paddingVertical: 8,
		backgroundColor: "rgba(255,255,255,0.04)",
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.08)",
		opacity: 0.55,
	},

	filterChipDisabledText: {
		color: "rgba(255,255,255,0.42)",
		fontSize: 12,
		fontWeight: "900",
	},
	filtersBackdrop: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		zIndex: 18,
		backgroundColor: "transparent",
	},
	fabColumnLeft: {
		position: "absolute",
		left: 14,
		zIndex: 22,
		gap: 10,
	},

	fabColumnRight: {
		position: "absolute",
		right: 14,
		zIndex: 22,
		gap: 10,
	},
	mapFilterFooter: {
		position: "absolute",
		bottom: Platform.OS === "ios" ? 24 : 16,
		alignSelf: "center",
		zIndex: 21,
		minHeight: 42,
		borderRadius: 999,
		backgroundColor: "rgba(10,16,12,0.82)",
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.12)",
		paddingHorizontal: 18,
		paddingVertical: 10,
		alignItems: "center",
		justifyContent: "center",
		shadowColor: "#000",
		shadowOpacity: 0.18,
		shadowRadius: 16,
		shadowOffset: { width: 0, height: 8 },
		elevation: 8,
	},

	mapFilterFooterText: {
		color: "#FFFFFF",
		fontSize: 13,
		fontWeight: "900",
		letterSpacing: 0.2,
	},
	selectionCounterClearButton: {
		width: 34,
		height: 34,
		borderRadius: 17,
		backgroundColor: "rgba(239,68,68,0.95)",
		alignItems: "center",
		justifyContent: "center",
		marginLeft: 8,
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.55)",
		shadowColor: "#000",
		shadowOpacity: 0.16,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 4 },
		elevation: 4,
	},
	selectionCounter: {
		position: "absolute",
		alignSelf: "center",
		zIndex: 23,
		minHeight: 58,
		maxWidth: "86%",
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "rgba(255,255,255,0.96)",
		borderRadius: 999,
		paddingVertical: 8,
		paddingLeft: 10,
		paddingRight: 10,
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.08)",
		shadowColor: "#000",
		shadowOpacity: 0.18,
		shadowRadius: 16,
		shadowOffset: { width: 0, height: 8 },
		elevation: 8,
	},

	selectionCounterPill: {
		minWidth: 38,
		height: 38,
		borderRadius: 19,
		backgroundColor: Colors.primary[700],
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 10,
		marginRight: 10,
	},

	selectionCounterPillText: {
		color: "#FFFFFF",
		fontSize: 14,
		fontWeight: "950",
	},

	selectionCounterContent: {
		flexShrink: 1,
		paddingRight: 8,
	},

	selectionCounterLabel: {
		color: "rgba(15,23,42,0.52)",
		fontSize: 10.5,
		fontWeight: "900",
		textTransform: "uppercase",
		letterSpacing: 0.5,
	},

	selectionCounterValue: {
		marginTop: 1,
		color: "#0F172A",
		fontSize: 16,
		fontWeight: "950",
	},

	selectionCounterClearButton: {
		width: 34,
		height: 34,
		borderRadius: 17,
		backgroundColor: "rgba(15,23,42,0.82)",
		alignItems: "center",
		justifyContent: "center",
		marginLeft: 4,
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.18)",
	},

});