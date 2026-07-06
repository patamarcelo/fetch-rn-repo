import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Platform,
    Animated,
    Dimensions,
    Image,
    PanResponder,
    Modal,
    KeyboardAvoidingView,
    StatusBar
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import Ionicons from "@expo/vector-icons/Ionicons";
import { Colors } from "../../constants/styles";

const SCREEN_HEIGHT = Dimensions.get("window").height;

const APPLICATIONS_SHEET_COLLAPSED_HEIGHT = Platform.OS === "ios" ? 360 : 340;
const APPLICATIONS_SHEET_EXPANDED_HEIGHT = SCREEN_HEIGHT;

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
    {
        keys: ["milho"],
        icon: require("../../utils/assets/icons/corn.png"),
        alt: "milho",
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

const normalizeSearchText = (value) => {
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

const formatDateBRTime = (value) => {
    if (!value) return "—";

    const dateOnly = String(value).split("T")[0];
    const [year, month, day] = dateOnly.split("-");

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
    if (
        value === null ||
        value === undefined ||
        value === "" ||
        Number.isNaN(Number(value))
    ) {
        return "—";
    }

    return Number(value).toLocaleString("pt-BR", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    });
};

const formatDap = (value) => {
    if (
        value === null ||
        value === undefined ||
        value === "" ||
        Number.isNaN(Number(value))
    ) {
        return "—";
    }

    return `${Number(value)} DAP`;
};

const getApplicationProgressPercent = (ap, parcelArea) => {
    const appliedArea = Number(ap?.progress?.area);
    const totalArea = Number(parcelArea);

    if (
        !ap?.progress ||
        Number.isNaN(appliedArea) ||
        Number.isNaN(totalArea) ||
        totalArea <= 0
    ) {
        return null;
    }

    const percent = Math.round((appliedArea / totalArea) * 100);

    return Math.max(0, Math.min(percent, 100));
};

const getProgressCircleColor = (percent, status) => {
    if (status === "canceled") return "#991B1B";
    if (percent >= 100) return "#166534";
    if (percent >= 75) return "#0F766E";
    if (percent >= 40) return "#CA8A04";
    return "#92400E";
};

const getStatusColor = (status) => {
    if (status === "finalized") return "#166534";
    if (status === "applied") return "#0F766E";
    if (status === "sought") return "#92400E";
    if (status === "canceled") return "#991B1B";
    return "#475569";
};

const addDaysToDate = (dateValue, daysValue) => {
    if (!dateValue || daysValue === null || daysValue === undefined || daysValue === "") {
        return null;
    }

    const days = Number(daysValue);

    if (Number.isNaN(days)) {
        return null;
    }

    const [year, month, day] = String(dateValue).split("-").map(Number);

    if (!year || !month || !day) {
        return null;
    }

    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + days);

    const resultYear = date.getFullYear();
    const resultMonth = String(date.getMonth() + 1).padStart(2, "0");
    const resultDay = String(date.getDate()).padStart(2, "0");

    return `${resultYear}-${resultMonth}-${resultDay}`;
};

const SkeletonBlock = ({ style }) => {
    const opacity = useRef(new Animated.Value(0.45)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 720,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.45,
                    duration: 720,
                    useNativeDriver: true,
                }),
            ])
        );

        animation.start();

        return () => animation.stop();
    }, [opacity]);

    return <Animated.View style={[styles.skeletonBlock, style, { opacity }]} />;
};

