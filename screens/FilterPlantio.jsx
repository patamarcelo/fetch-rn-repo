import { StyleSheet, Text, View, Pressable, ScrollView, SafeAreaView, Animated, TouchableOpacity } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'
import { selectColheitaDataFilter, selectColheitaDataToggle, selectCurrentFilterSelected } from '../store/redux/selector'
import { Colors } from '../constants/styles'
import { useState, useEffect, useRef } from 'react'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import Icon from "react-native-vector-icons/MaterialCommunityIcons"; // Uses MaterialCommunityIcons
import * as Haptics from 'expo-haptics';
import { geralActions } from '../store/redux/geral'

import Button from '../components/ui/Button'



const FilterPlantioScreen = ({navigation}) => {
    const filterData = useSelector(selectColheitaDataFilter)
    const filters = useSelector(selectColheitaDataToggle)
    const dispatch = useDispatch()
    const { setColheitaFilter, clearColheitaFilter, setCurrentFilterSelected } = geralActions

    const { farm, proj, variety } = filterData
    const tabBarHeight = useBottomTabBarHeight();
    const filterSelected = useSelector(selectCurrentFilterSelected)

    useEffect(() => {
        if(!filterSelected){
            dispatch(setCurrentFilterSelected('fazenda'))
            const getIndex = handleFilterButons.findIndex(item => item.title === 'fazenda');
            Animated.timing(selectedIndex, {
                toValue: getIndex,
                duration: 300, // Adjust for smoother transition
                useNativeDriver: false,
            }).start();
        }
    }, []);

    const handleSelect = (data, index) => {
        Animated.timing(selectedIndex, {
            toValue: index,
            duration: 300, // Adjust for smoother transition
            useNativeDriver: false,
        }).start();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
        dispatch(setCurrentFilterSelected(data))
    }

    const handleFilterData = (type, data) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
        console.log('tipo de filtro: ', type)
        console.log('filtro selected: ', data)
        dispatch(setColheitaFilter({ key: type, value: data }));
    }

    const selectedIndex = useRef(new Animated.Value(0)).current;


    const backgroundColor1 = selectedIndex.interpolate({
        inputRange: [0, 1, 2],
        outputRange: [Colors.primary[800], "#FFFFFF", "#FFFFFF"], // First View active
    });

    const backgroundColor2 = selectedIndex.interpolate({
        inputRange: [0, 1, 2],
        outputRange: ["#FFFFFF", Colors.primary[800], "#FFFFFF"], // Second View active
    });

    const backgroundColor3 = selectedIndex.interpolate({
        inputRange: [0, 1, 2],
        outputRange: ["#FFFFFF", "#FFFFFF", Colors.primary[800]], // Third View active
    });
    const handleFilterButons = [
        { label: 'Fazenda', title: 'fazenda', filter: 'farm', backcolor: backgroundColor1 },
        { label: 'Projeto', title: 'projeto', filter: 'proj', backcolor: backgroundColor2 },
        { label: 'Variedade', title: 'variedade', filter: 'variety', backcolor: backgroundColor3 },
    ]

    useEffect(() => {
        if(filterSelected){
            const getIndex = handleFilterButons.findIndex(item => item.title === filterSelected);
            Animated.timing(selectedIndex, {
                toValue: getIndex,
                duration: 300, // Adjust for smoother transition
                useNativeDriver: false,
            }).start();
        }
    }, [filterSelected]);

    const handleClearFilters = () => {
        dispatch(clearColheitaFilter());
    }
    
    const handleGoBack = () => {
        navigation.goBack()
    }

    useEffect(() => {
        console.log('filters', filters)
    }, [filters]);

    const hasFilters = filters?.farm?.length > 0 || filters?.proj?.length > 0 || filters?.variety?.length > 0
    return (
        <SafeAreaView style={styles.mainContaier}>
            <View style={styles.headerContainer}>
                {
                    handleFilterButons.map((data, i) => {
                        return (
                            <TouchableOpacity onPress={handleSelect.bind(this, data.title, i)}
                                // style={[styles.filterPressbale, { backgroundColor: filterSelected === data.title && 'white' }]}
                                style={[styles.filterPressbale]}
                                key={i}
                            >
                                <Animated.View
                                    key={i}
                                    style={[{ borderColor: data.backcolor ,borderBottomWidth: filterSelected === data.title ? 1 : 0,  padding: 10,justifyContent: 'center', alignItems: 'center' }]}
                                >
                                    <Text style={[{fontWeight: 'bold', fontSize: 18, color: filters && filters[data.filter].length > 0 && 'green' }]}>{data.label}</Text>
                                </Animated.View>
                            </TouchableOpacity>
                        )
                    })
                }


            </View>
            <ScrollView style={{ paddingBottom: tabBarHeight }} >
                {
                    farm?.length > 0 && filterSelected === 'fazenda' && (
                        farm.slice().sort((a, b) => a.localeCompare(b)).map((data, i) => {
                            return (
                                <Pressable onPress={handleFilterData.bind(this, 'farm', data)} key={i}
                                    style={({ pressed }) => [
                                        styles.farmContainer, { backgroundColor: i % 2 === 0 && Colors.secondary[100] },
                                        pressed && styles.pressed,
                                    ]}
                                >
                                    <Text style={[styles.farmTitle, { color: filters?.farm?.includes(data) ? Colors.succes[400] : Colors.secondary[600] }]}>{data.replace('Fazenda', '')}</Text>
                                    {
                                        filters?.farm?.includes(data) &&
                                        <Icon name={'check-bold'} size={24} color={Colors.succes[300]} />
                                    }
                                </Pressable>
                            )
                        })
                    )
                }
                {
                    proj?.length > 0 && filterSelected === 'projeto' && (
                        proj.slice().sort((a, b) => a.localeCompare(b)).map((data, i) => {
                            return (
                                <Pressable onPress={handleFilterData.bind(this, 'proj', data)} key={i}
                                    style={({ pressed }) => [
                                        styles.farmContainer, { backgroundColor: i % 2 === 0 && Colors.secondary[100] },
                                        pressed && styles.pressed,
                                    ]}
                                >
                                    <Text style={[styles.farmTitle, { color: filters?.proj?.includes(data) ? Colors.succes[400] : Colors.secondary[600] }]}>{data.replace('Projeto', '')}</Text>
                                    {
                                        filters?.proj?.includes(data) &&
                                        <Icon name={'check-bold'} size={24} color={Colors.succes[300]} />
                                    }
                                </Pressable>
                            )
                        })
                    )
                }
                {
                    variety?.length > 0 && filterSelected === 'variedade' && (
                        variety.map((data, i) => {
                            return (
                                <Pressable onPress={handleFilterData.bind(this, 'variety', data.variety)} key={i}
                                    style={({ pressed }) => [
                                        styles.farmContainer, { backgroundColor: i % 2 === 0 && Colors.secondary[100] },
                                        pressed && styles.pressed,
                                    ]}
                                >
                                    <Text style={[styles.farmTitle, { color: filters?.variety?.includes(data.variety) ? Colors.succes[400] : Colors.secondary[600] }]}>{data.variety.replace('Arroz ', '')}</Text>
                                    {
                                        filters?.variety?.includes(data.variety) &&
                                        <Icon name={'check-bold'} size={24} color={Colors.succes[300]} />
                                    }
                                </Pressable>
                            )
                        })
                    )
                }
            </ScrollView>
            <View style={[styles.fabContainer, { justifyContent: 'center', flex: 1, gap: 20, alignItems: 'flex-end', marginBottom: tabBarHeight }]}>
                <Button
                    btnStyles={{ width: 50, height: 50, borderRadius: '50%', backgroundColor: Colors.gold[500] }}
                    onPress={handleGoBack}
                >
                    <Icon name="arrow-left-bold" size={24} color={'white'} />
                </Button>
                <Button
                    btnStyles={{ width: 50, height: 50, borderRadius: '50%', backgroundColor: Colors.error[300] }}
                    onPress={handleClearFilters}
                    disabled={!hasFilters}
                >
                    <Icon name="trash-can-outline" size={24} color="white" />
                </Button>
            </View>
        </SafeAreaView>
    )
}

export default FilterPlantioScreen

const styles = StyleSheet.create({
    fabContainer: {
        position: "absolute",
        right: 20,
        bottom: 20
    },
    farmTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.secondary[600]
    },
    farmContainer: {
        padding: 10,
        justifyContent: 'space-between',
        flexDirection: 'row'
    },
    filterPressbale: {
        // paddingHorizontal: 10,
        // paddingVertical: 10,
        flex: 1,
    },
    filterTitle: {
        fontWeight: 'bold',
        color: Colors.primary[800],
        fontSize: 14,
        textAlign: 'center'
    },
    headerContainer: {
        // flex: 1,
        justifyContent: 'space-between',
        flexDirection: 'row',
        backgroundColor: 'whitesmoke',
        marginBottom: 0
    },
    mainContaier: {
        flex: 1,
        // marginTop: 180,
        // justifyContent: 'center',
        // alignItems: 'center'
    },
    pressed: {
        opacity: 0.7,
        // backgroundColor: Colors.succes[100]
    },
})