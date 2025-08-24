import { StyleSheet, Platform, Pressable, View, Alert, ActivityIndicator, SafeAreaView, RefreshControl, ScrollView, Text } from 'react-native'
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
import { selectColheitaData, selectColheitaDataToggle } from '../store/redux/selector';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'; // ou qualquer outro ícone



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
    const { setColheitaData, clearColheitaFilter } = geralActions
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

    const filters = useSelector(selectColheitaDataToggle)

    const safraCiclo = {
        safra: "2025/2026",
        ciclo: "1",
    }

    useEffect(() => {
        if (colheitaData) {
            let totalAreaHere = 0
            let totalParcialHere = 0

            const cultureFilter = filters?.culture?.length > 0 ? filters.culture : null;
            const varietyFilter = filters?.variety?.length > 0 ? filters.variety : null;


            colheitaData.grouped_data?.forEach(grouped => {
                grouped.variedades?.forEach(variedade => {
                    const matchCulture = !cultureFilter || cultureFilter.includes(variedade.cultura);
                    const matchVariety = !varietyFilter || varietyFilter.includes(variedade.variedade);

                    if (matchCulture && matchVariety) {
                        totalAreaHere += variedade.colheita || 0;
                        totalParcialHere += variedade.parcial || 0;
                    }
                });
            });


            setTotalArea(totalAreaHere)
            setTotalAreaColhida(totalParcialHere)

            let totalGeral = 0
            colheitaData.data.forEach((data) => {
                const matchCulture = !cultureFilter || cultureFilter.includes(data.variedade__cultura__cultura);
                const matchVariety = !varietyFilter || varietyFilter.includes(data.variedade__nome_fantasia);
                if (data?.cargas?.length > 0 && matchCulture && matchVariety) {
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
            let totalAreaHere = 0;
            let totalParcialHere = 0;


            const cultureFilter = filters?.culture?.length > 0 ? filters.culture : null;
            const varietyFilter = filters?.variety?.length > 0 ? filters.variety : null;

            colheitaData.grouped_data?.forEach(grouped => {
                grouped.variedades?.forEach(variedade => {
                    const matchCulture = !cultureFilter || cultureFilter.includes(variedade.cultura);
                    const matchVariety = !varietyFilter || varietyFilter.includes(variedade.variedade);

                    if (matchCulture && matchVariety) {
                        totalAreaHere += variedade.colheita || 0;
                        totalParcialHere += variedade.parcial || 0;
                    }
                });
            });

            setTotalArea(totalAreaHere);
            setTotalAreaColhida(totalParcialHere);

            let totalGeral = 0;
            colheitaData.data?.forEach(data => {
                // console.log('data inside here: ', data )
                console.log('data inside here: ', data.variedade__cultura__cultura)
                console.log('data culture filter:: ', cultureFilter)
                const matchCulture = !cultureFilter || cultureFilter.includes(data.variedade__cultura__cultura);
                const matchVariety = !varietyFilter || varietyFilter.includes(data.variedade__nome_fantasia);
                console.log('matchCulture', matchCulture)
                console.log('matchVariety', matchVariety)
                if (matchCulture && matchVariety) {
                    const peso = data?.cargas?.[0]?.total_peso_liquido;
                    if (peso) totalGeral += peso;
                }
            });
            const totalScs = totalGeral > 0 ? (totalGeral / 60) : 0;
            console.log('total GEral sacs:  ', totalScs)
            setTotalScsColhidos(totalScs);

            const media = totalParcialHere > 0 ? totalScs / totalParcialHere : 0;
            setMediaGeral(media);
        }
    }, [colheitaData]);


    useEffect(() => {
        const handleUpdateApiData = async () => {
            setIsLoadingData(true)
            try {
                const response = await fetch(LINK + "/plantio/get_colheita_plantio_info_react_native/", {
                    method: "POST",
                    body: JSON.stringify(safraCiclo),
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Token ${EXPO_PUBLIC_REACT_APP_DJANGO_TOKEN}`,
                    },
                });
                console.log('response : ', response)
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
                Alert.alert('Problema em atualizar o banco de dados here', `Erro: ${error}`)
            } finally {
                setIsLoadingData(false)
            }
        }
        if (!colheitaData) {
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
                body: JSON.stringify(safraCiclo),
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Token ${EXPO_PUBLIC_REACT_APP_DJANGO_TOKEN}`,
                },
            });
            console.log('response : ', response)
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
            Alert.alert('Problema em atualizar o banco de dados manualmente', `Erro: ${error}`)
        } finally {
            console.log('Finally block reached');  //
            setIsRefreshing(false)
        }
    }

    const handleClearFilters = () => {
        dispatch(clearColheitaFilter());
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
                        colors={[Colors.secondary[100], Colors.secondary[200], Colors.secondary[300]]}
                        tintColor={Colors.secondary[100]}
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
                                    const newArr = colheitaData.data.filter(cargasArr =>
                                        cargasArr.talhao__fazenda__nome === data.farm
                                    );
                                    const onlyCargas = newArr.flatMap(data => data.cargas || []);
                                    return (
                                        <FarmsPlantioScreen data={data} key={i} newData={onlyCargas} />
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
                {
                    colheitaData?.grouped_data?.length === 0 && filters && (
                        <View
                            style={{
                                padding: 20,
                                margin: 20,
                                backgroundColor: Colors.secondary[50],
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: Colors.secondary[200],
                                alignItems: 'center',
                                justifyContent: 'center',
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.1,
                                shadowRadius: 6,
                                elevation: 3,
                            }}
                        >
                            <Icon name="magnify-remove-outline" size={48} color={Colors.secondary[400]} />
                            <Text
                                style={{
                                    marginTop: 12,
                                    fontSize: 16,
                                    fontWeight: '500',
                                    color: Colors.secondary[600],
                                    textAlign: 'center',
                                }}
                            >
                                Nenhum resultado encontrado com os filtros selecionados.
                            </Text>

                            <Pressable
                                onPress={handleClearFilters} // certifique-se que essa função existe
                                style={({ pressed }) => [
                                    {
                                        marginTop: 20,
                                        backgroundColor: Colors.primary[500],
                                        paddingVertical: 10,
                                        paddingHorizontal: 20,
                                        borderRadius: 8,
                                        opacity: pressed ? 0.8 : 1,
                                    },
                                ]}
                            >
                                <Text style={{ color: '#fff', fontWeight: '600' }}>
                                    Limpar Filtros
                                </Text>
                            </Pressable>
                        </View>
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