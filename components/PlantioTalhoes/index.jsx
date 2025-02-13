import { StyleSheet, Text, View, ScrollView, Dimensions, TouchableOpacity, Image } from 'react-native'
import Icon from "react-native-vector-icons/MaterialCommunityIcons"; // Uses MaterialCommunityIcons

import { useState, useEffect } from 'react'
import { Colors } from '../../constants/styles'
import { Pressable } from 'react-native'

import { LINK } from '../../utils/api'
import { EXPO_PUBLIC_REACT_APP_DJANGO_TOKEN } from "@env";

import { Card, Title, Paragraph, DataTable, Divider } from 'react-native-paper';
import TabelaTalhoesScreen from './TableTalhoes'

import { Skeleton } from '@rneui/themed';

// import * as ScreenOrientation from 'expo-screen-orientation';
import dayjs from 'dayjs';

import * as Haptics from 'expo-haptics';

import { AnimatedCircularProgress } from 'react-native-circular-progress';

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



const customWidth = Dimensions.get('window').width;

const { width, height } = Dimensions.get('window');

const CloseButton = ({ onPress, name, color }) => {
    return (
        <TouchableOpacity onPress={onPress} style={styles.closeButton}>
            <Icon name={name} size={24} color={color} />
        </TouchableOpacity>
    );
};

