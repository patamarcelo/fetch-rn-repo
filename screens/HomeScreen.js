import {
	ActivityIndicator,
	View,
	Text,
	StyleSheet,
	FlatList,
	RefreshControl,
	Alert,
	Modal,
	Pressable,
	ScrollView,
	Animated,
	Easing,
	Platform
} from "react-native";

import Button from "../components/ui/Button";

import { EXPO_PUBLIC_REACT_APP_DJANGO_TOKEN } from "@env";

import { useDispatch, useSelector } from "react-redux";
import { geralActions } from "../store/redux/geral";
import { farmsSelected, selectDataPlantio } from "../store/redux/selector";

import { Colors } from "../constants/styles";
import IconButton from "../components/ui/IconButton";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { useEffect, useState, useLayoutEffect, useRef, useCallback, useMemo } from "react";

import FarmScreen from "./FarmsScreen";

import { LINK } from "../utils/api";

import { useScrollToTop } from "@react-navigation/native";



import formatDataServer from "../utils/data-program";
import CardListApp from "../components/HomeScreen/CardListApp";

import createAndPrintPDF from "../components/Global/PrintPage";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { formatNumberBr } from "../utils/format-helper";

import * as Haptics from "expo-haptics";

const INITIAL_FETCH_BODY = {
	safra: "2024/2025",
	ciclo: "1",
};


import {
	CUSTOM_TAB_BAR_TOTAL_HEIGHT,
	CUSTOM_TAB_BAR_CONTENT_PADDING,
	CUSTOM_TAB_BAR_FAB_BOTTOM,
} from "../constants/layout";

const normalizeText = (value) => {
	if (!value) return "";

	return String(value)
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.trim()
		.toLowerCase();
};

const getRawSafra = (item) => {
	return item?.dados?.safra || item?.safra || null;
};

const getRawCiclo = (item) => {
	const ciclo = item?.dados?.ciclo || item?.ciclo || null;

	if (ciclo === null || ciclo === undefined) return null;

	return String(ciclo);
};

const getRawCultura = (item) => {
	return item?.dados?.cultura || item?.cultura || null;
};

const getFormattedCultura = (item) => {
	return (
		item?.cultura ||
		item?.cultura__cultura ||
		item?.cultura_nome ||
		item?.nome_cultura ||
		item?.dados?.cultura ||
		item?.plantio?.cultura ||
		null
	);
};

const getRawVariedade = (item) => {
	return (
		item?.dados?.variedade ||
		item?.variedade ||
		item?.variedade_nome ||
		item?.nome_variedade ||
		item?.plantio?.variedade ||
		null
	);
};

const getFormattedVariedade = (item) => {
	return (
		item?.variedade ||
		item?.variedade_nome ||
		item?.nome_variedade ||
		item?.dados?.variedade ||
		item?.plantio?.variedade ||
		null
	);
};

const getRawEstagio = (item) => {
	return (
		item?.dados?.estagio ||
		item?.dados?.operacao ||
		item?.estagio ||
		item?.operacao ||
		item?.nome_operacao ||
		item?.programa?.estagio ||
		item?.plantio?.estagio ||
		null
	);
};

const getFormattedEstagio = (item) => {
	return (
		item?.estagio ||
		item?.operacao ||
		item?.nome_operacao ||
		item?.dados?.estagio ||
		item?.dados?.operacao ||
		item?.programa?.estagio ||
		item?.plantio?.estagio ||
		null
	);
};

const getUniqueSorted = (values = [], sortMode = "text") => {
	const unique = [...new Set(values.filter(Boolean).map(String))];

	if (sortMode === "number") {
		return unique.sort((a, b) => Number(a) - Number(b));
	}

	if (sortMode === "safra") {
		return unique.sort((a, b) => b.localeCompare(a));
	}

	return unique.sort((a, b) => a.localeCompare(b));
};

const getRawFilterOptions = (
	rawData = [],
	selectedFarm = null,
	selectedSafra = null,
	selectedCiclo = null,
	selectedCultura = null,
	selectedVariedade = null
) => {
	const safeData = Array.isArray(rawData) ? rawData : [];

	const farmFilteredData = selectedFarm
		? safeData.filter((item) => item?.fazenda === selectedFarm)
		: safeData;

	const baseFilteredData = farmFilteredData.filter((item) => {
		const matchesSafra = !selectedSafra || getRawSafra(item) === selectedSafra;
		const matchesCiclo = !selectedCiclo || getRawCiclo(item) === String(selectedCiclo);

		return matchesSafra && matchesCiclo;
	});

	const normalizedCultura = normalizeText(selectedCultura);

	const variedadeBaseData = baseFilteredData.filter((item) => {
		if (!selectedCultura) return true;

		return normalizeText(getRawCultura(item)) === normalizedCultura;
	});

	const normalizedVariedade = normalizeText(selectedVariedade);

	const estagioBaseData = variedadeBaseData.filter((item) => {
		if (!selectedVariedade) return true;

		return normalizeText(getRawVariedade(item)) === normalizedVariedade;
	});

	return {
		safras: getUniqueSorted(farmFilteredData.map(getRawSafra), "safra"),
		ciclos: getUniqueSorted(farmFilteredData.map(getRawCiclo), "number"),
		culturas: getUniqueSorted(baseFilteredData.map(getRawCultura), "text"),
		variedades: getUniqueSorted(variedadeBaseData.map(getRawVariedade), "text"),
		estagios: getUniqueSorted(estagioBaseData.map(getRawEstagio), "text"),
	};
};

const filterRawData = ({
	rawData = [],
	selectedFarm,
	selectedSafra,
	selectedCiclo,
	selectedCultura,
	selectedVariedade,
	selectedEstagios = [],
}) => {
	const normalizedCultura = normalizeText(selectedCultura);
	const normalizedVariedade = normalizeText(selectedVariedade);
	const normalizedEstagios = selectedEstagios.map(normalizeText);

	return rawData.filter((item) => {
		const matchesFarm = !selectedFarm || item?.fazenda === selectedFarm;
		const matchesSafra = !selectedSafra || getRawSafra(item) === selectedSafra;
		const matchesCiclo = !selectedCiclo || getRawCiclo(item) === String(selectedCiclo);

		const itemCultura = getRawCultura(item);
		const matchesCultura =
			!selectedCultura || normalizeText(itemCultura) === normalizedCultura;

		const itemVariedade = getRawVariedade(item);
		const matchesVariedade =
			!selectedVariedade || normalizeText(itemVariedade) === normalizedVariedade;

		const itemEstagio = getRawEstagio(item);
		const matchesEstagio =
			!selectedEstagios.length ||
			normalizedEstagios.includes(normalizeText(itemEstagio));

		return (
			matchesFarm &&
			matchesSafra &&
			matchesCiclo &&
			matchesCultura &&
			matchesVariedade &&
			matchesEstagio
		);
	});
};

