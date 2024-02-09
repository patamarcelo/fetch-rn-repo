import { View, Text, StyleSheet, Pressable } from "react-native";
import { useSelector } from "react-redux";
import { farmsSelector } from "../store/redux/selector";
import { CheckBox } from "@rneui/themed";
import { useState } from "react";
import Button from "../components/ui/Button";
import { useNavigation } from "@react-navigation/native";

import { geralActions } from "../store/redux/geral";
import { useDispatch } from "react-redux";

const FarmsScreen = () => {
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
	};

	const handleCheck = (farm, index) => {
		setSelectedFarm(farm);
		setCheckedIndex(index);
	};

	console.log(farmsList);
	return (
		<View style={styles.mainContainer}>
			<Text style={{ color: "whitesmoke", fontSize: 20, paddingTop: 20 }}>
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
									onPress={handleCheck.bind(this, data, i)}
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
											checkedIndex === i && styles.checked
										]}
									>
										{data}
									</Text>
								</Pressable>
							);
						})}
					</View>

					<Button
						btnStyles={{ width: "90%", marginTop: 20 }}
						onPress={handleFilter}
						disabled={checkedIndex >= 0 ? false : true}
					>
						Filtrar
					</Button>
				</>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	farmsContainer: {
		justifyContent: "flex-start",
		alignItems: "flex-start",
		marginTop: 20,
		width: "100%",
		paddingLeft: 40
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
		alignItems: "center"
	}
});
export default FarmsScreen;
