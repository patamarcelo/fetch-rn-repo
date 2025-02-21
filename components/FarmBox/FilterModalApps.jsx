import { StyleSheet, Text, View, Modal, StatusBar, ScrollView, Pressable, Platform } from 'react-native'
import { useState, useEffect } from 'react';

import Button from '../ui/Button'
import { SafeAreaView, SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '../../constants/styles';

import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { createApplicationPdf } from '../Global/PrintCronogramaPage';


const FilterModalApps = (props) => {
    const { modalVisible, setModalVisible, data, farm } = props

    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedApps, setSelectedApps] = useState([]);

    const insets = useSafeAreaInsets();

    // Delay modal visibility to let the layout settle
    useEffect(() => {
        if (modalVisible) {
            setTimeout(() => {
                setIsModalVisible(true);
            }, 50); // Small delay to allow layout to settle
        } else {
            setIsModalVisible(false);
        }
    }, [modalVisible]);


    useEffect(() => {
        const allApps = data.map((app) => app.idAp)
        setSelectedApps(allApps)
    }, []);

    useEffect(() => {
        StatusBar.setHidden(modalVisible, 'slide');
        return () => StatusBar.setHidden(false, 'slide'); // Reset when modal is closed
    }, [modalVisible]);

    const handleCloseModal = () => {
        setModalVisible(false);
    };


    const handleClearApps = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
        if (selectedApps.length > 0) {
            setSelectedApps([])
        } else {
            const allApps = data.map((app) => app.idAp)
            setSelectedApps(allApps)
        }
    }

    const handleSelect = (application) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
        setSelectedApps((prev) => {
            if (prev.includes(application.idAp)) {
                // Remove if exists
                return prev.filter(id => id !== application.idAp);
            } else {
                // Add if not exists
                return [...prev, application.idAp];
            }
        });
    };

    const handleSubmit = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
        const dataFiltered = data.filter((aps) => selectedApps.includes(aps.idAp))
        await createApplicationPdf(dataFiltered, farm)
        setModalVisible(false)
    }


    return (
        <>
            <StatusBar backgroundColor="transparent" translucent />
            <SafeAreaProvider style={{ flex: 1 }}>
                <Modal
                    animationType="slide"
                    transparent={false}
                    visible={isModalVisible}
                    onRequestClose={() => {
                        Alert.alert('Modal has been closed.');
                        setModalVisible(!modalVisible);
                    }}
                >
                    <SafeAreaView style={{ flex: 1, backgroundColor: 'whitesmoke', paddingTop: insets.top, paddingBottom: insets.bottom }}>
                        <Pressable
                            style={({ pressed }) => [
                                pressed && styles.pressed,
                                styles.headerContainer,
                            ]}
                            onPress={handleClearApps} >
                            <Text style={{ fontWeight: 'bold', color: Colors.secondary[700] }}>Selecione as Aplicações <Text>{selectedApps?.length}/{data?.length}</Text></Text>
                            <View
                            >
                                <Text style={[styles.allBtn, { color: Colors.primary[500], fontWeight: 'bold' }]}>
                                    {selectedApps.length > 0 ? 'Remover Todas' : 'Selecionar Todas'}
                                </Text>
                            </View>
                        </Pressable>
                        {
                            data &&
                            <ScrollView>
                                {
                                    data.map((app, i) => {
                                        return (
                                            <Pressable
                                                style={({ pressed }) => [
                                                    // styles.button,
                                                    pressed && styles.pressed,
                                                ]}
                                                onPress={handleSelect.bind(this, app)}
                                                key={i}
                                            >
                                                <View style={[styles.selectAppContainer, { backgroundColor: selectedApps.includes(app.idAp) ? Colors.succes[100] : Colors.secondary[100] }]}>
                                                    <View style={{ flexDirection: 'row', gap: 20 }}>
                                                        <Text style={styles.apTitle}>{app.code.replace('AP', 'AP ')}</Text>
                                                        <Text style={styles.opTitle}>{app.operation}</Text>
                                                    </View>
                                                    <View>
                                                        {
                                                            selectedApps.includes(app.idAp) &&
                                                            <MaterialCommunityIcons name="check-all" size={24} color="green" style={{ justifyContent: 'flex-end' }} />
                                                        }
                                                    </View>
                                                </View>
                                            </Pressable>
                                        )
                                    })
                                }
                            </ScrollView>
                        }
                    </SafeAreaView>
                    <View style={{ marginBottom: 40, marginTop: 20, marginHorizontal: 20 }}>
                        <Button
                            btnStyles={{ height: 50, backgroundColor: selectedApps.length === 0 ? Colors.gold[600] : Colors.succes[400] }}
                            onPress={selectedApps.length === 0 ? handleCloseModal : handleSubmit}>
                            {selectedApps.length === 0 ? 'Cancelar' : 'Gerar PDF'}
                        </Button>
                    </View>
                </Modal>
            </SafeAreaProvider>
        </>

    )
}

export default FilterModalApps

const styles = StyleSheet.create({
    allBtn: {
        textDecorationLine: 'underline'
    },
    pressed: {
        opacity: 0.5
    },
    opTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: Colors.secondary[800]
    },
    apTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.primary[700]
    },
    selectAppContainer: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingRight: 20,
        alignItems: 'center',
        paddingLeft: 10,
        gap: 30,
        marginBottom: 10,
        paddingVertical: 15,
        borderWidth: 0.1,
        borderRadius: 0, // Match border radius with the parent wrapper
        zIndex: 0, // Ensure it stays behind the content
        shadowColor: '#000', // iOS shadow color
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 2, // Android shadow for the background

    },
    headerContainer: {
        width: '100%',
        // backgroundColor: Colors.secondary[200],
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        // paddingVertical: 10,
        flexDirection: 'row',
        paddingHorizontal: 10,
        borderBottomColor: 'black',
        borderBottomWidth: 0.3
    },
    mainContainer: {
        flex: 1,
        padding: 20,
        // justifyContent: 'center',
        alignItems: 'center',
        paddingTop: Platform.OS === 'android' ? 25 : 25, // Extra padding for Android devices

    }
})