const filterFormattedDataByFilters = (
	formattedData = [],
	selectedCultura,
	selectedVariedade,
	selectedEstagios = []
) => {
	if (!selectedCultura && !selectedVariedade && !selectedEstagios.length) {
		return formattedData;
	}

	const normalizedSelectedCultura = normalizeText(selectedCultura);
	const normalizedSelectedVariedade = normalizeText(selectedVariedade);
	const normalizedSelectedEstagios = selectedEstagios.map(normalizeText);

	return formattedData
		.map((card) => {
			const filteredApp = Array.isArray(card?.app)
				? card.app.filter((item) => {
					const matchesCultura =
						!selectedCultura ||
						normalizeText(getFormattedCultura(item)) === normalizedSelectedCultura;

					const matchesVariedade =
						!selectedVariedade ||
						normalizeText(getFormattedVariedade(item)) ===
						normalizedSelectedVariedade;

					const matchesEstagio =
						!selectedEstagios.length ||
						normalizedSelectedEstagios.includes(
							normalizeText(getFormattedEstagio(item))
						);

					return matchesCultura && matchesVariedade && matchesEstagio;
				})
				: [];

			return {
				...card,
				app: filteredApp,
			};
		})
		.filter((card) => card.app.length > 0);
};




const getItemDap = (item, fallbackText = "") => {
	const value =
		item?.dap ??
		item?.dados?.dap ??
		item?.prazo_dap ??
		item?.dados?.prazo_dap ??
		getNumberFromText(fallbackText);

	const numberValue = Number(value);

	return Number.isFinite(numberValue) ? numberValue : Number.MAX_SAFE_INTEGER;
};

const getItemProgramaText = (item, fallbackText = "") => {
	return String(
		item?.programa ||
		item?.nome_programa ||
		item?.dados?.programa ||
		item?.dados?.nome_programa ||
		item?.aplicacao ||
		item?.dados?.aplicacao ||
		fallbackText ||
		""
	);
};

const getProgramaNumberFromText = (value) => {
	const text = String(value || "");

	const afterDashMatch = text.match(/-\s*(\d+)/);

	if (afterDashMatch?.[1]) {
		return Number(afterDashMatch[1]);
	}

	const programaMatch = text.match(/programa\s*(\d+)/i);

	if (programaMatch?.[1]) {
		return Number(programaMatch[1]);
	}

	const firstNumberMatch = text.match(/\b(\d{1,3})\b/);

	if (firstNumberMatch?.[1]) {
		return Number(firstNumberMatch[1]);
	}

	return Number.MAX_SAFE_INTEGER;
};

const getItemProgramaNumber = (item, fallbackText = "") => {
	const programaText = getItemProgramaText(item, fallbackText);
	return getProgramaNumberFromText(programaText);
};

const getNumberFromText = (value) => {
	const match = String(value || "").match(/\d+/);
	return match?.[0] ? Number(match[0]) : Number.MAX_SAFE_INTEGER;
};

const getDapFromEstagioText = (value) => {
	const text = String(value || "");

	const diasMatch = text.match(/(\d+)\s*dias?/i);

	if (diasMatch?.[1]) {
		return Number(diasMatch[1]);
	}

	return getNumberFromText(text);
};

const getProgramaTextFromCard = (card) => {
	return String(
		card?.programa ||
		card?.nome_programa ||
		card?.dados?.programa ||
		card?.dados?.nome_programa ||
		card?.app?.[0]?.programa ||
		card?.app?.[0]?.nome_programa ||
		card?.app?.[0]?.dados?.programa ||
		card?.app?.[0]?.dados?.nome_programa ||
		card?.aplicacao ||
		card?.app?.[0]?.aplicacao ||
		""
	);
};

const getProgramaNumberFromProgramText = (value) => {
	const text = String(value || "");

	// Exemplo: "P25/26 - 08 Soja" => 8
	const afterDashMatch = text.match(/-\s*(\d+)/);

	if (afterDashMatch?.[1]) {
		return Number(afterDashMatch[1]);
	}

	// Exemplo: "Programa 08" => 8
	const programaMatch = text.match(/programa\s*(\d+)/i);

	if (programaMatch?.[1]) {
		return Number(programaMatch[1]);
	}

	return Number.MAX_SAFE_INTEGER;
};

const getEstagioOptionsFromFormattedData = (formattedData = []) => {
	const map = new Map();

	formattedData.forEach((card) => {
		if (!Array.isArray(card?.app)) return;

		const programaText = getProgramaTextFromCard(card);
		const programaNumber = getProgramaNumberFromProgramText(programaText);

		card.app.forEach((item) => {
			const estagio = getFormattedEstagio(item);

			if (!estagio) return;

			const currentData = {
				label: estagio,
				programaText,
				programaNumber,
				dap: getDapFromEstagioText(estagio),
			};

			const previousData = map.get(estagio);

			if (!previousData) {
				map.set(estagio, currentData);
				return;
			}

			const shouldReplace =
				currentData.programaNumber < previousData.programaNumber ||
				(currentData.programaNumber === previousData.programaNumber &&
					currentData.dap < previousData.dap);

			if (shouldReplace) {
				map.set(estagio, currentData);
			}
		});
	});

	return [...map.values()]
		.sort((a, b) => {
			if (a.programaNumber !== b.programaNumber) {
				return a.programaNumber - b.programaNumber;
			}

			const programaTextCompare = a.programaText.localeCompare(
				b.programaText,
				"pt-BR",
				{ numeric: true, sensitivity: "base" }
			);

			if (programaTextCompare !== 0) {
				return programaTextCompare;
			}

			if (a.dap !== b.dap) {
				return a.dap - b.dap;
			}

			return a.label.localeCompare(b.label, "pt-BR", {
				numeric: true,
				sensitivity: "base",
			});
		})
		.map((item) => item.label);
};

const getCardDap = (card) => {
	const value =
		card?.dap ??
		card?.dados?.dap ??
		card?.app?.[0]?.dap ??
		card?.app?.[0]?.dados?.dap ??
		card?.app?.[0]?.prazo_dap ??
		card?.app?.[0]?.dados?.prazo_dap ??
		0;

	const numberValue = Number(value);

	return Number.isFinite(numberValue) ? numberValue : 0;
};

const getCardProgramaText = (card) => {
	return String(
		card?.programa ||
		card?.nome_programa ||
		card?.dados?.programa ||
		card?.dados?.nome_programa ||
		card?.app?.[0]?.programa ||
		card?.app?.[0]?.nome_programa ||
		card?.app?.[0]?.dados?.programa ||
		card?.app?.[0]?.dados?.nome_programa ||
		card?.aplicacao ||
		card?.app?.[0]?.aplicacao ||
		""
	);
};

