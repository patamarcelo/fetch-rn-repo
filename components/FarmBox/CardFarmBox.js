import { Pressable, View, Text, StyleSheet, Image, Easing, ScrollView, TouchableOpacity, RefreshControl, Alert, Platform, ActivityIndicator } from "react-native"
import { Colors } from "../../constants/styles";
import { SafeAreaView } from "react-native-safe-area-context";


import { useState, useRef, useEffect, useLayoutEffect, useMemo } from "react";

import { Divider } from '@rneui/themed';



import * as Progress from 'react-native-progress';

import * as Haptics from 'expo-haptics';

import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { useNavigation } from "@react-navigation/native";
import { exportPolygonsAsKML } from "../../utils/kml-generator";
import { selectMapDataPlot, selectFarmBoxData } from "../../store/redux/selector";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons'

import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

import { HeaderBackButton } from '@react-navigation/elements';

import { useScrollToTop } from "@react-navigation/native";

import { useDispatch, useSelector } from "react-redux";
import { geralActions } from "../../store/redux/geral";
import { selectFarmboxSearchBar, selectFarmboxSearchQuery } from "../../store/redux/selector";
import SearchBar from "../Global/SearchBar";
import { FAB } from "react-native-paper";

import IconButton from "../ui/IconButton";



import Animated, { BounceIn, BounceOut, FadeIn, FadeInRight, FadeInUp, FadeOut, FadeOutUp, FlipInEasyX, FlipOutEasyX, Layout, SlideInLeft, SlideInRight, SlideOutRight, SlideOutUp, StretchInY, StretchOutX, ZoomIn, ZoomOut } from 'react-native-reanimated';


import FilterModalApps from "./FilterModalApps";
import { EXPO_PUBLIC_REACT_APP_DJANGO_TOKEN } from "@env";
import { NODELINK } from "../../utils/api";

import { exportPdf } from "../../store/redux/authSlice";

import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from 'expo-sharing';

import { postKmlMerge } from "../../services/generatekml";
import { newMapArr } from "../../screens/plot-helper";
import { LINK } from "../../utils/api";
import { SectionList } from "react-native";



