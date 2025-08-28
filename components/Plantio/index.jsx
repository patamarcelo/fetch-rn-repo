import { StyleSheet, Text, View, Pressable, Image } from 'react-native'
import React from 'react'
import { Colors } from '../../constants/styles';
import Icon from 'react-native-vector-icons/MaterialIcons'; // You can also use FontAwesome, Ionicons, etc.

import Animated, { FadeInRight, FadeOut, Layout, BounceIn, BounceOut } from 'react-native-reanimated';

import { useNavigation } from '@react-navigation/native';

import * as Haptics from 'expo-haptics';
import { Divider } from 'react-native-paper';
import { useEffect } from 'react';

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
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    })
}
const formatNumberScs = number => {
    return number?.toLocaleString("pt-br", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    })
}

const formatNumberAvg = number => {
    return number?.toLocaleString("pt-br", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })
}
const FarmsPlantioScreen = (props) => {
    const { data, newData } = props;
    const navigation = useNavigation()

    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
        navigation.push('PlantioTalhoesScreen', { farm: data.farm });
    }


    let totalAreaHere = 0
    let totalParcialHere = 0
    data.culturas.forEach((cultura, i) => {
        data.variedades?.filter((vari) => vari.cultura === cultura.cultura).forEach((item) => {
            totalAreaHere += item.colheita;
            totalParcialHere += item.parcial
        })
    })

    const totalPercent = Math.min(100, Math.round((totalParcialHere / totalAreaHere) * 100));


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
                                data.culturas.map((cultura, i) => {
                                    let plantado = 0
                                    let colhido = 0

                                    data?.variedades?.filter((data) => data.cultura === cultura.cultura).forEach(element => {
                                        plantado += element.colheita;
                                        colhido += element.parcial
                                    });

                                    const saldo = plantado - colhido
                                    const totalScs = newData?.length > 0 ? newData?.filter((data) => data.variedade__cultura__cultura === cultura.cultura).reduce((acc, curr) => acc += curr?.total_peso_liquido, 0) : 0
                                    const totalAvNew = (colhido > 0 && totalScs > 0) ? (totalScs / 60) / colhido : 0
                                    return (
                                        <View key={i}>
                                            {i > 0 && (
                                                <Divider style={{ backgroundColor: 'gray', height: 1, marginVertical: 5, width: '100%' }} />
                                            )}
                                            <View style={styles.containerCulture}>
                                                <View>
                                                    <View style={styles.shadowContainer}>
                                                        <Image source={getCultura(cultura.cultura)}
                                                            style={{ width: 30, height: 30, resizeMode: 'contain' }}
                                                        />
                                                    </View>
                                                </View>
                                                <View style={{ flexDirection: 'column', gap: 2, justifyContent: 'center', alignItems: 'center' }}>
                                                    <View style={styles.headerContainer}>
                                                        <Text style={styles.titleCultureArea}>Plantado</Text>
                                                        <Text style={styles.labelNumber}>{formatNumber(plantado)} ha</Text>
                                                    </View>

                                                    <View style={styles.headerContainer}>
                                                        <Text style={styles.titleCultureColheita}>Colheita</Text>
                                                        <Text style={styles.labelNumber}>{cultura.parcial > 0 ? formatNumber(colhido) + " ha" : '-'}</Text>
                                                    </View>

                                                    <View style={styles.headerContainer}>
                                                        <Text style={styles.titleCultureSaldo}>Saldo</Text>
                                                        <Text style={styles.labelNumber}>{saldo > 0 ? formatNumber(saldo) + ' ha' : '-'}</Text>
                                                    </View>
                                                </View>
                                                <View style={styles.infoContainer}>
                                                    <View>
                                                        <Text style={styles.infoContainerScsTitle}>Scs</Text>
                                                        <Text style={styles.infoContainerScsNumber}>{totalScs > 0 ? formatNumberScs(totalScs / 60) : ' - '}</Text>
                                                    </View>
                                                    <View>
                                                        <Text style={styles.infoContainerTitle}>Média</Text>
                                                        <Text style={styles.infoContainerNumber}>{totalAvNew > 0 ? formatNumberAvg(totalAvNew) : ' - '}</Text>
                                                    </View>
                                                </View>
                                            </View >
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
                            <View
                                // style={[styles.circle, { backgroundColor: totalPercent === 0 ? 'rgba(52,152,219,0.2)' : 'rgba(52,152,219,1.0)' }]}
                                style={[
                                    styles.circle,
                                    {
                                        backgroundColor:
                                            totalPercent === 0
                                                ? 'rgba(52,152,219,0.2)' // mantém o que está no 0
                                                : totalPercent <= 20
                                                    ? 'rgba(204, 153, 0, 0.6)' // até 20 amarelo
                                                    : totalPercent <= 90
                                                        ? 'rgba(52,152,219,1.0)' // entre 20 e 90 azul que já tem
                                                        : 'rgba(46, 204, 113, 0.9)', // maior que 90 verde
                                    },
                                ]}
                            >
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
    shadowContainer: {
        shadowColor: "#000",  // Shadow color
        shadowOffset: { width: 3, height: 5 },  // Offset for drop shadow effect
        shadowOpacity: 0.4,  // Opacity of shadow
        shadowRadius: 4,  // Spread of shadow
        elevation: 6,  // Required for Android
    },
    infoContainerNumber: {
        textAlign: 'right',
        fontWeight: 'bold',
        fontSize: 11,
        color: Colors.secondary[500]
    },
    infoContainerTitle: {
        textAlign: 'right',
        fontWeight: 'bold',
        fontSize: 12,
        color: Colors.succes[500]
    },
    infoContainerScsTitle: {
        textAlign: 'right',
        fontWeight: 'bold',
        fontSize: 12,
        color: Colors.secondary[400]
    },
    infoContainerScsNumber: {
        textAlign: 'right',
        fontWeight: 'bold',
        fontSize: 11,
        color: Colors.secondary[500]
    },
    infoContainer: {
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'flex-end',
        marginLeft: 40,
        gap: 5
        // flex: 1,
        // height: '100%'
    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: 110,
        // gap: 10
    },
    titleCultureArea: {
        // textDecorationLine: 'underline',
        fontSize: 12,
        fontWeight: 'bold'
    },
    titleCultureColheita: {
        // textDecorationLine: 'underline',
        fontSize: 12,
        fontWeight: 'bold'
    },
    titleCultureSaldo: {
        // textDecorationLine: 'underline',
        fontSize: 12,
        fontWeight: 'bold',
        color: Colors.succes[600]
    },
    labelNumber: {
        fontSize: 10,
        color: Colors.secondary[600],
        fontWeight: 'bold'
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
        color: Colors.secondary[700]
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
        width: 60,
        height: 60,
        borderRadius: "50%", // Perfect circle
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
        fontSize: 16,
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
        paddingRight: 5
    },
    pressed: {
        opacity: 0.5,
    },
});