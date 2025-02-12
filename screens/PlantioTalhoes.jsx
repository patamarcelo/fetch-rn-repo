import { ScrollView, StyleSheet, Text, View, FlatList, SafeAreaView } from 'react-native'
import { useState, useEffect } from 'react';

import { useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { selectColheitaData } from '../store/redux/selector';
import PlantioTalhoesCard from '../components/PlantioTalhoes';

import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';






const PlantioTalhoesCardScreen = (itemData) => {
    return (
        <PlantioTalhoesCard
            data={itemData.item}
        />
    );
};
const PlantioTalhoesDescription = () => {
    const tabBarHeight = useBottomTabBarHeight();
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
        <View style={{ flex: 1 }}>
            {
                filteredPlants?.length > 0 &&
                <FlatList
                    contentInsetAdjustmentBehavior='automatic'
                    keyboardDismissMode='on-drag'
                    scrollEnabled={true}
                    contentContainerStyle={{ paddingBottom: tabBarHeight, paddingTop: 10 }}
                    data={filteredPlants}
                    keyExtractor={(item, i) => item.talhao__id_talhao}
                    renderItem={PlantioTalhoesCardScreen}
                    ItemSeparatorComponent={() => <View style={{ height: 13 }} />}
                />
            }
        </View>
    )
}

export default PlantioTalhoesDescription

const styles = StyleSheet.create({
    listContent: {
        paddingBottom: 100, // Adjust the value based on the height of the bottom tab
    }
})