const getCardProgramaNumber = (card) => {
	const programaText = getCardProgramaText(card);

	// Prioriza número depois de hífen: "P25/26 - 08 Soja" => 8
	const afterDashMatch = programaText.match(/-\s*(\d+)/);

	if (afterDashMatch?.[1]) {
		return Number(afterDashMatch[1]);
	}

	// Fallback: primeiro número isolado com 1 a 3 dígitos
	const firstNumberMatch = programaText.match(/\b(\d{1,3})\b/);

	if (firstNumberMatch?.[1]) {
		return Number(firstNumberMatch[1]);
	}

	return Number.MAX_SAFE_INTEGER;
};

const sortCardsByProgramaAndDap = (cards = []) => {
	return [...cards].sort((a, b) => {
		const programaNumberA = getCardProgramaNumber(a);
		const programaNumberB = getCardProgramaNumber(b);

		if (programaNumberA !== programaNumberB) {
			return programaNumberA - programaNumberB;
		}

		const dapA = getCardDap(a);
		const dapB = getCardDap(b);

		if (dapA !== dapB) {
			return dapA - dapB;
		}

		return getCardProgramaText(a).localeCompare(getCardProgramaText(b), "pt-BR", {
			numeric: true,
			sensitivity: "base",
		});
	});
};

const FarmList = ({ item, filterByDate, index, selectedSafra, selectedCiclo }) => {
	return (
		<CardListApp
			data={item}
			filterByDate={filterByDate}
			index={index}
			selectedSafra={selectedSafra}
			selectedCiclo={selectedCiclo}
		/>
	);
};

const FilterChip = ({ label, active, onPress }) => {
	return (
		<Pressable
			onPress={onPress}
			style={({ pressed }) => [
				styles.filterChip,
				active && styles.filterChipActive,
				pressed && styles.filterChipPressed,
			]}
		>
			<Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
				{label}
			</Text>
		</Pressable>
	);
};

const FilterSection = ({ title, children }) => {
	return (
		<View style={styles.filterSection}>
			<Text style={styles.filterSectionTitle}>{title}</Text>

			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				contentContainerStyle={styles.filterScrollContent}
			>
				{children}
			</ScrollView>
		</View>
	);
};

const ProgramacaoFilters = ({
	selectedSafra,
	selectedCiclo,
	selectedCultura,
	selectedVariedade,
	safraOptions,
	cicloOptions,
	cultureOptions,
	variedadeOptions,
	onChangeSafra,
	onChangeCiclo,
	onChangeCultura,
	onClearCultura,
	onChangeVariedade,
	onClearVariedade,
	isLoading,
	selectedEstagios,
	estagioOptions,
	onToggleEstagio,
	onClearEstagios,
}) => {
	return (
		<View style={styles.filtersPanel}>
			<View style={styles.filtersHeader}>
				<View style={{ flex: 1 }}>
					<Text style={styles.filtersTitle}>Filtros da programação</Text>

					<Text style={styles.filtersSubtitle} numberOfLines={2}>
						Safra {selectedSafra || "—"} · Ciclo {selectedCiclo || "—"}
						{selectedCultura ? ` · ${selectedCultura}` : " · Todas as culturas"}
						{selectedVariedade ? ` · ${selectedVariedade}` : " · Todas as variedades"}
						{selectedEstagios?.length
							? ` · ${selectedEstagios.length} estágio(s)`
							: " · Todos os estágios"}
					</Text>
				</View>

				{isLoading && (
					<View style={styles.filterLoadingPill}>
						<ActivityIndicator size="small" color={Colors.primary[700]} />
						<Text style={styles.filterLoadingText}>Atualizando</Text>
					</View>
				)}
			</View>

			<FilterSection title="Safra">
				{!safraOptions.length && (
					<Text style={styles.emptyFilterText}>Nenhuma safra disponível</Text>
				)}

				{safraOptions.map((safra) => (
					<FilterChip
						key={safra}
						label={safra}
						active={selectedSafra === safra}
						onPress={() => onChangeSafra(safra)}
					/>
				))}
			</FilterSection>

			<FilterSection title="Ciclo">
				{!cicloOptions.length && (
					<Text style={styles.emptyFilterText}>Nenhum ciclo disponível</Text>
				)}

				{cicloOptions.map((ciclo) => (
					<FilterChip
						key={ciclo}
						label={`Ciclo ${ciclo}`}
						active={String(selectedCiclo) === String(ciclo)}
						onPress={() => onChangeCiclo(ciclo)}
					/>
				))}
			</FilterSection>

			<FilterSection title="Cultura">
				<FilterChip label="Todas" active={!selectedCultura} onPress={onClearCultura} />

				{cultureOptions.map((cultura) => (
					<FilterChip
						key={cultura}
						label={cultura}
						active={selectedCultura === cultura}
						onPress={() => onChangeCultura(cultura)}
					/>
				))}
			</FilterSection>

			<FilterSection title="Variedade">
				<FilterChip
					label="Todas"
					active={!selectedVariedade}
					onPress={onClearVariedade}
				/>

				{!variedadeOptions.length && (
					<Text style={styles.emptyFilterText}>Nenhuma variedade disponível</Text>
				)}

				{variedadeOptions.map((variedade) => (
					<FilterChip
						key={variedade}
						label={variedade}
						active={selectedVariedade === variedade}
						onPress={() => onChangeVariedade(variedade)}
					/>
				))}
			</FilterSection>

			<FilterSection title="Estágio / Operação">
				<FilterChip
					label="Todos"
					active={!selectedEstagios.length}
					onPress={onClearEstagios}
				/>

				{!estagioOptions.length && (
					<Text style={styles.emptyFilterText}>Nenhum estágio disponível</Text>
				)}

				{estagioOptions.map((estagio) => (
					<FilterChip
						key={estagio}
						label={estagio}
						active={selectedEstagios.includes(estagio)}
						onPress={() => onToggleEstagio(estagio)}
					/>
				))}
			</FilterSection>
		</View>
	);
};

const ProgramacaoSkeleton = () => {
	return (
		<View style={styles.skeletonContainer}>
			{[1, 2, 3, 4].map((item) => (
				<View key={item} style={styles.skeletonCard}>
					<View style={styles.skeletonTopRow}>
						<View style={styles.skeletonTitle} />
						<View style={styles.skeletonArea} />
					</View>

					<View style={styles.skeletonHeader} />

					{[1, 2, 3].map((row) => (
						<View key={row} style={styles.skeletonLineRow}>
							<View style={styles.skeletonLineSmall} />
							<View style={styles.skeletonLine} />
							<View style={styles.skeletonLineSmall} />
						</View>
					))}
				</View>
			))}
		</View>
	);
};

