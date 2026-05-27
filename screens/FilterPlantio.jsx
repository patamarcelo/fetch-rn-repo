import {
	StyleSheet,
	Text,
	View,
	Pressable,
	ScrollView,
	Animated as RealAnimated,
	TouchableOpacity,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import {
	selectColheitaDataFilter,
	selectColheitaDataToggle,
	selectCurrentFilterSelected,
} from "../store/redux/selector";
import { Colors } from "../constants/styles";
import { useEffect, useMemo, useRef } from "react";

// import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import Icon from "@expo/vector-icons/MaterialCommunityIcons";
import * as Haptics from "expo-haptics";
import { geralActions } from "../store/redux/geral";

import Button from "../components/ui/Button";

import { FadeInRight, FadeOut, Layout } from "react-native-reanimated";
import Animated from "react-native-reanimated";

import {
	CUSTOM_TAB_BAR_TOTAL_HEIGHT,
	CUSTOM_TAB_BAR_CONTENT_PADDING,
	CUSTOM_TAB_BAR_FAB_BOTTOM,
} from "../constants/layout";

const makeSafraCicloKey = (item = {}) => {
	const nome = item?.nome || item?.label || "";
	const safra = item?.safra || "";
	const ciclo = item?.ciclo || "";

	return `${nome}|${safra}|${ciclo}`;
};

const getSafraCicloLabel = (item = {}) => {
	const nome = item?.label || item?.nome || "Safra/Ciclo";
	const safra = item?.safra || "-";
	const ciclo = item?.ciclo || "-";

	return {
		title: nome,
		subtitle: `${safra} • Ciclo ${ciclo}`,
	};
};

const FilterPlantioScreen = ({ navigation }) => {
	const filterData = useSelector(selectColheitaDataFilter) || {};
	const filters = useSelector(selectColheitaDataToggle) || {};
	const filterSelected = useSelector(selectCurrentFilterSelected);

	const dispatch = useDispatch();

	const {
		setColheitaFilter,
		clearColheitaFilter,
		setCurrentFilterSelected,
	} = geralActions;

	const {
		safra_ciclo = [],
		farm = [],
		proj = [],
		culture = [],
		variety = [],
	} = filterData;


	const selectedIndex = useRef(new RealAnimated.Value(0)).current;

	const handleFilterButtons = useMemo(
		() => [
			{
				label: "Etapa",
				title: "safra_ciclo",
				filter: "safra_ciclo",
			},
			{
				label: "Fazenda",
				title: "fazenda",
				filter: "farm",
			},
			{
				label: "Projeto",
				title: "projeto",
				filter: "proj",
			},
			{
				label: "Cultura",
				title: "cultura",
				filter: "culture",
			},
			{
				label: "Variedade",
				title: "variedade",
				filter: "variety",
			},
		],
		[]
	);

	useEffect(() => {
		if (!filterSelected) {
			dispatch(setCurrentFilterSelected("safra_ciclo"));

			RealAnimated.timing(selectedIndex, {
				toValue: 0,
				duration: 300,
				useNativeDriver: false,
			}).start();
		}
	}, []);

	useEffect(() => {
		if (filterSelected) {
			const getIndex = handleFilterButtons.findIndex(
				(item) => item.title === filterSelected
			);

			RealAnimated.timing(selectedIndex, {
				toValue: getIndex >= 0 ? getIndex : 0,
				duration: 300,
				useNativeDriver: false,
			}).start();
		}
	}, [filterSelected, handleFilterButtons, selectedIndex]);

	const handleSelect = (data, index) => {
		RealAnimated.timing(selectedIndex, {
			toValue: index,
			duration: 300,
			useNativeDriver: false,
		}).start();

		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
		dispatch(setCurrentFilterSelected(data));
	};

	const handleFilterData = (type, data) => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
		dispatch(setColheitaFilter({ key: type, value: data }));
	};

	const handleClearFilters = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
		dispatch(clearColheitaFilter());
	};

	const handleGoBack = () => {
		navigation.goBack();
	};

	const hasFilters =
		filters?.safra_ciclo?.length > 0 ||
		filters?.farm?.length > 0 ||
		filters?.proj?.length > 0 ||
		filters?.variety?.length > 0 ||
		filters?.culture?.length > 0;

	const getIndexOf = {
		safra_ciclo: "0%",
		fazenda: "20%",
		projeto: "40%",
		cultura: "60%",
		variedade: "80%",
	};

	const renderCheck = (isSelected) => {
		if (!isSelected) return null;

		return <Icon name="check-bold" size={24} color={Colors.succes[300]} />;
	};

	const renderEmpty = (label) => {
		return (
			<View style={styles.emptyContainer}>
				<Icon
					name="filter-remove-outline"
					size={34}
					color={Colors.secondary[400]}
				/>

				<Text style={styles.emptyTitle}>Nenhuma opção encontrada</Text>

				<Text style={styles.emptySubtitle}>
					Não existem dados para o filtro de {label}.
				</Text>
			</View>
		);
	};

	return (
		<SafeAreaView style={styles.mainContaier} edges={[""]}>
			<View style={styles.headerContainer}>
				<Animated.View
					entering={FadeInRight.duration(300)}
					exiting={FadeOut.duration(300)}
					layout={Layout.springify()}
					style={[
						styles.percentBackground,
						{
							backgroundColor: Colors.secondary[200],
							width: "20%",
							height: "90%",
							marginLeft: getIndexOf[filterSelected] || "0%",
							padding: 2,
						},
					]}
				/>

				{handleFilterButtons.map((data, i) => {
					const isActive = filterSelected === data.title;
					const hasFilter = filters?.[data.filter]?.length > 0;

					return (
						<TouchableOpacity
							onPress={() => handleSelect(data.title, i)}
							style={styles.filterPressbale}
							key={data.title}
						>
							<RealAnimated.View
								style={[
									styles.filterTabInner,
									isActive && styles.filterTabInnerActive,
								]}
							>
								<Text
									style={[
										styles.filterTabText,
										isActive && styles.filterTabTextActive,
										hasFilter && styles.filterTabTextHasFilter,
									]}
									numberOfLines={1}
								>
									{data.label}
								</Text>

								{hasFilter && <View style={styles.filterDot} />}
							</RealAnimated.View>
						</TouchableOpacity>
					);
				})}
			</View>

			<ScrollView
				style={{ paddingBottom: CUSTOM_TAB_BAR_TOTAL_HEIGHT }}
				contentContainerStyle={{ paddingBottom: CUSTOM_TAB_BAR_TOTAL_HEIGHT + 100 }}
			>
				{safra_ciclo?.length > 0 &&
					filterSelected === "safra_ciclo" &&
					safra_ciclo.map((item, i) => {
						const value = makeSafraCicloKey(item);
						const isSelected = filters?.safra_ciclo?.includes(value);
						const label = getSafraCicloLabel(item);

						return (
							<Pressable
								onPress={() => handleFilterData("safra_ciclo", value)}
								key={value}
								style={({ pressed }) => [
									styles.farmContainer,
									styles.safraCicloRow,
									{ backgroundColor: i % 2 === 0 && Colors.secondary[100] },
									isSelected && styles.selectedRow,
									pressed && styles.pressed,
								]}
							>
								<View style={styles.safraCicloTextBox}>
									<Text
										style={[
											styles.farmTitle,
											{
												color: isSelected
													? Colors.succes[400]
													: Colors.secondary[700],
											},
										]}
									>
										{label.title}
									</Text>

									<Text
										style={[
											styles.safraCicloSubtitle,
											{
												color: isSelected
													? Colors.succes[500]
													: Colors.secondary[500],
											},
										]}
									>
										{label.subtitle}
									</Text>
								</View>

								{renderCheck(isSelected)}
							</Pressable>
						);
					})}

				{filterSelected === "safra_ciclo" &&
					(!safra_ciclo || safra_ciclo.length === 0) &&
					renderEmpty("safra/ciclo")}

				{farm?.length > 0 &&
					filterSelected === "fazenda" &&
					farm
						.slice()
						.sort((a, b) => a.localeCompare(b))
						.map((data, i) => {
							const isSelected = filters?.farm?.includes(data);

							return (
								<Pressable
									onPress={() => handleFilterData("farm", data)}
									key={data}
									style={({ pressed }) => [
										styles.farmContainer,
										{ backgroundColor: i % 2 === 0 && Colors.secondary[100] },
										isSelected && styles.selectedRow,
										pressed && styles.pressed,
									]}
								>
									<Text
										style={[
											styles.farmTitle,
											{
												color: isSelected
													? Colors.succes[400]
													: Colors.secondary[600],
											},
										]}
									>
										{String(data).replace("Fazenda", "")}
									</Text>

									{renderCheck(isSelected)}
								</Pressable>
							);
						})}

				{filterSelected === "fazenda" &&
					(!farm || farm.length === 0) &&
					renderEmpty("fazenda")}

				{proj?.length > 0 &&
					filterSelected === "projeto" &&
					proj
						.slice()
						.sort((a, b) => a.localeCompare(b))
						.map((data, i) => {
							const isSelected = filters?.proj?.includes(data);

							return (
								<Pressable
									onPress={() => handleFilterData("proj", data)}
									key={data}
									style={({ pressed }) => [
										styles.farmContainer,
										{ backgroundColor: i % 2 === 0 && Colors.secondary[100] },
										isSelected && styles.selectedRow,
										pressed && styles.pressed,
									]}
								>
									<Text
										style={[
											styles.farmTitle,
											{
												color: isSelected
													? Colors.succes[400]
													: Colors.secondary[600],
											},
										]}
									>
										{String(data).replace("Projeto", "")}
									</Text>

									{renderCheck(isSelected)}
								</Pressable>
							);
						})}

				{filterSelected === "projeto" &&
					(!proj || proj.length === 0) &&
					renderEmpty("projeto")}

				{culture?.length > 0 &&
					filterSelected === "cultura" &&
					culture
						.slice()
						.sort((a, b) => String(a).localeCompare(String(b)))
						.map((data, i) => {
							const isSelected = filters?.culture?.includes(data);

							return (
								<Pressable
									onPress={() => handleFilterData("culture", data)}
									key={data}
									style={({ pressed }) => [
										styles.farmContainer,
										{ backgroundColor: i % 2 === 0 && Colors.secondary[100] },
										isSelected && styles.selectedRow,
										pressed && styles.pressed,
									]}
								>
									<Text
										style={[
											styles.farmTitle,
											{
												color: isSelected
													? Colors.succes[400]
													: Colors.secondary[600],
											},
										]}
									>
										{data}
									</Text>

									{renderCheck(isSelected)}
								</Pressable>
							);
						})}

				{filterSelected === "cultura" &&
					(!culture || culture.length === 0) &&
					renderEmpty("cultura")}

				{variety?.length > 0 &&
					filterSelected === "variedade" &&
					variety.map((data, i) => {
						const isSelected = filters?.variety?.includes(data.variety);

						return (
							<Pressable
								onPress={() => handleFilterData("variety", data.variety)}
								key={`${data.variety}-${data.culture || ""}`}
								style={({ pressed }) => [
									styles.farmContainer,
									{ backgroundColor: i % 2 === 0 && Colors.secondary[100] },
									isSelected && styles.selectedRow,
									pressed && styles.pressed,
								]}
							>
								<View style={styles.varietyBox}>
									<Text
										style={[
											styles.farmTitle,
											{
												color: isSelected
													? Colors.succes[400]
													: Colors.secondary[600],
											},
										]}
									>
										{String(data.variety).replace("Arroz ", "")}
									</Text>

									{!!data.culture && (
										<Text style={styles.varietyCulture}>{data.culture}</Text>
									)}
								</View>

								{renderCheck(isSelected)}
							</Pressable>
						);
					})}

				{filterSelected === "variedade" &&
					(!variety || variety.length === 0) &&
					renderEmpty("variedade")}
			</ScrollView>

			<View
				style={[
					styles.fabContainer,
					{
						justifyContent: "center",
						flex: 1,
						gap: 20,
						alignItems: "flex-end",
						marginBottom: CUSTOM_TAB_BAR_TOTAL_HEIGHT,
					},
				]}
			>
				{hasFilters && (
					<Button
						btnStyles={{
							width: 40,
							height: 40,
							borderRadius: 20,
							backgroundColor: Colors.error[300],
						}}
						onPress={handleClearFilters}
						disabled={!hasFilters}
					>
						<Icon name="trash-can-outline" size={19} color="white" />
					</Button>
				)}

				<Button
					btnStyles={{
						width: 40,
						height: 40,
						borderRadius: 20,
						backgroundColor: Colors.gold[500],
					}}
					onPress={handleGoBack}
				>
					<Icon name="arrow-left-bold" size={19} color="white" />
				</Button>
			</View>
		</SafeAreaView>
	);
};