const ApplicationSkeleton = () => {
    return (
        <View style={styles.skeletonContainer}>
            <View style={styles.skeletonSummaryRow}>
                {[0, 1, 2].map((item) => (
                    <View key={item} style={styles.skeletonSummaryCard}>
                        <SkeletonBlock style={styles.skeletonSummaryValue} />
                        <SkeletonBlock style={styles.skeletonSummaryLabel} />
                    </View>
                ))}
            </View>

            <View style={styles.skeletonFilterRow}>
                <SkeletonBlock style={styles.skeletonFilterChipLarge} />
                <SkeletonBlock style={styles.skeletonFilterChip} />
                <SkeletonBlock style={styles.skeletonFilterChip} />
            </View>

            <View style={styles.skeletonListArea}>
                {[0, 1, 2].map((item) => (
                    <View key={item} style={styles.skeletonApplicationCard}>
                        <View style={styles.skeletonApplicationHeader}>
                            <View>
                                <SkeletonBlock style={styles.skeletonApCode} />
                                <SkeletonBlock style={styles.skeletonApDate} />
                            </View>

                            <SkeletonBlock style={styles.skeletonStatusPill} />
                        </View>

                        <View style={styles.skeletonOperationBox}>
                            <SkeletonBlock style={styles.skeletonOperationLabel} />
                            <SkeletonBlock style={styles.skeletonOperationText} />
                        </View>

                        <View style={styles.skeletonProductRow}>
                            <SkeletonBlock style={styles.skeletonColorBar} />

                            <View style={styles.skeletonProductInfo}>
                                <SkeletonBlock style={styles.skeletonProductType} />
                                <SkeletonBlock style={styles.skeletonProductName} />
                            </View>

                            <View style={styles.skeletonDoseBox}>
                                <SkeletonBlock style={styles.skeletonDoseLabel} />
                                <SkeletonBlock style={styles.skeletonDoseValue} />
                            </View>
                        </View>
                    </View>
                ))}
            </View>
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
    const [productSearch, setProductSearch] = useState("");

    const applicationsSheetHeight = useRef(
        new Animated.Value(
            expanded
                ? APPLICATIONS_SHEET_EXPANDED_HEIGHT
                : APPLICATIONS_SHEET_COLLAPSED_HEIGHT
        )
    ).current;

    const applications = Array.isArray(data?.applications) ? data.applications : [];

    const applicationsMatchingProduct = useMemo(() => {
        const searchText = normalizeSearchText(productSearch);

        if (!searchText) return applications;

        return applications.filter((ap) =>
            (ap.products || [])
                .filter((product) => product.type !== "Operação")
                .some((product) => {
                    const productName = normalizeSearchText(product.product);
                    const productType = normalizeSearchText(product.type);
                    const register = normalizeSearchText(product.register);
                    const manufacturer = normalizeSearchText(product.manufacturer);

                    return (
                        productName.includes(searchText) ||
                        productType.includes(searchText) ||
                        register.includes(searchText) ||
                        manufacturer.includes(searchText)
                    );
                })
        );
    }, [applications, productSearch]);

    const visibleTotals = useMemo(() => {
        return applicationsMatchingProduct.reduce(
            (acc, ap) => {
                acc.total += 1;

                if (ap.status === "sought") acc.open += 1;
                if (ap.status === "applied") acc.applied += 1;
                if (ap.status === "finalized") acc.finalized += 1;
                if (ap.status === "canceled") acc.canceled += 1;

                return acc;
            },
            {
                total: 0,
                open: 0,
                applied: 0,
                finalized: 0,
                canceled: 0,
            }
        );
    }, [applicationsMatchingProduct]);

    const filteredApplications = useMemo(() => {
        if (statusFilter === "all") return applicationsMatchingProduct;

        if (statusFilter === "open") {
            return applicationsMatchingProduct.filter((item) => item.status === "sought");
        }

        if (statusFilter === "applied") {
            return applicationsMatchingProduct.filter((item) => item.status === "applied");
        }

        if (statusFilter === "finalized") {
            return applicationsMatchingProduct.filter((item) => item.status === "finalized");
        }

        if (statusFilter === "canceled") {
            return applicationsMatchingProduct.filter((item) => item.status === "canceled");
        }

        return applicationsMatchingProduct;
    }, [applicationsMatchingProduct, statusFilter]);

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

    const plantingDateValue =
        parcelData?.plantingDate ||
        parcelData?.planting_date ||
        parcelData?.activationDate ||
        parcelData?.activation_date ||
        parcel?.data_plantio ||
        parcel?.data_prevista_plantio ||
        null;

    const harvestPredictionDateFromApi =
        parcel?.data_prevista_colheita ||
        parcel?.dados?.data_prevista_colheita ||
        parcel?.harvestPredictionDate ||
        parcel?.harvest_prediction_date ||
        parcelData?.data_prevista_colheita ||
        parcelData?.dados?.data_prevista_colheita ||
        parcelData?.harvestPredictionDate ||
        parcelData?.harvest_prediction_date ||
        null;

    const harvestPredictionDateCalculated = addDaysToDate(
        parcel?.data_plantio ||
        parcel?.dados?.data_plantio ||
        parcel?.data_prevista_plantio ||
        parcel?.dados?.data_prevista_plantio ||
        parcelData?.plantingDate ||
        parcelData?.planting_date ||
        parcelData?.data_plantio ||
        parcelData?.data_prevista_plantio ||
        null,
        parcel?.dias_ciclo ||
        parcel?.dados?.dias_ciclo ||
        parcelData?.dias_ciclo ||
        parcelData?.cycleDays ||
        null
    );

    const harvestPredictionDateValue =
        harvestPredictionDateFromApi || harvestPredictionDateCalculated;

    const dapValue =
        parcelData?.dapToday ??
        parcelData?.dap_today ??
        parcelData?.dap ??
        parcel?.dap ??
        null;

    const safraValue = parcelData?.safra || parcel?.safra || "—";

    const cicloValue =
        parcelData?.ciclo || parcel?.ciclo
            ? `${parcelData?.ciclo || parcel?.ciclo}`
            : "—";

    useEffect(() => {
        if (!visible) {
            applicationsSheetHeight.stopAnimation();
            applicationsSheetHeight.setValue(APPLICATIONS_SHEET_COLLAPSED_HEIGHT);
            return;
        }

        const nextHeight = expanded
            ? APPLICATIONS_SHEET_EXPANDED_HEIGHT
            : APPLICATIONS_SHEET_COLLAPSED_HEIGHT;

        if (!expanded) {
            applicationsSheetHeight.stopAnimation();
            applicationsSheetHeight.setValue(APPLICATIONS_SHEET_COLLAPSED_HEIGHT);
            return;
        }

        Animated.timing(applicationsSheetHeight, {
            toValue: nextHeight,
            duration: 420,
            useNativeDriver: false,
        }).start();
    }, [visible, expanded, applicationsSheetHeight]);

    useEffect(() => {
        if (!visible) {
            setProductSearch("");
            setStatusFilter("all");
        }
    }, [visible]);

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

    const handleBackdropPress = useCallback(() => {
        if (expanded) return;
        onClose?.();
    }, [expanded, onClose]);


    const applicationsSheetPanResponder = useMemo(
        () =>
            PanResponder.create({
                onStartShouldSetPanResponder: () => false,

                onMoveShouldSetPanResponder: (_, gestureState) => {
                    if (!expanded) {
                        return gestureState.dy < -6;
                    }

                    return gestureState.dy > 6;
                },

                onPanResponderTerminationRequest: () => false,

                onPanResponderRelease: (_, gestureState) => {
                    if (!expanded && gestureState.dy < -8) {
                        expandApplicationsSheet();
                        return;
                    }

                    if (expanded && gestureState.dy > 18) {
                        onClose?.();
                    }
                },
            }),
        [expanded, expandApplicationsSheet, onClose]
    );

    const statusSummaryItems = [
        {
            key: "all",
            label: "Aplicações",
            value: visibleTotals.total,
            color: Colors.primary[800],
            bg: "rgba(30,64,175,0.08)",
            border: "rgba(30,64,175,0.16)",
        },
        {
            key: "open",
            label: "Abertas",
            value: visibleTotals.open,
            color: "#92400E",
            bg: "rgba(146,64,14,0.09)",
            border: "rgba(146,64,14,0.18)",
        },
        {
            key: "applied",
            label: "Aplicadas",
            value: visibleTotals.applied,
            color: "#0F766E",
            bg: "rgba(15,118,110,0.10)",
            border: "rgba(15,118,110,0.22)",
        },
        {
            key: "finalized",
            label: "Finalizadas",
            value: visibleTotals.finalized,
            color: "#166534",
            bg: "rgba(22,101,52,0.10)",
            border: "rgba(22,101,52,0.20)",
        },
    ];

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={onClose}
        >
            <StatusBar
                barStyle={!expanded ? "light-content" : "dark-content"}
                translucent={Platform.OS === "android"}
            />
            <View style={styles.modalRoot}>
                <TouchableOpacity
                    activeOpacity={1}
                    style={[
                        styles.modalBackdrop,
                        expanded && styles.modalBackdropExpanded,
                    ]}
                    onPress={handleBackdropPress}
                />

                <KeyboardAvoidingView
                    style={styles.keyboardAvoiding}
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                >
                    <Animated.View
                        style={[
                            styles.sheet,
                            expanded && styles.sheetExpanded,
                            {
                                height: applicationsSheetHeight,
                            },
                        ]}
                    >
                        <SafeAreaView
                            style={styles.sheetSafeArea}
                            edges={expanded ? ["top", ""] : [""]}
                        >
                            <View
                                style={[
                                    styles.handleArea,
                                    expanded && styles.handleAreaExpanded,
                                ]}
                                {...applicationsSheetPanResponder.panHandlers}
                            >
                                {!expanded ? (
                                    <View style={styles.dragHandleWrap}>
                                        <TouchableOpacity
                                            activeOpacity={0.86}
                                            onPress={expandApplicationsSheet}
                                            style={styles.handleIcon}
                                        >
                                            <Ionicons
                                                name="chevron-up"
                                                size={22}
                                                color="rgba(15,23,42,0.62)"
                                            />
                                        </TouchableOpacity>
                                    </View>
                                ) : null}

                                <View style={styles.header}>
                                    <View style={styles.headerTopRow}>
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
                                                    <Image
                                                        source={fallbackCropIcon}
                                                        style={styles.cropFallbackIcon}
                                                    />
                                                </View>
                                            )}

                                            <View style={styles.titleTextRow}>
                                                <Text style={styles.title} numberOfLines={1}>
                                                    {parcelData?.name || parcel?.parcela || "Parcela"}
                                                </Text>

                                                <Text style={styles.titleArea} numberOfLines={1}>
                                                    {formatAreaBR(parcelData?.area ?? parcel?.area)} ha
                                                </Text>
                                            </View>
                                        </View>

                                        <View style={styles.headerActions}>
                                            <Text style={styles.harvestText} numberOfLines={1}>
                                                {safraValue} · {cicloValue}
                                            </Text>

                                            <TouchableOpacity
                                                activeOpacity={0.82}
                                                onPress={onClose}
                                                style={[
                                                    styles.closeButton,
                                                    expanded && styles.closeButtonExpanded,
                                                ]}
                                            >
                                                <Ionicons name="close" size={18} color="#0F172A" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    <View style={styles.metaCard}>
                                        <View style={styles.metaCardColumn}>
                                            <Text style={styles.metaCardLabel}>Cultura</Text>
                                            <Text style={styles.metaCardValue} numberOfLines={1}>
                                                {varietyValue || cropValue || "—"}
                                            </Text>
                                        </View>

                                        <View style={styles.metaCardDivider} />

                                        <View style={styles.metaCardColumn}>
                                            <Text style={styles.metaCardLabel}>Plantio</Text>
                                            <Text style={styles.metaCardValue} numberOfLines={1}>
                                                {formatDateBR(plantingDateValue)}
                                            </Text>
                                        </View>

                                        <View style={styles.metaCardDivider} />

                                        <View style={styles.metaCardColumn}>
                                            <Text style={styles.metaCardLabel}>DAP</Text>
                                            <Text style={styles.metaCardValue} numberOfLines={1}>
                                                {formatDap(dapValue)}
                                            </Text>
                                        </View>

                                        <View style={styles.metaCardDivider} />

                                        <View style={styles.metaCardColumn}>
                                            <Text style={styles.metaCardLabel}>Colheita</Text>
                                            <Text style={styles.metaCardValue} numberOfLines={1}>
                                                {formatDateBR(harvestPredictionDateValue)}
                                            </Text>
                                        </View>
                                    </View>
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
                                        {statusSummaryItems.map((item) => {
                                            const isSelected = statusFilter === item.key;

                                            return (
                                                <TouchableOpacity
                                                    key={item.key}
                                                    activeOpacity={0.86}
                                                    onPress={() => setStatusFilter(item.key)}
                                                    style={[
                                                        styles.summaryItem,
                                                        {
                                                            backgroundColor: item.bg,
                                                            borderColor: item.border,
                                                        },
                                                        isSelected && [
                                                            styles.summaryItemSelected,
                                                            {
                                                                borderColor: item.color,
                                                            },
                                                        ],
                                                    ]}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.summaryValue,
                                                            { color: item.color },
                                                        ]}
                                                    >
                                                        {item.value}
                                                    </Text>

                                                    <Text
                                                        style={[
                                                            styles.summaryLabel,
                                                            { color: item.color },
                                                        ]}
                                                        numberOfLines={1}
                                                    >
                                                        {item.label}
                                                    </Text>

                                                    {isSelected ? (
                                                        <View
                                                            style={[
                                                                styles.summarySelectedDot,
                                                                { backgroundColor: item.color },
                                                            ]}
                                                        />
                                                    ) : null}
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>

                                    <View style={styles.searchBox}>
                                        <Ionicons
                                            name="search-outline"
                                            size={16}
                                            color="rgba(15,23,42,0.48)"
                                        />

                                        <TextInput
                                            value={productSearch}
                                            onChangeText={setProductSearch}
                                            placeholder="Buscar produto aplicado na parcela..."
                                            placeholderTextColor="rgba(15,23,42,0.42)"
                                            style={styles.searchInput}
                                            autoCorrect={false}
                                            autoCapitalize="none"
                                        />

                                        {productSearch ? (
                                            <TouchableOpacity
                                                activeOpacity={0.75}
                                                onPress={() => setProductSearch("")}
                                                style={styles.searchClearButton}
                                            >
                                                <Ionicons
                                                    name="close"
                                                    size={14}
                                                    color="rgba(15,23,42,0.62)"
                                                />
                                            </TouchableOpacity>
                                        ) : null}
                                    </View>

                                    <ScrollView
                                        style={styles.scroll}
                                        contentContainerStyle={styles.scrollContent}
                                        showsVerticalScrollIndicator
                                        indicatorStyle="black"
                                        keyboardShouldPersistTaps="handled"
                                        scrollIndicatorInsets={{
                                            right: 2,
                                            bottom: 8,
                                        }}
                                    >
                                        {filteredApplications.length === 0 ? (
                                            <View style={styles.emptyBox}>
                                                <Ionicons
                                                    name="leaf-outline"
                                                    size={26}
                                                    color="rgba(15,23,42,0.38)"
                                                />
                                                <Text style={styles.emptyTitle}>
                                                    Nenhuma aplicação encontrada
                                                </Text>
                                                <Text style={styles.emptyText}>
                                                    {productSearch
                                                        ? "Nenhuma aplicação dessa parcela possui esse produto."
                                                        : "Essa parcela ainda não possui aplicações nesse filtro."}
                                                </Text>
                                            </View>
                                        ) : (
                                            filteredApplications.map((ap, apIndex) => {
                                                const parcelAreaValue = parcelData?.area ?? parcel?.area;
                                                const progressPercent = getApplicationProgressPercent(
                                                    ap,
                                                    parcelAreaValue
                                                );
                                                const progressColor = getProgressCircleColor(
                                                    progressPercent ?? 0,
                                                    ap.status
                                                );
                                                const statusColor = getStatusColor(ap.status);

                                                return (
                                                    <View
                                                        key={`${ap.id || ap.mongoId || ap.code || "ap"}-${apIndex}`}
                                                        style={styles.applicationCard}
                                                    >
                                                        <View style={styles.apHeader}>
                                                            <View style={styles.apHeaderLeft}>
                                                                <View style={styles.apTitleRow}>
                                                                    <Ionicons
                                                                        name="shield"
                                                                        size={17}
                                                                        color={statusColor}
                                                                    />

                                                                    <Text style={styles.apCode}>{ap.code}</Text>
                                                                </View>

                                                                <View style={styles.apDateRow}>
                                                                    <Ionicons
                                                                        name="calendar-outline"
                                                                        size={15}
                                                                        color="rgba(15,23,42,0.56)"
                                                                    />

                                                                    <Text style={styles.apDate}>
                                                                        {formatDateBR(ap.date)}
                                                                    </Text>
                                                                </View>
                                                            </View>

                                                            <View
                                                                style={[
                                                                    styles.apStatusPill,
                                                                    {
                                                                        backgroundColor: `${statusColor}12`,
                                                                        borderColor: `${statusColor}30`,
                                                                    },
                                                                ]}
                                                            >
                                                                <Text
                                                                    style={[
                                                                        styles.apStatusText,
                                                                        { color: statusColor },
                                                                    ]}
                                                                    numberOfLines={1}
                                                                >
                                                                    {ap.statusLabel}
                                                                </Text>
                                                            </View>
                                                        </View>

                                                        <View style={styles.operationRow}>
                                                            <View style={styles.operationBox}>
                                                                <Text style={styles.operationLabel}>Operação</Text>
                                                                <Text style={styles.operationText}>{ap.operation}</Text>
                                                            </View>

                                                            <View style={styles.operationProgressWrap}>
                                                                <View
                                                                    style={[
                                                                        styles.progressCircle,
                                                                        {
                                                                            borderColor: `${progressColor}30`,
                                                                            backgroundColor: `${progressColor}08`,
                                                                        },
                                                                    ]}
                                                                >
                                                                    <View
                                                                        style={[
                                                                            styles.progressCircleFill,
                                                                            {
                                                                                height: `${progressPercent ?? 0}%`,
                                                                                backgroundColor: `${progressColor}20`,
                                                                            },
                                                                        ]}
                                                                    />

                                                                    {/* <View style={styles.progressCircleGloss} /> */}

                                                                    <Text
                                                                        style={[
                                                                            styles.progressCircleValue,
                                                                            { color: progressColor, fontWeight: 'bold' },
                                                                        ]}
                                                                    >
                                                                        {progressPercent !== null
                                                                            ? `${progressPercent}%`
                                                                            : "—"}
                                                                    </Text>
                                                                </View>
                                                            </View>
                                                        </View>

                                                        {ap.progress ? (
                                                            <View style={styles.progressBox}>
                                                                <View style={styles.progressItem}>
                                                                    <Text style={styles.progressLabel}>Aplicado em</Text>
                                                                    <Text style={styles.progressValue}>
                                                                        {formatDateBRTime(ap.progress.date)}
                                                                    </Text>
                                                                </View>

                                                                <View style={styles.progressItem}>
                                                                    <Text style={styles.progressLabel}>
                                                                        Área aplicada
                                                                    </Text>
                                                                    <Text style={styles.progressValue}>
                                                                        {formatAreaBR(ap.progress.area)} ha
                                                                    </Text>
                                                                </View>

                                                                {ap.progress.equipment ? (
                                                                    <View style={styles.progressItem}>
                                                                        <Text style={styles.progressLabel}>
                                                                            Equipamento
                                                                        </Text>
                                                                        <Text
                                                                            style={styles.progressValue}
                                                                            numberOfLines={1}
                                                                        >
                                                                            {ap.progress.equipment}
                                                                        </Text>
                                                                    </View>
                                                                ) : null}
                                                            </View>
                                                        ) : null}

                                                        <View style={styles.productsList}>
                                                            {(ap.products || [])
                                                                .filter((product) => product.type !== "Operação")
                                                                .map((product, productIndex) => (
                                                                    <View
                                                                        key={`${ap.id || ap.mongoId || ap.code}-product-${product.id || product.product || productIndex
                                                                            }-${productIndex}`}
                                                                        style={styles.productRow}
                                                                    >
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

                                                                            <Text
                                                                                style={styles.productName}
                                                                                numberOfLines={2}
                                                                            >
                                                                                {product.product}
                                                                            </Text>
                                                                        </View>

                                                                        <View style={styles.doseBox}>
                                                                            <Text style={styles.doseLabel}>
                                                                                Dose Solicitada
                                                                            </Text>

                                                                            <Text style={styles.doseValue}>
                                                                                {formatDose(
                                                                                    product.soughtDose ??
                                                                                    product.displayDose
                                                                                )}{" "}
                                                                                {product.soughtUnit ??
                                                                                    product.displayUnit}
                                                                            </Text>
                                                                        </View>
                                                                    </View>
                                                                ))}
                                                        </View>
                                                    </View>
                                                );
                                            })
                                        )}
                                    </ScrollView>
                                </>
                            )}
                        </SafeAreaView>
                    </Animated.View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
};

