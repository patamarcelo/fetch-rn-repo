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
	Image,
	Dimensions
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
	selectNavigationMapFilterSelected,
} from "../../store/redux/selector";

import { fetchParcelApplications } from "../../services/navigationApplicationsApi";
import ParcelApplicationsSheet from "./ParcelApplicationsSheet";

import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as XLSX from "xlsx";


const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const DEFAULT_REGION = {
	latitude: -10.85,
	longitude: -49.85,
	latitudeDelta: 0.25,
	longitudeDelta: 0.25,
};


const CULTURE_ICONS = {
	feijao: require("../../utils/assets/icons/beans2.png"),
	"feijão": require("../../utils/assets/icons/beans2.png"),
	arroz: require("../../utils/assets/icons/rice.png"),
	soja: require("../../utils/assets/icons/soy.png"),
};

const getCultureIconSource = (culture) => {
	const key = normalizeVarietyName(culture);

	return CULTURE_ICONS[key] || require("../../utils/assets/icons/question.png");
};

const formatDateBr = (value) => {
	if (!value) return "—";

	const raw = String(value);

	if (raw.includes("/")) return raw;

	const [year, month, day] = raw.split("-");

	if (!year || !month || !day) return raw;

	return `${day}/${month}/${year}`;
};

const getWeightKg = (item) => {
	return (
		item?.peso_kg ??
		item?.peso ??
		item?.peso_total_kg ??
		item?.peso_colheita_kg ??
		null
	);
};

const getWeightScs = (item) => {
	return (
		item?.peso_scs ??
		item?.peso_sacas ??
		item?.sacas ??
		item?.peso_sc ??
		null
	);
};

const getProductivityValue = (item) => {
	return (
		item?.produtividade ??
		item?.produtividade_scs_ha ??
		item?.produtividade_sc_ha ??
		item?.produtividade_ha ??
		null
	);
};

const InfoMiniMetric = ({ label, value, icon, highlight }) => {
	return (
		<View style={[styles.infoMiniMetric, highlight && styles.infoMiniMetricHighlight]}>
			<View style={styles.infoMiniMetricHeader}>
				{!!icon && (
					<Ionicons
						name={icon}
						size={13}
						color={highlight ? Colors.primary[800] : Colors.primary[700]}
					/>
				)}
				<Text style={[styles.infoMiniMetricLabel, highlight && styles.infoMiniMetricLabelHighlight]}>
					{label}
				</Text>
			</View>

			<Text style={[styles.infoMiniMetricValue, highlight && styles.infoMiniMetricValueHighlight]} numberOfLines={1}>
				{value}
			</Text>
		</View>
	);
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

const getDaysBetweenToday = (dateValue) => {
	if (!dateValue) return null;

	const [year, month, day] = String(dateValue).split("-").map(Number);

	if (!year || !month || !day) return null;

	const startDate = new Date(year, month - 1, day);
	const today = new Date();

	startDate.setHours(0, 0, 0, 0);
	today.setHours(0, 0, 0, 0);

	const diffMs = today.getTime() - startDate.getTime();
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

	if (Number.isNaN(diffDays) || diffDays < 0) return null;

	return diffDays;
};

const getParcelDap = (item) => {
	const directDap =
		item?.dapToday ??
		item?.dap_today ??
		item?.dap ??
		null;

	if (directDap !== null && directDap !== undefined && !Number.isNaN(Number(directDap))) {
		return Number(directDap);
	}

	return getDaysBetweenToday(item?.data_plantio);
};

const MapParcelLabel = memo(function MapParcelLabel({
	parcela,
	area,
	cultureText,
	status,
	statusLabel,
	dap,
	isSelected,
	showDetails,
}) {
	const shouldShowDap = status === "plantado" && dap !== null && dap !== undefined;
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

			{shouldShowDap ? (
				<Text style={styles.labelStatus} numberOfLines={1}>
					{dap} DAP
				</Text>
			) : !!statusLabel && isSelected ? (
				<Text style={styles.labelStatus} numberOfLines={1}>
					{statusLabel}
				</Text>
			) : null}
		</View>
	);
});

