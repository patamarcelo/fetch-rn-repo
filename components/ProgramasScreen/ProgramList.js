import {
	View,
	Text,
	StyleSheet,
	RefreshControl,
	TextInput,
	SectionList,
	TouchableOpacity,
} from "react-native";

import { useState, useEffect, useMemo } from "react";
import { FAB } from "react-native-paper";
import { Colors } from "../../constants/styles";

import { useSelector } from "react-redux";
import {
	estagiosSelector,
	programSelector,
	dataProgramSelector,
} from "../../store/redux/selector";

import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";


import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";

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

const normalizeText = (value) => {
	if (!value) return "";

	return String(value)
		.trim()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase();
};

const normalizeType = (value) => {
	if (!value) return "";

	return normalizeText(value)
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

	const found = colorDict.find((item) => normalizeType(item.key) === normalized);

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

const StageHeader = ({ section }) => {
	const { estagioData, totalProducts } = section;

	return (
		<View style={styles.headerTitleContainer}>
			<View style={styles.headerTextBox}>
				<Text style={styles.stageTitle} numberOfLines={1}>
					{estagioData.estagio}
				</Text>

				<Text style={styles.stageSubtitle}>
					{totalProducts} {totalProducts === 1 ? "produto" : "produtos"}
				</Text>
			</View>

			<View style={styles.dapPill}>
				<Text style={styles.dapText}>{estagioData.prazo_dap} DAP</Text>
			</View>
		</View>
	);
};

const ProductRow = ({ item, index }) => {
	const typeTheme = getTypeTheme(item.defensivo__tipo);
	const typeColor = typeTheme.color;
	const dose = formatDoseValue(item.dose);

	return (
		<View
			style={[
				styles.row,
				{
					backgroundColor:
						index % 2 === 0 ? withOpacity(typeColor, 0.055) : "#FFFFFF",
				},
			]}
		>
			<View style={[styles.typeColorBar, { backgroundColor: typeColor }]} />

			<View style={styles.productColumn}>
				<Text style={styles.productName} numberOfLines={1}>
					{item.defensivo__produto || "Produto não informado"}
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
				<Text style={[styles.typeText, { color: typeColor }]} numberOfLines={1}>
					{typeTheme.label}
				</Text>
			</View>

			<View style={styles.doseColumn}>
				<Text style={styles.doseText}>{dose}</Text>
			</View>
		</View>
	);
};

const EmptyRow = () => {
	return (
		<View style={styles.emptyBox}>
			<Text style={styles.emptyText}>-</Text>
		</View>
	);
};

const ProgramList = ({ refresh, isLoading, innerRef, setPrintableData }) => {
	const tabBarHeight = useBottomTabBarHeight();
	

	const estagios = useSelector(estagiosSelector);
	const programa = useSelector(programSelector);
	const dataProgram = useSelector(dataProgramSelector);

	const [searchQuery, setSearchQuery] = useState("");
	const [showSearch, setShowSearch] = useState(false);
	const [filteredEstagios, setFilteredEstagios] = useState([]);

	const topOffset = showSearch ? 0 : 10;

	useEffect(() => {
		const estagiosFilteredTs = estagios.filter(
			(data) => data.programa__nome === programa.nome
		);

		const ts_programas =
			estagiosFilteredTs.find((data) =>
				data.estagio.toLowerCase().includes("tratamento")
			) || null;

		const estagiosFiltered = estagios
			.filter(
				(data) =>
					data.programa__nome === programa.nome && data.prazo_dap >= 0
			)
			.sort((a, b) => a.prazo_dap - b.prazo_dap);

		const newArray = [ts_programas, ...estagiosFiltered].filter(Boolean);

		setFilteredEstagios(newArray);

		const programName = programa.nome;

		const produtosFilter = dataProgram.filter(
			(prods) => prods.operacao__programa__nome === programName
		);

		const objToAdd = {
			estagios: newArray,
			produtos: produtosFilter,
			program: programa,
		};

		setPrintableData(objToAdd);
	}, [programa, estagios, dataProgram, setPrintableData]);

	const sections = useMemo(() => {
		const normalizedSearch = normalizeText(searchQuery);

		const baseSections = filteredEstagios.map((estagioData) => {
			const applications = dataProgram
				.filter((app) => {
					return (
						app.operacao__estagio === estagioData.estagio &&
						app.operacao__programa__nome === programa.nome
					);
				})
				.sort((a, b) =>
					String(a.defensivo__tipo || "").localeCompare(
						String(b.defensivo__tipo || "")
					)
				);

			const filteredApplications = normalizedSearch
				? applications.filter((app) => {
					const product = normalizeText(app.defensivo__produto);
					const type = normalizeText(app.defensivo__tipo);
					const stage = normalizeText(app.operacao__estagio);

					return (
						product.includes(normalizedSearch) ||
						type.includes(normalizedSearch) ||
						stage.includes(normalizedSearch)
					);
				})
				: applications;

			return {
				key: estagioData.estagio,
				estagioData,
				totalProducts: filteredApplications.length,
				data:
					filteredApplications.length > 0
						? filteredApplications
						: normalizedSearch
							? []
							: [{ empty: true, id: `${estagioData.estagio}-empty` }],
			};
		});

		if (!normalizedSearch) {
			return baseSections;
		}

		return baseSections.filter((section) => section.data.length > 0);
	}, [filteredEstagios, dataProgram, programa.nome, searchQuery]);

	const handleFilterProps = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
		setShowSearch((prev) => !prev);
		setSearchQuery("");
	};

	return (
		<SafeAreaView style={styles.container} edges={[""]}>
			{showSearch && (
				<View style={styles.searchWrapper}>
					<TextInput
						style={styles.searchBar}
						placeholder="Buscar produto, tipo ou estágio..."
						placeholderTextColor="rgba(15,23,42,0.42)"
						value={searchQuery}
						onChangeText={setSearchQuery}
						autoFocus
					/>

					{searchQuery ? (
						<TouchableOpacity
							activeOpacity={0.75}
							onPress={() => setSearchQuery("")}
							style={styles.clearSearchButton}
						>
							<Text style={styles.clearSearchText}>×</Text>
						</TouchableOpacity>
					) : null}
				</View>
			)}

			<SectionList
				ref={innerRef}
				sections={sections}
				keyExtractor={(item, index) => {
					if (item.empty) return item.id;
					return `${item.defensivo__produto || "produto"}-${item.defensivo__tipo || "tipo"}-${index}`;
				}}
				renderSectionHeader={({ section }) => (
					<StageHeader section={section} />
				)}
				renderItem={({ item, index }) => {
					if (item.empty) return <EmptyRow />;
					return <ProductRow item={item} index={index} />;
				}}
				stickySectionHeadersEnabled
				showsVerticalScrollIndicator
				style={[
					styles.mainContainer,
					{ marginTop: topOffset },
				]}
				contentContainerStyle={{
					paddingBottom: tabBarHeight + 18,
					paddingTop: 0,
				}}
				contentInsetAdjustmentBehavior="never"
				automaticallyAdjustContentInsets={false}
				refreshControl={
					<RefreshControl
						refreshing={isLoading}
						onRefresh={refresh}
						colors={[Colors.primary[800]]}
						tintColor={Colors.primary[800]}
						titleColor={Colors.primary[800]}
						progressBackgroundColor="#FFFFFF"
					/>
				}
				ListEmptyComponent={
					<View style={styles.listEmptyBox}>
						<Text style={styles.listEmptyTitle}>Nenhum produto encontrado</Text>
						<Text style={styles.listEmptyText}>
							Tente buscar por outro produto, tipo ou estágio.
						</Text>
					</View>
				}
			/>

			<View style={[styles.fabContainer, { bottom: tabBarHeight + 20 }]}>
				<FAB
					style={styles.fab}
					icon={showSearch ? "close" : "magnify"}
					color="black"
					onPress={handleFilterProps}
				/>
			</View>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#FFFFFF",
	},

	mainContainer: {
		flex: 1,
		width: "100%",
	},

	searchWrapper: {
		marginHorizontal: 10,
		marginTop: 16,
		marginBottom: 8,
		height: 42,
		borderRadius: 16,
		backgroundColor: "#F1F5F9",
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.08)",
		flexDirection: "row",
		alignItems: "center",
		paddingLeft: 14,
		paddingRight: 6,
	},

	searchBar: {
		flex: 1,
		height: 40,
		color: "#0F172A",
		fontSize: 13,
		fontWeight: "700",
		paddingVertical: 0,
	},

	clearSearchButton: {
		width: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: "rgba(15,23,42,0.08)",
		alignItems: "center",
		justifyContent: "center",
	},

	clearSearchText: {
		color: "rgba(15,23,42,0.64)",
		fontSize: 20,
		fontWeight: "700",
		marginTop: -2,
	},

	headerTitleContainer: {
		flexDirection: "row",
		justifyContent: "space-between",
		paddingHorizontal: 10,
		paddingVertical: 6,
		alignItems: "center",
		backgroundColor: Colors.primary[600],
		minHeight: 44,
		borderBottomWidth: 1,
		borderBottomColor: "rgba(255,255,255,0.10)",
	},

	headerTextBox: {
		flex: 1,
		minWidth: 0,
		paddingRight: 10,
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
		fontSize: 10.5,
		fontWeight: "900",
	},

	row: {
		minHeight: 36,
		flexDirection: "row",
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

	emptyBox: {
		minHeight: 34,
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

	listEmptyBox: {
		paddingTop: 42,
		alignItems: "center",
		paddingHorizontal: 24,
	},

	listEmptyTitle: {
		color: "#0F172A",
		fontSize: 15,
		fontWeight: "900",
	},

	listEmptyText: {
		marginTop: 5,
		color: "rgba(15,23,42,0.52)",
		fontSize: 12,
		fontWeight: "700",
		textAlign: "center",
	},

	fabContainer: {
		position: "absolute",
		right: 20,
	},

	fab: {
		position: "absolute",
		right: 0,
		bottom: 10,
		backgroundColor: "rgba(200, 200, 200, 0.3)",
		width: 50,
		height: 50,
		borderRadius: 25,
		borderColor: Colors.primary[300],
		borderWidth: 1,
		justifyContent: "center",
		alignItems: "center",
		elevation: 4,
	},
});

export default ProgramList;