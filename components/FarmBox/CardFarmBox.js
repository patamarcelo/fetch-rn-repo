import {
    Pressable,
    View,
    Text,
    StyleSheet,
    Image,
    Alert,
    Platform,
    ActivityIndicator,
    RefreshControl,
    useWindowDimensions,
    InteractionManager
} from "react-native";
import { Colors } from "../../constants/styles";
import { SafeAreaView } from "react-native-safe-area-context";

import { useState, useRef, useEffect, useMemo, useLayoutEffect } from "react";
import { Divider } from "@rneui/themed";

import * as Progress from "react-native-progress";
import * as Haptics from "expo-haptics";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import * as Clipboard from "expo-clipboard";


import { HeaderBackButton } from "@react-navigation/elements";
import { useScrollToTop } from "@react-navigation/native";

import { useDispatch, useSelector } from "react-redux";
import { geralActions } from "../../store/redux/geral";
import {
    selectMapDataPlot,
    selectFarmBoxData,
    selectFarmboxSearchBar,
    selectFarmboxSearchQuery,
} from "../../store/redux/selector";

import SearchBar from "../Global/SearchBar";
import { FAB } from "react-native-paper";
import IconButton from "../ui/IconButton";

import Animated, {
    FadeInRight,
    FadeInUp,
    FadeOut,
    FadeOutUp,
    Layout,
} from "react-native-reanimated";

import { EXPO_PUBLIC_REACT_APP_DJANGO_TOKEN } from "@env";
import { NODELINK, LINK } from "../../utils/api";
import { exportPdf } from "../../store/redux/authSlice";

import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import { exportPolygonsAsKML } from "../../utils/kml-generator";
import { postKmlMerge } from "../../services/generatekml";
import { newMapArr } from "../../screens/plot-helper";
import { SectionList } from "react-native";

import { captureRef } from "react-native-view-shot";
import ViewShot from "react-native-view-shot";

import AsyncStorage from "@react-native-async-storage/async-storage";

import {
    CUSTOM_TAB_BAR_TOTAL_HEIGHT,
    CUSTOM_TAB_BAR_CONTENT_PADDING,
    CUSTOM_TAB_BAR_FAB_BOTTOM,
} from '../../constans/layout'


