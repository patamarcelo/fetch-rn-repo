import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    RefreshControl,
    Pressable,
    Alert,
    ActivityIndicator,
} from 'react-native'


import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { Colors } from '../constants/styles';

import { useDispatch, useSelector } from "react-redux";
import { geralActions } from "../store/redux/geral";
import { selectFarmBoxData, selectMapDataPlot } from "../store/redux/selector";


import { useScrollToTop } from "@react-navigation/native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";


import CardFarmBox from '../components/FarmBox/CardFarmBox';

import { NODELINK } from "../utils/api";
import { EXPO_PUBLIC_REACT_APP_DJANGO_TOKEN } from "@env";

import * as Haptics from 'expo-haptics';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { LINK } from '../utils/api';

import { newMapArr } from "./plot-helper";








const FarmBoxScreen = (props) => {
    const { setFarmBoxData, setMapPlot } = geralActions;

    const stackNavigator = props.navigation.getParent()

    const dispatch = useDispatch()

    const sheetRef = useRef(null);
    const ref = useRef(null);
    const [farmData, setfarmData] = useState([]);
    const [onlyFarms, setOnlyFarms] = useState([]);
    const tabBarHeight = useBottomTabBarHeight();

    const farmBoxData = useSelector(selectFarmBoxData)
    const mapPlotData = useSelector(selectMapDataPlot)

    const [showFarm, setShowFarm] = useState(null);

    const [isLoading, setIsLoading] = useState(false);

    const [isloadingDbFarm, setIsloadingDbFarm] = useState(false);
    const [isLoadingMapData, setIsLoadingMapData] = useState(false);

    const [showPlotMap, setshowPlotMap] = useState(false);

    const formatNumber = number => {
        return number?.toLocaleString("pt-br", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })
    }

    useEffect(() => {
		if (mapPlotData.length > 0 && showFarm) {
            const dataFromMap = newMapArr(mapPlotData)
			const filteredFarm = dataFromMap.filter((data) => data.farmName == showFarm.replace('Fazenda', 'Projeto').replace('Cacique', 'Cacíque'))
			console.log('filteredFarm', showFarm)
			if(filteredFarm.length > 0){
                setshowPlotMap(true)
            } else {
                setshowPlotMap(false)
            }
		}
	}, [showFarm]);

    const handleUpdateApiData = async () => {
        setIsloadingDbFarm(true)
        try {
            const response = await fetch(LINK + "/defensivo/update_farmbox_mongodb_data/", {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Token ${EXPO_PUBLIC_REACT_APP_DJANGO_TOKEN}`,
                },
            });
            if (response.status === 200) {
                Alert.alert('Tudo Certo', 'Aplicações Atualizadas com sucesso!!')
            }

        } catch (error) {
            console.error(error);
            setIsloadingDbFarm(false)
            Alert.alert('Problema em atualizar o banco de dados', `Erro: ${error}`)
        } finally {
            setIsloadingDbFarm(false)
        }
        console.log('update farmOperations...')
    }

    const handleClearFarm = () => {
        setShowFarm(null)
    }

    useLayoutEffect(() => {
        stackNavigator.setOptions({
            title: 'FarmBox',
            tabBarLabel: "FarmBox",
            headerShadowVisible: false, // applied here
            headerRight: ({ tintColor }) => (
                <View style={{ flexDirection: "row", alignItems: 'center', paddingRight: 20, flex: 1 }}>
                    <MaterialCommunityIcons
                        name="database-refresh-outline"
                        size={24}
                        color={tintColor}
                        onPress={handleUpdateApiData}
                    />
                </View>
            )
        });
    }, []);

    useLayoutEffect(() => {
        stackNavigator.setOptions({
            title: showFarm !== null ? showFarm.replace('Fazenda ', '') : 'FarmBox',
            tabBarLabel: "FarmBox",
            headerRight: ({ tintColor }) => (
                <View style={{ flexDirection: "row", alignItems: 'center', paddingRight: 20, flex: 1 }}>
                    {
                        !isloadingDbFarm &&
                        <MaterialCommunityIcons
                            name="database-refresh-outline"
                            size={24}
                            color={tintColor}
                            onPress={handleUpdateApiData}
                        />
                    }
                </View>
            ),
            headerLeft: ({ tintColor }) => (
                <View style={{ flexDirection: "row", alignItems: 'center', paddingLeft: 20, flex: 1 }}>
                    {
                        showFarm !== null &&
                        <MaterialCommunityIcons
                            name="keyboard-backspace"
                            size={24}
                            color={tintColor}
                            onPress={handleClearFarm}
                        />
                    }
                </View>
            )
        });
    }, [isloadingDbFarm, showFarm]);


    useEffect(() => {
        const getMapData = async () => {
            setIsLoadingMapData(true);
            try {
                const response = await fetch(
                    `${LINK}/plantio/get_map_plot_app_fetch_app/`,
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
                    console.log('data to plot Map', data)
                    dispatch(setMapPlot(data.dados))
                    setIsLoadingMapData(false)
                }
            } catch (error) {
                console.log("erro ao pegar os dados", error);
                Alert.alert(
                    `Problema na API', 'possível erro de internet para pegar os dados para plotar o mapa ${error}`
                );
                setIsLoadingMapData(false)
            } finally {
                setIsLoadingMapData(false);
            }
        }
        getMapData()    
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
                console.log('data from Farmbox', data)
                dispatch(setFarmBoxData(data))
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

    useEffect(() => {
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
                    console.log('atualização OK here')
                    const data = await response.json();
                    console.log(data)
                    dispatch(setFarmBoxData(data))
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
        getData()
    }, []);

    

    useEffect(() => {
        if (farmBoxData) {
            setfarmData(farmBoxData.data)
            setOnlyFarms(farmBoxData.farms)
        }
    }, []);


    useEffect(() => {
        if (farmBoxData) {
            setfarmData(farmBoxData.data)
            setOnlyFarms(farmBoxData.farms)
        }
    }, [farmBoxData]);

    useScrollToTop(ref);

    useScrollToTop(
        useRef({
            scrollToTop: () => ref.current?.scrollTo({ y: 0 })
        })
    );

    const handleShowFarm = (farms) => {
        if (showFarm === farms) {
            setShowFarm(null)
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
        } else {
            setShowFarm(farms)
            ref.current?.scrollTo({
                y: 0,
                animated: true,
            });
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
        }
    }


    if (isloadingDbFarm) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={Colors.primary800} />
            </View>
        )
    }

    return (
        <View style={styles.mainContainer}>
            <ScrollView ref={ref} style={[styles.mainContainer, { marginBottom: tabBarHeight }]}
                horizontal={false}
                refreshControl={
                    <RefreshControl
                        refreshing={isLoading}
                        onRefresh={getData}
                        colors={["#9Bd35A", "#689F38"]}
                        tintColor={Colors.primary500}
                    />
                }
            >
                {farmData && 
                    onlyFarms.filter((farmArr) => showFarm !== null ? farmArr === showFarm : farmArr.length > 0).map((farms, i) => {
                        const totalByFarm = farmData.filter((farmName) => farmName.farmName === farms).reduce((acc, curr) => acc += curr.saldoAreaAplicar, 0)
                        return (
                            <View key={i}>
                                {
                                    showFarm === null &&
                                    <Pressable
                                        style={({ pressed }) => [
                                            styles.headerContainer,
                                            pressed && styles.pressed,
                                            i === 0 && styles.firstHeader
                                        ]}

                                        onPress={handleShowFarm.bind(this, farms)}
                                    >
                                        <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>
                                            {farms.replace('Fazenda ', '')}
                                        </Text>
                                        <Text style={{ fontSize: 10, color: Colors.secondary[200] }}>{formatNumber(totalByFarm)}</Text>
                                    </Pressable>
                                }
                                {
                                    showFarm !== null && showFarm === farms && farmData.length > 0 &&
                                    farmData.filter((farmName) => farmName.farmName === farms).map((farmDatas, i) => {
                                        return (
                                            <View style={{ marginBottom: 10 }} key={farmDatas.idAp}>
                                                <CardFarmBox data={farmDatas} indexParent={i} showMapPlot={showPlotMap}/>
                                            </View>
                                        )
                                    })
                                }
                            </View>


                        )
                    })
                }
            </ScrollView>
        </View>
    );
}

export default FarmBoxScreen;

const styles = StyleSheet.create({
    firstHeader: {
        marginTop: 0
    },
    mainContainer: {
        flex: 1,
        // marginBottom: 10
    },
    headerContainer: {
        // flex: 1,
        // flexDirection: 'row',
        paddingVertical: 18,
        marginVertical: 10,
        backgroundColor: Colors.primary500,
        fontSize: 18,
        // paddingLeft: 10,
        justifyContent: 'center',
        alignItems: 'center'
    },
    pressed: {
        opacity: 0.7
    },
})