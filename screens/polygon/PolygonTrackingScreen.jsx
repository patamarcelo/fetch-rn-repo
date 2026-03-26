import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useSelector } from "react-redux";
import { Colors } from "../../constants/styles";
import { selectPolygonDraft } from "../../store/redux/polygonSelectors";

const PolygonTrackingScreen = () => {
	const draft = useSelector(selectPolygonDraft);

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Navegação automática</Text>
			<Text style={styles.text}>Modo selecionado: {draft?.mode || "-"}</Text>
			<Text style={styles.text}>Fazenda: {draft?.farmName || "Não definida"}</Text>
			<Text style={styles.text}>Pontos atuais: {draft?.points?.length || 0}</Text>

			<Text style={styles.helper}>
				Na próxima etapa vamos conectar a localização contínua, iniciar, pausar,
				retomar e finalizar a gravação do polígono.
			</Text>
		</View>
	);
};

export default PolygonTrackingScreen;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 20,
		backgroundColor: Colors.primary100 || "#F4F6F8",
	},
	title: {
		fontSize: 24,
		fontWeight: "800",
		color: "#111827",
		marginBottom: 16,
	},
	text: {
		fontSize: 15,
		color: "#374151",
		marginBottom: 8,
	},
	helper: {
		marginTop: 20,
		fontSize: 14,
		lineHeight: 22,
		color: "#6B7280",
	},
});