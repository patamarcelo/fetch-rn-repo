import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useSelector } from "react-redux";
import { farmsSelector } from "../store/redux/selector";
import { CheckBox } from "@rneui/themed";
import { useState } from "react";
import Button from "../components/ui/Button";
import { useNavigation } from "@react-navigation/native";

import { geralActions } from "../store/redux/geral";
import { useDispatch } from "react-redux";
import { Colors } from "../constants/styles";

const FarmsScreen = ({ setModalVisible, modalVisible }) => {
	const farmsList = useSelector(farmsSelector);
	const [checkedIndex, setCheckedIndex] = useState(null);
	const [selectedFarmHook, setSelectedFarm] = useState("");

	const { selectedFarm } = geralActions;
	const dispatch = useDispatch();

	const navigation = useNavigation();

	const handleFilter = () => {
		console.log("FilterFarm", selectedFarmHook);
		dispatch(selectedFarm(selectedFarmHook));
		navigation.navigate("HomeStackScreen");
		// setModalVisible(!modalVisible);
	};

	const handlerCancel = () => {
		navigation.navigate("HomeStackScreen");
		// setModalVisible(!modalVisible);
	};

	const handleCheck = (farm, index) => {
		setSelectedFarm(farm);
		if (checkedIndex === index) {
			setCheckedIndex(null);
		} else {
			setCheckedIndex(index);
		}
	};

	console.log(farmsList);
	return (
		<View style={styles.mainContainer}>
			<View style={{ width: "100%", alignItems: "center" }}>
				<Text
					style={{
						color: "whitesmoke",
						fontSize: 20,
						paddingTop: 20
					}}
				>
					Selecione a Fazenda
				</Text>
				{farmsList.length > 0 && (
					<>
						<View style={styles.farmsContainer}>
							{farmsList.map((data, i) => {
								return (
									<Pressable
										key={i}
										style={styles.titleContainer}
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
											{data}
										</Text>
									</Pressable>
								);
							})}
						</View>
					</>
				)}
			</View>
			<View style={{ width: "90%", alignItems: "center" }}>
				<Button
					btnStyles={[
						{
							width: "90%",
							marginTop: 20
						},
						checkedIndex === null && styles.cancelType
					]}
					onPress={checkedIndex >= 0 ? handleFilter : handlerCancel}
					disabled={checkedIndex >= 0 ? false : true}
				>
					{checkedIndex === null ? "Cancelar" : "Filtrar"}
				</Button>
			</View>
		</View>
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
		width: "100%"
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
		color: "grey",
		fontSize: 20,
		marginLeft: -5
	},
	mainContainer: {
		flex: 1,
		justifyContent: "space-between",
		marginBottom: 50,
		marginTop: 20,
		alignItems: "center",
		height: "100%"
		// backgroundColor: Colors.primary[901]
		// backgroundColor: "red"
	}
});
export default FarmsScreen;
