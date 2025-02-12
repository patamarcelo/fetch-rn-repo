import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme, Divider } from 'react-native-paper';
import { AnimatedCircularProgress } from 'react-native-circular-progress';

import { CircularProgress } from 'react-native-circular-progress';
import { Colors } from '../../constants/styles';

const ProgressCircleCard = ({
    sownArea,
    plannedArea,
    title = "Total Semeado",
    plannedTitle = "Total Planejado",
    abovePlannedTitle = "Acima do Planejado",
}) => {
    const theme = useTheme();

    const percentage = (sownArea / plannedArea) * 100;
    const abovePlanned = plannedArea - sownArea;

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
        </View>
    );
};

export default ProgressCircleCard;

const styles = StyleSheet.create({
    card: {
        marginTop: 140,
        backgroundColor: 'white', // Or use theme.colors.surface
        borderRadius: 8,
        padding: 16,
        elevation: 2, // For Android shadow
        margin: 16, // Add margin around the card
        flexDirection: 'row', // Arrange progress and text side by side
        alignItems: 'center', // Vertically center content
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
        marginLeft: 20
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
        color: Colors.secondary[500]
    },
    area: {
        fontSize: 18,
        marginBottom: 8,
        fontWeight: 'bold'
    },
    plannedTitle: {
        fontSize: 14,
        color: 'gray',
        marginBottom: 4,
        fontWeight: 'bold',
        marginTop: 5
    },
    plannedArea: {
        fontSize: 16,
        color: 'gray',
        marginBottom: 8,
        fontWeight: 'bold'
    },
    abovePlannedTitle: {
        fontSize: 14,
        color: Colors.succes[500],
        marginBottom: 4,
        fontWeight: 'bold',
        marginTop: 5
    },
    abovePlannedArea: {
        fontSize: 16,
        color: 'gray',
        fontWeight: 'bold'
    },
});