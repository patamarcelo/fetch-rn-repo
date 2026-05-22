import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { FAB } from "react-native-paper";

import { useNavigation } from "@react-navigation/native";
import { useSelector, useDispatch } from "react-redux";
import { selectColheitaDataToggle } from "../../store/redux/selector";

import { Colors } from "../../constants/styles";
import { geralActions } from "../../store/redux/geral";

import Button from "../ui/Button";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

const FilterPlantioComponent = () => {
	const navigation = useNavigation();
	const dispatch = useDispatch();

	const filters = useSelector(selectColheitaDataToggle);
	const tabBarHeight = useBottomTabBarHeight();

	const { clearColheitaFilter } = geralActions;

	const hasFilters =
		filters?.safra_ciclo?.length > 0 ||
		filters?.farm?.length > 0 ||
		filters?.proj?.length > 0 ||
		filters?.variety?.length > 0 ||
		filters?.culture?.length > 0;

	const handleFilterProps = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
		navigation.navigate("FilterPlantioScreen");
	};

	const handleClearFilters = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
		dispatch(clearColheitaFilter());
	};

	return (
		<SafeAreaView style={styles.fabContainer}>
			{hasFilters && (
				<Button
					btnStyles={[
						styles.fabClear,
						{
							backgroundColor: Colors.error[300],
							marginBottom: tabBarHeight,
						},
					]}
					onPress={handleClearFilters}
				>
					<Icon name="trash-can-outline" size={19} color="white" />
				</Button>
			)}

			<FAB
				style={[
					styles.fab,
					{
						backgroundColor: hasFilters
							? "rgba(153,204,153,0.4)"
							: "rgba(200, 200, 200, 0.3)",
						marginBottom: tabBarHeight,
					},
				]}
				icon="magnify"
				color="black"
				onPress={handleFilterProps}
			/>
		</SafeAreaView>
	);
};

export default FilterPlantioComponent;

const styles = StyleSheet.create({
	fabContainer: {
		position: "absolute",
		right: 20,
		bottom: 20,
	},

	fab: {
		position: "absolute",
		right: 0,
		bottom: 0,
		width: 40,
		height: 40,
		borderRadius: 25,
		justifyContent: "center",
		alignItems: "center",
		elevation: 4,
		borderColor: Colors.primary[300],
		borderWidth: 1,
	},

	fabClear: {
		position: "absolute",
		right: 50,
		bottom: 0,
		width: 40,
		height: 40,
		borderRadius: 20,
		justifyContent: "center",
		alignItems: "center",
		elevation: 4,
	},
});