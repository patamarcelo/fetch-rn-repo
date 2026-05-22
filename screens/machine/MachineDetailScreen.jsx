import React, { useCallback, useMemo } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
	View,
	Text,
	StyleSheet,
	Pressable,
	ScrollView,
	Alert,
	StatusBar,
	Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import Ionicons from "@expo/vector-icons/Ionicons";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { Colors } from "../../constants/styles";

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

const getEstimatedDaysFromHours = (hoursToNext, averageHoursPerDay) => {
	if (hoursToNext === null || hoursToNext === undefined || hoursToNext === "") {
		return null;
	}

	const hours = Number(hoursToNext);
	const average = Number(averageHoursPerDay || 0);

	if (Number.isNaN(hours) || hours <= 0) return 0;

	const safeAverage = average > 0 ? average : 10;

	return Math.ceil(hours / safeAverage);
};

const getPredictedDateFromHours = (hoursToNext, averageHoursPerDay) => {
	const days = getEstimatedDaysFromHours(hoursToNext, averageHoursPerDay);

	if (days === null) return null;

	const date = new Date();
	date.setDate(date.getDate() + days);

	return date;
};

const cleanMachineLocation = (value) => {
	const cleaned = String(value || "")
		.replace(/\bProjeto\b\s*[:\-–—]?\s*/gi, "")
		.replace(/\bFazenda\b\s*[:\-–—]?\s*/gi, "")
		.replace(/\s{2,}/g, " ")
		.trim();

	return cleaned || "Não informada";
};

const getStatusConfig = (status) => {
	if (status === "maintenance") {
		return {
			label: "Manutenção",
			bg: "rgba(180,35,24,0.10)",
			border: "rgba(180,35,24,0.18)",
			borderStrong: "rgba(180,35,24,0.42)",
			text: "#B42318",
			icon: "warning-outline",
		};
	}

	if (status === "revision") {
		return {
			label: "Revisão",
			bg: "rgba(255,215,0,0.20)",
			border: "rgba(122,91,0,0.18)",
			borderStrong: "rgba(122,91,0,0.42)",
			text: "#7A5B00",
			icon: "construct-outline",
		};
	}

	return {
		label: "Em operação",
		bg: "rgba(22,101,52,0.10)",
		border: "rgba(22,101,52,0.18)",
		borderStrong: "rgba(22,101,52,0.42)",
		text: Colors.primary[800],
		icon: "checkmark-circle-outline",
	};
};

const getMachineIcon = (machineType, color = Colors.primary[800]) => {
	if (machineType === "tractor") {
		return <FontAwesome5 name="tractor" size={26} color={color} />;
	}

	if (machineType === "sprayer") {
		return <Ionicons name="water-outline" size={28} color={color} />;
	}

	if (machineType === "harvester") {
		return <FontAwesome5 name="truck-monster" size={25} color={color} />;
	}

	return <Ionicons name="construct-outline" size={28} color={color} />;
};

const STAT_TONES = {
	current: {
		iconBg: "rgba(37,99,235,0.12)",
		bg: "rgba(37,99,235,0.08)",
		border: "rgba(37,99,235,0.13)",
		color: "#1D4ED8",
	},
	last: {
		iconBg: "rgba(100,116,139,0.12)",
		bg: "rgba(100,116,139,0.08)",
		border: "rgba(100,116,139,0.13)",
		color: "#475569",
	},
	next: {
		iconBg: "rgba(22,101,52,0.12)",
		bg: "rgba(22,101,52,0.08)",
		border: "rgba(22,101,52,0.13)",
		color: Colors.primary[800],
	},
	days: {
		iconBg: "rgba(122,91,0,0.12)",
		bg: "rgba(122,91,0,0.08)",
		border: "rgba(122,91,0,0.13)",
		color: "#7A5B00",
	},
	warning: {
		iconBg: "rgba(148,98,0,0.12)",
		bg: "rgba(255,251,235,0.94)",
		border: "rgba(148,98,0,0.16)",
		color: "#946200",
	},
	danger: {
		iconBg: "rgba(180,35,24,0.12)",
		bg: "rgba(255,245,245,0.96)",
		border: "rgba(180,35,24,0.16)",
		color: "#B42318",
	},
};

