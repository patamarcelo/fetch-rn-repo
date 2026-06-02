import {
	View,
	Text,
	StyleSheet,
	Pressable,
	FlatList,
	Platform,
	StatusBar
} from "react-native";
import { useState, useEffect, useMemo } from "react";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { CheckBox } from "@rneui/themed";
import { useDispatch, useSelector } from "react-redux";
import * as Haptics from "expo-haptics";

import Button from "../components/ui/Button";
import { farmsSelector, farmsSelected } from "../store/redux/selector";
import { geralActions } from "../store/redux/geral";
import { Colors } from "../constants/styles";

const FarmsScreen = ({ setModalVisible, route }) => {
	const farmsList = useSelector(farmsSelector);
	const selectedFarmStore = useSelector(farmsSelected);

	const dispatch = useDispatch();
	const navigation = useNavigation();
	const insets = useSafeAreaInsets();

	const params = route?.params;
	const { selectedFarm } = geralActions;

	const initialIndex = useMemo(() => {
		if (!selectedFarmStore || !Array.isArray(farmsList)) return null;

		const index = farmsList.findIndex((farm) => farm === selectedFarmStore);
		return index >= 0 ? index : null;
	}, [farmsList, selectedFarmStore]);

	const [checkedIndex, setCheckedIndex] = useState(initialIndex);
	const [selectedFarmHook, setSelectedFarm] = useState(
		initialIndex !== null ? farmsList[initialIndex] : ""
	);

	useEffect(() => {
		if (initialIndex === null) return;

		setCheckedIndex(initialIndex);
		setSelectedFarm(farmsList[initialIndex]);
	}, [initialIndex, farmsList]);

	const closeScreen = () => {
		if (typeof setModalVisible === "function") {
			setModalVisible(false);
			return;
		}

		if (navigation.canGoBack()) {
			navigation.goBack();
		}
	};

	const handleFilter = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

		if (checkedIndex === null || !selectedFarmHook) {
			closeScreen();
			return;
		}

		dispatch(selectedFarm(selectedFarmHook));

		if (params?.fromRoute === "maps") {
			navigation.navigate("MapStackScreen");
			return;
		}

		closeScreen();
	};

	const handlerCancel = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
		closeScreen();
	};

	const handleCheck = (farm, index) => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

		if (checkedIndex === index) {
			setCheckedIndex(null);
			setSelectedFarm("");
			return;
		}

		setCheckedIndex(index);
		setSelectedFarm(farm);
	};

	const hasSelection = checkedIndex !== null;

	const renderFarm = ({ item, index }) => {
		const isChecked = checkedIndex === index;

		return (
			<Pressable
				onPress={() => handleCheck(item, index)}
				style={({ pressed }) => [
					styles.farmRow,
					index % 2 === 0 && styles.farmRowAlt,
					isChecked && styles.farmRowSelected,
					pressed && styles.farmRowPressed,
				]}
			>
				<View style={styles.checkboxBox}>
					<CheckBox
						checked={isChecked}
						onPress={() => handleCheck(item, index)}
						size={20}
						checkedColor="#FFFFFF"
						uncheckedColor="rgba(255,255,255,0.45)"
						containerStyle={styles.checkboxContainer}
					/>
				</View>

				<View style={styles.farmTextBox}>
					<Text
						style={[
							styles.farmTitle,
							isChecked && styles.farmTitleSelected,
						]}
						numberOfLines={1}
					>
						{String(item).replace("Projeto ", "")}
					</Text>
				</View>
			</Pressable>
		);
	};

	return (
		<SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
			<StatusBar
				barStyle="light-content"
				backgroundColor={Colors.primary[900]}
				translucent={false}
			/>

			<View
				style={[
					styles.container,
					{
						paddingTop: insets.top,
					},
				]}
			>
				<View style={styles.modalHandle} />
				<View style={styles.header}>
					<View>
						<Text style={styles.headerTitle}>Selecione o Projeto</Text>
						<Text style={styles.headerSubtitle}>
							Escolha uma fazenda para filtrar as programações.
						</Text>
					</View>

					<Pressable
						onPress={handlerCancel}
						style={({ pressed }) => [
							styles.closeButton,
							pressed && { opacity: 0.72 },
						]}
					>
						<Text style={styles.closeButtonText}>×</Text>
					</Pressable>
				</View>

				<View style={styles.listCard}>
					{farmsList.length > 0 ? (
						<FlatList
							data={farmsList}
							keyExtractor={(item, index) => `${item}-${index}`}
							renderItem={renderFarm}
							showsVerticalScrollIndicator={false}
							contentContainerStyle={[
								styles.listContent,
								{
									paddingBottom: 116 + insets.bottom,
								},
							]}
							ItemSeparatorComponent={() => <View style={styles.separator} />}
						/>
					) : (
						<View style={styles.emptyBox}>
							<Text style={styles.emptyTitle}>Nenhum projeto encontrado</Text>
							<Text style={styles.emptyText}>
								Atualize os dados ou tente novamente mais tarde.
							</Text>
						</View>
					)}
				</View>

				<View
					style={[
						styles.footer,
						{
							paddingBottom: Math.max(insets.bottom, Platform.OS === "android" ? 16 : 12),
						},
					]}
				>
					<Button
						btnStyles={[
							styles.footerButton,
							!hasSelection && styles.cancelType,
						]}
						onPress={hasSelection ? handleFilter : handlerCancel}
					>
						{hasSelection ? "Filtrar" : "Cancelar"}
					</Button>
				</View>
			</View>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: Colors.primary[900],
	},

	container: {
		flex: 1,
		backgroundColor: Colors.primary[900],
	},

	header: {
		paddingHorizontal: 20,
		paddingTop: 8,
		paddingBottom: 18,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},

	headerTitle: {
		color: "#FFFFFF",
		fontSize: 22,
		fontWeight: "900",
		letterSpacing: -0.3,
	},

	headerSubtitle: {
		marginTop: 4,
		color: "rgba(255,255,255,0.62)",
		fontSize: 12,
		fontWeight: "700",
	},

	closeButton: {
		width: 36,
		height: 36,
		borderRadius: 18,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "rgba(255,255,255,0.10)",
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.14)",
	},

	closeButtonText: {
		color: "#FFFFFF",
		fontSize: 27,
		lineHeight: 30,
		fontWeight: "500",
		marginTop: -2,
	},

	listCard: {
		flex: 1,
		backgroundColor: Colors.primary[901] || Colors.primary[900],
		borderTopLeftRadius: 28,
		borderTopRightRadius: 28,
		overflow: "hidden",
		borderTopWidth: 1,
		borderColor: "rgba(255,255,255,0.10)",
	},

	listContent: {
		paddingTop: 10,
		paddingHorizontal: 12,
	},

	farmRow: {
		minHeight: 66,
		borderRadius: 18,
		paddingRight: 14,
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "rgba(255,255,255,0.045)",
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.06)",
	},

	farmRowAlt: {
		backgroundColor: "rgba(255,255,255,0.075)",
	},

	farmRowSelected: {
		backgroundColor: Colors.primary[700],
		borderColor: "rgba(255,255,255,0.24)",
	},

	farmRowPressed: {
		opacity: 0.82,
		transform: [{ scale: 0.995 }],
	},

	checkboxBox: {
		width: 48,
		alignItems: "center",
		justifyContent: "center",
	},

	checkboxContainer: {
		margin: 0,
		padding: 0,
		backgroundColor: "transparent",
		borderWidth: 0,
	},

	farmTextBox: {
		flex: 1,
		paddingVertical: 10,
	},

	farmTitle: {
		color: Colors.secondary[300],
		fontSize: 16,
		fontWeight: "900",
		letterSpacing: -0.2,
	},

	farmTitleSelected: {
		color: "#FFFFFF",
	},

	farmSubtitle: {
		marginTop: 3,
		color: "rgba(255,255,255,0.38)",
		fontSize: 11,
		fontWeight: "700",
	},

	farmSubtitleSelected: {
		color: "rgba(255,255,255,0.72)",
	},

	separator: {
		height: 8,
	},

	footer: {
		position: "absolute",
		left: 0,
		right: 0,
		bottom: 0,
		paddingTop: 14,
		paddingHorizontal: 18,
		backgroundColor: Colors.primary[900],
		borderTopLeftRadius: 26,
		borderTopRightRadius: 26,
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.10)",
		shadowColor: "#000",
		shadowOpacity: 0.22,
		shadowRadius: 18,
		shadowOffset: { width: 0, height: -8 },
		elevation: 14,
	},

	footerButton: {
		width: "100%",
		marginTop: 0,
		marginBottom: 0,
	},

	cancelType: {
		backgroundColor: Colors.gold[700],
	},

	emptyBox: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 28,
	},

	emptyTitle: {
		color: "#FFFFFF",
		fontSize: 16,
		fontWeight: "900",
		textAlign: "center",
	},

	emptyText: {
		marginTop: 6,
		color: "rgba(255,255,255,0.58)",
		fontSize: 12,
		fontWeight: "700",
		textAlign: "center",
		lineHeight: 18,
	},
	modalHandle: {
		alignSelf: "center",
		width: 42,
		height: 5,
		borderRadius: 999,
		backgroundColor: "rgba(255,255,255,0.35)",
		marginTop: 8,
		marginBottom: 6,
	},
});

export default FarmsScreen;