const PlantioTalhoesCard = (props) => {
    const { data } = props
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [showTruckData, setShowTruckData] = useState([]);
    const [canRotate, setCanRotate] = useState(false);



    const formatNumber = number => {
        return number?.toLocaleString("pt-br", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })
    }

    const formatDate = (dateString) => {
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    }




    const handleClose = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
        setShowTruckData([])
    }



    const handleUpdateApiData = async (idText) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
        setIsLoadingData(true)
        try {
            const response = await fetch(LINK + `/colheita/${idText}/get_colheita_detail_react_native/`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Token ${EXPO_PUBLIC_REACT_APP_DJANGO_TOKEN}`,
                },
            });
            if (response.status === 201) {
                // Alert.alert('Tudo Certo', 'Dados Atualizados com sucesso!!')
                const data = await response.json();
                // console.log('resposta here:::', data)
                setShowTruckData(data?.data?.sort((b, a) => a.data_colheita.localeCompare(b.data_colheita)))
                return data
            }
        } catch (error) {
            console.error(error);
            setIsLoadingData(false)
            Alert.alert('Problema em atualizar o banco de dados', `Erro: ${error}`)
        } finally {
            console.log('Finally block reached');  //
            setIsLoadingData(false)
            // Lock to landscape mode on press
            // setCanRotate(true);
            // await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        };
    }

    // useEffect(() => {
    //     // Lock the orientation to portrait by default when the component mounts
    //     if (!canRotate) {
    //         ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    //     }

    //     return () => {
    //         // Lock orientation back to portrait when the component is unmounted or leaves the screen
    //         if (!canRotate) {
    //             ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    //         }
    //     };
    // }, [canRotate]);  // Re-run effect when canRotate state changes


    const handlePress = async (dataPressed) => {
        const idToFind = Number(dataPressed.id)
        await handleUpdateApiData(idToFind)
    }

    const parcialArea = data.area_parcial || 0
    const missingArea = data.area_colheita - parcialArea

    const dapCalc = (dateString) => {
        return dayjs().diff(dayjs(dateString), 'day') + 1;
    }

    const getTotalW = data?.cargas?.find(Boolean) ? data?.cargas?.find(Boolean).total_peso_liquido / 60 : null
    const totalProd = getTotalW ? getTotalW / parcialArea : 0

    const percentage = (parcialArea / data.area_colheita) * 100
    return (
        <Pressable
            style={({ pressed }) => [
                styles.mainContainer,
                pressed && styles.pressed,
                { borderColor: data?.cargas ? Colors.succes[400] : 'whitesmoke', borderWidth: data?.cargas ? 1 : 0.5 }
            ]}
            disabled={showTruckData?.length > 0 || !data?.cargas}
            onPress={handlePress.bind(this, data)}
        >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                {/* <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}> */}

                <View style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ marginBottom: 5 }}>

                        <Text style={{ fontSize: 20, fontWeight: 'bold' }}>{data.talhao__id_talhao}</Text>
                    </View>
                    <Image source={getCultura(data.variedade__cultura__cultura)}
                        style={{ width: 20, height: 20 }}
                    />
                    <Text style={{ fontSize: 10, color: Colors.secondary[500], fontWeight: 'bold' }}>{data.variedade__nome_fantasia.replace('Arroz', '')}</Text>

                </View>
                <View style={{ flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: Colors.secondary[600] }}> Média</Text>
                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: 'green' }}>{formatNumber(totalProd)}</Text>
                </View>
                <View style={{ flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: Colors.secondary[600] }}> Colheita</Text>
                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: 'green' }}>{getTotalW > 0 ? formatNumber(getTotalW) : '-'}</Text>
                </View>
                <View style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                <View style={styles.circularProgressContainer}>
                        <AnimatedCircularProgress
                            size={40}
                            width={5}
                            fill={percentage}
                            tintColor={percentage < 99 ? "#00e0ff" : Colors.succes[300]}
                            onAnimationComplete={() => console.log('onAnimationComplete')}
                            backgroundColor={"#3d5875"}
                        /> 
                        <Text style={styles.text}>{`${percentage.toFixed(0)}%`}</Text>
                    </View>
                    
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <View style={{marginBottom: 3}}>
                    <Text style={{fontSize: 8, fontWeight: 'bold', color: Colors.secondary[500]}}>{data.data_plantio ? dapCalc(data.data_plantio) + ' dias' : '-'}</Text>
                    </View>
                    <View style={{marginBottom: 5}}>
                    <Text style={{fontSize: 8, fontWeight: 'bold', color: Colors.secondary[500]}}>{formatNumber(data.area_colheita)} há</Text>
                    </View>

                    {
                        data?.cargas && showTruckData?.length === 0 && !isLoadingData && (
                            <Icon name={'truck-check'} size={24} color={!data.finalizado_colheita ? Colors.gold[600] : Colors.succes[700]} />
                        )
                    }
                    {
                        !data?.cargas && showTruckData?.length === 0 && !isLoadingData && (
                            <Icon name={'timer'} size={24} color={Colors.secondary[400]} />
                        )
                    }


                </View>
            </View>
            
            <View>



                {
                    showTruckData?.length > 0 && (
                        <>
                            <TabelaTalhoesScreen data={showTruckData} />
                        </>
                    )
                }
            </View>
            <View>


                {
                    isLoadingData &&
                    <View style={styles.mainSkelContainer}>
                        {/* Header Skeleton */}
                        <View style={styles.skelContainer}>
                            <Skeleton
                                animation="wave"
                                width={customWidth * 0.9} // 60% of custom width
                                height={25}
                            />
                        </View>

                        {/* Lines Skeleton */}
                        {[...Array(4)].map((_, index) => (
                            <View key={index} style={styles.skelContainer}>
                                <Skeleton
                                    animation="wave"
                                    width={customWidth * 0.9} // 90% of custom width
                                    height={20}
                                />
                            </View>
                        ))}
                    </View>
                }
                {
                    data?.cargas && showTruckData?.length > 0 && !isLoadingData && (

                        <View style={{ alignItems: 'flex-end', marginVertical: 10 }}>
                            <CloseButton onPress={handleClose} name={"arrow-up-thick"} color={Colors.error[300]} />
                        </View>
                    )
                }
            </View>
        </Pressable>
    )
}

export default PlantioTalhoesCard

const styles = StyleSheet.create({
    text: {
        position: 'absolute',
        fontSize: 9,
        fontWeight: 'bold',
        color: 'black',
    },
    circularProgressContainer: {
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
    },
    mainSkelContainer: {
        padding: 16,
        justifyContent: 'center',
        alignItems: 'center',
        flex: 1
    },
    skelContainer: {
        marginBottom: 10,
        borderRadius: 12,
    },
    // skelContainer: {
    // 	flex: 1,
    // 	justifyContent: 'center',
    // 	alignItems: 'center',
    // 	marginVertical: 10
    // },
    mainContainer: {
        backgroundColor: Colors.secondary[100],
        // borderWidth: 0.5,
        borderColor: 'black',
        marginHorizontal: 5,
        borderRadius: 5,
        flex: 1,
        padding: 2,
        paddingHorizontal: 5,
        flexDirection: 'column',
        justifyContent: 'space-between',

        shadowColor: '#000',  // Shadow color for iOS
        shadowOffset: { width: 0, height: 2 },  // Position of the shadow
        shadowOpacity: 0.25,  // Opacity of the shadow
        shadowRadius: 3.5,  // Blur radius for the shadow

        // For Android:
        elevation: 5,  // Controls shadow depth and intensity on Android,
    },
    pressed: {
        opacity: 0.5,
    },
})