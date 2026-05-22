import { StyleSheet, Text, View, Pressable, Image } from "react-native";
import React from "react";
import { Colors } from "../../constants/styles";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";

import Animated, {
    FadeInRight,
    FadeOut,
    Layout,
    BounceIn,
    BounceOut,
} from "react-native-reanimated";

import { useNavigation } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { Divider } from "react-native-paper";

const iconDict = [
    {
        cultura: "Feijão",
        icon: require("../../utils/assets/icons/beans2.png"),
        alt: "feijao",
    },
    {
        cultura: "Arroz",
        icon: require("../../utils/assets/icons/rice.png"),
        alt: "arroz",
    },
    {
        cultura: "Soja",
        icon: require("../../utils/assets/icons/soy.png"),
        alt: "soja",
    },
    {
        cultura: undefined,
        icon: require("../../utils/assets/icons/question.png"),
        alt: "?",
    },
];

const filteredIcon = (data) => {
    const filtered = iconDict.filter((dictD) => dictD.cultura === data);

    if (filtered.length > 0) {
        return filtered[0].icon;
    }

    return iconDict[3].icon;
};

const getCultura = (dataCult) => filteredIcon(dataCult);

const formatNumber = (number) => {
    return Number(number || 0).toLocaleString("pt-BR", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });
};

const formatNumberScs = (number) => {
    return Number(number || 0).toLocaleString("pt-BR", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });
};

