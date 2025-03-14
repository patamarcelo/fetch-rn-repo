import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { farmsSelector, farmsSelected } from "../store/redux/selector";
import { CheckBox } from "@rneui/themed";
import { useState, useEffect } from "react";
import Button from "../components/ui/Button";
import { useNavigation } from "@react-navigation/native";

import { geralActions } from "../store/redux/geral";
import { useDispatch, useSelector } from "react-redux";
import { Colors } from "../constants/styles";

import * as Haptics from 'expo-haptics';
import { SafeAreaView } from "react-native-safe-area-context";

const FarmsScreen = ({ setModalVisible, modalVisible, route }) => {
	const farmsList = useSelector(farmsSelector);
	const [checkedIndex, setCheckedIndex] = useState(null);
	const [selectedFarmHook, setSelectedFarm] = useState("");
	const params = route.params;

	const { selectedFarm } = geralActions;
	const dispatch = useDispatch();
	const selectedFarmStore = useSelector(farmsSelected);

	useEffect(() => {
		if (selectedFarmStore) {
			const farmListFinder = farmsList.filter((data, i) => {
				if (data === selectedFarmStore) {
					setCheckedIndex(i);
					setSelectedFarm(data);
				}
				return;
			});
		}
	}, []);

	const navigation = useNavigation();

	const handleFilter = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
		dispatch(selectedFarm(selectedFarmHook));
		if (params === undefined) {
			navigation.navigate("HomeStackScreen");
			return;
		}
		if (params.fromRoute === "maps") {
			navigation.navigate("MapStackScreen");
		}
		// setModalVisible(!modalVisible);
	};

	const handlerCancel = () => {
		navigation.navigate("HomeStackScreen");
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
		// setModalVisible(!modalVisible);
	};

	const handleCheck = (farm, index) => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
		setSelectedFarm(farm);
		if (checkedIndex === index) {
			setCheckedIndex(null);
		} else {
			setCheckedIndex(index);
		}
	};

	return (
		<SafeAreaView style={styles.mainContainer}>
			<View style={{ width: "100%", alignItems: "center" }}>
				<View style={{ height: 50 }}>
					<Text
						style={{
							color: "whitesmoke",
							fontSize: 20,
							paddingTop: 20
						}}
					>
						Selecione o Projeto
					</Text>
				</View>
				{farmsList.length > 0 && (
						<ScrollView style={{ paddingHorizontal: 0, width: '100%' }} 
							contentContainerStyle={{ justifyContent: 'center', alignItems: 'center'}}>
							{farmsList.map((data, i) => {
								return (
									<Pressable
										key={i}
										style={[styles.titleContainer,{backgroundColor: i % 2 == 0 ? Colors.primary[900] : Colors.primary[902] }]}
										onPress={handleCheck.bind(
											this,
											data,
											i
										)}
									>
										<CheckBox
											checked={checkedIndex === i}
											style={{
												backgroundColor: "transparent"
											}}
											containerStyle={{
												backgroundColor: "transparent"
											}}
											size={18}
										/>
										<Text
											style={[
												styles.FarmsTitle,
												checkedIndex === i &&
												styles.checked
											]}
										>
											{data.replace('Projeto ', '')}
										</Text>
									</Pressable>
								);
							})}
						</ScrollView>
				)}
			</View>
			<View style={{ width: "100%", alignItems: "center", backgroundColor: Colors.primary[900], borderTopLeftRadius: 25, borderTopRightRadius: 25, borderColor: "rgba(230,230,230,0.2)", borderWidth: 0.2 }}>
				<Button
					btnStyles={[
						{
							width: "90%",
							marginTop: 20,
							marginBottom: 100,
						},
						checkedIndex === null && styles.cancelType
					]}
					onPress={checkedIndex >= 0 ? handleFilter : handlerCancel}
					disabled={checkedIndex >= 0 ? false : true}
				>
					{checkedIndex === null ? "Cancelar" : "Filtrar"}
				</Button>
			</View>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	cancelType: {
		backgroundColor: Colors.gold[700]
	},
	farmsContainer: {
		justifyContent: "flex-start",
		alignItems: "flex-start",
		marginLeft: 20,
		marginTop: 20,
		width: "100%",
		height: 100
	},
	titleContainer: {
		flexDirection: "row",
		justifyContent: "flex-start",
		alignItems: "center",
		// backgroundColor: "red",
		width: "100%"
	},
	checked: {
		color: "whitesmoke"
	},
	FarmsTitle: {
		color: Colors.secondary[500],
		fontSize: 20,
		marginLeft: -5,
		fontWeight: 'bold'
	},
	mainContainer: {
		flex: 1,
		justifyContent: "space-between",
		marginBottom: 180,
		marginTop: 20,
		alignItems: "center",
		height: "100%",
		// backgroundColor: Colors.primary[901]
		// backgroundColor: "red"
	}
});
export default FarmsScreen;
