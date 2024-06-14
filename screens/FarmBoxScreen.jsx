import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    RefreshControl,
    Pressable,
    Alert,
} from 'react-native'


import { useState, useEffect, useRef } from 'react'
import { Colors } from '../constants/styles';

import { useDispatch, useSelector } from "react-redux";
import { geralActions } from "../store/redux/geral";
import { selectFarmBoxData } from "../store/redux/selector";


import { useScrollToTop } from "@react-navigation/native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";


import CardFarmBox from '../components/FarmBox/CardFarmBox';

import { NODELINK } from "../utils/api";
import { EXPO_PUBLIC_REACT_APP_DJANGO_TOKEN } from "@env";

import * as Haptics from 'expo-haptics';








const FarmBoxScreen = ({ navigation }) => {
    const { setFarmBoxData } = geralActions;

    const dispatch = useDispatch()

    const sheetRef = useRef(null);
    const ref = useRef(null);
    const [farmData, setfarmData] = useState([]);
    const [onlyFarms, setOnlyFarms] = useState([]);
    const tabBarHeight = useBottomTabBarHeight();

    const farmBoxData = useSelector(selectFarmBoxData)


    const [showFarm, setShowFarm] = useState(false);

    const [isLoading, setIsLoading] = useState(false);

    const formatNumber = number => {
        return number?.toLocaleString("pt-br", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })
    }

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
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
        }
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

                    onlyFarms.map((farms, i) => {
                        const totalByFarm = farmData.filter((farmName) => farmName.farmName === farms).reduce((acc, curr) => acc += curr.saldoAreaAplicar, 0)
                        return (
                            <View key={i}>
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
                                    <Text style={{fontSize: 10, color: Colors.secondary[200]}}>{formatNumber(totalByFarm)}</Text>
                                </Pressable>
                                {
                                    showFarm !== null && showFarm === farms && farmData.length > 0 &&
                                    farmData.filter((farmName) => farmName.farmName === farms).map((farmDatas, i) => {
                                        return (
                                            <View style={{marginBottom: 10 }} key={farmDatas.idAp}>
                                                <CardFarmBox data={farmDatas}/>
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