const StatCard = ({ icon, label, value, suffix, tone = "current" }) => {
	const config = STAT_TONES[tone] || STAT_TONES.current;

	return (
		<View
			style={[
				styles.statCard,
				{
					backgroundColor: config.bg,
					borderColor: config.border,
				},
			]}
		>
			<View style={styles.statTopLine}>
				<View
					style={[
						styles.statIconBox,
						{
							backgroundColor: config.iconBg,
						},
					]}
				>
					<Ionicons name={icon} size={16} color={config.color} />
				</View>

				<Text style={styles.statLabel} numberOfLines={1}>
					{label}
				</Text>
			</View>

			<Text style={[styles.statValue, { color: config.color }]} numberOfLines={1}>
				{value}
				{value !== "-" && suffix ? ` ${suffix}` : ""}
			</Text>
		</View>
	);
};

const ActionButton = ({ icon, title, description, onPress, tone = "primary" }) => {
	const isSecondary = tone === "secondary";

	return (
		<Pressable
			onPress={onPress}
			style={({ pressed }) => [
				styles.actionButton,
				isSecondary && styles.actionButtonSecondary,
				pressed && styles.pressed,
			]}
		>
			<View
				style={[
					styles.actionIconBox,
					isSecondary && styles.actionIconBoxSecondary,
				]}
			>
				<Ionicons
					name={icon}
					size={21}
					color={isSecondary ? "#334155" : "#FFFFFF"}
				/>
			</View>

			<View style={styles.actionTextBox}>
				<Text style={styles.actionTitle}>{title}</Text>
				<Text style={styles.actionDescription}>{description}</Text>
			</View>

			<Ionicons name="chevron-forward" size={19} color="rgba(15,23,42,0.35)" />
		</Pressable>
	);
};

const MaintenancePlanCard = ({ item, averageHoursPerDay }) => {
	const isDue = !!item?.is_due;
	const remaining = item?.hours_to_next_revision;

	const estimatedDays = getEstimatedDaysFromHours(remaining, averageHoursPerDay);
	const predictedDate = getPredictedDateFromHours(remaining, averageHoursPerDay);

	return (
		<View style={[styles.planCard, isDue && styles.planCardDue]}>
			<View style={styles.planTopLine}>
				<View>
					<Text style={styles.planTitle} numberOfLines={1}>
						{item?.plan_name || "Plano de revisão"}
					</Text>
					<Text style={styles.planSubtitle}>
						Intervalo de {formatHour(item?.interval_hours)} h
					</Text>
				</View>

				<View style={[styles.planBadge, isDue && styles.planBadgeDue]}>
					<Text style={[styles.planBadgeText, isDue && styles.planBadgeTextDue]}>
						{isDue ? "Vencida" : "Em dia"}
					</Text>
				</View>
			</View>

			<View style={styles.planGrid}>
				<View style={styles.planMetric}>
					<Text style={styles.planMetricLabel}>Última</Text>
					<Text style={styles.planMetricValue}>
						{formatHour(item?.last_revision_hourmeter)} h
					</Text>
				</View>

				<View style={styles.planMetric}>
					<Text style={styles.planMetricLabel}>Próxima</Text>
					<Text style={styles.planMetricValue}>
						{formatHour(item?.next_revision_hourmeter)} h
					</Text>
				</View>

				<View style={styles.planMetric}>
					<Text style={styles.planMetricLabel}>Faltam</Text>
					<Text
						style={[
							styles.planMetricValue,
							isDue && styles.planMetricDanger,
						]}
					>
						{formatHour(remaining)} h
					</Text>
				</View>
			</View>
			<View style={styles.planForecastRow}>
				<View style={styles.planForecastItem}>
					<Ionicons name="calendar-outline" size={13} color="rgba(15,23,42,0.45)" />
					<Text style={styles.planForecastText}>
						Previsão: {predictedDate ? formatDateBR(predictedDate) : "-"}
					</Text>
				</View>

				<View style={styles.planForecastItem}>
					<Ionicons name="time-outline" size={13} color="rgba(15,23,42,0.45)" />
					<Text style={styles.planForecastText}>
						{estimatedDays !== null && estimatedDays !== undefined
							? `${estimatedDays} dias`
							: "Sem estimativa"}
					</Text>
				</View>
			</View>
		</View>
	);
};

const PendingBox = ({ pendingCount, onSync }) => {
	if (!pendingCount) return null;

	return (
		<View style={styles.pendingBox}>
			<View style={styles.pendingIconBox}>
				<Ionicons name="cloud-upload-outline" size={19} color="#946200" />
			</View>

			<View style={styles.pendingTextBox}>
				<Text style={styles.pendingTitle}>
					{pendingCount} leitura{pendingCount === 1 ? "" : "s"} pendente
					{pendingCount === 1 ? "" : "s"}
				</Text>
				<Text style={styles.pendingDescription}>
					Salva no celular. Será sincronizada quando houver conexão.
				</Text>
			</View>

			<Pressable onPress={onSync} style={styles.pendingSyncButton}>
				<Text style={styles.pendingSyncText}>Sincronizar</Text>
			</Pressable>
		</View>
	);
};

