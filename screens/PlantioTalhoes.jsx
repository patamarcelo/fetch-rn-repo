import {
    View,
    FlatList,
    Text,
    Platform,
    RefreshControl,
    Alert,
    StyleSheet
} from 'react-native';

import {
    SafeAreaView,
    useSafeAreaInsets
} from 'react-native-safe-area-context';

import { SafeAreaView as SaveView } from 'react-native-safe-area-context';

import {
    useRoute,
    useIsFocused,
    useFocusEffect
} from '@react-navigation/native';

import {
    useEffect,
    useState,
    useMemo,
    useCallback
} from 'react';

import {
    useSelector,
    shallowEqual,
    useDispatch
} from 'react-redux';

import { FAB } from 'react-native-paper';

import * as Haptics from 'expo-haptics';

import dayjs from 'dayjs';

import { selectColheitaData } from '../store/redux/selector';
import PlantioTalhoesCard from '../components/PlantioTalhoes';
import FilterPlantioComponent from '../components/Global/FilterPlantioComponent';

import { Colors } from '../constants/styles';

import { geralActions } from '../store/redux/geral';

import { LINK } from '../utils/api';

import {
    EXPO_PUBLIC_REACT_APP_DJANGO_TOKEN
} from '@env';

import {
    CUSTOM_TAB_BAR_TOTAL_HEIGHT,
    CUSTOM_TAB_BAR_CONTENT_PADDING,
} from '../constans/layout';


const PlantioTalhoesCardScreen = (itemData) => {
    return (
        <PlantioTalhoesCard
            data={itemData.item}
        />
    );
};


