import { Pressable, View, Text, StyleSheet, Image, Easing, ScrollView, SafeAreaView, TouchableOpacity, RefreshControl, Alert, Platform } from "react-native"
import { Colors } from "../../constants/styles";

import { useState, useRef, useEffect, useLayoutEffect } from "react";

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

const CardFarmBox = ({ route, navigation }) => {
    // const { data, indexParent, showMapPlot } = props
    const { indexParent, farm } = route.params; // Extract route parameters
    const { setFarmboxSearchBar, setFarmboxSearchQuery, setFarmBoxData } = geralActions;

    const stackNavigator = navigation.getParent()
    const tabBarHeight = useBottomTabBarHeight();
    const ref = useRef(null);
    const dispatch = useDispatch()

    const { data : data } = useSelector(selectFarmBoxData)



    const mapPlotData = useSelector(selectMapDataPlot)
    const searchQuery = useSelector(selectFarmboxSearchQuery)
    const showSearch = useSelector(selectFarmboxSearchBar)

    const [showAps, setShowAps] = useState({});

    const [selectedParcelas, setSelectedParcelas] = useState([]);
    const [totalSelected, setTotalSelected] = useState(0);

    const [farmData, setfarmData] = useState([]);

    const [isLoading, setIsLoading] = useState(false);

    const handleExprotData = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
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


    useEffect(() => {
        setSelectedParcelas([])
    }, []);

    useEffect(() => {
        if (selectedParcelas?.length > 0) {
            const total = selectedParcelas.reduce((acc, curr) => acc += (curr.areaSolicitada - curr.areaAplicada), 0)
            setTotalSelected(total)
        } else {
            setTotalSelected(0)
        }
    }, [selectedParcelas]);


    const formatNumber = number => {
        return number?.toLocaleString("pt-br", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
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
            const newDict = { ...prev };
            if (newDict[code]) {
                delete newDict[code]
            } else {
                newDict[code] = true
            }
            return newDict
        })
        setSelectedParcelas([])
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    }

    const handleSelected = (parcela) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
        setSelectedParcelas((prev) => {
            // Check if the object exists in the array by comparing a unique property (e.g., parcelaId)
            const exists = prev.some((item) => item.parcelaId === parcela.parcelaId);

            if (exists) {
                // If it exists, remove it
                return prev.filter((item) => item.parcelaId !== parcela.parcelaId);
            } else {
                // If it doesn't exist, add it
                return [...prev, parcela];
            }
        });
    }

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
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
        // console.log('handle MAP FArmbox', data)
        navigation.navigate('MapsCreenStack', { data })

    }

    const handleKmlGenerator = (data, mapPlotData) => {
        console.log('handle kml')
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
        exportPolygonsAsKML(data, mapPlotData, selectedParcelas)

    }

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
                // Return the full array if the search query is empty
                setfarmData(applications);
            } else {
                const filteredData = applications
                    .filter((data) =>
                        data.prods.some((prod) =>
                            removeAccents(prod.product)?.toLowerCase().includes(removeAccents(searchQuery)?.toLowerCase())
                        )
                    )
                setfarmData(filteredData);
            }
        };

        filterApplications(data);
    }, [searchQuery]);

    useEffect(() => {
        if (data) {
            const newData = data.filter((farmName) => farmName.farmName === farm)
            setfarmData(newData)
        }
    }, [data]);
    
    useEffect(() => {
        if (data) {
            const newData = data.filter((farmName) => farmName.farmName === farm)
            setfarmData(newData)
        }
    }, []);

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

    return (
        <>
            <SafeAreaView style={{flex: 1}}>
                {showSearch && (
                    <SearchBar
                        placeholder="Selecione um produto ou operação..."
                        value={searchQuery}
                        onChangeText={(e) => dispatch(setFarmboxSearchQuery(e))}
                    />
                )}
                <ScrollView
                    contentInsetAdjustmentBehavior='automatic'
                    horizontal={false}
                    style={{ marginBottom: Platform.OS === 'android' ? 20 : 0 }}
                    refreshControl={
                        <RefreshControl
                            refreshing={isLoading}
                            onRefresh={getData}
                            colors={["#9Bd35A", "#689F38"]}
                            tintColor={Colors.primary500}
                        />
                    }
                    ref={ref}
                    contentContainerStyle={{
                        paddingBottom: tabBarHeight + (showSearch ? 40 : -15), // Adjust this value based on your bottom tab height
                    }}>
                    {
                        farmData && farmData.map((data, i) => {
                            return (
                                <Animated.View
                                    entering={FadeInRight.duration(300)} // Root-level animation for appearance
                                    exiting={FadeOut.duration(300)} // Root-level animation for disappearance
                                    layout={Layout.springify()}    // Layout animation for dynamic resizing
                                    key={i}
                                >
                                    <Pressable
                                        style={({ pressed }) => [
                                            styles.mainContainerAll,
                                            // pressed && styles.pressed, 
                                            { marginTop: i !== 0 && 10, backgroundColor: !showAps[data.code] ? 'whitesmoke' : Colors.secondary[200], opacity: !showAps[data.code] ? 0.8 : 1 }]}
                                    // onPress={handleOpen}
                                    >
                                        <View style={[styles.infoContainer, { backgroundColor: showAps[data.code] ? Colors.primary500 : Colors.primary800 }]}>
                                            <Text style={{ color: 'whitesmoke', fontWeight: 'bold' }}>Área: <Text style={{ color: Colors.secondary[300] }}>{formatNumber(data.areaSolicitada)}</Text></Text>
                                            <Text style={{ color: 'whitesmoke', fontWeight: 'bold' }}>Aplicado: <Text style={{ color: Colors.secondary[300] }}>{formatNumber(data.areaAplicada)}</Text></Text>
                                            <Text style={{ color: 'whitesmoke', fontWeight: 'bold' }}>Saldo: <Text style={{ color: Colors.secondary[300] }}>{formatNumber(data.saldoAreaAplicar)}</Text></Text>

                                        </View>
                                        <Pressable
                                            style={({ pressed }) => [
                                                styles.mainContainer,
                                                pressed && styles.pressed, { marginTop: indexParent === 0 && 0, backgroundColor: !showAps[data.code] ? 'whitesmoke' : Colors.secondary[200] }]}
                                            onPress={handleOpen.bind(this, data.code)}>

                                            <View style={styles.headerContainer}>
                                                <View>
                                                    <Text style={[styles.headerTitle, { color: Colors.primary[600] }]}> {data?.code?.split('AP')}</Text>
                                                    <Text style={[styles.headerTitle, styles.dateTile]}> {data?.dateAp?.split('-').reverse().join('/')}</Text>
                                                </View>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                                    <Text style={styles.headerTitle}> {data.operation}</Text>
                                                    <View style={styles.shadowContainer}>

                                                        <Image source={getCultura(data)}
                                                            style={{ width: 20, height: 20, resizeMode: 'contain' }}
                                                        />
                                                    </View>
                                                </View>
                                                <View style={styles.progressContainer}>
                                                    <Progress.Pie size={30} indeterminate={false} progress={data.percent} color={data.percentColor === "#E4D00A" ? Colors.gold[700] : data.percentColor} />
                                                </View>
                                            </View>
                                        </Pressable>

                                        {
                                            showAps[data.code] &&
                                            <Animated.View
                                                entering={FadeInUp.duration(50)}   // Child-level animation for appearance
                                                // exiting={FadeOutUp.duration(50)}   // Child-level animation for disappearance
                                                style={styles.bodyContainer}
                                            >


                                                <View style={styles.bodyContainer}>
                                                    <View style={styles.parcelasContainer}>
                                                        {
                                                            data?.parcelas?.map((parcela) => {
                                                                const uniKey = data.idAp + parcela.parcela
                                                                const isSelected = selectedParcelas.find((filt) => filt.parcelaId === parcela.parcelaId)
                                                                return (
                                                                    <Pressable
                                                                        key={uniKey}
                                                                        style={[styles.parcelasView, isSelected && styles.selectedParcelas, { backgroundColor: parcela.fillColorParce }]}
                                                                        onPress={handleSelected.bind(this, parcela)}
                                                                    >
                                                                        <Text style={{ color: parcela.fillColorParce === '#E4D00A' ? 'black' : 'whitesmoke', fontWeight: 'bold' }}>{parcela.parcela}</Text>
                                                                        <Text style={{ color: parcela.fillColorParce === '#E4D00A' ? 'black' : 'whitesmoke' }}>-</Text>
                                                                        <Text style={{ color: parcela.fillColorParce === '#E4D00A' ? 'black' : 'whitesmoke', fontWeight: 'bold' }}>{formatNumber(parcela.areaSolicitada)}</Text>
                                                                    </Pressable>
                                                                )
                                                            })
                                                        }
                                                    </View>
                                                    <Divider width={1} color={"rgba(245,245,245,0.3)"} />
                                                    <View style={styles.produtosContainer}>
                                                        {
                                                            data?.prods?.filter((pro) => pro.type !== 'Operação').map((produto, index) => {
                                                                const uniKey = data.cultura + data.idAp + produto.product
                                                                console.log('parcela Color backgrounc: ', produto.colorChip)
                                                                return (
                                                                    <Animated.View
                                                                        entering={FadeInRight.duration(200 + (index * 50))} // Root-level animation for appearance
                                                                        exiting={FadeOutUp.duration(20)} // Root-level animation for disappearance
                                                                        layout={Layout.springify()}    // Layout animation for dynamic resizing
                                                                        key={uniKey}
                                                                        style={[styles.prodsView, { backgroundColor: produto.colorChip === 'rgb(255,255,255,0.1)' ? 'whitesmoke' : produto.colorChip }]}
                                                                    >
                                                                        <Text style={[styles.textProds, { color: produto.colorChip === 'rgb(255,255,255,0.1)' ? '#455d7a' : 'whitesmoke' }]}>{formatNumberProds(produto.doseSolicitada)}</Text>
                                                                        <Text style={[styles.textProdsName, { color: produto.colorChip === 'rgb(255,255,255,0.1)' ? '#455d7a' : 'whitesmoke' }]}>{produto.product}</Text>
                                                                        <Text style={[styles.totalprods, { color: produto.colorChip === 'rgb(255,255,255,0.1)' ? '#455d7a' : 'whitesmoke' }]}>{formatNumber(produto.doseSolicitada * data.areaSolicitada)}</Text>
                                                                    </Animated.View>
                                                                )
                                                            })
                                                        }
                                                    </View>
                                                    <View style={styles.footerContainer}>
                                                        <View style={styles.totalSelected}>
                                                            <Text style={styles.textTotalSelected}>{totalSelected > 0 ? formatNumber(totalSelected) : '-'}</Text>
                                                        </View>
                                                        <View style={styles.buttonContainer}>
                                                            <Pressable
                                                                style={({ pressed }) => [
                                                                    styles.mapContainer,
                                                                    pressed && styles.pressed]}
                                                                onPress={handleKmlGenerator.bind(this, data, mapPlotData)}
                                                            >
                                                                <FontAwesome5 name="plane" size={24} color={Colors.succes[600]} />
                                                            </Pressable>
                                                            <Pressable
                                                                style={({ pressed }) => [
                                                                    styles.mapContainer,
                                                                    pressed && styles.pressed]}
                                                                onPress={handleMapApi.bind(this, data)}
                                                            >
                                                                <FontAwesome5 name="map-marked-alt" size={24} color={Colors.primary[600]} />
                                                            </Pressable>
                                                        </View>
                                                    </View>


                                                </View>
                                            </Animated.View>
                                        }

                                    </Pressable >
                                </Animated.View>
                            )
                        })
                    }
                </ScrollView>
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
        fontWeight: 'bold'
    },
    totalSelected: {
        marginLeft: 15
    },
    footerContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginBottom: 10
    },
    selectedParcelas: {
        borderColor: 'white',
        borderWidth: 2
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 0,
        marginRight: -5,
        marginTop: 10
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
    mapContainer: {
        marginRight: 10,
        paddingTop: 10,
        paddingRight: 10,
        justifyContent: 'flex-end',
        alignItems: 'flex-end',
        borderRadius: 8,
    },
})