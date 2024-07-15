import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	RefreshControl
} from "react-native";

import { useState, useEffect } from "react";
import { useHeaderHeight } from "@react-navigation/elements";
import { DataTable, Chip } from "react-native-paper";
import CardList from "./CardList";
import { Colors } from "../../constants/styles";

import { useSelector } from "react-redux";
import {
	estagiosSelector,
	programSelector,
	dataProgramSelector
} from "../../store/redux/selector";

import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

const ProgramList = ({ refresh, isLoading, innerRef }) => {
	const tabBarHeight = useBottomTabBarHeight();
	const estagios = useSelector(estagiosSelector);
	const programa = useSelector(programSelector);
	const dataProgram = useSelector(dataProgramSelector);

	const [filteredEstagios, setFilteredEstagios] = useState([]);

	useEffect(() => {
		// console.log('estagios', estagios);
		const ts_programas = estagios.find((data) => data.estagio.toLowerCase().includes('tratamento'))
		// console.log('ts_programas',ts_programas);
		const estagiosFiltered = estagios
			.filter(
				(data, i) =>
					data.programa__nome === programa.nome && data.prazo_dap >= 0
			)
			.sort((a, b) => a.prazo_dap - b.prazo_dap);
		// console.log(estagios);
		const newArray = [ts_programas, ...estagiosFiltered]
		setFilteredEstagios(newArray);
	}, [programa]);

	return (
		<ScrollView
			ref={innerRef}
			style={[styles.mainContainer, { marginBottom: tabBarHeight }]}
			refreshControl={
				<RefreshControl
					refreshing={isLoading}
					onRefresh={refresh}
					colors={["#9Bd35A", "#689F38"]}
					tintColor={Colors.primary500}
				/>
			}
		>
			{filteredEstagios.length > 0 &&
				dataProgram.length > 0 &&
				filteredEstagios.map((data, i) => {
					const applications = dataProgram
						.filter((app) => {
							// console.log(app);
							return (
								app.operacao__estagio === data.estagio &&
								app.operacao__programa__nome === programa.nome
							);
						})
						.sort((a, b) =>
							a.defensivo__tipo.localeCompare(b.defensivo__tipo)
						);
					return (
						<CardList
							estagioData={data}
							key={i}
							applications={applications}
						/>
					);
				})}
		</ScrollView>
	);
};

const styles = StyleSheet.create({
	mainContainer: {
		flex: 1,
		width: "100%"
		// justifyContent: "center"
	}
});

export default ProgramList;
