import { StyleSheet, Text, View, Pressable, ScrollView, SafeAreaView, Animated as RealAnimated, TouchableOpacity } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'
import { selectColheitaDataFilter, selectColheitaDataToggle, selectCurrentFilterSelected } from '../store/redux/selector'
import { Colors } from '../constants/styles'
import { useState, useEffect, useRef } from 'react'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import Icon from "react-native-vector-icons/MaterialCommunityIcons"; // Uses MaterialCommunityIcons
import * as Haptics from 'expo-haptics';
import { geralActions } from '../store/redux/geral'

import Button from '../components/ui/Button'

import { FadeInRight, FadeOut, Layout, BounceIn, BounceOut } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';




const FilterPlantioScreen = ({ navigation }) => {
    const filterData = useSelector(selectColheitaDataFilter)
    const filters = useSelector(selectColheitaDataToggle)
    const dispatch = useDispatch()
    const { setColheitaFilter, clearColheitaFilter, setCurrentFilterSelected } = geralActions

    const { farm, proj, variety } = filterData
    console.log('filterData: ', filters)
    const tabBarHeight = useBottomTabBarHeight();
    const filterSelected = useSelector(selectCurrentFilterSelected)


    useEffect(() => {
        if (!filterSelected) {
            dispatch(setCurrentFilterSelected('fazenda'))
            const getIndex = handleFilterButons.findIndex(item => item.title === 'fazenda');
            RealAnimated.timing(selectedIndex, {
                toValue: getIndex,
                duration: 300, // Adjust for smoother transition
                useNativeDriver: false,
            }).start();
        }
    }, []);

    const handleSelect = (data, index) => {
        RealAnimated.timing(selectedIndex, {
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

    const selectedIndex = useRef(new RealAnimated.Value(0)).current;


    const backgroundColor1 = selectedIndex.interpolate({
        inputRange: [0, 1, 2, 3],
        outputRange: [Colors.primary[800], "#FFFFFF", "#FFFFFF", "#FFFFFF"], // First View active
    });

    const backgroundColor2 = selectedIndex.interpolate({
        inputRange: [0, 1, 2, 3],
        outputRange: ["#FFFFFF", Colors.primary[800], "#FFFFFF", "#FFFFFF"], // Second View active
    });

    const backgroundColor3 = selectedIndex.interpolate({
        inputRange: [0, 1, 2, 3],
        outputRange: ["#FFFFFF", "#FFFFFF", Colors.primary[800], "#FFFFFF"], // Third View active
    });
    const backgroundColor4 = selectedIndex.interpolate({
        inputRange: [0, 1, 2, 3],
        outputRange: ["#FFFFFF", "#FFFFFF", "#FFFFFF", Colors.primary[800]], // Third View active
    });
    const handleFilterButons = [
        { label: 'Fazenda', title: 'fazenda', filter: 'farm', backcolor: backgroundColor1 },
        { label: 'Projeto', title: 'projeto', filter: 'proj', backcolor: backgroundColor2 },
        { label: 'Cultura', title: 'cultura', filter: 'culture', backcolor: backgroundColor3 },
        { label: 'Variedade', title: 'variedade', filter: 'variety', backcolor: backgroundColor4 },
    ]

    useEffect(() => {
        if (filterSelected) {
            const getIndex = handleFilterButons.findIndex(item => item.title === filterSelected);
            RealAnimated.timing(selectedIndex, {
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

    const hasFilters = filters?.farm?.length > 0 || filters?.proj?.length > 0 || filters?.variety?.length > 0 || filters?.culture?.length > 0
    const getIndexOf = { 'fazenda': '0%', 'projeto': '25%', 'cultura': '50%', 'variedade': '75%' }
    return (
        <SafeAreaView style={styles.mainContaier}>
            <View style={styles.headerContainer}>
                <Animated.View
                    entering={FadeInRight.duration(300)} // Root-level animation for appearance
                    exiting={FadeOut.duration(300)} // Root-level animation for disappearance
                    layout={Layout.springify()}    // 
                    style={[
                        styles.percentBackground,
                        { backgroundColor: Colors.secondary[200] },
                        { width: '25%', height: '90%', marginLeft: getIndexOf[filterSelected], padding: 2 }, // Dynamic width based on percent
                    ]}
                />
                {
                    handleFilterButons.map((data, i) => {
                        return (
                            <TouchableOpacity onPress={handleSelect.bind(this, data.title, i)}
                                // style={[styles.filterPressbale, { backgroundColor: filterSelected === data.title && 'white' }]}
                                style={[styles.filterPressbale]}
                                key={i}
                            >
                                <RealAnimated.View
                                    key={i}
                                    style={[{ borderColor: data.backcolor, borderBottomWidth: filterSelected === data.title ? 1 : 0, padding: 10, justifyContent: 'center', alignItems: 'center' }]}
                                >
                                    <Text style={[{ fontWeight: 'bold', fontSize: 12, color: filters && filters[data.filter].length > 0 && 'green' }]}>{data.label}</Text>
                                </RealAnimated.View>
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
                        (filters === null || filters.culture?.length === 0
                            ? variety
                            : variety.filter((data) =>
                                filters.culture.some((cultura) => {
                                    console.log('data', data, 'cultura', cultura);
                                    return data.culture === cultura;
                                })
                            )
                        ).map((data, i) => {
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
                {
                    variety?.length > 0 && filterSelected === 'cultura' && (
                        [...new Set(variety.map(item => item.culture))].map((culture, i) => {
                            return (
                                <Pressable onPress={handleFilterData.bind(this, 'culture', culture)} key={i}
                                    style={({ pressed }) => [
                                        styles.farmContainer, { backgroundColor: i % 2 === 0 && Colors.secondary[100] },
                                        pressed && styles.pressed,
                                    ]}
                                >
                                    <Text style={[styles.farmTitle, { color: filters?.culture?.includes(culture) ? Colors.succes[400] : Colors.secondary[600] }]}>{culture}</Text>
                                    {
                                        filters?.culture?.includes(culture) &&
                                        <Icon name={'check-bold'} size={24} color={Colors.succes[300]} />
                                    }
                                </Pressable>
                            )
                        })
                    )
                }
            </ScrollView>
            <View style={[styles.fabContainer, { justifyContent: 'center', flex: 1, gap: 20, alignItems: 'flex-end', marginBottom: tabBarHeight }]}>
                {
                    hasFilters &&
                    <Button
                        btnStyles={{ width: 50, height: 50, borderRadius: '50%', backgroundColor: Colors.error[300] }}
                        onPress={handleClearFilters}
                        disabled={!hasFilters}
                    >
                        <Icon name="trash-can-outline" size={24} color="white" />
                    </Button>
                }
                <Button
                    btnStyles={{ width: 50, height: 50, borderRadius: '50%', backgroundColor: Colors.gold[500] }}
                    onPress={handleGoBack}
                >
                    <Icon name="arrow-left-bold" size={24} color={'white'} />
                </Button>
            </View>
        </SafeAreaView>
    )
}

export default FilterPlantioScreen

const styles = StyleSheet.create({
    percentBackground: {
        position: 'absolute',
        borderRadius: 6, // Match border radius with the parent wrapper
        zIndex: -1, // Ensure it stays behind the content
        shadowColor: '#000', // iOS shadow color
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 2, // Android shadow for the background
    },
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
        marginBottom: 0,
        position: 'relative',
        zIndex: 1, // Ensure it stays behind the content
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