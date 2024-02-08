import {
	ActivityIndicator,
	View,
	Text,
	StyleSheet,
	FlatList,
	RefreshControl,
	Alert
} from "react-native";

import { EXPO_PUBLIC_REACT_APP_DJANGO_TOKEN } from "@env";

import { Colors } from "../constants/styles";
import Button from "../components/ui/Button";
import { useEffect, useState } from "react";

import CardList from "../components/HomeScreen/CardList";

const FarmList = (itemData) => {
	return <CardList data={itemData.item} />;
};

const HomeScreen = () => {
	const [isLoading, setIsLoading] = useState(false);
	const [dataFromServer, setDataFromServer] = useState([]);
	const [onlyFarms, setOnlyFarms] = useState([]);
	const handleRefresh = () => {
		console.log("atualizar");
	};
	const safraCiclo = {
		safra: "2023/2024",
		ciclo: "3"
	};

	useEffect(() => {
		getData();
	}, []);

	useEffect(() => {
		if (dataFromServer.length > 0) {
			const onlyFarm = dataFromServer.map((data, i) => {
				return data.fazenda;
			});
			const setFarms = [...new Set(onlyFarm)];
			setOnlyFarms(setFarms);
		}
	}, [dataFromServer]);

	const getData = async () => {
		console.log("pegando os dados");
		setIsLoading(true);
		try {
			const response = await fetch(
				"http://127.0.0.1:8000/diamante/plantio/get_plantio_operacoes_detail_json_program/",
				{
					headers: {
						Authorization: `Token ${EXPO_PUBLIC_REACT_APP_DJANGO_TOKEN}`,
						"Content-Type": "application/json"
					},
					body: JSON.stringify(safraCiclo),
					method: "POST"
				}
			);

			const data = await response.json();
			console.table(data.dados_plantio);
			setDataFromServer(
				data.dados_plantio
					.sort((a, b) => a.parcela.localeCompare(b.parcela))
					.sort((a, b) => a.fazenda.localeCompare(b.fazenda))
			);
		} catch (error) {
			console.log("erro ao pegar os dados", error);
			Alert.alert(
				`Problema na API', 'possível erro de internet para pegar os dados ${error}`
			);
		} finally {
			setIsLoading(false);
		}
	};

	if (isLoading) {
		return (
			<View
				style={{
					flex: 1,
					justifyContent: "center",
					backgroundColor: Colors.primary100
				}}
			>
				<ActivityIndicator size="large" color="#0000ff" />
			</View>
		);
	}

	return (
		<View style={styles.mainContainer}>
			{/* <View style={styles.header}>
				<Button onPress={getData}>Pegar Dados</Button>
			</View> */}
			<View style={styles.dataContainer}>
				{dataFromServer.length > 0 && (
					<FlatList
						// scrollEnabled={false}
						data={dataFromServer}
						keyExtractor={(item, i) => i}
						renderItem={FarmList}
						ItemSeparatorComponent={() => (
							<View style={{ height: 9 }} />
						)}
						refreshControl={
							<RefreshControl
								refreshing={isLoading}
								onRefresh={getData}
								colors={["#9Bd35A", "#689F38"]}
								tintColor={Colors.primary500}
							/>
						}
					/>
				)}
			</View>
			{/* <Text style={{ color: "whitesmoke" }}>Home Screen</Text> */}
		</View>
	);
};

const styles = StyleSheet.create({
	mainContainer: {
		backgroundColor: Colors.primary100,
		flex: 1,
		justifyContent: "space-around",
		alignItems: "center"
	},
	header: {
		height: 100,
		padding: 20
	},
	dataContainer: {
		flex: 1,
		// backgroundColor: "red",
		width: "100%",
		alignItems: "center"
	}
});

export default HomeScreen;