const MachineDetailScreen = ({ route, navigation }) => {
	const machineId = route?.params?.machineId;

	const machine = useSelector((state) =>
		(state?.maquinario?.machines || []).find(
			(item) => String(item?.id) === String(machineId)
		)
	);

	const pendingReadings = useSelector(
		(state) => state?.maquinario?.pendingHourmeterReadings || []
	);

	const machinePendingReadings = useMemo(() => {
		return pendingReadings.filter(
			(item) =>
				String(item?.machineId) === String(machineId) &&
				item?.status === "pending"
		);
	}, [pendingReadings, machineId]);

	const statusConfig = getStatusConfig(machine?.status);

	const statusObservation = String(
		machine?.last_status_change?.notes || ""
	).trim();

	const shouldShowStatusObservation =
		statusObservation && ["maintenance", "revision"].includes(machine?.status);


	useFocusEffect(
		useCallback(() => {
			StatusBar.setBarStyle("dark-content");

			if (Platform.OS === "android") {
				StatusBar.setBackgroundColor("#D6E3F3");
			}
		}, [])
	);

	const machineName =
		machine?.description ||
		machine?.identifier ||
		machine?.machine_type_label ||
		"Máquina";

	const machineLocation = cleanMachineLocation(
		machine?.fazenda_name || machine?.farm_name || machine?.location_name
	);

	const nextDue = machine?.next_due_maintenance;


	const nextDueEstimatedDays =
		machine?.estimated_days_to_next_revision ??
		getEstimatedDaysFromHours(
			nextDue?.hours_to_next_revision,
			machine?.average_hours_per_day
		);

	const nextDuePredictedDate =
		nextDueEstimatedDays !== null && nextDueEstimatedDays !== undefined
			? (() => {
				const date = new Date();
				date.setDate(date.getDate() + Number(nextDueEstimatedDays || 0));
				return date;
			})()
			: null;

	const maintenanceSummary = Array.isArray(machine?.maintenance_summary)
		? machine.maintenance_summary
		: [];

	const handleBack = useCallback(() => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
		if (navigation?.canGoBack?.()) {
			navigation.goBack();
			return;
		}

		navigation?.navigate?.("MachineryScreen");
	}, [navigation]);

	const handleOpenHourmeterForm = useCallback(() => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
		navigation.navigate("MachineHourmeterFormScreen", {
			machineId: machine?.id,
		});
	}, [navigation, machine?.id]);

	const handleOpenMaintenanceForm = useCallback(() => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
		navigation.navigate("MachineMaintenanceFormScreen", {
			machineId: machine?.id,
		});
	}, [navigation, machine?.id]);

	const handleSyncPending = useCallback(() => {
		Alert.alert(
			"Sincronizar pendências",
			"Próximo passo: chamar a thunk que tenta reenviar as leituras pendentes desta máquina."
		);
	}, []);

	if (!machine) {
		return (
			<View style={styles.root}>
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
			</View>
		);
	}

	return (
		<SafeAreaView style={styles.root} edges={["top"]}>
			<StatusBar barStyle="dark-content" backgroundColor="#D6E3F3" />
			<ScrollView
				showsVerticalScrollIndicator={false}
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
						<Text style={styles.topTitle}>Detalhes da máquina</Text>
						<Text style={styles.topSubtitle}>Horímetro e revisões</Text>
					</View>
				</View>

				<View style={[
					styles.heroCard,
					{
						borderColor: statusConfig.borderStrong || statusConfig.text,
					},
				]}>
					<View style={styles.heroTopLine}>
						<View style={styles.iconheader}>
							<View style={styles.machineBigIconBox}>
								{getMachineIcon(machine.machine_type)}

							</View>
							<Text style={styles.machineCode}>
								{machine?.identifier || "Sem código"}
							</Text>
						</View>

						<View
							style={[
								styles.statusBadge,
								{
									backgroundColor: statusConfig.bg,
									borderColor: statusConfig.border,
								},
							]}
						>
							<Ionicons
								name={statusConfig.icon}
								size={14}
								color={statusConfig.text}
							/>
							<Text
								style={[
									styles.statusBadgeText,
									{
										color: statusConfig.text,
									},
								]}
							>
								{machine?.status_label || statusConfig.label}
							</Text>
						</View>
					</View>



					<Text style={styles.machineName} numberOfLines={1}>
						{machineName}
					</Text>

					<View style={styles.locationBlock}>
						<View style={styles.locationInfo}>
							<Ionicons
								name="location-outline"
								size={14}
								color="rgba(15,23,42,0.46)"
							/>

							<Text style={styles.locationText} numberOfLines={1}>
								{machineLocation}
							</Text>
						</View>

						<Pressable
							onPress={() => {
								Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
								navigation.navigate("MachineTransferFarmScreen", {
									machineId: machine?.id,
								});
							}}
							style={({ pressed }) => [
								styles.transferFarmButton,
								pressed && styles.pressed,
							]}
						>
							<Ionicons
								name="swap-horizontal-outline"
								size={14}
								color={Colors.primary[800]}
							/>
							<Text style={styles.transferFarmText}>Transferir fazenda</Text>
						</Pressable>
					</View>
					{shouldShowStatusObservation ? (
						<View
							style={[
								styles.statusObservationBox,
								{
									backgroundColor: statusConfig.bg,
									borderColor: statusConfig.border,
								},
							]}
						>
							<View style={styles.statusObservationHeader}>
								<Ionicons
									name="document-text-outline"
									size={14}
									color={statusConfig.text}
								/>
								<Text
									style={[
										styles.statusObservationLabel,
										{
											color: statusConfig.text,
										},
									]}
								>
									Observação do status
								</Text>
							</View>

							<Text style={styles.statusObservationText}>
								{statusObservation}
							</Text>
						</View>
					) : null}

				</View>

				<PendingBox
					pendingCount={machinePendingReadings.length}
					onSync={handleSyncPending}
				/>

				<View style={styles.statsGrid}>
					<StatCard
						icon="speedometer-outline"
						label="Horímetro atual"
						value={formatHour(machine?.current_hourmeter)}
						suffix="h"
						tone="current"
					/>

					<StatCard
						icon="checkmark-done-outline"
						label="Última revisão"
						value={formatHour(machine?.last_revision_hourmeter)}
						suffix="h"
						tone="last"
					/>

					<StatCard
						icon="construct-outline"
						label="Próxima revisão"
						value={formatHour(machine?.next_revision_hourmeter)}
						suffix="h"
						tone="next"
					/>

					<StatCard
						icon="timer-outline"
						label="Horas restantes"
						value={formatHour(machine?.hours_to_next_revision)}
						suffix="h"
						tone={
							Number(machine?.hours_to_next_revision) <= 0
								? "danger"
								: Number(machine?.hours_to_next_revision) <= 50
									? "warning"
									: "days"
						}
					/>
				</View>

				<View style={styles.nextRevisionCard}>
					<View style={styles.nextRevisionHeader}>
						<View style={styles.nextRevisionIconBox}>
							<Ionicons
								name="construct-outline"
								size={20}
								color={Colors.primary[800]}
							/>
						</View>

						<View style={styles.nextRevisionHeaderText}>
							<Text style={styles.nextRevisionLabel}>Manutenção mais próxima</Text>
							<Text style={styles.nextRevisionTitle} numberOfLines={1}>
								{nextDue?.plan_name || "Nenhuma revisão calculada"}
							</Text>
						</View>
					</View>

					<View style={styles.nextRevisionMetaGrid}>
						<View style={[styles.nextRevisionMetaItem, styles.nextRevisionMetaItemLarge]}>
							<Text style={styles.nextRevisionMetaLabel}>Horímetro Prev.</Text>
							<Text style={styles.nextRevisionMetaValue}>
								{formatHour(nextDue?.next_revision_hourmeter)} h
							</Text>
						</View>

						<View style={[styles.nextRevisionMetaItem, styles.nextRevisionMetaItemMedium]}>
							<Text style={styles.nextRevisionMetaLabel}>Previsão</Text>
							<Text style={styles.nextRevisionMetaValue}>
								{nextDuePredictedDate ? formatDateBR(nextDuePredictedDate) : "-"}
							</Text>
						</View>

						<View style={[styles.nextRevisionMetaItem, styles.nextRevisionMetaItemSmall]}>
							<Text style={styles.nextRevisionMetaLabel}>Estimativa</Text>
							<Text style={styles.nextRevisionMetaValue}>
								{nextDueEstimatedDays !== null && nextDueEstimatedDays !== undefined
									? `${nextDueEstimatedDays} Dias`
									: "-"}
							</Text>
						</View>
					</View>
				</View>

				<View style={styles.actionsBlock}>
					<Text style={styles.blockTitle}>Ações rápidas</Text>

					<ActionButton
						icon="speedometer-outline"
						title="Atualizar horímetro"
						description="Registrar nova leitura da máquina"
						onPress={handleOpenHourmeterForm}
					/>

					<ActionButton
						icon="construct-outline"
						title="Registrar revisão"
						description="Informar revisão 300h, 600h ou outro plano"
						onPress={handleOpenMaintenanceForm}
						tone="secondary"
					/>
					<ActionButton
						icon="swap-horizontal-outline"
						title="Alterar status"
						description="Operação, revisão ou manutenção"
						tone="warning"
						onPress={() => {
							Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
							navigation.navigate("MachineStatusFormScreen", {
								machineId: machine?.id,
							});
						}}
					/>
				</View>

				<View style={styles.block}>
					<View style={styles.blockHeader}>
						<View>
							<Text style={styles.blockTitle}>Planos de manutenção</Text>
							<Text style={styles.blockSubtitle}>
								Baseado nas revisões cadastradas
							</Text>
						</View>

						<Text style={styles.blockCounter}>
							{maintenanceSummary.length}
						</Text>
					</View>

					{maintenanceSummary.length === 0 ? (
						<View style={styles.emptyMiniCard}>
							<Text style={styles.emptyMiniTitle}>Nenhum plano encontrado</Text>
							<Text style={styles.emptyMiniDescription}>
								Os planos cadastrados para essa fazenda aparecerão aqui.
							</Text>
						</View>
					) : (
						maintenanceSummary.map((item, index) => (
							<MaintenancePlanCard
								key={`${item?.plan_id || "plan"}-${index}`}
								item={item}
								averageHoursPerDay={machine?.average_hours_per_day}
							/>
						))
					)}
				</View>

				<View style={styles.block}>
					<View style={styles.blockHeader}>
						<View>
							<Text style={styles.blockTitle}>Histórico</Text>
							<Text style={styles.blockSubtitle}>
								Leituras e revisões recentes
							</Text>
						</View>
					</View>

					<View style={styles.historyGrid}>
						<Pressable
							onPress={() => {
								Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
								navigation.navigate("MachineReadingsHistoryScreen", {
									machineId: machine?.id,
								});
							}}
							style={({ pressed }) => [
								styles.historyCard,
								pressed && styles.pressed,
							]}
						>
							<View style={styles.historyIconBox}>
								<Ionicons name="speedometer-outline" size={18} color="#1D4ED8" />
							</View>
							<Text style={styles.historyTitle}>Leituras</Text>
							<Text style={styles.historyDescription}>
								Ver histórico de horímetro
							</Text>
						</Pressable>

						<Pressable
							onPress={() => {
								Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
								navigation.navigate("MachineMaintenanceHistoryScreen", {
									machineId: machine?.id,
								});
							}}
							style={({ pressed }) => [
								styles.historyCard,
								pressed && styles.pressed,
							]}
						>
							<View style={styles.historyIconBox}>
								<Ionicons name="construct-outline" size={18} color={Colors.primary[800]} />
							</View>
							<Text style={styles.historyTitle}>Revisões</Text>
							<Text style={styles.historyDescription}>
								Ver manutenções realizadas
							</Text>
						</Pressable>
					</View>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	root: {
		flex: 1,
		backgroundColor: Colors.secondary[100],
	},

	scrollContent: {
		paddingHorizontal: 16,
		paddingTop: 10,
		paddingBottom: 34,
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

	heroCard: {
		position: "relative",
		overflow: "hidden",
		backgroundColor: "#FFFFFF",
		borderRadius: 28,
		padding: 18,
		borderWidth: 1.8,
		borderColor: "rgba(15,23,42,0.08)",
		shadowColor: "#000",
		shadowOpacity: 0.08,
		shadowRadius: 18,
		shadowOffset: { width: 0, height: 10 },
		elevation: 3,
	},

	heroGlow: {
		position: "absolute",
		right: -40,
		top: -50,
		width: 160,
		height: 160,
		borderRadius: 999,
		backgroundColor: "rgba(22,101,52,0.10)",
	},

	heroTopLine: {
		flexDirection: "row",
		alignItems: "flex-start",
		justifyContent: "space-between",
	},

	machineBigIconBox: {
		width: 58,
		height: 58,
		borderRadius: 21,
		backgroundColor: "rgba(15,23,42,0.045)",
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.06)",
	},

	statusBadge: {
		borderRadius: 999,
		paddingHorizontal: 10,
		paddingVertical: 7,
		borderWidth: 1,
		flexDirection: "row",
		alignItems: "center",
		gap: 5,
	},

	statusBadgeText: {
		fontSize: 10,
		fontWeight: "900",
	},

	machineCode: {
		marginTop: 16,
		color: Colors.primary[800],
		fontSize: 12,
		fontWeight: "900",
		letterSpacing: 0.5,
		textTransform: "uppercase",
	},

	machineName: {
		marginTop: 4,
		color: "#0F172A",
		fontSize: 16,
		fontWeight: "900",
		textAlign: 'center',
		lineHeight: 27,
		letterSpacing: -0.7,
	},

	locationBlock: {
		marginTop: 12,
		width: "100%",
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 10,
	},

	locationInfo: {
		flex: 1,
		minWidth: 0,
		minHeight: 34,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "flex-start",
		gap: 5,
		paddingTop: 10,
	},

	locationText: {
		flex: 1,
		color: "rgba(15,23,42,0.48)",
		fontSize: 12,
		fontWeight: "800",
		textAlign: "left",
		lineHeight: 16,
	},

	transferFarmButton: {
		flexShrink: 0,
		minHeight: 34,
		borderRadius: 999,
		paddingHorizontal: 10,
		paddingVertical: 7,
		backgroundColor: "rgba(22,101,52,0.08)",
		borderWidth: 1,
		borderColor: "rgba(22,101,52,0.14)",
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 5,
	},

	pendingBox: {
		marginTop: 12,
		backgroundColor: "rgba(255,247,237,0.98)",
		borderRadius: 20,
		padding: 12,
		borderWidth: 1,
		borderColor: "rgba(148,98,0,0.18)",
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
	},

	pendingIconBox: {
		width: 38,
		height: 38,
		borderRadius: 15,
		backgroundColor: "rgba(148,98,0,0.12)",
		alignItems: "center",
		justifyContent: "center",
	},

	pendingTextBox: {
		flex: 1,
	},

	pendingTitle: {
		color: "#946200",
		fontSize: 12,
		fontWeight: "900",
	},

	pendingDescription: {
		marginTop: 2,
		color: "rgba(15,23,42,0.52)",
		fontSize: 10.5,
		fontWeight: "700",
		lineHeight: 15,
	},

	pendingSyncButton: {
		borderRadius: 999,
		paddingHorizontal: 10,
		paddingVertical: 7,
		backgroundColor: "rgba(148,98,0,0.12)",
	},

	pendingSyncText: {
		color: "#946200",
		fontSize: 10,
		fontWeight: "900",
	},

	statsGrid: {
		marginTop: 12,
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
	},

	statCard: {
		width: "48%",
		borderRadius: 18,
		padding: 12,
		borderWidth: 1,
		shadowColor: "#000",
		shadowOpacity: 0.04,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 5 },
		elevation: 1,
	},

	statCardPrimary: {
		borderColor: "rgba(22,101,52,0.16)",
		backgroundColor: "rgba(255,255,255,0.96)",
	},

	statCardWarning: {
		borderColor: "rgba(148,98,0,0.16)",
		backgroundColor: "rgba(255,251,235,0.94)",
	},

	statCardDanger: {
		borderColor: "rgba(180,35,24,0.16)",
		backgroundColor: "rgba(255,245,245,0.96)",
	},

	statTopLine: {
		flexDirection: "row",
		alignItems: "center",
		gap: 7,
	},

	statIconBox: {
		width: 26,
		height: 26,
		borderRadius: 10,
		alignItems: "center",
		justifyContent: "center",
	},

	statLabel: {
		flex: 1,
		color: "rgba(15,23,42,0.48)",
		fontSize: 10,
		fontWeight: "900",
		textTransform: "uppercase",
		letterSpacing: 0.25,
	},

	statValue: {
		marginTop: 9,
		fontSize: 17,
		fontWeight: "900",
		letterSpacing: -0.3,
	},

	nextRevisionCard: {
		marginTop: 12,
		backgroundColor: "#FFFFFF",
		borderRadius: 22,
		padding: 14,
		borderWidth: 1,
		borderColor: "rgba(22,101,52,0.13)",
		shadowColor: "#000",
		shadowOpacity: 0.05,
		shadowRadius: 12,
		shadowOffset: { width: 0, height: 7 },
		elevation: 2,
	},

	nextRevisionHeader: {
		flexDirection: "row",
		alignItems: "center",
		gap: 11,
	},

	nextRevisionIconBox: {
		width: 42,
		height: 42,
		borderRadius: 16,
		backgroundColor: "rgba(22,101,52,0.10)",
		alignItems: "center",
		justifyContent: "center",
	},

	nextRevisionHeaderText: {
		flex: 1,
		minWidth: 0,
	},

	nextRevisionLabel: {
		color: "rgba(15,23,42,0.45)",
		fontSize: 10,
		fontWeight: "900",
		textTransform: "uppercase",
		letterSpacing: 0.35,
	},

	nextRevisionTitle: {
		marginTop: 3,
		color: "#0F172A",
		fontSize: 14,
		fontWeight: "900",
	},

	nextRevisionMetaGrid: {
		marginTop: 12,
		flexDirection: "row",
		gap: 7,
	},

	nextRevisionMetaItem: {
		minHeight: 54,
		borderRadius: 13,
		paddingHorizontal: 8,
		paddingVertical: 8,
		backgroundColor: "rgba(15,23,42,0.035)",
		justifyContent: "center",
	},

	nextRevisionMetaItemLarge: {
		flex: 1.35,
	},

	nextRevisionMetaItemMedium: {
		flex: 1,
	},

	nextRevisionMetaItemSmall: {
		flex: 0.75,
	},

	nextRevisionMetaLabel: {
		color: "rgba(15,23,42,0.42)",
		fontSize: 8.5,
		fontWeight: "900",
		textTransform: "uppercase",
		letterSpacing: 0.25,
	},

	nextRevisionMetaValue: {
		marginTop: 4,
		color: "#0F172A",
		fontSize: 11,
		fontWeight: "900",
	},

	actionsBlock: {
		marginTop: 18,
	},

	block: {
		marginTop: 20,
	},

	blockHeader: {
		marginBottom: 10,
		flexDirection: "row",
		alignItems: "flex-end",
		justifyContent: "space-between",
		gap: 12,
	},

	blockTitle: {
		color: "#0F172A",
		fontSize: 15,
		fontWeight: "900",
		letterSpacing: -0.2,
	},

	blockSubtitle: {
		marginTop: 2,
		color: "rgba(15,23,42,0.48)",
		fontSize: 11,
		fontWeight: "800",
	},

	blockCounter: {
		color: "rgba(15,23,42,0.45)",
		fontSize: 12,
		fontWeight: "900",
	},

	actionButton: {
		marginTop: 10,
		backgroundColor: "#FFFFFF",
		borderRadius: 22,
		padding: 13,
		borderWidth: 1,
		borderColor: "rgba(22,101,52,0.13)",
		flexDirection: "row",
		alignItems: "center",
		gap: 11,
		shadowColor: "#000",
		shadowOpacity: 0.05,
		shadowRadius: 12,
		shadowOffset: { width: 0, height: 7 },
		elevation: 2,
	},

	actionButtonSecondary: {
		borderColor: "rgba(15,23,42,0.08)",
	},

	actionIconBox: {
		width: 44,
		height: 44,
		borderRadius: 16,
		backgroundColor: Colors.primary[800],
		alignItems: "center",
		justifyContent: "center",
	},

	actionIconBoxSecondary: {
		backgroundColor: "rgba(15,23,42,0.07)",
	},

	actionTextBox: {
		flex: 1,
	},

	actionTitle: {
		color: "#0F172A",
		fontSize: 14,
		fontWeight: "900",
	},

	actionDescription: {
		marginTop: 2,
		color: "rgba(15,23,42,0.50)",
		fontSize: 11,
		fontWeight: "700",
		lineHeight: 15,
	},

	planCard: {
		backgroundColor: "rgba(255,255,255,0.92)",
		borderRadius: 20,
		padding: 13,
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.07)",
		marginBottom: 10,
	},

	planCardDue: {
		borderColor: "rgba(180,35,24,0.16)",
		backgroundColor: "rgba(255,245,245,0.96)",
	},

	planTopLine: {
		flexDirection: "row",
		alignItems: "flex-start",
		justifyContent: "space-between",
		gap: 10,
	},

	planTitle: {
		color: "#0F172A",
		fontSize: 13,
		fontWeight: "900",
		maxWidth: 210,
	},

	planSubtitle: {
		marginTop: 2,
		color: "rgba(15,23,42,0.48)",
		fontSize: 10.5,
		fontWeight: "800",
	},

	planBadge: {
		borderRadius: 999,
		paddingHorizontal: 9,
		paddingVertical: 5,
		backgroundColor: "rgba(22,101,52,0.09)",
	},

	planBadgeDue: {
		backgroundColor: "rgba(180,35,24,0.10)",
	},

	planBadgeText: {
		color: Colors.primary[800],
		fontSize: 10,
		fontWeight: "900",
	},

	planBadgeTextDue: {
		color: "#B42318",
	},

	planGrid: {
		marginTop: 12,
		flexDirection: "row",
		gap: 8,
	},

	planMetric: {
		flex: 1,
		borderRadius: 14,
		paddingHorizontal: 9,
		paddingVertical: 8,
		backgroundColor: "rgba(15,23,42,0.035)",
	},

	planMetricLabel: {
		color: "rgba(15,23,42,0.45)",
		fontSize: 9.5,
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

	emptyMiniCard: {
		backgroundColor: "rgba(255,255,255,0.75)",
		borderRadius: 20,
		padding: 16,
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.07)",
	},

	emptyMiniTitle: {
		color: "#0F172A",
		fontSize: 13,
		fontWeight: "900",
	},

	emptyMiniDescription: {
		marginTop: 4,
		color: "rgba(15,23,42,0.52)",
		fontSize: 11,
		fontWeight: "700",
		lineHeight: 16,
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
	iconheader: {
		flexDirection: 'row',
		gap: 10
	},
	transferFarmButton: {
		marginTop: 12,
		alignSelf: "flex-start",
		borderRadius: 999,
		paddingHorizontal: 11,
		paddingVertical: 8,
		backgroundColor: "rgba(22,101,52,0.08)",
		borderWidth: 1,
		borderColor: "rgba(22,101,52,0.14)",
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
	},

	transferFarmText: {
		color: Colors.primary[800],
		fontSize: 11,
		fontWeight: "900",
	},

	nextRevisionMetaGrid: {
		marginTop: 10,
		flexDirection: "row",
		gap: 7,
	},

	nextRevisionMetaItem: {
		flex: 1,
		borderRadius: 13,
		paddingHorizontal: 8,
		paddingVertical: 7,
		backgroundColor: "rgba(15,23,42,0.035)",
	},

	nextRevisionMetaLabel: {
		color: "rgba(15,23,42,0.42)",
		fontSize: 8.5,
		fontWeight: "900",
		textTransform: "uppercase",
		letterSpacing: 0.25,
	},

	nextRevisionMetaValue: {
		marginTop: 3,
		color: "#0F172A",
		fontSize: 10.5,
		fontWeight: "900",
	},

	planForecastRow: {
		marginTop: 10,
		paddingTop: 10,
		borderTopWidth: 1,
		borderTopColor: "rgba(15,23,42,0.06)",
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 8,
	},

	planForecastItem: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		gap: 5,
	},

	planForecastText: {
		flex: 1,
		color: "rgba(15,23,42,0.52)",
		fontSize: 10,
		fontWeight: "800",
	},

	historyGrid: {
		flexDirection: "row",
		gap: 10,
	},

	historyCard: {
		flex: 1,
		backgroundColor: "rgba(255,255,255,0.90)",
		borderRadius: 20,
		padding: 13,
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.07)",
		shadowColor: "#000",
		shadowOpacity: 0.04,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 5 },
		elevation: 1,
	},

	historyIconBox: {
		width: 36,
		height: 36,
		borderRadius: 14,
		backgroundColor: "rgba(15,23,42,0.045)",
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 10,
	},

	historyTitle: {
		color: "#0F172A",
		fontSize: 13,
		fontWeight: "900",
	},

	historyDescription: {
		marginTop: 3,
		color: "rgba(15,23,42,0.50)",
		fontSize: 10.5,
		fontWeight: "700",
		lineHeight: 15,
	},
	statusObservationBox: {
		marginTop: 14,
		borderRadius: 18,
		paddingHorizontal: 12,
		paddingVertical: 11,
		borderWidth: 1,
	},

	statusObservationHeader: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		marginBottom: 5,
	},

	statusObservationLabel: {
		fontSize: 10,
		fontWeight: "900",
		textTransform: "uppercase",
		letterSpacing: 0.3,
	},

	statusObservationText: {
		color: "rgba(15,23,42,0.68)",
		fontSize: 12,
		fontWeight: "700",
		lineHeight: 17,
	},
});

export default MachineDetailScreen;