const ParcelInfoCard = ({ item, onClose, onSelect, isSelected }) => {
	if (!item) return null;

	const culture = item?.cultura || "—";
	const variety = item?.variedade || item?.variedade_nome || "—";
	const cultureIcon = getCultureIconSource(culture);

	const plantioDate = item?.data_plantio || item?.data_prevista_plantio || null;
	const colheitaDate =
		item?.data_colheita ||
		item?.data_prevista_colheita ||
		item?.harvestPredictionDate ||
		null;

	const pesoKg = getWeightKg(item);
	const pesoScs = getWeightScs(item);
	const produtividade = getProductivityValue(item);

	const dapValue = getParcelDap(item);

	return (
		<View style={styles.infoCard}>
			<View style={styles.infoHeader}>
				<View style={styles.infoTitleBox}>
					<View style={styles.infoTitleRow}>
						<View style={styles.infoCultureIconBox}>
							<Image
								source={cultureIcon}
								style={styles.infoCultureIcon}
								resizeMode="contain"
							/>
						</View>

						<View style={styles.infoTitleTextBox}>
							<Text style={styles.infoTitle}>Parcela {item.parcela || "—"}</Text>

							<Text style={styles.infoSubtitle} numberOfLines={1}>
								{item.projeto || "Projeto não informado"}
							</Text>
						</View>
					</View>
				</View>

				<TouchableOpacity activeOpacity={0.82} onPress={onClose} style={styles.infoClose}>
					<Ionicons name="close" size={18} color="#0F172A" />
				</TouchableOpacity>
			</View>

			<View style={styles.infoCropBanner}>
				<View style={styles.infoCropRow}>
					<View style={styles.infoCropTextBox}>
						<Text style={styles.infoCropLabel}>Cultura</Text>
						<Text style={styles.infoCropValue} numberOfLines={1}>
							{culture}
						</Text>
					</View>

					<View style={styles.infoCropDivider} />

					<View style={styles.infoCropTextBox}>
						<Text style={styles.infoCropLabel}>Variedade</Text>
						<Text style={styles.infoCropValue} numberOfLines={1}>
							{variety}
						</Text>
					</View>
				</View>

				<View style={styles.infoCropMetaRow}>
					<View style={styles.infoCropMetaPill}>
						<Ionicons name="leaf-outline" size={12} color={Colors.primary[700]} />
						<Text style={styles.infoCropMetaText}>
							Safra {item?.safra || "—"}
						</Text>
					</View>

					<View style={styles.infoCropMetaPill}>
						<Ionicons name="repeat-outline" size={12} color={Colors.primary[700]} />
						<Text style={styles.infoCropMetaText}>
							Ciclo {item?.ciclo || "—"}
						</Text>
					</View>
				</View>
			</View>

			<View style={styles.infoGrid}>
				<View style={styles.infoMetric}>
					<Text style={styles.infoMetricLabel}>Área</Text>
					<Text style={styles.infoMetricValue}>{formatHa(item.area)}</Text>
				</View>

				<View style={styles.infoMetric}>
					<Text style={styles.infoMetricLabel}>Status</Text>
					<Text style={styles.infoMetricValue}>
						{item.status_label || item.status || "—"}
					</Text>
				</View>
			</View>

			<View style={styles.infoSection}>
				<Text style={styles.infoSectionTitle}>Datas</Text>

				<View style={styles.infoMiniGrid}>
					<InfoMiniMetric
						label="Plantio"
						value={formatDateBr(plantioDate)}
						icon="calendar-outline"
					/>

					<InfoMiniMetric
						label="Colheita"
						value={formatDateBr(colheitaDate)}
						icon="flag-outline"
					/>

					<InfoMiniMetric
						label="DAP"
						value={dapValue !== null && dapValue !== undefined ? `${dapValue} dias` : "—"}
						icon="time-outline"
					/>
				</View>
			</View>

			<View style={styles.infoSection}>
				<Text style={styles.infoSectionTitle}>Pesos e produtividade</Text>

				<View style={styles.infoMiniGrid}>
					<InfoMiniMetric
						label="Peso"
						value={`${formatNumber(pesoKg, 2)} kg`}
						icon="scale-outline"
					/>

					<InfoMiniMetric
						label="Peso scs"
						value={`${formatNumber(pesoScs, 2)} scs`}
						icon="cube-outline"
					/>

					<InfoMiniMetric
						label="Produtividade"
						value={
							produtividade !== null && produtividade !== undefined
								? formatNumber(produtividade, 2)
								: "—"
						}
						icon="trending-up-outline"
						highlight
					/>
				</View>
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

	const persistedFilters = useSelector(selectNavigationMapFilterSelected);

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

	const [selectedStatus, setSelectedStatus] = useState(
		Array.isArray(persistedFilters?.status) ? persistedFilters.status : []
	);

	const [selectedCultures, setSelectedCultures] = useState(
		Array.isArray(persistedFilters?.cultura) ? persistedFilters.cultura : []
	);

	const [selectedVarieties, setSelectedVarieties] = useState(
		Array.isArray(persistedFilters?.variedade) ? persistedFilters.variedade : []
	);

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

	const [operationalFocusedProjects, setOperationalFocusedProjects] = useState([]);




	const COLLAPSED_SHEET_HEIGHT = Platform.OS === "ios" ? 148 : 136;

	const EXPANDED_SHEET_HEIGHT = Math.min(
		SCREEN_HEIGHT * 0.56,
		Platform.OS === "ios" ? 470 : 440
	);



	const sheetHeight = useRef(new Animated.Value(COLLAPSED_SHEET_HEIGHT)).current;
	const [sheetExpanded, setSheetExpanded] = useState(false);


	const FAB_BOTTOM_WITH_SHEET_COLLAPSED = Platform.OS === "ios" ? 166 : 154;
	const FAB_BOTTOM_WITH_SHEET_EXPANDED = EXPANDED_SHEET_HEIGHT + 22;
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
		dispatch(
			geralActions.setNavigationMapFiltersSelected({
				cultura: selectedCultures,
				variedade: selectedVarieties,
				status: selectedStatus,
			})
		);
	}, [
		dispatch,
		selectedFarmParam,
		selectedProjectLocal,
		selectedCultures,
		selectedVarieties,
		selectedStatus,
	]);

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
		const rows = Array.isArray(navigationMapFiltersIndex) && navigationMapFiltersIndex.length > 0
			? navigationMapFiltersIndex
			: navigationMapData;

		return rows.filter((item) => {
			if (selectedFarmParam && item.fazenda_grupo !== selectedFarmParam) {
				return false;
			}

			if (selectedProjectLocal && item.projeto !== selectedProjectLocal) {
				return false;
			}

			return true;
		});
	}, [
		navigationMapFiltersIndex,
		navigationMapData,
		selectedFarmParam,
		selectedProjectLocal,
	]);

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


	const contextFilterBase = useMemo(() => {
		return {
			fazenda: selectedFarmParam || null,
			projeto: selectedProjectLocal || null,
			safra: selectedSafra || null,
			ciclo: selectedCiclo || null,
			culturas: selectedCultures,
			variedades: selectedVarieties,
		};
	}, [
		selectedFarmParam,
		selectedProjectLocal,
		selectedSafra,
		selectedCiclo,
		selectedCultures,
		selectedVarieties,
	]);

	useEffect(() => {
		const hasFiltersIndex =
			Array.isArray(navigationMapFiltersIndex) &&
			navigationMapFiltersIndex.length > 0;

		const hasData =
			Array.isArray(navigationMapData) && navigationMapData.length > 0;

		const isLoading = navigationMapStatus === "pending";
		const hasSelectedContext = !!selectedSafra && !!selectedCiclo;

		if (!hasFiltersIndex && !hasData && !isLoading && !hasSelectedContext) {
			dispatch(fetchNavigationMapData({}));
		}
	}, [
		dispatch,
		navigationMapFiltersIndex,
		navigationMapData,
		navigationMapStatus,
		selectedSafra,
		selectedCiclo,
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

						if (selectedCultures.length > 0) {
							const itemCulture = normalizeTextFilter(item.cultura);
							const matchesCulture = selectedCultures.some(
								(culture) => normalizeTextFilter(culture) === itemCulture
							);

							if (!matchesCulture) return false;
						}

						return true;
					})
					.map((item) => String(item.variedade || item.variedade_nome || "").trim())
					.filter(Boolean)
			),
		].sort((a, b) => String(a).localeCompare(String(b)));
	}, [filterIndexRows, selectedSafra, selectedCiclo, selectedCultures]);

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
		setSelectedCultures((current) =>
			current.filter((culture) => cultureOptions.includes(culture))
		);
	}, [cultureOptions]);

	useEffect(() => {
		setSelectedVarieties((current) =>
			current.filter((variety) => varietyOptions.includes(variety))
		);
	}, [varietyOptions]);

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


	const lastFetchKeyRef = useRef(null);

	useEffect(() => {
		dispatch(
			geralActions.setNavigationMapCurrentFilter({
				safra: selectedSafra,
				ciclo: selectedCiclo,
			})
		);

		if (!selectedSafra || !selectedCiclo) return;

		const key = `${selectedSafra}__${normalizeCiclo(selectedCiclo)}`;

		if (lastFetchKeyRef.current === key) return;

		lastFetchKeyRef.current = key;

		console.log("FETCH MAPA POR SAFRA/CICLO ONLINE", {
			safra: selectedSafra,
			ciclo: selectedCiclo,
		});

		dispatch(fetchNavigationMapData({
			safra: selectedSafra,
			ciclo: selectedCiclo,
		}));
	}, [dispatch, selectedSafra, selectedCiclo]);


	const mapData = useMemo(() => {
		let data = [...navigationMapData];

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

		if (selectedCultures.length > 0) {
			data = data.filter((item) => {
				const itemCulture = normalizeTextFilter(item.cultura);

				return selectedCultures.some(
					(culture) => normalizeTextFilter(culture) === itemCulture
				);
			});
		}

		if (selectedVarieties.length > 0) {
			data = data.filter((item) => {
				const itemVariety = normalizeTextFilter(
					item.variedade || item.variedade_nome
				);

				return selectedVarieties.some(
					(variety) => normalizeTextFilter(variety) === itemVariety
				);
			});
		}

		return data;
	}, [
		navigationMapData,
		selectedSafra,
		selectedCiclo,
		selectedFarmParam,
		selectedProjectLocal,
		selectedStatus,
		selectedCultures,
		selectedVarieties,
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
			onStartShouldSetPanResponder: () => false,

			onMoveShouldSetPanResponder: (_, gestureState) => {
				return Math.abs(gestureState.dy) > 6;
			},

			onPanResponderTerminationRequest: () => false,

			onPanResponderRelease: (_, gestureState) => {
				if (gestureState.dy < -14) {
					expandSheet();
					return;
				}

				if (gestureState.dy > 14) {
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
				? 108
				: 96
			: floatingBottom;



	const visibleMapData = useMemo(() => {
		if (operationalFocusedProjects.length === 0) return mapData;

		return mapData.filter((item) =>
			operationalFocusedProjects.includes(item.projeto)
		);
	}, [mapData, operationalFocusedProjects]);

	const visibleTotalArea = useMemo(() => {
		return visibleMapData.reduce((total, item) => total + Number(item?.area || 0), 0);
	}, [visibleMapData]);

	const visibleProjects = useMemo(() => {
		return [
			...new Set(
				visibleMapData
					.map((item) => item?.projeto)
					.filter(Boolean)
			),
		];
	}, [visibleMapData]);


	const polygonsData = useMemo(() => {
		return visibleMapData
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
	}, [visibleMapData]);

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
		setInfoParcel(null);
		dispatch(geralActions.clearNavigationMapSelectedParcels());
	}, [dispatch, selectedSafra, selectedCiclo]);

	const totalArea = useMemo(() => {
		return mapData.reduce((total, item) => total + Number(item?.area || 0), 0);
	}, [mapData]);

	const selectedData = useMemo(() => {
		return visibleMapData.filter((item) => {
			const id = item?.id_farmbox || item?.id;
			return selectedParcels.includes(id);
		});
	}, [visibleMapData, selectedParcels]);

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
		selectedCultures.length > 0 ||
		selectedVarieties.length > 0 ||
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
		setSelectedCultures((current) => {
			if (current.includes(culture)) {
				return current.filter((item) => item !== culture);
			}

			return [...current, culture];
		});
	};

	const handleToggleVariety = (variety) => {
		setSelectedVarieties((current) => {
			if (current.includes(variety)) {
				return current.filter((item) => item !== variety);
			}

			return [...current, variety];
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

	const handleToggleOperationalProject = (projectNameValue) => {
		setOperationalFocusedProjects((current) => {
			if (current.includes(projectNameValue)) {
				return current.filter((item) => item !== projectNameValue);
			}

			return [...current, projectNameValue];
		});

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
		setSelectedCultures([]);
		setSelectedVarieties([]);
		setOperationalFocusedProjects([]);
		setSelectedProjectLocal(null);
		setInfoParcel(null);

		dispatch(geralActions.clearNavigationMapFilters());
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

	const appliedFiltersText = useMemo(() => {
		const filters = [];

		if (selectedProjectLocal) {
			filters.push(normalizeProjectName(selectedProjectLocal));
		}

		if (operationalFocusedProjects.length > 0) {
			filters.push(
				operationalFocusedProjects
					.map((project) => normalizeProjectName(project))
					.join(", ")
			);
		}

		if (selectedStatus.length > 0) {
			const labels = selectedStatus.map((statusKey) => {
				const found = statusOptions.find((option) => option.key === statusKey);
				return found?.label || statusKey;
			});

			filters.push(labels.join(", "));
		}

		if (selectedCultures.length > 0) {
			filters.push(selectedCultures.join(", "));
		}

		if (selectedVarieties.length > 0) {
			filters.push(selectedVarieties.join(", "));
		}

		if (filters.length === 0) {
			return "Sem filtros adicionais";
		}

		return filters.join(" · ");
	}, [selectedProjectLocal, selectedStatus, statusOptions, selectedCultures, selectedVarieties, operationalFocusedProjects]);


	const hasAppliedExtraFilters =
		!!selectedProjectLocal ||
		selectedStatus.length > 0 ||
		selectedCultures.length > 0 ||
		selectedVarieties.length > 0;

	const fabFilterOffset =
		hasAppliedExtraFilters && !showOperationalSheet && !applicationsParcel
			? 30
			: 0;


	useEffect(() => {
		const baseBottom =
			showOperationalSheet && !applicationsParcel
				? sheetExpanded
					? FAB_BOTTOM_WITH_SHEET_EXPANDED
					: FAB_BOTTOM_WITH_SHEET_COLLAPSED
				: FAB_BOTTOM_WITHOUT_SHEET;

		const nextBottom = baseBottom + fabFilterOffset;

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
		fabFilterOffset,
	]);


	useEffect(() => {
		if (operationalFocusedProjects.length === 0) return;

		const visibleIds = new Set(
			visibleMapData
				.map((item) => item?.id_farmbox || item?.id)
				.filter(Boolean)
		);

		const hasHiddenSelectedParcel = selectedParcels.some(
			(id) => !visibleIds.has(id)
		);

		if (hasHiddenSelectedParcel) {
			dispatch(geralActions.clearNavigationMapSelectedParcels());
		}
	}, [
		dispatch,
		operationalFocusedProjects,
		visibleMapData,
		selectedParcels,
	]);

	const operationalProjectData = useMemo(() => {
		if (operationalFocusedProjects.length === 0) return mapData;

		return mapData.filter((item) =>
			operationalFocusedProjects.includes(item.projeto)
		);
	}, [mapData, operationalFocusedProjects]);

	const operationalArea = useMemo(() => {
		return operationalProjectData.reduce(
			(total, item) => total + Number(item?.area || 0),
			0
		);
	}, [operationalProjectData]);

	const operationalSelectedCount = useMemo(() => {
		return operationalProjectData.filter((item) => {
			const id = item?.id_farmbox || item?.id;
			return selectedParcels.includes(id);
		}).length;
	}, [operationalProjectData, selectedParcels]);

	const operationalSelectedArea = useMemo(() => {
		return operationalProjectData.reduce((total, item) => {
			const id = item?.id_farmbox || item?.id;

			if (!selectedParcels.includes(id)) return total;

			return total + Number(item?.area || 0);
		}, 0);
	}, [operationalProjectData, selectedParcels]);


	const operationalParcelsByProject = useMemo(() => {
		const grouped = {};

		operationalProjectData.forEach((item) => {
			const project = item?.projeto || "Sem projeto";

			if (!grouped[project]) {
				grouped[project] = {
					project,
					area: 0,
					items: [],
				};
			}

			grouped[project].items.push(item);
			grouped[project].area += Number(item?.area || 0);
		});

		return Object.values(grouped).sort((a, b) =>
			String(a.project).localeCompare(String(b.project))
		);
	}, [operationalProjectData]);

	const operationalStickyHeaderIndices = useMemo(() => {
		// Dentro do ScrollView expandido:
		// 0 = header "Projetos"
		// 1 = cards de projetos
		// 2 = header "Parcelas"
		// 3 = header do primeiro projeto
		// 4 = grid do primeiro projeto
		// 5 = header do segundo projeto
		// 6 = grid do segundo projeto...
		return operationalParcelsByProject.map((_, index) => 3 + index * 2);
	}, [operationalParcelsByProject]);


	const buildSelectedParcelsReportRows = useCallback(() => {
		const selectedRows = mapData.filter((item) => {
			const id = item?.id_farmbox || item?.id;
			return selectedParcels.includes(id);
		});

		return selectedRows.map((item) => ({
			Projeto: item?.projeto || "",
			Fazenda: item?.fazenda_grupo || item?.fazenda || "",
			Parcela: item?.parcela || "",
			"ID FarmBox": item?.id_farmbox || "",
			Safra: item?.safra || "",
			Ciclo: item?.ciclo || "",
			Status: item?.status_label || item?.status || "",
			Cultura: item?.cultura || "",
			Variedade: item?.variedade || item?.variedade_nome || "",
			"Área ha": Number(item?.area || 0),
			"Data plantio": formatDateBr(item?.data_plantio || item?.data_prevista_plantio),
			"Data colheita": formatDateBr(
				item?.data_colheita ||
				item?.data_prevista_colheita ||
				item?.harvestPredictionDate
			),
			DAP: getParcelDap(item) ?? "",
			"Peso kg": getWeightKg(item) ?? "",
			"Peso scs": getWeightScs(item) ?? "",
			Produtividade: getProductivityValue(item) ?? "",
			Latitude:
				getCenterCoordinate(item)?.latitude ??
				getCoordinatesCenter(getPolygonCoordinates(item))?.latitude ??
				"",
			Longitude:
				getCenterCoordinate(item)?.longitude ??
				getCoordinatesCenter(getPolygonCoordinates(item))?.longitude ??
				"",
		}));
	}, [mapData, selectedParcels]);


	const handleExportSelectedParcelsReport = useCallback(async () => {
		try {
			const rows = buildSelectedParcelsReportRows();

			if (!rows.length) {
				Alert.alert(
					"Relatório",
					"Selecione pelo menos uma parcela para exportar."
				);
				return;
			}

			const worksheet = XLSX.utils.json_to_sheet(rows);

			const workbook = XLSX.utils.book_new();
			XLSX.utils.book_append_sheet(workbook, worksheet, "Parcelas");

			const base64 = XLSX.write(workbook, {
				type: "base64",
				bookType: "xlsx",
			});

			const safeDate = new Date()
				.toISOString()
				.slice(0, 19)
				.replace(/[-:T]/g, "");

			const filename = `relatorio_parcelas_${safeDate}.xlsx`;
			const fileUri = `${FileSystem.cacheDirectory}${filename}`;

			await FileSystem.writeAsStringAsync(fileUri, base64, {
				encoding: "base64",
			});

			const canShare = await Sharing.isAvailableAsync();

			if (!canShare) {
				Alert.alert(
					"Arquivo gerado",
					`Relatório salvo em: ${fileUri}`
				);
				return;
			}

			await Sharing.shareAsync(fileUri, {
				mimeType:
					"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
				dialogTitle: "Compartilhar relatório de parcelas",
				UTI: "com.microsoft.excel.xlsx",
			});
		} catch (error) {
			console.log("Erro ao exportar relatório de parcelas:", error);

			Alert.alert(
				"Erro ao exportar",
				"Não foi possível gerar o relatório das parcelas selecionadas."
			);
		}
	}, [buildSelectedParcelsReportRows]);

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
					const dapValue = getParcelDap(item);

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
								status={item.status}
								statusLabel={item.status_label}
								dap={dapValue}
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
						{visibleProjects.length} {visibleProjects.length === 1 ? "projeto" : "projetos"} ·{" "}
						{visibleMapData.length} parcelas · {formatHa(visibleTotalArea)}
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
					onPress={() => {
						setShowOperationalSheet((current) => {
							const next = !current;

							collapseSheet();

							return next;
						});
					}}
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
										const isSelected = selectedCultures.includes(culture);

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
										const isSelected = selectedVarieties.includes(variety);

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
			) : hasSelectedArea && !showOperationalSheet ? (
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
				<View style={styles.mapFooterStack}>
					<View style={styles.mapFilterFooter}>
						<Text style={styles.mapFilterFooterText} numberOfLines={1}>
							{selectedSafra || "—"} · {selectedCiclo || "—"}
						</Text>
					</View>

					<View style={styles.appliedFiltersFooter}>
						<Ionicons
							name="filter"
							size={10}
							color="rgba(255,255,255,0.72)"
						/>

						<Text style={styles.appliedFiltersFooterText} numberOfLines={1}>
							{appliedFiltersText}
						</Text>
					</View>
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
						<TouchableOpacity
							activeOpacity={0.88}
							onPress={sheetExpanded ? collapseSheet : expandSheet}
							style={styles.operationalHeaderPressable}
						>
							<View style={styles.sheetHandle}>
								<Ionicons
									name={sheetExpanded ? "chevron-down" : "chevron-up"}
									size={18}
									color="rgba(15,23,42,0.42)"
								/>

								{/* <View style={styles.sheetHandleBar} /> */}
							</View>

							<View style={styles.operationalHeader}>
								<View style={styles.operationalTitleBlock}>
									<View style={styles.operationalTitleRow}>
										<View style={styles.operationalIconBox}>
											<Ionicons
												name="albums-outline"
												size={18}
												color={Colors.primary[800]}
											/>
										</View>

										<View style={styles.operationalTitleTextBox}>
											<Text style={styles.sheetTitle}>Mapa operacional</Text>

											<Text style={styles.sheetSubtitle}>
												Safra {selectedSafra || "—"} · Ciclo {selectedCiclo || "—"}
											</Text>
											{operationalSelectedCount > 0 ? (
												<Text style={styles.operationalExportHint} numberOfLines={1}>
													Toque no ícone para exportar relatório
												</Text>
											) : null}
										</View>
									</View>
								</View>

								<View style={styles.sheetHeaderRight}>
									<TouchableOpacity
										activeOpacity={operationalSelectedCount > 0 ? 0.82 : 1}
										onPress={
											operationalSelectedCount > 0
												? handleExportSelectedParcelsReport
												: undefined
										}
										style={[
											styles.sheetBadge,
											operationalSelectedCount > 0 && styles.sheetBadgeExport,
										]}
									>
										{operationalSelectedCount > 0 ? (
											<View style={styles.sheetBadgeExportContent}>
												<Ionicons
													name="document-text-outline"
													size={16}
													color="#FFFFFF"
												/>

												<Text style={styles.sheetBadgeExportText}>
													{operationalSelectedCount}
												</Text>
											</View>
										) : (
											<Text style={styles.sheetBadgeText}>
												{operationalProjectData.length}
											</Text>
										)}
									</TouchableOpacity>

									<Ionicons
										name={sheetExpanded ? "chevron-down" : "chevron-up"}
										size={21}
										color="rgba(15,23,42,0.62)"
									/>
								</View>
							</View>

							<View style={styles.operationalSummaryRow}>
								<View style={styles.operationalSummaryItem}>
									<Text style={styles.operationalSummaryValue}>
										{operationalProjectData.length}
									</Text>
									<Text style={styles.operationalSummaryLabel}>Parcelas</Text>
								</View>

								<View
									style={[
										styles.operationalSummaryItem,
										operationalSelectedCount > 0 && styles.operationalSummaryItemSelected,
									]}
								>
									<Text
										style={[
											styles.operationalSummaryValue,
											operationalSelectedCount > 0 && styles.operationalSummaryValueSelected,
										]}
									>
										{formatHa(
											operationalSelectedCount > 0
												? operationalSelectedArea
												: operationalArea
										)}
									</Text>

									<Text
										style={[
											styles.operationalSummaryLabel,
											operationalSelectedCount > 0 && styles.operationalSummaryLabelSelected,
										]}
									>
										{operationalSelectedCount > 0 ? "Área selec." : "Área"}
									</Text>
								</View>

								<View
									style={[
										styles.operationalSummaryItem,
										operationalSelectedCount > 0 && styles.operationalSummaryItemSelected,
									]}
								>
									<Text
										style={[
											styles.operationalSummaryValue,
											operationalSelectedCount > 0 && styles.operationalSummaryValueSelected,
										]}
									>
										{operationalSelectedCount}
									</Text>
									<Text
										style={[
											styles.operationalSummaryLabel,
											operationalSelectedCount > 0 && styles.operationalSummaryLabelSelected,
										]}
									>
										Selecionadas
									</Text>
								</View>
							</View>
						</TouchableOpacity>
					</View>

					{sheetExpanded && (
						<ScrollView
							showsVerticalScrollIndicator={true}
							indicatorStyle="black"
							stickyHeaderIndices={operationalStickyHeaderIndices}
							contentContainerStyle={styles.sheetScrollContent}
						>
							<View style={styles.operationalSectionHeader}>
								<Text style={styles.operationalSectionTitle}>Projetos</Text>

								<Text style={styles.operationalSectionHint}>
									Toque para focar
								</Text>
							</View>

							<ScrollView
								horizontal
								showsHorizontalScrollIndicator={false}
								contentContainerStyle={styles.projectsRow}
							>
								<TouchableOpacity
									activeOpacity={0.84}
									onPress={() => setOperationalFocusedProjects([])}
									style={[
										styles.projectCard,
										operationalFocusedProjects.length === 0 && styles.projectCardSelected,
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

									const isSelected = operationalFocusedProjects.includes(project.projeto_nome);

									return (
										<TouchableOpacity
											key={`project-${project.projeto_id || project.projeto_nome}-${project.projeto_nome}`}
											activeOpacity={0.84}
											onPress={() => handleToggleOperationalProject(project.projeto_nome)}
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

							<View style={styles.operationalSectionHeader}>
								<Text style={styles.operationalSectionTitle}>Parcelas</Text>

								<Text style={styles.operationalSectionHint}>
									{operationalSelectedCount > 0
										? `${operationalSelectedCount} selecionada(s) · ${formatHa(operationalSelectedArea)}`
										: "Toque para selecionar"}
								</Text>
							</View>

							{operationalParcelsByProject.flatMap((group, groupIndex) => {
								const groupKey = `${group.project || "sem-projeto"}-${groupIndex}`;

								const groupSelectedCount = group.items.filter((item) => {
									const id = item?.id_farmbox || item?.id;
									return selectedParcels.includes(id);
								}).length;

								const groupSelectedArea = group.items.reduce((total, item) => {
									const id = item?.id_farmbox || item?.id;

									if (!selectedParcels.includes(id)) return total;

									return total + Number(item?.area || 0);
								}, 0);

								const header = (
									<View
										key={`operational-project-header-${groupKey}`}
										style={styles.parcelProjectStickyHeader}
									>
										<View style={styles.parcelProjectNameRow}>
											<Text
												style={styles.parcelProjectTitle}
												numberOfLines={1}
												ellipsizeMode="tail"
											>
												{normalizeProjectName(group.project)}
											</Text>
										</View>

										<Text
											style={[
												styles.parcelProjectRightMeta,
												groupSelectedCount > 0 && styles.parcelProjectRightMetaSelected,
											]}
											numberOfLines={1}
											ellipsizeMode="tail"
										>
											{groupSelectedCount > 0
												? `${groupSelectedCount} selec. · ${formatHa(groupSelectedArea)}`
												: `${group.items.length} parcelas · ${formatHa(group.area)}`}
										</Text>
									</View>
								);

								const grid = (
									<View
										key={`operational-project-grid-${groupKey}`}
										style={styles.parcelProjectGridBlock}
									>
										<View style={styles.parcelsGrid}>
											{group.items.slice(0, 120).map((item, itemIndex) => {
												const parcelId = item?.id_farmbox || item?.id;
												const isSelected = selectedParcels.includes(parcelId);
												const varietyText = item?.variedade || item?.variedade_nome || null;

												return (
													<TouchableOpacity
														key={`parcel-card-${groupKey}-${item.id || "id"}-${item.id_farmbox || "fb"}-${item.parcela || "parcela"}-${itemIndex}`}
														activeOpacity={0.86}
														onPress={() => handlePolygonPress(item)}
														style={styles.parcelGridCard}
													>
														<View
															style={[
																styles.parcelGridCardInner,
																isSelected && styles.parcelGridCardSelected,
															]}
														>
															<View style={styles.parcelGridTopRow}>
																<View
																	style={[
																		styles.parcelGridCultureIconBox,
																		isSelected && styles.parcelGridCultureIconBoxSelected,
																	]}
																>
																	<Image
																		source={getCultureIconSource(item?.cultura)}
																		style={styles.parcelGridCultureIcon}
																		resizeMode="contain"
																	/>
																</View>

																<Text
																	style={[
																		styles.parcelGridName,
																		isSelected && styles.parcelGridNameSelected,
																	]}
																	numberOfLines={1}
																>
																	{item.parcela || "—"}
																</Text>

																{isSelected ? (
																	<Ionicons
																		name="checkmark-circle"
																		size={15}
																		color="#FFFFFF"
																	/>
																) : null}
															</View>

															<Text
																style={[
																	styles.parcelGridArea,
																	isSelected && styles.parcelGridAreaSelected,
																]}
																numberOfLines={1}
															>
																{formatHa(item.area)}
															</Text>

															<Text
																style={[
																	styles.parcelGridCulture,
																	isSelected && styles.parcelGridCultureSelected,
																]}
																numberOfLines={1}
															>
																{varietyText || item.status_label || "Sem variedade"}
															</Text>
														</View>
													</TouchableOpacity>
												);
											})}
										</View>

										{group.items.length > 120 ? (
											<Text style={styles.parcelLimitText}>
												Mostrando 120 de {group.items.length} parcelas neste projeto.
											</Text>
										) : null}
									</View>
								);

								return [header, grid];
							})}

							{operationalProjectData.length > 120 ? (
								<Text style={styles.parcelLimitText}>
									Mostrando 120 de {operationalProjectData.length} parcelas.
								</Text>
							) : null}
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
		left: 10,
		right: 10,
		zIndex: 23,
	},

	infoCard: {
		backgroundColor: "rgba(255,255,255,0.97)",
		borderRadius: 24,
		padding: 13,
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
		backgroundColor: "#F1F5F9",
		borderTopLeftRadius: 30,
		borderTopRightRadius: 30,
		// paddingHorizontal: 14,
		paddingTop: 9,
		paddingBottom: Platform.OS === "ios" ? 0 : 16,
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.10)",
		shadowColor: "#000",
		shadowOpacity: 0.22,
		shadowRadius: 24,
		shadowOffset: { width: 0, height: -10 },
		elevation: 14,
		overflow: "hidden",
	},

	sheetHandleArea: {
		paddingTop: 0,
		paddingBottom: 10,
		paddingHorizontal: 14,
	},

	sheetHandle: {
		alignSelf: "center",
		width: 42,
		height: 5,
		borderRadius: 999,
		backgroundColor: "rgba(15,23,42,0.16)",
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
		paddingHorizontal: 14,
		paddingBottom: Platform.OS === "ios" ? 16 : 12,
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
	mapFooterStack: {
		position: "absolute",
		bottom: Platform.OS === "ios" ? 18 : 12,
		alignSelf: "center",
		zIndex: 21,
		alignItems: "center",
		gap: 5,
		maxWidth: "86%",
	},

	mapFilterFooter: {
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

	appliedFiltersFooter: {
		maxWidth: "100%",
		minHeight: 25,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 5,
		borderRadius: 999,
		backgroundColor: "rgba(10,16,12,0.62)",
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.10)",
		paddingHorizontal: 10,
		paddingVertical: 5,
	},

	appliedFiltersFooterText: {
		flexShrink: 1,
		color: "rgba(255,255,255,0.74)",
		fontSize: 9.8,
		fontWeight: "800",
		letterSpacing: 0.15,
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
	infoTitleRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
	},

	infoTitleTextBox: {
		flex: 1,
	},

	infoCultureIconBox: {
		width: 42,
		height: 42,
		borderRadius: 16,
		backgroundColor: "rgba(22,101,52,0.10)",
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 1,
		borderColor: "rgba(22,101,52,0.12)",
	},

	infoCultureIcon: {
		width: 27,
		height: 27,
	},

	infoCropBanner: {
		backgroundColor: "rgba(22,101,52,0.08)",
		borderRadius: 18,
		paddingHorizontal: 12,
		paddingVertical: 10,
		borderWidth: 1,
		borderColor: "rgba(22,101,52,0.12)",
		marginBottom: 10,
	},

	infoCropTextBox: {
		flex: 1,
	},

	infoCropLabel: {
		color: "rgba(15,23,42,0.46)",
		fontSize: 10,
		fontWeight: "900",
		textTransform: "uppercase",
		letterSpacing: 0.6,
	},

	infoCropValue: {
		marginTop: 2,
		color: "#0F172A",
		fontSize: 13,
		fontWeight: "950",
	},

	infoCropDivider: {
		width: 1,
		height: 30,
		backgroundColor: "rgba(15,23,42,0.10)",
		marginHorizontal: 10,
	},

	infoSection: {
		marginTop: 12,
	},

	infoSectionTitle: {
		color: "rgba(15,23,42,0.50)",
		fontSize: 10,
		fontWeight: "950",
		textTransform: "uppercase",
		letterSpacing: 0.7,
		marginBottom: 7,
	},

	infoMiniGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
	},

	infoMiniMetric: {
		width: "31.5%",
		minHeight: 62,
		backgroundColor: "rgba(15,23,42,0.045)",
		borderRadius: 15,
		paddingHorizontal: 9,
		paddingVertical: 9,
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.055)",
	},



	infoMiniMetricHeader: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		marginBottom: 5,
	},

	infoMiniMetricLabel: {
		color: "rgba(15,23,42,0.48)",
		fontSize: 9,
		fontWeight: "950",
		textTransform: "uppercase",
		letterSpacing: 0.35,
	},



	infoMiniMetricValue: {
		color: "#0F172A",
		fontSize: 12,
		fontWeight: "950",
	},

	infoMiniMetricHighlight: {
		backgroundColor: "rgba(34,197,94,0.12)",
		borderColor: "rgba(22,163,74,0.22)",
	},

	infoMiniMetricLabelHighlight: {
		color: Colors.primary[800],
	},

	infoMiniMetricValueHighlight: {
		color: Colors.primary[900],
	},

	infoCropRow: {
		flexDirection: "row",
		alignItems: "center",
	},

	infoCropMetaRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		marginTop: 10,
		paddingTop: 9,
		borderTopWidth: 1,
		borderTopColor: "rgba(15,23,42,0.08)",
	},

	infoCropMetaPill: {
		flexDirection: "row",
		alignItems: "center",
		gap: 5,
		backgroundColor: "rgba(255,255,255,0.72)",
		borderRadius: 999,
		paddingHorizontal: 9,
		paddingVertical: 5,
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.06)",
	},

	infoCropMetaText: {
		color: Colors.primary[800],
		fontSize: 10.5,
		fontWeight: "900",
	},

	operationalHeaderPressable: {
		borderRadius: 22,
	},

	operationalHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},

	operationalTitleBlock: {
		flex: 1,
		paddingRight: 10,
	},

	operationalTitleRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
	},

	operationalIconBox: {
		width: 38,
		height: 38,
		borderRadius: 15,
		backgroundColor: "rgba(34,197,94,0.12)",
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 1,
		borderColor: "rgba(34,197,94,0.18)",
	},

	operationalTitleTextBox: {
		flex: 1,
	},

	operationalSummaryRow: {
		marginTop: 12,
		flexDirection: "row",
		gap: 8,
	},

	operationalSummaryItem: {
		flex: 1,
		minHeight: 50,
		borderRadius: 15,
		backgroundColor: "rgba(15,23,42,0.045)",
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.06)",
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 6,
	},

	operationalSummaryItemSelected: {
		backgroundColor: "rgba(34,197,94,0.13)",
		borderColor: "rgba(22,163,74,0.24)",
	},

	operationalSummaryValue: {
		color: "#0F172A",
		fontSize: 13,
		fontWeight: "950",
		textAlign: "center",
	},

	operationalSummaryValueSelected: {
		color: Colors.primary[900],
	},

	operationalSummaryLabel: {
		marginTop: 2,
		color: "rgba(15,23,42,0.48)",
		fontSize: 9,
		fontWeight: "950",
		textTransform: "uppercase",
		textAlign: "center",
	},

	operationalSummaryLabelSelected: {
		color: Colors.primary[800],
	},

	operationalSectionHeader: {
		marginTop: 14,
		marginBottom: 8,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},

	operationalSectionTitle: {
		color: "#0F172A",
		fontSize: 12,
		fontWeight: "950",
		textTransform: "uppercase",
		letterSpacing: 0.6,
	},

	operationalSectionHint: {
		color: "rgba(15,23,42,0.48)",
		fontSize: 11,
		fontWeight: "850",
	},

	parcelsGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		marginHorizontal: -4,
		paddingBottom: 8,
	},

	parcelGridCard: {
		width: "33.333%",
		minHeight: 82,
		paddingHorizontal: 4,
		paddingBottom: 8,
	},

	parcelGridCardSelected: {
		backgroundColor: Colors.primary[700],
		borderColor: Colors.primary[700],
	},

	parcelGridTopRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 5,
	},

	parcelGridDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
	},

	parcelGridName: {
		flex: 1,
		color: "#0F172A",
		fontSize: 12,
		fontWeight: "950",
	},

	parcelGridNameSelected: {
		color: "#FFFFFF",
	},

	parcelGridArea: {
		marginTop: 7,
		color: Colors.primary[800],
		fontSize: 11.5,
		fontWeight: "950",
	},

	parcelGridAreaSelected: {
		color: "#FFFFFF",
	},

	parcelGridCulture: {
		marginTop: 3,
		color: "rgba(15,23,42,0.48)",
		fontSize: 9.5,
		fontWeight: "850",
	},

	parcelGridCultureSelected: {
		color: "rgba(255,255,255,0.78)",
	},

	parcelLimitText: {
		marginTop: 4,
		marginBottom: 10,
		color: "rgba(15,23,42,0.48)",
		fontSize: 10.5,
		fontWeight: "800",
		textAlign: "center",
	},

	parcelGridCard: {
		width: "33.333%",
		paddingHorizontal: 4,
		paddingBottom: 8,
	},

	parcelGridCardInner: {
		minHeight: 82,
		borderRadius: 16,
		backgroundColor: "rgba(15,23,42,0.045)",
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.07)",
		paddingHorizontal: 9,
		paddingVertical: 9,
	},

	parcelGridCardSelected: {
		backgroundColor: Colors.primary[700],
		borderColor: Colors.primary[700],
	},

	parcelProjectGroup: {
		marginTop: 4,
		marginBottom: 12,
	},

	parcelProjectHeader: {
		marginBottom: 8,
		paddingHorizontal: 2,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},

	parcelProjectTitleBox: {
		flex: 1,
		paddingRight: 10,
	},

	parcelProjectMeta: {
		marginTop: 2,
		color: "rgba(15,23,42,0.48)",
		fontSize: 10.5,
		fontWeight: "800",
	},

	parcelProjectBadge: {
		minWidth: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: "rgba(15,23,42,0.06)",
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 8,
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.07)",
	},

	parcelProjectBadgeText: {
		color: Colors.primary[800],
		fontSize: 12,
		fontWeight: "950",
	},
	operationalIconBoxExport: {
		backgroundColor: "#16A34A",
		borderColor: "#16A34A",
	},
	sheetBadgeExportContent: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
	},

	sheetBadgeExportText: {
		color: "#FFFFFF",
		fontSize: 12,
		fontWeight: "950",
	},

	sheetBadgeExport: {
		backgroundColor: "#16A34A",
		borderColor: "#16A34A",
		minWidth: 42,
	},

	operationalExportHint: {
		marginTop: 2,
		color: "#15803D",
		fontSize: 10.5,
		fontWeight: "900",
	},

	parcelProjectStickyHeader: {
		marginHorizontal: -14,
		paddingHorizontal: 14,
		paddingTop: 8,
		paddingBottom: 8,
		// minHeight: 44,
		backgroundColor: "#E2E8F0",
		borderBottomWidth: 1,
		borderBottomColor: "rgba(15,23,42,0.08)",
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		// gap: 10,
		zIndex: 5,
	},

	parcelProjectNameRow: {
		flex: 1,
		minWidth: 0,
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},

	parcelProjectIconBox: {
		width: 28,
		height: 28,
		borderRadius: 11,
		backgroundColor: "rgba(34,197,94,0.12)",
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 1,
		borderColor: "rgba(34,197,94,0.18)",
	},



	parcelProjectRightMeta: {
		flexShrink: 0,
		color: "rgba(15,23,42,0.56)",
		fontSize: 10.5,
		fontWeight: "900",
		textAlign: "right",
		includeFontPadding: false,
	},

	parcelProjectRightMetaSelected: {
		color: Colors.primary[800],
	},
	parcelProjectStickyHeader: {
		marginHorizontal: -14,
		paddingHorizontal: 14,
		paddingVertical: 6,
		backgroundColor: "#E2E8F0",
		borderBottomWidth: 1,
		borderBottomColor: "rgba(15,23,42,0.08)",
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		minHeight: 34,
	},

	parcelProjectNameRow: {
		flex: 1,
		minWidth: 0,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingRight: 10,
	},

	parcelProjectTitle: {
		flex: 1,
		minWidth: 0,
		color: "#0F172A",
		fontSize: 13,
		lineHeight: 0,
		fontWeight: "900",
		includeFontPadding: false,
		textAlignVertical: "center",
	},

	parcelProjectRightMeta: {
		flexShrink: 0,
		color: "rgba(15,23,42,0.58)",
		fontSize: 11,
		lineHeight: 16,
		fontWeight: "800",
		textAlign: "right",
		includeFontPadding: false,
		textAlignVertical: "center",
	},

	parcelProjectRightMetaSelected: {
		color: Colors.primary[800],
		fontWeight: "900",
	},
	parcelProjectGridBlock: {
		marginTop: 10
	},
	parcelGridCultureIconBox: {
		width: 22,
		height: 22,
		alignItems: "center",
		justifyContent: "center",
	},

	parcelGridCultureIconBoxSelected: {
		backgroundColor: "rgba(255,255,255,0.18)",
		borderColor: "rgba(255,255,255,0.25)",
	},

	parcelGridCultureIcon: {
		width: 15,
		height: 15,
	},
	sheetHandle: {
		alignSelf: "center",
		height: 18,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 10,
	},

	sheetHandleBar: {
		width: 42,
		height: 5,
		borderRadius: 999,
		backgroundColor: "rgba(15,23,42,0.16)",
		marginTop: -2,
	},

});