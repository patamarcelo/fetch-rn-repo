import { StyleSheet, Text, View, Pressable, ScrollView, SafeAreaView } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'
import { selectColheitaDataFilter, selectColheitaDataToggle } from '../store/redux/selector'
import { Colors } from '../constants/styles'
import { useState, useEffect } from 'react'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import Icon from "react-native-vector-icons/MaterialCommunityIcons"; // Uses MaterialCommunityIcons
import * as Haptics from 'expo-haptics';
import { geralActions } from '../store/redux/geral'

import Button from '../components/ui/Button'







const FilterPlantioScreen = () => {
    const filterData = useSelector(selectColheitaDataFilter)
    const filters = useSelector(selectColheitaDataToggle)
    const dispatch = useDispatch()
    const { setColheitaFilter, clearColheitaFilter } = geralActions

    const { farm, proj, variety } = filterData
    const tabBarHeight = useBottomTabBarHeight();

    const [filterSelected, setFilterSelected] = useState('fazenda');

    const handleSelect = (data) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
        setFilterSelected(data)
    }

    const handleFilterData = (type, data) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
        console.log('tipo de filtro: ', type)
        console.log('filtro selected: ', data)
        dispatch(setColheitaFilter({ key: type, value: data }));
    }
    const handleFilterButons = [
        { label: 'Fazenda', title: 'fazenda', filter: 'farm' },
        { label: 'Projeto', title: 'projeto', filter: 'proj' },
        { label: 'Variedade', title: 'variedade', filter: 'variety' },
    ]
    const handleClearFilters = () => {
        dispatch(clearColheitaFilter());
    }

    useEffect(() => {
        console.log('filters', filters)
    }, [filters]);
    return (
        <SafeAreaView style={styles.mainContaier}>
            <View style={styles.headerContainer}>
                {
                    handleFilterButons.map((data, i) => {
                        return (
                            <Pressable key={i} onPress={handleSelect.bind(this, data.title)}
                                style={[styles.filterPressbale, { backgroundColor: filterSelected === data.title && 'white' }]}
                            >
                                <Text style={[styles.filterTitle, { color: filters && filters[data.filter].length > 0 && 'green' }]}>{data.label}</Text>
                            </Pressable>
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
                                    <Text style={[styles.farmTitle,{color: filters?.farm?.includes(data) ? Colors.succes[400] : Colors.secondary[600]}]}>{data.replace('Fazenda', '')}</Text>
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
                                    <Text style={[styles.farmTitle,{color: filters?.proj?.includes(data) ? Colors.succes[400] : Colors.secondary[600]}]}>{data.replace('Projeto', '')}</Text>
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
                                    <Text style={[styles.farmTitle,{color: filters?.variety?.includes(data.variety) ? Colors.succes[400] : Colors.secondary[600]}]}>{data.variety.replace('Arroz ', '')}</Text>
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
            <View style={[styles.fabContainer, { justifyContent: 'center', flex: 1, alignItems: 'flex-end', marginBottom: tabBarHeight }]}>
                <Button
                    btnStyles={{ width: 60, height: 60, borderRadius: '50%', backgroundColor: Colors.error[300] }}
                    onPress={handleClearFilters}
                    disabled={!filters}
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
        paddingHorizontal: 10,
        paddingVertical: 10,
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
        backgroundColor: Colors.secondary[200],
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