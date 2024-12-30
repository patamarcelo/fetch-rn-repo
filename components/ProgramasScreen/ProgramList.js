import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	RefreshControl,
	TextInput
} from "react-native";

import { useState, useEffect } from "react";
import { useHeaderHeight } from "@react-navigation/elements";
import { DataTable, Chip } from "react-native-paper";
import { FAB } from "react-native-paper"; // Floating Action Button


import CardList from "./CardList";
import { Colors } from "../../constants/styles";

import { useSelector } from "react-redux";
import {
	estagiosSelector,
	programSelector,
	dataProgramSelector
} from "../../store/redux/selector";

import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

import * as Haptics from 'expo-haptics';




const ProgramList = ({ refresh, isLoading, innerRef, setPrintableData }) => {
	const tabBarHeight = useBottomTabBarHeight();
	const estagios = useSelector(estagiosSelector);
	const programa = useSelector(programSelector);
	const dataProgram = useSelector(dataProgramSelector);

	const [searchQuery, setSearchQuery] = useState(""); // State for search input
	const [showSearch, setShowSearch] = useState(false); // Toggle for search bar visibility



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
		const programName = programa.nome;
		const produtosFilter = dataProgram.filter((prods) => prods.operacao__programa__nome === programName)
		const objToAdd = {
			estagios: newArray,
			produtos: produtosFilter,
			program: programa
		}
		setPrintableData(prev => objToAdd);
	}, [programa, estagios]);

	
	// Function to filter applications based on the search query
	function removeAccents(str) {
		return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
	}
	const filterApplications = (applications) => {
		if (searchQuery.trim() === "") {
			return applications; // Return full array if search query is empty
		}
		return applications.filter((data) =>
			removeAccents(data.defensivo__produto)
				.toLowerCase()
				.includes(searchQuery.toLowerCase())
		);
	};

	const handleFilterProps = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
		setShowSearch((prev) => !prev)
		setSearchQuery("")
	}

	return (
		<View style={styles.container}>

			{showSearch && (
				<TextInput
					style={styles.searchBar}
					placeholder="Selecione um produto..."
					placeholderTextColor="#888"
					value={searchQuery}
					onChangeText={setSearchQuery}
					autoFocus={true} // Automatically focuses when shown
				/>
			)}

			{/* Main ScrollView */}
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
						// console.log('data', dataProgram[1])
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
								applications={filterApplications(
									applications
								)} // Pass filtered applications
							/>
						);
					})}
			</ScrollView>
			{/* Floating Action Button */}
			<View style={styles.fabContainer}>
				<FAB
					style={styles.fab}
					icon={showSearch ? "close" : "magnify"}
					color="black" // Icon color
					onPress={handleFilterProps}
				/>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#fff"
	},
	mainContainer: {
		flex: 1,
		width: "100%"
	},
	searchBar: {
		height: 40,
		margin: 10,
		paddingHorizontal: 15,
		borderRadius: 20,
		backgroundColor: "#f0f0f0",
		borderWidth: 1,
		borderColor: "#ddd",
		color: "#333"
	},
	// fab: {
	// 	position: "absolute",
	// 	right: 30,
	// 	bottom: 100,
	// 	backgroundColor: Colors.primary500
	// },
	fabContainer: {
		position: "absolute",
		right: 20,
		bottom: 20
	},
	fab: {
		position: "absolute",
		right: 30,
		bottom: 100,
		backgroundColor: "rgba(200, 200, 200, 0.3)", // Grey, almost transparent
		width: 50,
		height: 50,
		borderRadius: 25, // Makes it perfectly circular
		justifyContent: "center",
		alignItems: "center",
		elevation: 4
	}
});

export default ProgramList;
