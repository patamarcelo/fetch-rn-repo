import { SafeAreaView, StyleSheet, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics';
import { FAB } from "react-native-paper"; // Floating Action Button

import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { selectColheitaDataToggle } from '../../store/redux/selector';

import { Colors } from '../../constants/styles';
import { useDispatch } from 'react-redux';
import { geralActions } from '../../store/redux/geral';

import Button from '../ui/Button';
import Icon from "react-native-vector-icons/MaterialCommunityIcons"; // Uses MaterialCommunityIcons
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

const FilterPlantioComponent = () => {
    const navigation = useNavigation()
    const filters = useSelector(selectColheitaDataToggle)
    const dispatch = useDispatch()
    const tabBarHeight = useBottomTabBarHeight();
    const { clearColheitaFilter } = geralActions

    const handleFilterProps = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
        navigation.navigate('FilterPlantioScreen')
    }
    const hasFilters = filters?.farm?.length > 0 || filters?.proj?.length > 0 || filters?.variety?.length > 0 || filters?.culture?.length > 0

    const handleClearFilters = () => {
        dispatch(clearColheitaFilter());
    }
    return (
        <SafeAreaView style={styles.fabContainer}>
            {
                hasFilters &&
                <Button
                    btnStyles={[styles.fab2, { width: 50, height: 50, borderRadius: '50%', backgroundColor: Colors.error[300], marginBottom: tabBarHeight  }]}
                    onPress={handleClearFilters}
                >
                    <Icon name="trash-can-outline" size={24} color="white" />
                </Button>
            }
            <FAB
                style={[styles.fab, { backgroundColor: hasFilters ? 'rgba(153,204,153,0.4)' : "rgba(200, 200, 200, 0.3)", marginBottom: tabBarHeight }]}
                icon={"magnify"}
                color="black" // Icon color
                onPress={handleFilterProps}
            />
        </SafeAreaView>
    )
}

export default FilterPlantioComponent

const styles = StyleSheet.create({
    fabContainer: {
        position: "absolute",
        right: 20,
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
    fab2: {
        position: "absolute",
        right: 0,
        bottom: 65,
        backgroundColor: "rgba(200, 200, 200, 0.3)", // Grey, almost transparent
        width: 50,
        height: 50,
        borderRadius: 25, // Makes it perfectly circular
        justifyContent: "center",
        alignItems: "center",
        elevation: 4
    },
})