import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    RefreshControl,
    Pressable,
    Alert,
    ActivityIndicator,
    Platform,
} from "react-native";

import {
    useState,
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
} from "react";

import { useScrollToTop } from "@react-navigation/native";

import { Colors } from "../constants/styles";

import { useDispatch, useSelector } from "react-redux";

import { geralActions } from "../store/redux/geral";

import {
    selectFarmBoxData,
    selectMapDataPlot,
    selectFarmboxSearchBar,
    selectFarmboxSearchQuery,
} from "../store/redux/selector";

import { NODELINK, LINK } from "../utils/api";

import { EXPO_PUBLIC_REACT_APP_DJANGO_TOKEN } from "@env";

import * as Haptics from "expo-haptics";

import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

import { FAB } from "react-native-paper";

import SearchBar from "../components/Global/SearchBar";

import { CUSTOM_TAB_BAR_CONTENT_PADDING } from "../constants/layout";

import AsyncStorage from "@react-native-async-storage/async-storage";

const FILTERS_ACCORDION_STORAGE_KEY =
    "@farmbox_filters_accordion_expanded";



const FarmBoxScreen = ({ navigation }) => {
    const {
        setFarmBoxData,
        setMapPlot,
        setFarmboxSearchBar,
        setFarmboxSearchQuery,
    } = geralActions;

    const dispatch = useDispatch();

    const ref = useRef(null);

    const farmBoxData = useSelector(selectFarmBoxData);
    const mapPlotData = useSelector(selectMapDataPlot);
    const searchQuery = useSelector(selectFarmboxSearchQuery);
    const showSearch = useSelector(selectFarmboxSearchBar);

    const [farmData, setFarmData] = useState([]);
    const [onlyFarms, setOnlyFarms] = useState([]);

    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingDbFarm, setIsLoadingDbFarm] = useState(false);
    const [isLoadingMapData, setIsLoadingMapData] = useState(false);

    const [selectedSafra, setSelectedSafra] = useState(null);
    const [selectedCiclo, setSelectedCiclo] = useState(null);
    const [selectedCultura, setSelectedCultura] = useState(null);

    const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
    const [hasLoadedAccordionPreference, setHasLoadedAccordionPreference] =
        useState(false);

    const formatNumber = useCallback((value, decimals = 0) => {
        const number = Number(value || 0);

        return number.toLocaleString("pt-BR", {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        });
    }, []);

    const normalizeText = useCallback((value = "") => {
        return String(value || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();
    }, []);

    const uniqueSorted = useCallback((values = []) => {
        return Array.from(
            new Set(
                values
                    .filter(
                        (value) =>
                            value !== null &&
                            value !== undefined &&
                            String(value).trim() !== ""
                    )
                    .map((value) => String(value).trim())
            )
        ).sort((first, second) =>
            first.localeCompare(second, "pt-BR", {
                numeric: true,
                sensitivity: "base",
            })
        );
    }, []);

    const getApplicationSafra = useCallback((application) => {
        return String(
            application?.safra ??
            application?.safraNome ??
            application?.safra_nome ??
            application?.dados?.safra ??
            ""
        ).trim();
    }, []);

    const getApplicationCiclo = useCallback((application) => {
        const ciclo =
            application?.ciclo ??
            application?.cicloNome ??
            application?.ciclo_nome ??
            application?.dados?.ciclo ??
            "";

        return String(ciclo).trim();
    }, []);

    const getApplicationCultura = useCallback((application) => {
        const directCulture =
            application?.cultura ??
            application?.culture ??
            application?.crop ??
            application?.dados?.cultura;

        if (
            directCulture !== null &&
            directCulture !== undefined &&
            String(directCulture).trim() !== ""
        ) {
            return String(directCulture).trim();
        }

        const parcelas = Array.isArray(application?.parcelas)
            ? application.parcelas
            : [];

        const parcelaWithCulture = parcelas.find(
            (parcela) =>
                parcela?.cultura ||
                parcela?.culture ||
                parcela?.crop ||
                parcela?.dados?.cultura
        );

        return String(
            parcelaWithCulture?.cultura ??
            parcelaWithCulture?.culture ??
            parcelaWithCulture?.crop ??
            parcelaWithCulture?.dados?.cultura ??
            ""
        ).trim();
    }, []);

    const triggerHeavyHaptic = useCallback(() => {
        try {
            Haptics.impactAsync(
                Haptics.ImpactFeedbackStyle.Heavy
            );
        } catch (error) {
            // Pode falhar em simuladores sem interromper a navegação.
        }
    }, []);

    const getData = useCallback(async () => {
        setIsLoading(true);

        try {
            const response = await fetch(
                `${NODELINK}/data-open-apps-fetch-app/`,
                {
                    headers: {
                        Authorization:
                            `Token ${EXPO_PUBLIC_REACT_APP_DJANGO_TOKEN}`,
                        "Content-Type": "application/json",
                    },
                    method: "GET",
                }
            );

            if (response.status === 200) {
                const payload = await response.json();

                dispatch(setFarmBoxData(payload));

                return;
            }

            Alert.alert(
                "Atenção",
                `Não foi possível atualizar as aplicações. Status ${response.status}.`
            );
        } catch (error) {
            console.log(
                "Erro ao carregar aplicações:",
                error
            );

            Alert.alert(
                "Problema na API",
                `Possível erro de internet ao buscar as aplicações: ${error}`
            );
        } finally {
            setIsLoading(false);
        }
    }, [
        dispatch,
        setFarmBoxData,
    ]);

    const handleUpdateApiData = useCallback(async () => {
        if (isLoadingDbFarm) {
            return;
        }

        setIsLoadingDbFarm(true);

        triggerHeavyHaptic();

        try {
            const response = await fetch(
                `${LINK}/defensivo/update_farmbox_mongodb_data/`,
                {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization:
                            `Token ${EXPO_PUBLIC_REACT_APP_DJANGO_TOKEN}`,
                    },
                }
            );

            if (response.status === 200) {
                await getData();

                Alert.alert(
                    "Tudo certo",
                    "Aplicações atualizadas com sucesso."
                );

                return;
            }

            Alert.alert(
                "Atenção",
                `A atualização retornou status ${response.status}.`
            );
        } catch (error) {
            console.error(error);

            Alert.alert(
                "Não foi possível atualizar",
                `Erro: ${error}`
            );
        } finally {
            setIsLoadingDbFarm(false);
        }
    }, [
        getData,
        isLoadingDbFarm,
        triggerHeavyHaptic,
    ]);


    useEffect(() => {
        const loadAccordionPreference = async () => {
            try {
                const savedValue = await AsyncStorage.getItem(
                    FILTERS_ACCORDION_STORAGE_KEY
                );

                if (savedValue === "true" || savedValue === "false") {
                    setIsFiltersExpanded(savedValue === "true");
                }
            } catch (error) {
                console.log(
                    "Erro ao carregar preferência dos filtros:",
                    error
                );
            } finally {
                setHasLoadedAccordionPreference(true);
            }
        };

        loadAccordionPreference();
    }, []);

    useEffect(() => {
        if (!hasLoadedAccordionPreference) {
            return;
        }

        const saveAccordionPreference = async () => {
            try {
                await AsyncStorage.setItem(
                    FILTERS_ACCORDION_STORAGE_KEY,
                    String(isFiltersExpanded)
                );
            } catch (error) {
                console.log(
                    "Erro ao salvar preferência dos filtros:",
                    error
                );
            }
        };

        saveAccordionPreference();
    }, [
        hasLoadedAccordionPreference,
        isFiltersExpanded,
    ]);

    useLayoutEffect(() => {
        navigation.setOptions({
            title: "FarmBox",
            headerShadowVisible: false,

            headerRight: ({ tintColor }) => (
                <Pressable
                    onPress={handleUpdateApiData}
                    disabled={isLoadingDbFarm}
                    hitSlop={{
                        top: 12,
                        bottom: 12,
                        left: 12,
                        right: 12,
                    }}
                    style={({ pressed }) => [
                        styles.headerIconButton,

                        pressed &&
                        !isLoadingDbFarm &&
                        styles.pressed,

                        isLoadingDbFarm &&
                        styles.headerIconButtonDisabled,
                    ]}
                >
                    {isLoadingDbFarm ? (
                        <ActivityIndicator
                            size="small"
                            color={tintColor}
                        />
                    ) : (
                        <MaterialCommunityIcons
                            name="database-refresh-outline"
                            size={23}
                            color={tintColor}
                        />
                    )}
                </Pressable>
            ),

            headerLeft: undefined,
        });
    }, [
        handleUpdateApiData,
        isLoadingDbFarm,
        navigation,
    ]);

    useEffect(() => {
        const getMapData = async () => {
            setIsLoadingMapData(true);

            try {
                const response = await fetch(
                    `${LINK}/plantio/get_map_plot_app_fetch_app/`,
                    {
                        headers: {
                            Authorization:
                                `Token ${EXPO_PUBLIC_REACT_APP_DJANGO_TOKEN}`,
                            "Content-Type": "application/json",
                        },
                        method: "GET",
                    }
                );

                if (response.status === 200) {
                    const payload = await response.json();

                    dispatch(
                        setMapPlot(
                            payload.dados || []
                        )
                    );
                }
            } catch (error) {
                console.log(
                    "Erro ao carregar mapas:",
                    error
                );
            } finally {
                setIsLoadingMapData(false);
            }
        };

        getMapData();
    }, [
        dispatch,
        setMapPlot,
    ]);

    useEffect(() => {
        getData();
    }, [getData]);

    useEffect(() => {
        setOnlyFarms(
            farmBoxData?.farms || []
        );
    }, [farmBoxData]);

    const filterOptions = useMemo(() => {
        const applications = Array.isArray(
            farmBoxData?.data
        )
            ? farmBoxData.data
            : [];

        return {
            safras: uniqueSorted(
                applications.map(
                    getApplicationSafra
                )
            ),

            ciclos: uniqueSorted(
                applications.map(
                    getApplicationCiclo
                )
            ),

            culturas: uniqueSorted(
                applications.map(
                    getApplicationCultura
                )
            ),
        };
    }, [
        farmBoxData,
        getApplicationCiclo,
        getApplicationCultura,
        getApplicationSafra,
        uniqueSorted,
    ]);

    /*
     * Caso uma atualização da API remova uma opção que estava
     * selecionada, limpa automaticamente o filtro inválido.
     */
    useEffect(() => {
        if (
            selectedSafra &&
            !filterOptions.safras.includes(selectedSafra)
        ) {
            setSelectedSafra(null);
        }

        if (
            selectedCiclo &&
            !filterOptions.ciclos.includes(selectedCiclo)
        ) {
            setSelectedCiclo(null);
        }

        if (
            selectedCultura &&
            !filterOptions.culturas.includes(selectedCultura)
        ) {
            setSelectedCultura(null);
        }
    }, [
        filterOptions,
        selectedCiclo,
        selectedCultura,
        selectedSafra,
    ]);

    /*
     * Pesquisa textual + Safra + Ciclo + Cultura.
     *
     * Todos os filtros são aplicados sobre o conjunto original
     * retornado pela API.
     */
    useEffect(() => {
        const applications = Array.isArray(
            farmBoxData?.data
        )
            ? farmBoxData.data
            : [];

        const normalizedQuery =
            normalizeText(searchQuery);

        const filtered = applications.filter(
            (application) => {
                const applicationSafra =
                    getApplicationSafra(application);

                const applicationCiclo =
                    getApplicationCiclo(application);

                const applicationCultura =
                    getApplicationCultura(application);

                const matchesSafra =
                    !selectedSafra ||
                    applicationSafra === selectedSafra;

                const matchesCiclo =
                    !selectedCiclo ||
                    applicationCiclo === selectedCiclo;

                const matchesCultura =
                    !selectedCultura ||
                    normalizeText(applicationCultura) ===
                    normalizeText(selectedCultura);

                if (
                    !matchesSafra ||
                    !matchesCiclo ||
                    !matchesCultura
                ) {
                    return false;
                }

                if (!normalizedQuery) {
                    return true;
                }

                const matchesFarm = normalizeText(
                    application?.farmName
                ).includes(normalizedQuery);

                const matchesOperation = normalizeText(
                    application?.operation
                ).includes(normalizedQuery);

                const matchesProduct = (
                    Array.isArray(application?.prods)
                        ? application.prods
                        : []
                ).some((product) =>
                    normalizeText(
                        product?.product
                    ).includes(normalizedQuery)
                );

                const matchesSafraSearch =
                    normalizeText(
                        applicationSafra
                    ).includes(normalizedQuery);

                const matchesCicloSearch =
                    normalizeText(
                        applicationCiclo
                    ).includes(normalizedQuery);

                const matchesCulturaSearch =
                    normalizeText(
                        applicationCultura
                    ).includes(normalizedQuery);

                return (
                    matchesFarm ||
                    matchesOperation ||
                    matchesProduct ||
                    matchesSafraSearch ||
                    matchesCicloSearch ||
                    matchesCulturaSearch
                );
            }
        );

        setFarmData(filtered);
    }, [
        farmBoxData,
        getApplicationCiclo,
        getApplicationCultura,
        getApplicationSafra,
        normalizeText,
        searchQuery,
        selectedCiclo,
        selectedCultura,
        selectedSafra,
    ]);

    useScrollToTop(ref);

    const getApplicationKind = useCallback(
        (application) => {
            const products = Array.isArray(
                application?.prods
            )
                ? application.prods
                : [];

            const productsWithoutOperation =
                products.filter(
                    (product) =>
                        product?.type !== "Operação"
                );

            if (
                productsWithoutOperation.length === 0
            ) {
                return "operation";
            }

            if (
                productsWithoutOperation.length === 1
            ) {
                return "solid";
            }

            return "liquid";
        },
        []
    );

    const farmCards = useMemo(() => {
        return onlyFarms
            .map((farmName) => {
                const applications = farmData.filter(
                    (application) =>
                        application?.farmName === farmName
                );

                if (!applications.length) {
                    return null;
                }

                const totals = applications.reduce(
                    (accumulator, application) => {
                        accumulator.requested += Number(
                            application?.areaSolicitada || 0
                        );

                        accumulator.applied += Number(
                            application?.areaAplicada || 0
                        );

                        accumulator.balance += Number(
                            application?.saldoAreaAplicar || 0
                        );

                        const applicationKind =
                            getApplicationKind(application);

                        if (
                            applicationKind === "solid"
                        ) {
                            accumulator.solid += 1;
                        } else if (
                            applicationKind === "liquid"
                        ) {
                            accumulator.liquid += 1;
                        } else {
                            accumulator.operation += 1;
                        }

                        return accumulator;
                    },
                    {
                        requested: 0,
                        applied: 0,
                        balance: 0,
                        solid: 0,
                        liquid: 0,
                        operation: 0,
                    }
                );

                if (totals.balance <= 0) {
                    return null;
                }

                const progress =
                    totals.requested > 0
                        ? Math.min(
                            totals.applied /
                            totals.requested,
                            1
                        )
                        : 0;

                return {
                    farmName,

                    displayName: farmName.replace(
                        /^Fazenda\s*/i,
                        ""
                    ),

                    applicationsCount:
                        applications.length,

                    requested:
                        totals.requested,

                    applied:
                        totals.applied,

                    balance:
                        totals.balance,

                    progress,

                    solidCount:
                        totals.solid,

                    liquidCount:
                        totals.liquid,

                    operationCount:
                        totals.operation,

                    kindLabels: [
                        totals.operation > 0
                            ? `${totals.operation} operação`
                            : null,

                        totals.solid > 0
                            ? `${totals.solid} sólido`
                            : null,

                        totals.liquid > 0
                            ? `${totals.liquid} líquido`
                            : null,
                    ].filter(Boolean),
                };
            })
            .filter(Boolean)
            .sort((first, second) =>
                first.displayName.localeCompare(
                    second.displayName,
                    "pt-BR",
                    {
                        sensitivity: "base",
                    }
                )
            );
    }, [
        farmData,
        getApplicationKind,
        onlyFarms,
    ]);

    const generalSummary = useMemo(() => {
        return farmCards.reduce(
            (accumulator, farm) => {
                accumulator.farms += 1;

                accumulator.applications +=
                    farm.applicationsCount;

                accumulator.requested +=
                    farm.requested;

                accumulator.applied +=
                    farm.applied;

                accumulator.balance +=
                    farm.balance;

                accumulator.solid +=
                    farm.solidCount;

                accumulator.liquid +=
                    farm.liquidCount;

                accumulator.operation +=
                    farm.operationCount;

                return accumulator;
            },
            {
                farms: 0,
                applications: 0,
                requested: 0,
                applied: 0,
                balance: 0,
                solid: 0,
                liquid: 0,
                operation: 0,
            }
        );
    }, [farmCards]);

    const summaryStats = useMemo(() => {
        return [
            {
                key: "farms",
                value: generalSummary.farms,
                label: "Fazendas",
                alwaysVisible: true,
            },
            {
                key: "applications",
                value: generalSummary.applications,
                label: "APs",
                alwaysVisible: true,
            },
            {
                key: "operation",
                value: generalSummary.operation,
                label: "Operações",
            },
            {
                key: "solid",
                value: generalSummary.solid,
                label: "Sólido",
            },
            {
                key: "liquid",
                value: generalSummary.liquid,
                label: "Líquido",
            },
        ].filter(
            (item) =>
                item.alwaysVisible ||
                item.value > 0
        );
    }, [generalSummary]);

    const hasActiveFilters =
        !!selectedSafra ||
        !!selectedCiclo ||
        !!selectedCultura;

    const activeFiltersCount = [
        selectedSafra,
        selectedCiclo,
        selectedCultura,
    ].filter(Boolean).length;

    const activeFiltersLabel = [
        selectedSafra,
        selectedCiclo
            ? `Ciclo ${selectedCiclo}`
            : null,
        selectedCultura,
    ]
        .filter(Boolean)
        .join(" • ");


    const handleSelectSafra = useCallback(
        (safra) => {
            triggerHeavyHaptic();

            setSelectedSafra((current) =>
                current === safra
                    ? null
                    : safra
            );
        },
        [triggerHeavyHaptic]
    );

    const handleSelectCiclo = useCallback(
        (ciclo) => {
            triggerHeavyHaptic();

            setSelectedCiclo((current) =>
                current === ciclo
                    ? null
                    : ciclo
            );
        },
        [triggerHeavyHaptic]
    );

    const handleSelectCultura = useCallback(
        (cultura) => {
            triggerHeavyHaptic();

            setSelectedCultura((current) =>
                current === cultura
                    ? null
                    : cultura
            );
        },
        [triggerHeavyHaptic]
    );

    const handleClearFilters = useCallback(() => {
        triggerHeavyHaptic();

        setSelectedSafra(null);
        setSelectedCiclo(null);
        setSelectedCultura(null);
    }, [triggerHeavyHaptic]);

    const handleShowFarm = useCallback(
        (farmName) => {
            triggerHeavyHaptic();

            const mainNavigation =
                navigation.getParent("MainStack");

            if (!mainNavigation) {
                Alert.alert(
                    "Erro de navegação",
                    "Não foi possível abrir as aplicações desta fazenda."
                );

                return;
            }

            mainNavigation.navigate(
                "FarmBoxFlowStack",
                {
                    screen: "FarmBoxFarms",

                    params: {
                        farm: farmName,
                        showSearch,

                        /*
                         * Envia também os filtros atuais.
                         * A tela seguinte pode utilizá-los futuramente.
                         */
                        selectedSafra,
                        selectedCiclo,
                        selectedCultura,
                    },
                }
            );
        },
        [
            navigation,
            selectedCiclo,
            selectedCultura,
            selectedSafra,
            showSearch,
            triggerHeavyHaptic,
        ]
    );

    const handleFilterProps = useCallback(() => {
        triggerHeavyHaptic();

        dispatch(
            setFarmboxSearchBar(!showSearch)
        );

        dispatch(
            setFarmboxSearchQuery("")
        );
    }, [
        dispatch,
        setFarmboxSearchBar,
        setFarmboxSearchQuery,
        showSearch,
        triggerHeavyHaptic,
    ]);

    const renderFilterChip = ({
        key,
        label,
        selected,
        onPress,
        icon,
    }) => {
        return (
            <Pressable
                key={key}
                onPress={onPress}
                style={({ pressed }) => [
                    styles.filterChip,

                    selected &&
                    styles.filterChipSelected,

                    pressed &&
                    styles.filterChipPressed,
                ]}
            >
                {icon && (
                    <MaterialCommunityIcons
                        name={icon}
                        size={13}
                        color={
                            selected
                                ? "#FFFFFF"
                                : "#64748B"
                        }
                    />
                )}

                <Text
                    numberOfLines={1}
                    style={[
                        styles.filterChipText,

                        selected &&
                        styles.filterChipTextSelected,
                    ]}
                >
                    {label}
                </Text>
            </Pressable>
        );
    };

    return (
        <View style={styles.screen}>
            {showSearch && (
                <View style={styles.searchWrap}>
                    <SearchBar
                        placeholder="Buscar fazenda, produto ou operação..."
                        value={searchQuery}
                        onChangeText={(value) =>
                            dispatch(
                                setFarmboxSearchQuery(value)
                            )
                        }
                    />
                </View>
            )}

            {isLoading && (
                <View style={styles.loadingBanner}>
                    <ActivityIndicator
                        size="small"
                        color={Colors.primary[600]}
                    />

                    <Text style={styles.loadingBannerText}>
                        Atualizando aplicações...
                    </Text>
                </View>
            )}

            <ScrollView
                ref={ref}
                contentInsetAdjustmentBehavior="automatic"
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={isLoading}
                        onRefresh={getData}
                        colors={[
                            Colors.primary[600],
                        ]}
                        tintColor={
                            Colors.primary[600]
                        }
                    />
                }
                contentContainerStyle={[
                    styles.scrollContent,
                    {
                        paddingBottom:
                            CUSTOM_TAB_BAR_CONTENT_PADDING +
                            40,
                    },
                ]}
            >
                {(filterOptions.safras.length > 0 ||
                    filterOptions.ciclos.length > 0 ||
                    filterOptions.culturas.length > 1) && (
                        <View style={styles.filtersContainer}>
                            <Pressable
                                onPress={() => {
                                    triggerHeavyHaptic();

                                    setIsFiltersExpanded(
                                        (current) => !current
                                    );
                                }}
                                style={({ pressed }) => [
                                    styles.filtersAccordionHeader,
                                    pressed && styles.pressed,
                                ]}
                            >
                                <View style={styles.filtersAccordionLeft}>
                                    <View style={styles.filtersIconWrap}>
                                        <MaterialCommunityIcons
                                            name="filter-variant"
                                            size={17}
                                            color={
                                                hasActiveFilters
                                                    ? "#FFFFFF"
                                                    : Colors.primary[700]
                                            }
                                        />
                                    </View>

                                    <View style={styles.filtersHeaderText}>
                                        <View style={styles.filtersTitleLine}>
                                            <Text style={styles.filtersTitle}>
                                                Filtros
                                            </Text>

                                            {hasActiveFilters && (
                                                <View style={styles.activeFiltersCount}>
                                                    <Text
                                                        style={
                                                            styles.activeFiltersCountText
                                                        }
                                                    >
                                                        {activeFiltersCount}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>

                                        <Text
                                            style={[
                                                styles.filtersCollapsedText,
                                                hasActiveFilters &&
                                                styles.filtersCollapsedTextActive,
                                            ]}
                                            numberOfLines={1}
                                        >
                                            {hasActiveFilters
                                                ? activeFiltersLabel
                                                : "Safra, ciclo e cultura"}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.filtersAccordionRight}>
                                    {hasActiveFilters && (
                                        <Pressable
                                            onPress={(event) => {
                                                event.stopPropagation();
                                                handleClearFilters();
                                            }}
                                            hitSlop={{
                                                top: 10,
                                                bottom: 10,
                                                left: 10,
                                                right: 10,
                                            }}
                                            style={({ pressed }) => [
                                                styles.clearFilterIconButton,
                                                pressed && styles.pressed,
                                            ]}
                                        >
                                            <MaterialCommunityIcons
                                                name="filter-remove-outline"
                                                size={18}
                                                color="#DC2626"
                                            />
                                        </Pressable>
                                    )}

                                    <MaterialCommunityIcons
                                        name={
                                            isFiltersExpanded
                                                ? "chevron-up"
                                                : "chevron-down"
                                        }
                                        size={22}
                                        color="#64748B"
                                    />
                                </View>
                            </Pressable>

                            {isFiltersExpanded && (
                                <View style={styles.filtersAccordionContent}>

                                    {(filterOptions.safras.length > 0 ||
                                        filterOptions.ciclos.length > 0) && (
                                            <View style={styles.compactFiltersInlineRow}>
                                                {filterOptions.safras.length > 0 && (
                                                    <View style={styles.inlineFilterGroup}>
                                                        <Text style={styles.inlineFilterLabel}>
                                                            Safra
                                                        </Text>

                                                        <View style={styles.inlineFilterOptions}>
                                                            {filterOptions.safras.map((safra) =>
                                                                renderFilterChip({
                                                                    key: `safra-${safra}`,
                                                                    label: safra,
                                                                    selected:
                                                                        selectedSafra === safra,
                                                                    onPress: () =>
                                                                        handleSelectSafra(safra),
                                                                    icon: "calendar-range",
                                                                })
                                                            )}
                                                        </View>
                                                    </View>
                                                )}

                                                {filterOptions.ciclos.length > 0 && (
                                                    <View style={styles.inlineFilterGroup}>
                                                        <Text style={styles.inlineFilterLabel}>
                                                            Ciclo
                                                        </Text>

                                                        <View style={styles.inlineFilterOptions}>
                                                            {filterOptions.ciclos.map((ciclo) =>
                                                                renderFilterChip({
                                                                    key: `ciclo-${ciclo}`,
                                                                    label: ciclo,
                                                                    selected:
                                                                        selectedCiclo === ciclo,
                                                                    onPress: () =>
                                                                        handleSelectCiclo(ciclo),
                                                                })
                                                            )}
                                                        </View>
                                                    </View>
                                                )}
                                            </View>
                                        )}
                                    {filterOptions.culturas.length > 1 && (
                                        <View style={styles.compactFilterRow}>
                                            <Text style={styles.filterLabel}>
                                                Cultura
                                            </Text>

                                            <View style={styles.filterOptionsRow}>
                                                {filterOptions.culturas.map(
                                                    (cultura) =>
                                                        renderFilterChip({
                                                            key: `cultura-${cultura}`,
                                                            label: cultura,
                                                            selected:
                                                                selectedCultura ===
                                                                cultura,
                                                            onPress: () =>
                                                                handleSelectCultura(
                                                                    cultura
                                                                ),
                                                            icon: "sprout-outline",
                                                        })
                                                )}
                                            </View>
                                        </View>
                                    )}

                                    {hasActiveFilters && (
                                        <Pressable
                                            onPress={handleClearFilters}
                                            style={({ pressed }) => [
                                                styles.clearFiltersFooter,
                                                pressed && styles.pressed,
                                            ]}
                                        >
                                            <MaterialCommunityIcons
                                                name="close-circle-outline"
                                                size={16}
                                                color="#DC2626"
                                            />

                                            <Text style={styles.clearFiltersFooterText}>
                                                Limpar todos os filtros
                                            </Text>
                                        </Pressable>
                                    )}
                                </View>
                            )}
                        </View>
                    )}

                <View style={styles.heroCard}>
                    <View style={styles.heroHeaderRow}>
                        <View>
                            <Text style={styles.heroEyebrow}>
                                APLICAÇÕES EM ABERTO
                            </Text>

                            <Text style={styles.heroBalanceValue}>
                                {formatNumber(
                                    generalSummary.balance
                                )}{" "}
                                ha
                            </Text>

                            <Text style={styles.heroBalanceLabel}>
                                saldo total para aplicar
                            </Text>
                        </View>

                        <View style={styles.heroIconWrap}>
                            <MaterialCommunityIcons
                                name="sprout-outline"
                                size={22}
                                color="#FFFFFF"
                            />
                        </View>
                    </View>

                    <View style={styles.heroStatsRow}>
                        {summaryStats.map(
                            (item, index) => {
                                const isLast =
                                    index ===
                                    summaryStats.length - 1;

                                return (
                                    <View
                                        key={item.key}
                                        style={[
                                            styles.heroStatItem,

                                            !isLast &&
                                            styles.heroStatItemDivider,
                                        ]}
                                    >
                                        <Text style={styles.heroStatValue}>
                                            {item.value}
                                        </Text>

                                        <Text style={styles.heroStatLabel}>
                                            {item.label}
                                        </Text>
                                    </View>
                                );
                            }
                        )}
                    </View>
                </View>

                <View style={styles.sectionHeader}>
                    <View style={styles.sectionTitleWrap}>
                        <Text style={styles.sectionTitle}>
                            Fazendas com Aplicações
                        </Text>

                        {hasActiveFilters && (
                            <View style={styles.activeFiltersTextRow}>
                                {selectedSafra && (
                                    <Text style={styles.activeFilterText}>
                                        {selectedSafra}
                                    </Text>
                                )}

                                {selectedCiclo && (
                                    <>
                                        {!!selectedSafra && (
                                            <View style={styles.activeFilterDot} />
                                        )}

                                        <Text style={styles.activeFilterText}>
                                            Ciclo {selectedCiclo}
                                        </Text>
                                    </>
                                )}

                                {selectedCultura && (
                                    <>
                                        {(selectedSafra ||
                                            selectedCiclo) && (
                                                <View style={styles.activeFilterDot} />
                                            )}

                                        <Text style={styles.activeFilterText}>
                                            {selectedCultura}
                                        </Text>
                                    </>
                                )}
                            </View>
                        )}
                    </View>

                    <View style={styles.resultBadge}>
                        <Text style={styles.resultBadgeText}>
                            {farmCards.length}
                        </Text>
                    </View>
                </View>

                {farmCards.length === 0 &&
                    !isLoading ? (
                    <View style={styles.emptyCard}>
                        <MaterialCommunityIcons
                            name="check-circle-outline"
                            size={34}
                            color={
                                Colors.succes?.[500] ||
                                "#16A34A"
                            }
                        />

                        <Text style={styles.emptyTitle}>
                            Nenhuma pendência encontrada
                        </Text>

                        <Text style={styles.emptySubtitle}>
                            Não há saldo em aberto para os filtros atuais.
                        </Text>

                        {hasActiveFilters && (
                            <Pressable
                                onPress={handleClearFilters}
                                style={({ pressed }) => [
                                    styles.emptyClearButton,

                                    pressed &&
                                    styles.pressed,
                                ]}
                            >
                                <MaterialCommunityIcons
                                    name="filter-remove-outline"
                                    size={17}
                                    color={Colors.primary[700]}
                                />

                                <Text style={styles.emptyClearButtonText}>
                                    Limpar filtros
                                </Text>
                            </Pressable>
                        )}
                    </View>
                ) : (
                    farmCards.map((farmCard) => (
                        <Pressable
                            key={farmCard.farmName}
                            onPress={() =>
                                handleShowFarm(
                                    farmCard.farmName
                                )
                            }
                            style={({ pressed }) => [
                                styles.farmCard,

                                pressed &&
                                styles.farmCardPressed,
                            ]}
                        >
                            <View style={styles.farmCardHeader}>
                                <View style={styles.farmAvatar}>
                                    <MaterialCommunityIcons
                                        name="barn"
                                        size={19}
                                        color={
                                            Colors.primary[700]
                                        }
                                    />
                                </View>

                                <View style={styles.farmHeaderText}>
                                    <Text
                                        style={styles.farmName}
                                        numberOfLines={1}
                                    >
                                        {farmCard.displayName}
                                    </Text>

                                    <View style={styles.farmMetaRow}>
                                        <Text style={styles.farmMetaText}>
                                            {
                                                farmCard.applicationsCount
                                            }{" "}
                                            AP
                                            {farmCard.applicationsCount >
                                                1
                                                ? "s"
                                                : ""}
                                        </Text>

                                        {farmCard.kindLabels.map(
                                            (label) => (
                                                <View
                                                    key={label}
                                                    style={
                                                        styles.metaItemInline
                                                    }
                                                >
                                                    <View
                                                        style={
                                                            styles.metaDot
                                                        }
                                                    />

                                                    <Text
                                                        style={
                                                            styles.farmMetaText
                                                        }
                                                    >
                                                        {label}
                                                    </Text>
                                                </View>
                                            )
                                        )}
                                    </View>
                                </View>

                                <View style={styles.cardBalanceWrap}>
                                    <Text style={styles.cardBalanceValue}>
                                        {formatNumber(
                                            farmCard.balance
                                        )}
                                    </Text>

                                    <Text style={styles.cardBalanceUnit}>
                                        ha saldo
                                    </Text>
                                </View>

                                <MaterialCommunityIcons
                                    name="chevron-right"
                                    size={21}
                                    color="#94A3B8"
                                />
                            </View>

                            <View style={styles.progressTrack}>
                                <View
                                    style={[
                                        styles.progressFill,
                                        {
                                            width: `${Math.max(
                                                3,
                                                Math.round(
                                                    farmCard.progress *
                                                    100
                                                )
                                            )}%`,
                                        },
                                    ]}
                                />
                            </View>

                            <View style={styles.compactFooterRow}>
                                <Text style={styles.compactMetricText}>
                                    Solicitado:{" "}
                                    <Text
                                        style={
                                            styles.compactMetricStrong
                                        }
                                    >
                                        {formatNumber(
                                            farmCard.requested
                                        )}{" "}
                                        ha
                                    </Text>
                                </Text>

                                <Text style={styles.compactMetricText}>
                                    Aplicado:{" "}
                                    <Text
                                        style={
                                            styles.compactMetricStrong
                                        }
                                    >
                                        {formatNumber(
                                            farmCard.applied
                                        )}{" "}
                                        ha
                                    </Text>
                                </Text>

                                <Text style={styles.compactPercentText}>
                                    {Math.round(
                                        farmCard.progress *
                                        100
                                    )}
                                    %
                                </Text>
                            </View>
                        </Pressable>
                    ))
                )}
            </ScrollView>

            <View style={styles.fabContainer}>
                <FAB
                    style={styles.fab}
                    icon={
                        showSearch
                            ? "close"
                            : "magnify"
                    }
                    color="#0F172A"
                    onPress={handleFilterProps}
                />
            </View>
        </View>
    );
};

