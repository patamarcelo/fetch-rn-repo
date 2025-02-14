import { View, FlatList, Text } from 'react-native'

import { useRoute } from '@react-navigation/native';
import { useSelector, shallowEqual } from 'react-redux';
import { selectColheitaData } from '../store/redux/selector';
import PlantioTalhoesCard from '../components/PlantioTalhoes';

import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import FilterPlantioComponent from '../components/Global/FilterPlantioComponent';

import { useEffect } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { Colors } from '../constants/styles';








const PlantioTalhoesCardScreen = (itemData) => {
    return (
        <PlantioTalhoesCard
            data={itemData.item}
        />
    );
};
const PlantioTalhoesDescription = ({ navigation }) => {
    const tabBarHeight = useBottomTabBarHeight();
    const isFocused = useIsFocused(); // Track screen focus
    // Get route object
    const route = useRoute();
    const { farm } = route.params;
    const colheitaData = useSelector(selectColheitaData, shallowEqual);
    const { data } = colheitaData


    // Filter data based on farm
    const filteredDataResults = data.filter((plantio) => plantio.talhao__fazenda__nome === farm);


    // Navigate to another screen if filteredData is empty
    useEffect(() => {
        if (isFocused) {
            if (filteredDataResults.length === 0) {
                setTimeout(() => {
                    navigation.navigate('PlantioScreen')
                }, 600);
            }
        }
    }, [isFocused]);

    return (
        <>

            {
                filteredDataResults?.length === 0 ? (

                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: Colors.secondary[600] }}>Sem Resultados para o Filtro Selecionado</Text>
                    </View>
                )
                    :

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
            }
        </>

    )
}

export default PlantioTalhoesDescription