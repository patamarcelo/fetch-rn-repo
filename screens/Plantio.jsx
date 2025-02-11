import { StyleSheet, Text, View, Alert, ActivityIndicator, SafeAreaView } from 'react-native'
import { useEffect, useState } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler';


import { LINK } from '../utils/api';
import { EXPO_PUBLIC_REACT_APP_DJANGO_TOKEN } from "@env";
import { FlatList } from 'react-native-gesture-handler';
import FarmsPlantioScreen from '../components/Plantio';

import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';



const FarmsScreenCard = (itemData) => {
    return (
        <FarmsPlantioScreen
        data={itemData.item}
        />
    );
};
const PlantioScreen = () => {
    const [dataPlantioScreen, setDataPlantioScreen] = useState([]);
    const [isLoadingData, setIsLoadingData] = useState(false);
    
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
                console.log('response : ', response)
                if (response.status === 200) {
                    Alert.alert('Tudo Certo', 'Aplicações Atualizadas com sucesso!!')
                    const data = await response.json();
                    console.log('resposta here:::', data)
                    setGroupedFarmsData(data?.grouped_data)
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
            console.log("new data Here: ", newData)
        }
    }, []);
    if (isLoadingData) {
        return (
            <View style={styles.container} >
                <ActivityIndicator size="large" color="#1E90FF" />
            </View>
        )
    }
    return (
        <GestureHandlerRootView style={styles.containerGesture}>
            <SafeAreaView style={{ flex: 1, marginBottom: tabBarHeight }}>

                <View style={styles.container}>
                    {
                        groupedFarmsData && (

                            <FlatList
                                scrollEnabled={true}
                                data={groupedFarmsData}
                                keyExtractor={(item, i) => item.farm + i}
                                renderItem={FarmsScreenCard}
                                ItemSeparatorComponent={() => <View style={{ height: 13 }} />}
                            />
                        )
                    }
                </View>
            </SafeAreaView>
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
    }
})