export default FilterPlantioScreen;

const styles = StyleSheet.create({
	percentBackground: {
		position: "absolute",
		borderRadius: 6,
		zIndex: -1,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 5 },
		shadowOpacity: 0.1,
		shadowRadius: 5,
		elevation: 2,
	},

	fabContainer: {
		position: "absolute",
		right: 20,
		bottom: 26,
	},

	farmTitle: {
		fontSize: 17,
		fontWeight: "bold",
		color: Colors.secondary[600],
	},

	farmContainer: {
		paddingVertical: 11,
		paddingHorizontal: 12,
		justifyContent: "space-between",
		flexDirection: "row",
		alignItems: "center",
	},

	selectedRow: {
		backgroundColor: Colors.succes[50],
		borderLeftWidth: 4,
		borderLeftColor: Colors.succes[400],
	},

	filterPressbale: {
		flex: 1,
	},

	filterTabInner: {
		paddingVertical: 10,
		paddingHorizontal: 2,
		justifyContent: "center",
		alignItems: "center",
		minHeight: 42,
	},

	filterTabInnerActive: {
		borderBottomWidth: 1,
		borderBottomColor: Colors.primary[800],
	},

	filterTabText: {
		fontWeight: "bold",
		fontSize: 11,
		color: Colors.secondary[700],
		textAlign: "center",
	},

	filterTabTextActive: {
		color: Colors.primary[900],
	},

	filterTabTextHasFilter: {
		color: Colors.succes[500],
	},

	filterDot: {
		width: 5,
		height: 5,
		borderRadius: 99,
		backgroundColor: Colors.succes[400],
		marginTop: 3,
	},

	headerContainer: {
		justifyContent: "space-between",
		flexDirection: "row",
		backgroundColor: "whitesmoke",
		marginBottom: 0,
		position: "relative",
		zIndex: 1,
	},

	mainContaier: {
		flex: 1,
	},

	pressed: {
		opacity: 0.7,
	},

	safraCicloRow: {
		minHeight: 58,
	},

	safraCicloTextBox: {
		flex: 1,
		paddingRight: 10,
	},

	safraCicloSubtitle: {
		marginTop: 2,
		fontSize: 11,
		fontWeight: "800",
	},

	varietyBox: {
		flex: 1,
		paddingRight: 10,
	},

	varietyCulture: {
		marginTop: 2,
		fontSize: 11,
		color: Colors.secondary[500],
		fontWeight: "700",
	},

	emptyContainer: {
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 42,
		paddingHorizontal: 20,
	},

	emptyTitle: {
		marginTop: 8,
		fontSize: 15,
		fontWeight: "900",
		color: Colors.secondary[700],
		textAlign: "center",
	},

	emptySubtitle: {
		marginTop: 4,
		fontSize: 12,
		fontWeight: "700",
		color: Colors.secondary[500],
		textAlign: "center",
	},
});