const PlantioTalhoesDescription = ({ navigation }) => {

    const isFocused = useIsFocused();

    const insets = useSafeAreaInsets();

    const route = useRoute();

    const { farm } = route.params;

    const dispatch = useDispatch();

    const colheitaData = useSelector(
        selectColheitaData,
        shallowEqual
    );

    const { data = [] } = colheitaData;

    const {
        setColheitaData
    } = geralActions;


    const [isRefreshing, setIsRefreshing] = useState(false);

    /*
     * Impede que a tela navegue para PlantioScreen
     * antes de concluir o primeiro refresh ao ganhar foco.
     */
    const [
        hasFocusedRefreshCompleted,
        setHasFocusedRefreshCompleted
    ] = useState(false);


    const [filterByDate, setFilterByDate] = useState(false);

    const [filterdByLoad, setFilterdByLoad] = useState(false);

    const [
        filteredNotLoading,
        setFilteredNotLoading
    ] = useState(false);


    /*
     * ============================================================
     * DADOS DA FAZENDA
     * ============================================================
     */

    const filteredDataResults = useMemo(() => {

        return data.filter(
            plantio =>
                plantio.talhao__fazenda__nome === farm
        );

    }, [data, farm]);


    /*
     * ============================================================
     * REFRESH API
     * ============================================================
     */

    const handleUpdateApiData = useCallback(
        async (showSuccessAlert = true) => {

            setIsRefreshing(true);

            try {

                const response = await fetch(
                    LINK +
                    '/plantio/get_colheita_plantio_info_react_native/',
                    {
                        method: 'POST',

                        body: JSON.stringify({
                            safra: '2024/2025',
                            ciclo: '3',
                        }),

                        headers: {
                            'Content-Type': 'application/json',

                            Authorization:
                                `Token ${EXPO_PUBLIC_REACT_APP_DJANGO_TOKEN}`,
                        },
                    }
                );


                if (!response.ok) {

                    throw new Error(
                        `Erro HTTP ${response.status}`
                    );
                }


                const responseData = await response.json();


                dispatch(
                    setColheitaData(responseData)
                );


                if (showSuccessAlert) {

                    Alert.alert(
                        'Tudo Certo',
                        'Dados Atualizados com sucesso!!'
                    );
                }


                return responseData;

            } catch (error) {

                console.error(
                    '[COLHEITA] Erro ao atualizar dados:',
                    error
                );


                Alert.alert(
                    'Problema em atualizar o banco de dados',
                    `Erro: ${error?.message || error}`
                );

                return null;

            } finally {

                setIsRefreshing(false);
            }

        },
        [
            dispatch,
            setColheitaData
        ]
    );


    /*
     * ============================================================
     * REFRESH AUTOMÁTICO AO ENTRAR / VOLTAR PARA A TELA
     * ============================================================
     */

    useFocusEffect(

        useCallback(() => {

            let isActive = true;


            console.log(
                '[COLHEITA] Tela recebeu foco'
            );


            /*
             * Marca como "ainda carregando".
             *
             * Isso impede o useEffect abaixo de navegar
             * para PlantioScreen antes do refresh terminar.
             */
            setHasFocusedRefreshCompleted(false);


            const refreshOnFocus = async () => {

                await handleUpdateApiData(false);


                if (isActive) {

                    setHasFocusedRefreshCompleted(true);
                }
            };


            refreshOnFocus();


            return () => {

                isActive = false;

                console.log(
                    '[COLHEITA] Tela perdeu foco'
                );
            };

        }, [handleUpdateApiData])
    );


    /*
     * ============================================================
     * CASO NÃO EXISTAM RESULTADOS PARA A FAZENDA
     * ============================================================
     *
     * Só verifica DEPOIS que o refresh automático terminou.
     *
     * Assim evitamos:
     *
     * entra na tela
     * -> Redux ainda vazio
     * -> navigate PlantioScreen
     * -> API responde depois
     *
     */

    useEffect(() => {

        if (!isFocused) {
            return;
        }


        if (!hasFocusedRefreshCompleted) {
            return;
        }


        if (isRefreshing) {
            return;
        }


        if (filteredDataResults.length > 0) {
            return;
        }


        const timeout = setTimeout(() => {

            navigation.navigate(
                'PlantioScreen'
            );

        }, 600);


        return () => {

            clearTimeout(timeout);
        };

    }, [
        isFocused,
        hasFocusedRefreshCompleted,
        isRefreshing,
        filteredDataResults.length,
        navigation
    ]);


    /*
     * ============================================================
     * DATA
     * ============================================================
     */

    const daysUntilFutureDate = useCallback(
        (dateStr, daysToAdd) => {

            const futureDate = dayjs(dateStr)
                .add(daysToAdd, 'day');

            const today = dayjs()
                .startOf('day');

            return futureDate.diff(
                today,
                'day'
            );
        },
        []
    );


    /*
     * ============================================================
     * FILTROS
     * ============================================================
     */

    const handleFilterPlant = () => {

        Haptics.impactAsync(
            Haptics.ImpactFeedbackStyle.Heavy
        );

        setFilterByDate(
            previous => !previous
        );
    };


    const handleFilterLoad = () => {

        Haptics.impactAsync(
            Haptics.ImpactFeedbackStyle.Heavy
        );

        setFilterdByLoad(
            previous => !previous
        );
    };


    const handleFilterNotLoad = () => {

        Haptics.impactAsync(
            Haptics.ImpactFeedbackStyle.Heavy
        );

        setFilteredNotLoading(
            previous => !previous
        );
    };


    /*
     * ============================================================
     * DADOS FILTRADOS
     * ============================================================
     */

    const filteredData = useMemo(() => {

        return data
            .filter(
                plantio =>
                    plantio.talhao__fazenda__nome === farm
            )

            .filter(
                plantio =>
                    filterdByLoad
                        ? plantio.area_parcial > 0
                        : true
            )

            .filter(
                plantio =>
                    filteredNotLoading
                        ? plantio.area_parcial === null
                        : true
            )

            .sort(
                (a, b) => {

                    if (!filterByDate) {
                        return 0;
                    }


                    return (
                        daysUntilFutureDate(
                            a.data_plantio,
                            a.variedade__dias_ciclo
                        )
                        -
                        daysUntilFutureDate(
                            b.data_plantio,
                            b.variedade__dias_ciclo
                        )
                    );
                }
            );

    }, [
        data,
        farm,
        filterdByLoad,
        filteredNotLoading,
        filterByDate,
        daysUntilFutureDate
    ]);


    /*
     * ============================================================
     * RENDER
     * ============================================================
     */

    return (
        <>
            {
                /*
                 * Durante o primeiro refresh da tela,
                 * não mostramos "Sem resultados".
                 *
                 * Isso evita aquele flash visual antes
                 * da API responder.
                 */
                hasFocusedRefreshCompleted &&
                filteredDataResults.length === 0
                    ? (
                        <View
                            style={{
                                flex: 1,
                                justifyContent: 'center',
                                alignItems: 'center'
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 16,
                                    fontWeight: 'bold',
                                    color: Colors.secondary[600]
                                }}
                            >
                                Sem Resultados para o Filtro Selecionado
                            </Text>
                        </View>
                    )
                    : (
                        <SafeAreaView
                            contentInsetAdjustmentBehavior="automatic"
                            style={{
                                flex: 1,

                                paddingTop:
                                    Platform.OS === 'android'
                                        ? insets.top + 22
                                        : 0,
                            }}
                            edges={['top']}
                        >

                            <FlatList
                                key={farm}

                                contentInsetAdjustmentBehavior="automatic"

                                initialNumToRender={5}

                                maxToRenderPerBatch={5}

                                windowSize={7}

                                removeClippedSubviews={true}

                                scrollEnabled={true}

                                contentContainerStyle={{
                                    paddingBottom:
                                        CUSTOM_TAB_BAR_CONTENT_PADDING + 50,

                                    paddingTop: 10,
                                }}

                                data={filteredData}

                                keyExtractor={
                                    item =>
                                        item.id.toString()
                                }

                                renderItem={
                                    PlantioTalhoesCardScreen
                                }

                                ItemSeparatorComponent={
                                    () => (
                                        <View
                                            style={{
                                                height: 13
                                            }}
                                        />
                                    )
                                }

                                refreshControl={
                                    <RefreshControl

                                        refreshing={
                                            isRefreshing
                                        }

                                        onRefresh={() => {

                                            console.log(
                                                '[COLHEITA] Pull-to-refresh'
                                            );

                                            handleUpdateApiData(true);
                                        }}

                                        colors={[
                                            Colors.secondary[100],
                                            Colors.secondary[200],
                                            Colors.secondary[300]
                                        ]}

                                        tintColor={
                                            Colors.secondary[100]
                                        }
                                    />
                                }
                            />


                            <FilterPlantioComponent />


                            <SaveView
                                style={
                                    styles.fabContainer
                                }
                                edges={[]}
                            >
                                <FAB
                                    style={[
                                        styles.fab,
                                        {
                                            marginBottom:
                                                CUSTOM_TAB_BAR_TOTAL_HEIGHT
                                        }
                                    ]}

                                    icon={
                                        filterByDate
                                            ? 'calendar'
                                            : 'sort-alphabetical-variant'
                                    }

                                    color="black"

                                    onPress={
                                        handleFilterPlant
                                    }
                                />
                            </SaveView>


                            <SaveView
                                style={
                                    styles.fabContainer2
                                }
                                edges={[]}
                            >
                                <FAB
                                    style={[
                                        styles.fab,

                                        {
                                            marginBottom:
                                                CUSTOM_TAB_BAR_TOTAL_HEIGHT,

                                            backgroundColor:
                                                filterdByLoad
                                                    ? 'rgba(153,204,153,0.4)'
                                                    : 'rgba(200, 200, 200, 0.3)'
                                        }
                                    ]}

                                    icon="truck"

                                    color="black"

                                    onPress={
                                        handleFilterLoad
                                    }

                                    disabled={
                                        filteredNotLoading
                                    }
                                />
                            </SaveView>


                            <SaveView
                                style={
                                    styles.fabContainer3
                                }
                                edges={[]}
                            >
                                <FAB
                                    style={[
                                        styles.fab,

                                        {
                                            marginBottom:
                                                CUSTOM_TAB_BAR_TOTAL_HEIGHT,

                                            backgroundColor:
                                                filteredNotLoading
                                                    ? 'rgba(255,102,102,0.4)'
                                                    : 'rgba(200, 200, 200, 0.3)'
                                        }
                                    ]}

                                    icon="truck-remove"

                                    color="black"

                                    onPress={
                                        handleFilterNotLoad
                                    }

                                    disabled={
                                        filterdByLoad
                                    }
                                />
                            </SaveView>

                        </SafeAreaView>
                    )
            }
        </>
    );
};


export default PlantioTalhoesDescription;


const styles = StyleSheet.create({

    fabContainer3: {
        position: 'absolute',
        right: 240,
        bottom: 20,
    },


    fabContainer2: {
        position: 'absolute',
        right: 180,
        bottom: 20,
    },


    fabContainer: {
        position: 'absolute',
        right: 120,
        bottom: 20,
    },


    fab: {
        position: 'absolute',

        right: 0,

        bottom: 0,

        backgroundColor:
            'rgba(200, 200, 200, 0.3)',

        width: 50,

        height: 50,

        borderRadius: 25,

        justifyContent: 'center',

        alignItems: 'center',

        elevation: 4,

        borderColor:
            Colors.primary[300],

        borderWidth: 1,
    },
});