const CardFarmBox = ({ route, navigation }) => {
    const { indexParent, farm } = route.params;
    const { setFarmboxSearchBar, setFarmboxSearchQuery, setFarmBoxData } = geralActions;

    const stackNavigator = navigation.getParent();

    const ref = useRef(null);
    const dispatch = useDispatch();

    const { data } = useSelector(selectFarmBoxData);
    const mapPlotData = useSelector(selectMapDataPlot);
    const searchQuery = useSelector(selectFarmboxSearchQuery);
    const showSearch = useSelector(selectFarmboxSearchBar);

    const [showAps, setShowAps] = useState({});
    const [selectedParcelasByCardKey, setSelectedParcelasByCardKey] = useState({});
    const [activeCardKey, setActiveCardKey] = useState(null);
    const [totalSelected, setTotalSelected] = useState(0);
    const [expandedProductKeys, setExpandedProductKeys] = useState({});

    const [farmData, setfarmData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const [isSharingUnique, setIsSharingUnique] = useState(false);

    const [isOpeningExport, setIsOpeningExport] = useState(false);

    const { width } = useWindowDimensions();

    const PARCELA_COLUMNS = 4;
    const PARCELA_CONTAINER_PADDING = 8; // paddingHorizontal 4 + 4
    const PARCELA_GAP = 5;
    const PARCELA_CARD_WIDTH = Math.floor(
        (width - PARCELA_CONTAINER_PADDING - PARCELA_GAP * (PARCELA_COLUMNS - 1)) /
        PARCELA_COLUMNS
    );

    const [viewMode, setViewMode] = useState("normal"); // normal | consolidated

    const backgroundColorCard = Platform.OS === "ios" ? "whitesmoke" : "white";
    const cardShareRefs = useRef({});

    const getSelectedFor = (cardKey) => selectedParcelasByCardKey[cardKey] || [];

    const wait = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));

    const formatDate = (date) => {
        if (!date) return '';
        return new Date(date).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
        });
    };

    const normalizeOnlyNumbers = (value) => {
        if (!value) return "";
        return String(value).replace(/\D/g, "");
    };

    const formatFarmboxId = (value) => {
        const onlyNumbers = normalizeOnlyNumbers(value);

        if (!onlyNumbers) return "";

        const sixDigits = onlyNumbers.padStart(6, "0").slice(-6);

        return `${sixDigits.slice(0, 3)}.${sixDigits.slice(3)}`;
    };

    const getProductFarmboxId = (produto) => {
        const possibleId =
            produto?.idFarmbox ??
            produto?.id_farmbox ??
            produto?.farmboxId ??
            produto?.farmbox_id ??
            produto?.defensivo__id_farmbox ??
            produto?.defensivo_id_farmbox;

        if (possibleId === undefined || possibleId === null || possibleId === "") {
            return "";
        }

        return String(possibleId);
    };

    const handleToggleProductId = (productKey) => {
        Haptics.selectionAsync();

        setExpandedProductKeys((prev) => ({
            ...prev,
            [productKey]: !prev[productKey],
        }));
    };

    const handleCopyFarmboxId = async (farmboxId) => {
        if (!farmboxId) return;

        try {
            await Clipboard.setStringAsync(farmboxId);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert("ID FarmBox copiado", `Código ${farmboxId} copiado.`);
        } catch (error) {
            console.log("Erro ao copiar ID FarmBox:", error);
            Alert.alert("Não foi possível copiar", "Tente novamente.");
        }
    };

    const VIEW_MODE_STORAGE_KEY = "@farmbox_card_view_mode";

    useEffect(() => {
        const loadSavedViewMode = async () => {
            try {
                const savedMode = await AsyncStorage.getItem(VIEW_MODE_STORAGE_KEY);

                if (savedMode === "normal" || savedMode === "consolidated") {
                    setViewMode(savedMode);
                }
            } catch (error) {
                console.log("Erro ao carregar viewMode salvo:", error);
            }
        };

        loadSavedViewMode();
    }, []);

    const handleChangeViewMode = async (mode) => {
        try {
            setViewMode(mode);
            await AsyncStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
        } catch (error) {
            console.log("Erro ao salvar viewMode:", error);
        }
    };

    const sumNumber = (v) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
    };

    const formatNumber = (number, decimals = 2) => {
        const n = Number(number || 0);
        return n.toLocaleString("pt-br", {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        });
    };

    const formatNumberProds = (number) => {
        const n = Number(number || 0);
        return n.toLocaleString("pt-br", {
            minimumFractionDigits: 3,
            maximumFractionDigits: 3,
        });
    };

    const slugify = (s = "") =>
        s
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, "_")
            .replace(/[^\w.-]/g, "")
            .replace(/_+/g, "_")
            .replace(/^_+|_+$/g, "");

    const normalizeString = (s = "") =>
        String(s || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim()
            .toLowerCase();

    const normalizeDose = (v) => {
        const n = Number(v || 0);
        return Number.isFinite(n) ? n.toFixed(6) : "0.000000";
    };


    const getApCode = (code) => {
        if (!code) return "-";
        return `AP ${String(code).replace(/AP/gi, "").trim()}`;
    };

    const getAppKind = (app) => {
        const prods = Array.isArray(app?.prods) ? app.prods : [];

        if (prods.length <= 1) return "Operação";

        const semOperacao = prods.filter((p) => (p?.type || "") !== "Operação");

        if (semOperacao.length === 1) return "Sólido";
        return "Líquido";
    };


    const getParcelaVariedade = (parcela) => {
        return (
            parcela?.variedade ||
            parcela?.variedadeNome ||
            parcela?.nomeVariedade ||
            parcela?.cultivar ||
            parcela?.plantationVariety ||
            parcela?.dados?.variedade ||
            null
        );
    };

    const getParcelaDap = (parcela) => {
        const rawDate =
            parcela?.date ||
            parcela?.data_plantio ||
            parcela?.dataPlantio ||
            parcela?.plantioDate ||
            parcela?.dados?.date ||
            null;

        if (!rawDate) return null;

        const plantioDate = new Date(rawDate);

        if (Number.isNaN(plantioDate.getTime())) return null;

        const today = new Date();

        const plantioOnlyDate = new Date(
            plantioDate.getFullYear(),
            plantioDate.getMonth(),
            plantioDate.getDate()
        );

        const todayOnlyDate = new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate()
        );

        const diffMs = todayOnlyDate.getTime() - plantioOnlyDate.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        const dap = diffDays + 1;

        return dap >= 1 ? dap : null;
    };
    const removeDuplicateParcelas = (parcelas = []) => {
        const map = new Map();

        for (const parcela of parcelas) {
            const key =
                parcela?.parcelaId ??
                `${parcela?.parcela || ""}-${parcela?.parcelaAppPlantationId || ""}`;

            if (!map.has(key)) {
                map.set(key, parcela);
            }
        }

        return Array.from(map.values());
    };

    const getCompositionSignature = (app) => {
        const prods = Array.isArray(app?.prods) ? app.prods : [];

        return prods
            .filter((p) => (p?.type || "") !== "Operação")
            .map((p) => ({
                product: normalizeString(p?.product || ""),
                dose: normalizeDose(p?.doseSolicitada),
                unit: normalizeString(p?.unit || ""),
            }))
            .sort((a, b) => a.product.localeCompare(b.product))
            .map((p) => `${p.product}|${p.dose}|${p.unit}`)
            .join(";");
    };

    const buildCardFromAp = (ap) => {
        const areaSolicitada = sumNumber(ap?.areaSolicitada);
        const areaAplicada = sumNumber(ap?.areaAplicada);
        const saldoAreaAplicar =
            ap?.saldoAreaAplicar != null
                ? sumNumber(ap?.saldoAreaAplicar)
                : Math.max(areaSolicitada - areaAplicada, 0);

        const percent =
            areaSolicitada > 0 ? Math.min(areaAplicada / areaSolicitada, 1) : sumNumber(ap?.percent || 0);

        return {
            ...ap,
            cardKey: `normal-${ap?.code}`,
            isConsolidated: false,
            displayCode: ap?.code || "-",
            codes: [ap?.code].filter(Boolean),
            aps: [ap],
            parcelas: Array.isArray(ap?.parcelas) ? ap.parcelas : [],
            areaSolicitada,
            areaAplicada,
            saldoAreaAplicar,
            percent,
            signature: getCompositionSignature(ap),
        };
    };

    const buildConsolidatedCards = (apps = []) => {
        const groups = new Map();

        for (const ap of apps) {
            const signature = getCompositionSignature(ap);

            const groupKey = [
                normalizeString(ap?.farmName || ""),
                normalizeString(ap?.ciclo || ""),
                signature,
            ].join("::");

            if (!groups.has(groupKey)) {
                const baseAreaSolicitada = sumNumber(ap?.areaSolicitada);
                const baseAreaAplicada = sumNumber(ap?.areaAplicada);
                const baseSaldo =
                    ap?.saldoAreaAplicar != null
                        ? sumNumber(ap?.saldoAreaAplicar)
                        : Math.max(baseAreaSolicitada - baseAreaAplicada, 0);

                groups.set(groupKey, {
                    ...ap,
                    cardKey: `group-${groupKey}`,
                    groupKey,
                    isConsolidated: true,
                    displayCode: "Consolidado de Aplicações",
                    codes: ap?.code ? [ap.code] : [],
                    aps: [ap],
                    parcelas: Array.isArray(ap?.parcelas) ? [...ap.parcelas] : [],
                    areaSolicitada: baseAreaSolicitada,
                    areaAplicada: baseAreaAplicada,
                    saldoAreaAplicar: baseSaldo,
                    signature,
                });
            } else {
                const existing = groups.get(groupKey);

                existing.codes = Array.from(new Set([...existing.codes, ap?.code].filter(Boolean)));
                existing.aps.push(ap);
                existing.parcelas = [...existing.parcelas, ...(ap?.parcelas || [])];

                const areaSolicitada = sumNumber(ap?.areaSolicitada);
                const areaAplicada = sumNumber(ap?.areaAplicada);
                const saldo =
                    ap?.saldoAreaAplicar != null
                        ? sumNumber(ap?.saldoAreaAplicar)
                        : Math.max(areaSolicitada - areaAplicada, 0);

                existing.areaSolicitada += areaSolicitada;
                existing.areaAplicada += areaAplicada;
                existing.saldoAreaAplicar += saldo;
            }
        }

        return Array.from(groups.values()).map((group) => {
            const percent =
                group.areaSolicitada > 0
                    ? Math.min(group.areaAplicada / group.areaSolicitada, 1)
                    : 0;

            return {
                ...group,
                parcelas: removeDuplicateParcelas(group.parcelas),
                totalAps: group.codes.length,
                displayCode: `${group.codes.length} AP${group.codes.length > 1 ? "s" : ""}`,
                percent,
            };
        });
    };

    const visibleBaseData = useMemo(() => {
        const raw = Array.isArray(farmData) ? farmData : [];

        if (viewMode === "consolidated") {
            return buildConsolidatedCards(raw);
        }

        return raw.map(buildCardFromAp);
    }, [farmData, viewMode]);

    const buildGroupTotals = (apps = []) => {
        const totals = {
            count: apps.length,
            areaSolicitada: 0,
            areaAplicada: 0,
            saldoAreaAplicar: 0,
            products: {},
        };

        for (const app of apps) {
            totals.areaSolicitada += sumNumber(app?.areaSolicitada);
            totals.areaAplicada += sumNumber(app?.areaAplicada);

            const saldo =
                app?.saldoAreaAplicar != null
                    ? sumNumber(app?.saldoAreaAplicar)
                    : Math.max(sumNumber(app?.areaSolicitada) - sumNumber(app?.areaAplicada), 0);

            totals.saldoAreaAplicar += saldo;

            const prods = Array.isArray(app?.prods) ? app.prods : [];
            for (const p of prods) {
                if ((p?.type || "") === "Operação") continue;

                const key = `${p?.product || "?"}|${p?.unit || ""}`;
                if (!totals.products[key]) {
                    totals.products[key] = {
                        product: p?.product || "?",
                        unit: p?.unit || "",
                        total: 0,
                    };
                }

                totals.products[key].total += sumNumber(p?.quantidadeSolicitada);
            }
        }

        const productsArr = Object.values(totals.products).sort((a, b) =>
            String(a.product).localeCompare(String(b.product))
        );

        return { ...totals, productsArr };
    };

    const sections = useMemo(() => {
        const base = Array.isArray(visibleBaseData) ? visibleBaseData : [];

        const groups = {
            Operação: [],
            Sólido: [],
            Líquido: [],
        };

        for (const app of base) {
            const kind = getAppKind(app);
            groups[kind].push(app);
        }

        const order = ["Operação", "Sólido", "Líquido"];

        return order
            .map((title) => {
                const items = groups[title] || [];
                return {
                    title,
                    items,
                    totals: buildGroupTotals(items),
                };
            })
            .filter((sec) => sec.items.length > 0);
    }, [visibleBaseData]);

    const escapeFarmName = (s = "") =>
        s.replace("Fazenda", "Projeto").replace("Cacique", "Cacíque");

    const buildParcelasPayload = (cardData, mapPlotDataParam, selectedParcelasParam = [], ciclo) => {
        const selected = Array.isArray(selectedParcelasParam) ? selectedParcelasParam : [];

        const filteredParcelas =
            selected.length > 0
                ? selected.map((p) => p.parcela)
                : (cardData?.parcelas ?? []).map((p) => p.parcela);

        const farmName = cardData?.farmName ?? "";
        const dataFromMap = newMapArr(mapPlotDataParam ?? []);

        const filteredFarmArr = dataFromMap
            .filter(
                (d) =>
                    (d?.farmName ?? "")
                        .replace("Fazenda", "Projeto")
                        .replace("Cacique", "Cacíque") === escapeFarmName(farmName)
            )
            .filter((parc) => parc?.ciclo === ciclo && filteredParcelas.includes(parc?.talhao));

        const parcelas = filteredFarmArr.map((item) => {
            const coords = (item?.coords ?? []).map((p) => ({
                latitude: Number(p.latitude),
                longitude: Number(p.longitude),
            }));

            return {
                talhao: item?.talhao ?? "Sem nome",
                ciclo: item?.ciclo ?? "Sem Ciclo",
                coords,
            };
        });

        return { parcelas };
    };

    const getShareFarmTitle = (farmName = "") => {
        const clean = String(farmName || farm || "")
            .replace(/^Fazenda\s*/i, "")
            .trim();

        return clean ? `${clean}` : "";
    };

    const getShareFileName = (farmName = "", code = "") => {
        const farmPart = slugify(
            String(farmName || farm || "fazenda")
                .replace(/^Fazenda\s*/i, "")
                .trim()
        );

        const codePart = slugify(String(code || ""));
        return codePart ? `${farmPart}-${codePart}.png` : `${farmPart}.png`;
    };

    const getDisplayCodeForShare = (cardData) => {
        if (!cardData?.isConsolidated) return cardData?.code || "";
        return `${cardData?.codes?.length || 0}_aps`;
    };

    const iconDict = [
        { cultura: "Feijão", icon: require("../../utils/assets/icons/beans2.png"), alt: "feijao" },
        { cultura: "Arroz", icon: require("../../utils/assets/icons/rice.png"), alt: "arroz" },
        { cultura: "Soja", icon: require("../../utils/assets/icons/soy.png"), alt: "soja" },
        { cultura: undefined, icon: require("../../utils/assets/icons/question.png"), alt: "?" },
    ];

    const filteredIcon = (data) => {
        const filtered = iconDict.filter((dictD) => dictD.cultura === data);

        if (filtered.length > 0) {
            return filtered[0].icon;
        }
        return iconDict[3].icon;
    };

    const getCultura = (dataCult) => filteredIcon(dataCult.cultura);

    const handleExprotData = async () => {
        if (isOpeningExport) {
            return;
        }

        try {
            setIsOpeningExport(true);

            await Haptics.impactAsync(
                Haptics.ImpactFeedbackStyle.Heavy
            );

            const allApps = (
                Array.isArray(data)
                    ? data
                    : []
            ).filter(
                (application) =>
                    application?.farmName === farm
            );

            if (!allApps.length) {
                Alert.alert(
                    "Atenção",
                    "Não foram encontradas aplicações para esta fazenda."
                );

                setIsOpeningExport(false);
                return;
            }

            const farmId =
                allApps.find(
                    (application) =>
                        application?.farmId !== null &&
                        application?.farmId !== undefined
                )?.farmId;

            if (
                farmId === null ||
                farmId === undefined
            ) {
                Alert.alert(
                    "Atenção",
                    "Não foi possível identificar o ID FarmBox da fazenda."
                );

                setIsOpeningExport(false);
                return;
            }

            /*
             * Mantém a relação entre as APs e suas parcelas.
             *
             * Esse índice não limita os polígonos retornados.
             * Ele permanece disponível para relacionamentos,
             * filtros ou destaques posteriores.
             */
            const apParcelasIndex =
                allApps.map(
                    (application) => ({
                        idAp:
                            application?.idAp,

                        code:
                            application?.code,

                        farmId:
                            application?.farmId,

                        farmName:
                            application?.farmName,

                        safra:
                            application?.safra,

                        ciclo:
                            application?.ciclo,

                        parcelasIds:
                            (
                                Array.isArray(
                                    application?.parcelas
                                )
                                    ? application.parcelas
                                    : []
                            )
                                .map(
                                    (parcel) =>
                                        parcel
                                            ?.parcelaAppPlantationId
                                )
                                .filter(
                                    (id) =>
                                        id !== null &&
                                        id !== undefined &&
                                        id !== ""
                                ),
                    })
                );

            /*
             * Monta as combinações únicas de safra e ciclo
             * existentes nas APs abertas dessa fazenda.
             *
             * Exemplo:
             *
             * [
             *   {
             *     safra: "2026/2027",
             *     ciclo: 1
             *   }
             * ]
             */
            const contextsMap =
                new Map();

            for (
                const application of allApps
            ) {
                const safra = String(
                    application?.safra ?? ""
                ).trim();

                const cicloRaw =
                    application?.ciclo;

                const ciclo = String(
                    cicloRaw ?? ""
                ).trim();

                if (!safra || !ciclo) {
                    continue;
                }

                const key =
                    `${safra}||${ciclo}`;

                if (!contextsMap.has(key)) {
                    contextsMap.set(
                        key,
                        {
                            safra,

                            /*
                             * Mantém número quando possível.
                             * O backend também normaliza.
                             */
                            ciclo:
                                Number.isFinite(
                                    Number(ciclo)
                                )
                                    ? Number(ciclo)
                                    : ciclo,
                        }
                    );
                }
            }

            const pairs =
                Array.from(
                    contextsMap.values()
                );

            if (!pairs.length) {
                Alert.alert(
                    "Atenção",
                    "Não foi possível identificar a safra e o ciclo das aplicações."
                );

                setIsOpeningExport(false);
                return;
            }

            const params = {
                farm:
                    farmId,

                farmName:
                    allApps[0]?.farmName ??
                    farm,

                /*
                 * Solicita todos os plantios da fazenda
                 * para cada combinação de safra e ciclo.
                 */
                mode:
                    "farmSafraCiclo",

                pairs,

                /*
                 * Apenas metadado de relacionamento.
                 * Não será utilizado para limitar a consulta.
                 */
                apParcelasIndex,
            };

            console.log(
                "[EXPORT PDF PARAMS]",
                JSON.stringify(
                    params,
                    null,
                    2
                )
            );

            /*
             * Abre a tela primeiro, permitindo que ela
             * exiba o estado de carregamento enquanto
             * o thunk consulta o mapa.
             */
            navigation.navigate(
                "FarmBoxFilterApps",
                {
                    data,
                    farm,
                    viewMode,
                }
            );

            InteractionManager
                .runAfterInteractions(
                    async () => {
                        try {
                            await dispatch(
                                exportPdf(params)
                            ).unwrap();
                        } catch (error) {
                            console.log(
                                "Erro ao carregar mapa para o PDF:",
                                error
                            );

                            Alert.alert(
                                "Erro",
                                "Não foi possível carregar os mapas para a impressão."
                            );
                        } finally {
                            setIsOpeningExport(
                                false
                            );
                        }
                    }
                );
        } catch (error) {
            console.log(
                "Erro ao abrir exportação:",
                error
            );

            setIsOpeningExport(false);

            Alert.alert(
                "Erro",
                "Não foi possível abrir a exportação."
            );
        }
    };

    useLayoutEffect(() => {
        navigation.setOptions({
            title: farm ? farm.replace("Fazenda ", "") : "Aplicações",
            headerShadowVisible: false,
            headerRight: ({ tintColor }) => (
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                    {isOpeningExport ? (
                        <View
                            style={{
                                width: 42,
                                height: 42,
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <ActivityIndicator size="small" color={tintColor} />
                        </View>
                    ) : (
                        <IconButton
                            type="awesome"
                            icon="print"
                            color={tintColor}
                            size={22}
                            onPress={handleExprotData}
                        />
                    )}
                </View>
            ),
            headerLeft: (props) => (
                <HeaderBackButton
                    {...props}
                    label="Voltar"
                    onPress={() => {
                        if (navigation.canGoBack()) {
                            navigation.goBack();
                            return;
                        }

                        navigation.popToTop();
                    }}
                />
            ),
        });
    }, [navigation, farm, viewMode, farmData, isOpeningExport]);


    const handleShareCard = async (cardData) => {
        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

            const shotRef = cardShareRefs.current[cardData.cardKey];
            if (!shotRef) {
                Alert.alert("Atenção", "Não foi possível gerar a imagem deste card.");
                return;
            }

            await wait(180);

            const tmpUri = await captureRef(shotRef, {
                format: "png",
                quality: 1,
                result: "tmpfile",
            });

            const canShare = await Sharing.isAvailableAsync();
            if (!canShare) {
                Alert.alert("Atenção", "O compartilhamento não está disponível neste dispositivo.");
                return;
            }

            const fileName = getShareFileName(
                cardData?.farmName,
                getDisplayCodeForShare(cardData)
            );

            const basePath = FileSystem.cacheDirectory || FileSystem.documentDirectory;
            const finalUri = `${basePath}${fileName}`;

            await FileSystem.copyAsync({
                from: tmpUri,
                to: finalUri,
            });

            await Sharing.shareAsync(finalUri, {
                mimeType: "image/png",
                dialogTitle: "Compartilhar card",
                UTI: "public.png",
            });
        } catch (error) {
            console.log("Erro ao compartilhar card:", error);
            Alert.alert("Erro", "Não foi possível compartilhar o card.");
        }
    };

    const handleOpen = (cardKey) => {
        setShowAps((prev) => {
            const next = { ...prev };
            const isOpen = !!next[cardKey];

            if (isOpen) {
                delete next[cardKey];
                if (activeCardKey === cardKey) setActiveCardKey(null);
            } else {
                next[cardKey] = true;
                setActiveCardKey(cardKey);
            }

            return next;
        });

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    };

    const handleSelected = (cardKey, parcela) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        setSelectedParcelasByCardKey((prev) => {
            const current = prev[cardKey] || [];
            const exists = current.some((item) => item.parcelaId === parcela.parcelaId);

            const nextArr = exists
                ? current.filter((item) => item.parcelaId !== parcela.parcelaId)
                : [...current, parcela];

            return { ...prev, [cardKey]: nextArr };
        });
    };

    useEffect(() => {
        if (!activeCardKey) {
            setTotalSelected(0);
            return;
        }

        const selected = getSelectedFor(activeCardKey);
        const total =
            selected.length > 0
                ? selected.reduce(
                    (acc, curr) => acc + (sumNumber(curr.areaSolicitada) - sumNumber(curr.areaAplicada)),
                    0
                )
                : 0;

        setTotalSelected(total);
    }, [activeCardKey, selectedParcelasByCardKey]);

    const handleMapApi = (cardData) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        navigation.navigate("MapsCreenStack", {
            data: cardData,
            selectedParcelas: getSelectedFor(cardData.cardKey),
            apsCodes: cardData?.codes || [],
        });
    };

    const handleKmlGenerator = async (cardData, mapPlotDataParam) => {
        if (isSharing) return;
        setIsSharing(true);

        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

            const ciclo = cardData?.ciclo;
            const filteredMapPlotData = mapPlotDataParam.filter(
                (p) => Number(p.ciclo__ciclo) === Number(ciclo)
            );

            const selected = getSelectedFor(cardData.cardKey);

            await exportPolygonsAsKML(cardData, filteredMapPlotData, selected);
        } finally {
            setIsSharing(false);
        }
    };

    const handleKmlGeneratorUnique = async (
        cardData,
        mapPlotDataParam,
        selectedParcelasParam,
        { tol_m = 35.0, corridor_width_m = 1.0 } = {}
    ) => {
        if (isSharingUnique) return;
        setIsSharingUnique(true);

        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

            const selected =
                Array.isArray(selectedParcelasParam) && selectedParcelasParam.length >= 0
                    ? selectedParcelasParam
                    : getSelectedFor(cardData.cardKey);

            const ciclo_selected = cardData?.ciclo;
            const { parcelas } = buildParcelasPayload(
                cardData,
                mapPlotDataParam,
                selected,
                ciclo_selected
            );

            if (!parcelas?.length) {
                Alert.alert("Atenção", "Não há polígonos para exportar.");
                return;
            }

            const body = {
                farmName: cardData?.farmName ?? "",
                parcelas,
                tol_m,
                corridor_width_m,
                apsCodes: cardData?.codes || [],
            };

            const kmlText = await postKmlMerge(LINK, EXPO_PUBLIC_REACT_APP_DJANGO_TOKEN, body);

            const basePath = FileSystem.cacheDirectory || FileSystem.documentDirectory;
            const farmName = (cardData?.farmName || "fazenda").replace("Fazenda ", "Projeto ");
            const farmSlug = slugify(farmName);
            const codeSlug = slugify(
                cardData?.isConsolidated
                    ? `${cardData?.codes?.length || 0}_aps`
                    : String(cardData?.code || "")
            );
            const filename = codeSlug ? `${farmSlug}_${codeSlug}.kml` : `${farmSlug}.kml`;
            const filePath = `${basePath}${filename}`;

            await FileSystem.writeAsStringAsync(filePath, kmlText, {
                encoding: FileSystem.EncodingType.UTF8,
            });

            const mimeType =
                Platform.OS === "android"
                    ? "application/xml"
                    : "application/vnd.google-earth.kml+xml";

            if (await Sharing.isAvailableAsync()) {
                try {
                    await Sharing.shareAsync(filePath, {
                        mimeType,
                        UTI: "com.google.earth.kml+xml",
                        dialogTitle: "Compartilhar arquivo KML",
                    });
                } catch (error) {
                    if (error?.code === "ERR_SHARING_IN_PROGRESS") {
                        Alert.alert("Aguarde", "Já existe um compartilhamento em andamento.");
                    } else {
                        throw error;
                    }
                }
            } else {
                Alert.alert("KML gerado", `Arquivo salvo em: ${filePath}`);
            }
        } catch (err) {
            console.log("KML merge error:", err);
            Alert.alert("Erro", String(err?.message || err));
        } finally {
            setIsSharingUnique(false);
        }
    };

    const handleFilterProps = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        dispatch(setFarmboxSearchBar(!showSearch));
        dispatch(setFarmboxSearchQuery(""));
    };

    useEffect(() => {
        function removeAccents(str) {
            return str?.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        }

        const filterApplications = (applications) => {
            if (searchQuery?.trim() === "") {
                if (data) {
                    const newData = data.filter((farmName) => farmName.farmName === farm);
                    setfarmData(newData);
                }
            } else {
                const filteredData = applications
                    .filter((farmName) => farmName.farmName === farm)
                    .filter((data) =>
                        data.prods.some((prod) => {
                            const normalizedQuery = removeAccents(searchQuery)?.toLowerCase();
                            const normalizedQueryNumbers = normalizeOnlyNumbers(searchQuery);

                            const productMatches = removeAccents(prod.product)
                                ?.toLowerCase()
                                .includes(normalizedQuery);

                            const farmboxId = formatFarmboxId(getProductFarmboxId(prod));
                            const farmboxIdNumbers = normalizeOnlyNumbers(farmboxId);

                            const farmboxMatches =
                                farmboxId.toLowerCase().includes(normalizedQuery) ||
                                (normalizedQueryNumbers &&
                                    farmboxIdNumbers.includes(normalizedQueryNumbers));

                            return productMatches || farmboxMatches;
                        })
                    );

                setfarmData(filteredData);
            }
        };

        filterApplications(data);
    }, [searchQuery, data]);

    const getData = async () => {
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
                const newData = payload.data.filter((farmName) => farmName.farmName === farm);
                setfarmData(newData);
            }
        } catch (error) {
            console.log("erro ao pegar os dados", error);
            Alert.alert(`Problema na API', 'possível erro de internet para pegar os dados ${error}`);
        } finally {
            setIsLoading(false);
        }
    };

    useScrollToTop(ref);
    useScrollToTop(
        useRef({
            scrollToTop: () => ref?.current?.scrollTo({ y: 0 }),
        })
    );

    return (
        <>
            <SafeAreaView style={{ flex: 1 }} edges={[""]}>
                {showSearch && (
                    <SearchBar
                        placeholder="Selecione um produto, operação ou ID FarmBox..."
                        value={searchQuery}
                        onChangeText={(e) => dispatch(setFarmboxSearchQuery(e))}
                    />
                )}

                <View style={styles.modeSwitchWrap}>
                    <Pressable
                        style={[
                            styles.modeButton,
                            viewMode === "normal" && styles.modeButtonActive,
                        ]}
                        onPress={() => handleChangeViewMode("normal")}
                    >
                        <Text
                            style={[
                                styles.modeButtonText,
                                viewMode === "normal" && styles.modeButtonTextActive,
                            ]}
                        >
                            APs
                        </Text>
                    </Pressable>

                    <Pressable
                        style={[
                            styles.modeButton,
                            viewMode === "consolidated" && styles.modeButtonActive,
                        ]}
                        onPress={() => handleChangeViewMode("consolidated")}
                    >
                        <Text
                            style={[
                                styles.modeButtonText,
                                viewMode === "consolidated" && styles.modeButtonTextActive,
                            ]}
                        >
                            Consolidado
                        </Text>
                    </Pressable>
                </View>

                {isLoading && (
                    <View style={styles.customRefreshContainer}>
                        <ActivityIndicator size="large" color="#1E90FF" />
                        <Text style={styles.refreshText}>Atualizando...</Text>
                    </View>
                )}

                <SectionList
                    ref={ref}
                    sections={sections.map((s) => ({
                        title: s.title,
                        totals: s.totals,
                        data: s.items,
                    }))}
                    keyExtractor={(item, index) => item?.cardKey || `${index}`}
                    stickySectionHeadersEnabled
                    contentInsetAdjustmentBehavior="automatic"
                    style={{ marginBottom: Platform.OS === "android" ? 20 : 0 }}
                    refreshControl={
                        <RefreshControl
                            refreshing={isLoading}
                            onRefresh={getData}
                            colors={["#9Bd35A", "#689F38"]}
                            tintColor={"#1E90FF"}
                        />
                    }
                    contentContainerStyle={{
                        paddingBottom: CUSTOM_TAB_BAR_TOTAL_HEIGHT + (showSearch ? 40 : -15),
                    }}
                    renderSectionHeader={({ section }) => (
                        <View style={styles.sectionStickyRow}>
                            <View
                                style={{
                                    flexDirection: "row",
                                    justifyContent: "space-between",
                                    alignItems: "baseline",
                                }}
                            >
                                <Text style={styles.sectionTitle}>{section.title}</Text>
                                <Text style={styles.sectionSubtitle}>
                                    {section.totals.count} {viewMode === "consolidated" ? "grupos" : "aplicações"}
                                </Text>
                            </View>
                        </View>
                    )}
                    renderItem={({ item: cardData, index, section }) => {
                        const selectedHere = getSelectedFor(cardData.cardKey);

                        const totals = selectedHere.reduce(
                            (acc, curr) => {
                                const solic = Number(curr.areaSolicitada || 0);
                                const apl = Number(curr.areaAplicada || 0);

                                acc.total += solic;
                                acc.aplicado += apl;
                                acc.aberto += Math.max(solic - apl, 0);
                                return acc;
                            },
                            { aberto: 0, aplicado: 0, total: 0 }
                        );

                        const abertoHere = totals.aberto;
                        const aplicadoHere = totals.aplicado;
                        const totalHere = totals.total;

                        const isLastSection = sections?.[sections.length - 1]?.title === section.title;
                        const isLastItem =
                            isLastSection && index === (section?.data?.length || 0) - 1;

                        // console.log('cardData', cardData)
                        return (
                            <Animated.View
                                entering={FadeInRight.duration(300)}
                                exiting={FadeOut.duration(300)}
                                layout={Layout.springify()}
                            >
                                {index === 0 && (
                                    <View style={styles.sectionSummary}>
                                        <View style={styles.sectionKpis}>
                                            <View style={styles.sectionKpiCard}>
                                                <Text style={styles.sectionKpiLabel}>Área solicitada</Text>
                                                <Text style={styles.sectionKpiValue}>
                                                    {formatNumber(section.totals.areaSolicitada, 0)} ha
                                                </Text>
                                            </View>
                                            <View style={styles.sectionKpiCard}>
                                                <Text style={styles.sectionKpiLabel}>Aplicado</Text>
                                                <Text style={styles.sectionKpiValue}>
                                                    {formatNumber(section.totals.areaAplicada, 0)} ha
                                                </Text>
                                            </View>
                                            <View style={styles.sectionKpiCard}>
                                                <Text style={styles.sectionKpiLabel}>Saldo</Text>
                                                <Text style={styles.sectionKpiValue}>
                                                    {formatNumber(section.totals.saldoAreaAplicar, 0)} ha
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                )}

                                <ViewShot
                                    ref={(shotRef) => {
                                        if (shotRef) cardShareRefs.current[cardData.cardKey] = shotRef;
                                    }}
                                    options={{
                                        format: "png",
                                        quality: 1,
                                        result: "tmpfile",
                                    }}
                                >
                                    <View style={styles.captureInner}>
                                        <Pressable
                                            collapsable={false}
                                            style={[
                                                styles.mainContainerAll,
                                                {
                                                    marginTop: index !== 0 && 10,
                                                    backgroundColor: !showAps[cardData.cardKey]
                                                        ? backgroundColorCard
                                                        : Colors.secondary[200],
                                                    opacity: !showAps[cardData.cardKey] ? 0.8 : 1,
                                                    marginBottom: isLastItem ? 80 : 0,
                                                },
                                            ]}
                                        >
                                            <View
                                                style={[
                                                    styles.infoContainer,
                                                    {
                                                        backgroundColor: showAps[cardData.cardKey]
                                                            ? Colors.primary500
                                                            : Colors.primary800,
                                                    },
                                                ]}
                                            >
                                                <Text style={{ color: "whitesmoke", fontWeight: "bold" }}>
                                                    Área:{" "}
                                                    <Text style={{ color: Colors.secondary[300] }}>
                                                        {formatNumber(cardData.areaSolicitada)}
                                                    </Text>
                                                </Text>

                                                <Text style={{ color: "whitesmoke", fontWeight: "bold" }}>
                                                    Aplicado:{" "}
                                                    <Text style={{ color: Colors.secondary[300] }}>
                                                        {formatNumber(cardData.areaAplicada)}
                                                    </Text>
                                                </Text>

                                                <Text style={{ color: "whitesmoke", fontWeight: "bold" }}>
                                                    Saldo:{" "}
                                                    <Text style={{ color: Colors.secondary[300] }}>
                                                        {formatNumber(cardData.saldoAreaAplicar)}
                                                    </Text>
                                                </Text>
                                            </View>

                                            <Pressable
                                                style={({ pressed }) => [
                                                    styles.mainContainer,
                                                    pressed && styles.pressed,
                                                    {
                                                        marginTop: indexParent === 0 && 0,
                                                        backgroundColor: !showAps[cardData.cardKey]
                                                            ? "whitesmoke"
                                                            : Colors.secondary[200],
                                                    },
                                                ]}
                                                onPress={() => handleOpen(cardData.cardKey)}
                                            >
                                                <View style={styles.headerContainer}>
                                                    <View>
                                                        <View>
                                                            <Text
                                                                style={[
                                                                    styles.headerTitle,
                                                                    { color: Colors.primary[600] },
                                                                ]}
                                                            >
                                                                {cardData?.isConsolidated
                                                                    ? cardData?.displayCode
                                                                    : getApCode(cardData?.code)}
                                                            </Text>

                                                            {!!cardData?.dateAp && !cardData.isConsolidatedxx && (
                                                                <Text style={styles.headerSubtitle}>
                                                                    {formatDate(cardData?.dateAp)}
                                                                </Text>
                                                            )}
                                                        </View>
                                                    </View>

                                                    <View style={{ alignItems: "center", flex: 1, paddingHorizontal: 8 }}>
                                                        <View
                                                            style={{
                                                                flexDirection: "row",
                                                                alignItems: "center",
                                                                gap: 5,
                                                            }}
                                                        >
                                                            {!cardData.isConsolidated && (
                                                                <Text style={styles.headerTitle}>
                                                                    {cardData.operation}
                                                                </Text>
                                                            )}
                                                            <View style={styles.shadowContainer}>
                                                                <Image
                                                                    source={getCultura(cardData)}
                                                                    style={{
                                                                        width: 20,
                                                                        height: 20,
                                                                        resizeMode: "contain",
                                                                    }}
                                                                />
                                                            </View>
                                                        </View>

                                                        <Text style={styles.headerFarmInline}>
                                                            {getShareFarmTitle(cardData?.farmName)}
                                                        </Text>

                                                        {cardData?.isConsolidated && (
                                                            <Text style={styles.apCodesPreview}>
                                                                {(cardData?.aps || []).map((ap) => ap.code).join(" • ")}
                                                            </Text>
                                                        )}
                                                    </View>

                                                    <View style={styles.progressContainer}>
                                                        <Progress.Pie
                                                            size={30}
                                                            indeterminate={false}
                                                            progress={cardData.percent}
                                                            color={
                                                                cardData.percentColor === "#E4D00A"
                                                                    ? Colors.gold[700]
                                                                    : cardData.percentColor || Colors.primary[500]
                                                            }
                                                        />
                                                    </View>
                                                </View>
                                            </Pressable>



                                            {showAps[cardData.cardKey] && (
                                                <Animated.View
                                                    entering={FadeInUp.duration(50)}
                                                    style={styles.bodyContainer}
                                                >
                                                    <Divider color="whitesmoke" style={{ marginHorizontal: 5, marginVertical: 10 }} />
                                                    <View style={styles.bodyContainer}>
                                                        {cardData?.isConsolidated && (
                                                            <View style={styles.codesContainer}>
                                                                <Text style={styles.codesTitle}>APs consolidadas</Text>

                                                                <View style={styles.codesWrap}>
                                                                    {(cardData?.aps || []).map((ap) => (
                                                                        <View key={ap.code} style={styles.apItemCard}>
                                                                            <Text style={styles.apItemCode}>{ap.code}</Text>
                                                                            <Text style={styles.apItemOperation}>{ap.operation}</Text>
                                                                        </View>
                                                                    ))}
                                                                </View>
                                                            </View>
                                                        )}

                                                        <View style={styles.parcelasContainer}>
                                                            {cardData?.parcelas?.map((parcela) => {
                                                                const uniKey =
                                                                    cardData.cardKey +
                                                                    "-" +
                                                                    (parcela.parcelaId || parcela.parcela);

                                                                const isSelected = selectedHere.some(
                                                                    (f) => f.parcelaId === parcela.parcelaId
                                                                );

                                                                return (
                                                                    <Pressable
                                                                        key={uniKey}
                                                                        style={[
                                                                            styles.parcelasView,
                                                                            isSelected && styles.selectedParcelas,
                                                                            {
                                                                                width: PARCELA_CARD_WIDTH,
                                                                                backgroundColor: parcela.fillColorParce,
                                                                            },
                                                                        ]}
                                                                        onPress={() =>
                                                                            handleSelected(
                                                                                cardData.cardKey,
                                                                                parcela
                                                                            )
                                                                        }
                                                                    >
                                                                        {isSelected && (
                                                                            <View
                                                                                style={styles.selectedOverlay}
                                                                                pointerEvents="none"
                                                                            />
                                                                        )}

                                                                        {(() => {
                                                                            const isLightChip = parcela.fillColorParce === "#E4D00A";
                                                                            const textColor = isLightChip ? "black" : "whitesmoke";
                                                                            const variedade = getParcelaVariedade(parcela);
                                                                            const dap = getParcelaDap(parcela);
                                                                            return (
                                                                                <>
                                                                                    <View style={styles.parcelaMainRow}>
                                                                                        <Text style={[styles.parcelaCodeText, { color: textColor }]} numberOfLines={1}>
                                                                                            {parcela.parcela}
                                                                                        </Text>

                                                                                        <Text style={[styles.parcelaAreaText, { color: textColor }]} numberOfLines={1}>
                                                                                            {formatNumber(parcela.areaSolicitada)}
                                                                                        </Text>
                                                                                    </View>

                                                                                    <View style={styles.parcelaMetaRow}>
                                                                                        <Text
                                                                                            style={[
                                                                                                styles.parcelaVariedadeText,
                                                                                                {
                                                                                                    color: textColor,
                                                                                                    opacity: isLightChip ? 0.68 : 0.82,
                                                                                                },
                                                                                            ]}
                                                                                            numberOfLines={1}
                                                                                        >
                                                                                            {variedade || "—"}
                                                                                        </Text>

                                                                                        {!!dap || dap === 0 ? (
                                                                                            <Text
                                                                                                style={[
                                                                                                    styles.parcelaDapText,
                                                                                                    {
                                                                                                        color: textColor,
                                                                                                        opacity: isLightChip ? 0.72 : 0.9,
                                                                                                    },
                                                                                                ]}
                                                                                                numberOfLines={1}
                                                                                            >
                                                                                                {dap}D
                                                                                            </Text>
                                                                                        ) : null}
                                                                                    </View>
                                                                                </>
                                                                            );
                                                                        })()}
                                                                    </Pressable>
                                                                );
                                                            })}
                                                        </View>

                                                        <Divider width={1} color={"rgba(245,245,245,0.3)"} />

                                                        <View style={styles.produtosContainer}>
                                                            {cardData?.prods
                                                                ?.filter((pro) => pro.type !== "Operação")
                                                                .map((produto, prodIndex) => {
                                                                    const uniKey =
                                                                        cardData.cardKey +
                                                                        "-" +
                                                                        produto.product +
                                                                        "-" +
                                                                        prodIndex;

                                                                    const abertoPadrao = Number(
                                                                        cardData?.saldoAreaAplicar ??
                                                                        (Number(cardData?.areaSolicitada || 0) -
                                                                            Number(cardData?.areaAplicada || 0))
                                                                    );

                                                                    const areaBase =
                                                                        selectedHere.length > 0
                                                                            ? Number(abertoHere || 0)
                                                                            : abertoPadrao;

                                                                    const totalProduto =
                                                                        Number(produto.doseSolicitada || 0) *
                                                                        areaBase;

                                                                    return (
                                                                        <Animated.View
                                                                            entering={FadeInRight.duration(200 + prodIndex * 50)}
                                                                            exiting={FadeOutUp.duration(20)}
                                                                            layout={Layout.springify()}
                                                                            key={uniKey}
                                                                        >
                                                                            <Pressable
                                                                                style={({ pressed }) => [
                                                                                    styles.prodsView,
                                                                                    pressed && styles.productPressed,
                                                                                    expandedProductKeys[uniKey] && styles.prodsViewExpanded,
                                                                                    {
                                                                                        backgroundColor:
                                                                                            produto.colorChip === "rgb(255,255,255,0.1)"
                                                                                                ? "whitesmoke"
                                                                                                : produto.colorChip,
                                                                                    },
                                                                                ]}
                                                                                onPress={() => handleToggleProductId(uniKey)}
                                                                            >
                                                                                <View style={styles.productMainRow}>
                                                                                    <Text
                                                                                        style={[
                                                                                            styles.textProds,
                                                                                            {
                                                                                                color:
                                                                                                    produto.colorChip === "rgb(255,255,255,0.1)"
                                                                                                        ? "#455d7a"
                                                                                                        : "whitesmoke",
                                                                                            },
                                                                                        ]}
                                                                                    >
                                                                                        {formatNumberProds(produto.doseSolicitada)}
                                                                                    </Text>

                                                                                    <Text
                                                                                        style={[
                                                                                            styles.textProdsName,
                                                                                            {
                                                                                                color:
                                                                                                    produto.colorChip === "rgb(255,255,255,0.1)"
                                                                                                        ? "#455d7a"
                                                                                                        : "whitesmoke",
                                                                                            },
                                                                                        ]}
                                                                                        numberOfLines={1}
                                                                                    >
                                                                                        {produto.product}
                                                                                    </Text>

                                                                                    <Text
                                                                                        style={[
                                                                                            styles.totalprods,
                                                                                            {
                                                                                                color:
                                                                                                    produto.colorChip === "rgb(255,255,255,0.1)"
                                                                                                        ? "#455d7a"
                                                                                                        : "whitesmoke",
                                                                                            },
                                                                                        ]}
                                                                                    >
                                                                                        {formatNumber(totalProduto)}
                                                                                    </Text>
                                                                                </View>

                                                                                {expandedProductKeys[uniKey] && (
                                                                                    <Pressable
                                                                                        style={styles.farmboxIdInlinePill}
                                                                                        onLongPress={() =>
                                                                                            handleCopyFarmboxId(formatFarmboxId(getProductFarmboxId(produto)))
                                                                                        }
                                                                                        delayLongPress={260}
                                                                                    >
                                                                                        <Text style={styles.farmboxIdInlineLabel}>ID FarmBox</Text>

                                                                                        <Text style={styles.farmboxIdInlineText}>
                                                                                            {formatFarmboxId(getProductFarmboxId(produto)) || "não informado"}
                                                                                        </Text>

                                                                                        {!!formatFarmboxId(getProductFarmboxId(produto)) && (
                                                                                            <Text style={styles.farmboxIdInlineHint}>segure para copiar</Text>
                                                                                        )}
                                                                                    </Pressable>
                                                                                )}
                                                                            </Pressable>
                                                                        </Animated.View>
                                                                    );
                                                                })}
                                                        </View>

                                                        <View style={styles.footerContainer}>
                                                            {selectedHere.length > 0 && (
                                                                <View style={styles.kpiRow}>
                                                                    <View
                                                                        style={[styles.kpiCard, styles.kpiOpen]}
                                                                    >
                                                                        <Text style={styles.kpiLabel}>Aberto</Text>
                                                                        <Text style={styles.kpiValue}>
                                                                            {abertoHere > 0
                                                                                ? `${formatNumber(abertoHere)} ha`
                                                                                : "-"}
                                                                        </Text>
                                                                    </View>

                                                                    <View
                                                                        style={[
                                                                            styles.kpiCard,
                                                                            styles.kpiApplied,
                                                                        ]}
                                                                    >
                                                                        <Text style={styles.kpiLabel}>
                                                                            Aplicado
                                                                        </Text>
                                                                        <Text style={styles.kpiValue}>
                                                                            {aplicadoHere > 0
                                                                                ? `${formatNumber(aplicadoHere)} ha`
                                                                                : "-"}
                                                                        </Text>
                                                                    </View>

                                                                    <View
                                                                        style={[styles.kpiCard, styles.kpiTotal]}
                                                                    >
                                                                        <Text style={styles.kpiLabel}>Total</Text>
                                                                        <Text style={styles.kpiValue}>
                                                                            {totalHere > 0
                                                                                ? `${formatNumber(totalHere)} ha`
                                                                                : "-"}
                                                                        </Text>
                                                                    </View>
                                                                </View>
                                                            )}

                                                            <View style={styles.buttonRow}>
                                                                <View style={styles.buttonRowLeft}>
                                                                    <Pressable
                                                                        disabled={isSharingUnique}
                                                                        style={({ pressed }) => [
                                                                            styles.mapBtn,
                                                                            pressed && styles.pressed,
                                                                        ]}
                                                                        onPress={() =>
                                                                            handleKmlGeneratorUnique(
                                                                                cardData,
                                                                                mapPlotData,
                                                                                getSelectedFor(cardData.cardKey)
                                                                            )
                                                                        }
                                                                    >
                                                                        {isSharingUnique ? (
                                                                            <ActivityIndicator
                                                                                size={22}
                                                                                color={Colors.primary[500]}
                                                                            />
                                                                        ) : (
                                                                            <FontAwesome5
                                                                                name="layer-group"
                                                                                size={24}
                                                                                color={Colors.primary[500]}
                                                                            />
                                                                        )}
                                                                    </Pressable>

                                                                    <Pressable
                                                                        disabled={isSharing}
                                                                        style={({ pressed }) => [
                                                                            styles.mapBtn,
                                                                            pressed && styles.pressed,
                                                                        ]}
                                                                        onPress={() =>
                                                                            handleKmlGenerator(
                                                                                cardData,
                                                                                mapPlotData
                                                                            )
                                                                        }
                                                                    >
                                                                        {isSharing ? (
                                                                            <ActivityIndicator
                                                                                size={22}
                                                                                color={Colors.primary[500]}
                                                                            />
                                                                        ) : (
                                                                            <FontAwesome5
                                                                                name="object-ungroup"
                                                                                size={24}
                                                                                color={Colors.succes[600]}
                                                                            />
                                                                        )}
                                                                    </Pressable>

                                                                    <Pressable
                                                                        style={({ pressed }) => [
                                                                            styles.mapBtn,
                                                                            pressed && styles.pressed,
                                                                        ]}
                                                                        onPress={() => handleMapApi(cardData)}
                                                                    >
                                                                        <FontAwesome5
                                                                            name="map-marked-alt"
                                                                            size={24}
                                                                            color={Colors.primary[600]}
                                                                        />
                                                                    </Pressable>
                                                                </View>

                                                                {showAps[cardData.cardKey] && (
                                                                    <Pressable
                                                                        style={({ pressed }) => [
                                                                            styles.mapBtn,
                                                                            styles.shareBtn,
                                                                            pressed && styles.pressed,
                                                                        ]}
                                                                        onPress={() => handleShareCard(cardData)}
                                                                    >
                                                                        <FontAwesome5
                                                                            name="share-alt"
                                                                            size={22}
                                                                            color={Colors.primary[600]}
                                                                        />
                                                                    </Pressable>
                                                                )}
                                                            </View>
                                                        </View>
                                                    </View>
                                                </Animated.View>
                                            )}
                                        </Pressable>
                                    </View>
                                </ViewShot>
                            </Animated.View>
                        );
                    }}
                />
            </SafeAreaView>

            <View style={styles.fabContainer}>
                <FAB
                    style={styles.fab}
                    icon={showSearch ? "close" : "magnify"}
                    color="black"
                    onPress={handleFilterProps}
                />
            </View>
        </>
    );
};

