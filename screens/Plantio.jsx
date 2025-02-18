import { StyleSheet, Platform, View, Alert, ActivityIndicator, SafeAreaView, RefreshControl, ScrollView } from 'react-native'
import { useEffect, useState } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler';


import { LINK } from '../utils/api';
import { EXPO_PUBLIC_REACT_APP_DJANGO_TOKEN } from "@env";
import { FlatList } from 'react-native-gesture-handler';
import FarmsPlantioScreen from '../components/Plantio';

import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

import { Colors } from '../constants/styles';

import { useDispatch, useSelector } from "react-redux";
import { geralActions } from '../store/redux/geral';
import ProgressCircleCard from '../components/Plantio/Geral';
import { selectColheitaData } from '../store/redux/selector';


import FilterPlantioScreen from '../components/Global/FilterPlantioComponent';

const FarmsScreenCard = (itemData) => {
    return (
        <FarmsPlantioScreen
            data={itemData.item}
        />
    );
};
const TotalFarmData = (itemData) => {
    return (
        <ProgressCircleCard
            sownArea={itemData.item.area}
            plannedArea={itemData.item.plannedArea}
            title="Total Semeado"
            plannedTitle="Total Planejado"
            abovePlannedTitle="Acima do Planejado"
        />
    );
};
const PlantioScreen = () => {
    const dispatch = useDispatch()
    const { setColheitaData } = geralActions
    const colheitaData = useSelector(selectColheitaData)
    const [dataPlantioScreen, setDataPlantioScreen] = useState([]);
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);  // For pull-to-refresh


    const [groupedFarmsData, setGroupedFarmsData] = useState([]);
    const tabBarHeight = useBottomTabBarHeight();

    const [totalArea, setTotalArea] = useState(0);
    const [totalAreaColhida, setTotalAreaColhida] = useState(0);
    const [totalScsColhidos, setTotalScsColhidos] = useState(0);
    const [mediaGeral, setMediaGeral] = useState(0);

    useEffect(() => {
        if (colheitaData) {
            let totalAreaHere = 0
            let totalParcialHere = 0
            colheitaData?.grouped_data?.forEach(element => {
                element.variedades?.forEach(element => {
                    totalAreaHere += element.colheita
                    totalParcialHere += element.parcial
                });
            });
            setTotalArea(totalAreaHere)
            setTotalAreaColhida(totalParcialHere)

            let totalGeral = 0
            colheitaData.data.forEach((data) => {
                if (data?.cargas?.length > 0) {
                    const newTotal = data?.cargas[0].total_peso_liquido
                    totalGeral += newTotal
                }
            })
            const totalScs = totalGeral > 0 ? (totalGeral / 60) : 0
            setTotalScsColhidos(totalScs)
            const media = totalScs / totalParcialHere
            setMediaGeral(media)
        }
    }, []);

    useEffect(() => {
        if (colheitaData) {
            let totalAreaHere = 0
            let totalParcialHere = 0
            colheitaData?.grouped_data?.forEach(element => {
                element.variedades?.forEach(element => {
                    totalAreaHere += element.colheita
                    totalParcialHere += element.parcial
                });
            });
            setTotalArea(totalAreaHere)
            setTotalAreaColhida(totalParcialHere)

            let totalGeral = 0
            colheitaData.data.forEach((data) => {
                if (data?.cargas?.length > 0) {
                    const newTotal = data?.cargas[0].total_peso_liquido
                    totalGeral += newTotal
                }
            })
            const totalScs = totalGeral > 0 ? (totalGeral / 60) : 0
            setTotalScsColhidos(totalScs)
            const media = totalScs / totalParcialHere
            setMediaGeral(media)
        }
    }, [colheitaData]);



    useEffect(() => {
        const handleUpdateApiData = async () => {
            setIsLoadingData(true)
            try {
                const response = await fetch(LINK + "/plantio/get_colheita_plantio_info_react_native/", {
                    method: "POST",
                    body: JSON.stringify({
                        safra: "2024/2025",
                        ciclo: "3",
                    }),
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Token ${EXPO_PUBLIC_REACT_APP_DJANGO_TOKEN}`,
                    },
                });
                // console.log('response : ', response)
                if (response.status === 200) {
                    // Alert.alert('Tudo Certo', 'Dados Atualizados com sucesso!!')
                    const data = await response.json();
                    // console.log('resposta here:::', data)
                    setGroupedFarmsData(data?.grouped_data)
                    dispatch(setColheitaData(data))
                    return data
                }

            } catch (error) {
                console.error(error);
                setIsLoadingData(false)
                Alert.alert('Problema em atualizar o banco de dados', `Erro: ${error}`)
            } finally {
                setIsLoadingData(false)
            }
        }
        if (!colheitaData){
            const newData = handleUpdateApiData()
            console.log("new data Here: ", newData)
        }
        console.log('colheitaData', colheitaData)
    }, []);

    const handleUpdateApiData = async () => {
        setIsRefreshing(true)
        try {
            const response = await fetch(LINK + "/plantio/get_colheita_plantio_info_react_native/", {
                method: "POST",
                body: JSON.stringify({
                    safra: "2024/2025",
                    ciclo: "3",
                }),
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Token ${EXPO_PUBLIC_REACT_APP_DJANGO_TOKEN}`,
                },
            });
            // console.log('response : ', response)
            if (response.status === 200) {
                Alert.alert('Tudo Certo', 'Dados Atualizados com sucesso!!')
                const data = await response.json();
                // console.log('resposta here:::', data)
                setGroupedFarmsData(data?.grouped_data)
                dispatch(setColheitaData(data))
                return data
            }

        } catch (error) {
            console.error(error);
            setIsRefreshing(false)
            Alert.alert('Problema em atualizar o banco de dados', `Erro: ${error}`)
        } finally {
            console.log('Finally block reached');  //
            setIsRefreshing(false)
        }
    }

    if (isLoadingData) {
        return (
            <View style={styles.containerActivity} >
                <ActivityIndicator size="large" color="#1E90FF" />
            </View>
        )
    }
    return (
        <GestureHandlerRootView style={styles.containerGesture}>
            {/* <GestureHandlerRootView style={[styles.containerGesture, { paddingBottom: tabBarHeight, paddingTop: 10, flex: 1 }]}> */}
            <ScrollView
                style={{
                    paddingBottom: tabBarHeight, flex: 1
                }}
                contentContainerStyle={{
                    paddingBottom: tabBarHeight,
                    flexGrow: 1,  // Ensures ScrollView content takes all available space
                }}
                contentInsetAdjustmentBehavior='automatic'
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing} // Make sure this comes from state
                        onRefresh={() => {
                            console.log('Pull-to-refresh triggered');
                            handleUpdateApiData();
                        }}
                        colors={[Colors.primary[200], Colors.primary[400], Colors.primary[600]]}
                        tintColor={Colors.primary500}
                    />
                }
            >
                {
                    colheitaData?.grouped_data?.length > 0 && (
                        <>
                            <ProgressCircleCard
                                sownArea={totalAreaColhida}
                                plannedArea={totalArea}
                                mediaGeral={mediaGeral > 0 ? mediaGeral : 0}
                                scsTotal={totalScsColhidos}
                                title={"Colhido"}
                                plannedTitle={"Plantado"}
                                abovePlannedTitle={"A Colher"}
                            />
                            {
                                colheitaData?.grouped_data?.map((data, i) => {
                                    return (
                                        <FarmsPlantioScreen data={data} key={i} />
                                    )
                                })
                            }
                            {/* <FlatList
                                contentInsetAdjustmentBehavior='automatic'
                                keyboardDismissMode='on-drag'
                                scrollEnabled={true}
                                contentContainerStyle={{ paddingBottom: tabBarHeight, paddingTop: 10 }}
                                data={groupedFarmsData}
                                keyExtractor={(item, i) => item.farm + i}
                                renderItem={FarmsScreenCard}
                                ItemSeparatorComponent={() => <View style={{ height: 5 }} />}
                                refreshControl={(
                                    <RefreshControl
                                        refreshing={isRefreshing}
                                        onRefresh={() => {
                                            console.log('Pull-to-refresh triggered'); // Debugging
                                            handleUpdateApiData()
                                        }}  // Pull-to-refresh logic
                                        colors={["#9Bd35A", "#689F38"]}
                                        tintColor={Colors.primary500}
                                    />
                                )}
                            /> */}
                        </>
                    )
                }
            </ScrollView>
            {
                colheitaData?.grouped_data?.length > 0 && (
                    <FilterPlantioScreen />
                )
            }
        </GestureHandlerRootView>
    )
}

export default PlantioScreen

const styles = StyleSheet.create({
    containerGesture: {
        flex: 1
    },
    container: {
        flex: 1,
        paddingTop: 5
        // justifyContent: 'center',
        // alignItems: 'center'
    },
    containerActivity: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    }
})