const CardFarmBox = ({ route, navigation }) => {
    // const { data, indexParent, showMapPlot } = props
    const { indexParent, farm } = route.params; // Extract route parameters
    const { setFarmboxSearchBar, setFarmboxSearchQuery, setFarmBoxData } = geralActions;

    const stackNavigator = navigation.getParent()
    const tabBarHeight = useBottomTabBarHeight();
    const ref = useRef(null);
    const dispatch = useDispatch()

    const { data: data } = useSelector(selectFarmBoxData)



    const mapPlotData = useSelector(selectMapDataPlot)
    const searchQuery = useSelector(selectFarmboxSearchQuery)
    const showSearch = useSelector(selectFarmboxSearchBar)

    const [showAps, setShowAps] = useState({});

    // por isto:
    const [selectedParcelasByCode, setSelectedParcelasByCode] = useState({});
    const [activeCode, setActiveCode] = useState(null);
    const [totalSelected, setTotalSelected] = useState(0);

    // helpers
    const getSelectedFor = (code) => selectedParcelasByCode[code] || [];

    const [farmData, setfarmData] = useState([]);

    const [isLoading, setIsLoading] = useState(false);

    const [isSharing, setIsSharing] = useState(false);
    const [isSharingUnique, setIsSharingUnique] = useState(false);

    const backgroundColorCard = Platform.OS === 'ios' ? 'whitesmoke' : 'white'

    const handleExprotData = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
        const allApps = data.filter((farmName) => farmName.farmName === farm)
        console.log('AllApss', allApps[0]?.parcelas)
        const apParcelasIndex = (allApps ?? []).map((ap) => ({
            idAp: ap?.idAp,
            parcelasIds: (ap?.parcelas ?? [])
                .map((p) => p?.parcelaAppPlantationId)
                .filter((id) => id != null),
        }));

        // flatten + unique
        const onlyIds = Array.from(
            new Set(
                apParcelasIndex.flatMap((ap) => ap.parcelasIds)
            )
        );

        console.log("onlyIds:", onlyIds);

        const params = {
            farm: allApps[0]?.farmId,
            apParcelasIndex,
            onlyIds,
        };
        dispatch(exportPdf(params))
        navigation.navigate('FarmBoxFilterApps', { data: data, farm: farm })
    }



    useEffect(() => {
        const unsubscribeFocus = navigation.addListener("focus", () => {
            const currentStack = navigation.getState();
            const stackName = currentStack.routes[0]['name']

            console.log("Now on FarmBoxStack", navigation);
            stackNavigator.setOptions({
                title: stackName !== 'FarmBoxStack' ? 'FarmBox' : farm?.replace('Fazenda ', ''),
                headerShadowVisible: false,
                headerRight: ({ tintColor }) => (
                    <View style={{ flexDirection: "row", alignItems: 'center', paddingRight: 20, flex: 1 }}>
                        <IconButton
                            type={"awesome"}
                            icon={'print'}
                            color={tintColor}
                            size={22}
                            onPress={() => {
                                console.log('trigger here')
                                handleExprotData()
                            }}
                            btnStyles={{ marginLeft: 5, marginTop: 10 }}
                        />
                    </View>
                ),
                headerLeft: stackName === 'FarmBoxStack'
                    ? (props) => (
                        <HeaderBackButton
                            {...props}
                            label="Voltar"  // Directly set label
                            onPress={() => {
                                navigation.navigate('FarmBoxStack');
                            }}
                        />
                    )
                    : null, // No arrow-back if on FarmBoxStack
            });
            // Add logic specific to FarmBoxStack screen
        });

        return unsubscribeFocus

    }, [navigation, route, farmData]);





    const formatNumber = (number, decimals = 2) => {
        return number?.toLocaleString("pt-br", {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        })
    }
    const formatNumberProds = number => {
        return number?.toLocaleString("pt-br", {
            minimumFractionDigits: 3,
            maximumFractionDigits: 3
        })
    }

    const handleOpen = (code) => {
        setShowAps((prev) => {
            const next = { ...prev };
            const isOpen = !!next[code];

            if (isOpen) {
                delete next[code];
                // se fechou o card ativo, limpa activeCode
                if (activeCode === code) setActiveCode(null);
            } else {
                next[code] = true;
                setActiveCode(code);
            }
            return next;
        });

        // REMOVER: isso é o que reseta tudo ao abrir outro card
        // setSelectedParcelas([])

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    };


    const handleSelected = (code, parcela) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        setSelectedParcelasByCode((prev) => {
            const current = prev[code] || [];
            const exists = current.some((item) => item.parcelaId === parcela.parcelaId);

            const nextArr = exists
                ? current.filter((item) => item.parcelaId !== parcela.parcelaId)
                : [...current, parcela];

            return { ...prev, [code]: nextArr };
        });
    };

    // totalSelected passa a ser do card ativo
    useEffect(() => {
        if (!activeCode) {
            setTotalSelected(0);
            return;
        }

        const selected = getSelectedFor(activeCode);
        const total =
            selected.length > 0
                ? selected.reduce((acc, curr) => acc + (curr.areaSolicitada - curr.areaAplicada), 0)
                : 0;

        setTotalSelected(total);
    }, [activeCode, selectedParcelasByCode]);



    const iconDict = [
        { cultura: "Feijão", icon: require('../../utils/assets/icons/beans2.png'), alt: "feijao" },
        { cultura: "Arroz", icon: require('../../utils/assets/icons/rice.png'), alt: "arroz" },
        { cultura: "Soja", icon: require('../../utils/assets/icons/soy.png'), alt: "soja" },
        { cultura: undefined, icon: require('../../utils/assets/icons/question.png'), alt: "?" }
    ];

    const filteredIcon = (data) => {
        const filtered = iconDict.filter((dictD) => dictD.cultura === data);

        if (filtered.length > 0) {
            return filtered[0].icon;
        }
        return iconDict[3].icon;
        // return "";
    };
    const getCultura = (dataCult) => filteredIcon(dataCult.cultura)

    const handleMapApi = (data) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        const selected = getSelectedFor(data.code); // seleção do card
        navigation.navigate("MapsCreenStack", {
            data,
            selectedParcelas: getSelectedFor(data.code),
        });
    };


    const handleKmlGenerator = async (data, mapPlotData) => {
        if (isSharing) return;
        setIsSharing(true);

        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

            const ciclo = data?.ciclo;
            const filteredMapPlotData = mapPlotData.filter(
                (p) => Number(p.ciclo__ciclo) === Number(ciclo)
            );

            const selected = getSelectedFor(data.code); // <-- pega a seleção do card

            await exportPolygonsAsKML(data, filteredMapPlotData, selected);
        } finally {
            setIsSharing(false);
        }
    };


    const escapeFarmName = (s = '') =>
        s.replace('Fazenda', 'Projeto').replace('Cacique', 'Cacíque');


    const buildParcelasPayload = (data, mapPlotData, selectedParcelasParam = [], ciclo) => {
        const selected = Array.isArray(selectedParcelasParam) ? selectedParcelasParam : [];

        // Se selecionou algo, exporta só as selecionadas. Se não, exporta todas do card.
        const filteredParcelas =
            selected.length > 0
                ? selected.map((p) => p.parcela)
                : (data?.parcelas ?? []).map((p) => p.parcela);

        const farmName = data?.farmName ?? "";
        const dataFromMap = newMapArr(mapPlotData ?? []);

        const filteredFarmArr = dataFromMap
            .filter(
                (d) =>
                    (d?.farmName ?? "")
                        .replace("Fazenda", "Projeto")
                        .replace("Cacique", "Cacíque") ===
                    escapeFarmName(farmName)
            )
            .filter((parc) => parc?.ciclo === ciclo && filteredParcelas.includes(parc?.talhao));



        const parcelas = filteredFarmArr.map((item) => {
            const coords = (item?.coords ?? []).map((p) => ({
                latitude: Number(p.latitude),
                longitude: Number(p.longitude),
            }));

            return {
                talhao: item?.talhao ?? "Sem nome",
                ciclo: item?.ciclo ?? 'Sem Ciclo',
                coords,
            };
        });

        return { parcelas };
    };

    const handleKmlGeneratorUnique = async (
        data,
        mapPlotData,
        selectedParcelasParam,
        { tol_m = 35.0, corridor_width_m = 1.0 } = {}
    ) => {
        if (isSharingUnique) return;
        setIsSharingUnique(true);

        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

            // Se não vier seleção, usa a seleção do card (por code)
            const selected =
                Array.isArray(selectedParcelasParam) && selectedParcelasParam.length >= 0
                    ? selectedParcelasParam
                    : getSelectedFor(data.code);


            const ciclo_selected = data?.ciclo
            const { parcelas } = buildParcelasPayload(data, mapPlotData, selected, ciclo_selected);


            if (!parcelas?.length) {
                Alert.alert("Atenção", "Não há polígonos para exportar.");
                return;
            }

            const body = {
                farmName: data?.farmName ?? "",
                parcelas,
                tol_m,
                corridor_width_m,
            };

            const kmlText = await postKmlMerge(LINK, EXPO_PUBLIC_REACT_APP_DJANGO_TOKEN, body);

            const basePath = FileSystem.cacheDirectory || FileSystem.documentDirectory;
            const farmName = (data?.farmName || "fazenda").replace("Fazenda ", "Projeto ");
            const farmSlug = slugify(farmName);
            const codeSlug = slugify(String(data?.code || ""));
            const filename = codeSlug ? `${farmSlug}_${codeSlug}.kml` : `${farmSlug}.kml`;
            const filePath = `${basePath}${filename}`;

            await FileSystem.writeAsStringAsync(filePath, kmlText, {
                encoding: FileSystem.EncodingType.UTF8,
            });

            const mimeType =
                Platform.OS === "android" ? "application/xml" : "application/vnd.google-earth.kml+xml";

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



    // helper simples p/ tirar acentos e espaços
    const slugify = (s = "") =>
        s
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")  // remove diacríticos
            .replace(/\s+/g, "_")
            .replace(/[^\w.-]/g, "")          // só letras, números, _ . -
            .replace(/_+/g, "_")
            .replace(/^_+|_+$/g, "");




    useScrollToTop(ref);

    useScrollToTop(
        useRef({
            scrollToTop: () => ref?.current?.scrollTo({ y: 0 })
        })
    );

    const handleFilterProps = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
        dispatch(setFarmboxSearchBar(!showSearch))
        dispatch(setFarmboxSearchQuery(""))
    }

    useEffect(() => {
        function removeAccents(str) {
            return str?.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        }

        const filterApplications = (applications) => {
            if (searchQuery?.trim() === "") {
                if (data) {
                    const newData = data.filter((farmName) => farmName.farmName === farm)
                    setfarmData(newData)
                }
                // Return the full array if the search query is empty
                // setfarmData(applications);
            } else {
                const filteredData = applications
                    .filter((farmName) => farmName.farmName === farm)
                    .filter((data) =>
                        data.prods.some((prod) =>
                            removeAccents(prod.product)?.toLowerCase().includes(removeAccents(searchQuery)?.toLowerCase())
                        )
                    )
                setfarmData(filteredData);
            }
        };

        filterApplications(data);
    }, [searchQuery, data]);

    // useEffect(() => {
    //     if (data) {
    //         const newData = data.filter((farmName) => farmName.farmName === farm)
    //         setfarmData(newData)
    //     }
    // }, [data]);

    // useEffect(() => {
    //     if (data) {
    //         const newData = data.filter((farmName) => farmName.farmName === farm)
    //         setfarmData(newData)
    //     }
    // }, []);

    const getData = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(
                `${NODELINK}/data-open-apps-fetch-app/`,
                {
                    headers: {
                        Authorization: `Token ${EXPO_PUBLIC_REACT_APP_DJANGO_TOKEN}`,
                        "Content-Type": "application/json"
                    },
                    method: "GET"
                }
            );
            if (response.status === 200) {
                console.log('atualização OK')
                const data = await response.json();
                dispatch(setFarmBoxData(data))
                console.log('data here: ', data)
                const newData = data.data.filter((farmName) => farmName.farmName === farm)
                setfarmData(newData)
            }
        } catch (error) {
            console.log("erro ao pegar os dados", error);
            Alert.alert(
                `Problema na API', 'possível erro de internet para pegar os dados ${error}`
            );
        } finally {
            setIsLoading(false);
        }
    }

    // ---------------------------
    // Classificação do tipo do APP
    // ---------------------------
    const getAppKind = (app) => {
        const prods = Array.isArray(app?.prods) ? app.prods : [];

        // 1 insumo no array => Operação (como você definiu)
        if (prods.length <= 1) return "Operação";

        const semOperacao = prods.filter((p) => (p?.type || "") !== "Operação");

        if (semOperacao.length === 1) return "Sólido";
        return "Líquido";
    };

    // ---------------------------
    // Totais do header por grupo
    // (áreas + quantidades por produto)
    // ---------------------------
    const sumNumber = (v) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
    };

    const buildGroupTotals = (apps = []) => {
        const totals = {
            count: apps.length,
            areaSolicitada: 0,
            areaAplicada: 0,
            saldoAreaAplicar: 0,
            // totais de produtos (somando "quantidadeSolicitada" do payload)
            products: {}, // key: `${product}|${unit}` => { product, unit, total }
        };

        for (const app of apps) {
            totals.areaSolicitada += sumNumber(app?.areaSolicitada);
            totals.areaAplicada += sumNumber(app?.areaAplicada);

            // usa o campo pronto se existir; se não, calcula
            const saldo =
                app?.saldoAreaAplicar != null
                    ? sumNumber(app?.saldoAreaAplicar)
                    : Math.max(sumNumber(app?.areaSolicitada) - sumNumber(app?.areaAplicada), 0);

            totals.saldoAreaAplicar += saldo;

            const prods = Array.isArray(app?.prods) ? app.prods : [];
            for (const p of prods) {
                // se você NÃO quiser contabilizar "Operação" nas quantidades, mantenha esse filtro
                if ((p?.type || "") === "Operação") continue;

                const key = `${p?.product || "?"}|${p?.unit || ""}`;
                if (!totals.products[key]) {
                    totals.products[key] = { product: p?.product || "?", unit: p?.unit || "", total: 0 };
                }
                totals.products[key].total += sumNumber(p?.quantidadeSolicitada);
            }
        }

        // vira array para renderizar
        const productsArr = Object.values(totals.products).sort((a, b) =>
            String(a.product).localeCompare(String(b.product))
        );

        return { ...totals, productsArr };
    };

    // ---------------------------
    // Seções agrupadas (useMemo)
    // ---------------------------
    const sections = useMemo(() => {
        const base = Array.isArray(farmData) ? farmData : [];

        const groups = {
            "Operação": [],
            "Sólido": [],
            "Líquido": [],
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
    }, [farmData]);

    return (
        <>
            <SafeAreaView style={{ flex: 1 }} edges={[""]}>
                {showSearch && (
                    <SearchBar
                        placeholder="Selecione um produto ou operação..."
                        value={searchQuery}
                        onChangeText={(e) => dispatch(setFarmboxSearchQuery(e))}
                    />
                )}

                <SectionList
                    ref={ref}
                    sections={sections.map((s) => ({
                        title: s.title,
                        totals: s.totals,
                        data: s.items,
                    }))}
                    keyExtractor={(item, index) => item?.code || `${index}`}
                    stickySectionHeadersEnabled
                    contentInsetAdjustmentBehavior="automatic"
                    style={{ marginBottom: Platform.OS === "android" ? 20 : 0 }}
                    refreshControl={
                        <RefreshControl
                            refreshing={isLoading}
                            onRefresh={getData}
                            colors={["#9Bd35A", "#689F38"]}
                            tintColor={Colors.primary500}
                        />
                    }
                    contentContainerStyle={{
                        paddingBottom: tabBarHeight + (showSearch ? 40 : -15),
                    }}
                    renderSectionHeader={({ section }) => (
                        // STICKY SÓ ESTA LINHA
                        <View style={styles.sectionStickyRow}>
                            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
                                <Text style={styles.sectionTitle}>{section.title}</Text>
                                <Text style={styles.sectionSubtitle}>{section.totals.count} aplicações</Text>
                            </View>
                        </View>
                    )}
                    renderItem={({ item: data, index, section }) => {
                        const selectedHere = getSelectedFor(data.code);

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

                        const productsArr = Array.isArray(section?.totals?.productsArr) ? section.totals.productsArr : [];

                        return (
                            <Animated.View
                                entering={FadeInRight.duration(300)}
                                exiting={FadeOut.duration(300)}
                                layout={Layout.springify()}
                            >
                                {/* NÃO-STICKY: KPIs + chips aparecem 1x por grupo e rolam normalmente */}
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

                                {/* CARD ORIGINAL */}
                                <Pressable
                                    style={({ pressed }) => [
                                        styles.mainContainerAll,
                                        {
                                            marginTop: index !== 0 && 10,
                                            backgroundColor: !showAps[data.code] ? backgroundColorCard : Colors.secondary[200],
                                            opacity: !showAps[data.code] ? 0.8 : 1,
                                            marginBottom: isLastItem ? 80 : 0,
                                        },
                                    ]}
                                >
                                    <View
                                        style={[
                                            styles.infoContainer,
                                            { backgroundColor: showAps[data.code] ? Colors.primary500 : Colors.primary800 },
                                        ]}
                                    >
                                        <Text style={{ color: "whitesmoke", fontWeight: "bold" }}>
                                            Área:{" "}
                                            <Text style={{ color: Colors.secondary[300] }}>{formatNumber(data.areaSolicitada)}</Text>
                                        </Text>
                                        <Text style={{ color: "whitesmoke", fontWeight: "bold" }}>
                                            Aplicado:{" "}
                                            <Text style={{ color: Colors.secondary[300] }}>{formatNumber(data.areaAplicada)}</Text>
                                        </Text>
                                        <Text style={{ color: "whitesmoke", fontWeight: "bold" }}>
                                            Saldo:{" "}
                                            <Text style={{ color: Colors.secondary[300] }}>{formatNumber(data.saldoAreaAplicar)}</Text>
                                        </Text>
                                    </View>

                                    <Pressable
                                        style={({ pressed }) => [
                                            styles.mainContainer,
                                            pressed && styles.pressed,
                                            {
                                                marginTop: indexParent === 0 && 0,
                                                backgroundColor: !showAps[data.code] ? "whitesmoke" : Colors.secondary[200],
                                            },
                                        ]}
                                        onPress={handleOpen.bind(this, data.code)}
                                    >
                                        <View style={styles.headerContainer}>
                                            <View>
                                                <Text style={[styles.headerTitle, { color: Colors.primary[600] }]}>
                                                    {" "}
                                                    {data?.code?.split("AP")}
                                                </Text>
                                                <Text style={[styles.headerTitle, styles.dateTile]}>
                                                    {" "}
                                                    {data?.dateAp?.split("-").reverse().join("/")}
                                                </Text>
                                            </View>

                                            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                                                <Text style={styles.headerTitle}> {data.operation}</Text>
                                                <View style={styles.shadowContainer}>
                                                    <Image
                                                        source={getCultura(data)}
                                                        style={{ width: 20, height: 20, resizeMode: "contain" }}
                                                    />
                                                </View>
                                            </View>

                                            <View style={styles.progressContainer}>
                                                <Progress.Pie
                                                    size={30}
                                                    indeterminate={false}
                                                    progress={data.percent}
                                                    color={data.percentColor === "#E4D00A" ? Colors.gold[700] : data.percentColor}
                                                />
                                            </View>
                                        </View>
                                    </Pressable>

                                    {showAps[data.code] && (
                                        <Animated.View
                                            entering={FadeInUp.duration(50)}
                                            style={styles.bodyContainer}
                                        >
                                            <View style={styles.bodyContainer}>
                                                <View style={styles.parcelasContainer}>
                                                    {data?.parcelas?.map((parcela) => {
                                                        const uniKey = data.idAp + parcela.parcela;

                                                        const selectedHere = getSelectedFor(data.code);
                                                        const isSelected = selectedHere.some((f) => f.parcelaId === parcela.parcelaId);

                                                        return (
                                                            <Pressable
                                                                key={uniKey}
                                                                style={[
                                                                    styles.parcelasView,
                                                                    isSelected && styles.selectedParcelas,
                                                                    { backgroundColor: parcela.fillColorParce },
                                                                ]}
                                                                onPress={() => handleSelected(data.code, parcela)}
                                                            >
                                                                {isSelected && <View style={styles.selectedOverlay} pointerEvents="none" />}

                                                                <Text
                                                                    style={{
                                                                        color: parcela.fillColorParce === "#E4D00A" ? "black" : "whitesmoke",
                                                                        fontWeight: "bold",
                                                                    }}
                                                                >
                                                                    {parcela.parcela}
                                                                </Text>
                                                                <Text
                                                                    style={{
                                                                        color: parcela.fillColorParce === "#E4D00A" ? "black" : "whitesmoke",
                                                                    }}
                                                                >
                                                                    -
                                                                </Text>
                                                                <Text
                                                                    style={{
                                                                        color: parcela.fillColorParce === "#E4D00A" ? "black" : "whitesmoke",
                                                                        fontWeight: "bold",
                                                                    }}
                                                                >
                                                                    {formatNumber(parcela.areaSolicitada)}
                                                                </Text>
                                                            </Pressable>
                                                        );
                                                    })}
                                                </View>

                                                <Divider width={1} color={"rgba(245,245,245,0.3)"} />

                                                <View style={styles.produtosContainer}>
                                                    {data?.prods
                                                        ?.filter((pro) => pro.type !== "Operação")
                                                        .map((produto, index) => {
                                                            const uniKey = data.cultura + data.idAp + produto.product;

                                                            const abertoPadrao = Number(
                                                                data?.saldoAreaAplicar ??
                                                                (Number(data?.areaSolicitada || 0) - Number(data?.areaAplicada || 0))
                                                            );

                                                            const areaBase = selectedHere.length > 0 ? Number(abertoHere || 0) : abertoPadrao;
                                                            const totalProduto = Number(produto.doseSolicitada || 0) * areaBase;

                                                            return (
                                                                <Animated.View
                                                                    entering={FadeInRight.duration(200 + index * 50)}
                                                                    exiting={FadeOutUp.duration(20)}
                                                                    layout={Layout.springify()}
                                                                    key={uniKey}
                                                                    style={[
                                                                        styles.prodsView,
                                                                        {
                                                                            backgroundColor:
                                                                                produto.colorChip === "rgb(255,255,255,0.1)"
                                                                                    ? "whitesmoke"
                                                                                    : produto.colorChip,
                                                                        },
                                                                    ]}
                                                                >
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
                                                                </Animated.View>
                                                            );
                                                        })}
                                                </View>

                                                <View style={styles.footerContainer}>
                                                    {selectedHere.length > 0 && (
                                                        <View style={styles.kpiRow}>
                                                            <View style={[styles.kpiCard, styles.kpiOpen]}>
                                                                <Text style={styles.kpiLabel}>Aberto</Text>
                                                                <Text style={styles.kpiValue}>
                                                                    {abertoHere > 0 ? `${formatNumber(abertoHere)} ha` : "-"}
                                                                </Text>
                                                            </View>

                                                            <View style={[styles.kpiCard, styles.kpiApplied]}>
                                                                <Text style={styles.kpiLabel}>Aplicado</Text>
                                                                <Text style={styles.kpiValue}>
                                                                    {aplicadoHere > 0 ? `${formatNumber(aplicadoHere)} ha` : "-"}
                                                                </Text>
                                                            </View>

                                                            <View style={[styles.kpiCard, styles.kpiTotal]}>
                                                                <Text style={styles.kpiLabel}>Total</Text>
                                                                <Text style={styles.kpiValue}>
                                                                    {totalHere > 0 ? `${formatNumber(totalHere)} ha` : "-"}
                                                                </Text>
                                                            </View>
                                                        </View>
                                                    )}

                                                    <View style={styles.buttonRow}>
                                                        <Pressable
                                                            disabled={isSharingUnique}
                                                            style={({ pressed }) => [styles.mapBtn, pressed && styles.pressed]}
                                                            onPress={() => handleKmlGeneratorUnique(data, mapPlotData, getSelectedFor(data.code))}
                                                        >
                                                            {isSharingUnique ? (
                                                                <ActivityIndicator size={22} color={Colors.primary[500]} />
                                                            ) : (
                                                                <FontAwesome5 name="layer-group" size={24} color={Colors.primary[500]} />
                                                            )}
                                                        </Pressable>

                                                        <Pressable
                                                            disabled={isSharing}
                                                            style={({ pressed }) => [styles.mapBtn, pressed && styles.pressed]}
                                                            onPress={handleKmlGenerator.bind(this, data, mapPlotData)}
                                                        >
                                                            {isSharing ? (
                                                                <ActivityIndicator size={22} color={Colors.primary[500]} />
                                                            ) : (
                                                                <FontAwesome5 name="object-ungroup" size={24} color={Colors.succes[600]} />
                                                            )}
                                                        </Pressable>

                                                        <Pressable
                                                            style={({ pressed }) => [styles.mapBtn, pressed && styles.pressed]}
                                                            onPress={handleMapApi.bind(this, data)}
                                                        >
                                                            <FontAwesome5 name="map-marked-alt" size={24} color={Colors.primary[600]} />
                                                        </Pressable>
                                                    </View>
                                                </View>
                                            </View>
                                        </Animated.View>
                                    )}
                                </Pressable>
                            </Animated.View>
                        );
                    }}
                />
            </SafeAreaView>


            <View style={styles.fabContainer}>
                <FAB
                    style={styles.fab}
                    icon={showSearch ? "close" : "magnify"}
                    color="black" // Icon color
                    onPress={handleFilterProps}
                />
            </View>
            {/* {
                modalVisible &&
                <FilterModalApps
                    modalVisible={modalVisible}
                    setModalVisible={setModalVisible}
                    data={data}
                    farm={farm}
                />
            } */}
        </>
    )
}

