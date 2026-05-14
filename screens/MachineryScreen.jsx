import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	View,
	Text,
	StyleSheet,
	Pressable,
	ScrollView,
	RefreshControl,
	TextInput,
	ActivityIndicator,
	Alert,
	StatusBar,
	Platform
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import Ionicons from "@expo/vector-icons/Ionicons";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { Colors } from "../constants/styles";

import {
	fetchMachines,
	maquinarioActions,
	syncPendingHourmeterReadings,
} from "../store/redux/maquinario";


import {
	selectMachines,
	selectMachinesError,
	selectMachinesFilters,
	selectMachinesSearch,
	selectMachinesStatus,
} from "../store/redux/maquinarioSelectors";


import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { LINKMachine } from "../utils/api";

import * as Haptics from "expo-haptics";


import {
	applyMachineAdvancedFilters,
	sortMachinesByFilters,
	getAdvancedFiltersCount,
} from "../store/redux/maquinarioFilterHelpers";


import * as Clipboard from "expo-clipboard";


const STATUS_CONFIG = {
	operation: {
		label: "Em operação",
		icon: "checkmark-circle-outline",
		bg: "rgba(22,101,52,0.10)",
		border: "rgba(22,101,52,0.22)",
		borderStrong: "rgba(22,101,52,0.52)",
		text: Colors.primary[800],
		dot: Colors.primary[800],
		cardBorder: "rgba(22,101,52,0.20)",
		cardBg: "#FFFFFF",
	},
	revision: {
		label: "Revisão",
		icon: "construct-outline",
		bg: "rgba(255,215,0,0.18)",
		border: "rgba(122,91,0,0.20)",
		borderStrong: "rgba(122,91,0,0.44)",
		text: "#7A5B00",
		dot: "#B7791F",
		cardBorder: "rgba(122,91,0,0.22)",
		cardBg: "#FFFFFF",
	},
	maintenance: {
		label: "Manutenção",
		icon: "warning-outline",
		bg: "rgba(180,35,24,0.10)",
		border: "rgba(180,35,24,0.20)",
		borderStrong: "rgba(180,35,24,0.44)",
		text: "#B42318",
		dot: "#B42318",
		cardBorder: "rgba(180,35,24,0.22)",
		cardBg: "#FFFFFF",
	},
	all: {
		label: "Todos",
		icon: "grid-outline",
		bg: "rgba(22,101,52,0.08)",
		border: "rgba(22,101,52,0.16)",
		borderStrong: "rgba(22,101,52,0.52)",
		text: Colors.primary[800],
		dot: Colors.primary[800],
		cardBorder: "rgba(15,23,42,0.08)",
		cardBg: "#FFFFFF",
	},
};

const METRIC_TONES = {
	current: {
		icon: "speedometer-outline",
		bg: "rgba(37,99,235,0.08)",
		border: "rgba(37,99,235,0.13)",
		iconBg: "rgba(37,99,235,0.12)",
		color: "#1D4ED8",
	},
	last: {
		icon: "checkmark-done-outline",
		bg: "rgba(100,116,139,0.08)",
		border: "rgba(100,116,139,0.13)",
		iconBg: "rgba(100,116,139,0.12)",
		color: "#475569",
	},
	next: {
		icon: "construct-outline",
		bg: "rgba(22,101,52,0.08)",
		border: "rgba(22,101,52,0.13)",
		iconBg: "rgba(22,101,52,0.12)",
		color: Colors.primary[800],
	},
	days: {
		icon: "calendar-outline",
		bg: "rgba(122,91,0,0.08)",
		border: "rgba(122,91,0,0.13)",
		iconBg: "rgba(122,91,0,0.12)",
		color: "#7A5B00",
	},
};

const formatHour = (value) => {
	if (value === null || value === undefined || value === "") {
		return "-";
	}

	const numberValue = Number(value);

	if (Number.isNaN(numberValue)) {
		return "-";
	}

	return numberValue.toLocaleString("pt-BR", {
		minimumFractionDigits: numberValue % 1 === 0 ? 0 : 1,
		maximumFractionDigits: 1,
	});
};


const getPendingReadingsSummary = (pendingReadings) => {
	const pending = Array.isArray(pendingReadings)
		? pendingReadings.filter((item) => item?.status === "pending" || item?.status === "failed")
		: [];

	const failed = pending.filter((item) => item?.status === "failed");
	const onlyPending = pending.filter((item) => item?.status !== "failed");

	const machinesMap = new Map();

	pending.forEach((item) => {
		if (!item?.machineId) return;

		machinesMap.set(String(item.machineId), {
			machineId: item.machineId,
			machineIdentifier: item.machineIdentifier,
			machineDescription: item.machineDescription,
		});
	});

	return {
		total: pending.length,
		pendingTotal: onlyPending.length,
		failedTotal: failed.length,
		machinesTotal: machinesMap.size,
		first: pending[0] || null,
	};
};

const getMachinePendingReadings = (pendingReadings, machineId) => {
	if (!Array.isArray(pendingReadings)) return [];

	return pendingReadings.filter(
		(item) =>
			String(item?.machineId) === String(machineId) &&
			(item?.status === "pending" || item?.status === "failed")
	);
};

const normalizeSearch = (value) =>
	String(value || "")
		.trim()
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "");

const getMachineSearchText = (machine) => {
	return normalizeSearch(
		[
			machine?.identifier,
			machine?.description,
			machine?.chassis,
			machine?.brand,
			machine?.model_name,
			machine?.machine_type_label,
			machine?.status_label,
			machine?.status,
			machine?.fazenda_name,
			machine?.next_due_maintenance?.plan_name,
			machine?.current_hourmeter,
			machine?.last_revision_hourmeter,
			machine?.next_revision_hourmeter,
		]
			.filter(Boolean)
			.join(" ")
	);
};


const buildHourmeterWhatsappTemplate = (machines = []) => {
	if (!Array.isArray(machines) || machines.length === 0) {
		return "";
	}

	const lines = machines
		.map((machine) => {
			const code = String(
				machine?.identifier ||
				machine?.description ||
				"Máquina sem código"
			).trim();

			return `${code} - `;
		})
		.filter(Boolean)
		.join("\n");

	return `HORIMETRO\n\n${lines}`;
};


const blobToBase64 = (blob) => {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();

		reader.onloadend = () => {
			const result = reader.result;

			if (!result || typeof result !== "string") {
				reject(new Error("Não foi possível converter o arquivo."));
				return;
			}

			const base64 = result.split(",")[1];

			if (!base64) {
				reject(new Error("Arquivo inválido."));
				return;
			}

			resolve(base64);
		};

		reader.onerror = () => {
			reject(new Error("Erro ao ler o arquivo exportado."));
		};

		reader.readAsDataURL(blob);
	});
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
		return <FontAwesome5 name="tractor" size={22} color={color} />;
	}

	if (machineType === "sprayer") {
		return <Ionicons name="water-outline" size={24} color={color} />;
	}

	if (machineType === "harvester") {
		return <FontAwesome5 name="truck-monster" size={21} color={color} />;
	}

	return <Ionicons name="construct-outline" size={24} color={color} />;
};

const getStatusConfig = (status) => {
	return STATUS_CONFIG[status] || STATUS_CONFIG.operation;
};

const getMaintenanceSortValue = (machine) => {
	const value =
		machine?.next_due_maintenance?.hours_to_next_revision ??
		machine?.hours_to_next_revision;

	if (value === null || value === undefined || value === "") {
		return Number.POSITIVE_INFINITY;
	}

	const numberValue = Number(value);

	if (Number.isNaN(numberValue)) {
		return Number.POSITIVE_INFINITY;
	}

	return numberValue;
};

