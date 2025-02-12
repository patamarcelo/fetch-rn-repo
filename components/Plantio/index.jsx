import { StyleSheet, Text, View, Pressable, Image } from 'react-native'
import React from 'react'
import { Colors } from '../../constants/styles';
import Icon from 'react-native-vector-icons/MaterialIcons'; // You can also use FontAwesome, Ionicons, etc.

import Animated, { FadeInRight, FadeOut, Layout, BounceIn, BounceOut } from 'react-native-reanimated';

import { useNavigation } from '@react-navigation/native';

import * as Haptics from 'expo-haptics';
const iconDict = [
    { cultura: "Feijão", icon: require('../../utils/assets/icons/beans2.png'), alt: "feijao" },
    { cultura: "Arroz", icon: require('../../utils/assets/icons/rice.png'), alt: "arroz" },
    { cultura: "Soja", icon: require('../../utils/assets/icons/soy.png'), alt: "soja" },
    { cultura: undefined, icon: require('../../utils/assets/icons/question.png'), alt: "?" }
];

const filteredIcon = (data) => {
    const filtered = iconDict.filter((dictD) => dictD.cultura === data);

    if (filtered.length > 0) {
        return filtered[0].icon;
    }
    return iconDict[3].icon;
    // return "";
};

const getCultura = (dataCult) => filteredIcon(dataCult)


const formatNumber = number => {
    return number?.toLocaleString("pt-br", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })
}
const FarmsPlantioScreen = (props) => {
    const { data } = props;
    const navigation = useNavigation()

    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
        navigation.push('PlantioTalhoesScreen', { farm: data.farm });
    }


    const totalPercent = parseInt((data.parcial / data.colheita) * 100) <= 100 ? parseInt((data.parcial / data.colheita) * 100) : 100

    return (
        <Pressable
            style={({ pressed }) => [
                styles.pressableWrapper,
                pressed && styles.pressed,
            ]}
            onPress={handlePress}
        >
            {/* Container for the entire row */}
            <View style={styles.wrapper}>
                {/* Background bar for the percentage */}
                <Animated.View
                    entering={FadeInRight.duration(500)} // Root-level animation for appearance
                    exiting={FadeOut.duration(500)} // Root-level animation for disappearance
                    layout={Layout.springify()}    // 
                    style={[
                        styles.percentBackground,
                        { backgroundColor: totalPercent > 75 ? 'rgba(51,153,51,0.4)' : 'rgba(255, 223, 0, 0.4)' },
                        { width: `${totalPercent}%`, borderTopRightRadius: totalPercent < 100 ? 0 : 10, borderBottomRightRadius: totalPercent < 100 ? 0 : 10 }, // Dynamic width based on percent
                    ]}
                />

                {/* Content (text, circle, icon) */}
                <View style={styles.contentContainer}>
                    <View style={styles.titleContainer}>
                        <View style={{ alignSelf: 'end', backgroundColor: '', marginBottom: 10, marginLeft: -10 }}>
                            <Text style={styles.farmName}>{data.farm.replace('Projeto', '')}</Text>
                        </View>
                        <View>
                            {
                                data.culturas.map((data, i) => {
                                    const saldo = data.colheita - data.parcial
                                    return (
                                        <View style={styles.containerCulture} key={data.cultura}>
                                            <View>
                                                <Image source={getCultura(data.cultura)}
                                                    style={{ width: 30, height: 30 }}
                                                />
                                            </View>
                                            <View style={{ flexDirection: 'row', gap: 20, justifyContent: 'center', alignItems: 'center' }}>
                                                <View style={styles.headerContainer}>
                                                    <Text style={styles.titleCulture}>Área</Text>
                                                    <Text style={styles.labelNumber}>{formatNumber(data.colheita)}</Text>
                                                </View>

                                                <View style={styles.headerContainer}>
                                                    <Text style={styles.titleCulture}>Colheita</Text>
                                                    <Text style={styles.labelNumber}>{formatNumber(data.parcial)}</Text>
                                                </View>

                                                <View style={styles.headerContainer}>
                                                    <Text style={styles.titleCulture}>Saldo</Text>
                                                    <Text style={styles.labelNumber}>{formatNumber(saldo)}</Text>
                                                </View>
                                            </View>
                                        </View>
                                    )
                                })
                            }
                        </View>
                    </View>
                    <Animated.View
                        entering={BounceIn.duration(300)} // Root-level animation for appearance
                        exiting={BounceOut.duration(300)} // Root-level animation for disappearance
                        layout={Layout.springify()}    // Layout animation for dynamic resizing
                        style={styles.rowContainer}
                    >
                        <View style={styles.containerPercent}>
                            <View style={[styles.circle, { backgroundColor: totalPercent === 0 ? 'rgba(52,152,219,0.2)' : 'rgba(52,152,219,1.0)' }]}>
                                <Text style={[styles.percentText, { color: totalPercent === 0 ? 'black' : 'white' }]}>{totalPercent}%</Text>
                            </View>
                        </View>
                        <Icon name="arrow-forward" size={24} color="#000" />

                    </Animated.View>
                </View>


            </View>
        </Pressable>
    );
};

export default FarmsPlantioScreen;

const styles = StyleSheet.create({
    headerContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        width: 55
    },
    titleCulture: {
        textDecorationLine: 'underline',
        fontSize: 12,
        // fontWeight: 'bold'
    },
    labelNumber: {
        fontSize: 10
    },
    titleContainer: {
        flexDirection: 'column',
        justifyContent: 'space-between',
    },
    containerCulture: {
        flex: 1,
        // backgroundColor: 'red',
        flexDirection: 'row',
        width: '100%',
        alignItems: 'center',
        gap: 10,
        // borderRadius: 12,
        // padding: 10
    },
    pressableWrapper: {
        marginBottom: 10, // Space between each Pressable item,
    },
    wrapper: {
        position: 'relative', // Ensures everything inside is correctly layered
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 1, // Ensuring content is above the background
        backgroundColor: '#fff',
        marginHorizontal: 5,
        borderRadius: 10,
        shadowColor: '#000', // iOS shadow color
        shadowOffset: { width: 0, height: 5 }, // iOS shadow offset
        shadowOpacity: 0.3, // iOS shadow opacity
        shadowRadius: 10, // iOS shadow blur radius
        elevation: 10, // Android shadow,
        flex: 1,
    },
    farmName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    rowContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    containerPercent: {
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10, // Space between circle and arrow
    },
    circle: {
        width: 40,
        height: 40,
        borderRadius: 20, // Perfect circle
        backgroundColor: 'rgba(52,152,219,1.0)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4, // Optional border for extra styling
        borderColor: '#2980b9',
        shadowColor: '#000', // iOS shadow color
        shadowOffset: { width: 0, height: 2 }, // iOS shadow offset
        shadowOpacity: 0.3, // iOS shadow opacity
        shadowRadius: 5, // iOS shadow blur radius
        elevation: 3, // Android shadow
    },
    percentText: {
        fontSize: 8,
        fontWeight: 'bold',
        color: '#fff', // White color for text
    },
    percentBackground: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'yellow', // Color for the background bar
        borderRadius: 10, // Match border radius with the parent wrapper
        zIndex: 0, // Ensure it stays behind the content
        shadowColor: '#000', // iOS shadow color
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 2, // Android shadow for the background
    },
    contentContainer: {
        position: 'relative', // Ensures the content is above the background
        zIndex: 1,
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
    },
    pressed: {
        opacity: 0.5,
    },
});