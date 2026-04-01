import {
    StyleSheet,
    Text,
    View,
    StatusBar,
    ScrollView,
    Pressable,
    Platform,
    ActivityIndicator,
    Alert,
} from "react-native";
import { useState, useEffect, useMemo } from "react";
import Button from "../ui/Button";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "../../constants/styles";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import * as Haptics from "expo-haptics";
import { createApplicationPdf } from "../Global/PrintCronogramaPage";
import { createApplicationPdfMap } from "../Global/PrintCronogramaPageMap";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { Ionicons } from "@expo/vector-icons";
import { selectExportStatus, resetExportState } from "../../store/redux/authSlice";
import { useSelector, useDispatch } from "react-redux";
import { selectPlotMapData } from "../../store/redux/selector";

import { buildExportCards } from "../../utils/farmboxConsolidation";

const FilterModalApps = (props) => {
    const dispatch = useDispatch();
    const { route, navigation } = props;
    const { data, farm, viewMode = "normal" } = route?.params || {};

    const exportStatus = useSelector(selectExportStatus);
    const isExportingMap = exportStatus === "pending";
    const plotMap = useSelector(selectPlotMapData);

    const [selectedCardKeys, setSelectedCardKeys] = useState([]);
    const [loading, setLoading] = useState({
        pdf: false,
        pdfMap: false,
    });

    const localLoading = loading.pdfMap;
    const isBusy = isExportingMap || localLoading;

    const farmApps = useMemo(() => {
        return (Array.isArray(data) ? data : []).filter(
            (item) => item.farmName === farm
        );
    }, [data, farm]);

    const exportCards = useMemo(() => {
        return buildExportCards(farmApps, viewMode);
    }, [farmApps, viewMode]);

    const hasSelection = selectedCardKeys.length > 0;

    const baseBtnStyle = {
        height: 50,
        backgroundColor: hasSelection ? Colors.succes[400] : Colors.gold[600],
        alignItems: "center",
        justifyContent: "center",
    };

    useEffect(() => {
        setSelectedCardKeys(exportCards.map((item) => item.cardKey));
    }, [exportCards]);

    useEffect(() => {
        if (Platform.OS === "android") {
            navigation.getParent()?.setOptions({
                tabBarStyle: { display: "none" },
                headerShown: false,
            });
            StatusBar.setHidden(true);

            return () => {
                navigation.getParent()?.setOptions({
                    tabBarStyle: {
                        display: "flex",
                        backgroundColor: Colors.primary[901],
                        elevation: 0,
                        height: Platform.OS === "ios" ? 80 : 60,
                        paddingHorizontal: 5,
                        paddingTop: 0,
                        position: "absolute",
                        borderTopWidth: 0,
                    },
                    headerShown: true,
                });
                StatusBar.setHidden(false);
            };
        }
    }, [navigation]);

    const handleCloseModal = () => {
        navigation.goBack();
    };

    const handleClearApps = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        if (selectedCardKeys.length > 0) {
            setSelectedCardKeys([]);
        } else {
            setSelectedCardKeys(exportCards.map((item) => item.cardKey));
        }
    };

    const handleSelect = (card) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        setSelectedCardKeys((prev) => {
            if (prev.includes(card.cardKey)) {
                return prev.filter((id) => id !== card.cardKey);
            }
            return [...prev, card.cardKey];
        });
    };

    const selectedExportData = useMemo(() => {
        return exportCards.filter((item) => selectedCardKeys.includes(item.cardKey));
    }, [exportCards, selectedCardKeys]);

    const handleSubmit = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        setLoading((l) => ({ ...l, pdf: true }));

        try {
            await createApplicationPdf(selectedExportData, farm, { viewMode });
        } catch (err) {
            Alert.alert("Erro ao gerar PDF", err?.message ?? "Erro.");
        } finally {
            setLoading((l) => ({ ...l, pdf: false }));
            navigation.goBack();
        }
    };

    const handleSubmitWithMap = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        setLoading((l) => ({ ...l, pdfMap: true }));

        try {
            await createApplicationPdfMap(selectedExportData, farm, plotMap, {
                viewMode,
            });
        } catch (err) {
            console.log("Erro ao criar os mapas", err);
            Alert.alert("Erro ao renderizar o PDF", err?.message ?? "Erro.");
        } finally {
            setLoading((l) => ({ ...l, pdfMap: false }));
            navigation.goBack();
            dispatch(resetExportState());
        }
    };

    const renderTitle = (card) => {
        if (card?.isConsolidated) {
            return card?.displayCode || "Consolidado";
        }
        return String(card?.code || "").replace("AP", "AP ");
    };

    const renderSubtitle = (card) => {
        if (card?.isConsolidated) {
            return (card?.aps || [])
                .map((ap) => `${ap.code} - ${ap.operation}`)
                .join(" • ");
        }
        return card?.operation || "-";
    };

    return (
        <>
            <StatusBar backgroundColor="transparent" translucent />
            <SafeAreaView
                style={{
                    flex: 1,
                    backgroundColor: Colors.secondary[100],
                    paddingHorizontal: 3,
                }}
            >
                <Pressable
                    style={({ pressed }) => [pressed && styles.pressed, styles.headerContainer]}
                    onPress={handleClearApps}
                >
                    <View style={{ justifyContent: "center", alignItems: "center" }}>
                        <Text
                            style={{
                                fontWeight: "bold",
                                color: Colors.secondary[800],
                                fontSize: 24,
                            }}
                        >
                            {farm.replace("Fazenda ", "")}{" "}
                            <Text style={{ fontSize: 10, color: Colors.secondary[500] }}>
                                {selectedCardKeys?.length}/{exportCards?.length}
                            </Text>
                        </Text>
                        <Text style={{ fontSize: 11, color: Colors.secondary[600] }}>
                            {viewMode === "consolidated" ? "Modo consolidado" : "Modo APs"}
                        </Text>
                    </View>

                    <Icon
                        name={
                            selectedCardKeys.length > 0
                                ? "close-circle-outline"
                                : "checkbox-multiple-marked-outline"
                        }
                        size={26}
                        color={
                            selectedCardKeys.length > 0
                                ? Colors.error[500]
                                : Colors.succes[500]
                        }
                        style={{ marginRight: 5 }}
                    />
                </Pressable>

                <ScrollView>
                    {exportCards.map((card, i) => {
                        const selected = selectedCardKeys.includes(card.cardKey);

                        return (
                            <Pressable
                                key={card.cardKey || i}
                                style={({ pressed }) => [pressed && styles.pressed]}
                                onPress={() => handleSelect(card)}
                            >
                                <View
                                    style={[
                                        styles.selectAppContainer,
                                        {
                                            backgroundColor: selected
                                                ? Colors.succes[100]
                                                : Colors.secondary[100],
                                        },
                                    ]}
                                >
                                    <View style={{ flex: 1, paddingRight: 10 }}>
                                        <Text style={styles.apTitle}>{renderTitle(card)}</Text>
                                        <Text style={styles.opTitle}>{renderSubtitle(card)}</Text>
                                    </View>

                                    <View style={{ alignItems: "flex-end" }}>
                                        {card?.isConsolidated && (
                                            <Text style={styles.smallInfo}>
                                                {card?.codes?.length || 0} APs
                                            </Text>
                                        )}
                                        {selected && (
                                            <MaterialCommunityIcons
                                                name="check-all"
                                                size={24}
                                                color="green"
                                            />
                                        )}
                                    </View>
                                </View>
                            </Pressable>
                        );
                    })}
                </ScrollView>
            </SafeAreaView>

            <View
                style={{
                    paddingBottom: 40,
                    paddingTop: Platform.OS === "ios" ? 20 : 0,
                    paddingHorizontal: 10,
                    backgroundColor: Colors.secondary[100],
                    flexDirection: "row",
                    justifyContent: hasSelection ? "space-between" : "center",
                    alignItems: "center",
                }}
            >
                {hasSelection ? (
                    <>
                        <Button
                            btnStyles={{ ...baseBtnStyle, width: "47%" }}
                            disabled={loading.pdf || loading.pdfMap}
                            onPress={handleSubmit}
                        >
                            {loading.pdf ? <ActivityIndicator color="white" /> : "Gerar PDF"}
                        </Button>

                        <Button
                            btnStyles={{ ...baseBtnStyle, width: "47%" }}
                            disabled={loading.pdfMap || !plotMap || plotMap?.length === 0}
                            onPress={handleSubmitWithMap}
                        >
                            {isBusy ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <View style={{ flexDirection: "row", alignItems: "center" }}>
                                    <Ionicons
                                        name="map-outline"
                                        size={20}
                                        color="white"
                                        style={{ marginRight: 6 }}
                                    />
                                    <Text style={{ color: "white", fontWeight: "bold" }}>
                                        Gerar PDF
                                    </Text>
                                </View>
                            )}
                        </Button>
                    </>
                ) : (
                    <Button
                        btnStyles={{ ...baseBtnStyle, width: "100%" }}
                        onPress={handleCloseModal}
                    >
                        Cancelar
                    </Button>
                )}
            </View>
        </>
    );
};

export default FilterModalApps;

const styles = StyleSheet.create({
    pressed: {
        opacity: 0.5,
    },
    opTitle: {
        fontSize: 13,
        fontWeight: "bold",
        color: Colors.secondary[800],
    },
    apTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: Colors.primary[700],
        marginBottom: 4,
    },
    smallInfo: {
        fontSize: 11,
        fontWeight: "700",
        color: Colors.secondary[600],
        marginBottom: 4,
    },
    selectAppContainer: {
        flex: 1,
        flexDirection: "row",
        justifyContent: "space-between",
        paddingRight: 20,
        alignItems: "center",
        paddingLeft: 10,
        gap: 20,
        marginBottom: 10,
        paddingVertical: 15,
        borderWidth: 0.1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 2,
    },
    headerContainer: {
        width: "100%",
        gap: 20,
        justifyContent: "space-between",
        paddingTop: 20,
        paddingBottom: 5,
        flexDirection: "row",
        paddingHorizontal: 10,
        borderBottomColor: "black",
        borderBottomWidth: 0.3,
        alignItems: "center",
    },
});