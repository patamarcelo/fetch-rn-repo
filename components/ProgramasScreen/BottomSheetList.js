import { StyleSheet, View, Text, Pressable } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { programasSelector } from "../../store/redux/selector";
import { geralActions } from "../../store/redux/geral";
import { Colors } from "../../constants/styles";

const BottomSheetList = ({ onClose }) => {
	const dispatch = useDispatch();
	const { setSelectedProgram } = geralActions;
	const programasAvai = useSelector(programasSelector);

	const handleSelect = (program, index) => {
		console.log(program);
		dispatch(setSelectedProgram(program));
		onClose();
	};

	return (
		<View style={styles.listContent}>
			{programasAvai?.map((data, i) => {
				return (
					<Pressable
						key={i}
						onPress={handleSelect.bind(this, data, i)}
						style={({ pressed }) => [
							styles.mainContainer,
							pressed && styles.pressed,
						]}
					>
						<View style={{ width: "100%" }}>
							<Text style={styles.programName}>
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
	listContent: {
		paddingBottom: 40,
	},

	mainContainer: {
		width: "100%",
		padding: 10,
		borderRadius: 12,
	},

	programName: {
		color: "whitesmoke",
		fontSize: 18,
	},

	pressed: {
		backgroundColor: Colors.primary[500],
	},
});

export default BottomSheetList;