const HomeScreen = ({ navigation }) => {
	const { setFarms, selectedFarm, setDataPlantio } = geralActions;

	const dispatch = useDispatch();
	const selFarm = useSelector(farmsSelected);
	const dataPlantioServer = useSelector(selectDataPlantio);

	const tabBarHeight = Platform.OS === "ios" ? 84 : 72;
	const tabBarBottomOffset = Platform.OS === "ios" ? 6 : 8;

	const ref = useRef(null);


	const [isLoading, setIsLoading] = useState(false);
	const [isPrinting, setIsPrinting] = useState(false);
	const [modalVisible, setModalVisible] = useState(false);
	const [listToCardApp, setListToCardApp] = useState([]);

	const [date, setDate] = useState();
	const [open, setOpen] = useState(false);
	const [filterEndDate, setfilterEndDate] = useState();
	const [totalCalcArea, setTotalCalcArea] = useState(0);

	const [filterByDate, setFilterByDate] = useState(false);

	const [selectedSafra, setSelectedSafra] = useState(null);
	const [selectedCiclo, setSelectedCiclo] = useState(null);
	const [selectedCultura, setSelectedCultura] = useState(null);
	const [selectedVariedade, setSelectedVariedade] = useState(null);
	const [selectedEstagios, setSelectedEstagios] = useState([]);

	const [safraOptions, setSafraOptions] = useState([]);
	const [cicloOptions, setCicloOptions] = useState([]);
	const [cultureOptions, setCultureOptions] = useState([]);
	const [variedadeOptions, setVariedadeOptions] = useState([]);
	const [estagioOptions, setEstagioOptions] = useState([]);

	const [showFilters, setShowFilters] = useState(false);
	const filtersAnim = useRef(new Animated.Value(0)).current;

	const farmTitle = selFarm ? selFarm : "Programações";

	const hasDataPlantio = Array.isArray(dataPlantioServer) && dataPlantioServer.length > 0;
	const isFirstLoading = isLoading && !hasDataPlantio;

	const activeFiltersCount = useMemo(() => {
		let count = 0;

		if (selectedSafra) count += 1;
		if (selectedCiclo) count += 1;
		if (selectedCultura) count += 1;
		if (selectedVariedade) count += 1;
		if (filterEndDate) count += 1;
		if (selectedEstagios.length) count += 1;

		return count;
	}, [selectedSafra,
		selectedCiclo,
		selectedCultura,
		selectedVariedade,
		selectedEstagios,
		filterEndDate,]);

	const filtersPanelStyle = {
		opacity: filtersAnim,
		maxHeight: filtersAnim.interpolate({
			inputRange: [0, 1],
			outputRange: [0, 560],
		}),
		transform: [
			{
				translateY: filtersAnim.interpolate({
					inputRange: [0, 1],
					outputRange: [-8, 0],
				}),
			},
		],
		overflow: "hidden",
	};

	const syncFilterOptionsFromRawData = useCallback(
		(rawData) => {
			const { safras, ciclos, culturas, variedades, estagios } = getRawFilterOptions(
				rawData,
				selFarm,
				selectedSafra,
				selectedCiclo,
				selectedCultura,
				selectedVariedade
			);

			setSafraOptions(safras);
			setCicloOptions(ciclos);
			setCultureOptions(culturas);
			setVariedadeOptions(variedades);
			setEstagioOptions(estagios);


			setSelectedSafra((current) => {
				if (current && safras.includes(current)) return current;
				return safras?.[0] || null;
			});

			setSelectedCiclo((current) => {
				const currentAsString = current ? String(current) : null;
				if (currentAsString && ciclos.includes(currentAsString)) return currentAsString;
				return ciclos?.[0] || null;
			});

			setSelectedCultura((current) => {
				if (!current) return null;
				if (culturas.includes(current)) return current;
				return null;
			});

			setSelectedVariedade((current) => {
				if (!current) return null;
				if (variedades.includes(current)) return current;
				return null;
			});

			setSelectedEstagios((current) => {
				if (!Array.isArray(current) || !current.length) return current;

				const next = current.filter((estagio) => estagios.includes(estagio));

				if (next.length === current.length) return current;

				return next;
			});
		},
		[selFarm, selectedSafra, selectedCiclo, selectedCultura, selectedVariedade]
	);

	const getData = useCallback(async () => {
		console.log("pegando os dados");
		setIsLoading(true);

		try {
			const response = await fetch(
				`${LINK}/plantio/get_plantio_operacoes_detail_json_program/`,
				{
					headers: {
						Authorization: `Token ${EXPO_PUBLIC_REACT_APP_DJANGO_TOKEN}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify(INITIAL_FETCH_BODY),
					method: "POST",
				}
			);

			const data = await response.json();

			console.log("DEBUG PROGRAMACOES RESPONSE:", {
				status: response.status,
				keys: Object.keys(data || {}),
				total: data?.dados_plantio?.length,
				first: data?.dados_plantio?.[0],
			});

			if (!response.ok) {
				throw new Error(data?.message || "Erro ao carregar programações.");
			}

			const formDataServer = Array.isArray(data?.dados_plantio)
				? data.dados_plantio
					// .filter((item) => item?.dados?.inicializado_plantio === true)
					.sort((a, b) => String(a.parcela).localeCompare(String(b.parcela)))
					.sort((a, b) => String(a.fazenda).localeCompare(String(b.fazenda)))
				: [];

			dispatch(setDataPlantio(formDataServer));
		} catch (error) {
			console.log("erro ao pegar os dados", error);

			Alert.alert(
				"Problema na API",
				`Possível erro de internet para pegar os dados: ${error?.message || error}`
			);
		} finally {
			setIsLoading(false);
		}
	}, [dispatch, setDataPlantio]);

	const toggleFilters = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

		setShowFilters((current) => {
			const nextValue = !current;

			Animated.timing(filtersAnim, {
				toValue: nextValue ? 1 : 0,
				duration: nextValue ? 520 : 420,
				easing: nextValue
					? Easing.inOut(Easing.cubic)
					: Easing.out(Easing.cubic),
				useNativeDriver: false,
			}).start();

			return nextValue;
		});
	};

	const handlerSortData = () => {
		setFilterByDate((current) => !current);
	};

	const handlerOpenCalendar = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
		setDate(new Date());
		setOpen(true);
	};

	const handleClearDate = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
		setDate();
		setfilterEndDate();
		setOpen(false);
	};

	const onChange = (selectedDate) => {
		const currentDate = selectedDate;

		setOpen(false);
		setDate(currentDate);

		if (currentDate) {
			const formatDate = currentDate.toLocaleDateString().split("/").reverse().join("-");
			setfilterEndDate(formatDate);
		}
	};

	const handlerFarms = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
		navigation.navigate("FarmsScren");
	};

	const handleClear = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
		dispatch(selectedFarm(""));
	};

	const handleChangeSafra = (safra) => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		setSelectedSafra(safra);
		setSelectedCultura(null);
		setSelectedVariedade(null);
		setSelectedEstagios([]);
	};

	const handleChangeCiclo = (ciclo) => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		setSelectedCiclo(String(ciclo));
		setSelectedCultura(null);
		setSelectedVariedade(null);
		setSelectedEstagios([]);
	};

	const handleChangeCultura = (cultura) => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		setSelectedCultura(cultura);
		setSelectedVariedade(null);
		setSelectedEstagios([]);
	};

	const handleChangeVariedade = (variedade) => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		setSelectedVariedade(variedade);
		setSelectedEstagios([]);
	};

	const handleToggleEstagio = (estagio) => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

		setSelectedEstagios((current) => {
			if (current.includes(estagio)) {
				return current.filter((item) => item !== estagio);
			}

			return [...current, estagio];
		});
	};

	const handleClearEstagios = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		setSelectedEstagios([]);
	};

	const handlerPrintData = async () => {
		if (isPrinting) return;

		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

		if (!Array.isArray(listToCardApp) || listToCardApp.length === 0) {
			Alert.alert(
				"Sem dados para imprimir",
				"Não existem aplicações com os filtros selecionados."
			);
			return;
		}

		try {
			setIsPrinting(true);

			await new Promise((resolve) => {
				requestAnimationFrame(() => {
					setTimeout(resolve, 80);
				});
			});

			await createAndPrintPDF(listToCardApp, selFarm, filterEndDate, {
				safra: selectedSafra || "—",
				ciclo: selectedCiclo || "—",
				cultura: selectedCultura || "Todas",
				variedade: selectedVariedade || "Todas",
				estagios: selectedEstagios.length ? selectedEstagios.join(", ") : "Todos",
			});
		} catch (error) {
			console.log("Erro ao imprimir programação:", error);

			Alert.alert(
				"Erro ao gerar PDF",
				"Não foi possível gerar o PDF da programação."
			);
		} finally {
			setIsPrinting(false);
		}
	};

	useEffect(() => {
		handleClear();
	}, []);

	useEffect(() => {
		getData();
	}, [getData]);

	useEffect(() => {
		if (!Array.isArray(dataPlantioServer) || dataPlantioServer.length === 0) return;

		const onlyFarm = dataPlantioServer.map((data) => data.fazenda);
		const setFiltFarms = [...new Set(onlyFarm)].sort((a, b) =>
			String(a).localeCompare(String(b))
		);

		dispatch(setFarms(setFiltFarms));
	}, [dataPlantioServer, dispatch, setFarms]);

	useEffect(() => {
		if (!selFarm) {
			setListToCardApp((current) => (current.length ? [] : current));
			setTotalCalcArea((current) => (current !== 0 ? 0 : current));

			setSelectedCultura((current) => (current ? null : current));
			setSelectedVariedade((current) => (current ? null : current));

			setVariedadeOptions((current) => (current.length ? [] : current));
			setSelectedEstagios((current) => (current.length ? [] : current));
			setEstagioOptions((current) => (current.length ? [] : current));

			return;
		}

		if (!Array.isArray(dataPlantioServer) || dataPlantioServer.length === 0) {
			setListToCardApp([]);
			setTotalCalcArea(0);
			return;
		}

		const { safras, ciclos, culturas, variedades } = getRawFilterOptions(
			dataPlantioServer,
			selFarm,
			selectedSafra,
			selectedCiclo,
			selectedCultura,
			selectedVariedade
		);

		setSafraOptions(safras);
		setCicloOptions(ciclos);
		setCultureOptions(culturas);
		setVariedadeOptions(variedades);



		if (selectedSafra && !safras.includes(selectedSafra)) {
			setSelectedSafra(safras?.[0] || null);
			return;
		}

		if (!selectedSafra && safras.length > 0) {
			setSelectedSafra(safras[0]);
			return;
		}

		if (selectedCiclo && !ciclos.includes(String(selectedCiclo))) {
			setSelectedCiclo(ciclos?.[0] || null);
			return;
		}

		if (!selectedCiclo && ciclos.length > 0) {
			setSelectedCiclo(ciclos[0]);
			return;
		}

		if (selectedCultura && !culturas.includes(selectedCultura)) {
			setSelectedCultura(null);
			return;
		}

		if (selectedVariedade && !variedades.includes(selectedVariedade)) {
			setSelectedVariedade(null);
			return;
		}


		const filteredRawData = filterRawData({
			rawData: dataPlantioServer,
			selectedFarm: selFarm,
			selectedSafra,
			selectedCiclo,
			selectedCultura,
			selectedVariedade,
			selectedEstagios: [],
		});

		const result = formatDataServer(filteredRawData, filterEndDate);

		const nextEstagioOptions = getEstagioOptionsFromFormattedData(result);

		setEstagioOptions((current) => {
			const currentKey = current.join("|");
			const nextKey = nextEstagioOptions.join("|");

			return currentKey === nextKey ? current : nextEstagioOptions;
		});



		const filteredResult = filterFormattedDataByFilters(
			result,
			selectedCultura,
			selectedVariedade,
			selectedEstagios
		);

		const sortedResult = sortCardsByProgramaAndDap(filteredResult);

		setListToCardApp(sortedResult);

		let totalArea = 0;

		sortedResult.forEach((element) => {
			element.app.forEach((appDetail) => {
				totalArea += Number(appDetail.area || 0);
			});
		});

		setTotalCalcArea(totalArea);
	}, [
		selFarm,
		dataPlantioServer,
		filterEndDate,
		filterByDate,
		selectedSafra,
		selectedCiclo,
		selectedCultura,
		selectedVariedade,
		selectedEstagios
	]);

	useLayoutEffect(() => {
		navigation.setOptions({
			title: farmTitle.replace("Projeto ", ""),
			tabBarLabel: "Programações",
		});
	}, [navigation, farmTitle]);

	useEffect(() => {
		navigation.setOptions({
			headerTransparent: false,
			headerShadowVisible: false,

			headerStyle: {
				backgroundColor: Colors.primary[901],
			},

			headerBackground: () => (
				<View
					style={{
						flex: 1,
						backgroundColor: Colors.primary[901],
					}}
				/>
			),

			headerTintColor: "#FFFFFF",

			headerTitleStyle: {
				color: "#FFFFFF",
				fontWeight: "900",
			},

			headerLeftContainerStyle: {
				paddingLeft: 8,
				overflow: "visible",
			},

			headerRightContainerStyle: {
				paddingRight: 8,
				overflow: "visible",
			},

			headerTitle: () => (
				<View style={{ alignItems: "center" }}>
					<Text
						style={{
							fontSize: 16,
							fontWeight: "bold",
							color: "#FFFFFF",
						}}
					>
						{farmTitle
							.replace("Projeto ", "")
							.replace("Benção ", "B. ")
							.replace("Campo ", "C. ")}
					</Text>

					{selFarm && (
						<Text
							style={{
								fontSize: 9,
								color: Colors.secondary[200],
							}}
						>
							{formatNumberBr(totalCalcArea)} Há
						</Text>
					)}
				</View>
			),

			tabBarLabel: "Programações",

			headerLeft: () => {
				if (!selFarm) return null;

				return (
					<View
						style={{
							flexDirection: "row",
							alignItems: "center",
							gap: 6,
						}}
					>
						<Pressable
							onPress={handlerFarms}
							hitSlop={10}
							style={({ pressed }) => [
								styles.headerActionButton,
								styles.headerActionButtonActive,
								pressed && styles.headerActionButtonPressed,
							]}
						>
							<FontAwesome5
								name="filter"
								size={17}
								color="#FFFFFF"
							/>
						</Pressable>

						<Pressable
							onPress={handleClear}
							hitSlop={10}
							style={({ pressed }) => [
								styles.headerActionButton,
								styles.headerActionButtonDanger,
								pressed && styles.headerActionButtonPressed,
							]}
						>
							<Ionicons
								name="close-circle-outline"
								size={23}
								color="#FFFFFF"
							/>
						</Pressable>
					</View>
				);
			},

			headerRight: () => (
				<View
					style={{
						flexDirection: "row",
						alignItems: "center",
						gap: 6,
					}}
				>
					{selFarm && listToCardApp.length > 0 && (
						<>
							{isPrinting ? (
								<View
									style={[
										styles.headerActionButton,
										styles.headerActionButtonDisabled,
									]}
								>
									<ActivityIndicator
										size="small"
										color="#FFFFFF"
									/>
								</View>
							) : (
								<Pressable
									onPress={handlerPrintData}
									hitSlop={10}
									style={({ pressed }) => [
										styles.headerActionButton,
										pressed && styles.headerActionButtonPressed,
									]}
								>
									<Ionicons
										name="print-outline"
										size={22}
										color="#FFFFFF"
									/>
								</Pressable>
							)}

							<Pressable
								onPress={handlerSortData}
								hitSlop={10}
								style={({ pressed }) => [
									styles.headerActionButton,
									styles.headerActionButtonSuccess,
									pressed && styles.headerActionButtonPressed,
								]}
							>
								<Ionicons
									name={
										!filterByDate
											? "swap-vertical-outline"
											: "swap-vertical"
									}
									size={22}
									color="#FFFFFF"
								/>
							</Pressable>
						</>
					)}

					<Pressable
						onPress={handlerOpenCalendar}
						hitSlop={10}
						style={({ pressed }) => [
							styles.headerActionButton,
							date && styles.headerActionButtonActive,
							pressed && styles.headerActionButtonPressed,
						]}
					>
						<Ionicons
							name="calendar-outline"
							size={22}
							color="#FFFFFF"
						/>
					</Pressable>

					{date && (
						<Pressable
							onPress={handleClearDate}
							hitSlop={10}
							style={({ pressed }) => [
								styles.headerActionButton,
								styles.headerActionButtonDanger,
								pressed && styles.headerActionButtonPressed,
							]}
						>
							<Ionicons
								name="close-circle-outline"
								size={23}
								color="#FFFFFF"
							/>
						</Pressable>
					)}
				</View>
			),
		});
	}, [
		navigation,
		selFarm,
		date,
		filterByDate,
		listToCardApp,
		farmTitle,
		totalCalcArea,
		selectedSafra,
		selectedCiclo,
		selectedCultura,
		selectedVariedade,
		isPrinting,
	]);

	useScrollToTop(ref);

	if (isFirstLoading) {
		return (
			<View style={styles.loadingScreen}>
				<ActivityIndicator size="large" color={Colors.primary[700]} />
				<Text style={styles.loadingTitle}>Carregando programações...</Text>
			</View>
		);
	}

	return (
		<>
			{open && date && (
				<View style={styles.calendarContainer}>
					<DateTimePickerModal
						isVisible={open}
						mode="date"
						onConfirm={onChange}
						onCancel={handleClearDate}
						locale="pt-BR"
						confirmTextIOS="Confirmar"
						cancelTextIOS="Cancelar"
						display="inline"
					/>
				</View>
			)}

			{!open && (
				<View style={styles.mainContainer}>
					<Modal
						animationType="slide"
						transparent
						visible={modalVisible}
						onRequestClose={() => {
							setModalVisible(!modalVisible);
						}}
					>
						<FarmScreen
							setModalVisible={setModalVisible}
							modalVisible={modalVisible}
						/>
					</Modal>

					{!selFarm && (
						<View style={styles.buttonContainer}>
							<View style={styles.selectProjectCard}>
								<Text style={styles.selectProjectTitle}>Programações</Text>
								<Text style={styles.selectProjectText}>
									Selecione um projeto para visualizar as aplicações planejadas.
								</Text>

								<Button
									onPress={handlerFarms}
									btnStyles={{ backgroundColor: Colors.primary[500] }}
								>
									Selecione um Projeto
								</Button>
							</View>
						</View>
					)}

					{selFarm && (
						<View style={styles.dataContainer}>
							<Animated.View style={[styles.filtersAnimatedWrapper, filtersPanelStyle]}>
								<ProgramacaoFilters
									selectedSafra={selectedSafra || "—"}
									selectedCiclo={selectedCiclo || "—"}
									selectedCultura={selectedCultura}
									selectedVariedade={selectedVariedade}
									safraOptions={safraOptions}
									cicloOptions={cicloOptions}
									cultureOptions={cultureOptions}
									variedadeOptions={variedadeOptions}
									onChangeSafra={handleChangeSafra}
									onChangeCiclo={handleChangeCiclo}
									onChangeCultura={handleChangeCultura}
									onClearCultura={() => {
										setSelectedCultura(null);
										setSelectedVariedade(null);
										setSelectedEstagios([]);
									}}
									onClearVariedade={() => {
										setSelectedVariedade(null);
										setSelectedEstagios([]);
									}}
									onChangeVariedade={handleChangeVariedade}

									isLoading={isLoading}

									selectedEstagios={selectedEstagios}
									estagioOptions={estagioOptions}
									onToggleEstagio={handleToggleEstagio}
									onClearEstagios={handleClearEstagios}
								/>
							</Animated.View>

							{isLoading && hasDataPlantio ? (
								<View style={styles.refreshInlinePill}>
									<ActivityIndicator size="small" color={Colors.primary[700]} />
									<Text style={styles.refreshInlineText}>Atualizando dados...</Text>
								</View>
							) : null}

							{isLoading && !listToCardApp.length ? (
								<ProgramacaoSkeleton />
							) : listToCardApp.length > 0 ? (
								<FlatList
									contentContainerStyle={{
										paddingBottom: CUSTOM_TAB_BAR_TOTAL_HEIGHT + 108,
										paddingTop: 5,
									}}
									ref={ref}
									data={listToCardApp}
									keyExtractor={(item, i) =>
										`${item?.aplicacao || "app"}-${item?.programa || "programa"}-${i}`
									}
									renderItem={({ item, index }) => {
										const reverseIndex = listToCardApp.length - index;

										return (
											<View
												style={{
													marginTop: reverseIndex === listToCardApp.length ? 5 : 0,
												}}
											>
												{FarmList({
													item,
													filterByDate,
													index: reverseIndex,
													selectedSafra,
													selectedCiclo,
												})}
											</View>
										);
									}}
									ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
									refreshControl={
										<RefreshControl
											refreshing={isLoading}
											onRefresh={getData}
											colors={[Colors.primary[700]]}
											tintColor={Colors.primary[700]}
											progressBackgroundColor="#FFFFFF"
										/>
									}
								/>
							) : (
								<View style={styles.emptyStateBox}>
									<Text style={styles.emptyStateTitle}>
										Sem aplicações para este período
									</Text>

									<Text style={styles.emptyStateText}>
										Filtros atuais: Safra {selectedSafra || "—"} · Ciclo{" "}
										{selectedCiclo || "—"}
										{selectedCultura ? ` · ${selectedCultura}` : " · Todas as culturas"}
										{selectedVariedade ? ` · ${selectedVariedade}` : " · Todas as variedades"}
										{selectedEstagios.length
											? ` · ${selectedEstagios.length} estágio(s)`
											: " · Todos os estágios"}
									</Text>

									<Pressable
										onPress={toggleFilters}
										style={({ pressed }) => [
											styles.emptyFilterButton,
											pressed && { opacity: 0.78 },
										]}
									>
										<Text style={styles.emptyFilterButtonText}>Alterar filtros</Text>
									</Pressable>
								</View>
							)}
						</View>
					)}

					{selFarm && (
						<Pressable
							onPress={toggleFilters}
							style={({ pressed }) => [
								styles.filterFab,
								showFilters && styles.filterFabActive,
								pressed && styles.filterFabPressed,
								{ bottom: Platform.OS === 'ios' ? tabBarHeight + tabBarBottomOffset : tabBarBottomOffset + 10 },
							]}
						>
							<View style={styles.fabIconWrap}>
								<Text
									style={[
										styles.filterFabIcon,
										showFilters && styles.filterFabIconActive,
									]}
								>
									{showFilters ? "×" : "≡"}
								</Text>

								{activeFiltersCount > 0 && !showFilters && (
									<View style={styles.filterCountBadge}>
										<Text style={styles.filterCountText}>{activeFiltersCount}</Text>
									</View>
								)}
							</View>

							<View style={styles.filterFabTextBox}>
								<Text
									style={[
										styles.filterFabLabel,
										showFilters && styles.filterFabLabelActive,
									]}
								>
									{showFilters ? "Fechar filtros" : "Filtros"}
								</Text>

								<Text
									style={[
										styles.filterFabSubLabel,
										showFilters && styles.filterFabSubLabelActive,
									]}
									numberOfLines={1}
								>
									{selectedSafra || "Safra"} · Ciclo {selectedCiclo || "—"}
									{selectedCultura ? ` · ${selectedCultura}` : " · Todas"}
									{selectedVariedade ? ` · ${selectedVariedade}` : ""}
									{selectedEstagios.length ? ` · ${selectedEstagios.length} est.` : ""}
								</Text>
							</View>
						</Pressable>
					)}
				</View>
			)}
		</>
	);
};

const styles = StyleSheet.create({
	mainContainer: {
		backgroundColor: "#D6E3F3",
		flex: 1,
		position: "relative",
	},

	loadingScreen: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "#D6E3F3",
		paddingHorizontal: 28,
	},

	loadingTitle: {
		marginTop: 12,
		color: Colors.primary[800],
		fontSize: 13,
		fontWeight: "900",
	},

	calendarContainer: {
		justifyContent: "center",
		flex: 1,
		alignItems: "center",
		backgroundColor: "#D6E3F3",
	},

	buttonContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		paddingHorizontal: 22,
	},

	selectProjectCard: {
		width: "100%",
		backgroundColor: "#FFFFFF",
		borderRadius: 24,
		padding: 18,
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.08)",
		shadowColor: "#000",
		shadowOpacity: 0.08,
		shadowRadius: 16,
		shadowOffset: { width: 0, height: 8 },
		elevation: 3,
	},

	selectProjectTitle: {
		color: "#0F172A",
		fontSize: 18,
		fontWeight: "900",
		marginBottom: 4,
	},

	selectProjectText: {
		color: "rgba(15,23,42,0.58)",
		fontSize: 13,
		fontWeight: "700",
		lineHeight: 19,
		marginBottom: 14,
	},

	dataContainer: {
		flex: 1,
		backgroundColor: "#D6E3F3",
		width: "100%",
		// paddingTop: 8,
		position: "relative",
	},

	filtersAnimatedWrapper: {
		width: "100%",
		paddingHorizontal: 12,
	},

	filtersPanel: {
		width: "100%",
		backgroundColor: "#FFFFFF",
		borderRadius: 22,
		paddingHorizontal: 14,
		paddingTop: 14,
		marginTop: 12,
		paddingBottom: 12,
		marginBottom: 10,
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.07)",
		shadowColor: "#000",
		shadowOpacity: 0.08,
		shadowRadius: 14,
		shadowOffset: { width: 0, height: 8 },
		elevation: 2,
	},

	filtersHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "flex-start",
		marginBottom: 10,
		gap: 10,
	},

	filtersTitle: {
		color: "#0F172A",
		fontSize: 14,
		fontWeight: "900",
		letterSpacing: -0.2,
	},

	filtersSubtitle: {
		marginTop: 2,
		color: "rgba(15,23,42,0.56)",
		fontSize: 11,
		fontWeight: "700",
	},

	filterLoadingPill: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		backgroundColor: "rgba(22,101,52,0.08)",
		borderRadius: 999,
		paddingHorizontal: 9,
		paddingVertical: 5,
	},

	filterLoadingText: {
		color: Colors.primary[800],
		fontSize: 10,
		fontWeight: "900",
	},

	filterSection: {
		marginTop: 8,
	},

	filterSectionTitle: {
		color: "rgba(15,23,42,0.46)",
		fontSize: 10,
		fontWeight: "900",
		textTransform: "uppercase",
		letterSpacing: 0.7,
		marginBottom: 6,
	},

	filterScrollContent: {
		gap: 7,
		paddingRight: 18,
	},

	filterChip: {
		borderRadius: 999,
		paddingHorizontal: 12,
		paddingVertical: 7,
		backgroundColor: "rgba(15,23,42,0.045)",
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.06)",
	},

	filterChipActive: {
		backgroundColor: Colors.primary[700],
		borderColor: Colors.primary[700],
	},

	filterChipPressed: {
		opacity: 0.74,
	},

	filterChipText: {
		color: "rgba(15,23,42,0.66)",
		fontSize: 11,
		fontWeight: "900",
	},

	filterChipTextActive: {
		color: "#FFFFFF",
	},

	emptyFilterText: {
		color: "rgba(15,23,42,0.48)",
		fontSize: 11,
		fontWeight: "800",
		paddingVertical: 7,
	},

	refreshInlinePill: {
		alignSelf: "flex-start",
		marginLeft: 14,
		marginTop: 14,
		marginBottom: 8,
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		backgroundColor: "rgba(255,255,255,0.88)",
		borderRadius: 999,
		paddingHorizontal: 12,
		paddingVertical: 7,
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.07)",
	},

	refreshInlineText: {
		color: Colors.primary[800],
		fontSize: 11,
		fontWeight: "900",
	},

	emptyStateBox: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 28,
	},

	emptyStateTitle: {
		color: "#0F172A",
		fontSize: 15,
		fontWeight: "900",
		textAlign: "center",
	},

	emptyStateText: {
		marginTop: 7,
		color: "rgba(15,23,42,0.56)",
		fontSize: 12,
		fontWeight: "700",
		textAlign: "center",
		lineHeight: 18,
	},

	emptyFilterButton: {
		marginTop: 14,
		backgroundColor: Colors.primary[700],
		borderRadius: 999,
		paddingHorizontal: 16,
		paddingVertical: 9,
	},

	emptyFilterButtonText: {
		color: "#FFFFFF",
		fontSize: 12,
		fontWeight: "900",
	},

	filterFab: {
		position: "absolute",
		right: 16,
		zIndex: 9999,
		elevation: 20,
		flexDirection: "row",
		alignItems: "center",
		gap: 9,
		backgroundColor: "#FFFFFF",
		borderRadius: 999,
		paddingLeft: 10,
		paddingRight: 14,
		paddingVertical: 10,
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.08)",
		shadowColor: "#000",
		shadowOpacity: 0.18,
		shadowRadius: 16,
		shadowOffset: { width: 0, height: 8 },
	},

	filterFabActive: {
		backgroundColor: Colors.primary[700],
		borderColor: Colors.primary[700],
	},

	filterFabPressed: {
		opacity: 0.82,
		transform: [{ scale: 0.98 }],
	},

	fabIconWrap: {
		position: "relative",
	},

	filterFabIcon: {
		width: 30,
		height: 30,
		borderRadius: 15,
		textAlign: "center",
		textAlignVertical: "center",
		lineHeight: 30,
		overflow: "hidden",
		backgroundColor: "rgba(15,23,42,0.06)",
		color: Colors.primary[800],
		fontSize: 22,
		fontWeight: "900",
	},

	filterFabIconActive: {
		backgroundColor: "rgba(255,255,255,0.18)",
		color: "#FFFFFF",
	},

	filterCountBadge: {
		position: "absolute",
		top: -5,
		right: -5,
		minWidth: 16,
		height: 16,
		borderRadius: 8,
		backgroundColor: "#EF4444",
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 4,
		borderWidth: 1,
		borderColor: "#FFFFFF",
	},

	filterCountText: {
		color: "#FFFFFF",
		fontSize: 9,
		fontWeight: "900",
	},

	filterFabTextBox: {
		maxWidth: 165,
	},

	filterFabLabel: {
		color: "#0F172A",
		fontSize: 12,
		fontWeight: "900",
	},

	filterFabLabelActive: {
		color: "#FFFFFF",
	},

	filterFabSubLabel: {
		marginTop: 1,
		color: "rgba(15,23,42,0.54)",
		fontSize: 10,
		fontWeight: "800",
	},

	filterFabSubLabelActive: {
		color: "rgba(255,255,255,0.72)",
	},

	skeletonContainer: {
		width: "100%",
		paddingHorizontal: 14,
		paddingTop: 6,
		paddingBottom: 110,
	},

	skeletonCard: {
		backgroundColor: "rgba(255,255,255,0.78)",
		borderRadius: 20,
		padding: 14,
		marginBottom: 12,
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.06)",
	},

	skeletonTopRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 12,
	},

	skeletonTitle: {
		width: "48%",
		height: 14,
		borderRadius: 999,
		backgroundColor: "rgba(15,23,42,0.08)",
	},

	skeletonArea: {
		width: 58,
		height: 14,
		borderRadius: 999,
		backgroundColor: "rgba(15,23,42,0.08)",
	},

	skeletonHeader: {
		width: "100%",
		height: 34,
		borderRadius: 10,
		backgroundColor: "rgba(22,101,52,0.12)",
		marginBottom: 12,
	},

	skeletonLineRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginTop: 8,
	},

	skeletonLine: {
		width: "46%",
		height: 10,
		borderRadius: 999,
		backgroundColor: "rgba(15,23,42,0.06)",
	},

	skeletonLineSmall: {
		width: "18%",
		height: 10,
		borderRadius: 999,
		backgroundColor: "rgba(15,23,42,0.055)",
	},
	headerPrintLoading: {
		marginLeft: 5,
		marginTop: 10,
		width: 32,
		height: 32,
		alignItems: "center",
		justifyContent: "center",
	},
	headerActionButton: {
		width: 36,
		height: 36,
		borderRadius: 18,
		alignItems: "center",
		justifyContent: "center",

		backgroundColor: "rgba(255,255,255,0.12)",

		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.28)",

		overflow: "hidden",
		marginTop: 0,
	},

	headerActionButtonPressed: {
		backgroundColor: "rgba(255,255,255,0.22)",
		borderColor: "rgba(255,255,255,0.42)",
		transform: [{ scale: 0.96 }],
	},

	headerActionButtonActive: {
		backgroundColor: "rgba(61,139,253,0.22)",
		borderColor: "rgba(61,139,253,0.55)",
	},

	headerActionButtonDanger: {
		backgroundColor: "rgba(239,68,68,0.18)",
		borderColor: "rgba(239,68,68,0.45)",
	},

	headerActionButtonSuccess: {
		backgroundColor: "rgba(34,197,94,0.18)",
		borderColor: "rgba(34,197,94,0.46)",
	},

	headerActionButtonDisabled: {
		opacity: 0.65,
	},
});

export default HomeScreen;