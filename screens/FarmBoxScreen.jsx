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

import { newMapArr } from "./plot-helper";

import { FAB } from "react-native-paper";
import SearchBar from "../components/Global/SearchBar";

import { CUSTOM_TAB_BAR_CONTENT_PADDING } from "../constants/layout";

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

    const triggerHeavyHaptic = useCallback(() => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        } catch (error) {
            // Haptics pode falhar em simuladores sem interromper a navegação.
        }
    }, []);

    const getData = useCallback(async () => {
        setIsLoading(true);

        try {
            const response = await fetch(`${NODELINK}/data-open-apps-fetch-app/`, {
                headers: {
                    Authorization: `Token ${EXPO_PUBLIC_REACT_APP_DJANGO_TOKEN}`,
                    "Content-Type": "application/json",
                },
                method: "GET",
            });

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
            console.log("Erro ao carregar aplicações:", error);
            Alert.alert(
                "Problema na API",
                `Possível erro de internet ao buscar as aplicações: ${error}`
            );
        } finally {
            setIsLoading(false);
        }
    }, [dispatch, setFarmBoxData]);

    const handleUpdateApiData = useCallback(async () => {
        if (isLoadingDbFarm) return;

        setIsLoadingDbFarm(true);
        triggerHeavyHaptic();

        try {
            const response = await fetch(
                `${LINK}/defensivo/update_farmbox_mongodb_data/`,
                {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Token ${EXPO_PUBLIC_REACT_APP_DJANGO_TOKEN}`,
                    },
                }
            );

            if (response.status === 200) {
                await getData();
                Alert.alert("Tudo certo", "Aplicações atualizadas com sucesso.");
                return;
            }

            Alert.alert(
                "Atenção",
                `A atualização retornou status ${response.status}.`
            );
        } catch (error) {
            console.error(error);
            Alert.alert("Não foi possível atualizar", `Erro: ${error}`);
        } finally {
            setIsLoadingDbFarm(false);
        }
    }, [getData, isLoadingDbFarm, triggerHeavyHaptic]);

    useLayoutEffect(() => {
        navigation.setOptions({
            title: "FarmBox",
            headerShadowVisible: false,
            headerRight: ({ tintColor }) => (
                <Pressable
                    onPress={handleUpdateApiData}
                    disabled={isLoadingDbFarm}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    style={({ pressed }) => [
                        styles.headerIconButton,
                        pressed && !isLoadingDbFarm && styles.pressed,
                        isLoadingDbFarm && styles.headerIconButtonDisabled,
                    ]}
                >
                    {isLoadingDbFarm ? (
                        <ActivityIndicator size="small" color={tintColor} />
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
    }, [handleUpdateApiData, isLoadingDbFarm, navigation]);

    useEffect(() => {
        const getMapData = async () => {
            setIsLoadingMapData(true);

            try {
                const response = await fetch(
                    `${LINK}/plantio/get_map_plot_app_fetch_app/`,
                    {
                        headers: {
                            Authorization: `Token ${EXPO_PUBLIC_REACT_APP_DJANGO_TOKEN}`,
                            "Content-Type": "application/json",
                        },
                        method: "GET",
                    }
                );

                if (response.status === 200) {
                    const payload = await response.json();
                    dispatch(setMapPlot(payload.dados || []));
                }
            } catch (error) {
                console.log("Erro ao carregar mapas:", error);
            } finally {
                setIsLoadingMapData(false);
            }
        };

        getMapData();
    }, [dispatch, setMapPlot]);

    useEffect(() => {
        getData();
    }, [getData]);

    useEffect(() => {
        setFarmData(farmBoxData?.data || []);
        setOnlyFarms(farmBoxData?.farms || []);
    }, [farmBoxData]);

    useEffect(() => {
        const applications = farmBoxData?.data || [];
        const normalizedQuery = normalizeText(searchQuery);

        if (!normalizedQuery) {
            setFarmData(applications);
            return;
        }

        const filtered = applications.filter((application) => {
            const matchesFarm = normalizeText(application?.farmName).includes(
                normalizedQuery
            );

            const matchesOperation = normalizeText(application?.operation).includes(
                normalizedQuery
            );

            const matchesProduct = (application?.prods || []).some((product) =>
                normalizeText(product?.product).includes(normalizedQuery)
            );

            return matchesFarm || matchesOperation || matchesProduct;
        });

        setFarmData(filtered);
    }, [farmBoxData, normalizeText, searchQuery]);

    useScrollToTop(ref);

    const getApplicationKind = useCallback((application) => {
        const products = Array.isArray(application?.prods)
            ? application.prods
            : [];

        const productsWithoutOperation = products.filter(
            (product) => product?.type !== "Operação"
        );

        if (productsWithoutOperation.length === 0) {
            return "operation";
        }

        if (productsWithoutOperation.length === 1) {
            return "solid";
        }

        return "liquid";
    }, []);

    const farmCards = useMemo(() => {
        return onlyFarms
            .map((farmName) => {
                const applications = farmData.filter(
                    (application) => application?.farmName === farmName
                );

                if (!applications.length) return null;

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

                        const applicationKind = getApplicationKind(application);

                        if (applicationKind === "solid") {
                            accumulator.solid += 1;
                        } else if (applicationKind === "liquid") {
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

                if (totals.balance <= 0) return null;

                const progress =
                    totals.requested > 0
                        ? Math.min(totals.applied / totals.requested, 1)
                        : 0;

                return {
                    farmName,
                    displayName: farmName.replace(/^Fazenda\s*/i, ""),
                    applicationsCount: applications.length,
                    requested: totals.requested,
                    applied: totals.applied,
                    balance: totals.balance,
                    progress,
                    solidCount: totals.solid,
                    liquidCount: totals.liquid,
                    operationCount: totals.operation,
                    kindLabels: [
                        totals.operation > 0
                            ? `${totals.operation} operação${totals.operation > 1 ? "" : ""}`
                            : null,
                        totals.solid > 0
                            ? `${totals.solid} sólido${totals.solid > 1 ? "" : ""}`
                            : null,
                        totals.liquid > 0
                            ? `${totals.liquid} líquido${totals.liquid > 1 ? "" : ""}`
                            : null,
                    ].filter(Boolean),
                };
            })
            .filter(Boolean)
            .sort((first, second) =>
                first.displayName.localeCompare(second.displayName, "pt-BR", {
                    sensitivity: "base",
                })
            );
    }, [farmData, getApplicationKind, onlyFarms]);

    const generalSummary = useMemo(() => {
        return farmCards.reduce(
            (accumulator, farm) => {
                accumulator.farms += 1;
                accumulator.applications += farm.applicationsCount;
                accumulator.requested += farm.requested;
                accumulator.applied += farm.applied;
                accumulator.balance += farm.balance;
                accumulator.solid += farm.solidCount;
                accumulator.liquid += farm.liquidCount;
                accumulator.operation += farm.operationCount;
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
        ].filter((item) => item.alwaysVisible || item.value > 0);
    }, [generalSummary]);

    const handleShowFarm = useCallback(
        (farmName) => {
            triggerHeavyHaptic();

            const mainNavigation = navigation.getParent("MainStack");

            if (!mainNavigation) {
                Alert.alert(
                    "Erro de navegação",
                    "Não foi possível abrir as aplicações desta fazenda."
                );
                return;
            }

            mainNavigation.navigate("FarmBoxFlowStack", {
                screen: "FarmBoxFarms",
                params: {
                    farm: farmName,
                    showSearch,
                },
            });
        },
        [navigation, showSearch, triggerHeavyHaptic]
    );

    const handleFilterProps = useCallback(() => {
        triggerHeavyHaptic();
        dispatch(setFarmboxSearchBar(!showSearch));
        dispatch(setFarmboxSearchQuery(""));
    }, [
        dispatch,
        setFarmboxSearchBar,
        setFarmboxSearchQuery,
        showSearch,
        triggerHeavyHaptic,
    ]);

    return (
        <View style={styles.screen}>
            {showSearch && (
                <View style={styles.searchWrap}>
                    <SearchBar
                        placeholder="Buscar fazenda, produto ou operação..."
                        value={searchQuery}
                        onChangeText={(value) => dispatch(setFarmboxSearchQuery(value))}
                    />
                </View>
            )}

            {isLoading && (
                <View style={styles.loadingBanner}>
                    <ActivityIndicator size="small" color={Colors.primary[600]} />
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
                        colors={[Colors.primary[600]]}
                        tintColor={Colors.primary[600]}
                    />
                }
                contentContainerStyle={[
                    styles.scrollContent,
                    {
                        paddingBottom: CUSTOM_TAB_BAR_CONTENT_PADDING + 40,
                    },
                ]}
            >
                <View style={styles.heroCard}>
                    <View style={styles.heroHeaderRow}>
                        <View>
                            <Text style={styles.heroEyebrow}>APLICAÇÕES EM ABERTO</Text>
                            <Text style={styles.heroBalanceValue}>
                                {formatNumber(generalSummary.balance)} ha
                            </Text>
                            <Text style={styles.heroBalanceLabel}>saldo total para aplicar</Text>
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
                        {summaryStats.map((item, index) => {
                            const isLast =
                                index === summaryStats.length - 1;

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
                        })}
                    </View>
                </View>

                <View style={styles.sectionHeader}>
                    <View>
                        <Text style={styles.sectionTitle}>Fazendas com Aplicações</Text>
                    </View>

                    <View style={styles.resultBadge}>
                        <Text style={styles.resultBadgeText}>{farmCards.length}</Text>
                    </View>
                </View>

                {farmCards.length === 0 && !isLoading ? (
                    <View style={styles.emptyCard}>
                        <MaterialCommunityIcons
                            name="check-circle-outline"
                            size={34}
                            color={Colors.succes?.[500] || "#16A34A"}
                        />
                        <Text style={styles.emptyTitle}>Nenhuma pendência encontrada</Text>
                        <Text style={styles.emptySubtitle}>
                            Não há saldo em aberto para os filtros atuais.
                        </Text>
                    </View>
                ) : (
                    farmCards.map((farmCard) => (
                        <Pressable
                            key={farmCard.farmName}
                            onPress={() => handleShowFarm(farmCard.farmName)}
                            style={({ pressed }) => [
                                styles.farmCard,
                                pressed && styles.farmCardPressed,
                            ]}
                        >
                            <View style={styles.farmCardHeader}>
                                <View style={styles.farmAvatar}>
                                    <MaterialCommunityIcons
                                        name="barn"
                                        size={19}
                                        color={Colors.primary[700]}
                                    />
                                </View>

                                <View style={styles.farmHeaderText}>
                                    <Text style={styles.farmName} numberOfLines={1}>
                                        {farmCard.displayName}
                                    </Text>

                                    <View style={styles.farmMetaRow}>
                                        <Text style={styles.farmMetaText}>
                                            {farmCard.applicationsCount} AP{farmCard.applicationsCount > 1 ? "s" : ""}
                                        </Text>

                                        {farmCard.kindLabels.map((label) => (
                                            <View key={label} style={styles.metaItemInline}>
                                                <View style={styles.metaDot} />
                                                <Text style={styles.farmMetaText}>{label}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>

                                <View style={styles.cardBalanceWrap}>
                                    <Text style={styles.cardBalanceValue}>
                                        {formatNumber(farmCard.balance)}
                                    </Text>
                                    <Text style={styles.cardBalanceUnit}>ha saldo</Text>
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
                                                Math.round(farmCard.progress * 100)
                                            )}%`,
                                        },
                                    ]}
                                />
                            </View>

                            <View style={styles.compactFooterRow}>
                                <Text style={styles.compactMetricText}>
                                    Solicitado: <Text style={styles.compactMetricStrong}>{formatNumber(farmCard.requested)} ha</Text>
                                </Text>

                                <Text style={styles.compactMetricText}>
                                    Aplicado: <Text style={styles.compactMetricStrong}>{formatNumber(farmCard.applied)} ha</Text>
                                </Text>

                                <Text style={styles.compactPercentText}>
                                    {Math.round(farmCard.progress * 100)}%
                                </Text>
                            </View>
                        </Pressable>
                    ))
                )}
            </ScrollView>

            <View style={styles.fabContainer}>
                <FAB
                    style={styles.fab}
                    icon={showSearch ? "close" : "magnify"}
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
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: "rgba(15,23,42,0.08)",
        backgroundColor: "rgba(255,255,255,0.94)",
    },

    loadingBannerText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#475569",
    },

    heroCard: {
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: Colors.primary[700] || "#17324D",
        shadowColor: "#0F172A",
        shadowOpacity: Platform.OS === "ios" ? 0.14 : 0,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 8 },
        elevation: Platform.OS === "android" ? 4 : 0,
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
        backgroundColor: "rgba(255,255,255,0.13)",
    },

    heroStatsRow: {
        marginTop: 12,
        paddingTop: 12,
        flexDirection: "row",

        borderTopWidth: 1,
        borderTopColor: "rgba(255,255,255,0.36)",
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
        borderRightColor: "rgba(255,255,255,0.30)",
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

    sectionEyebrow: {
        fontSize: 9,
        fontWeight: "900",
        letterSpacing: 1,
        color: "#94A3B8",
    },

    sectionTitle: {
        marginTop: 1,
        fontSize: 18,
        fontWeight: "900",
        letterSpacing: -0.25,
        color: "#0F172A",
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
        shadowOpacity: Platform.OS === "ios" ? 0.06 : 0,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 5 },
        elevation: Platform.OS === "android" ? 2 : 0,
    },

    farmCardPressed: {
        opacity: 0.78,
        transform: [{ scale: 0.994 }],
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
        backgroundColor: Colors.succes?.[500] || "#22C55E",
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

    fabContainer: {
        position: "absolute",
        right: 18,
        bottom: 0,
    },

    fab: {
        position: "absolute",
        right: 18,
        bottom: Platform.OS === 'android' ? 20 : 96,
        width: 50,
        height: 50,
        borderRadius: 25,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(255,255,255,0.94)",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(15,23,42,0.10)",
        elevation: 6,
        shadowColor: "#0F172A",
        shadowOpacity: 0.16,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 8 },
    },

    pressed: {
        opacity: 0.7,
    },
});
