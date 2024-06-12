import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    FlatList,
    RefreshControl,
    Pressable
} from 'react-native'
import { useState, useEffect, useRef } from 'react'

import dataFarm from '../store/farmboxData.json'

import { useScrollToTop } from "@react-navigation/native";
import CardFarmBox from '../components/FarmBox/CardFarmBox';

import { Colors } from '../constants/styles';

import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

const FarmBoxList = (itemData) => {
    return <CardFarmBox data={itemData.item} />
}


const FarmBoxScreen = () => {
    const sheetRef = useRef(null);
    const ref = useRef(null);
    const [farmData, setfarmData] = useState([]);
    const [onlyFarms, setOnlyFarms] = useState([]);
    const tabBarHeight = useBottomTabBarHeight();

    const [showFarm, setShowFarm] = useState(false);

    useEffect(() => {
        const getData = async () => {
            try {
                const data = dataFarm
                setfarmData(data.data)
                setOnlyFarms(data.farms)
            } catch (err) {
                console.log('Erro ao carregar os dados')
            }
        }

        getData()
    }, []);

    useScrollToTop(ref);

    useScrollToTop(
        useRef({
            scrollToTop: () => ref.current?.scrollTo({ y: 0 })
        })
    );

    const handleShowFarm = (farms) => {
        if (showFarm === farms) {
            setShowFarm(null)
        } else {
            setShowFarm(farms)
        }
    }

    return (
        <View style={styles.mainContainer}>
            <ScrollView ref={ref} style={[styles.mainContainer, { marginBottom: tabBarHeight }]}
                refreshControl={
                    <RefreshControl
                        // refreshing={isLoading}
                        // onRefresh={getData}
                        colors={["#9Bd35A", "#689F38"]}
                        tintColor={Colors.primary500}
                    />
                }
            >
                {farmData &&

                    onlyFarms.map((farms, i) => {
                        return (
                            <>
                                <Pressable key={i}
                                    style={({ pressed }) => [
                                        styles.headerContainer,
                                        pressed && styles.pressed]}
                                    onPress={handleShowFarm.bind(this, farms)}
                                >
                                    <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>
                                        {farms.replace('Fazenda', '')}
                                    </Text>
                                </Pressable>
                                {
                                    showFarm === farms &&
                                    <FlatList
                                        // scrollEnabled={false}
                                        data={farmData.filter((farmName) => farmName.farmName === farms)}
                                        keyExtractor={(item, i) => i}
                                        renderItem={(item) => FarmBoxList(item)}
                                        ItemSeparatorComponent={() => (
                                            <View style={{ height: 12 }} />
                                        )}
                                    />
                                }
                            </>


                        )
                    })
                }
            </ScrollView>
        </View>
    );
}

export default FarmBoxScreen;

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        // marginBottom: 10
    },
    headerContainer: {
        // flex: 1,
        // flexDirection: 'row',
        paddingVertical: 18,
        marginVertical: 10,
        backgroundColor: Colors.primary500,
        fontSize: 18,
        justifyContent: 'center',
        alignItems: 'center'
    },
    pressed: {
        opacity: 0.7
    },
})