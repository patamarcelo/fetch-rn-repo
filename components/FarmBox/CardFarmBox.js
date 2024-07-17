import { Pressable, View, Text, StyleSheet, Image, Animated, Easing } from "react-native"
import { Colors } from "../../constants/styles";

import { useState, useRef, useEffect } from "react";

import { Divider } from '@rneui/themed';



import * as Progress from 'react-native-progress';

import * as Haptics from 'expo-haptics';


const CardFarmBox = (props) => {
    const { data, indexParent } = props
    const [showAps, setShowAps] = useState(false);


    const formatNumber = number => {
        return number?.toLocaleString("pt-br", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })
    }
    const formatNumberProds = number => {
        return number?.toLocaleString("pt-br", {
            minimumFractionDigits: 3,
            maximumFractionDigits: 3
        })
    }

    const handleOpen = () => {
        setShowAps(prev => !prev)
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    }

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
    const getCultura = filteredIcon(data.cultura)

    //Animated View by chatgpt
    // const parcelaAnimValues = useRef(data?.parcelas?.map(() => new Animated.Value(0))).current;
    // const produtoAnimValues = useRef(data?.prods?.filter((pro) => pro.type !== 'Operação').map(() => new Animated.Value(0))).current;

    // useEffect(() => {
    //     Animated.stagger(100, parcelaAnimValues.map(animValue => {
    //         return Animated.timing(animValue, {
    //             toValue: 1,
    //             duration: 500,
    //             easing: Easing.ease,
    //             useNativeDriver: true,
    //         });
    //     })).start();

    //     Animated.stagger(100, produtoAnimValues.map(animValue => {
    //         return Animated.timing(animValue, {
    //             toValue: 1,
    //             duration: 500,
    //             easing: Easing.ease,
    //             useNativeDriver: true,
    //         });
    //     })).start();
    // }, [parcelaAnimValues, produtoAnimValues]);

    // const getParcelaAnimatedStyle = (index) => {
    //     return {
    //         opacity: parcelaAnimValues[index],
    //         transform: [{
    //             translateY: parcelaAnimValues[index].interpolate({
    //                 inputRange: [0, 1],
    //                 outputRange: [20, 0],
    //             }),
    //         }],
    //     };
    // };

    // const getProdutoAnimatedStyle = (index) => {
    //     return {
    //         opacity: produtoAnimValues[index],
    //         transform: [{
    //             translateY: produtoAnimValues[index].interpolate({
    //                 inputRange: [0, 1],
    //                 outputRange: [20, 0],
    //             }),
    //         }],
    //     };
    // };
    return (
        <Pressable
            style={({ pressed }) => [
                styles.mainContainer,
                pressed && styles.pressed,{marginTop: indexParent === 0 && 0 }]}
            onPress={handleOpen}>
            <View style={styles.infoContainer}>
                <Text style={{ color: 'whitesmoke' }}>Area: {formatNumber(data.areaSolicitada)}</Text>
                <Text style={{ color: 'whitesmoke' }}>Aplicado: {formatNumber(data.areaAplicada)}</Text>
                <Text style={{ color: 'whitesmoke' }}>Saldo: {formatNumber(data.saldoAreaAplicar)}</Text>

            </View>
            <View style={styles.headerContainer}>
                <View>
                    <Text style={styles.headerTitle}> {data?.code?.split('AP')}</Text>
                    <Text style={[styles.headerTitle, styles.dateTile]}> {data?.dateAp?.split('-').reverse().join('/')}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Text style={styles.headerTitle}> {data.operation}</Text>
                    <Image source={getCultura}
                        style={{ width: 20, height: 20 }}
                    />
                </View>
                <View style={styles.progressContainer}>
                    <Progress.Pie size={30} indeterminate={false} progress={data.percent} color={data.percentColor} />
                </View>
            </View>

            {
                showAps &&

                <View style={styles.bodyContainer}>
                    <View style={styles.parcelasContainer}>
                        {
                            data?.parcelas?.map((parcela) => {
                                const uniKey = data.idAp + parcela.parcela
                                return (
                                    <View
                                        key={uniKey}
                                        style={[styles.parcelasView, { backgroundColor: parcela.fillColorParce }]}
                                    >
                                        <Text style={{ color: parcela.fillColorParce === '#E4D00A' ? 'black' : 'whitesmoke' }}>{parcela.parcela}</Text>
                                        <Text style={{ color: parcela.fillColorParce === '#E4D00A' ? 'black' : 'whitesmoke' }}>-</Text>
                                        <Text style={{ color: parcela.fillColorParce === '#E4D00A' ? 'black' : 'whitesmoke' }}>{formatNumber(parcela.areaSolicitada)}</Text>
                                    </View>
                                )
                            })
                        }
                    </View>
                    <Divider width={1} color={Colors.secondary[300]} />
                    <View style={styles.produtosContainer}>
                        {
                            data?.prods?.filter((pro) => pro.type !== 'Operação').map((produto) => {
                                const uniKey = data.cultura + data.idAp + produto.product
                                console.log('parcela Color backgrounc: ', produto.colorChip)
                                return (
                                    <View
                                        key={uniKey}
                                        style={[styles.prodsView, { backgroundColor: produto.colorChip === 'rgb(255,255,255,0.1)' ? 'whitesmoke' : produto.colorChip }]}
                                    >
                                        <Text style={[styles.textProds, {color: produto.colorChip === 'rgb(255,255,255,0.1)' ? '#455d7a' : 'whitesmoke'}]}>{formatNumberProds(produto.doseSolicitada)}</Text>
                                        <Text style={[styles.textProdsName, {color: produto.colorChip === 'rgb(255,255,255,0.1)' ? '#455d7a' : 'whitesmoke'}]}>{produto.product}</Text>
                                        <Text style={[styles.totalprods, {color: produto.colorChip === 'rgb(255,255,255,0.1)' ? '#455d7a' : 'whitesmoke'}]}>{formatNumber(produto.doseSolicitada * data.areaSolicitada)}</Text>
                                    </View>
                                )
                            })
                        }
                    </View>
                </View>
            }


        </Pressable>
    );
}

