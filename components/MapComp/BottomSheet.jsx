
import { View, Text, StyleSheet, Image } from 'react-native'
import { useEffect } from 'react';
import BottomSheet, { BottomSheetMethods } from '@devvie/bottom-sheet';

import { Colors } from '../../constants/styles';

const BottomSheetApp = (props) => {
    const { refRBSheet, data, handleCloseSheet } = props;


    const formatNumber = (data) => {
        return data.toLocaleString(
            "pt-br",
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        )
    }

    const formatNumberProds = number => {
        return number?.toLocaleString("pt-br", {
            minimumFractionDigits: 3,
            maximumFractionDigits: 3
        })
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



    return (
        <BottomSheet ref={refRBSheet} onClose={handleCloseSheet}
            ViewStyle={styles.bottomStyle}
            minHeight={300}
            containerProds={styles.bottomStyle}
        >
            <View
                style={styles.headerContainer}
            >
                <View>
                    <Text style={{fontWeight: 'bold'}}>{data?.farmName?.replace("Fazenda ",'')}</Text>
                    <Text>{data.talhao}</Text>
                </View>
                <View>
                    <Image source={filteredIcon(data.cultura)}
                        style={{ width: 20, height: 20 }}
                    />
                    <Text>{data?.area && formatNumber(data.area)}</Text>
                </View>
            </View>
            <View style={{ marginTop: 0 }}>
                {
                    data?.prods?.length > 0 && data.prods.map((prod, i) => {
                        return (
                            <View key={i}>
                                <View
                                    key={i}
                                    style={[styles.prodsViewMain, { backgroundColor: prod.colorChip === 'rgb(255,255,255,0.1)' ? 'whitesmoke' : prod.colorChip, marginTop: i !== 0 && 5 }]}
                                >
                                    <View style={styles.prodsView}>
                                        <Text style={[styles.textProds, { color: prod.colorChip === 'rgb(255,255,255,0.1)' ? '#455d7a' : 'whitesmoke' }]}>{formatNumberProds(prod.doseSolicitada)}</Text>
                                        <Text style={[styles.textProdsName, { color: prod.colorChip === 'rgb(255,255,255,0.1)' ? '#455d7a' : 'whitesmoke' }]}>{prod.product}</Text>
                                    </View>
                                    <View>
                                        <Text style={[styles.textProdsName,{ color: prod.colorChip === 'rgb(255,255,255,0.1)' ? '#455d7a' : 'whitesmoke'}]}>{formatNumber(data.area * prod.doseSolicitada)}</Text>
                                    </View>
                                </View>
                            </View>
                        )
                    })
                }
            </View>
        </BottomSheet>
    );
}

const styles = StyleSheet.create({
    headerContainer: {
        // marginBottom: 10,
        borderBottomColor: 'black',
        borderBottomWidth: 1,
        paddingBottom: 10,
        paddingHorizontal: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    containerProds: {
        // flex: 1, 
        // width: '100%',
        flexDirection: 'row',
        marginHorizontal: 10,
        justifyContent: 'space-between',
        paddingLeft: 10,
    },
    bottomStyle: {
        height: 100,
        borderRadius: 12,
    },
    mainContainer: {
        backgroundColor: Colors.secondary[300],
        paddingBottom: 10,
        marginTop: 10
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
        gap: 10,
        justifyContent: "flex-start",
        padding: 2,

    },
    prodsViewMain: {
        flexDirection: 'row',
        width: "100%",
        gap: 10,
        rowGap: 10,
        justifyContent: "space-between",
        padding: 2,
        paddingRight: 10
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
    mapContainer: {
        marginRight: 10,
        paddingTop: 10,
        paddingRight: 10,
        justifyContent: 'flex-end',
        alignItems: 'flex-end',
        borderRadius: 8,
    },
})

export default BottomSheetApp;