const getStatusSortValue = (status) => {
	if (status === "maintenance") return 1;
	if (status === "revision") return 2;
	if (status === "operation") return 3;
	return 4;
};

const getMachineNameSortValue = (machine) => {
	return String(machine?.identifier || machine?.description || "").toLowerCase();
};

const getRevisionTone = (machine) => {
	const nextDue = machine?.next_due_maintenance;
	const isDue = !!nextDue?.is_due;
	const remaining = Number(
		nextDue?.hours_to_next_revision ?? machine?.hours_to_next_revision ?? 0
	);

	if (isDue || remaining <= 0) {
		return {
			label: "Revisão vencida",
			style: styles.revisionDangerText,
			fillStyle: styles.progressFillDanger,
		};
	}

	if (remaining <= 50) {
		return {
			label: "Atenção próxima",
			style: styles.revisionWarningText,
			fillStyle: styles.progressFillWarning,
		};
	}

	return {
		label: "Dentro do prazo",
		style: styles.revisionOkText,
		fillStyle: styles.progressFillOk,
	};
};

const getProgressPercent = (machine) => {
	const current = Number(machine?.current_hourmeter || 0);
	const last = Number(machine?.last_revision_hourmeter || 0);
	const next = Number(machine?.next_revision_hourmeter || 0);

	if (!current || !next || next <= last) {
		return 0;
	}

	const progress = ((current - last) / (next - last)) * 100;

	return Math.max(0, Math.min(Math.round(progress), 100));
};

const TopBar = ({
	onBack,
	onExport,
	onCopyHourmeterTemplate,
	isExportDisabled,
	isExporting,
	isCopyDisabled,
}) => {
	return (
		<View style={styles.topBar}>
			<Pressable
				onPress={onBack}
				hitSlop={10}
				style={({ pressed }) => [
					styles.topIconButton,
					pressed && styles.pressed,
				]}
			>
				<Ionicons name="chevron-back" size={23} color="#0F172A" />
			</Pressable>

			<View style={styles.topTitleBox}>
				<Text style={styles.topTitle}>Máquinas</Text>
				<Text style={styles.topSubtitle}>Gerenciamento das Máquinas</Text>
			</View>

			<View style={styles.topActions}>
				<Pressable
					onPress={onExport}
					disabled={isExportDisabled || isExporting}
					style={({ pressed }) => [
						styles.exportButton,
						isExportDisabled && styles.exportButtonDisabled,
						pressed && !isExportDisabled && styles.pressed,
					]}
				>
					{isExporting ? (
						<ActivityIndicator size="small" color={Colors.primary[800]} />
					) : (
						<Ionicons
							name="download-outline"
							size={17}
							color={isExportDisabled ? "rgba(15,23,42,0.35)" : Colors.primary[800]}
						/>
					)}

					<Text
						style={[
							styles.exportButtonText,
							isExportDisabled && styles.exportButtonTextDisabled,
						]}
					>
						{isExporting ? "Gerando" : "Excel"}
					</Text>
				</Pressable>
				<Pressable
					onPress={onCopyHourmeterTemplate}
					disabled={isCopyDisabled}
					style={({ pressed }) => [
						styles.whatsappTopButton,
						isCopyDisabled && styles.exportButtonDisabled,
						pressed && !isCopyDisabled && styles.pressed,
					]}
				>
					<Ionicons
						name="logo-whatsapp"
						size={17}
						color={isCopyDisabled ? "rgba(15,23,42,0.35)" : Colors.primary[800]}
					/>

					<Text
						style={[
							styles.exportButtonText,
							isCopyDisabled && styles.exportButtonTextDisabled,
						]}
					>
						Zap
					</Text>
				</Pressable>
			</View>
		</View>
	);
};

const MetricItem = ({ label, value, suffix, tone = "current" }) => {
	const config = METRIC_TONES[tone] || METRIC_TONES.current;

	return (
		<View
			style={[
				styles.metricBox,
				{
					backgroundColor: config.bg,
					borderColor: config.border,
				},
			]}
		>
			<View style={styles.metricTopLine}>
				<View
					style={[
						styles.metricIconBox,
						{
							backgroundColor: config.iconBg,
						},
					]}
				>
					<Ionicons name={config.icon} size={14} color={config.color} />
				</View>

				<Text style={styles.metricLabel} numberOfLines={1}>
					{label}
				</Text>
			</View>

			<Text
				style={[
					styles.metricValue,
					{
						color: config.color,
					},
				]}
				numberOfLines={1}
			>
				{value}
				{value !== "-" && suffix ? ` ${suffix}` : ""}
			</Text>
		</View>
	);
};

const SummaryCard = ({ label, value, selected, type, onPress }) => {
	const config = STATUS_CONFIG[type] || STATUS_CONFIG.all;

	return (
		<Pressable
			onPress={onPress}
			style={({ pressed }) => [
				styles.summaryCard,
				{
					backgroundColor: selected ? config.text : "rgba(255,255,255,0.86)",
					borderColor: selected ? config.text : "rgba(15,23,42,0.08)",
				},
				pressed && styles.pressed,
			]}
		>
			<View style={styles.summaryTopLine}>
				<View
					style={[
						styles.summaryIconBox,
						{
							backgroundColor: selected
								? "rgba(255,255,255,0.22)"
								: config.bg,
						},
					]}
				>
					<Ionicons
						name={config.icon}
						size={17}
						color={selected ? "#FFFFFF" : config.text}
					/>
				</View>

				<Text
					style={[
						styles.summaryValue,
						{
							color: selected ? "#FFFFFF" : "#0F172A",
						},
					]}
				>
					{value}
				</Text>
			</View>

			<Text
				style={[
					styles.summaryLabel,
					{
						color: selected ? "rgba(255,255,255,0.82)" : "rgba(15,23,42,0.52)",
					},
				]}
				numberOfLines={1}
			>
				{label}
			</Text>
		</Pressable>
	);
};

const SearchBox = ({ value, onChangeText, onClear }) => {
	return (
		<View style={styles.searchBox}>
			<Ionicons name="search-outline" size={18} color="rgba(15,23,42,0.45)" />

			<TextInput
				value={value}
				onChangeText={onChangeText}
				placeholder="Buscar código, nome, chassi, fazenda..."
				placeholderTextColor="rgba(15,23,42,0.38)"
				style={styles.searchInput}
				autoCorrect={false}
				autoCapitalize="none"
				returnKeyType="search"
				clearButtonMode="never"
			/>

			{value ? (
				<Pressable onPress={onClear} hitSlop={10} style={styles.clearSearchButton}>
					<Ionicons name="close-circle" size={19} color="rgba(15,23,42,0.42)" />
				</Pressable>
			) : null}
		</View>
	);
};

const RevisionProgress = ({ machine }) => {
	const progress = getProgressPercent(machine);
	const tone = getRevisionTone(machine);
	const nextDue = machine?.next_due_maintenance;
	const remaining =
		nextDue?.hours_to_next_revision ?? machine?.hours_to_next_revision ?? null;

	return (
		<View style={styles.progressBlock}>
			<View style={styles.progressHeader}>
				<Text style={styles.progressLabel}>Progresso até revisão</Text>
				<Text style={[styles.progressStatus, tone.style]}>{tone.label}</Text>
			</View>

			<View style={styles.progressTrack}>
				<View
					style={[
						styles.progressFill,
						tone.fillStyle,
						{ width: `${progress}%` },
					]}
				/>
			</View>

			<View style={styles.progressFooter}>
				<Text style={styles.progressPercent}>{progress}% utilizado</Text>
				<Text style={styles.progressRemaining}>
					Faltam {formatHour(remaining)} h
				</Text>
			</View>
		</View>
	);
};

