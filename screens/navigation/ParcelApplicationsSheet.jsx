import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    Platform,
    Animated,
    Dimensions,
    Image,
    PanResponder,
} from "react-native";

import Ionicons from "@expo/vector-icons/Ionicons";
import { Colors } from "../../constants/styles";


const SCREEN_HEIGHT = Dimensions.get("window").height;

const APPLICATIONS_SHEET_COLLAPSED_HEIGHT = Platform.OS === "ios" ? 360 : 340;
const APPLICATIONS_SHEET_TOP_OFFSET = Platform.OS === "ios" ? 54 : 28;
const APPLICATIONS_SHEET_EXPANDED_HEIGHT =
    SCREEN_HEIGHT - APPLICATIONS_SHEET_TOP_OFFSET;


const cropIconDict = [
    {
        keys: ["feijao", "feijão"],
        icon: require("../../utils/assets/icons/beans2.png"),
        alt: "feijao",
    },
    {
        keys: ["arroz"],
        icon: require("../../utils/assets/icons/rice.png"),
        alt: "arroz",
    },
    {
        keys: ["soja"],
        icon: require("../../utils/assets/icons/soy.png"),
        alt: "soja",
    },
];

const fallbackCropIcon = require("../../utils/assets/icons/question.png");

const normalizeCropText = (value) => {
    if (!value) return "";

    return String(value)
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
};

const getCropIcon = (cropValue, varietyValue) => {
    const cropText = normalizeCropText(cropValue);
    const varietyText = normalizeCropText(varietyValue);
    const fullText = `${cropText} ${varietyText}`.trim();

    const found = cropIconDict.find((item) =>
        item.keys.some((key) => fullText.includes(normalizeCropText(key)))
    );

    return found?.icon || null;
};

const getFallbackCropColor = (cropValue, varietyValue) => {
    const cropText = normalizeCropText(cropValue);
    const varietyText = normalizeCropText(varietyValue);
    const fullText = `${cropText} ${varietyText}`.trim();

    if (fullText.includes("arroz")) return "#FACC15";
    if (fullText.includes("soja")) return "#22C55E";
    if (fullText.includes("mungo preto")) return "#82202B";
    if (fullText.includes("mungo verde")) return "#AA5839";
    if (fullText.includes("caupi")) return "#3F4B7D";
    if (fullText.includes("feijao") || fullText.includes("feijão")) return "#82202B";

    return "#CBD5E1";
};

const formatDateBR = (value) => {
    if (!value) return "—";

    const [year, month, day] = String(value).split("-");

    if (!year || !month || !day) return String(value);

    return `${day}/${month}/${year}`;
};

const formatDose = (value) => {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
        return "—";
    }

    return Number(value).toLocaleString("pt-BR", {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4,
    });
};

const formatAreaBR = (value) => {
    if (value === null || value === undefined || value === "" || Number.isNaN(Number(value))) {
        return "—";
    }

    return Number(value).toLocaleString("pt-BR", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    });
};

const getStatusColor = (status) => {
    if (status === "finalized") return "#166534";
    if (status === "sought") return "#92400E";
    return "#475569";
};

const ApplicationSkeleton = () => {
    return (
        <View style={styles.skeletonBox}>
            <ActivityIndicator size="small" color={Colors.primary[700]} />
            <Text style={styles.skeletonText}>Buscando aplicações...</Text>
        </View>
    );
};