const formatNumberAvg = (number) => {
    return Number(number || 0).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

const FarmsPlantioScreen = (props) => {
    const { data, newData, isPlantioMode = false } = props;

    const navigation = useNavigation();

    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        navigation.push("PlantioTalhoesScreen", { farm: data.farm });
    };

    let totalAreaHere = 0;
    let totalParcialHere = 0;

    data?.culturas?.forEach((cultura) => {
        data?.variedades
            ?.filter((vari) => vari.cultura === cultura.cultura)
            .forEach((item) => {
                totalAreaHere += Number(item.previsto ?? item.colheita ?? 0);
                totalParcialHere += Number(item.realizado ?? item.parcial ?? 0);
            });
    });

    const totalPercent =
        totalAreaHere > 0
            ? Math.min(100, Math.round((totalParcialHere / totalAreaHere) * 100))
            : 0;

    const firstLabel = isPlantioMode ? "Previsto" : "Plantado";
    const secondLabel = isPlantioMode ? "Plantado" : "Colheita";
    const saldoLabel = isPlantioMode ? "A Plantar" : "A Colher";

    return (
        <Pressable
            style={({ pressed }) => [
                styles.pressableWrapper,
                pressed && styles.pressed,
            ]}
            onPress={handlePress}
        >
            <View style={styles.wrapper}>
                <Animated.View
                    entering={FadeInRight.duration(500)}
                    exiting={FadeOut.duration(500)}
                    layout={Layout.springify()}
                    style={[
                        styles.percentBackground,
                        {
                            backgroundColor:
                                totalPercent > 75
                                    ? "rgba(51,153,51,0.4)"
                                    : "rgba(255, 223, 0, 0.4)",
                        },
                        {
                            width: `${totalPercent}%`,
                            borderTopRightRadius: totalPercent < 100 ? 0 : 10,
                            borderBottomRightRadius: totalPercent < 100 ? 0 : 10,
                        },
                    ]}
                />

                <View style={styles.contentContainer}>
                    <View style={styles.titleContainer}>
                        <View style={styles.farmTitleBox}>
                            <Text style={styles.farmName}>
                                {String(data?.farm || "").replace("Projeto", "")}
                            </Text>
                        </View>

                        <View>
                            {data?.culturas?.map((cultura, i) => {
                                let previsto = 0;
                                let realizado = 0;

                                data?.variedades
                                    ?.filter((item) => item.cultura === cultura.cultura)
                                    .forEach((element) => {
                                        previsto += Number(
                                            element.previsto ?? element.colheita ?? 0
                                        );
                                        realizado += Number(
                                            element.realizado ?? element.parcial ?? 0
                                        );
                                    });

                                const saldo = previsto - realizado;

                                const totalScs =
                                    newData?.length > 0
                                        ? newData
                                            .filter(
                                                (item) =>
                                                    item.variedade__cultura__cultura ===
                                                    cultura.cultura
                                            )
                                            .reduce(
                                                (acc, curr) =>
                                                    acc + Number(curr?.total_peso_liquido || 0),
                                                0
                                            )
                                        : 0;

                                const totalAvNew =
                                    !isPlantioMode && realizado > 0 && totalScs > 0
                                        ? totalScs / 60 / realizado
                                        : 0;

                                return (
                                    <View key={`${cultura.cultura}-${i}`}>
                                        {i > 0 && <Divider style={styles.cultureDivider} />}

                                        <View style={styles.containerCulture}>
                                            <View>
                                                <View style={styles.shadowContainer}>
                                                    <Image
                                                        source={getCultura(cultura.cultura)}
                                                        style={styles.cultureIcon}
                                                    />
                                                </View>
                                            </View>

                                            <View style={styles.cultureValuesContainer}>
                                                <View style={styles.headerContainer}>
                                                    <Text style={styles.titleCultureArea}>
                                                        {firstLabel}
                                                    </Text>
                                                    <Text style={styles.labelNumber}>
                                                        {formatNumber(previsto)} ha
                                                    </Text>
                                                </View>

                                                <View style={styles.headerContainer}>
                                                    <Text style={styles.titleCultureColheita}>
                                                        {secondLabel}
                                                    </Text>
                                                    <Text style={styles.labelNumber}>
                                                        {realizado > 0
                                                            ? `${formatNumber(realizado)} ha`
                                                            : "-"}
                                                    </Text>
                                                </View>

                                                <View style={styles.headerContainer}>
                                                    <Text style={styles.titleCultureSaldo}>
                                                        {saldoLabel}
                                                    </Text>
                                                    <Text style={styles.labelNumber}>
                                                        {saldo > 0 ? `${formatNumber(saldo)} ha` : "-"}
                                                    </Text>
                                                </View>
                                            </View>

                                            {!isPlantioMode && (
                                                <View style={styles.infoContainer}>
                                                    <View>
                                                        <Text style={styles.infoContainerScsTitle}>
                                                            Scs
                                                        </Text>
                                                        <Text style={styles.infoContainerScsNumber}>
                                                            {totalScs > 0
                                                                ? formatNumberScs(totalScs / 60)
                                                                : " - "}
                                                        </Text>
                                                    </View>

                                                    <View>
                                                        <Text style={styles.infoContainerTitle}>
                                                            Média
                                                        </Text>
                                                        <Text style={styles.infoContainerNumber}>
                                                            {totalAvNew > 0
                                                                ? formatNumberAvg(totalAvNew)
                                                                : " - "}
                                                        </Text>
                                                    </View>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    </View>

                    <Animated.View
                        entering={BounceIn.duration(300)}
                        exiting={BounceOut.duration(300)}
                        layout={Layout.springify()}
                        style={styles.rowContainer}
                    >
                        <View style={styles.containerPercent}>
                            <View
                                style={[
                                    styles.circle,
                                    {
                                        backgroundColor:
                                            totalPercent === 0
                                                ? "rgba(52,152,219,0.2)"
                                                : totalPercent <= 20
                                                    ? "rgba(204, 153, 0, 0.6)"
                                                    : totalPercent <= 90
                                                        ? "rgba(52,152,219,1.0)"
                                                        : "rgba(46, 204, 113, 0.9)",
                                    },
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.percentText,
                                        {
                                            color: totalPercent === 0 ? "black" : "white",
                                        },
                                    ]}
                                >
                                    {totalPercent}%
                                </Text>
                            </View>
                        </View>

                        <Icon name="arrow-right" size={24} color="#000" />
                    </Animated.View>
                </View>
            </View>
        </Pressable>
    );
};

export default FarmsPlantioScreen;

const styles = StyleSheet.create({
    shadowContainer: {
        shadowColor: "#000",
        shadowOffset: { width: 3, height: 5 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
        elevation: 6,
    },

    cultureIcon: {
        width: 30,
        height: 30,
        resizeMode: "contain",
    },

    infoContainerNumber: {
        textAlign: "right",
        fontWeight: "bold",
        fontSize: 11,
        color: Colors.secondary[500],
    },

    infoContainerTitle: {
        textAlign: "right",
        fontWeight: "bold",
        fontSize: 12,
        color: Colors.succes[500],
    },

    infoContainerScsTitle: {
        textAlign: "right",
        fontWeight: "bold",
        fontSize: 12,
        color: Colors.secondary[400],
    },

    infoContainerScsNumber: {
        textAlign: "right",
        fontWeight: "bold",
        fontSize: 11,
        color: Colors.secondary[500],
    },

    infoContainer: {
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "flex-end",
        marginLeft: 40,
        gap: 5,
    },

    headerContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        width: 110,
    },

    titleCultureArea: {
        fontSize: 12,
        fontWeight: "bold",
    },

    titleCultureColheita: {
        fontSize: 12,
        fontWeight: "bold",
    },

    titleCultureSaldo: {
        fontSize: 12,
        fontWeight: "bold",
        color: Colors.succes[600],
    },

    labelNumber: {
        fontSize: 10,
        color: Colors.secondary[600],
        fontWeight: "bold",
    },

    titleContainer: {
        flexDirection: "column",
        justifyContent: "space-between",
    },

    farmTitleBox: {
        alignSelf: "flex-start",
        marginBottom: 10,
        marginLeft: -10,
    },

    cultureValuesContainer: {
        flexDirection: "column",
        gap: 2,
        justifyContent: "center",
        alignItems: "center",
    },

    cultureDivider: {
        backgroundColor: "gray",
        height: 1,
        marginVertical: 5,
        width: "100%",
    },

    containerCulture: {
        flex: 1,
        flexDirection: "row",
        width: "100%",
        alignItems: "center",
        gap: 10,
    },

    pressableWrapper: {
        marginBottom: 10,
    },

    wrapper: {
        position: "relative",
        flexDirection: "column",
        justifyContent: "space-between",
        alignItems: "center",
        zIndex: 1,
        backgroundColor: "#fff",
        marginHorizontal: 5,
        borderRadius: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10,
        flex: 1,
    },

    farmName: {
        fontSize: 18,
        fontWeight: "bold",
        color: Colors.secondary[700],
    },

    rowContainer: {
        flexDirection: "row",
        alignItems: "center",
    },

    containerPercent: {
        justifyContent: "center",
        alignItems: "center",
        marginRight: 10,
    },

    circle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: "rgba(52,152,219,1.0)",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 4,
        borderColor: "#2980b9",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 3,
    },

    percentText: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#fff",
    },

    percentBackground: {
        position: "absolute",
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "yellow",
        borderRadius: 10,
        zIndex: 0,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 2,
    },

    contentContainer: {
        position: "relative",
        zIndex: 1,
        width: "100%",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 15,
        paddingRight: 5,
    },

    pressed: {
        opacity: 0.5,
    },
});