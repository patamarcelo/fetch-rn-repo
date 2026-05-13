import React, { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
	View,
	Text,
	StyleSheet,
	Pressable,
	ScrollView,
	TextInput,
	ActivityIndicator,
	Alert,
	StatusBar,
	Platform,
	KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import Ionicons from "@expo/vector-icons/Ionicons";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import * as Haptics from "expo-haptics";

import { Colors } from "../../constants/styles";
import { LINKMachine } from "../../utils/api";
import { fetchMachines, maquinarioActions } from "../../store/redux/maquinario";

const STATUS_OPTIONS = [
	{
		value: "operation",
		label: "Em operação",
		description: "Máquina disponível para uso normal.",
		icon: "checkmark-circle-outline",
		color: Colors.primary[800],
		bg: "rgba(22,101,52,0.08)",
		border: "rgba(22,101,52,0.18)",
	},
	{
		value: "revision",
		label: "Revisão",
		description: "Máquina em revisão programada.",
		icon: "construct-outline",
		color: "#7A5B00",
		bg: "rgba(255,215,0,0.16)",
		border: "rgba(122,91,0,0.18)",
	},
	{
		value: "maintenance",
		label: "Manutenção",
		description: "Máquina parada por manutenção/correção.",
		icon: "warning-outline",
		color: "#B42318",
		bg: "rgba(180,35,24,0.08)",
		border: "rgba(180,35,24,0.18)",
	},
];

const cleanMachineLocation = (value) => {
	const cleaned = String(value || "")
		.replace(/\bProjeto\b\s*[:\-–—]?\s*/gi, "")
		.replace(/\bFazenda\b\s*[:\-–—]?\s*/gi, "")
		.replace(/\s{2,}/g, " ")
		.trim();

	return cleaned || "Não informada";
};

const getMachineIcon = (machineType, color = Colors.primary[800]) => {
	if (machineType === "tractor") {
		return <FontAwesome5 name="tractor" size={24} color={color} />;
	}

	if (machineType === "sprayer") {
		return <Ionicons name="water-outline" size={27} color={color} />;
	}

	if (machineType === "harvester") {
		return <FontAwesome5 name="truck-monster" size={23} color={color} />;
	}

	return <Ionicons name="construct-outline" size={26} color={color} />;
};

const getStatusOption = (status) => {
	return STATUS_OPTIONS.find((item) => item.value === status) || STATUS_OPTIONS[0];
};

const StatusOptionCard = ({ option, selected, current, onPress }) => {
	return (
		<Pressable
			onPress={onPress}
			style={({ pressed }) => [
				styles.statusOption,
				selected && {
					backgroundColor: option.bg,
					borderColor: option.border,
				},
				pressed && styles.pressed,
			]}
		>
			<View
				style={[
					styles.statusOptionIconBox,
					{
						backgroundColor: selected
							? option.bg
							: "rgba(15,23,42,0.045)",
					},
				]}
			>
				<Ionicons
					name={selected ? "checkmark-circle" : option.icon}
					size={20}
					color={selected ? option.color : "rgba(15,23,42,0.46)"}
				/>
			</View>

			<View style={styles.statusOptionTextBox}>
				<View style={styles.statusOptionTitleLine}>
					<Text style={styles.statusOptionTitle}>{option.label}</Text>

					{current ? (
						<View style={styles.currentBadge}>
							<Text style={styles.currentBadgeText}>Atual</Text>
						</View>
					) : null}
				</View>

				<Text style={styles.statusOptionDescription}>
					{option.description}
				</Text>
			</View>
		</Pressable>
	);
};

const MachineStatusFormScreen = ({ route, navigation }) => {
	const dispatch = useDispatch();

	const machineId = route?.params?.machineId;

	const machine = useSelector((state) =>
		(state?.maquinario?.machines || []).find(
			(item) => String(item?.id) === String(machineId)
		)
	);

	const authUser = useSelector((state) => state?.auth?.user || null);

	const [selectedStatus, setSelectedStatus] = useState(
		machine?.status || "operation"
	);
	const [notes, setNotes] = useState("");
	const [isSaving, setIsSaving] = useState(false);

	useFocusEffect(
		useCallback(() => {
			StatusBar.setBarStyle("dark-content");

			if (Platform.OS === "android") {
				StatusBar.setBackgroundColor("#D6E3F3");
			}
		}, [])
	);

	const currentStatusOption = getStatusOption(machine?.status);
	const selectedStatusOption = getStatusOption(selectedStatus);

	const machineName =
		machine?.description ||
		machine?.identifier ||
		machine?.machine_type_label ||
		"Máquina";

	const machineLocation = cleanMachineLocation(
		machine?.fazenda_name || machine?.farm_name || machine?.location_name
	);

	const notesRequired =
		selectedStatus === "maintenance" || selectedStatus === "revision";

	const canSave =
		!!machine?.id &&
		selectedStatus &&
		selectedStatus !== machine?.status &&
		(!notesRequired || notes.trim().length >= 3) &&
		!isSaving;

	const handleBack = useCallback(() => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

		if (navigation?.canGoBack?.()) {
			navigation.goBack();
			return;
		}

		navigation.navigate("MachineDetailScreen", {
			machineId,
		});
	}, [navigation, machineId]);

	const performSave = useCallback(async () => {
		try {
			setIsSaving(true);

			const customClaims =
				authUser?.customClaims ||
				authUser?.claims ||
				authUser?.stsTokenManager?.claims ||
				null;

			const payload = {
				status: selectedStatus,
				notes,
				user: authUser
					? {
							uid: authUser.uid || null,
							email: authUser.email || null,
							displayName: authUser.displayName || null,
							customClaims,
					  }
					: null,
			};

			const response = await fetch(
				`${LINKMachine}/maquinario/machines/${machine.id}/update_status/`,
				{
					method: "POST",
					body: JSON.stringify(payload),
					headers: {
						"Content-Type": "application/json",
						Authorization: `Token ${process.env.EXPO_PUBLIC_REACT_APP_DJANGO_TOKEN}`,
					},
				}
			);

			if (!response.ok) {
				let errorMessage = "Não foi possível alterar o status da máquina.";

				try {
					const errorData = await response.json();
					errorMessage =
						errorData?.error ||
						errorData?.detail ||
						JSON.stringify(errorData) ||
						errorMessage;
				} catch {
					errorMessage = await response.text();
				}

				throw new Error(errorMessage);
			}

			const data = await response.json();

			if (data?.machine) {
				dispatch(maquinarioActions.replaceMachineFromApi(data.machine));
			}

			dispatch(fetchMachines());

			Alert.alert(
				"Status atualizado",
				`A máquina foi alterada para ${selectedStatusOption.label}.`,
				[
					{
						text: "OK",
						onPress: () => navigation.goBack(),
					},
				]
			);
		} catch (error) {
			console.log("Erro ao alterar status da máquina:", error);

			Alert.alert(
				"Erro ao alterar status",
				error?.message || "Não foi possível alterar o status da máquina."
			);
		} finally {
			setIsSaving(false);
		}
	}, [
		authUser,
		selectedStatus,
		selectedStatusOption,
		notes,
		machine?.id,
		dispatch,
		navigation,
	]);

	const handleSave = useCallback(() => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

		if (!machine?.id) {
			Alert.alert("Máquina inválida", "Não foi possível identificar a máquina.");
			return;
		}

		if (selectedStatus === machine?.status) {
			Alert.alert(
				"Status não alterado",
				"A máquina já está com esse status."
			);
			return;
		}

		if (notesRequired && notes.trim().length < 3) {
			Alert.alert(
				"Informe uma observação",
				"Para revisão ou manutenção, informe uma observação rápida sobre o motivo."
			);
			return;
		}

		Alert.alert(
			"Confirmar alteração",
			`Alterar status de "${machine?.identifier || machineName}" de "${currentStatusOption.label}" para "${selectedStatusOption.label}"?`,
			[
				{
					text: "Cancelar",
					style: "cancel",
				},
				{
					text: "Alterar",
					onPress: performSave,
				},
			]
		);
	}, [
		machine,
		machineName,
		selectedStatus,
		currentStatusOption,
		selectedStatusOption,
		notesRequired,
		notes,
		performSave,
	]);

	if (!machine) {
		return (
			<SafeAreaView style={styles.root} edges={["top"]}>
				<View style={styles.notFoundCard}>
					<Ionicons name="alert-circle-outline" size={32} color="#B42318" />
					<Text style={styles.notFoundTitle}>Máquina não encontrada</Text>
					<Text style={styles.notFoundDescription}>
						Volte para a lista e tente abrir novamente.
					</Text>

					<Pressable onPress={handleBack} style={styles.notFoundButton}>
						<Text style={styles.notFoundButtonText}>Voltar</Text>
					</Pressable>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.root} edges={["top"]}>
			<KeyboardAvoidingView
				style={styles.keyboardView}
				behavior={Platform.OS === "ios" ? "padding" : undefined}
			>
				<ScrollView
					showsVerticalScrollIndicator={false}
					keyboardShouldPersistTaps="handled"
					contentContainerStyle={styles.scrollContent}
				>
					<View style={styles.topBar}>
						<Pressable
							onPress={handleBack}
							hitSlop={10}
							style={({ pressed }) => [
								styles.topIconButton,
								pressed && styles.pressed,
							]}
						>
							<Ionicons name="chevron-back" size={23} color="#0F172A" />
						</Pressable>

						<View style={styles.topTitleBox}>
							<Text style={styles.topTitle}>Alterar status</Text>
							<Text style={styles.topSubtitle}>Situação operacional da máquina</Text>
						</View>
					</View>

					<View style={styles.machineCard}>
						<View style={styles.machineHeader}>
							<View style={styles.machineIconBox}>
								{getMachineIcon(machine.machine_type)}
							</View>

							<View style={styles.machineTextBox}>
								<Text style={styles.machineCode} numberOfLines={1}>
									{machine?.identifier || "Sem código"}
								</Text>

								<Text style={styles.machineName} numberOfLines={2}>
									{machineName}
								</Text>

								<View style={styles.locationLine}>
									<Ionicons
										name="location-outline"
										size={13}
										color="rgba(15,23,42,0.44)"
									/>
									<Text style={styles.locationText} numberOfLines={1}>
										{machineLocation}
									</Text>
								</View>
							</View>
						</View>

						<View
							style={[
								styles.currentStatusBox,
								{
									backgroundColor: currentStatusOption.bg,
									borderColor: currentStatusOption.border,
								},
							]}
						>
							<Ionicons
								name={currentStatusOption.icon}
								size={18}
								color={currentStatusOption.color}
							/>

							<View style={styles.currentStatusTextBox}>
								<Text style={styles.currentStatusLabel}>Status atual</Text>
								<Text
									style={[
										styles.currentStatusValue,
										{ color: currentStatusOption.color },
									]}
								>
									{machine?.status_label || currentStatusOption.label}
								</Text>
							</View>
						</View>
					</View>

					<View style={styles.formCard}>
						<Text style={styles.formTitle}>Novo status</Text>
						<Text style={styles.formDescription}>
							Escolha a situação operacional atual da máquina.
						</Text>

						<View style={styles.optionsList}>
							{STATUS_OPTIONS.map((option) => (
								<StatusOptionCard
									key={option.value}
									option={option}
									selected={selectedStatus === option.value}
									current={machine?.status === option.value}
									onPress={() => {
										Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
										setSelectedStatus(option.value);
									}}
								/>
							))}
						</View>
					</View>

					<View style={styles.formCard}>
						<Text style={styles.formTitle}>Observação</Text>
						<Text style={styles.formDescription}>
							{notesRequired
								? "Obrigatória para revisão ou manutenção."
								: "Opcional para status em operação."}
						</Text>

						<View
							style={[
								styles.notesShell,
								notesRequired &&
									notes.trim().length < 3 &&
									selectedStatus !== machine?.status &&
									styles.notesShellWarning,
							]}
						>
							<TextInput
								value={notes}
								onChangeText={setNotes}
								placeholder="Ex: parada para manutenção preventiva..."
								placeholderTextColor="rgba(15,23,42,0.34)"
								style={styles.notesInput}
								multiline
								textAlignVertical="top"
							/>
						</View>

						{notesRequired &&
						notes.trim().length < 3 &&
						selectedStatus !== machine?.status ? (
							<Text style={styles.inputWarning}>
								Informe ao menos uma breve observação.
							</Text>
						) : null}
					</View>
				</ScrollView>

				<View style={styles.footer}>
					<Pressable
						onPress={handleSave}
						disabled={!canSave}
						style={({ pressed }) => [
							styles.saveButton,
							!canSave && styles.saveButtonDisabled,
							pressed && canSave && styles.pressed,
						]}
					>
						{isSaving ? (
							<ActivityIndicator size="small" color="#FFFFFF" />
						) : (
							<Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
						)}

						<Text style={styles.saveButtonText}>
							{isSaving ? "Salvando..." : "Salvar status"}
						</Text>
					</Pressable>
				</View>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	root: {
		flex: 1,
		backgroundColor: "#D6E3F3",
	},

	keyboardView: {
		flex: 1,
	},

	scrollContent: {
		paddingHorizontal: 16,
		paddingTop: 10,
		paddingBottom: 120,
	},

	topBar: {
		minHeight: 48,
		marginBottom: 10,
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
	},

	topIconButton: {
		width: 42,
		height: 42,
		borderRadius: 16,
		backgroundColor: "rgba(255,255,255,0.86)",
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.08)",
		alignItems: "center",
		justifyContent: "center",
		shadowColor: "#000",
		shadowOpacity: 0.04,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 5 },
		elevation: 1,
	},

	topTitleBox: {
		flex: 1,
	},

	topTitle: {
		color: "#0F172A",
		fontSize: 14,
		fontWeight: "900",
		letterSpacing: -0.2,
	},

	topSubtitle: {
		marginTop: 1,
		color: "rgba(15,23,42,0.48)",
		fontSize: 11,
		fontWeight: "800",
	},

	machineCard: {
		backgroundColor: "#FFFFFF",
		borderRadius: 26,
		padding: 16,
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.08)",
		shadowColor: "#000",
		shadowOpacity: 0.07,
		shadowRadius: 16,
		shadowOffset: { width: 0, height: 9 },
		elevation: 2,
	},

	machineHeader: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
	},

	machineIconBox: {
		width: 52,
		height: 52,
		borderRadius: 19,
		backgroundColor: "rgba(22,101,52,0.10)",
		borderWidth: 1,
		borderColor: "rgba(22,101,52,0.12)",
		alignItems: "center",
		justifyContent: "center",
	},

	machineTextBox: {
		flex: 1,
		minWidth: 0,
	},

	machineCode: {
		color: Colors.primary[800],
		fontSize: 11,
		fontWeight: "900",
		textTransform: "uppercase",
		letterSpacing: 0.45,
	},

	machineName: {
		marginTop: 3,
		color: "#0F172A",
		fontSize: 15,
		fontWeight: "900",
		lineHeight: 19,
		letterSpacing: -0.2,
	},

	locationLine: {
		marginTop: 5,
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
	},

	locationText: {
		flex: 1,
		color: "rgba(15,23,42,0.45)",
		fontSize: 10.5,
		fontWeight: "800",
	},

	currentStatusBox: {
		marginTop: 14,
		borderRadius: 18,
		padding: 13,
		borderWidth: 1,
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
	},

	currentStatusTextBox: {
		flex: 1,
	},

	currentStatusLabel: {
		color: "rgba(15,23,42,0.48)",
		fontSize: 10,
		fontWeight: "900",
		textTransform: "uppercase",
		letterSpacing: 0.25,
	},

	currentStatusValue: {
		marginTop: 3,
		fontSize: 16,
		fontWeight: "900",
	},

	formCard: {
		marginTop: 14,
		backgroundColor: "#FFFFFF",
		borderRadius: 26,
		padding: 16,
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.08)",
		shadowColor: "#000",
		shadowOpacity: 0.05,
		shadowRadius: 14,
		shadowOffset: { width: 0, height: 8 },
		elevation: 2,
	},

	formTitle: {
		color: "#0F172A",
		fontSize: 16,
		fontWeight: "900",
		letterSpacing: -0.3,
	},

	formDescription: {
		marginTop: 4,
		color: "rgba(15,23,42,0.52)",
		fontSize: 12,
		fontWeight: "700",
		lineHeight: 17,
	},

	optionsList: {
		marginTop: 14,
		gap: 10,
	},

	statusOption: {
		borderRadius: 20,
		padding: 12,
		backgroundColor: "rgba(15,23,42,0.025)",
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.06)",
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
	},

	statusOptionIconBox: {
		width: 38,
		height: 38,
		borderRadius: 15,
		alignItems: "center",
		justifyContent: "center",
	},

	statusOptionTextBox: {
		flex: 1,
		minWidth: 0,
	},

	statusOptionTitleLine: {
		flexDirection: "row",
		alignItems: "center",
		gap: 7,
	},

	statusOptionTitle: {
		color: "#0F172A",
		fontSize: 13,
		fontWeight: "900",
	},

	statusOptionDescription: {
		marginTop: 2,
		color: "rgba(15,23,42,0.48)",
		fontSize: 10.5,
		fontWeight: "700",
		lineHeight: 15,
	},

	currentBadge: {
		borderRadius: 999,
		paddingHorizontal: 7,
		paddingVertical: 3,
		backgroundColor: "rgba(15,23,42,0.06)",
	},

	currentBadgeText: {
		color: "rgba(15,23,42,0.52)",
		fontSize: 9,
		fontWeight: "900",
	},

	notesShell: {
		marginTop: 14,
		minHeight: 98,
		borderRadius: 18,
		backgroundColor: "rgba(15,23,42,0.035)",
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.08)",
		paddingHorizontal: 13,
		paddingTop: 10,
	},

	notesShellWarning: {
		backgroundColor: "rgba(148,98,0,0.055)",
		borderColor: "rgba(148,98,0,0.20)",
	},

	notesInput: {
		flex: 1,
		minHeight: 78,
		color: "#0F172A",
		fontSize: 13,
		fontWeight: "700",
		lineHeight: 18,
	},

	inputWarning: {
		marginTop: 7,
		color: "#946200",
		fontSize: 11,
		fontWeight: "800",
		lineHeight: 15,
	},

	footer: {
		position: "absolute",
		left: 0,
		right: 0,
		bottom: 0,
		paddingHorizontal: 16,
		paddingTop: 12,
		paddingBottom: 18,
		backgroundColor: "rgba(214,227,243,0.96)",
		borderTopWidth: 1,
		borderTopColor: "rgba(15,23,42,0.06)",
	},

	saveButton: {
		height: 52,
		borderRadius: 19,
		backgroundColor: Colors.primary[800],
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
		shadowColor: "#000",
		shadowOpacity: 0.12,
		shadowRadius: 14,
		shadowOffset: { width: 0, height: 8 },
		elevation: 3,
	},

	saveButtonDisabled: {
		opacity: 0.48,
	},

	saveButtonText: {
		color: "#FFFFFF",
		fontSize: 14,
		fontWeight: "900",
	},

	notFoundCard: {
		margin: 18,
		marginTop: 80,
		backgroundColor: "#FFFFFF",
		borderRadius: 24,
		padding: 22,
		alignItems: "center",
		borderWidth: 1,
		borderColor: "rgba(180,35,24,0.16)",
	},

	notFoundTitle: {
		marginTop: 10,
		color: "#0F172A",
		fontSize: 16,
		fontWeight: "900",
	},

	notFoundDescription: {
		marginTop: 4,
		color: "rgba(15,23,42,0.52)",
		fontSize: 12,
		fontWeight: "700",
		textAlign: "center",
	},

	notFoundButton: {
		marginTop: 14,
		borderRadius: 999,
		paddingHorizontal: 16,
		paddingVertical: 10,
		backgroundColor: Colors.primary[800],
	},

	notFoundButtonText: {
		color: "#FFFFFF",
		fontSize: 12,
		fontWeight: "900",
	},

	pressed: {
		opacity: 0.78,
		transform: [{ scale: 0.99 }],
	},
});

export default MachineStatusFormScreen;