export default FarmBoxScreen;

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: "#F4F6F8",
    },

    scrollContent: {
        paddingHorizontal: 14,
        paddingTop: 10,
    },

    searchWrap: {
        backgroundColor: "#F4F6F8",
        paddingHorizontal: 12,
        paddingTop: 8,
        paddingBottom: 4,
    },

    headerIconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
    },

    headerIconButtonDisabled: {
        opacity: 0.65,
    },

    loadingBanner: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 8,
        borderBottomWidth:
            StyleSheet.hairlineWidth,
        borderBottomColor:
            "rgba(15,23,42,0.08)",
        backgroundColor:
            "rgba(255,255,255,0.94)",
    },

    loadingBannerText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#475569",
    },

    filtersContainer: {
        marginBottom: 10,
        paddingHorizontal: 12,
        paddingTop: 10,
        paddingBottom: 8,
        borderRadius: 16,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(15,23,42,0.10)",
        backgroundColor: "#FFFFFF",
        shadowColor: "#0F172A",
        shadowOpacity:
            Platform.OS === "ios"
                ? 0.05
                : 0,
        shadowRadius: 10,
        shadowOffset: {
            width: 0,
            height: 5,
        },
        elevation:
            Platform.OS === "android"
                ? 2
                : 0,
    },

    filtersTopRow: {
        minHeight: 24,
        marginBottom: 5,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },

    filtersTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
    },

    filtersTitle: {
        fontSize: 12,
        fontWeight: "900",
        color: "#334155",
    },

    clearFilterButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        paddingHorizontal: 4,
        paddingVertical: 3,
    },

    clearFilterText: {
        fontSize: 9.5,
        fontWeight: "800",
        color: "#DC2626",
    },

    compactFilterRow: {
        minHeight: 38,
        flexDirection: "row",
        alignItems: "center",
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: "rgba(15,23,42,0.06)",
    },

    filterLabel: {
        width: 53,
        marginRight: 5,
        fontSize: 9,
        fontWeight: "900",
        letterSpacing: 0.3,
        textTransform: "uppercase",
        color: "#94A3B8",
    },

    filterOptionsRow: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },

    filterChip: {
        minHeight: 28,
        flexShrink: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        paddingHorizontal: 9,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        backgroundColor: "#F8FAFC",
    },

    filterChipSelected: {
        borderColor:
            Colors.primary[700],
        backgroundColor:
            Colors.primary[700],
    },

    filterChipPressed: {
        opacity: 0.7,
    },

    filterChipText: {
        flexShrink: 1,
        fontSize: 9.5,
        fontWeight: "800",
        color: "#64748B",
    },

    filterChipTextSelected: {
        color: "#FFFFFF",
    },

    heroCard: {
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor:
            Colors.primary[700] ||
            "#17324D",
        shadowColor: "#0F172A",
        shadowOpacity:
            Platform.OS === "ios"
                ? 0.14
                : 0,
        shadowRadius: 14,
        shadowOffset: {
            width: 0,
            height: 8,
        },
        elevation:
            Platform.OS === "android"
                ? 4
                : 0,
    },

    heroHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },

    heroEyebrow: {
        fontSize: 9,
        fontWeight: "900",
        letterSpacing: 1,
        color: "rgba(255,255,255,0.60)",
    },

    heroBalanceValue: {
        marginTop: 2,
        fontSize: 27,
        fontWeight: "900",
        letterSpacing: -0.7,
        color: "#FFFFFF",
    },

    heroBalanceLabel: {
        marginTop: 1,
        fontSize: 10,
        fontWeight: "700",
        color: "rgba(255,255,255,0.66)",
    },

    heroIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor:
            "rgba(255,255,255,0.13)",
    },

    heroStatsRow: {
        marginTop: 12,
        paddingTop: 12,
        flexDirection: "row",
        borderTopWidth: 1,
        borderTopColor:
            "rgba(255,255,255,0.36)",
    },

    heroStatItem: {
        flex: 1,
        minHeight: 40,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 5,
    },

    heroStatItemDivider: {
        borderRightWidth: 1,
        borderRightColor:
            "rgba(255,255,255,0.30)",
    },

    heroStatValue: {
        fontSize: 15,
        fontWeight: "900",
        color: "#FFFFFF",
    },

    heroStatLabel: {
        marginTop: 1,
        fontSize: 8.5,
        fontWeight: "700",
        color: "rgba(255,255,255,0.62)",
    },

    sectionHeader: {
        marginTop: 18,
        marginBottom: 8,
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "space-between",
    },

    sectionTitleWrap: {
        flex: 1,
        minWidth: 0,
        paddingRight: 10,
    },

    sectionTitle: {
        fontSize: 18,
        fontWeight: "900",
        letterSpacing: -0.25,
        color: "#0F172A",
    },

    activeFiltersTextRow: {
        marginTop: 3,
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
    },

    activeFilterText: {
        fontSize: 9.5,
        fontWeight: "800",
        color: Colors.primary[600],
    },

    activeFilterDot: {
        width: 3,
        height: 3,
        marginHorizontal: 5,
        borderRadius: 2,
        backgroundColor: "#94A3B8",
    },

    resultBadge: {
        minWidth: 28,
        height: 28,
        paddingHorizontal: 8,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#E2E8F0",
    },

    resultBadgeText: {
        fontSize: 11,
        fontWeight: "900",
        color: "#475569",
    },

    farmCard: {
        marginBottom: 9,
        paddingHorizontal: 13,
        paddingVertical: 12,
        borderRadius: 18,
        borderWidth: 3,
        borderColor: Colors.primary100,
        backgroundColor: "#FFFFFF",
        shadowColor: "#0F172A",
        shadowOpacity:
            Platform.OS === "ios"
                ? 0.06
                : 0,
        shadowRadius: 10,
        shadowOffset: {
            width: 0,
            height: 5,
        },
        elevation:
            Platform.OS === "android"
                ? 2
                : 0,
    },

    farmCardPressed: {
        opacity: 0.78,
        transform: [
            {
                scale: 0.994,
            },
        ],
    },

    farmCardHeader: {
        flexDirection: "row",
        alignItems: "center",
    },

    farmAvatar: {
        width: 36,
        height: 36,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#EEF4F8",
    },

    farmHeaderText: {
        flex: 1,
        marginLeft: 10,
        marginRight: 8,
    },

    farmName: {
        fontSize: 15,
        fontWeight: "900",
        letterSpacing: -0.15,
        color: Colors.primary[700],
    },

    farmMetaRow: {
        marginTop: 3,
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
    },

    farmMetaText: {
        fontSize: 9.5,
        fontWeight: "700",
        color: "#64748B",
    },

    metaItemInline: {
        flexDirection: "row",
        alignItems: "center",
    },

    metaDot: {
        width: 3,
        height: 3,
        marginHorizontal: 5,
        borderRadius: 2,
        backgroundColor: "#CBD5E1",
    },

    cardBalanceWrap: {
        minWidth: 72,
        marginRight: 4,
        alignItems: "flex-end",
    },

    cardBalanceValue: {
        fontSize: 15,
        fontWeight: "900",
        color: "#0F172A",
    },

    cardBalanceUnit: {
        marginTop: 1,
        fontSize: 8.5,
        fontWeight: "700",
        color: "#94A3B8",
    },

    progressTrack: {
        height: 5,
        marginTop: 10,
        overflow: "hidden",
        borderRadius: 999,
        backgroundColor: "#E8EDF2",
    },

    progressFill: {
        height: "100%",
        borderRadius: 999,
        backgroundColor:
            Colors.succes?.[500] ||
            "#22C55E",
    },

    compactFooterRow: {
        marginTop: 8,
        flexDirection: "row",
        alignItems: "center",
    },

    compactMetricText: {
        flex: 1,
        fontSize: 8.8,
        fontWeight: "700",
        color: "#94A3B8",
    },

    compactMetricStrong: {
        color: "#475569",
        fontWeight: "900",
    },

    compactPercentText: {
        marginLeft: 8,
        fontSize: 10,
        fontWeight: "900",
        color: Colors.primary[700],
    },

    emptyCard: {
        marginTop: 4,
        paddingVertical: 28,
        paddingHorizontal: 22,
        borderRadius: 20,
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(15,23,42,0.08)",
    },

    emptyTitle: {
        marginTop: 10,
        fontSize: 15,
        fontWeight: "900",
        color: "#0F172A",
    },

    emptySubtitle: {
        marginTop: 4,
        maxWidth: 260,
        textAlign: "center",
        fontSize: 11,
        lineHeight: 16,
        color: "#64748B",
    },

    emptyClearButton: {
        marginTop: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 13,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: Colors.primary[100],
    },

    emptyClearButtonText: {
        fontSize: 10,
        fontWeight: "900",
        color: Colors.primary[700],
    },

    fabContainer: {
        position: "absolute",
        right: 18,
        bottom: 0,
    },

    fab: {
        position: "absolute",
        right: 18,
        bottom:
            Platform.OS === "android"
                ? 20
                : 96,
        width: 50,
        height: 50,
        borderRadius: 25,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor:
            "rgba(255,255,255,0.94)",
        borderWidth:
            StyleSheet.hairlineWidth,
        borderColor:
            "rgba(15,23,42,0.10)",
        elevation: 6,
        shadowColor: "#0F172A",
        shadowOpacity: 0.16,
        shadowRadius: 14,
        shadowOffset: {
            width: 0,
            height: 8,
        },
    },

    pressed: {
        opacity: 0.7,
    },
    filtersContainer: {
        marginBottom: 10,
        overflow: "hidden",
        borderRadius: 16,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(15,23,42,0.10)",
        backgroundColor: "#FFFFFF",
        shadowColor: "#0F172A",
        shadowOpacity: Platform.OS === "ios" ? 0.05 : 0,
        shadowRadius: 10,
        shadowOffset: {
            width: 0,
            height: 5,
        },
        elevation: Platform.OS === "android" ? 2 : 0,
    },

    filtersAccordionHeader: {
        minHeight: 58,
        paddingHorizontal: 12,
        paddingVertical: 9,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },

    filtersAccordionLeft: {
        flex: 1,
        minWidth: 0,
        flexDirection: "row",
        alignItems: "center",
    },

    filtersIconWrap: {
        width: 34,
        height: 34,
        marginRight: 9,
        borderRadius: 11,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: Colors.primary[100],
    },

    filtersHeaderText: {
        flex: 1,
        minWidth: 0,
    },

    filtersTitleLine: {
        flexDirection: "row",
        alignItems: "center",
    },

    filtersTitle: {
        fontSize: 13,
        fontWeight: "900",
        color: "#334155",
    },

    activeFiltersCount: {
        minWidth: 19,
        height: 19,
        marginLeft: 6,
        paddingHorizontal: 5,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: Colors.primary[700],
    },

    activeFiltersCountText: {
        fontSize: 9,
        fontWeight: "900",
        color: "#FFFFFF",
    },

    filtersCollapsedText: {
        marginTop: 2,
        fontSize: 9.5,
        fontWeight: "700",
        color: "#94A3B8",
    },

    filtersCollapsedTextActive: {
        color: Colors.primary[600],
    },

    filtersAccordionRight: {
        marginLeft: 8,
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
    },

    clearFilterIconButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FEF2F2",
    },

    filtersAccordionContent: {
        paddingHorizontal: 12,
        paddingBottom: 9,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: "rgba(15,23,42,0.07)",
    },

    compactFilterRow: {
        minHeight: 42,
        flexDirection: "row",
        alignItems: "center",
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: "rgba(15,23,42,0.06)",
    },

    filterLabel: {
        width: 54,
        marginRight: 5,
        fontSize: 9,
        fontWeight: "900",
        letterSpacing: 0.3,
        textTransform: "uppercase",
        color: "#94A3B8",
    },

    filterOptionsRow: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },

    filterChip: {
        minHeight: 29,
        flexShrink: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        paddingHorizontal: 10,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        backgroundColor: "#F8FAFC",
    },

    filterChipSelected: {
        borderColor: Colors.primary[700],
        backgroundColor: Colors.primary[700],
    },

    filterChipPressed: {
        opacity: 0.7,
    },

    filterChipText: {
        flexShrink: 1,
        fontSize: 9.5,
        fontWeight: "800",
        color: "#64748B",
    },

    filterChipTextSelected: {
        color: "#FFFFFF",
    },

    clearFiltersFooter: {
        alignSelf: "flex-end",
        marginTop: 8,
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 8,
        paddingVertical: 5,
    },

    clearFiltersFooterText: {
        fontSize: 9.5,
        fontWeight: "800",
        color: "#DC2626",
    },
    compactFiltersInlineRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 8,
    },

    inlineFilterGroup: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },

    inlineFilterLabel: {
        fontSize: 9,
        fontWeight: "900",
        letterSpacing: 0.3,
        textTransform: "uppercase",
        color: "#94A3B8",
    },

    inlineFilterOptions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
    },
});