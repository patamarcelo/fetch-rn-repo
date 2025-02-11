import { StyleSheet, Text, View } from 'react-native'
import { useState, useEffect } from 'react';

import { useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { selectColheitaData } from '../store/redux/selector';
const PlantioTalhoesDescription = () => {
    // Get route object
    const route = useRoute();
    const { farm } = route.params;
    const colheitaData = useSelector(selectColheitaData)
    const { data } = colheitaData

    const [filteredPlants, setFilteredPlants] = useState([]);
    console.log('data da colheira aqui:::::', data)

    useEffect(() => {
        if (colheitaData) {
            const filterArray = data.filter((plantio) => plantio.talhao__fazenda__nome === farm)
            console.log('filtered Here;::', filterArray)
            setFilteredPlants(filterArray)
        }
    }, []);

    return (
        <View>
            <Text>PlantioTalhoesDescription:</Text>
            <Text>{farm}</Text>
            {
                filteredPlants?.length > 0 &&
                filteredPlants.map((data) => {
                    return (
                        <Text key={data.talhao__id_talhao}>{data.talhao__id_talhao}</Text>
                    )
                })
            }
        </View>
    )
}

export default PlantioTalhoesDescription

const styles = StyleSheet.create({})