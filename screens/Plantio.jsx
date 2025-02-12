import { StyleSheet, Text, View, Alert, ActivityIndicator, SafeAreaView, RefreshControl } from 'react-native'
import { useEffect, useState } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler';


import { LINK } from '../utils/api';
import { EXPO_PUBLIC_REACT_APP_DJANGO_TOKEN } from "@env";
import { FlatList } from 'react-native-gesture-handler';
import FarmsPlantioScreen from '../components/Plantio';

import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

import { Colors } from '../constants/styles';

import { useDispatch } from "react-redux";
import { geralActions } from '../store/redux/geral';

const FarmsScreenCard = (itemData) => {
    return (
        <FarmsPlantioScreen
        data={itemData.item}
        />
    );
};
const PlantioScreen = () => {
    const dispatch = useDispatch()
    const { setColheitaData } = geralActions
    const [dataPlantioScreen, setDataPlantioScreen] = useState([]);
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);  // For pull-to-refresh

    
    const [groupedFarmsData, setGroupedFarmsData] = useState([]);
    const tabBarHeight = useBottomTabBarHeight(); 


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
                    Alert.alert('Tudo Certo', 'Dados Atualizados com sucesso!!')
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
        if (dataPlantioScreen?.length === 0) {
            const newData = handleUpdateApiData()
            // console.log("new data Here: ", newData)
        }
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
            <View style={{ flex: 1}}>
                    {
                        groupedFarmsData && (

                            <FlatList
                                contentInsetAdjustmentBehavior='automatic'
                                keyboardDismissMode='on-drag'
                                scrollEnabled={true}
                                contentContainerStyle={{paddingBottom: tabBarHeight, paddingTop: 10}}
                                data={groupedFarmsData}
                                keyExtractor={(item, i) => item.farm + i}
                                renderItem={FarmsScreenCard}
                                ItemSeparatorComponent={() => <View style={{ height: 13 }} />}
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
                            />
                        )
                    }
            </View>
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