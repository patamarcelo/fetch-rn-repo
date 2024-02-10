import { StyleSheet, View, Text, Pressable } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { programasSelector } from "../../store/redux/selector";
import { geralActions } from "../../store/redux/geral";
import { Colors } from "../../constants/styles";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

const BottomSheetList = ({ onClose }) => {
	const tabBarHeight = useBottomTabBarHeight();

	const dispatch = useDispatch();
	const { setProgramsAvaiable, setSelectedProgram } = geralActions;
	const programasAvai = useSelector(programasSelector);

	const handleSelect = (program, index) => {
		console.log(program);
		dispatch(setSelectedProgram(program));
		onClose();
	};

	return (
		<View style={{ marginBottom: tabBarHeight + 50 }}>
			{programasAvai?.map((data, i) => {
				return (
					<Pressable
						key={i}
						onPress={handleSelect.bind(this, data, i)}
						style={({ pressed }) => [
							pressed && styles.pressed,
							styles.mainContainer
						]}
					>
						<View style={{ width: "100%" }}>
							<Text style={{ color: "whitesmoke", fontSize: 18 }}>
								{data.nome}
							</Text>
						</View>
					</Pressable>
				);
			})}
		</View>
	);
};
const styles = StyleSheet.create({
	mainContainer: {
		width: "100%",
		padding: 10,
		borderRadius: 12
		// margin: 5
	},
	pressed: {
		backgroundColor: Colors.primary[500]
	}
});
export default BottomSheetList;
