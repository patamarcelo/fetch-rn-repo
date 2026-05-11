import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { Colors } from "../constants/styles";

const mockMachines = [
	{
		id: 1,
		tipo: "trator",
		nome: "Trator John Deere 6190J",
		codigo: "TR-001",
		horimetroAtual: 1842,
		ultimaRevisao: 1500,
		proximaRevisao: 2000,
		status: "Operação",
	},
	{
		id: 2,
		tipo: "trator",
		nome: "Trator Valtra BH 194",
		codigo: "TR-002",
		horimetroAtual: 1268,
		ultimaRevisao: 1000,
		proximaRevisao: 1500,
		status: "Revisão",
	},
	{
		id: 3,
		tipo: "pulverizador",
		nome: "Pulverizador Autopropelido",
		codigo: "PV-001",
		horimetroAtual: 932,
		ultimaRevisao: 750,
		proximaRevisao: 1000,
		status: "Manutenção",
	},
];

const getMachineIcon = (tipo) => {
	if (tipo === "trator") {
		return <FontAwesome5 name="tractor" size={22} color={Colors.primary[800]} />;
	}

	if (tipo === "pulverizador") {
		return <Ionicons name="water-outline" size={24} color={Colors.primary[800]} />;
	}

	return <Ionicons name="construct-outline" size={24} color={Colors.primary[800]} />;
};

const getStatusStyle = (status) => {
	if (status === "Manutenção") {
		return {
			box: styles.statusMaintenance,
			text: styles.statusMaintenanceText,
		};
	}

	if (status === "Revisão") {
		return {
			box: styles.statusReview,
			text: styles.statusReviewText,
		};
	}

	return {
		box: styles.statusOperation,
		text: styles.statusOperationText,
	};
};

const MachineCard = ({ machine, onPress }) => {
	const statusStyle = getStatusStyle(machine.status);

	const remainingHours = Math.max(
		Number(machine.proximaRevisao || 0) - Number(machine.horimetroAtual || 0),
		0
	);

	return (
		<Pressable
			onPress={onPress}
			style={({ pressed }) => [styles.machineCard, pressed && styles.pressed]}
		>
			<View style={styles.machineTopRow}>
				<View style={styles.machineIconBox}>{getMachineIcon(machine.tipo)}</View>

				<View style={styles.machineTitleBox}>
					<Text style={styles.machineName} numberOfLines={1}>
						{machine.nome}
					</Text>

					<Text style={styles.machineCode}>{machine.codigo}</Text>
				</View>

				<View style={[styles.statusBadge, statusStyle.box]}>
					<Text style={[styles.statusText, statusStyle.text]}>{machine.status}</Text>
				</View>
			</View>

			<View style={styles.metricsGrid}>
				<View style={styles.metricBox}>
					<Text style={styles.metricLabel}>Horímetro atual</Text>
					<Text style={styles.metricValue}>{machine.horimetroAtual} h</Text>
				</View>

				<View style={styles.metricBox}>
					<Text style={styles.metricLabel}>Última revisão</Text>
					<Text style={styles.metricValue}>{machine.ultimaRevisao} h</Text>
				</View>

				<View style={styles.metricBox}>
					<Text style={styles.metricLabel}>Próxima revisão</Text>
					<Text style={styles.metricValue}>{machine.proximaRevisao} h</Text>
				</View>

				<View style={styles.metricBox}>
					<Text style={styles.metricLabel}>Faltam</Text>
					<Text style={styles.metricValue}>{remainingHours} h</Text>
				</View>
			</View>

			<View style={styles.cardFooter}>
				<Text style={styles.cardFooterText}>Toque para ver histórico e detalhes</Text>
				<Ionicons name="chevron-forward" size={18} color="rgba(15,23,42,0.44)" />
			</View>
		</Pressable>
	);
};

const MachineryScreen = ({ navigation }) => {
	const handleOpenMachine = (machine) => {
		console.log("abrir máquina:", machine);

		// Futuro:
		// navigation.navigate("MachineDetailScreen", { machineId: machine.id });
	};

	return (
		<View style={styles.root}>
			<View style={styles.headerCard}>
				<View style={styles.headerIconBox}>
					<FontAwesome5 name="tractor" size={24} color={Colors.primary[800]} />
				</View>

				<View style={{ flex: 1 }}>
					<Text style={styles.title}>Maquinário</Text>
					<Text style={styles.description}>
						Acompanhe horímetro, revisões e status operacional das máquinas.
					</Text>
				</View>
			</View>

			<ScrollView
				showsVerticalScrollIndicator={false}
				contentContainerStyle={styles.scrollContent}
			>
				<View style={styles.sectionHeader}>
					<Text style={styles.sectionTitle}>Máquinas cadastradas</Text>
					<Text style={styles.sectionSubtitle}>
						{mockMachines.length} equipamentos
					</Text>
				</View>

				{mockMachines.map((machine) => (
					<MachineCard
						key={machine.id}
						machine={machine}
						onPress={() => handleOpenMachine(machine)}
					/>
				))}
			</ScrollView>
		</View>
	);
};

