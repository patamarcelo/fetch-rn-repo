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
import { useState, useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { useRoute, useScrollToTop } from "@react-navigation/native";

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

    const route = useRoute();
    const dispatch = useDispatch();

    const ref = useRef(null);

    const farmBoxData = useSelector(selectFarmBoxData);
    const mapPlotData = useSelector(selectMapDataPlot);
    const searchQuery = useSelector(selectFarmboxSearchQuery);
    const showSearch = useSelector(selectFarmboxSearchBar);

    const [farmData, setfarmData] = useState([]);
    const [onlyFarms, setOnlyFarms] = useState([]);

    const [showFarm, setShowFarm] = useState(null);
    const [selectedFarm, setSelectedFarm] = useState(null);

    const [isLoading, setIsLoading] = useState(false);
    const [isloadingDbFarm, setIsloadingDbFarm] = useState(false);
    const [isLoadingMapData, setIsLoadingMapData] = useState(false);
    const [showPlotMap, setshowPlotMap] = useState(false);

    const formatNumber = (number) => {
        return number?.toLocaleString("pt-br", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };

    const triggerHeavyHaptic = useCallback(() => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        } catch (error) {
            // Haptics pode falhar em alguns ambientes/simuladores. Não precisa travar a ação.
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
                console.log("atualização OK");
                const data = await response.json();
                dispatch(setFarmBoxData(data));
            } else {
                Alert.alert(
                    "Atenção",
                    `Não foi possível atualizar as aplicações. Status ${response.status}.`
                );
            }
        } catch (error) {
            console.log("erro ao pegar os dados", error);
            Alert.alert(
                "Problema na API",
                `Possível erro de internet para pegar os dados: ${error}`
            );
        } finally {
            setIsLoading(false);
        }
    }, [dispatch, setFarmBoxData]);

    const handleUpdateApiData = useCallback(async () => {
        if (isloadingDbFarm) return;

        setIsloadingDbFarm(true);
        triggerHeavyHaptic();

        try {
            const response = await fetch(
                LINK + "/defensivo/update_farmbox_mongodb_data/",
                {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Token ${EXPO_PUBLIC_REACT_APP_DJANGO_TOKEN}`,
                    },
                }
            );

            if (response.status === 200) {
                Alert.alert("Tudo Certo", "Aplicações atualizadas com sucesso!");
                await getData();
            } else {
                Alert.alert(
                    "Atenção",
                    `A atualização retornou status ${response.status}.`
                );
            }
        } catch (error) {
            console.error(error);
            Alert.alert("Problema em atualizar o banco de dados", `Erro: ${error}`);
        } finally {
            setIsloadingDbFarm(false);
        }
    }, [isloadingDbFarm, triggerHeavyHaptic, getData]);

    const renderHeaderUpdateButton = useCallback(
        (tintColor) => {
            return (
                <View style={styles.headerRightBox}>
                    <Pressable
                        onPress={handleUpdateApiData}
                        disabled={isloadingDbFarm}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        style={({ pressed }) => [
                            styles.headerIconButton,
                            pressed && !isloadingDbFarm && styles.headerIconButtonPressed,
                            isloadingDbFarm && styles.headerIconButtonLoading,
                        ]}
                    >
                        {isloadingDbFarm ? (
                            <ActivityIndicator size="small" color={tintColor} />
                        ) : (
                            <MaterialCommunityIcons
                                name="database-refresh-outline"
                                size={23}
                                color={tintColor}
                            />
                        )}
                    </Pressable>
                </View>
            );
        },
        [handleUpdateApiData, isloadingDbFarm]
    );

    useLayoutEffect(() => {
        navigation.setOptions({
            title: "FarmBox",
            headerShadowVisible: false,
            headerRight: ({ tintColor }) => renderHeaderUpdateButton(tintColor),
            headerLeft: undefined,
        });
    }, [navigation, renderHeaderUpdateButton]);

    useEffect(() => {
        const getMapData = async () => {
            setIsLoadingMapData(true);

            try {
                const response = await fetch(`${LINK}/plantio/get_map_plot_app_fetch_app/`, {
                    headers: {
                        Authorization: `Token ${EXPO_PUBLIC_REACT_APP_DJANGO_TOKEN}`,
                        "Content-Type": "application/json",
                    },
                    method: "GET",
                });

                if (response.status === 200) {
                    console.log("atualização OK");
                    const data = await response.json();
                    dispatch(setMapPlot(data.dados));
                }
            } catch (error) {
                console.log("erro ao pegar os dados", error);
                Alert.alert(
                    "Problema na API",
                    `Possível erro de internet para pegar os dados para plotar o mapa: ${error}`
                );
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
        if (farmBoxData) {
            setfarmData(farmBoxData.data || []);
            setOnlyFarms(farmBoxData.farms || []);
        }
    }, [farmBoxData]);

    useEffect(() => {
        if (mapPlotData?.length > 0 && showFarm) {
            const dataFromMap = newMapArr(mapPlotData);

            const filteredFarm = dataFromMap.filter(
                (data) =>
                    data.farmName ===
                    showFarm.replace("Fazenda", "Projeto").replace("Cacique", "Cacíque")
            );

            setshowPlotMap(filteredFarm.length > 0);
        }
    }, [mapPlotData, showFarm]);

    useEffect(() => {
        if (!farmBoxData?.data) return;

        function removeAccents(str) {
            return str
                ?.normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/\s+/g, "");
        }

        const applications = farmBoxData.data || [];

        if (searchQuery?.trim() === "") {
            setfarmData(applications);
            return;
        }

        const normalizedQuery = removeAccents(searchQuery)?.toLowerCase();

        const filteredData = applications.filter((data) =>
            data.prods?.some((prod) =>
                removeAccents(prod.product)?.toLowerCase().includes(normalizedQuery)
            )
        );

        setfarmData(filteredData);
    }, [searchQuery, farmBoxData]);

    useScrollToTop(ref);

    useScrollToTop(
        useRef({
            scrollToTop: () => ref.current?.scrollTo({ y: 0 }),
        })
    );

    const handleShowFarm = useCallback(
        (farms) => {
            setSelectedFarm(farms);
            triggerHeavyHaptic();

            navigation.navigate("FarmBoxFarms", {
                farm: farms,
                showSearch,
            });

            if (showFarm === farms) {
                setShowFarm(null);
            }
        },
        [navigation, showSearch, showFarm, triggerHeavyHaptic]
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
        <View style={styles.mainContainer}>
            {showSearch && (
                <SearchBar
                    placeholder="Selecione um produto ou operação..."
                    value={searchQuery}
                    onChangeText={(e) => dispatch(setFarmboxSearchQuery(e))}
                />
            )}

            {isLoading && (
                <View style={styles.customRefreshContainer}>
                    <ActivityIndicator size="large" color="#1E90FF" />
                    <Text style={styles.customRefreshText}>Atualizando Aplicações...</Text>
                </View>
            )}

            <ScrollView
                contentInsetAdjustmentBehavior="automatic"
                ref={ref}
                contentContainerStyle={{
                    paddingBottom: CUSTOM_TAB_BAR_CONTENT_PADDING,
                }}
                horizontal={false}
                refreshControl={
                    <RefreshControl
                        refreshing={isLoading}
                        onRefresh={getData}
                        colors={["#16A34A"]}
                        progressBackgroundColor="red"
                        tintColor="#16A34A"
                    />
                }
            >
                {farmData &&
                    onlyFarms.map((farms, i) => {
                        const totalByFarm = farmData
                            .filter((farmName) => farmName.farmName === farms)
                            .reduce((acc, curr) => acc + curr.saldoAreaAplicar, 0);

                        if (totalByFarm <= 0) return null;

                        return (
                            <View key={farms || i}>
                                <Pressable
                                    style={({ pressed }) => [
                                        styles.headerContainer,
                                        pressed && styles.pressed,
                                        i === 0 && styles.firstHeader,
                                    ]}
                                    onPress={() => handleShowFarm(farms)}
                                >
                                    <Text style={styles.farmTitle}>
                                        {farms.replace("Fazenda ", "")}
                                    </Text>

                                    <Text style={styles.farmTotal}>
                                        {formatNumber(totalByFarm)}
                                    </Text>
                                </Pressable>
                            </View>
                        );
                    })}
            </ScrollView>

            <View style={styles.fabContainer}>
                <FAB
                    style={styles.fab}
                    icon={showSearch ? "close" : "magnify"}
                    color="black"
                    onPress={handleFilterProps}
                />
            </View>
        </View>
    );
};

export default FarmBoxScreen;

const styles = StyleSheet.create({
    firstHeader: {
        marginTop: 0,
    },

    headerRightBox: {
        // paddingRight: 14,
        alignItems: "center",
        justifyContent: "center",
    },

    headerGlassButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor:
            Platform.OS === "ios"
                ? "rgba(255,255,255,0.46)"
                : "rgba(15,23,42,0.08)",
        backgroundColor:
            Platform.OS === "ios"
                ? "rgba(255,255,255,0.22)"
                : "rgba(255,255,255,0.92)",
        shadowColor: "#000",
        shadowOpacity: Platform.OS === "ios" ? 0.14 : 0,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 8 },
        elevation: Platform.OS === "android" ? 4 : 0,
    },

    headerGlassButtonPressed: {
        opacity: 0.72,
        transform: [{ scale: 0.96 }],
    },

    headerGlassButtonLoading: {
        opacity: 0.9,
    },

    headerGlassAndroidBg: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(255,255,255,0.92)",
    },

    headerGlassOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor:
            Platform.OS === "ios"
                ? "rgba(255,255,255,0.14)"
                : "rgba(255,255,255,0.06)",
    },

    headerIconCenter: {
        width: 42,
        height: 42,
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2,
    },

    fabContainer: {
        position: "absolute",
        right: 20,
        bottom: 20,
    },

    fab: {
        position: "absolute",
        right: 30,
        bottom: 100,
        backgroundColor: "rgba(200, 200, 200, 0.3)",
        width: 50,
        height: 50,
        borderRadius: 25,
        borderColor: Colors.primary[300],
        borderWidth: 1,
        justifyContent: "center",
        alignItems: "center",
        elevation: 4,
    },

    mainContainer: {
        flex: 1,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },

    headerContainer: {
        paddingVertical: 12,
        marginVertical: 8,
        backgroundColor: Colors.primary500,
        fontSize: 18,
        justifyContent: "center",
        alignItems: "center",
    },

    farmTitle: {
        color: "white",
        fontSize: 18,
        fontWeight: "bold",
    },

    farmTotal: {
        fontSize: 10,
        color: Colors.secondary[200],
    },

    pressed: {
        opacity: 0.7,
    },

    customRefreshContainer: {
        paddingVertical: 14,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(30,144,255,0.08)",
        borderBottomWidth: 1,
        borderColor: "rgba(30,144,255,0.25)",
    },

    customRefreshText: {
        marginTop: 8,
        fontSize: 12,
        fontWeight: "700",
        color: "#1E90FF",
    },
});