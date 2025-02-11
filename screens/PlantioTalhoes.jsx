import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { useRoute } from '@react-navigation/native';
const PlantioTalhoesDescription = () => {
    // Get route object
    const route = useRoute();

    // Access route params (replace 'itemId' with your actual param key)
    const { farm } = route.params;

    return (
        <View>
            <Text>PlantioTalhoesDescription:</Text>
            <Text>{farm}</Text>
        </View>
    )
}

export default PlantioTalhoesDescription

const styles = StyleSheet.create({})