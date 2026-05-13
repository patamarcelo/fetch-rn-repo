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

const formatDateBR = (value) => {
	if (!value) return "-";

	const date = new Date(value);

	if (Number.isNaN(date.getTime())) return "-";

	return date.toLocaleDateString("pt-BR", {
		day: "2-digit",
		month: "2-digit",
		year: "2-digit",
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

const getPlanStatusTone = (item) => {
	if (item?.is_due) {
		return {
			label: "Vencida",
			bg: "rgba(180,35,24,0.10)",
			border: "rgba(180,35,24,0.20)",
			text: "#B42318",
			icon: "warning-outline",
		};
	}

	const remaining = Number(item?.hours_to_next_revision);

	if (!Number.isNaN(remaining) && remaining <= 50) {
		return {
			label: "Próxima",
			bg: "rgba(148,98,0,0.10)",
			border: "rgba(148,98,0,0.20)",
			text: "#946200",
			icon: "time-outline",
		};
	}

	return {
		label: "Em dia",
		bg: "rgba(22,101,52,0.09)",
		border: "rgba(22,101,52,0.16)",
		text: Colors.primary[800],
		icon: "checkmark-circle-outline",
	};
};

const PlanOptionCard = ({ item, selected, onPress }) => {
	const tone = getPlanStatusTone(item);

	return (
		<Pressable
			onPress={onPress}
			style={({ pressed }) => [
				styles.planOption,
				selected && styles.planOptionSelected,
				pressed && styles.pressed,
			]}
		>
			<View style={styles.planOptionHeader}>
				<View
					style={[
						styles.planOptionIconBox,
						selected && styles.planOptionIconBoxSelected,
					]}
				>
					<Ionicons
						name={selected ? "checkmark-circle" : "construct-outline"}
						size={19}
						color={selected ? Colors.primary[800] : "rgba(15,23,42,0.48)"}
					/>
				</View>

				<View style={styles.planOptionTextBox}>
					<Text style={styles.planOptionTitle} numberOfLines={1}>
						{item?.plan_name || "Plano de revisão"}
					</Text>

					<Text style={styles.planOptionSubtitle}>
						Intervalo de {formatHour(item?.interval_hours)} h
					</Text>
				</View>

				<View
					style={[
						styles.planBadge,
						{
							backgroundColor: tone.bg,
							borderColor: tone.border,
						},
					]}
				>
					<Ionicons name={tone.icon} size={12} color={tone.text} />
					<Text style={[styles.planBadgeText, { color: tone.text }]}>
						{tone.label}
					</Text>
				</View>
			</View>

			<View style={styles.planMetricsGrid}>
				<View style={styles.planMetricBox}>
					<Text style={styles.planMetricLabel}>Última</Text>
					<Text style={styles.planMetricValue}>
						{formatHour(item?.last_revision_hourmeter)} h
					</Text>
				</View>

				<View style={styles.planMetricBox}>
					<Text style={styles.planMetricLabel}>Próxima</Text>
					<Text style={styles.planMetricValue}>
						{formatHour(item?.next_revision_hourmeter)} h
					</Text>
				</View>

				<View style={styles.planMetricBox}>
					<Text style={styles.planMetricLabel}>Faltam</Text>
					<Text
						style={[
							styles.planMetricValue,
							item?.is_due && styles.planMetricDanger,
						]}
					>
						{formatHour(item?.hours_to_next_revision)} h
					</Text>
				</View>
			</View>

			{item?.last_revision_at ? (
				<View style={styles.planLastDateLine}>
					<Ionicons
						name="calendar-outline"
						size={13}
						color="rgba(15,23,42,0.42)"
					/>
					<Text style={styles.planLastDateText}>
						Última revisão em {formatDateBR(item.last_revision_at)}
					</Text>
				</View>
			) : null}
		</Pressable>
	);
};

const MachineMaintenanceFormScreen = ({ route, navigation }) => {
	const dispatch = useDispatch();
	const machineId = route?.params?.machineId;

	const machine = useSelector((state) =>
		(state?.maquinario?.machines || []).find(
			(item) => String(item?.id) === String(machineId)
		)
	);

	const authUser = useSelector((state) => state?.auth?.user || null);

	const maintenanceSummary = useMemo(() => {
		return Array.isArray(machine?.maintenance_summary)
			? machine.maintenance_summary
			: [];
	}, [machine?.maintenance_summary]);

	const [selectedPlanId, setSelectedPlanId] = useState(
		maintenanceSummary?.[0]?.plan_id || null
	);
	const [hourmeter, setHourmeter] = useState("");
	const [description, setDescription] = useState("");
	const [isSaving, setIsSaving] = useState(false);

	useFocusEffect(
		useCallback(() => {
			StatusBar.setBarStyle("dark-content");

			if (Platform.OS === "android") {
				StatusBar.setBackgroundColor("#D6E3F3");
			}
		}, [])
	);

	const selectedPlan = useMemo(() => {
		return maintenanceSummary.find(
			(item) => String(item?.plan_id) === String(selectedPlanId)
		);
	}, [maintenanceSummary, selectedPlanId]);

	const currentHourmeter = Number(machine?.current_hourmeter || 0);
	const revisionValue = useMemo(() => parseDecimalInput(hourmeter), [hourmeter]);

	const lastRevisionHourmeter =
		selectedPlan?.last_revision_hourmeter === null ||
		selectedPlan?.last_revision_hourmeter === undefined
			? null
			: Number(selectedPlan.last_revision_hourmeter);

	const minimumAllowed =
		lastRevisionHourmeter !== null && !Number.isNaN(lastRevisionHourmeter)
			? lastRevisionHourmeter
			: 0;

	const isValueValid =
		revisionValue !== null &&
		!Number.isNaN(revisionValue) &&
		revisionValue >= minimumAllowed;

	const isBelowCurrent =
		revisionValue !== null &&
		!Number.isNaN(revisionValue) &&
		revisionValue < currentHourmeter;

	const isAboveCurrent =
		revisionValue !== null &&
		!Number.isNaN(revisionValue) &&
		revisionValue > currentHourmeter;

	const machineName =
		machine?.description ||
		machine?.identifier ||
		machine?.machine_type_label ||
		"Máquina";

	const machineLocation = cleanMachineLocation(
		machine?.fazenda_name || machine?.farm_name || machine?.location_name
	);

	const canSave =
		!!machine?.id &&
		!!selectedPlan?.plan_id &&
		isValueValid &&
		!isSaving;

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

	const handleUseCurrentHourmeter = useCallback(() => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		setHourmeter(String(machine?.current_hourmeter || ""));
	}, [machine?.current_hourmeter]);

	const handleSelectPlan = useCallback((planId) => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		setSelectedPlanId(planId);
	}, []);

	const performSave = useCallback(async () => {
		try {
			setIsSaving(true);

			const customClaims =
				authUser?.customClaims ||
				authUser?.claims ||
				authUser?.stsTokenManager?.claims ||
				null;

			const payload = {
				maintenance_plan: selectedPlan?.plan_id,
				hourmeter: revisionValue,
				performed_at: new Date().toISOString(),
				description,
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
				`${LINKMachine}/maquinario/machines/${machine.id}/register_maintenance/`,
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
				let errorMessage = "Não foi possível registrar a revisão.";

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

			Alert.alert(
				"Revisão registrada",
				`${selectedPlan?.plan_name || "Revisão"} registrada com ${formatHour(
					revisionValue
				)} h.`,
				[
					{
						text: "OK",
						onPress: () => navigation.goBack(),
					},
				]
			);
		} catch (error) {
			console.log("Erro ao registrar revisão:", error);

			Alert.alert(
				"Erro ao registrar revisão",
				error?.message || "Não foi possível registrar a revisão."
			);
		} finally {
			setIsSaving(false);
		}
	}, [
		authUser,
		selectedPlan,
		revisionValue,
		description,
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

		if (!selectedPlan?.plan_id) {
			Alert.alert("Selecione a revisão", "Escolha qual revisão foi realizada.");
			return;
		}

		if (revisionValue === null || Number.isNaN(revisionValue)) {
			Alert.alert("Horímetro inválido", "Informe o horímetro da revisão.");
			return;
		}

		if (revisionValue < minimumAllowed) {
			Alert.alert(
				"Horímetro menor que a última revisão",
				`A última revisão desse plano foi registrada com ${formatHour(
					minimumAllowed
				)} h. Informe um valor maior ou igual.`
			);
			return;
		}

		const confirmText = [
			`Máquina: ${machine?.identifier || machineName}`,
			`Revisão: ${selectedPlan?.plan_name}`,
			`Horímetro: ${formatHour(revisionValue)} h`,
		];

		if (isBelowCurrent) {
			confirmText.push(
				"",
				`Atenção: o horímetro informado é menor que o horímetro atual da máquina (${formatHour(
					currentHourmeter
				)} h).`
			);
		}

		if (isAboveCurrent) {
			confirmText.push(
				"",
				`O horímetro informado é maior que o atual no sistema (${formatHour(
					currentHourmeter
				)} h).`
			);
		}

		Alert.alert("Confirmar revisão", confirmText.join("\n"), [
			{
				text: "Cancelar",
				style: "cancel",
			},
			{
				text: "Registrar",
				onPress: performSave,
			},
		]);
	}, [
		machine,
		machineName,
		selectedPlan,
		revisionValue,
		minimumAllowed,
		isBelowCurrent,
		isAboveCurrent,
		currentHourmeter,
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
							<Text style={styles.topTitle}>Registrar revisão</Text>
							<Text style={styles.topSubtitle}>Manutenção realizada</Text>
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

						<View style={styles.currentGrid}>
							<View style={styles.currentBox}>
								<Text style={styles.currentLabel}>Horímetro atual</Text>
								<Text style={styles.currentValue}>
									{formatHour(machine?.current_hourmeter)} h
								</Text>
							</View>

							<View style={styles.currentBox}>
								<Text style={styles.currentLabel}>Próxima geral</Text>
								<Text style={styles.currentValueGreen}>
									{formatHour(machine?.next_revision_hourmeter)} h
								</Text>
							</View>
						</View>
					</View>

					<View style={styles.formCard}>
						<Text style={styles.formTitle}>Qual revisão foi realizada?</Text>
						<Text style={styles.formDescription}>
							Selecione o plano cadastrado para essa máquina e informe o horímetro em que a revisão foi feita.
						</Text>

						{maintenanceSummary.length === 0 ? (
							<View style={styles.emptyBox}>
								<Ionicons
									name="alert-circle-outline"
									size={24}
									color="#946200"
								/>
								<Text style={styles.emptyTitle}>Nenhum plano disponível</Text>
								<Text style={styles.emptyDescription}>
									Os planos de manutenção cadastrados para essa fazenda aparecerão aqui.
								</Text>
							</View>
						) : (
							<View style={styles.plansList}>
								{maintenanceSummary.map((item, index) => (
									<PlanOptionCard
										key={`${item?.plan_id || "plan"}-${index}`}
										item={item}
										selected={String(item?.plan_id) === String(selectedPlanId)}
										onPress={() => handleSelectPlan(item?.plan_id)}
									/>
								))}
							</View>
						)}
					</View>

					<View style={styles.formCard}>
						<Text style={styles.formTitle}>Dados da revisão</Text>

						{selectedPlan ? (
							<View style={styles.selectedPlanBox}>
								<View style={styles.selectedPlanIconBox}>
									<Ionicons
										name="construct-outline"
										size={18}
										color={Colors.primary[800]}
									/>
								</View>

								<View style={styles.selectedPlanTextBox}>
									<Text style={styles.selectedPlanLabel}>Plano selecionado</Text>
									<Text style={styles.selectedPlanTitle} numberOfLines={1}>
										{selectedPlan?.plan_name}
									</Text>
								</View>
							</View>
						) : null}

						<View style={styles.inputBlock}>
							<View style={styles.inputLabelRow}>
								<Text style={styles.inputLabel}>Horímetro da revisão</Text>

								<Pressable
									onPress={handleUseCurrentHourmeter}
									style={({ pressed }) => [
										styles.useCurrentButton,
										pressed && styles.pressed,
									]}
								>
									<Text style={styles.useCurrentButtonText}>Usar atual</Text>
								</Pressable>
							</View>

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
									O valor precisa ser maior ou igual à última revisão deste plano:{" "}
									{formatHour(minimumAllowed)} h.
								</Text>
							) : null}

							{hourmeter && isValueValid && isBelowCurrent ? (
								<Text style={styles.inputWarning}>
									Esse valor está abaixo do horímetro atual da máquina. Use apenas se a revisão já ocorreu anteriormente.
								</Text>
							) : null}

							{hourmeter && isValueValid && isAboveCurrent ? (
								<Text style={styles.inputHint}>
									Esse valor está acima do horímetro atual registrado no sistema.
								</Text>
							) : null}
						</View>

						<View style={styles.inputBlock}>
							<Text style={styles.inputLabel}>Observação / serviço realizado</Text>

							<View style={[styles.inputShell, styles.notesShell]}>
								<TextInput
									value={description}
									onChangeText={setDescription}
									placeholder="Ex: troca de óleo, filtros, lubrificação..."
									placeholderTextColor="rgba(15,23,42,0.34)"
									style={[styles.input, styles.notesInput]}
									multiline
									textAlignVertical="top"
								/>
							</View>
						</View>
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
							{isSaving ? "Registrando..." : "Registrar revisão"}
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

	currentGrid: {
		marginTop: 14,
		flexDirection: "row",
		gap: 9,
	},

	currentBox: {
		flex: 1,
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
		fontSize: 17,
		fontWeight: "900",
		letterSpacing: -0.3,
	},

	currentValueGreen: {
		marginTop: 4,
		color: Colors.primary[800],
		fontSize: 17,
		fontWeight: "900",
		letterSpacing: -0.3,
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

	plansList: {
		marginTop: 14,
		gap: 10,
	},

	planOption: {
		borderRadius: 20,
		padding: 12,
		backgroundColor: "rgba(15,23,42,0.025)",
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.06)",
	},

	planOptionSelected: {
		backgroundColor: "rgba(22,101,52,0.06)",
		borderColor: "rgba(22,101,52,0.25)",
	},

	planOptionHeader: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
	},

	planOptionIconBox: {
		width: 36,
		height: 36,
		borderRadius: 14,
		backgroundColor: "rgba(255,255,255,0.72)",
		alignItems: "center",
		justifyContent: "center",
	},

	planOptionIconBoxSelected: {
		backgroundColor: "rgba(22,101,52,0.10)",
	},

	planOptionTextBox: {
		flex: 1,
		minWidth: 0,
	},

	planOptionTitle: {
		color: "#0F172A",
		fontSize: 13,
		fontWeight: "900",
	},

	planOptionSubtitle: {
		marginTop: 2,
		color: "rgba(15,23,42,0.48)",
		fontSize: 10.5,
		fontWeight: "800",
	},

	planBadge: {
		borderRadius: 999,
		paddingHorizontal: 8,
		paddingVertical: 5,
		borderWidth: 1,
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
	},

	planBadgeText: {
		fontSize: 9.5,
		fontWeight: "900",
	},

	planMetricsGrid: {
		marginTop: 11,
		flexDirection: "row",
		gap: 8,
	},

	planMetricBox: {
		flex: 1,
		borderRadius: 14,
		paddingHorizontal: 9,
		paddingVertical: 8,
		backgroundColor: "rgba(15,23,42,0.035)",
	},

	planMetricLabel: {
		color: "rgba(15,23,42,0.45)",
		fontSize: 9,
		fontWeight: "900",
		textTransform: "uppercase",
		letterSpacing: 0.25,
	},

	planMetricValue: {
		marginTop: 4,
		color: "#0F172A",
		fontSize: 11,
		fontWeight: "900",
	},

	planMetricDanger: {
		color: "#B42318",
	},

	planLastDateLine: {
		marginTop: 10,
		paddingTop: 10,
		borderTopWidth: 1,
		borderTopColor: "rgba(15,23,42,0.06)",
		flexDirection: "row",
		alignItems: "center",
		gap: 5,
	},

	planLastDateText: {
		flex: 1,
		color: "rgba(15,23,42,0.50)",
		fontSize: 10.5,
		fontWeight: "800",
	},

	selectedPlanBox: {
		marginTop: 14,
		borderRadius: 18,
		padding: 12,
		backgroundColor: "rgba(22,101,52,0.07)",
		borderWidth: 1,
		borderColor: "rgba(22,101,52,0.15)",
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
	},

	selectedPlanIconBox: {
		width: 36,
		height: 36,
		borderRadius: 14,
		backgroundColor: "rgba(22,101,52,0.10)",
		alignItems: "center",
		justifyContent: "center",
	},

	selectedPlanTextBox: {
		flex: 1,
		minWidth: 0,
	},

	selectedPlanLabel: {
		color: "rgba(15,23,42,0.46)",
		fontSize: 10,
		fontWeight: "900",
		textTransform: "uppercase",
		letterSpacing: 0.25,
	},

	selectedPlanTitle: {
		marginTop: 2,
		color: "#0F172A",
		fontSize: 13,
		fontWeight: "900",
	},

	inputBlock: {
		marginTop: 15,
	},

	inputLabelRow: {
		marginBottom: 7,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 10,
	},

	inputLabel: {
		color: "rgba(15,23,42,0.56)",
		fontSize: 11,
		fontWeight: "900",
		textTransform: "uppercase",
		letterSpacing: 0.3,
	},

	useCurrentButton: {
		borderRadius: 999,
		paddingHorizontal: 10,
		paddingVertical: 6,
		backgroundColor: "rgba(22,101,52,0.08)",
		borderWidth: 1,
		borderColor: "rgba(22,101,52,0.14)",
	},

	useCurrentButtonText: {
		color: Colors.primary[800],
		fontSize: 10.5,
		fontWeight: "900",
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

	inputWarning: {
		marginTop: 7,
		color: "#946200",
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
		minHeight: 96,
		alignItems: "flex-start",
		paddingTop: 5,
	},

	notesInput: {
		minHeight: 78,
		fontSize: 13,
		fontWeight: "700",
		lineHeight: 18,
	},

	emptyBox: {
		marginTop: 14,
		borderRadius: 20,
		padding: 16,
		backgroundColor: "rgba(255,247,237,0.98)",
		borderWidth: 1,
		borderColor: "rgba(148,98,0,0.18)",
		alignItems: "center",
	},

	emptyTitle: {
		marginTop: 8,
		color: "#946200",
		fontSize: 13,
		fontWeight: "900",
	},

	emptyDescription: {
		marginTop: 4,
		color: "rgba(15,23,42,0.52)",
		fontSize: 11,
		fontWeight: "700",
		lineHeight: 16,
		textAlign: "center",
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

export default MachineMaintenanceFormScreen;