const MaintenanceMiniSummary = ({ machine }) => {
	const summary = Array.isArray(machine?.maintenance_summary)
		? machine.maintenance_summary
		: [];

	if (summary.length === 0) {
		return null;
	}

	return (
		<View style={styles.maintenanceMiniBlock}>
			{summary.slice(0, 2).map((item, index) => (
				<View
					key={`${item?.plan_id || item?.plan_name || "plan"}-${index}`}
					style={styles.maintenanceMiniItem}
				>
					<Text style={styles.maintenanceMiniTitle} numberOfLines={1}>
						{item.plan_name || "Plano de revisão"}
					</Text>
					<Text style={styles.maintenanceMiniValue} numberOfLines={1}>
						Próx. {formatHour(item.next_revision_hourmeter)} h
					</Text>
				</View>
			))}
		</View>
	);
};


const PendingSyncSummaryCard = ({ summary, onPress, isSyncing }) => {
	if (!summary?.total) return null;

	const hasFailed = summary.failedTotal > 0;

	return (
		<View
			style={[
				styles.pendingSyncCard,
				hasFailed && styles.pendingSyncCardFailed,
			]}
		>
			<View
				style={[
					styles.pendingSyncIconBox,
					hasFailed && styles.pendingSyncIconBoxFailed,
				]}
			>
				<Ionicons
					name={hasFailed ? "alert-circle-outline" : "cloud-upload-outline"}
					size={22}
					color={hasFailed ? "#B42318" : "#946200"}
				/>
			</View>

			<View style={styles.pendingSyncTextBox}>
				<Text
					style={[
						styles.pendingSyncTitle,
						hasFailed && styles.pendingSyncTitleFailed,
					]}
				>
					{hasFailed
						? `${summary.failedTotal} pendência${summary.failedTotal === 1 ? "" : "s"} com falha`
						: `${summary.total} leitura${summary.total === 1 ? "" : "s"} pendente${summary.total === 1 ? "" : "s"}`}
				</Text>

				<Text style={styles.pendingSyncDescription}>
					{summary.machinesTotal} máquina{summary.machinesTotal === 1 ? "" : "s"} aguardando sincronização.
				</Text>
			</View>

			<Pressable
				onPress={onPress}
				disabled={isSyncing}
				style={({ pressed }) => [
					styles.pendingSyncButton,
					hasFailed && styles.pendingSyncButtonFailed,
					isSyncing && styles.pendingSyncButtonDisabled,
					pressed && !isSyncing && styles.pressed,
				]}
			>
				{isSyncing ? (
					<ActivityIndicator
						size="small"
						color={hasFailed ? "#B42318" : "#946200"}
					/>
				) : (
					<Text
						style={[
							styles.pendingSyncButtonText,
							hasFailed && styles.pendingSyncButtonTextFailed,
						]}
					>
						Sincronizar
					</Text>
				)}
			</Pressable>
		</View>
	);
};


const MachineCard = ({ machine, pendingReadings = [], onPress }) => {
	const statusConfig = getStatusConfig(machine.status);
	const nextDue = machine?.next_due_maintenance;
	const planName = nextDue?.plan_name || "Próxima revisão";

	const machineName =
		machine?.description ||
		machine?.identifier ||
		machine?.machine_type_label ||
		"Máquina";

	const machineLocation = cleanMachineLocation(
		machine?.fazenda_name ||
		machine?.farm_name ||
		machine?.location_name
	);

	const hasPendingReadings = pendingReadings.length > 0;
	const failedReadings = pendingReadings.filter((item) => item?.status === "failed");
	const hasFailedReadings = failedReadings.length > 0;

	const latestPendingReading = pendingReadings[pendingReadings.length - 1];

	return (
		<Pressable
			onPress={onPress}
			style={({ pressed }) => [
				styles.machineCard,
				{
					borderColor: statusConfig.cardBorder,
					backgroundColor: statusConfig.cardBg,
				},
				pressed && styles.pressed,
			]}
		>
			<View style={styles.machineHeader}>
				<View style={styles.machineHeaderTop}>
					<View style={styles.machineIconBox}>
						{getMachineIcon(machine.machine_type)}
					</View>

					<View style={styles.machineMetaBox}>
						<View style={styles.machineMetaLine}>
							<Text style={styles.machineCode} numberOfLines={1}>
								{machine.identifier || "Sem código"}
							</Text>

						</View>
						<View style={styles.farmLine}>
							<Text style={styles.machineType} numberOfLines={1}>
								{machine.machine_type_label || "Máquina"}
							</Text>
						</View>
						<View style={styles.farmLine}>
							<Ionicons
								name="location-outline"
								size={12}
								color="rgba(15,23,42,0.42)"
							/>
							<Text style={styles.farmText} numberOfLines={1}>
								{machineLocation}
							</Text>
						</View>
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
						<View
							style={[
								styles.statusDot,
								{
									backgroundColor: statusConfig.dot,
								},
							]}
						/>
						<Text
							style={[
								styles.statusText,
								{
									color: statusConfig.text,
								},
							]}
							numberOfLines={1}
						>
							{machine.status_label || statusConfig.label}
						</Text>
					</View>
				</View>

				<View style={styles.machineTitleFullBox}>
					<Text style={styles.machineName} numberOfLines={2}>
						{machineName}
					</Text>
				</View>
			</View>

			{hasPendingReadings ? (
				<View
					style={[
						styles.machinePendingBox,
						hasFailedReadings && styles.machinePendingBoxFailed,
					]}
				>
					<View
						style={[
							styles.machinePendingIconBox,
							hasFailedReadings && styles.machinePendingIconBoxFailed,
						]}
					>
						<Ionicons
							name={hasFailedReadings ? "alert-circle-outline" : "cloud-upload-outline"}
							size={15}
							color={hasFailedReadings ? "#B42318" : "#946200"}
						/>
					</View>

					<View style={styles.machinePendingTextBox}>
						<Text
							style={[
								styles.machinePendingTitle,
								hasFailedReadings && styles.machinePendingTitleFailed,
							]}
							numberOfLines={1}
						>
							{hasFailedReadings
								? "Falha ao sincronizar leitura"
								: `${pendingReadings.length} leitura${pendingReadings.length === 1 ? "" : "s"} pendente${pendingReadings.length === 1 ? "" : "s"}`}
						</Text>

						<Text style={styles.machinePendingDescription} numberOfLines={1}>
							Pendente: {formatHour(latestPendingReading?.value)} h
						</Text>
					</View>
				</View>
			) : null}

			<View style={styles.nextDueBox}>
				<View style={styles.nextDueIconBox}>
					<Ionicons name="construct-outline" size={17} color={Colors.primary[800]} />
				</View>

				<View style={styles.nextDueTextBox}>
					<Text style={styles.nextDueLabel}>Manutenção mais próxima</Text>
					<Text style={styles.nextDueTitle} numberOfLines={1}>
						{planName}
					</Text>
				</View>

				<View style={styles.nextDueRight}>
					<Text style={styles.nextDueHour} numberOfLines={1}>
						{formatHour(machine.next_revision_hourmeter)} h
					</Text>
					<Text style={styles.nextDueRemaining} numberOfLines={1}>
						Faltam {formatHour(machine.hours_to_next_revision)} h
					</Text>
				</View>
			</View>

			<View style={styles.metricsGrid}>
				<MetricItem
					label="Atual"
					value={formatHour(machine.current_hourmeter)}
					suffix="h"
					tone="current"
				/>

				<MetricItem
					label="Última revisão"
					value={formatHour(machine.last_revision_hourmeter)}
					suffix="h"
					tone="last"
				/>

				<MetricItem
					label="Próxima revisão"
					value={formatHour(machine.next_revision_hourmeter)}
					suffix="h"
					tone="next"
				/>

				<MetricItem
					label="Estimativa"
					value={
						machine.estimated_days_to_next_revision
							? String(machine.estimated_days_to_next_revision)
							: "-"
					}
					suffix="dias"
					tone="days"
				/>
			</View>

			<MaintenanceMiniSummary machine={machine} />

			<RevisionProgress machine={machine} />

			<View style={styles.cardFooter}>
				<View style={styles.footerLeft}>
					<Ionicons name="time-outline" size={15} color="rgba(15,23,42,0.46)" />
					<Text style={styles.cardFooterText}>Histórico, leituras e revisões</Text>
				</View>

				<Ionicons name="chevron-forward" size={18} color="rgba(15,23,42,0.44)" />
			</View>
		</Pressable>
	);
};

