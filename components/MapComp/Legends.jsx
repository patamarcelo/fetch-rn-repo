import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const Legend = ({ navigation }) => {
    return (
        <View style={styles.container}>
            <View style={styles.legendContainer}>
                <View style={[styles.legendItem, { backgroundColor: "green", color: 'whitesmoke' }]}>
                    <Text style={[styles.legendText, { color: 'whitesmoke' }]}>Aplicado</Text>
                </View>
                <View style={[styles.legendItem, { backgroundColor: "red", color: 'whitesmoke' }]}>
                    <Text style={[styles.legendText, { color: 'whitesmoke' }]}>Não Aplicado</Text>
                </View>
                <View style={[styles.legendItem, { backgroundColor: "yellow", }]}>
                    <Text style={[styles.legendText, { color: 'black' }]}>Aplicando</Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    legendContainer: {
        flexDirection: "column",
        justifyContent: "flex-end",
        alignItems: "center",
        width: 50,
        left: 30,
        rowGap: 5,
    },
    legendItem: {
        // flex: 1,
        paddingVertical: 4,
        paddingHorizontal: 12,
        borderRadius: 5,
        marginRight: 8,
        width: 100
    },
    legendText: {
        // color: "white", // Text color for better contrast
        fontWeight: "bold",
        fontSize: 12
    },
});

export default Legend;