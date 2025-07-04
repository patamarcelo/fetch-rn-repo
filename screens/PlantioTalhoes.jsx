import { View, FlatList, Text, Platform, StatusBar, RefreshControl, Alert, StyleSheet, SafeAreaView as SaveView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';



import { useRoute } from '@react-navigation/native';
import { useSelector, shallowEqual, useDispatch } from 'react-redux';
import { selectColheitaData } from '../store/redux/selector';
import PlantioTalhoesCard from '../components/PlantioTalhoes';

import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import FilterPlantioComponent from '../components/Global/FilterPlantioComponent';

import { useEffect, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { Colors } from '../constants/styles';


import { geralActions } from '../store/redux/geral';
import { LINK } from '../utils/api';
import { EXPO_PUBLIC_REACT_APP_DJANGO_TOKEN } from "@env";
import dayjs from 'dayjs';
import { FAB } from "react-native-paper"; // Floating Action Button
import * as Haptics from 'expo-haptics';



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
    const insets = useSafeAreaInsets(); // Get dynamic insets for Android & iOS
    // Get route object
    const route = useRoute();
    const { farm } = route.params;
    const colheitaData = useSelector(selectColheitaData, shallowEqual);
    const { data } = colheitaData
    const { setColheitaData } = geralActions

    const [isRefreshing, setIsRefreshing] = useState(false);  // For pull-to-refresh
    const dispatch = useDispatch()

    const [filterByDate, setFilterByDate] = useState(false);
    const [filterdByLoad, setFilterdByLoad] = useState(false);
    const [filteredNotLoading, setFilteredNotLoading] = useState(false);


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

    const daysUntilFutureDate = (dateStr, daysToAdd) => {
        // Parse the given date
        const futureDate = dayjs(dateStr).add(daysToAdd, "day");

        // Get today's date
        const today = dayjs().startOf("day");

        // Calculate the difference in days
        return futureDate.diff(today, "day");
    };

    const handleFilterPlant = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
        setFilterByDate(!filterByDate)
    }
    const handleFilterLoad = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
        setFilterdByLoad(!filterdByLoad)
    }
    const handleFilterNotLoad = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
        setFilteredNotLoading(!filteredNotLoading)
    }

    return (
        <>

            {
                filteredDataResults?.length === 0 ? (

                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: Colors.secondary[600] }}>Sem Resultados para o Filtro Selecionado</Text>
                    </View>
                )
                    :

                    <SafeAreaView
                        contentInsetAdjustmentBehavior='automatic'
                        style={{
                            flex: 1,
                            paddingTop: Platform.OS === 'android' && insets.top + 22
                        }}
                    >
                        <FlatList
                            key={farm}
                            contentInsetAdjustmentBehavior='automatic'
                            // keyboardDismissMode='on-drag'
                            scrollEnabled={true}
                            contentContainerStyle={{ paddingBottom: tabBarHeight+ 50, paddingTop: 10 }}
                            data={
                                data
                                .filter((plantio) => plantio.talhao__fazenda__nome === farm)
                                .filter((plantio) => filterdByLoad ? plantio.area_parcial > 0 : true)
                                .filter((plantio) => filteredNotLoading ? plantio.area_parcial === null : true)
                                .sort((a, b) => filterByDate ? daysUntilFutureDate(a.data_plantio, a.variedade__dias_ciclo) - daysUntilFutureDate(b.data_plantio, b.variedade__dias_ciclo) : 0)
                            }
                            keyExtractor={(item, i) => item.id.toString()}
                            renderItem={PlantioTalhoesCardScreen}
                            ItemSeparatorComponent={() => <View style={{ height: 13 }} />}
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
                        />
                        <FilterPlantioComponent />
                        <SaveView style={styles.fabContainer}>
                            <FAB
                                style={[styles.fab, {marginBottom: tabBarHeight}]}
                                icon={filterByDate ? "calendar" : "sort-alphabetical-variant"}
                                color="black" // Icon color
                                onPress={handleFilterPlant}
                            />
                        </SaveView>
                        <SaveView style={styles.fabContainer2}>
                            <FAB
                                style={[styles.fab, {marginBottom: tabBarHeight, backgroundColor: filterdByLoad ? 'rgba(153,204,153,0.4)' : 'rgba(200, 200, 200, 0.3)'}]}
                                icon={"truck"}
                                color="black" // Icon color
                                onPress={handleFilterLoad}
                                disabled={filteredNotLoading} // Disable if `filteredNotLoading` is false
                            />
                        </SaveView>
                        <SaveView style={styles.fabContainer3}>
                            <FAB
                                style={[styles.fab, {marginBottom: tabBarHeight, backgroundColor: filteredNotLoading ? 'rgba(255,102,102,0.4)' : 'rgba(200, 200, 200, 0.3)'}]}
                                icon={"truck-remove"}
                                color="black" // Icon color
                                onPress={handleFilterNotLoad}
                                disabled={filterdByLoad} // Disable if `filteredNotLoading` is false
                            />
                        </SaveView>
                    </SafeAreaView>
            }
        </>

    )
}

export default PlantioTalhoesDescription

const styles = StyleSheet.create({
    fabContainer3: {
        position: "absolute",
        right: 240,
        bottom: 20
    },
    fabContainer2: {
        position: "absolute",
        right: 180,
        bottom: 20
    },
    fabContainer: {
        position: "absolute",
        right: 120,
        bottom: 20
    },
    fab: {
        position: "absolute",
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(200, 200, 200, 0.3)", // Grey, almost transparent
        width: 50,
        height: 50,
        borderRadius: 25, // Makes it perfectly circular
        justifyContent: "center",
        alignItems: "center",
        elevation: 4,
        borderColor: Colors.primary[300],
        borderWidth: 1
    },
})