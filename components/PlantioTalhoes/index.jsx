import { StyleSheet, Text, View, ScrollView } from 'react-native'
import { useState, useEffect } from 'react'
import { Colors } from '../../constants/styles'
import { Pressable } from 'react-native'

import { LINK } from '../../utils/api'
import { EXPO_PUBLIC_REACT_APP_DJANGO_TOKEN } from "@env";

import { Card, Title, Paragraph, DataTable } from 'react-native-paper';
import TabelaTalhoesScreen from './TableTalhoes'

import * as ScreenOrientation from 'expo-screen-orientation';




const PlantioTalhoesCard = (props) => {
    const { data } = props
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [showTruckData, setShowTruckData] = useState([]);
    const [canRotate, setCanRotate] = useState(false);



    const handleUpdateApiData = async (idText) => {
        setIsLoadingData(true)
        try {
            const response = await fetch(LINK + `/colheita/${idText}/get_colheita_detail_react_native/`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Token ${EXPO_PUBLIC_REACT_APP_DJANGO_TOKEN}`,
                },
            });
            if (response.status === 201) {
                // Alert.alert('Tudo Certo', 'Dados Atualizados com sucesso!!')
                const data = await response.json();
                // console.log('resposta here:::', data)
                setShowTruckData(data?.data)
                return data
            }
        } catch (error) {
            console.error(error);
            setIsLoadingData(false)
            Alert.alert('Problema em atualizar o banco de dados', `Erro: ${error}`)
        } finally {
            console.log('Finally block reached');  //
            setIsLoadingData(false)
            // Lock to landscape mode on press
            // setCanRotate(true);
            // await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        };
    }

    // useEffect(() => {
    //     // Lock the orientation to portrait by default when the component mounts
    //     if (!canRotate) {
    //         ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    //     }

    //     return () => {
    //         // Lock orientation back to portrait when the component is unmounted or leaves the screen
    //         if (!canRotate) {
    //             ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    //         }
    //     };
    // }, [canRotate]);  // Re-run effect when canRotate state changes


    const handlePress = async (dataPressed) => {
        const idToFind = Number(dataPressed.id)
        const data = await handleUpdateApiData(idToFind)
        console.log('response data here: ', data)
    }

    return (
        <Pressable
            style={({ pressed }) => [
                styles.mainContainer,
                pressed && styles.pressed,
                { backgroundColor: data?.cargas ? 'green' : Colors.secondary[100] }
            ]}
            disabled={showTruckData?.length > 0}
            onPress={handlePress.bind(this, data)}
        >
            <Text>{data.talhao__id_talhao}</Text>
            <Text>PlantioTalhoesCard</Text>
            <Text>PlantioTalhoesCard</Text>
            {
                showTruckData?.length > 0 && (
                    <TabelaTalhoesScreen data={showTruckData} />
                )
            }
        </Pressable>
    )
}

export default PlantioTalhoesCard

const styles = StyleSheet.create({

    mainContainer: {
        backgroundColor: Colors.secondary[100],
        borderWidth: 0.5,
        marginHorizontal: 5,
        borderRadius: 5,
        flex: 1,
        padding: 2,
        paddingHorizontal: 5
    },
    pressed: {
        opacity: 0.5,
    },
})