const ParcelApplicationsSheet = ({
    visible,
    parcel,
    data,
    loading,
    error,
    expanded,
    onToggleExpanded,
    onClose,
}) => {
    const [statusFilter, setStatusFilter] = useState("all");

    const applicationsSheetHeight = useRef(
        new Animated.Value(
            expanded
                ? APPLICATIONS_SHEET_EXPANDED_HEIGHT
                : APPLICATIONS_SHEET_COLLAPSED_HEIGHT
        )
    ).current;

    const applications = Array.isArray(data?.applications) ? data.applications : [];

    const filteredApplications = useMemo(() => {
        if (statusFilter === "all") return applications;
        if (statusFilter === "open") {
            return applications.filter((item) => item.status === "sought");
        }
        if (statusFilter === "finalized") {
            return applications.filter((item) => item.status === "finalized");
        }

        return applications;
    }, [applications, statusFilter]);

    const parcelData = data?.parcel || null;

    const cropValue =
        parcelData?.culture ||
        parcelData?.cultura ||
        parcel?.cultura ||
        null;

    const varietyValue =
        parcelData?.variety ||
        parcelData?.variedade ||
        parcel?.variedade ||
        parcel?.variedade_nome ||
        null;

    const cropIcon = getCropIcon(cropValue, varietyValue);
    const fallbackCropColor = getFallbackCropColor(cropValue, varietyValue);


    useEffect(() => {
        if (!visible) return;

        Animated.spring(applicationsSheetHeight, {
            toValue: expanded
                ? APPLICATIONS_SHEET_EXPANDED_HEIGHT
                : APPLICATIONS_SHEET_COLLAPSED_HEIGHT,
            useNativeDriver: false,
            bounciness: 4,
            speed: 14,
        }).start();
    }, [visible, expanded, applicationsSheetHeight]);


    const expandApplicationsSheet = useCallback(() => {
        if (!expanded) {
            onToggleExpanded?.();
        }
    }, [expanded, onToggleExpanded]);

    const collapseApplicationsSheet = useCallback(() => {
        if (expanded) {
            onToggleExpanded?.();
        }
    }, [expanded, onToggleExpanded]);

    const applicationsSheetPanResponder = useMemo(
        () =>
            PanResponder.create({
                onStartShouldSetPanResponder: () => false,

                onMoveShouldSetPanResponder: (_, gestureState) => {
                    return Math.abs(gestureState.dy) > 6;
                },

                onPanResponderTerminationRequest: () => false,

                onPanResponderRelease: (_, gestureState) => {
                    if (gestureState.dy < -18) {
                        expandApplicationsSheet();
                        return;
                    }

                    if (gestureState.dy > 18) {
                        collapseApplicationsSheet();
                    }
                },
            }),
        [expandApplicationsSheet, collapseApplicationsSheet]
    );
    if (!visible) return null;

    return (
        <Animated.View
            style={[
                styles.sheet,
                {
                    height: applicationsSheetHeight,
                },
            ]}
        >
            <View
                style={styles.handleArea}
                {...applicationsSheetPanResponder.panHandlers}
            >
                <TouchableOpacity
                    activeOpacity={0.86}
                    onPress={onToggleExpanded}
                    style={styles.handleIcon}
                >
                    <Ionicons
                        name={expanded ? "chevron-down" : "chevron-up"}
                        size={22}
                        color="rgba(15,23,42,0.62)"
                    />
                </TouchableOpacity>

                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <View style={styles.titleRow}>
                            {cropIcon ? (
                                <View style={styles.cropIconWrap}>
                                    <Image source={cropIcon} style={styles.cropIconImage} />
                                </View>
                            ) : (
                                <View
                                    style={[
                                        styles.cropFallbackBadge,
                                        { backgroundColor: fallbackCropColor },
                                    ]}
                                >
                                    <Image source={fallbackCropIcon} style={styles.cropFallbackIcon} />
                                </View>
                            )}

                            <Text style={styles.title} numberOfLines={1}>
                                {parcelData?.name || parcel?.parcela || "Parcela"}
                            </Text>
                        </View>

                        <Text style={styles.subtitle} numberOfLines={1}>
                            {varietyValue || cropValue || "—"} ·{" "}
                            {formatAreaBR(parcelData?.area ?? parcel?.area)} ha
                        </Text>
                    </View>

                    <View style={styles.headerRight}>
                        <Text style={styles.harvestText}>
                            {parcelData?.safra || parcel?.safra || "—"}
                        </Text>

                        <Text style={styles.cycleText}>
                            {parcelData?.ciclo ? `${parcelData.ciclo}º Ciclo` : "—"}
                        </Text>
                    </View>

                    <TouchableOpacity
                        activeOpacity={0.82}
                        onPress={onClose}
                        style={styles.closeButton}
                    >
                        <Ionicons name="close" size={18} color="#0F172A" />
                    </TouchableOpacity>
                </View>
            </View>

            {loading ? (
                <ApplicationSkeleton />
            ) : error ? (
                <View style={styles.errorBox}>
                    <Text style={styles.errorTitle}>Erro ao carregar</Text>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            ) : (
                <>
                    <View style={styles.summaryRow}>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryValue}>{data?.totals?.total || 0}</Text>
                            <Text style={styles.summaryLabel}>Aplicações</Text>
                        </View>

                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryValue}>{data?.totals?.open || 0}</Text>
                            <Text style={styles.summaryLabel}>Abertas</Text>
                        </View>

                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryValue}>{data?.totals?.finalized || 0}</Text>
                            <Text style={styles.summaryLabel}>Finalizadas</Text>
                        </View>
                    </View>

                    <View style={styles.filterRow}>
                        {[
                            { key: "all", label: "Todas" },
                            { key: "open", label: "Abertas" },
                            { key: "finalized", label: "Finalizadas" },
                        ].map((filter) => {
                            const isSelected = statusFilter === filter.key;

                            return (
                                <TouchableOpacity
                                    key={filter.key}
                                    activeOpacity={0.84}
                                    onPress={() => setStatusFilter(filter.key)}
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
                                        {filter.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <ScrollView
                        style={styles.scroll}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator
                        indicatorStyle="black"
                        scrollIndicatorInsets={{
                            right: 2,
                            bottom: 8,
                        }}
                    >
                        {filteredApplications.length === 0 ? (
                            <View style={styles.emptyBox}>
                                <Ionicons name="leaf-outline" size={26} color="rgba(15,23,42,0.38)" />
                                <Text style={styles.emptyTitle}>Nenhuma aplicação encontrada</Text>
                                <Text style={styles.emptyText}>
                                    Essa parcela ainda não possui aplicações nesse filtro.
                                </Text>
                            </View>
                        ) : (
                            filteredApplications.map((ap) => (
                                <View key={`${ap.id}-${ap.code}`} style={styles.applicationCard}>
                                    <View style={styles.apHeader}>
                                        <View>
                                            <View style={styles.apTitleRow}>
                                                <Ionicons
                                                    name="shield"
                                                    size={17}
                                                    color={getStatusColor(ap.status)}
                                                />

                                                <Text style={styles.apCode}>{ap.code}</Text>
                                            </View>

                                            <Text style={styles.apDate}>{formatDateBR(ap.date)}</Text>
                                        </View>

                                        <View style={styles.apStatusPill}>
                                            <Text
                                                style={[
                                                    styles.apStatusText,
                                                    { color: getStatusColor(ap.status) },
                                                ]}
                                            >
                                                {ap.statusLabel}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.operationBox}>
                                        <Text style={styles.operationLabel}>Operação</Text>
                                        <Text style={styles.operationText}>{ap.operation}</Text>
                                    </View>

                                    <View style={styles.productsList}>
                                        {ap.products
                                            .filter((product) => product.type !== "Operação")
                                            .map((product) => (
                                                <View key={product.id} style={styles.productRow}>
                                                    <View
                                                        style={[
                                                            styles.productColorBar,
                                                            { backgroundColor: product.colorChip },
                                                        ]}
                                                    />

                                                    <View style={styles.productInfo}>
                                                        <Text
                                                            style={[
                                                                styles.productType,
                                                                { color: product.colorChip },
                                                            ]}
                                                            numberOfLines={1}
                                                        >
                                                            {product.type}
                                                        </Text>

                                                        <Text style={styles.productName} numberOfLines={2}>
                                                            {product.product}
                                                        </Text>
                                                    </View>

                                                    <View style={styles.doseBox}>
                                                        <Text style={styles.doseLabel}>Dose Solicitada</Text>

                                                        <Text style={styles.doseValue}>
                                                            {formatDose(product.soughtDose ?? product.displayDose)}{" "}
                                                            {product.soughtUnit ?? product.displayUnit}
                                                        </Text>
                                                    </View>
                                                </View>
                                            ))}
                                    </View>
                                </View>
                            ))
                        )}
                    </ScrollView>
                </>
            )}
        </Animated.View>
    );
};

export default ParcelApplicationsSheet;

const styles = StyleSheet.create({
    sheet: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 40,
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: -8 },
        elevation: 16,
        overflow: "hidden",
    },
    handleArea: {
        paddingTop: 10,
        paddingHorizontal: 16,
        paddingBottom: 10,
    },
    handleIcon: {
        alignSelf: "center",
        width: 38,
        height: 28,
        borderRadius: 999,
        backgroundColor: "rgba(15,23,42,0.06)",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 10,
    },
    header: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
    },
    headerLeft: {
        flex: 1,
    },
    titleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 9,
    },
    title: {
        flex: 1,
        color: "#020617",
        fontSize: 20,
        fontWeight: "950",
    },
    subtitle: {
        marginTop: 4,
        color: "rgba(15,23,42,0.68)",
        fontSize: 13,
        fontWeight: "800",
    },
    headerRight: {
        alignItems: "flex-end",
        paddingTop: 2,
    },
    harvestText: {
        color: "#020617",
        fontSize: 14,
        fontWeight: "900",
    },
    cycleText: {
        marginTop: 4,
        color: "#020617",
        fontSize: 14,
        fontWeight: "800",
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "rgba(15,23,42,0.06)",
        alignItems: "center",
        justifyContent: "center",
    },
    skeletonBox: {
        paddingVertical: 28,
        alignItems: "center",
        justifyContent: "center",
    },
    skeletonText: {
        marginTop: 10,
        color: Colors.primary[800],
        fontSize: 13,
        fontWeight: "900",
    },
    errorBox: {
        marginHorizontal: 16,
        marginBottom: 18,
        backgroundColor: "#FEF3C7",
        borderRadius: 16,
        padding: 14,
    },
    errorTitle: {
        color: "#92400E",
        fontSize: 14,
        fontWeight: "900",
    },
    errorText: {
        marginTop: 4,
        color: "#92400E",
        fontSize: 12,
        fontWeight: "700",
    },
    summaryRow: {
        flexDirection: "row",
        paddingHorizontal: 16,
        paddingBottom: 12,
        gap: 8,
    },
    summaryItem: {
        flex: 1,
        backgroundColor: "rgba(15,23,42,0.045)",
        borderRadius: 15,
        paddingVertical: 10,
        alignItems: "center",
    },
    summaryValue: {
        color: Colors.primary[800],
        fontSize: 17,
        fontWeight: "950",
    },
    summaryLabel: {
        marginTop: 2,
        color: "rgba(15,23,42,0.52)",
        fontSize: 10,
        fontWeight: "900",
        textTransform: "uppercase",
    },
    filterRow: {
        flexDirection: "row",
        paddingHorizontal: 16,
        paddingBottom: 12,
        gap: 8,
    },
    filterChip: {
        borderRadius: 999,
        paddingHorizontal: 13,
        paddingVertical: 8,
        backgroundColor: "rgba(15,23,42,0.055)",
    },
    filterChipSelected: {
        backgroundColor: Colors.primary[700],
    },
    filterChipText: {
        color: "rgba(15,23,42,0.68)",
        fontSize: 12,
        fontWeight: "900",
    },
    filterChipTextSelected: {
        color: "#FFFFFF",
    },
    scroll: {
        flex: 1,
        backgroundColor: "#E5EAF2",
        borderTopWidth: 1,
        borderTopColor: "rgba(15,23,42,0.06)",
    },
    scrollContent: {
        padding: 14,
        paddingBottom: 34,
    },
    emptyBox: {
        alignItems: "center",
        paddingVertical: 34,
    },
    emptyTitle: {
        marginTop: 8,
        color: "#0F172A",
        fontSize: 15,
        fontWeight: "900",
    },
    emptyText: {
        marginTop: 4,
        color: "rgba(15,23,42,0.52)",
        fontSize: 12,
        fontWeight: "700",
        textAlign: "center",
    },
    applicationCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 18,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "rgba(15,23,42,0.08)",
        overflow: "hidden",
    },
    apHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        padding: 14,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(15,23,42,0.07)",
    },
    apTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
    },
    apCode: {
        color: "#0F172A",
        fontSize: 18,
        fontWeight: "950",
    },
    apDate: {
        marginTop: 8,
        color: "rgba(15,23,42,0.68)",
        fontSize: 14,
        fontWeight: "750",
    },
    apStatusPill: {
        backgroundColor: "rgba(15,23,42,0.045)",
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
        alignSelf: "flex-start",
    },
    apStatusText: {
        fontSize: 11,
        fontWeight: "950",
    },
    operationBox: {
        paddingHorizontal: 14,
        paddingVertical: 12,
        backgroundColor: "rgba(15,23,42,0.02)",
    },
    operationLabel: {
        color: "rgba(15,23,42,0.52)",
        fontSize: 12,
        fontWeight: "900",
    },
    operationText: {
        marginTop: 4,
        color: "#0F172A",
        fontSize: 14,
        fontWeight: "850",
    },
    productsList: {
        paddingVertical: 6,
    },
    productRow: {
        minHeight: 74,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    productColorBar: {
        width: 6,
        alignSelf: "stretch",
        borderRadius: 999,
        marginRight: 10,
    },
    productInfo: {
        flex: 1,
        paddingRight: 10,
    },
    productType: {
        fontSize: 13,
        fontWeight: "950",
    },
    productName: {
        marginTop: 4,
        color: "#111827",
        fontSize: 14,
        fontWeight: "750",
        lineHeight: 18,
    },
    doseBox: {
        width: 112,
        alignItems: "flex-end",
    },
    doseLabel: {
        color: "rgba(15,23,42,0.52)",
        fontSize: 11,
        fontWeight: "850",
        textAlign: "right",
    },
    doseValue: {
        marginTop: 5,
        color: "#111827",
        fontSize: 14,
        fontWeight: "850",
        textAlign: "right",
    },
    cropIconWrap: {
        width: 32,
        height: 32,
        borderRadius: 16,
        // backgroundColor: "rgba(15,23,42,0.045)",
        alignItems: "center",
        justifyContent: "center",
        // borderWidth: 1,
        // borderColor: "rgba(15,23,42,0.08)",
    },

    cropIconImage: {
        width: 22,
        height: 22,
        resizeMode: "contain",
    },

    cropFallbackBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "rgba(15,23,42,0.10)",
    },

    cropFallbackIcon: {
        width: 18,
        height: 18,
        resizeMode: "contain",
        opacity: 0.86,
    },
});