export default CardFarmBox


const styles = StyleSheet.create({
    mainContainer: {
        backgroundColor: Colors.secondary[300],
        paddingBottom: 10,
        marginTop: 10
    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 5
    },
    headerTitle: {
        fontWeight: 'bold'
    },
    dateTile: {
        fontSize: 8
    },
    progressContainer: {
        marginRight: 10
    },
    bodyContainer: {
        // backgroundColor:Colors. secondary[400]
        // flex: 1,
        // flexDirection: 'row'
    },
    parcelasContainer: {
        gap: 5,
        flexDirection: 'row',
        paddingHorizontal: 4,
        flexWrap: 'wrap',
        marginBottom: 10,
        justifyContent: 'flex-start'
    },
    parcelasView: {
        flexDirection: 'row',
        gap: 10,
        width: 90,
        borderRadius: 12,
        padding: 8,
        // paddingVertical: 12,
        backgroundColor: 'green',
        justifyContent: 'space-around'
    },
    infoContainer: {
        flex: 1,
        backgroundColor: Colors.primary800,
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
        paddingVertical: 7,
        paddingHorizontal: 15
    },
    produtosContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        gap: 5,
        marginTop: 10
    },
    prodsView: {
        flexDirection: 'row',
        width: 300,
        backgroundColor: 'blue',
        gap: 10,
        borderRadius: 12,
        justifyContent: "flex-start",
        padding: 2
    },
    textProds: {
        marginLeft: 10,
        color: 'whitesmoke',
        fontWeight: 'bold'
    },
    totalprods: {
        textAlign: 'right',
        marginRight: 10,
        marginLeft: 'auto',
        color: 'whitesmoke',
        fontWeight: 'bold'
    },
    textProdsName: {
        color: 'whitesmoke',
        fontWeight: 'bold'
    },
    pressed: {
        opacity: 0.7
    },
})