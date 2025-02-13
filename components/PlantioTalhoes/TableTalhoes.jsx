import { View, StyleSheet, Text } from "react-native";
import { Card, Title, Paragraph, DataTable, Divider } from 'react-native-paper';
import dayjs from 'dayjs';

import Animated, { BounceIn, BounceOut, FadeIn, FadeInRight, FadeInUp, FadeOut, FadeOutUp, FlipInEasyX, FlipOutEasyX, Layout, SlideInLeft, SlideInRight, SlideOutRight, SlideOutUp, StretchInY, StretchOutX, ZoomIn, ZoomOut } from 'react-native-reanimated';


const formatNumber = number => {
    return number?.toLocaleString("pt-br", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })
}

const formatDate = (dateString) => {
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year.replace('20', '')}`;
}

const formatString = (str) => {
    return str.replace(/(\D+)(\d+)/, '$1-$2');
}
const TabelaTalhoesScreen = ({ data }) => {
    return (
        <View style={{ marginTop: 10 }}>
            <Divider style={{marginBottom: 10}}/>
            <View style={{ justifyContent: 'center', flex: 1, alignItems: 'flex-start', paddingBottom: 5 }}>
                <Text style={{ fontSize: 12, fontWeight: 'bold' }}>Cargas: {data?.length}</Text>
            </View>
            <View style={stylesTable.titleWrapper}>
                <DataTable>
                    <View style={stylesTable.header}>
                        <View style={[stylesTable.title, { width: 50 }]}>
                            <Text style={stylesTable.titleText}>Data</Text>
                        </View>
                        <View style={[stylesTable.title, { width: 60 }]}>
                            <Text style={stylesTable.titleText}>Placa</Text>
                        </View>
                        <View style={stylesTable.title}>
                            <Text style={stylesTable.titleText}>Scs</Text>
                        </View>
                        <View style={stylesTable.title}>
                            <Text style={stylesTable.titleText}>Umidade</Text>
                        </View>
                        <View style={stylesTable.title}>
                            <Text style={stylesTable.titleText}>Impureza</Text>
                        </View>
                        <View style={stylesTable.title}>
                            <Text style={stylesTable.titleText}>Scs</Text>
                        </View>
                    </View>

                    {data.map((item, index) => (
                        <Animated.View
                            entering={FadeInRight.duration(300 + (index * 50))} // Root-level animation for appearance
                            exiting={FadeOutUp.duration(20)} // Root-level animation for disappearance
                            layout={Layout.springify()}    // Layout animation for dynamic resizing
                            key={index} style={[stylesTable.row, { backgroundColor: index % 2 === 0 && 'whitesmoke' }]}>
                            <View style={stylesTable.cell}>
                                <Text style={stylesTable.cellText}>{formatDate(item.data_colheita)}</Text>
                            </View>
                            <View style={stylesTable.cell}>
                                <Text style={stylesTable.cellText}>{item?.placa ? formatString(item?.placa) : " - "}</Text>
                            </View>
                            <View style={stylesTable.cell}>
                                <Text style={stylesTable.cellText}>{formatNumber(((item.peso_bruto - item.peso_tara) / 60) || 0)}</Text>
                            </View>
                            <View style={stylesTable.cell}>
                                <Text style={stylesTable.cellText}>{formatNumber(item.umidade || 0)}</Text>
                            </View>
                            <View style={stylesTable.cell}>
                                <Text style={stylesTable.cellText}>{formatNumber(item.impureza || 0)}</Text>
                            </View>
                            <View style={stylesTable.cell}>
                                <Text style={stylesTable.cellText}>{formatNumber(item.peso_scs_liquido || 0)}</Text>
                            </View>
                        </Animated.View>
                    ))}
                </DataTable>
            </View>
        </View>
    );
};

export default TabelaTalhoesScreen

const stylesTable = StyleSheet.create({
    titleWrapper: {  // NEW: Wrapper to apply space-between
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        paddingHorizontal: 5,
        backgroundColor: '#f2f2f2',
        // paddingVertical: 5,
        // height: 50,
        borderBottomWidth: 2,
        borderBottomColor: '#ddd',
    },
    title: {
        justifyContent: 'space-between', // Align text properly
    },
    titleText: {  // Add this style
        fontSize: 10,
        fontWeight: 'bold',
        color: '#000',  // Ensure text is visible
    },
    row: {
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        paddingHorizontal: 5
    },
    cell: {
        paddingVertical: 2,
        marginHorizontal: 0,
        justifyContent: 'space-between', // Align text properly
    },
    cellText: {  // Add this
        fontSize: 10,
        color: '#000',  // Ensure text is visible
    }
})
