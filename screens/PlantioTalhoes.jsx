import { ScrollView, StyleSheet, Text, View, FlatList, SafeAreaView } from 'react-native'
import { useState, useEffect } from 'react';

import { useRoute } from '@react-navigation/native';
import { useSelector, shallowEqual } from 'react-redux';
import { selectColheitaData } from '../store/redux/selector';
import PlantioTalhoesCard from '../components/PlantioTalhoes';

import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import FilterPlantioComponent from '../components/Global/FilterPlantioComponent';






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
    const colheitaData = useSelector(selectColheitaData, shallowEqual);
    const { data } = colheitaData
    
    return (
        <>
            <FlatList
                key={farm}  
                contentInsetAdjustmentBehavior='automatic'
                // keyboardDismissMode='on-drag'
                scrollEnabled={true}
                contentContainerStyle={{ paddingBottom: tabBarHeight, paddingTop: 10 }}
                data={data.filter((plantio) => plantio.talhao__fazenda__nome === farm)}
                keyExtractor={(item, i) => item.id.toString()}
                renderItem={PlantioTalhoesCardScreen}
                ItemSeparatorComponent={() => <View style={{ height: 13 }} />}
            />
            <FilterPlantioComponent />
        </>

    )
}

export default PlantioTalhoesDescription