export default CardFarmBox;

const styles = StyleSheet.create({
    shadowContainer: {
        shadowColor: "#000",
        shadowOffset: { width: 3, height: 5 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
        elevation: 6,
    },

    fabContainer: {
        position: "absolute",
        right: 20,
        bottom: 0
    },

    fab: {
        position: "absolute",
        right: 30,
        bottom: 90,
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

    modeSwitchWrap: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: 12,
        paddingTop: 10,
        paddingBottom: 10,
        // backgroundColor: "rgba(255,255,255,0.85)",
        backgroundColor: Colors.primary[600]
    },

    modeButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.2)",
        backgroundColor: "transparent", // 🔥 importante
        alignItems: "center",
        justifyContent: "center",
    },
    modeButtonActive: {
        backgroundColor: Colors.succes[500],
        borderColor: Colors.succes[100],
        elevation: 4,
    },

    modeButtonText: {
        fontSize: 13,
        fontWeight: "800",
        color: "rgba(255,255,255,0.6)", // 🔥 muda isso
    },
    modeButtonTextActive: {
        color: Colors.primary[100],
    },

    selectedParcelas: {
        borderWidth: 2,
        borderColor: "blue",
        shadowColor: "#000",
        shadowOpacity: 0.25,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: 3 },
        elevation: 6,
    },

    mainContainer: {
        backgroundColor: Colors.secondary[200],
        marginTop: 30,
    },

    mainContainerAll: {
        backgroundColor: Colors.secondary[200],
        paddingBottom: 5,
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
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 5,
    },

    headerTitle: {
        fontWeight: "900",
        marginLeft: 8
    },

    dateTile: {
        fontSize: 8,
    },

    progressContainer: {
        marginRight: 10,
    },

    bodyContainer: {},

    codesContainer: {
        paddingHorizontal: 10,
        marginTop: 6,
        marginBottom: 4,
    },

    codesTitle: {
        fontSize: 11,
        fontWeight: "800",
        color: Colors.primary[800],
        marginBottom: 6,
    },

    codesWrap: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
    },

    codeChip: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 999,
        backgroundColor: "rgba(30,144,255,0.12)",
        borderWidth: 1,
        borderColor: "rgba(30,144,255,0.22)",
    },

    codeChipText: {
        fontSize: 11,
        fontWeight: "700",
        color: Colors.primary[700],
    },

    apCodesPreview: {
        marginTop: 2,
        textAlign: "center",
        fontSize: 9,
        fontWeight: "700",
        color: "rgba(0,0,0,0.55)",
    },

    parcelasContainer: {
        marginTop: 6,
        gap: 5,
        flexDirection: "row",
        paddingHorizontal: 4,
        flexWrap: "wrap",
        marginBottom: 10,
        justifyContent: "flex-start",
    },

    parcelasView: {
        minHeight: 44,
        borderRadius: 8,
        paddingHorizontal: 4,
        paddingVertical: 5,
        backgroundColor: "green",
        justifyContent: "center",
    },

    parcelaMainRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 3,
    },

    parcelaCodeText: {
        fontSize: 11,
        fontWeight: "900",
        flexShrink: 1,
    },

    parcelaAreaText: {
        fontSize: 10,
        fontWeight: "900",
        marginLeft: "auto",
    },

    parcelaVariedadeText: {
        marginTop: 2,
        fontSize: 7.5,
        fontWeight: "800",
        letterSpacing: -0.2,
    },

    infoContainer: {
        flex: 1,
        backgroundColor: Colors.primary800,
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 10,
        paddingVertical: 7,
        paddingHorizontal: 15,
    },

    produtosContainer: {
        justifyContent: "center",
        alignItems: "center",
        gap: 5,
        marginTop: 10,
    },

    prodsView: {
        width: 300,
        backgroundColor: "blue",
        borderRadius: 6,
        paddingVertical: 3,
        paddingHorizontal: 8,
    },

    textProds: {
        marginLeft: 10,
        color: "whitesmoke",
        fontWeight: "bold",
    },

    totalprods: {
        textAlign: "right",
        marginRight: 10,
        marginLeft: "auto",
        color: "whitesmoke",
        fontWeight: "bold",
    },

    textProdsName: {
        color: "whitesmoke",
        fontWeight: "bold",
    },

    pressed: {
        opacity: 0.3,
    },

    selectedOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: Colors.primary[902],
        opacity: 0.48,
        borderRadius: 6,
    },

    totalSelected: {
        marginLeft: 15,
        flex: 1,
        marginRight: 8,
    },

    kpiLabel: {
        fontSize: 11,
        color: Colors.secondary[700],
        fontWeight: "700",
        marginBottom: 2,
    },

    kpiValue: {
        fontSize: 13,
        color: Colors.primary[900],
        fontWeight: "800",
    },

    kpiOpen: {
        backgroundColor: Colors.gold[100],
        borderColor: Colors.gold[400],
    },

    kpiApplied: {
        backgroundColor: Colors.succes[100],
        borderColor: Colors.succes[400],
    },

    kpiTotal: {
        backgroundColor: Colors.primary[100],
        borderColor: Colors.primary[300],
    },

    footerContainer: {
        flexDirection: "column",
        gap: 10,
        marginBottom: 10,
    },

    kpiRow: {
        flexDirection: "row",
        gap: 8,
        paddingHorizontal: 12,
        marginTop: 12,
    },

    kpiCard: {
        flexGrow: 1,
        flexBasis: 0,
        borderRadius: 10,
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderWidth: 1,
    },

    sectionTitle: {
        fontSize: 14,
        fontWeight: "800",
        color: Colors.primary[100],
    },

    sectionSubtitle: {
        fontSize: 11,
        fontWeight: "700",
        color: Colors.secondary[100],
    },

    sectionKpis: {
        flexDirection: "row",
        gap: 8,
        marginTop: 10,
    },

    sectionKpiCard: {
        flexGrow: 1,
        flexBasis: 0,
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.10)",
        backgroundColor: "rgba(255,255,255,0.65)",
    },

    sectionKpiLabel: {
        fontSize: 10,
        fontWeight: "800",
        color: Colors.secondary[700],
        marginBottom: 2,
    },

    sectionKpiValue: {
        fontSize: 12,
        fontWeight: "900",
        color: Colors.primary[900],
    },

    sectionStickyRow: {
        paddingHorizontal: 12,
        paddingTop: 8,
        paddingBottom: 8,
        backgroundColor: Colors.primary[700],
        borderBottomWidth: 1,
        borderColor: "rgba(0,0,0,0.08)",
        zIndex: 20,
        elevation: 20,
    },

    sectionSummary: {
        paddingHorizontal: 12,
        paddingBottom: 10,
        backgroundColor: Colors.primary[902],
        borderBottomWidth: 1,
        borderColor: "rgba(0,0,0,0.06)",
    },

    buttonRow: {
        marginTop: 14,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        paddingVertical: 10,
        paddingHorizontal: 10,
        borderRadius: 10,
    },

    buttonRowLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },

    mapBtn: {
        width: 46,
        height: 46,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(255,255,255,0.3)",
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.06)",
    },

    shareBtn: {
        marginLeft: 12,
    },

    headerFarmInline: {
        marginTop: 2,
        textAlign: "center",
        justifyContent: "center",
        fontSize: 10,
        fontWeight: "900",
        color: "rgba(0,0,0,0.55)",
    },

    customRefreshContainer: {
        paddingVertical: 20,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(255,255,255,0.7)",
    },

    refreshText: {
        marginTop: 8,
        fontSize: 12,
        fontWeight: "600",
        color: "#1E90FF",
    },
    apItemCard: {
        minWidth: 110,
        maxWidth: "48%",
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 10,
        backgroundColor: "rgba(30,144,255,0.10)",
        borderWidth: 1,
        borderColor: "rgba(30,144,255,0.20)",
    },

    apItemCode: {
        fontSize: 12,
        fontWeight: "800",
        color: Colors.primary[700],
        marginBottom: 2,
    },

    apItemOperation: {
        fontSize: 11,
        fontWeight: "600",
        color: "rgba(0,0,0,0.65)",
    },
    headerSubtitle: {
        fontSize: 9,
        color: '#6B7280',
        marginTop: 2,
        fontWeight: '900',
        paddingLeft: 8
    },

    parcelaMetaRow: {
        marginTop: 2,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 4,
    },

    parcelaVariedadeText: {
        fontSize: 7.5,
        fontWeight: "800",
        letterSpacing: -0.2,
        flex: 1,
    },

    parcelaDapText: {
        fontSize: 7.5,
        fontWeight: "900",
        marginLeft: 3,
    },
    productPressed: {
        opacity: 0.78,
    },

    prodsViewExpanded: {
        paddingBottom: 6,
    },

    productMainRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },

    farmboxIdInlinePill: {
        marginTop: 4,
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 999,
        backgroundColor: "rgba(255,255,255,0.22)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.26)",
    },

    farmboxIdInlineLabel: {
        color: "rgba(255,255,255,0.72)",
        fontSize: 8.5,
        fontWeight: "950",
        letterSpacing: 0.3,
    },

    farmboxIdInlineText: {
        color: "#FFFFFF",
        fontSize: 9.5,
        fontWeight: "bold",
        letterSpacing: 0.2,
    },

    farmboxIdInlineHint: {
        color: "rgba(255,255,255,0.62)",
        fontSize: 8.5,
        fontWeight: "800",
        marginLeft: 2,
    },
});