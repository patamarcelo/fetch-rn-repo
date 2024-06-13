import { Pressable, View, Text, StyleSheet } from "react-native"
import { Colors } from "../../constants/styles";

import { useState } from "react";

import { Divider } from '@rneui/themed';



import * as Progress from 'react-native-progress';


const CardFarmBox = (props) => {
    const { data } = props

    const [showAps, setShowAps] = useState(false);


    const formatNumber = number => {
        return number.toLocaleString("pt-br", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })
    }
    const formatNumberProds = number => {
        return number.toLocaleString("pt-br", {
            minimumFractionDigits: 3,
            maximumFractionDigits: 3
        })
    }

    const handleOpen = () => {
        setShowAps(prev => !prev)
    }

    return (
        <Pressable
            style={({ pressed }) => [
                styles.mainContainer,
                pressed && styles.pressed]}
            onPress={handleOpen}>
            <View style={styles.infoContainer}>
                <Text style={{ color: 'whitesmoke' }}>Area: {formatNumber(data.areaSolicitada)}</Text>
                <Text style={{ color: 'whitesmoke' }}>Aplicado: {formatNumber(data.areaAplicada)}</Text>
                <Text style={{ color: 'whitesmoke' }}>Saldo: {formatNumber(data.saldoAreaAplicar)}</Text>

            </View>
            <View style={styles.headerContainer}>
                <View>
                    <Text style={styles.headerTitle}> {data.code.split('AP')}</Text>
                    <Text style={[styles.headerTitle, styles.dateTile]}> {data.dateAp.split('-').reverse().join('/')}</Text>
                </View>
                <View>
                    <Text style={styles.headerTitle}> {data.operation}</Text>
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
                            data.parcelas.map((parcela) => {
                                return (
                                    <View style={[styles.parcelasView, { backgroundColor: parcela.fillColorParce }]}>
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
                            data.prods.filter((pro) => pro.type !== 'Operação').map((produto) => {
                                return (
                                    <View style={[styles.prodsView, { backgroundColor: produto.colorChip }]}>
                                        <Text style={styles.textProds}>{formatNumberProds(produto.doseSolicitada)}</Text>
                                        <Text style={styles.textProdsName}>{produto.product}</Text>
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
        paddingBottom: 10
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
        marginLeft: 80,
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