const FirstLoadingState = () => {
	return (
		<View style={styles.firstLoadingCard}>
			<ActivityIndicator size="small" color={Colors.primary[700]} />
			<Text style={styles.firstLoadingTitle}>Carregando maquinário</Text>
			<Text style={styles.firstLoadingDescription}>
				Buscando os dados da API. Depois disso, a lista fica salva no celular.
			</Text>
		</View>
	);
};

const EmptyState = ({ isFiltering }) => {
	return (
		<View style={styles.emptyCard}>
			<View style={styles.emptyIconBox}>
				<FontAwesome5 name="tractor" size={24} color={Colors.primary[800]} />
			</View>

			<Text style={styles.emptyTitle}>
				{isFiltering ? "Nenhum resultado encontrado" : "Nenhuma máquina encontrada"}
			</Text>

			<Text style={styles.emptyDescription}>
				{isFiltering
					? "Tente buscar por outro código, nome, chassi, fazenda ou status."
					: "Assim que as máquinas forem carregadas pela API, elas aparecerão nesta lista."}
			</Text>
		</View>
	);
};

const ErrorBox = ({ message, onRetry, hasCachedData }) => {
	if (!message) return null;

	return (
		<View style={styles.errorBox}>
			<View style={styles.errorIconBox}>
				<Ionicons name="alert-circle-outline" size={18} color="#B42318" />
			</View>

			<View style={styles.errorTextBox}>
				<Text style={styles.errorTitle}>
					{hasCachedData ? "Usando dados salvos" : "Não foi possível carregar"}
				</Text>
				<Text style={styles.errorMessage} numberOfLines={2}>
					{message}
				</Text>
			</View>

			<Pressable onPress={onRetry} style={styles.retryButton}>
				<Text style={styles.retryButtonText}>Tentar</Text>
			</Pressable>
		</View>
	);
};

