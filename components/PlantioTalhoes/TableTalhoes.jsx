import { View, StyleSheet } from "react-native";
import { Card, Title, Paragraph, DataTable } from 'react-native-paper';


const TabelaTalhoesScreen = ({ data }) => {
    return (
        <View style={{ marginTop: 20 }}>
            <View style={stylesTable.container}>
                <DataTable>
                    <DataTable.Header style={stylesTable.header}>
                        <DataTable.Title style={stylesTable.title}>Data de Colheita</DataTable.Title>
                        <DataTable.Title style={stylesTable.title}>Romaneio</DataTable.Title>
                    </DataTable.Header>

                    {data.map((item, index) => (
                        <DataTable.Row key={index} style={stylesTable.row}>
                            <DataTable.Cell style={stylesTable.cell}>{item.data_colheita}</DataTable.Cell>
                            <DataTable.Cell style={stylesTable.cell}>{item.romaneio}</DataTable.Cell>
                        </DataTable.Row>
                    ))}
                </DataTable>
            </View>
        </View>
    );
};

export default TabelaTalhoesScreen

const stylesTable = StyleSheet.create({
    container: {
        marginTop: 10,
        paddingHorizontal: 0,
    },
    header: {
        backgroundColor: '#f2f2f2',
        paddingVertical: 2,
        borderBottomWidth: 2,  // Underline for the header
        borderBottomColor: '#ddd',  // Color of the underline
    },
    title: {
        fontSize: 12,
        fontWeight: 'bold',
        paddingHorizontal: 15,
    },
    row: {
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
    },
    cell: {
        fontSize: 8,
        paddingVertical: 2,
        paddingHorizontal: 3,
    },
})
