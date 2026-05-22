import React from "react";
import { View, StyleSheet } from "react-native";
import { Text, useTheme, Divider } from "react-native-paper";
import { AnimatedCircularProgress } from "react-native-circular-progress";
import { Colors } from "../../constants/styles";

const ProgressCircleCard = ({
	sownArea = 0,
	plannedArea = 0,
	scsTotal = 0,
	mediaGeral = 0,
	title = "Total Semeado",
	plannedTitle = "Total Planejado",
	abovePlannedTitle = "Acima do Planejado",
	showHarvestStats = true,
}) => {
	const theme = useTheme();

	const safeSownArea = Number(sownArea || 0);
	const safePlannedArea = Number(plannedArea || 0);

	const percentage =
		safePlannedArea > 0 ? Math.min(100, (safeSownArea / safePlannedArea) * 100) : 0;

	const abovePlanned = safePlannedArea - safeSownArea;

	const formatNumber = (number) => {
		return Number(number || 0).toLocaleString("pt-BR", {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		});
	};

	return (
		<View style={styles.card}>
			<View style={styles.progressContainer}>
				<View style={styles.circularProgressContainer}>
					<AnimatedCircularProgress
						size={120}
						width={15}
						fill={percentage}
						tintColor="#00e0ff"
						backgroundColor="#3d5875"
					/>

					<Text style={styles.text}>{`${percentage.toFixed(0)}%`}</Text>
				</View>
			</View>

			<View style={styles.textContainer}>
				<Text style={styles.title}>{title}</Text>
				<Text style={styles.area}>{formatNumber(safeSownArea)} ha</Text>

				<Divider />

				<Text style={styles.plannedTitle}>{plannedTitle}</Text>
				<Text style={styles.plannedArea}>{formatNumber(safePlannedArea)} ha</Text>

				<Divider />

				<Text style={styles.abovePlannedTitle}>{abovePlannedTitle}</Text>
				<Text style={styles.abovePlannedArea}>
					{formatNumber(abovePlanned)} ha
				</Text>
			</View>

			{showHarvestStats && (
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
			)}
		</View>
	);
};

export default ProgressCircleCard;

const styles = StyleSheet.create({
	resumeContainer: {
		alignItems: "flex-end",
	},

	card: {
		backgroundColor: "#fff",
		borderRadius: 8,
		padding: 16,
		elevation: 2,
		margin: 16,
		flexDirection: "row",
		alignItems: "center",
		marginHorizontal: 5,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 5 },
		shadowOpacity: 0.3,
		shadowRadius: 10,
	},

	progressContainer: {
		marginRight: 16,
		justifyContent: "center",
		alignItems: "center",
	},

	circularProgressContainer: {
		position: "relative",
		justifyContent: "center",
		alignItems: "center",
	},

	text: {
		position: "absolute",
		fontSize: 20,
		fontWeight: "bold",
		color: "black",
	},

	textContainer: {
		flex: 1,
		marginLeft: 10,
	},

	textContainerColheita: {
		flex: 1,
		marginLeft: 20,
	},

	title: {
		fontSize: 14,
		fontWeight: "bold",
		marginBottom: 4,
		color: Colors.secondary[500],
	},

	area: {
		fontSize: 12,
		marginBottom: 8,
		fontWeight: "bold",
	},

	plannedTitle: {
		fontSize: 12,
		color: "gray",
		marginBottom: 4,
		fontWeight: "bold",
		marginTop: 5,
	},

	plannedArea: {
		fontSize: 10,
		color: "gray",
		marginBottom: 8,
		fontWeight: "bold",
	},

	abovePlannedTitle: {
		fontSize: 12,
		color: Colors.succes[500],
		marginBottom: 4,
		fontWeight: "bold",
		marginTop: 5,
	},

	abovePlannedArea: {
		fontSize: 10,
		color: "gray",
		fontWeight: "bold",
	},

	titleScs: {
		fontSize: 12,
		color: Colors.primary[800],
		marginBottom: 4,
		fontWeight: "bold",
		marginTop: 5,
	},

	areaScs: {
		fontSize: 10,
		color: "gray",
		marginBottom: 8,
		fontWeight: "bold",
	},

	aboveTitleScsTitle: {
		fontSize: 14,
		color: Colors.succes[500],
		marginBottom: 4,
		fontWeight: "bold",
		marginTop: 5,
	},

	aboveTitleScs: {
		fontSize: 10,
		color: "gray",
		fontWeight: "bold",
	},
});