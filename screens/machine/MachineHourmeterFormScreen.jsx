import React, { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
	View,
	Text,
	StyleSheet,
	Pressable,
	TextInput,
	ScrollView,
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
import { maquinarioActions } from "../../store/redux/maquinario";

const formatHour = (value) => {
	if (value === null || value === undefined || value === "") return "-";

	const numberValue = Number(value);

	if (Number.isNaN(numberValue)) return "-";

	return numberValue.toLocaleString("pt-BR", {
		minimumFractionDigits: numberValue % 1 === 0 ? 0 : 1,
		maximumFractionDigits: 1,
	});
};

const normalizeDecimalInput = (value) => {
	return String(value || "")
		.replace(",", ".")
		.replace(/[^\d.]/g, "");
};

const parseDecimalInput = (value) => {
	const normalized = normalizeDecimalInput(value);

	if (!normalized) return null;

	const numberValue = Number(normalized);

	if (Number.isNaN(numberValue)) return null;

	return numberValue;
};

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

const buildLocalId = () => {
	return `hm-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};

const shouldSaveAsPending = (error) => {
	if (!error) return true;

	const status = error?.status;

	if (!status) return true;

	if (status >= 500) return true;

	return false;
};

const MachineHourmeterFormScreen = ({ route, navigation }) => {
	const dispatch = useDispatch();
	const machineId = route?.params?.machineId;

	const machine = useSelector((state) =>
		(state?.maquinario?.machines || []).find(
			(item) => String(item?.id) === String(machineId)
		)
	);

	const authUser = useSelector((state) => state?.auth?.user || null);

	const [hourmeter, setHourmeter] = useState("");
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

	const currentHourmeter = Number(machine?.current_hourmeter || 0);
	const nextValue = useMemo(() => parseDecimalInput(hourmeter), [hourmeter]);

	const machineName =
		machine?.description ||
		machine?.identifier ||
		machine?.machine_type_label ||
		"Máquina";

	const machineLocation = cleanMachineLocation(
		machine?.fazenda_name || machine?.farm_name || machine?.location_name
	);

	const isValueValid =
		nextValue !== null &&
		!Number.isNaN(nextValue) &&
		nextValue >= currentHourmeter;

	const hasIncrease =
		nextValue !== null &&
		!Number.isNaN(nextValue) &&
		nextValue > currentHourmeter;

	const difference =
		nextValue !== null && !Number.isNaN(nextValue)
			? nextValue - currentHourmeter
			: null;

	const handleBack = useCallback(() => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

		if (navigation?.canGoBack?.()) {
			navigation.goBack();
			return;
		}

		navigation?.navigate?.("MachineDetailScreen", {
			machineId,
		});
	}, [navigation, machineId]);

	const savePendingReading = useCallback(
		({ value, measuredAt, errorMessage }) => {
			const pending = {
				localId: buildLocalId(),
				machineId: machine?.id,
				machineIdentifier: machine?.identifier || null,
				machineDescription: machine?.description || null,
				previousHourmeter: currentHourmeter,
				value,
				measuredAt,
				notes,
				source: "app_offline",
				status: "pending",
				error: errorMessage || null,
				createdAt: new Date().toISOString(),
			};

			dispatch(maquinarioActions.addPendingHourmeterReading(pending));

			Alert.alert(
				"Leitura salva no celular",
				"Não foi possível sincronizar agora. A leitura ficou pendente e poderá ser enviada quando houver conexão.",
				[
					{
						text: "OK",
						onPress: () => navigation.goBack(),
					},
				]
			);
		},
		[dispatch, machine, currentHourmeter, notes, navigation]
	);

	const handleSave = useCallback(async () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

		if (!machine?.id) {
			Alert.alert("Máquina inválida", "Não foi possível identificar a máquina.");
			return;
		}

		if (nextValue === null || Number.isNaN(nextValue)) {
			Alert.alert("Horímetro inválido", "Informe um valor válido para o horímetro.");
			return;
		}

		if (nextValue < currentHourmeter) {
			Alert.alert(
				"Valor menor que o atual",
				`O horímetro atual é ${formatHour(currentHourmeter)} h. Informe um valor maior ou igual.`
			);
			return;
		}

		const measuredAt = new Date().toISOString();

		try {
			setIsSaving(true);

			const customClaims =
				authUser?.customClaims ||
				authUser?.claims ||
				authUser?.stsTokenManager?.claims ||
				null;

			const payload = {
				value: nextValue,
				measured_at: measuredAt,
				source: "app",
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
				`${LINKMachine}/maquinario/machines/${machine.id}/update_hourmeter/`,
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
				let errorMessage = "Não foi possível atualizar o horímetro.";

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

				const error = new Error(errorMessage);
				error.status = response.status;

				throw error;
			}

			const data = await response.json();

			if (data?.machine) {
				dispatch(maquinarioActions.replaceMachineFromApi(data.machine));
			}

			Alert.alert(
				"Horímetro atualizado",
				`Nova leitura registrada: ${formatHour(nextValue)} h.`,
				[
					{
						text: "OK",
						onPress: () => navigation.goBack(),
					},
				]
			);
		} catch (error) {
			console.log("Erro ao atualizar horímetro:", error);

			if (shouldSaveAsPending(error)) {
				savePendingReading({
					value: nextValue,
					measuredAt,
					errorMessage: error?.message,
				});
				return;
			}

			Alert.alert(
				"Não foi possível salvar",
				error?.message || "Verifique os dados informados e tente novamente."
			);
		} finally {
			setIsSaving(false);
		}
	}, [
		machine,
		nextValue,
		currentHourmeter,
		authUser,
		notes,
		dispatch,
		navigation,
		savePendingReading,
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
							<Text style={styles.topTitle}>Atualizar horímetro</Text>
							<Text style={styles.topSubtitle}>Nova leitura da máquina</Text>
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

								<Text style={styles.machineName} numberOfLines={1}>
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

						<View style={styles.currentBox}>
							<Text style={styles.currentLabel}>Horímetro atual</Text>
							<Text style={styles.currentValue}>
								{formatHour(machine?.current_hourmeter)} h
							</Text>
						</View>
					</View>

					<View style={styles.formCard}>
						<Text style={styles.formTitle}>Nova leitura</Text>
						<Text style={styles.formDescription}>
							Informe o horímetro atual da máquina. O valor não pode ser menor que o registrado no sistema.
						</Text>

						<View style={styles.inputBlock}>
							<Text style={styles.inputLabel}>Horímetro</Text>

							<View
								style={[
									styles.inputShell,
									hourmeter && !isValueValid && styles.inputShellError,
									hourmeter && isValueValid && styles.inputShellSuccess,
								]}
							>
								<Ionicons
									name="speedometer-outline"
									size={19}
									color={
										hourmeter && !isValueValid
											? "#B42318"
											: hourmeter && isValueValid
												? Colors.primary[800]
												: "rgba(15,23,42,0.42)"
									}
								/>

								<TextInput
									value={hourmeter}
									onChangeText={setHourmeter}
									placeholder="Ex: 820,5"
									placeholderTextColor="rgba(15,23,42,0.34)"
									style={styles.input}
									keyboardType="decimal-pad"
									returnKeyType="done"
								/>

								<Text style={styles.inputSuffix}>h</Text>
							</View>

							{hourmeter && !isValueValid ? (
								<Text style={styles.inputError}>
									O valor precisa ser maior ou igual a {formatHour(currentHourmeter)} h.
								</Text>
							) : null}

							{hourmeter && isValueValid && hasIncrease ? (
								<Text style={styles.inputHint}>
									Aumento de {formatHour(difference)} h em relação à leitura atual.
								</Text>
							) : null}
						</View>

						<View style={styles.inputBlock}>
							<Text style={styles.inputLabel}>Observação</Text>

							<View style={[styles.inputShell, styles.notesShell]}>
								<TextInput
									value={notes}
									onChangeText={setNotes}
									placeholder="Opcional"
									placeholderTextColor="rgba(15,23,42,0.34)"
									style={[styles.input, styles.notesInput]}
									multiline
									textAlignVertical="top"
								/>
							</View>
						</View>
					</View>

					<View style={styles.offlineCard}>
						<View style={styles.offlineIconBox}>
							<Ionicons name="cloud-offline-outline" size={19} color="#946200" />
						</View>

						<View style={styles.offlineTextBox}>
							<Text style={styles.offlineTitle}>Funciona mesmo sem internet</Text>
							<Text style={styles.offlineDescription}>
								Se o envio falhar por conexão ou servidor, a leitura será salva no celular como pendente.
							</Text>
						</View>
					</View>
				</ScrollView>

				<View style={styles.footer}>
					<Pressable
						onPress={handleSave}
						disabled={isSaving || !isValueValid}
						style={({ pressed }) => [
							styles.saveButton,
							(!isValueValid || isSaving) && styles.saveButtonDisabled,
							pressed && isValueValid && !isSaving && styles.pressed,
						]}
					>
						{isSaving ? (
							<ActivityIndicator size="small" color="#FFFFFF" />
						) : (
							<Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
						)}

						<Text style={styles.saveButtonText}>
							{isSaving ? "Salvando..." : "Salvar horímetro"}
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
		paddingBottom: 110,
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
		fontSize: 12,
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

	currentBox: {
		marginTop: 14,
		borderRadius: 18,
		padding: 13,
		backgroundColor: "rgba(37,99,235,0.08)",
		borderWidth: 1,
		borderColor: "rgba(37,99,235,0.13)",
	},

	currentLabel: {
		color: "rgba(15,23,42,0.48)",
		fontSize: 10,
		fontWeight: "900",
		textTransform: "uppercase",
		letterSpacing: 0.25,
	},

	currentValue: {
		marginTop: 4,
		color: "#1D4ED8",
		fontSize: 23,
		fontWeight: "900",
		letterSpacing: -0.6,
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

	inputBlock: {
		marginTop: 15,
	},

	inputLabel: {
		marginBottom: 7,
		color: "rgba(15,23,42,0.56)",
		fontSize: 11,
		fontWeight: "900",
		textTransform: "uppercase",
		letterSpacing: 0.3,
	},

	inputShell: {
		minHeight: 50,
		borderRadius: 18,
		backgroundColor: "rgba(15,23,42,0.035)",
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.08)",
		paddingHorizontal: 13,
		flexDirection: "row",
		alignItems: "center",
		gap: 9,
	},

	inputShellSuccess: {
		backgroundColor: "rgba(22,101,52,0.06)",
		borderColor: "rgba(22,101,52,0.22)",
	},

	inputShellError: {
		backgroundColor: "rgba(180,35,24,0.055)",
		borderColor: "rgba(180,35,24,0.22)",
	},

	input: {
		flex: 1,
		color: "#0F172A",
		fontSize: 17,
		fontWeight: "900",
		paddingVertical: 10,
	},

	inputSuffix: {
		color: "rgba(15,23,42,0.42)",
		fontSize: 13,
		fontWeight: "900",
	},

	inputError: {
		marginTop: 7,
		color: "#B42318",
		fontSize: 11,
		fontWeight: "800",
		lineHeight: 15,
	},

	inputHint: {
		marginTop: 7,
		color: Colors.primary[800],
		fontSize: 11,
		fontWeight: "800",
		lineHeight: 15,
	},

	notesShell: {
		minHeight: 92,
		alignItems: "flex-start",
		paddingTop: 5,
	},

	notesInput: {
		minHeight: 76,
		fontSize: 13,
		fontWeight: "700",
		lineHeight: 18,
	},

	offlineCard: {
		marginTop: 14,
		backgroundColor: "rgba(255,247,237,0.98)",
		borderRadius: 22,
		padding: 13,
		borderWidth: 1,
		borderColor: "rgba(148,98,0,0.18)",
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
	},

	offlineIconBox: {
		width: 38,
		height: 38,
		borderRadius: 15,
		backgroundColor: "rgba(148,98,0,0.12)",
		alignItems: "center",
		justifyContent: "center",
	},

	offlineTextBox: {
		flex: 1,
	},

	offlineTitle: {
		color: "#946200",
		fontSize: 12,
		fontWeight: "900",
	},

	offlineDescription: {
		marginTop: 2,
		color: "rgba(15,23,42,0.52)",
		fontSize: 10.5,
		fontWeight: "700",
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

export default MachineHourmeterFormScreen;