import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme, Divider } from 'react-native-paper';
import { AnimatedCircularProgress } from 'react-native-circular-progress';

import { CircularProgress } from 'react-native-circular-progress';
import { Colors } from '../../constants/styles';

const ProgressCircleCard = ({
    sownArea,
    plannedArea,
    scsTotal,
    mediaGeral,
    title = "Total Semeado",
    plannedTitle = "Total Planejado",
    abovePlannedTitle = "Acima do Planejado",
}) => {

    const theme = useTheme();

    const percentage = (sownArea / plannedArea) * 100;
    const abovePlanned = plannedArea - sownArea;


    const formatNumber = number => {
        return number?.toLocaleString("pt-br", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })
    }

    return (
        <View style={styles.card}>
            <View style={styles.progressContainer}>
                <View style={styles.circularProgressContainer}>
                    <AnimatedCircularProgress
                        size={120}
                        width={15}
                        fill={percentage}
                        tintColor="#00e0ff"
                        onAnimationComplete={() => console.log('onAnimationComplete')}
                        backgroundColor="#3d5875"
                    />
                    <Text style={styles.text}>{`${percentage.toFixed(0)}%`}</Text>
                </View>
            </View>

            <View style={styles.textContainer}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.area}>{sownArea.toLocaleString()} ha</Text>
                <Divider />
                <Text style={styles.plannedTitle}>{plannedTitle}</Text>
                <Text style={styles.plannedArea}>{plannedArea.toLocaleString()} ha</Text>
                <Divider />
                <Text style={styles.abovePlannedTitle}>{abovePlannedTitle}</Text>
                <Text style={styles.abovePlannedArea}>
                    {abovePlanned.toLocaleString()} ha
                </Text>
            </View>
            {/* <Divider style={styles.verticalDivider} /> */}
            <View style={styles.textContainerColheita}>
                <View style={styles.resumeContainer}>
                    <Text style={styles.titleScs}>Colheita Scs</Text>
                    <Text style={styles.areaScs}>{formatNumber(scsTotal)}</Text>
                </View>

                <Divider leftInset />
                <View style={styles.resumeContainer}>

                    <Text style={styles.aboveTitleScsTitle}>Média</Text>
                    <Text style={styles.aboveTitleScs}>
                        {formatNumber(mediaGeral)} Scs/ha
                    </Text>
                </View>
            </View>
        </View>
    );
};

export default ProgressCircleCard;

const styles = StyleSheet.create({
    verticalDivider: {
        height: '100%', // Full height of the container
        width: 0.5, // Thickness of the divider
        backgroundColor: Colors.secondary[200],
        marginRight: -20
    },
    resumeContainer: {
        alignItems: 'flex-end'
    },
    card: {
        marginTop: 140,
        backgroundColor: 'white', // Or use theme.colors.surface
        borderRadius: 8,
        padding: 16,
        elevation: 2, // For Android shadow
        margin: 16, // Add margin around the card
        flexDirection: 'row', // Arrange progress and text side by side
        alignItems: 'center', // Vertically center content

        backgroundColor: '#fff',
        marginHorizontal: 5,
        // borderRadius: 10,
        shadowColor: '#000', // iOS shadow color
        shadowOffset: { width: 0, height: 5 }, // iOS shadow offset
        shadowOpacity: 0.3, // iOS shadow opacity
        shadowRadius: 10, // iOS shadow blur radius
    },
    progressContainer: {
        marginRight: 16, // Space between circle and text
        justifyContent: 'center',
        alignItems: 'center',
    },
    circularProgressContainer: {
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
    },
    text: {
        position: 'absolute',
        fontSize: 20,
        fontWeight: 'bold',
        color: 'black',
    },
    textContainer: {
        // ali: 'center',
        flex: 1, // Allow text container to take up remaining space
        marginLeft: 10
    },
    textContainerColheita: {
        // ali: 'center',
        flex: 1, // Allow text container to take up remaining space
        // alignItems: 'cener',
        marginLeft: 20,
        
    },
    title: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 4,
        color: Colors.secondary[500]
    },
    area: {
        fontSize: 12,
        marginBottom: 8,
        fontWeight: 'bold'
    },
    plannedTitle: {
        fontSize: 12,
        color: 'gray',
        marginBottom: 4,
        fontWeight: 'bold',
        marginTop: 5
    },
    plannedArea: {
        fontSize: 10,
        color: 'gray',
        marginBottom: 8,
        fontWeight: 'bold'
    },
    abovePlannedTitle: {
        fontSize: 12,
        color: Colors.succes[500],
        marginBottom: 4,
        fontWeight: 'bold',
        marginTop: 5
    },
    abovePlannedArea: {
        fontSize: 10,
        color: 'gray',
        fontWeight: 'bold'
    },
    titleScs: {
        fontSize: 12,
        color: Colors.primary[800],
        marginBottom: 4,
        fontWeight: 'bold',
        marginTop: 5
    },
    areaScs: {
        fontSize: 10,
        color: 'gray',
        marginBottom: 8,
        fontWeight: 'bold'
    },
    aboveTitleScsTitle: {
        fontSize: 14,
        color: Colors.succes[500],
        marginBottom: 4,
        fontWeight: 'bold',
        marginTop: 5
    },
    aboveTitleScs: {
        fontSize: 10,
        color: 'gray',
        fontWeight: 'bold'
    },
});