const MachineryScreen = ({ navigation }) => {
	const dispatch = useDispatch();

	const scrollViewRef = useRef(null);
	const [showScrollTop, setShowScrollTop] = useState(false);
	const [isExporting, setIsExporting] = useState(false);
	const [isSyncingPending, setIsSyncingPending] = useState(false);

	const allMachines = useSelector(selectMachines);
	const status = useSelector(selectMachinesStatus);
	const error = useSelector(selectMachinesError);
	const search = useSelector(selectMachinesSearch);
	const filters = useSelector(selectMachinesFilters);

	const authUser = useSelector((state) => state?.auth?.user || null);

	const pendingHourmeterReadings = useSelector(
		(state) => state?.maquinario?.pendingHourmeterReadings || []
	);

	const selectedStatus = filters?.status?.[0] || null;
	const isLoading = status === "pending";
	const hasCachedData = Array.isArray(allMachines) && allMachines.length > 0;
	const showFirstLoading = isLoading && !hasCachedData;

	const hasSearch = !!normalizeSearch(search);
	const hasStatusFilter = !!selectedStatus;
	const isFiltering = hasSearch || hasStatusFilter;

	useFocusEffect(
		useCallback(() => {
			StatusBar.setBarStyle("dark-content");

			if (Platform.OS === "android") {
				StatusBar.setBackgroundColor("#D6E3F3");
			}
		}, [])
	);

	const machines = useMemo(() => {
		let filtered = applyMachineAdvancedFilters({
			machines: allMachines,
			search,
			selectedStatus,
			filters,
		});

		return sortMachinesByFilters(filtered, filters);
	}, [allMachines, search, selectedStatus, filters]);



	const summary = useMemo(() => {
		const base = applyMachineAdvancedFilters({
			machines: allMachines,
			search,
			selectedStatus: null,
			filters,
		});

		return {
			total: base.length,
			operation: base.filter((machine) => machine.status === "operation").length,
			revision: base.filter((machine) => machine.status === "revision").length,
			maintenance: base.filter((machine) => machine.status === "maintenance").length,
		};
	}, [allMachines, search, filters]);




	const pendingSummary = useMemo(() => {
		return getPendingReadingsSummary(pendingHourmeterReadings);
	}, [pendingHourmeterReadings]);


	const advancedFiltersCount = useMemo(() => {
		return getAdvancedFiltersCount(filters);
	}, [filters]);

	const handleOpenFilters = useCallback(() => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

		navigation.navigate("MachineFiltersScreen");
	}, [navigation]);


	const handleSyncPendingReadings = useCallback(async () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

		if (!pendingSummary?.total) {
			Alert.alert(
				"Nenhuma pendência",
				"Não existem leituras pendentes para sincronizar."
			);
			return;
		}

		if (isSyncingPending) return;

		try {
			setIsSyncingPending(true);

			const result = await dispatch(syncPendingHourmeterReadings()).unwrap();

			if (!result?.total) {
				Alert.alert(
					"Nenhuma pendência",
					"Não existem leituras pendentes para sincronizar."
				);
				return;
			}

			if (result.failed > 0 && result.success > 0) {
				Alert.alert(
					"Sincronização parcial",
					`${result.success} leitura${result.success === 1 ? "" : "s"} sincronizada${result.success === 1 ? "" : "s"}.\n${result.failed} leitura${result.failed === 1 ? "" : "s"} continua${result.failed === 1 ? "" : "m"} pendente${result.failed === 1 ? "" : "s"}.`
				);
				return;
			}

			if (result.failed > 0) {
				Alert.alert(
					"Não foi possível sincronizar",
					`${result.failed} leitura${result.failed === 1 ? "" : "s"} continua${result.failed === 1 ? "" : "m"} pendente${result.failed === 1 ? "" : "s"}. Verifique a conexão ou os valores informados.`
				);
				return;
			}

			Alert.alert(
				"Sincronização concluída",
				`${result.success} leitura${result.success === 1 ? "" : "s"} sincronizada${result.success === 1 ? "" : "s"} com sucesso.`
			);
		} catch (error) {
			Alert.alert(
				"Erro ao sincronizar",
				error?.message || "Não foi possível sincronizar as leituras pendentes."
			);
		} finally {
			setIsSyncingPending(false);
		}
	}, [dispatch, pendingSummary, isSyncingPending]);


	const loadMachines = useCallback(() => {
		dispatch(fetchMachines());
	}, [dispatch]);


	useEffect(() => {
		loadMachines();
	}, [loadMachines]);

	const handleSearchChange = useCallback(
		(value) => {
			const nextValue = value || "";

			dispatch(maquinarioActions.setMachineSearch(nextValue));
			dispatch(
				maquinarioActions.setMachineFilters({
					search: nextValue,
				})
			);
		},
		[dispatch]
	);

	const handleClearSearch = useCallback(() => {
		dispatch(maquinarioActions.setMachineSearch(""));
		dispatch(
			maquinarioActions.setMachineFilters({
				search: "",
			})
		);
	}, [dispatch]);

	const handleSelectStatus = useCallback(
		(value) => {
			if (!value || selectedStatus === value) {
				dispatch(maquinarioActions.setMachineStatusFilter(null));
				return;
			}

			dispatch(maquinarioActions.setMachineStatusFilter(value));
		},
		[dispatch, selectedStatus]
	);

	const handleOpenMachine = useCallback(
		(machine) => {
			navigation.navigate("MachineDetailScreen", {
				machineId: machine.id,
			});
		},
		[navigation]
	);

	const handleBack = useCallback(() => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

		const parentNavigation = navigation.getParent?.();

		parentNavigation?.navigate("HomeTabs");
	}, [navigation]);


	const handleScroll = useCallback((event) => {
		const offsetY = event?.nativeEvent?.contentOffset?.y || 0;
		const shouldShow = offsetY > 360;

		setShowScrollTop((current) => {
			if (current === shouldShow) return current;
			return shouldShow;
		});
	}, []);

	const handleScrollTop = useCallback(() => {
		scrollViewRef.current?.scrollTo({
			y: 0,
			animated: true,
		});
	}, []);


	const handleCopyHourmeterTemplate = useCallback(async () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

		if (!machines.length) {
			Alert.alert(
				"Nenhuma máquina",
				"Não existem máquinas na lista atual para gerar o modelo."
			);
			return;
		}

		const text = buildHourmeterWhatsappTemplate(machines);

		if (machines.length > 40) {
			Alert.alert(
				"Lista grande",
				`Você está copiando ${machines.length} máquinas. Deseja continuar?`,
				[
					{
						text: "Cancelar",
						style: "cancel",
					},
					{
						text: "Copiar",
						onPress: async () => {
							await Clipboard.setStringAsync(text);

							Alert.alert(
								"Modelo copiado",
								`Copiamos ${machines.length} máquina${machines.length === 1 ? "" : "s"} no padrão para colar no WhatsApp.`
							);
						},
					},
				]
			);

			return;
		}

		await Clipboard.setStringAsync(text);

		Alert.alert(
			"Modelo copiado",
			`Copiamos ${machines.length} máquina${machines.length === 1 ? "" : "s"} no padrão para colar no WhatsApp.`
		);
	}, [machines]);



	const handleExportMachines = useCallback(async () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
		if (isExporting) return;

		setIsExporting(true);
		try {
			const customClaims =
				authUser?.customClaims ||
				authUser?.claims ||
				authUser?.stsTokenManager?.claims ||
				null;

			const payload = {
				fazenda_id: filters?.fazendaId || null,
				status: filters?.status || [],
				machine_type: filters?.machineType || [],
				search: filters?.search || "",
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
				`${LINKMachine}/maquinario/machines/export_excel/`,
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
				const errorText = await response.text();
				throw new Error(errorText || "Erro ao exportar relatório de máquinas.");
			}

			const blob = await response.blob();
			const base64 = await blobToBase64(blob);

			const fileUri = `${FileSystem.documentDirectory}relatorio_maquinas.xlsx`;

			await FileSystem.writeAsStringAsync(fileUri, base64, {
				encoding: FileSystem.EncodingType.Base64,
			});

			const canShare = await Sharing.isAvailableAsync();

			if (!canShare) {
				Alert.alert(
					"Relatório exportado",
					"O arquivo foi gerado, mas o compartilhamento não está disponível neste dispositivo."
				);
				return;
			}

			await Sharing.shareAsync(fileUri, {
				mimeType:
					"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
				dialogTitle: "Exportar relatório de máquinas",
				UTI: "org.openxmlformats.spreadsheetml.sheet",
			});
		} catch (error) {
			console.log("Erro ao exportar máquinas:", error);

			Alert.alert(
				"Erro ao exportar",
				error?.message || "Não foi possível gerar o relatório Excel."
			);
		} finally {
			setIsExporting(false);
		}
	}, [authUser, filters]);

	return (
		<SafeAreaView style={styles.root} edges={["top"]}>
			<StatusBar barStyle="dark-content" backgroundColor="#D6E3F3" />
			<ScrollView
				ref={scrollViewRef}
				showsVerticalScrollIndicator={false}
				contentContainerStyle={styles.scrollContent}
				keyboardShouldPersistTaps="handled"
				stickyHeaderIndices={[4]}
				onScroll={handleScroll}
				scrollEventThrottle={16}
				refreshControl={
					<RefreshControl
						refreshing={isLoading && hasCachedData}
						onRefresh={loadMachines}
						colors={[Colors.primary[700]]}
						tintColor={Colors.primary[700]}
						titleColor={Colors.primary[700]}
						progressBackgroundColor="#FFFFFF"
					/>
				}
			>
				<TopBar
					onBack={handleBack}
					onExport={handleExportMachines}
					onCopyHourmeterTemplate={handleCopyHourmeterTemplate}
					isExportDisabled={machines.length === 0}
					isExporting={isExporting}
					isCopyDisabled={machines.length === 0}
				/>

				<View style={styles.headerCard}>
					<View style={styles.headerIconBox}>
						<FontAwesome5 name="tractor" size={24} color={Colors.primary[800]} />
					</View>

					<View style={styles.headerContent}>
						<View style={styles.headerTitleLine}>
							<Text style={styles.title}>Maquinário</Text>

							{isLoading && hasCachedData ? (
								<View style={styles.syncPill}>
									<ActivityIndicator size="small" color={Colors.primary[700]} />
									<Text style={styles.syncPillText}>Atualizando</Text>
								</View>
							) : null}
						</View>

						<Text style={styles.description}>
							Horímetro, revisões e status operacional das máquinas da fazenda.
						</Text>
					</View>
				</View>

				<View>
					<PendingSyncSummaryCard
						summary={pendingSummary}
						onPress={handleSyncPendingReadings}
						isSyncing={isSyncingPending}
					/>
				</View>

				<View style={styles.summaryBlock}>
					<View style={styles.summaryRow}>
						<SummaryCard
							label="Todos"
							value={summary.total}
							type="all"
							selected={!selectedStatus}
							onPress={() => {
								Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
								handleSelectStatus(null)
							}
							}
						/>

						<SummaryCard
							label="Operação"
							value={summary.operation}
							type="operation"
							selected={selectedStatus === "operation"}
							onPress={() => {
								Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
								handleSelectStatus("operation")
							}
							}
						/>

						<SummaryCard
							label="Revisão"
							value={summary.revision}
							type="revision"
							selected={selectedStatus === "revision"}
							onPress={() => {
								Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
								handleSelectStatus("revision")
							}

							}
						/>

						<SummaryCard
							label="Manut."
							value={summary.maintenance}
							type="maintenance"
							selected={selectedStatus === "maintenance"}
							onPress={() => {
								Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
								handleSelectStatus("maintenance")
							}
							}
						/>
					</View>
				</View>

				<View style={styles.stickySearch}>
					<View style={styles.searchAndFilterRow}>
						<View style={styles.searchFlex}>
							<SearchBox
								value={search}
								onChangeText={handleSearchChange}
								onClear={handleClearSearch}
							/>
						</View>

						<Pressable
							onPress={handleOpenFilters}
							style={({ pressed }) => [
								styles.filterButton,
								advancedFiltersCount > 0 && styles.filterButtonActive,
								pressed && styles.pressed,
							]}
						>
							<Ionicons
								name="options-outline"
								size={20}
								color={advancedFiltersCount > 0 ? "#FFFFFF" : Colors.primary[800]}
							/>

							{advancedFiltersCount > 0 ? (
								<View style={styles.filterCountBadge}>
									<Text style={styles.filterCountText}>{advancedFiltersCount}</Text>
								</View>
							) : null}
						</Pressable>
					</View>
					{advancedFiltersCount > 0 ? (
						<View style={styles.activeFiltersHint}>
							<Ionicons name="filter-outline" size={13} color={Colors.primary[800]} />
							<Text style={styles.activeFiltersHintText}>
								{advancedFiltersCount} filtro{advancedFiltersCount === 1 ? "" : "s"} aplicado{advancedFiltersCount === 1 ? "" : "s"}
							</Text>
						</View>
					) : null}
				</View>

				<ErrorBox
					message={error}
					onRetry={loadMachines}
					hasCachedData={hasCachedData}
				/>

				<View style={styles.sectionHeader}>
					<View style={styles.sectionTitleBox}>
						<Text style={styles.sectionTitle}>Máquinas cadastradas</Text>
						<Text style={styles.sectionDescription}>Fazenda Benção de Deus</Text>
					</View>

					<Text style={styles.sectionSubtitle}>
						{machines.length} equipamento{machines.length === 1 ? "" : "s"}
					</Text>
				</View>

				{showFirstLoading ? (
					<FirstLoadingState />
				) : machines.length === 0 ? (
					<EmptyState isFiltering={isFiltering} />
				) : (
					machines.map((machine, index) => (
						<MachineCard
							key={`${machine?.id || machine?.identifier || "machine"}-${index}`}
							machine={machine}
							pendingReadings={getMachinePendingReadings(
								pendingHourmeterReadings,
								machine?.id
							)}
							onPress={() => {
								Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
								handleOpenMachine(machine);
							}}
						/>
					))
				)}
			</ScrollView>
			{showScrollTop ? (
				<Pressable
					onPress={handleScrollTop}
					style={({ pressed }) => [
						styles.scrollTopFab,
						pressed && styles.pressed,
					]}
				>
					<Ionicons name="chevron-up" size={22} color="#FFFFFF" />
				</Pressable>
			) : null}
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	root: {
		flex: 1,
		backgroundColor: "#D6E3F3",
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

	exportButton: {
		height: 42,
		paddingHorizontal: 13,
		borderRadius: 16,
		backgroundColor: "rgba(255,255,255,0.92)",
		borderWidth: 1,
		borderColor: "rgba(22,101,52,0.20)",
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 6,
		shadowColor: "#000",
		shadowOpacity: 0.04,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 5 },
		elevation: 1,
	},

	exportButtonDisabled: {
		borderColor: "rgba(15,23,42,0.07)",
		backgroundColor: "rgba(255,255,255,0.58)",
	},

	exportButtonText: {
		color: Colors.primary[800],
		fontSize: 11,
		fontWeight: "900",
	},

	exportButtonTextDisabled: {
		color: "rgba(15,23,42,0.35)",
	},

	headerCard: {
		backgroundColor: "#FFFFFF",
		borderRadius: 24,
		padding: 15,
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
		marginBottom: 10,
	},

	headerIconBox: {
		width: 50,
		height: 50,
		borderRadius: 18,
		backgroundColor: "rgba(22,101,52,0.10)",
		alignItems: "center",
		justifyContent: "center",
	},

	headerContent: {
		flex: 1,
	},

	headerTitleLine: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 10,
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

	syncPill: {
		borderRadius: 999,
		paddingHorizontal: 9,
		paddingVertical: 5,
		backgroundColor: "rgba(22,101,52,0.08)",
		borderWidth: 1,
		borderColor: "rgba(22,101,52,0.12)",
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
	},

	syncPillText: {
		color: Colors.primary[800],
		fontSize: 10,
		fontWeight: "900",
	},

	stickyControls: {
		backgroundColor: "#D6E3F3",
		paddingTop: 10,
		paddingBottom: 12,
		zIndex: 20,
	},

	summaryRow: {
		flexDirection: "row",
		gap: 8,
	},

	summaryCard: {
		flex: 1,
		backgroundColor: "rgba(255,255,255,0.78)",
		borderRadius: 18,
		paddingVertical: 9,
		paddingHorizontal: 8,
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.07)",
		shadowColor: "#000",
		shadowOpacity: 0.04,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 5 },
		elevation: 1,
	},

	summaryCardSelected: {
		borderWidth: 2,
		shadowOpacity: 0.08,
	},

	summaryTopLine: {
		minHeight: 20,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},

	summaryIconBox: {
		width: 23,
		height: 23,
		borderRadius: 9,
		backgroundColor: "rgba(15,23,42,0.045)",
		alignItems: "center",
		justifyContent: "center",
	},

	summaryValue: {
		marginTop: 6,
		color: "#0F172A",
		fontSize: 16,
		fontWeight: "900",
	},

	summaryLabel: {
		marginTop: 2,
		color: "rgba(15,23,42,0.48)",
		fontSize: 10,
		fontWeight: "900",
	},

	searchBox: {
		marginTop: 0,
		minHeight: 46,
		borderRadius: 18,
		backgroundColor: "rgba(255,255,255,0.96)",
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.08)",
		paddingHorizontal: 13,
		flexDirection: "row",
		alignItems: "center",
		gap: 9,
		shadowColor: "#000",
		shadowOpacity: 0.04,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 5 },
		elevation: 1,
	},

	searchInput: {
		flex: 1,
		color: "#0F172A",
		fontSize: 13,
		fontWeight: "800",
		paddingVertical: 10,
		minHeight: 42,
	},

	clearSearchButton: {
		width: 28,
		height: 28,
		borderRadius: 999,
		alignItems: "center",
		justifyContent: "center",
	},

	errorBox: {
		marginTop: 2,
		marginBottom: 10,
		backgroundColor: "rgba(255,255,255,0.90)",
		borderRadius: 18,
		padding: 11,
		borderWidth: 1,
		borderColor: "rgba(180,35,24,0.16)",
		flexDirection: "row",
		alignItems: "center",
		gap: 9,
	},

	errorIconBox: {
		width: 34,
		height: 34,
		borderRadius: 13,
		backgroundColor: "rgba(180,35,24,0.10)",
		alignItems: "center",
		justifyContent: "center",
	},

	errorTextBox: {
		flex: 1,
	},

	errorTitle: {
		color: "#B42318",
		fontSize: 12,
		fontWeight: "900",
	},

	errorMessage: {
		marginTop: 1,
		color: "rgba(15,23,42,0.55)",
		fontSize: 10,
		fontWeight: "700",
	},

	retryButton: {
		paddingHorizontal: 10,
		paddingVertical: 7,
		borderRadius: 999,
		backgroundColor: "rgba(180,35,24,0.10)",
	},

	retryButtonText: {
		color: "#B42318",
		fontSize: 10,
		fontWeight: "900",
	},

	sectionHeader: {
		marginTop: 6,
		marginBottom: 10,
		paddingHorizontal: 2,
		flexDirection: "row",
		alignItems: "flex-end",
		justifyContent: "space-between",
		gap: 12,
	},

	sectionTitleBox: {
		flex: 1,
	},

	sectionTitle: {
		color: "#0F172A",
		fontSize: 14,
		fontWeight: "900",
	},

	sectionDescription: {
		marginTop: 2,
		color: "rgba(15,23,42,0.46)",
		fontSize: 11,
		fontWeight: "800",
	},

	sectionSubtitle: {
		color: "rgba(15,23,42,0.52)",
		fontSize: 11,
		fontWeight: "800",
	},

	machineCard: {
		borderRadius: 22,
		padding: 14,
		marginBottom: 12,
		borderWidth: 1.4,
		shadowColor: "#000",
		shadowOpacity: 0.07,
		shadowRadius: 14,
		shadowOffset: { width: 0, height: 8 },
		elevation: 2,
	},

	machineTopRow: {
		flexDirection: "row",
		alignItems: "flex-start",
		justifyContent: "space-between",
		gap: 10,
		marginBottom: 12,
	},

	machineLeftBlock: {
		flex: 1,
		minWidth: 0,
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
	},

	machineIconBox: {
		width: 46,
		height: 46,
		borderRadius: 17,
		backgroundColor: "rgba(22,101,52,0.10)",
		alignItems: "center",
		justifyContent: "center",
	},

	machineTitleBox: {
		flex: 1,
		minWidth: 0,
	},

	machineMetaLine: {
		flexDirection: "row",
		alignItems: "center",
		gap: 7,
		marginBottom: 3,
	},

	machineCode: {
		color: Colors.primary[800],
		fontSize: 11,
		fontWeight: "900",
		maxWidth: 90,
	},

	machineType: {
		flex: 1,
		color: "rgba(15,23,42,0.42)",
		fontSize: 10,
		fontWeight: "900",
		textTransform: "uppercase",
		letterSpacing: 0.4,
	},

	machineName: {
		color: "#0F172A",
		fontSize: 15,
		fontWeight: "900",
		lineHeight: 19,
		letterSpacing: -0.2,
	},

	farmLine: {
		marginTop: 4,
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
	},

	farmText: {
		flex: 1,
		color: "rgba(15,23,42,0.42)",
		fontSize: 10,
		fontWeight: "800",
	},

	statusBadge: {
		maxWidth: 112,
		borderRadius: 999,
		paddingHorizontal: 8,
		paddingVertical: 5,
		borderWidth: 1,
		flexDirection: "row",
		alignItems: "center",
		gap: 5,
	},

	statusDot: {
		width: 6,
		height: 6,
		borderRadius: 999,
	},

	statusText: {
		flexShrink: 1,
		fontSize: 10,
		fontWeight: "900",
	},

	nextDueBox: {
		marginBottom: 10,
		backgroundColor: "rgba(22,101,52,0.055)",
		borderRadius: 16,
		padding: 10,
		borderWidth: 1,
		borderColor: "rgba(22,101,52,0.10)",
		flexDirection: "row",
		alignItems: "center",
		gap: 9,
	},

	nextDueIconBox: {
		width: 34,
		height: 34,
		borderRadius: 13,
		backgroundColor: "rgba(22,101,52,0.10)",
		alignItems: "center",
		justifyContent: "center",
	},

	nextDueTextBox: {
		flex: 1,
		minWidth: 0,
	},

	nextDueLabel: {
		color: "rgba(15,23,42,0.46)",
		fontSize: 10,
		fontWeight: "900",
		textTransform: "uppercase",
		letterSpacing: 0.3,
	},

	nextDueTitle: {
		marginTop: 2,
		color: "#0F172A",
		fontSize: 12,
		fontWeight: "900",
	},

	nextDueRight: {
		alignItems: "flex-end",
		maxWidth: 108,
	},

	nextDueHour: {
		color: "#0F172A",
		fontSize: 13,
		fontWeight: "900",
	},

	nextDueRemaining: {
		marginTop: 2,
		color: "rgba(15,23,42,0.50)",
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
		borderRadius: 15,
		paddingHorizontal: 10,
		paddingVertical: 9,
		borderWidth: 1,
	},

	metricTopLine: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
	},

	metricIconBox: {
		width: 22,
		height: 22,
		borderRadius: 9,
		alignItems: "center",
		justifyContent: "center",
	},

	metricLabel: {
		flex: 1,
		color: "rgba(15,23,42,0.48)",
		fontSize: 9.5,
		fontWeight: "900",
		textTransform: "uppercase",
		letterSpacing: 0.25,
	},

	metricValue: {
		marginTop: 6,
		fontSize: 14,
		fontWeight: "900",
	},

	maintenanceMiniBlock: {
		marginTop: 10,
		flexDirection: "row",
		gap: 8,
	},

	maintenanceMiniItem: {
		flex: 1,
		backgroundColor: "rgba(15,23,42,0.025)",
		borderRadius: 14,
		paddingHorizontal: 10,
		paddingVertical: 8,
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.045)",
	},

	maintenanceMiniTitle: {
		color: "rgba(15,23,42,0.50)",
		fontSize: 10,
		fontWeight: "900",
	},

	maintenanceMiniValue: {
		marginTop: 3,
		color: "#0F172A",
		fontSize: 11,
		fontWeight: "900",
	},

	progressBlock: {
		marginTop: 12,
		backgroundColor: "rgba(15,23,42,0.025)",
		borderRadius: 16,
		padding: 10,
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.045)",
	},

	progressHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 8,
		gap: 10,
	},

	progressLabel: {
		color: "rgba(15,23,42,0.52)",
		fontSize: 10,
		fontWeight: "900",
		textTransform: "uppercase",
		letterSpacing: 0.3,
	},

	progressStatus: {
		fontSize: 10,
		fontWeight: "900",
	},

	revisionOkText: {
		color: Colors.primary[800],
	},

	revisionWarningText: {
		color: "#946200",
	},

	revisionDangerText: {
		color: "#B42318",
	},

	progressTrack: {
		height: 8,
		borderRadius: 999,
		backgroundColor: "rgba(15,23,42,0.08)",
		overflow: "hidden",
	},

	progressFill: {
		height: "100%",
		borderRadius: 999,
	},

	progressFillOk: {
		backgroundColor: Colors.primary[700],
	},

	progressFillWarning: {
		backgroundColor: "#B7791F",
	},

	progressFillDanger: {
		backgroundColor: "#B42318",
	},

	progressFooter: {
		marginTop: 7,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},

	progressPercent: {
		color: "rgba(15,23,42,0.48)",
		fontSize: 10,
		fontWeight: "800",
	},

	progressRemaining: {
		color: "#0F172A",
		fontSize: 10,
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

	footerLeft: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
	},

	cardFooterText: {
		color: "rgba(15,23,42,0.48)",
		fontSize: 11,
		fontWeight: "800",
	},

	firstLoadingCard: {
		backgroundColor: "#FFFFFF",
		borderRadius: 24,
		padding: 24,
		alignItems: "center",
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.08)",
		shadowColor: "#000",
		shadowOpacity: 0.05,
		shadowRadius: 12,
		shadowOffset: { width: 0, height: 7 },
		elevation: 2,
	},

	firstLoadingTitle: {
		marginTop: 12,
		color: "#0F172A",
		fontSize: 15,
		fontWeight: "900",
	},

	firstLoadingDescription: {
		marginTop: 5,
		color: "rgba(15,23,42,0.52)",
		fontSize: 12,
		fontWeight: "700",
		textAlign: "center",
		lineHeight: 17,
	},

	emptyCard: {
		backgroundColor: "#FFFFFF",
		borderRadius: 24,
		padding: 22,
		alignItems: "center",
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.08)",
	},

	emptyIconBox: {
		width: 54,
		height: 54,
		borderRadius: 20,
		backgroundColor: "rgba(22,101,52,0.10)",
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 12,
	},

	emptyTitle: {
		color: "#0F172A",
		fontSize: 15,
		fontWeight: "900",
	},

	emptyDescription: {
		marginTop: 5,
		color: "rgba(15,23,42,0.52)",
		fontSize: 12,
		fontWeight: "700",
		textAlign: "center",
		lineHeight: 17,
	},

	pressed: {
		opacity: 0.78,
		transform: [{ scale: 0.99 }],
	},
	machineHeader: {
		marginBottom: 12,
	},

	machineHeaderTop: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
	},

	machineMetaBox: {
		flex: 1,
		minWidth: 0,
		justifyContent: "center",
	},

	machineTitleFullBox: {
		marginTop: 10,
		width: "100%",
		alignItems: 'center'
	},

	machineMetaLine: {
		flexDirection: "row",
		alignItems: "center",
		gap: 7,
	},

	machineIconBox: {
		width: 46,
		height: 46,
		borderRadius: 17,
		backgroundColor: "rgba(22,101,52,0.10)",
		alignItems: "center",
		justifyContent: "center",
	},

	machineCode: {
		color: Colors.primary[800],
		fontSize: 12,
		fontWeight: "900",
		maxWidth: 96,
	},

	machineType: {
		flex: 1,
		color: "rgba(15,23,42,0.42)",
		fontSize: 10,
		fontWeight: "900",
		textTransform: "uppercase",
		letterSpacing: 0.4,
	},

	machineName: {
		color: "#0F172A",
		fontSize: 12.5,
		fontWeight: "900",
		lineHeight: 20,
		letterSpacing: -0.2,
	},

	farmLine: {
		marginTop: 5,
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
	},

	farmText: {
		flex: 1,
		color: "rgba(15,23,42,0.42)",
		fontSize: 10.5,
		fontWeight: "800",
	},

	statusBadge: {
		maxWidth: 116,
		borderRadius: 999,
		paddingHorizontal: 8,
		paddingVertical: 5,
		borderWidth: 1,
		flexDirection: "row",
		alignItems: "center",
		gap: 5,
	},

	statusDot: {
		width: 6,
		height: 6,
		borderRadius: 999,
	},

	statusText: {
		flexShrink: 1,
		fontSize: 10,
		fontWeight: "900",
	},
	summaryBlock: {
		marginBottom: 8,
	},

	stickySearch: {
		backgroundColor: "#D6E3F3",
		paddingTop: 8,
		paddingBottom: 11,
		zIndex: 20,
	},
	scrollTopFab: {
		position: "absolute",
		right: 18,
		bottom: 26,
		width: 48,
		height: 48,
		borderRadius: 18,
		backgroundColor: Colors.primary[800],
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.30)",
		shadowColor: "#000",
		shadowOpacity: 0.18,
		shadowRadius: 14,
		shadowOffset: { width: 0, height: 8 },
		elevation: 5,
	},
	pendingSyncCard: {
		marginBottom: 10,
		backgroundColor: "rgba(255,247,237,0.98)",
		borderRadius: 20,
		padding: 12,
		borderWidth: 1,
		borderColor: "rgba(148,98,0,0.18)",
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		shadowColor: "#000",
		shadowOpacity: 0.04,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 5 },
		elevation: 1,
	},

	pendingSyncCardFailed: {
		backgroundColor: "rgba(255,245,245,0.98)",
		borderColor: "rgba(180,35,24,0.18)",
	},

	pendingSyncIconBox: {
		width: 40,
		height: 40,
		borderRadius: 15,
		backgroundColor: "rgba(148,98,0,0.12)",
		alignItems: "center",
		justifyContent: "center",
	},

	pendingSyncIconBoxFailed: {
		backgroundColor: "rgba(180,35,24,0.10)",
	},

	pendingSyncTextBox: {
		flex: 1,
		minWidth: 0,
	},

	pendingSyncTitle: {
		color: "#946200",
		fontSize: 12.5,
		fontWeight: "900",
	},

	pendingSyncTitleFailed: {
		color: "#B42318",
	},

	pendingSyncDescription: {
		marginTop: 2,
		color: "rgba(15,23,42,0.52)",
		fontSize: 10.5,
		fontWeight: "700",
		lineHeight: 15,
	},

	pendingSyncButton: {
		borderRadius: 999,
		paddingHorizontal: 11,
		paddingVertical: 8,
		backgroundColor: "rgba(148,98,0,0.12)",
		borderWidth: 1,
		borderColor: "rgba(148,98,0,0.12)",
	},

	pendingSyncButtonFailed: {
		backgroundColor: "rgba(180,35,24,0.10)",
		borderColor: "rgba(180,35,24,0.12)",
	},

	pendingSyncButtonText: {
		color: "#946200",
		fontSize: 10.5,
		fontWeight: "900",
	},

	pendingSyncButtonTextFailed: {
		color: "#B42318",
	},

	machinePendingBox: {
		marginBottom: 10,
		borderRadius: 15,
		padding: 9,
		backgroundColor: "rgba(255,247,237,0.96)",
		borderWidth: 1,
		borderColor: "rgba(148,98,0,0.16)",
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},

	machinePendingBoxFailed: {
		backgroundColor: "rgba(255,245,245,0.96)",
		borderColor: "rgba(180,35,24,0.16)",
	},

	machinePendingIconBox: {
		width: 28,
		height: 28,
		borderRadius: 11,
		backgroundColor: "rgba(148,98,0,0.12)",
		alignItems: "center",
		justifyContent: "center",
	},

	machinePendingIconBoxFailed: {
		backgroundColor: "rgba(180,35,24,0.10)",
	},

	machinePendingTextBox: {
		flex: 1,
		minWidth: 0,
	},

	machinePendingTitle: {
		color: "#946200",
		fontSize: 10.5,
		fontWeight: "900",
	},

	machinePendingTitleFailed: {
		color: "#B42318",
	},

	machinePendingDescription: {
		marginTop: 1,
		color: "rgba(15,23,42,0.50)",
		fontSize: 10,
		fontWeight: "800",
	},
	searchAndFilterRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},

	searchFlex: {
		flex: 1,
	},

	filterButton: {
		width: 46,
		height: 46,
		borderRadius: 18,
		backgroundColor: "rgba(255,255,255,0.96)",
		borderWidth: 1,
		borderColor: "rgba(22,101,52,0.16)",
		alignItems: "center",
		justifyContent: "center",
		shadowColor: "#000",
		shadowOpacity: 0.04,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 5 },
		elevation: 1,
	},

	filterButtonActive: {
		backgroundColor: Colors.primary[800],
		borderColor: Colors.primary[800],
	},

	filterCountBadge: {
		position: "absolute",
		top: -5,
		right: -5,
		minWidth: 19,
		height: 19,
		borderRadius: 999,
		backgroundColor: "#B42318",
		borderWidth: 1,
		borderColor: "#FFFFFF",
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 4,
	},

	filterCountText: {
		color: "#FFFFFF",
		fontSize: 10,
		fontWeight: "900",
	},
	activeFiltersHint: {
		marginTop: 7,
		alignSelf: "flex-start",
		borderRadius: 999,
		paddingHorizontal: 9,
		paddingVertical: 5,
		backgroundColor: "rgba(22,101,52,0.08)",
		borderWidth: 1,
		borderColor: "rgba(22,101,52,0.12)",
		flexDirection: "row",
		alignItems: "center",
		gap: 5,
	},

	activeFiltersHintText: {
		color: Colors.primary[800],
		fontSize: 10.5,
		fontWeight: "900",
	},
	topActions: {
		flexDirection: "row",
		alignItems: "center",
		gap: 7,
	},

	whatsappTopButton: {
		height: 42,
		paddingHorizontal: 12,
		borderRadius: 16,
		backgroundColor: "rgba(255,255,255,0.92)",
		borderWidth: 1,
		borderColor: "rgba(22,101,52,0.20)",
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 6,
		shadowColor: "#000",
		shadowOpacity: 0.04,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 5 },
		elevation: 1,
	},
	pendingSyncButtonDisabled: {
		opacity: 0.65,
	},
});

export default MachineryScreen;