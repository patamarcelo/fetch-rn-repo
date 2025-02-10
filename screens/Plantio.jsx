import { StyleSheet, Text, View, Alert, ActivityIndicator } from 'react-native'
import { useEffect, useState } from 'react'


import { LINK } from '../utils/api';
import { EXPO_PUBLIC_REACT_APP_DJANGO_TOKEN } from "@env";

const PlantioScreen = () => {
    const [dataPlantioScreen, setDataPlantioScreen] = useState([]);
    const [isLoadingData, setIsLoadingData] = useState(false);

    useEffect(() => {
        const handleUpdateApiData = async () => {
            setIsLoadingData(true)
            try {
                const response = await fetch(LINK + "/plantio/get_colheita_plantio_info/", {
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
        <View style={styles.container}>
            <Text>Plantio  Screen</Text>
        </View>
    )
}

export default PlantioScreen

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    }
})