export default CardFarmBox


const styles = StyleSheet.create({
    shadowContainer: {
        shadowColor: "#000",  // Shadow color
        shadowOffset: { width: 3, height: 5 },  // Offset for drop shadow effect
        shadowOpacity: 0.4,  // Opacity of shadow
        shadowRadius: 4,  // Spread of shadow
        elevation: 6,  // Required for Android
    },
    fabContainer: {
        position: "absolute",
        right: 20,
        bottom: 20
    },
    fab: {
        position: "absolute",
        right: 30,
        bottom: 90,
        backgroundColor: "rgba(200, 200, 200, 0.3)", // Grey, almost transparent
        width: 50,
        height: 50,
        borderRadius: 25, // Makes it perfectly circular
        borderColor: Colors.primary[300],
        borderWidth: 1,
        justifyContent: "center",
        alignItems: "center",
        elevation: 4
    },
    textTotalSelected: {
        fontWeight: 'bold',
    },

    selectedParcelas: {
        borderWidth: 2,
        borderColor: 'blue',      // navy escuro, não compete com o label branco
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
        shadowColor: '#000', // Shadow color
        shadowOffset: {
            width: 0, // No horizontal shadow
            height: 4, // Bottom shadow
        },
        shadowOpacity: 0.25, // Adjust opacity
        shadowRadius: 4, // Adjust the blur radius
        elevation: 5, // Add elevation for Android (optional, see below)

    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 5
    },
    headerTitle: {
        fontWeight: 'bold'
    },
    dateTile: {
        fontSize: 8
    },
    progressContainer: {
        marginRight: 10
    },
    bodyContainer: {
        // backgroundColor:Colors. secondary[400]
        // flex: 1,
        // flexDirection: 'row'
    },
    parcelasContainer: {
        marginTop: 6,
        gap: 5,
        flexDirection: 'row',
        paddingHorizontal: 4,
        flexWrap: 'wrap',
        marginBottom: 10,
        justifyContent: 'flex-start'
    },
    parcelasView: {
        flexDirection: 'row',
        gap: 1,
        width: 91,
        borderRadius: 6,
        paddingHorizontal: 3,
        paddingVertical: 6,
        backgroundColor: 'green',
        justifyContent: 'space-around',

    },
    infoContainer: {
        flex: 1,
        backgroundColor: Colors.primary800,
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
        paddingVertical: 7,
        paddingHorizontal: 15
    },
    produtosContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        gap: 5,
        marginTop: 10
    },
    prodsView: {
        flexDirection: 'row',
        width: 300,
        backgroundColor: 'blue',
        gap: 10,
        borderRadius: 6,
        justifyContent: "flex-start",
        padding: 2
    },
    textProds: {
        marginLeft: 10,
        color: 'whitesmoke',
        fontWeight: 'bold'
    },
    totalprods: {
        textAlign: 'right',
        marginRight: 10,
        marginLeft: 'auto',
        color: 'whitesmoke',
        fontWeight: 'bold'
    },
    textProdsName: {
        color: 'whitesmoke',
        fontWeight: 'bold'
    },
    pressed: {
        opacity: 0.3,
        // backgroundColor: Colors.secondary[200],

    },

    selectedOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: Colors.primary[902],  // rgba(3,22,51,0.6) -> se ficar forte, use 0.18 abaixo
        opacity: 0.48,
        borderRadius: 6, // mesmo radius do chip
    },


    totalSelected: {
        marginLeft: 15,
        flex: 1,                    // importante: ocupar espaço da esquerda
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

    // Variantes visuais (consistentes com seu tema)
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

    buttonRow: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 8,
        paddingHorizontal: 8,
        paddingBottom: 2,
    },

    mapBtn: {
        paddingVertical: 10,
        paddingHorizontal: 10,
        borderRadius: 10,
    },

    sectionHeader: {
        // marginTop: 8,
        // marginBottom: 6,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: Colors.primary[902],
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: "rgba(0,0,0,0.08)",
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
    sectionProdsWrap: {
        marginTop: 10,
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
        alignItems: "center",
    },
    sectionProdChip: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 999,
        backgroundColor: "rgba(255,255,255,0.7)",
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.08)",
    },
    sectionProdText: {
        fontSize: 10,
        fontWeight: "700",
        color: Colors.primary[900],
    },
    sectionMoreText: {
        fontSize: 10,
        fontWeight: "800",
        color: Colors.primary[700],
        marginLeft: 4,
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




})