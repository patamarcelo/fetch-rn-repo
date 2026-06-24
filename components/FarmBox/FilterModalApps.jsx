import {
    StyleSheet,
    Text,
    View,
    StatusBar,
    ScrollView,
    Pressable,
    ActivityIndicator,
    Alert,
    Platform
} from "react-native";

import { useState, useEffect, useMemo } from "react";

import Button from "../ui/Button";

import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "../../constants/styles";

import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Ionicons } from "@expo/vector-icons";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

import * as Haptics from "expo-haptics";

import { createApplicationPdf } from "../Global/PrintCronogramaPage";
import { createApplicationPdfMap } from "../Global/PrintCronogramaPageMap";

import {
    selectExportStatus,
    resetExportState,
} from "../../store/redux/authSlice";

import { useSelector, useDispatch } from "react-redux";

import { selectPlotMapData } from "../../store/redux/selector";

import { buildExportCards } from "../../utils/farmboxConsolidation";

import {
    useSafeAreaInsets,
} from "react-native-safe-area-context";

const FilterModalApps = (props) => {
    const dispatch = useDispatch();
    const insets = useSafeAreaInsets();
    const { route, navigation } = props;

    const {
        data,
        farm,
        viewMode = "normal",
    } = route?.params || {};

    const exportStatus = useSelector(selectExportStatus);

    const isExportingMap = exportStatus === "pending";

    /*
     * Mantido exatamente o selector original,
     * pois é este que funciona com a geração dos mapas.
     */
    const plotMap = useSelector(selectPlotMapData);

    const [selectedCardKeys, setSelectedCardKeys] = useState([]);

    const [loading, setLoading] = useState({
        pdf: false,
        pdfMap: false,
    });

    const localLoading = loading.pdfMap;

    const isBusy =
        isExportingMap ||
        localLoading;

    const farmApps = useMemo(() => {
        return (Array.isArray(data) ? data : []).filter(
            (item) => item.farmName === farm
        );
    }, [data, farm]);

    const exportCards = useMemo(() => {
        return buildExportCards(
            farmApps,
            viewMode
        );
    }, [farmApps, viewMode]);

    const hasSelection =
        selectedCardKeys.length > 0;

    const baseBtnStyle = {
        height: 50,
        backgroundColor: hasSelection
            ? Colors.succes[400]
            : Colors.gold[600],
        alignItems: "center",
        justifyContent: "center",
    };

    /*
     * Mantido: seleciona todos os cards inicialmente.
     */
    useEffect(() => {
        setSelectedCardKeys(
            exportCards.map(
                (item) => item.cardKey
            )
        );
    }, [exportCards]);

    /*
     * REMOVIDO:
     *
     * O useEffect que chamava:
     *
     * navigation.getParent()?.setOptions(...)
     * StatusBar.setHidden(...)
     *
     * Ele alterava a configuração global da TabBar,
     * do header e da StatusBar ao montar/desmontar.
     */

    const handleCloseModal = () => {
        navigation.goBack();
    };

    const handleClearApps = () => {
        Haptics.impactAsync(
            Haptics.ImpactFeedbackStyle.Heavy
        );

        if (selectedCardKeys.length > 0) {
            setSelectedCardKeys([]);
        } else {
            setSelectedCardKeys(
                exportCards.map(
                    (item) => item.cardKey
                )
            );
        }
    };

    const handleSelect = (card) => {
        Haptics.impactAsync(
            Haptics.ImpactFeedbackStyle.Heavy
        );

        setSelectedCardKeys((prev) => {
            if (prev.includes(card.cardKey)) {
                return prev.filter(
                    (id) => id !== card.cardKey
                );
            }

            return [
                ...prev,
                card.cardKey,
            ];
        });
    };

    const selectedExportData = useMemo(() => {
        return exportCards.filter(
            (item) =>
                selectedCardKeys.includes(
                    item.cardKey
                )
        );
    }, [exportCards, selectedCardKeys]);

    /*
     * Mantida exatamente a lógica original.
     */
    const handleSubmit = async () => {
        Haptics.impactAsync(
            Haptics.ImpactFeedbackStyle.Heavy
        );

        setLoading((current) => ({
            ...current,
            pdf: true,
        }));

        try {
            await createApplicationPdf(
                selectedExportData,
                farm,
                {
                    viewMode,
                }
            );
        } catch (err) {
            Alert.alert(
                "Erro ao gerar PDF",
                err?.message ?? "Erro."
            );
        } finally {
            setLoading((current) => ({
                ...current,
                pdf: false,
            }));

            navigation.goBack();
        }
    };

    /*
     * Mantida exatamente a lógica original dos mapas.
     *
     * Continua utilizando:
     * - selectPlotMapData;
     * - plotMap;
     * - selectExportStatus;
     * - resetExportState.
     */
    const handleSubmitWithMap = async () => {
        Haptics.impactAsync(
            Haptics.ImpactFeedbackStyle.Heavy
        );

        setLoading((current) => ({
            ...current,
            pdfMap: true,
        }));

        try {
            await createApplicationPdfMap(
                selectedExportData,
                farm,
                plotMap,
                {
                    viewMode,
                }
            );
        } catch (err) {
            console.log(
                "Erro ao criar os mapas",
                err
            );

            Alert.alert(
                "Erro ao renderizar o PDF",
                err?.message ?? "Erro."
            );
        } finally {
            setLoading((current) => ({
                ...current,
                pdfMap: false,
            }));

            navigation.goBack();

            dispatch(resetExportState());
        }
    };

    const renderTitle = (card) => {
        if (card?.isConsolidated) {
            return (
                card?.displayCode ||
                "Consolidado"
            );
        }

        return String(
            card?.code || ""
        ).replace(
            "AP",
            "AP "
        );
    };

    const renderSubtitle = (card) => {
        if (card?.isConsolidated) {
            return (card?.aps || [])
                .map(
                    (ap) =>
                        `${ap.code} - ${ap.operation}`
                )
                .join(" • ");
        }

        return card?.operation || "-";
    };

    const screenContent = (
        <>
            <StatusBar
                backgroundColor={Colors.secondary[100]}
                barStyle="dark-content"
                translucent={false}
                hidden={false}
            />

            <Pressable
                style={({ pressed }) => [
                    styles.headerContainer,
                    pressed && styles.pressed,
                ]}
                onPress={handleClearApps}
            >
                <View style={styles.headerTitleContainer}>
                    <Text
                        style={styles.headerTitle}
                        numberOfLines={1}
                    >
                        {String(farm || "").replace(
                            "Fazenda ",
                            ""
                        )}{" "}

                        <Text style={styles.headerCount}>
                            {selectedCardKeys?.length}/
                            {exportCards?.length}
                        </Text>
                    </Text>

                    <Text style={styles.headerSubtitle}>
                        {viewMode === "consolidated"
                            ? "Modo consolidado"
                            : "Modo APs"}
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
                    style={styles.headerIcon}
                />
            </Pressable>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator
                keyboardShouldPersistTaps="handled"
                contentInsetAdjustmentBehavior="never"
                automaticallyAdjustContentInsets={false}
                automaticallyAdjustKeyboardInsets={false}
            >
                {exportCards.map((card, index) => {
                    const selected =
                        selectedCardKeys.includes(
                            card.cardKey
                        );

                    return (
                        <Pressable
                            key={card.cardKey || index}
                            style={({ pressed }) => [
                                pressed && styles.pressed,
                            ]}
                            onPress={() =>
                                handleSelect(card)
                            }
                        >
                            <View
                                style={[
                                    styles.selectAppContainer,
                                    {
                                        backgroundColor:
                                            selected
                                                ? Colors.succes[100]
                                                : Colors.secondary[100],
                                    },
                                ]}
                            >
                                <View style={styles.cardContent}>
                                    <Text style={styles.apTitle}>
                                        {renderTitle(card)}
                                    </Text>

                                    <Text style={styles.opTitle}>
                                        {renderSubtitle(card)}
                                    </Text>
                                </View>

                                <View style={styles.cardRight}>
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

            <View style={styles.footer}>
                {hasSelection ? (
                    <>
                        <Button
                            btnStyles={{
                                ...baseBtnStyle,
                                width: "47%",
                            }}
                            disabled={
                                loading.pdf ||
                                loading.pdfMap
                            }
                            onPress={handleSubmit}
                        >
                            {loading.pdf ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                "Gerar PDF"
                            )}
                        </Button>

                        <Button
                            btnStyles={{
                                ...baseBtnStyle,
                                width: "47%",
                            }}
                            disabled={
                                loading.pdfMap ||
                                !plotMap ||
                                plotMap?.length === 0
                            }
                            onPress={handleSubmitWithMap}
                        >
                            {isBusy ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <View style={styles.mapButtonContent}>
                                    <Ionicons
                                        name="map-outline"
                                        size={20}
                                        color="white"
                                    />

                                    <Text style={styles.mapButtonText}>
                                        Gerar PDF
                                    </Text>
                                </View>
                            )}
                        </Button>
                    </>
                ) : (
                    <Button
                        btnStyles={{
                            ...baseBtnStyle,
                            width: "100%",
                        }}
                        onPress={handleCloseModal}
                    >
                        Cancelar
                    </Button>
                )}
            </View>
        </>
    );

    return Platform.OS === "ios" ? (
        <View
            collapsable={false}
            style={[
                styles.screen,
                {
                    paddingTop: insets.top,
                    paddingBottom: Math.max(
                        insets.bottom,
                        8
                    ),
                },
            ]}
        >
            {screenContent}
        </View>
    ) : (
        <SafeAreaView
            style={styles.screen}
            edges={[
                "top",
                "bottom",
                "left",
                "right",
            ]}
        >
            {screenContent}
        </SafeAreaView>
    );
};

export default FilterModalApps;

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: Colors.secondary[100],
    },

    pressed: {
        opacity: 0.5,
    },

    headerContainer: {
        width: "100%",
        minHeight: 66,
        gap: 20,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 10,
        paddingTop: 8,
        paddingBottom: 8,
        backgroundColor: Colors.secondary[100],
        borderBottomColor: "rgba(0,0,0,0.25)",
        borderBottomWidth: StyleSheet.hairlineWidth,
    },

    headerTitleContainer: {
        flex: 1,
        minWidth: 0,
        alignItems: "center",
        justifyContent: "center",
        paddingLeft: 30,
    },

    headerTitle: {
        maxWidth: "100%",
        color: Colors.secondary[800],
        fontSize: 24,
        fontWeight: "bold",
        textAlign: "center",
    },

    headerCount: {
        color: Colors.secondary[500],
        fontSize: 10,
    },

    headerSubtitle: {
        marginTop: 1,
        color: Colors.secondary[600],
        fontSize: 11,
    },

    headerIcon: {
        marginRight: 5,
    },

    scroll: {
        flex: 1,
    },

    scrollContent: {
        paddingHorizontal: 3,
        paddingTop: 4,
        paddingBottom: 12,
    },

    selectAppContainer: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 20,
        marginBottom: 10,
        paddingLeft: 10,
        paddingRight: 20,
        paddingVertical: 15,
        borderWidth: 0.1,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 5,
        },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 2,
    },

    cardContent: {
        flex: 1,
        paddingRight: 10,
    },

    cardRight: {
        alignItems: "flex-end",
    },

    apTitle: {
        marginBottom: 4,
        color: Colors.primary[700],
        fontSize: 16,
        fontWeight: "bold",
    },

    opTitle: {
        color: Colors.secondary[800],
        fontSize: 13,
        fontWeight: "bold",
    },

    smallInfo: {
        marginBottom: 4,
        color: Colors.secondary[600],
        fontSize: 11,
        fontWeight: "700",
    },

    footer: {
        flexShrink: 0,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 10,
        paddingTop: 10,
        paddingBottom: 8,
        backgroundColor: Colors.secondary[100],
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: "rgba(15,23,42,0.12)",
    },

    mapButtonContent: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },

    mapButtonText: {
        marginLeft: 6,
        color: "white",
        fontWeight: "bold",
    },
});