const styles = StyleSheet.create({
	root: {
		flex: 1,
		backgroundColor: "#D6E3F3",
		paddingHorizontal: 16,
		paddingTop: 14,
	},

	headerCard: {
		backgroundColor: "#FFFFFF",
		borderRadius: 24,
		padding: 16,
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.08)",
		flexDirection: "row",
		alignItems: "center",
		gap: 13,
		shadowColor: "#000",
		shadowOpacity: 0.07,
		shadowRadius: 14,
		shadowOffset: { width: 0, height: 8 },
		elevation: 2,
	},

	headerIconBox: {
		width: 52,
		height: 52,
		borderRadius: 19,
		backgroundColor: "rgba(22,101,52,0.10)",
		alignItems: "center",
		justifyContent: "center",
	},

	title: {
		color: "#0F172A",
		fontSize: 21,
		fontWeight: "900",
		letterSpacing: -0.4,
	},

	description: {
		marginTop: 3,
		color: "rgba(15,23,42,0.58)",
		fontSize: 12,
		fontWeight: "700",
		lineHeight: 17,
	},

	scrollContent: {
		paddingTop: 16,
		paddingBottom: 34,
	},

	sectionHeader: {
		marginBottom: 10,
		paddingHorizontal: 2,
		flexDirection: "row",
		alignItems: "flex-end",
		justifyContent: "space-between",
	},

	sectionTitle: {
		color: "#0F172A",
		fontSize: 14,
		fontWeight: "900",
	},

	sectionSubtitle: {
		color: "rgba(15,23,42,0.52)",
		fontSize: 11,
		fontWeight: "800",
	},

	machineCard: {
		backgroundColor: "#FFFFFF",
		borderRadius: 22,
		padding: 14,
		marginBottom: 12,
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.08)",
		shadowColor: "#000",
		shadowOpacity: 0.07,
		shadowRadius: 14,
		shadowOffset: { width: 0, height: 8 },
		elevation: 2,
	},

	machineTopRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		marginBottom: 13,
	},

	machineIconBox: {
		width: 44,
		height: 44,
		borderRadius: 16,
		backgroundColor: "rgba(22,101,52,0.10)",
		alignItems: "center",
		justifyContent: "center",
	},

	machineTitleBox: {
		flex: 1,
	},

	machineName: {
		color: "#0F172A",
		fontSize: 14,
		fontWeight: "900",
	},

	machineCode: {
		marginTop: 2,
		color: "rgba(15,23,42,0.46)",
		fontSize: 11,
		fontWeight: "800",
	},

	statusBadge: {
		borderRadius: 999,
		paddingHorizontal: 9,
		paddingVertical: 5,
	},

	statusOperation: {
		backgroundColor: "rgba(22,101,52,0.12)",
	},

	statusOperationText: {
		color: Colors.primary[800],
	},

	statusMaintenance: {
		backgroundColor: "rgba(180,35,24,0.12)",
	},

	statusMaintenanceText: {
		color: "#B42318",
	},

	statusReview: {
		backgroundColor: "rgba(255,215,0,0.22)",
	},

	statusReviewText: {
		color: "#7A5B00",
	},

	statusText: {
		fontSize: 10,
		fontWeight: "900",
	},

	metricsGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
	},

	metricBox: {
		width: "48%",
		backgroundColor: "rgba(15,23,42,0.035)",
		borderRadius: 15,
		paddingHorizontal: 10,
		paddingVertical: 9,
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.045)",
	},

	metricLabel: {
		color: "rgba(15,23,42,0.45)",
		fontSize: 10,
		fontWeight: "900",
		textTransform: "uppercase",
		letterSpacing: 0.3,
	},

	metricValue: {
		marginTop: 4,
		color: "#0F172A",
		fontSize: 14,
		fontWeight: "900",
	},

	cardFooter: {
		marginTop: 12,
		paddingTop: 10,
		borderTopWidth: 1,
		borderTopColor: "rgba(15,23,42,0.06)",
		flexDirection: "row",
		alignItems: "center",

		justifyContent: "space-between",
	},

	cardFooterText: {
		color: "rgba(15,23,42,0.48)",
		fontSize: 11,
		fontWeight: "800",
	},

	pressed: {
		opacity: 0.78,
		transform: [{ scale: 0.99 }],
	},
});

export default MachineryScreen;