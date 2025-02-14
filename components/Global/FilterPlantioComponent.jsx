import { StyleSheet, Text, View } from 'react-native'
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

const FilterPlantioComponent = () => {
    const navigation = useNavigation()
    const filters = useSelector(selectColheitaDataToggle)
    const dispatch = useDispatch()
    const { clearColheitaFilter } = geralActions

    const handleFilterProps = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
        navigation.navigate('FilterPlantioScreen')
    }
    const hasFilters = filters?.farm?.length > 0 || filters?.proj?.length > 0 || filters?.variety?.length > 0

    const handleClearFilters = () => {
        dispatch(clearColheitaFilter());
    }
    return (
        <View style={styles.fabContainer}>
            {
                hasFilters &&
                <Button
                    btnStyles={[styles.fab2, { width: 50, height: 50, borderRadius: '50%', backgroundColor: Colors.error[300] }]}
                    onPress={handleClearFilters}
                >
                    <Icon name="trash-can-outline" size={24} color="white" />
                </Button>
            }
            <FAB
                style={[styles.fab, { backgroundColor: hasFilters ? 'rgba(153,204,153,0.4)' : "rgba(200, 200, 200, 0.3)" }]}
                icon={"magnify"}
                color="black" // Icon color
                onPress={handleFilterProps}
            />
        </View>
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
        right: 30,
        bottom: 100,
        backgroundColor: "rgba(200, 200, 200, 0.3)", // Grey, almost transparent
        width: 50,
        height: 50,
        borderRadius: 25, // Makes it perfectly circular
        justifyContent: "center",
        alignItems: "center",
        elevation: 4
    },
    fab2: {
        position: "absolute",
        right: 30,
        bottom: 160,
        backgroundColor: "rgba(200, 200, 200, 0.3)", // Grey, almost transparent
        width: 50,
        height: 50,
        borderRadius: 25, // Makes it perfectly circular
        justifyContent: "center",
        alignItems: "center",
        elevation: 4
    },
})