export default ParcelApplicationsSheet;

const styles = StyleSheet.create({
    modalRoot: {
        flex: 1,
        justifyContent: "flex-end",
    },

    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.22)",
    },

    modalBackdropExpanded: {
        backgroundColor: "#FFFFFF",
    },

    keyboardAvoiding: {
        flex: 1,
        justifyContent: "flex-end",
    },

    sheet: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
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

    sheetExpanded: {
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
    },

    sheetSafeArea: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },

    handleArea: {
        paddingTop: 10,
        paddingHorizontal: 16,
        paddingBottom: 10,
        backgroundColor: "#FFFFFF",
    },

    handleAreaExpanded: {
        paddingTop: Platform.OS === "android" ? 10 : 0,
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
        gap: 6,
    },

    headerTopRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
    },

    titleRow: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        minWidth: 0,
    },

    headerActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        flexShrink: 0,
    },

    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "rgba(15,23,42,0.06)",
        alignItems: "center",
        justifyContent: "center",
    },

    closeButtonExpanded: {
        backgroundColor: "rgba(15,23,42,0.09)",
    },

    harvestText: {
        color: "#020617",
        fontSize: 12.5,
        fontWeight: "900",
    },

    cropIconWrap: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
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

    titleTextRow: {
        flex: 1,
        flexDirection: "row",
        alignItems: "baseline",
        gap: 5,
        minWidth: 0,
    },

    title: {
        flexShrink: 1,
        color: "#020617",
        fontSize: 20,
        fontWeight: "950",
    },

    titleArea: {
        flexShrink: 0,
        color: "rgba(15,23,42,0.56)",
        fontSize: 12,
        fontWeight: "900",
    },

    metaCard: {
        marginTop: 8,
        flexDirection: "row",
        alignItems: "stretch",
        backgroundColor: "rgba(15,23,42,0.045)",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "rgba(15,23,42,0.06)",
        paddingVertical: 8,
        paddingHorizontal: 6,
    },

    metaCardColumn: {
        flex: 1,
        minWidth: 0,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 5,
    },

    metaCardLabel: {
        color: "rgba(15,23,42,0.5)",
        fontSize: 9,
        fontWeight: "bold",
        textTransform: "uppercase",
        letterSpacing: 0.25,
    },

    metaCardValue: {
        marginTop: 3,
        color: "#0F172A",
        fontSize: 11.5,
        fontWeight: "850",
        textAlign: "center",
    },

    metaCardDivider: {
        width: 1,
        backgroundColor: "rgba(15,23,42,0.08)",
        marginVertical: 2,
    },

    skeletonContainer: {
        flex: 1,
    },

    skeletonBlock: {
        backgroundColor: "rgba(15,23,42,0.075)",
        borderRadius: 999,
    },

    skeletonSummaryRow: {
        flexDirection: "row",
        paddingHorizontal: 16,
        paddingBottom: 12,
        gap: 8,
    },

    skeletonSummaryCard: {
        flex: 1,
        backgroundColor: "rgba(15,23,42,0.035)",
        borderRadius: 15,
        paddingVertical: 12,
        alignItems: "center",
    },

    skeletonSummaryValue: {
        width: 34,
        height: 18,
    },

    skeletonSummaryLabel: {
        marginTop: 7,
        width: 58,
        height: 9,
    },

    skeletonFilterRow: {
        flexDirection: "row",
        paddingHorizontal: 16,
        paddingBottom: 12,
        gap: 8,
    },

    skeletonFilterChipLarge: {
        width: 74,
        height: 32,
    },

    skeletonFilterChip: {
        width: 82,
        height: 32,
    },

    skeletonListArea: {
        flex: 1,
        backgroundColor: "#E5EAF2",
        borderTopWidth: 1,
        borderTopColor: "rgba(15,23,42,0.06)",
        padding: 14,
    },

    skeletonApplicationCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 18,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "rgba(15,23,42,0.08)",
        overflow: "hidden",
    },

    skeletonApplicationHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        padding: 14,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(15,23,42,0.07)",
    },

    skeletonApCode: {
        width: 78,
        height: 19,
    },

    skeletonApDate: {
        marginTop: 9,
        width: 92,
        height: 13,
    },

    skeletonStatusPill: {
        width: 74,
        height: 27,
    },

    skeletonOperationBox: {
        paddingHorizontal: 14,
        paddingVertical: 12,
        backgroundColor: "rgba(15,23,42,0.02)",
    },

    skeletonOperationLabel: {
        width: 64,
        height: 11,
    },

    skeletonOperationText: {
        marginTop: 8,
        width: "76%",
        height: 14,
    },

    skeletonProductRow: {
        minHeight: 74,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingVertical: 10,
    },

    skeletonColorBar: {
        width: 6,
        alignSelf: "stretch",
        borderRadius: 999,
        marginRight: 10,
    },

    skeletonProductInfo: {
        flex: 1,
        paddingRight: 10,
    },

    skeletonProductType: {
        width: 82,
        height: 12,
    },

    skeletonProductName: {
        marginTop: 8,
        width: "88%",
        height: 15,
    },

    skeletonDoseBox: {
        width: 112,
        alignItems: "flex-end",
    },

    skeletonDoseLabel: {
        width: 78,
        height: 10,
    },

    skeletonDoseValue: {
        marginTop: 8,
        width: 64,
        height: 14,
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
        backgroundColor: "#FFFFFF",
    },

    summaryItem: {
        flex: 1,
        minHeight: 62,
        borderRadius: 16,
        paddingVertical: 9,
        paddingHorizontal: 6,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        position: "relative",
    },

    summaryItemSelected: {
        transform: [{ translateY: -1 }],
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 3,
    },

    summaryValue: {
        fontSize: 17,
        fontWeight: "950",
    },

    summaryLabel: {
        marginTop: 2,
        fontSize: 9.5,
        fontWeight: "950",
        textTransform: "uppercase",
        textAlign: "center",
    },

    summarySelectedDot: {
        position: "absolute",
        bottom: 5,
        width: 4,
        height: 4,
        borderRadius: 2,
    },

    searchBox: {
        marginHorizontal: 16,
        marginBottom: 12,
        minHeight: 42,
        borderRadius: 14,
        backgroundColor: "rgba(15,23,42,0.045)",
        borderWidth: 1,
        borderColor: "rgba(15,23,42,0.07)",
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        gap: 8,
    },

    searchInput: {
        flex: 1,
        minHeight: 40,
        color: "#0F172A",
        fontSize: 13,
        fontWeight: "750",
        paddingVertical: 0,
    },

    searchClearButton: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: "rgba(15,23,42,0.08)",
        alignItems: "center",
        justifyContent: "center",
    },

    scroll: {
        flex: 1,
        backgroundColor: "#E5EAF2",
        borderTopWidth: 1,
        borderTopColor: "rgba(15,23,42,0.06)",
    },

    scrollContent: {
        padding: 14,
        paddingBottom: Platform.OS === "ios" ? 44 : 34,
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
        alignItems: "center",
        justifyContent: "space-between",
        padding: 14,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(15,23,42,0.07)",
        gap: 10,
    },

    apHeaderLeft: {
        flex: 1,
        minWidth: 0,
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

    apDateRow: {
        marginTop: 8,
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
    },

    apDate: {
        color: "rgba(15,23,42,0.68)",
        fontSize: 14,
        fontWeight: "750",
    },

    apStatusPill: {
        minWidth: 92,
        maxWidth: 120,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 7,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
    },

    apStatusText: {
        fontSize: 11,
        fontWeight: "950",
        textAlign: "center",
    },

    operationRow: {
        flexDirection: "row",
        alignItems: "stretch",
        gap: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        backgroundColor: "rgba(15,23,42,0.02)",
    },

    operationBox: {
        flex: 1,
        justifyContent: "center",
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

    operationProgressWrap: {
        width: 72,
        alignItems: "center",
        justifyContent: "center",
    },

    progressCircle: {
        width: 52,
        height: 52,
        borderRadius: 26,
        borderWidth: 1,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
    },

    progressCircleFill: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
    },

    progressCircleGloss: {
        position: "absolute",
        top: 7,
        left: 8,
        right: 8,
        height: 8,
        borderRadius: 999,
        backgroundColor: "rgba(255,255,255,0.28)",
    },

    progressCircleValue: {
        fontSize: 12,
        fontWeight: "950",
        zIndex: 2,
    },

    progressBox: {
        flexDirection: "row",
        gap: 8,
        paddingHorizontal: 14,
        paddingVertical: 10,
        backgroundColor: "rgba(15,118,110,0.055)",
        borderBottomWidth: 1,
        borderBottomColor: "rgba(15,118,110,0.10)",
    },

    progressItem: {
        flex: 1,
        minWidth: 0,
    },

    progressLabel: {
        color: "rgba(15,118,110,0.72)",
        fontSize: 10,
        fontWeight: "900",
        textTransform: "uppercase",
    },

    progressValue: {
        marginTop: 3,
        color: "#0F766E",
        fontSize: 12,
        fontWeight: "900",
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
    dragHandleWrap: {
        alignItems: "center",
        justifyContent: "center",
        minHeight: 34,
        marginBottom: 6,
    },
});