import { View, Text, StyleSheet } from "react-native";
import { DataTable } from "react-native-paper";
import { Colors } from "../../constants/styles";

const colorDict = [
	{
		key: "acaricida",
		label: "Acaricida",
		color: "rgba(221,129,83,1)",
	},
	{
		key: "inseticida",
		label: "Inseticida",
		color: "rgb(218,78,75)",
	},
	{
		key: "herbicida",
		label: "Herbicida",
		color: "rgb(166,166,54)",
	},
	{
		key: "adjuvante",
		label: "Adjuvante",
		color: "rgb(136,171,172)",
	},
	{
		key: "oleo",
		label: "Óleo",
		color: "rgb(120,161,144)",
	},
	{
		key: "oleo_mineral_vegetal",
		label: "Óleo",
		color: "rgb(120,161,144)",
	},
	{
		key: "micronutrientes",
		label: "Micronutrientes",
		color: "rgb(118,192,226)",
	},
	{
		key: "fungicida",
		label: "Fungicida",
		color: "rgb(238,165,56)",
	},
	{
		key: "fertilizante",
		label: "Fertilizante",
		color: "rgb(76,180,211)",
	},
	{
		key: "nutricao",
		label: "Nutrição",
		color: "rgb(87,77,109)",
	},
	{
		key: "biologico",
		label: "Biológico",
		color: "rgb(69,133,255)",
	},
];

const normalizeType = (value) => {
	if (!value) return "";

	return String(value)
		.trim()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replaceAll("/", "_")
		.replaceAll(" ", "_")
		.replace(/_+/g, "_");
};

const withOpacity = (color, opacity = 0.12) => {
	if (!color) return `rgba(15,23,42,${opacity})`;

	if (color.startsWith("rgb(")) {
		return color.replace("rgb(", "rgba(").replace(")", `,${opacity})`);
	}

	if (color.startsWith("rgba(")) {
		const values = color
			.replace("rgba(", "")
			.replace(")", "")
			.split(",")
			.slice(0, 3)
			.join(",");

		return `rgba(${values},${opacity})`;
	}

	return color;
};

const getTypeTheme = (type) => {
	const normalized = normalizeType(type);

	const found = colorDict.find((item) => {
		return normalizeType(item.key) === normalized;
	});

	if (found) return found;

	return {
		key: normalized || "default",
		label: type ? String(type).replaceAll("_", " ") : "Defensivo",
		color: "rgba(15,23,42,0.42)",
	};
};

const formatDoseValue = (value) => {
	const numberValue = Number(value);

	if (Number.isNaN(numberValue)) return "—";

	if (numberValue <= 10) {
		return numberValue.toLocaleString("pt-BR", {
			minimumFractionDigits: 3,
			maximumFractionDigits: 3,
		});
	}

	return numberValue.toLocaleString("pt-BR", {
		minimumFractionDigits: 0,
		maximumFractionDigits: 2,
	});
};

const CardList = (props) => {
	const {
		estagioData: { estagio, prazo_dap },
		applications = [],
	} = props;

	return (
		<DataTable style={styles.card}>
			<View style={styles.headerTitleContainer}>
				<View style={styles.headerTextBox}>
					<Text style={styles.stageTitle} numberOfLines={1}>
						{estagio}
					</Text>

					<Text style={styles.stageSubtitle}>
						{applications.length}{" "}
						{applications.length === 1 ? "produto" : "produtos"}
					</Text>
				</View>

				<View style={styles.dapPill}>
					<Text style={styles.dapText}>{prazo_dap} DAP</Text>
				</View>
			</View>

			{applications.length > 0 ? (
				applications.map((app, i) => {
					const typeTheme = getTypeTheme(app.defensivo__tipo);
					const typeColor = typeTheme.color;
					const dose = formatDoseValue(app.dose);

					return (
						<DataTable.Row
							key={`${app.defensivo__produto || "produto"}-${app.defensivo__tipo || "tipo"}-${i}`}
							style={[
								styles.row,
								{
									backgroundColor:
										i % 2 === 0
											? withOpacity(typeColor, 0.055)
											: "#FFFFFF",
								},
							]}
						>
							<View
								style={[
									styles.typeColorBar,
									{ backgroundColor: typeColor },
								]}
							/>

							<View style={styles.productColumn}>
								<Text style={styles.productName} numberOfLines={1}>
									{app.defensivo__produto || "Produto não informado"}
								</Text>
							</View>

							<View
								style={[
									styles.typeChip,
									{
										backgroundColor: withOpacity(typeColor, 0.14),
										borderColor: withOpacity(typeColor, 0.42),
									},
								]}
							>
								<Text
									style={[
										styles.typeText,
										{ color: typeColor },
									]}
									numberOfLines={1}
								>
									{typeTheme.label}
								</Text>
							</View>

							<View style={styles.doseColumn}>
								<Text style={styles.doseText}>{dose}</Text>
							</View>
						</DataTable.Row>
					);
				})
			) : (
				<View style={styles.emptyBox}>
					<Text style={styles.emptyText}>-</Text>
				</View>
			)}
		</DataTable>
	);
};

const styles = StyleSheet.create({
	card: {
		width: "100%",
		marginBottom: 6,
		backgroundColor: "#FFFFFF",
		borderRadius: 0,
		overflow: "hidden",
		borderWidth: 0,
		borderBottomWidth: 1,
		borderBottomColor: "rgba(15,23,42,0.10)",
		elevation: 0,
		shadowOpacity: 0,
	},

	headerTitleContainer: {
		flexDirection: "row",
		justifyContent: "space-between",
		paddingHorizontal: 10,
		paddingVertical: 5,
		alignItems: "center",
		backgroundColor: Colors.primary[600],
		minHeight: 40,
	},

	headerTextBox: {
		flex: 1,
		minWidth: 0,
		paddingRight: 10,
	},

	stageTitle: {
		color: "#FFFFFF",
		fontSize: 12.5,
		fontWeight: "900",
	},

	stageSubtitle: {
		marginTop: 1,
		fontSize: 8.8,
		color: "rgba(255,255,255,0.68)",
		fontWeight: "700",
	},

	dapPill: {
		borderRadius: 4,
		backgroundColor: "rgba(255,255,255,0.14)",
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.20)",
		paddingHorizontal: 7,
		paddingVertical: 3,
	},

	dapText: {
		color: "#FFFFFF",
		fontSize: 9.2,
		fontWeight: "900",
	},

	row: {
		minHeight: 32,
		alignItems: "center",
		paddingHorizontal: 7,
		borderBottomWidth: 1,
		borderBottomColor: "rgba(15,23,42,0.045)",
	},

	typeColorBar: {
		width: 4,
		alignSelf: "stretch",
		borderRadius: 999,
		marginRight: 7,
		marginVertical: 5,
	},

	productColumn: {
		flex: 1,
		justifyContent: "center",
		paddingRight: 7,
		minWidth: 0,
	},

	productName: {
		color: "#0F172A",
		fontSize: 10,
		fontWeight: "750",
	},

	typeChip: {
		width: 62,
		borderRadius: 4,
		borderWidth: 1,
		paddingHorizontal: 4,
		paddingVertical: 2,
		alignItems: "center",
		justifyContent: "center",
		marginRight: 7,
	},

	typeText: {
		fontSize: 7.4,
		fontWeight: "900",
		textAlign: "center",
	},

	doseColumn: {
		width: 46,
		alignItems: "flex-end",
		justifyContent: "center",
	},

	doseText: {
		color: "#0F172A",
		fontSize: 10,
		fontWeight: "950",
	},

	emptyBox: {
		minHeight: 30,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "#F8FAFC",
		borderBottomWidth: 1,
		borderBottomColor: "rgba(15,23,42,0.045)",
	},

	emptyText: {
		color: "rgba(15,23,42,0.48)",
		fontSize: 11,
		fontWeight: "800",
	},
	stageTitle: {
		color: "#FFFFFF",
		fontSize: 14,
		fontWeight: "900",
	},

	stageSubtitle: {
		marginTop: 1,
		fontSize: 10,
		color: "rgba(255,255,255,0.68)",
		fontWeight: "700",
	},

	dapText: {
		color: "#FFFFFF",
		fontSize: 10.5,
		fontWeight: "900",
	},

	row: {
		minHeight: 36,
		alignItems: "center",
		paddingHorizontal: 7,
		borderBottomWidth: 1,
		borderBottomColor: "rgba(15,23,42,0.045)",
	},

	productName: {
		color: "#0F172A",
		fontSize: 11.5,
		fontWeight: "750",
	},

	typeChip: {
		width: 70,
		borderRadius: 4,
		borderWidth: 1,
		paddingHorizontal: 4,
		paddingVertical: 2,
		alignItems: "center",
		justifyContent: "center",
		marginRight: 7,
	},

	typeText: {
		fontSize: 8.2,
		fontWeight: "900",
		textAlign: "center",
	},

	doseColumn: {
		width: 50,
		alignItems: "flex-end",
		justifyContent: "center",
	},

	doseText: {
		color: "#0F172A",
		fontSize: 11.5,
		fontWeight: "950",
	},
	
});

export default CardList;