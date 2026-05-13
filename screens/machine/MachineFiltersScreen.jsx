import React, { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
	View,
	Text,
	StyleSheet,
	Pressable,
	ScrollView,
	StatusBar,
	Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";

import { Colors } from "../../constants/styles";
import { maquinarioActions } from "../../store/redux/maquinario";
import {
	MACHINE_SORT_OPTIONS,
	REVISION_WINDOW_OPTIONS,
	STALE_HOURMETER_OPTIONS,
	getAdvancedFiltersCount,
	getMachineFarmOptions,
	getMachineNextPlanOptions,
} from "../../store/redux/maquinarioFilterHelpers";

const OptionCard = ({
	icon,
	title,
	description,
	selected,
	onPress,
	compact = false,
}) => {
	return (
		<Pressable
			onPress={onPress}
			style={({ pressed }) => [
				styles.optionCard,
				compact && styles.optionCardCompact,
				selected && styles.optionCardSelected,
				pressed && styles.pressed,
			]}
		>
			<View
				style={[
					styles.optionIconBox,
					selected && styles.optionIconBoxSelected,
				]}
			>
				<Ionicons
					name={selected ? "checkmark-circle" : icon || "ellipse-outline"}
					size={18}
					color={selected ? Colors.primary[800] : "rgba(15,23,42,0.46)"}
				/>
			</View>

			<View style={styles.optionTextBox}>
				<Text style={styles.optionTitle} numberOfLines={1}>
					{title}
				</Text>

				{description ? (
					<Text style={styles.optionDescription} numberOfLines={2}>
						{description}
					</Text>
				) : null}
			</View>
		</Pressable>
	);
};

const Section = ({ title, description, children }) => {
	return (
		<View style={styles.section}>
			<Text style={styles.sectionTitle}>{title}</Text>

			{description ? (
				<Text style={styles.sectionDescription}>{description}</Text>
			) : null}

			<View style={styles.sectionContent}>{children}</View>
		</View>
	);
};

const toggleValue = (array, value) => {
	const current = Array.isArray(array) ? [...array] : [];
	const index = current.findIndex((item) => String(item) === String(value));

	if (index === -1) {
		current.push(value);
	} else {
		current.splice(index, 1);
	}

	return current;
};

const MachineFiltersScreen = ({ navigation }) => {
	const dispatch = useDispatch();

	const allMachines = useSelector((state) => state?.maquinario?.machines || []);
	const currentFilters = useSelector((state) => state?.maquinario?.filters || {});

	const [draftFilters, setDraftFilters] = useState({
		...currentFilters,
		farmIds: currentFilters?.farmIds || [],
		machineType: currentFilters?.machineType || [],
		nextPlanIds: currentFilters?.nextPlanIds || [],
		nextPlanIntervals: currentFilters?.nextPlanIntervals || [],
		revisionWindow: currentFilters?.revisionWindow || "all",
		staleHourmeterDays: currentFilters?.staleHourmeterDays ?? null,
		includeNeverUpdated: currentFilters?.includeNeverUpdated !== false,
		sortBy: currentFilters?.sortBy || "next_revision",
		sortDirection: currentFilters?.sortDirection || "asc",
	});

	useFocusEffect(
		useCallback(() => {
			StatusBar.setBarStyle("dark-content");

			if (Platform.OS === "android") {
				StatusBar.setBackgroundColor("#D6E3F3");
			}
		}, [])
	);

	const farmOptions = useMemo(() => {
		return getMachineFarmOptions(allMachines);
	}, [allMachines]);

	const nextPlanOptions = useMemo(() => {
		return getMachineNextPlanOptions(allMachines);
	}, [allMachines]);

	const machineTypeOptions = useMemo(() => {
		const map = new Map();

		(Array.isArray(allMachines) ? allMachines : []).forEach((machine) => {
			if (!machine?.machine_type) return;

			map.set(machine.machine_type, {
				id: machine.machine_type,
				name: machine.machine_type_label || machine.machine_type,
			});
		});

		return Array.from(map.values()).sort((a, b) =>
			String(a.name).localeCompare(String(b.name))
		);
	}, [allMachines]);

	const activeCount = getAdvancedFiltersCount(draftFilters);

	const handleBack = useCallback(() => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

		if (navigation?.canGoBack?.()) {
			navigation.goBack();
		}
	}, [navigation]);

	const handleApply = useCallback(() => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

		dispatch(maquinarioActions.setMachineFilters(draftFilters));
		navigation.goBack();
	}, [dispatch, draftFilters, navigation]);

	const handleClear = useCallback(() => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

		const cleared = {
			...draftFilters,
			farmIds: [],
			machineType: [],
			nextPlanIds: [],
			nextPlanIntervals: [],
			revisionWindow: "all",
			staleHourmeterDays: null,
			includeNeverUpdated: true,
			sortBy: "next_revision",
			sortDirection: "asc",
		};

		setDraftFilters(cleared);
	}, [draftFilters]);

	const updateDraft = useCallback((patch) => {
		setDraftFilters((current) => ({
			...current,
			...patch,
		}));
	}, []);

	return (
		<SafeAreaView style={styles.root} edges={["top"]}>
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
						<Text style={styles.topTitle}>Filtros e ordenação</Text>
						<Text style={styles.topSubtitle}>
							{activeCount > 0
								? `${activeCount} filtro${activeCount === 1 ? "" : "s"} aplicado${activeCount === 1 ? "" : "s"}`
								: "Ajuste como deseja visualizar"}
						</Text>
					</View>
				</View>

				<View style={styles.heroCard}>
					<View style={styles.heroIconBox}>
						<Ionicons name="options-outline" size={24} color={Colors.primary[800]} />
					</View>

					<View style={styles.heroTextBox}>
						<Text style={styles.heroTitle}>Personalize a lista</Text>
						<Text style={styles.heroDescription}>
							Os filtros ficam salvos no celular e funcionam com os dados em cache.
						</Text>
					</View>
				</View>

				<Section
					title="Ordenar por"
					description="Escolha a prioridade da lista de máquinas."
				>
					{MACHINE_SORT_OPTIONS.map((option) => {
						const selected =
							draftFilters.sortBy === option.key &&
							(draftFilters.sortDirection || "asc") === option.direction;

						return (
							<OptionCard
								key={`${option.key}-${option.direction}`}
								icon={option.icon}
								title={option.label}
								description={option.description}
								selected={selected}
								onPress={() => {
									Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
									updateDraft({
										sortBy: option.key,
										sortDirection: option.direction,
									});
								}}
							/>
						);
					})}
				</Section>

				<Section
					title="Fazendas"
					description="Filtre por uma ou mais fazendas. Vazio significa todas."
				>
					{farmOptions.length === 0 ? (
						<View style={styles.emptyMiniCard}>
							<Text style={styles.emptyMiniTitle}>Nenhuma fazenda disponível</Text>
							<Text style={styles.emptyMiniDescription}>
								As fazendas aparecerão quando houver máquinas carregadas.
							</Text>
						</View>
					) : (
						farmOptions.map((farm) => {
							const selected = draftFilters.farmIds?.some(
								(item) => String(item) === String(farm.id)
							);

							return (
								<OptionCard
									key={farm.id}
									icon="location-outline"
									title={farm.name}
									description={selected ? "Selecionada" : "Selecionar fazenda"}
									selected={selected}
									compact
									onPress={() => {
										Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
										updateDraft({
											farmIds: toggleValue(draftFilters.farmIds, farm.id),
										});
									}}
								/>
							);
						})
					)}
				</Section>

				<Section
					title="Tipo de máquina"
					description="Filtre por trator, pulverizador, colhedora ou outros tipos."
				>
					{machineTypeOptions.length === 0 ? (
						<View style={styles.emptyMiniCard}>
							<Text style={styles.emptyMiniTitle}>Nenhum tipo disponível</Text>
						</View>
					) : (
						machineTypeOptions.map((type) => {
							const selected = draftFilters.machineType?.includes(type.id);

							return (
								<OptionCard
									key={type.id}
									icon="construct-outline"
									title={type.name}
									description={selected ? "Selecionado" : "Selecionar tipo"}
									selected={selected}
									compact
									onPress={() => {
										Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
										updateDraft({
											machineType: toggleValue(
												draftFilters.machineType,
												type.id
											),
										});
									}}
								/>
							);
						})
					)}
				</Section>

				<Section
					title="Próxima revisão"
					description="Filtre pelo plano de manutenção mais próximo."
				>
					{nextPlanOptions.length === 0 ? (
						<View style={styles.emptyMiniCard}>
							<Text style={styles.emptyMiniTitle}>Nenhum plano disponível</Text>
							<Text style={styles.emptyMiniDescription}>
								Os planos aparecerão conforme as máquinas carregadas.
							</Text>
						</View>
					) : (
						nextPlanOptions.map((plan) => {
							const selected = draftFilters.nextPlanIds?.some(
								(item) => String(item) === String(plan.id)
							);

							return (
								<OptionCard
									key={plan.id}
									icon="construct-outline"
									title={plan.name}
									description={`Intervalo de ${plan.intervalHours || "-"} h`}
									selected={selected}
									compact
									onPress={() => {
										Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
										updateDraft({
											nextPlanIds: toggleValue(
												draftFilters.nextPlanIds,
												plan.id
											),
										});
									}}
								/>
							);
						})
					)}
				</Section>

				<Section
					title="Janela de revisão"
					description="Mostre apenas máquinas vencidas ou próximas da revisão."
				>
					{REVISION_WINDOW_OPTIONS.map((option) => {
						const selected = draftFilters.revisionWindow === option.key;

						return (
							<OptionCard
								key={option.key}
								icon={
									option.key === "overdue"
										? "warning-outline"
										: option.key === "all"
											? "grid-outline"
											: "time-outline"
								}
								title={option.label}
								description={option.description}
								selected={selected}
								compact
								onPress={() => {
									Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
									updateDraft({
										revisionWindow: option.key,
									});
								}}
							/>
						);
					})}
				</Section>

				<Section
					title="Horímetro desatualizado"
					description="Encontre máquinas sem leitura recente."
				>
					{STALE_HOURMETER_OPTIONS.map((option) => {
						const selected =
							String(draftFilters.staleHourmeterDays) === String(option.value);

						return (
							<OptionCard
								key={String(option.value)}
								icon={option.value ? "calendar-outline" : "grid-outline"}
								title={option.label}
								description={option.description}
								selected={selected}
								compact
								onPress={() => {
									Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
									updateDraft({
										staleHourmeterDays: option.value,
									});
								}}
							/>
						);
					})}

					<Pressable
						onPress={() => {
							Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
							updateDraft({
								includeNeverUpdated: !draftFilters.includeNeverUpdated,
							});
						}}
						style={({ pressed }) => [
							styles.toggleRow,
							pressed && styles.pressed,
						]}
					>
						<View
							style={[
								styles.toggleIcon,
								draftFilters.includeNeverUpdated && styles.toggleIconActive,
							]}
						>
							<Ionicons
								name={
									draftFilters.includeNeverUpdated
										? "checkmark"
										: "remove-outline"
								}
								size={15}
								color={
									draftFilters.includeNeverUpdated
										? "#FFFFFF"
										: "rgba(15,23,42,0.42)"
								}
							/>
						</View>

						<View style={styles.toggleTextBox}>
							<Text style={styles.toggleTitle}>Incluir nunca atualizadas</Text>
							<Text style={styles.toggleDescription}>
								Máquinas sem data de última leitura entram nesse filtro.
							</Text>
						</View>
					</Pressable>
				</Section>
			</ScrollView>

			<View style={styles.footer}>
				<Pressable
					onPress={handleClear}
					style={({ pressed }) => [
						styles.clearButton,
						pressed && styles.pressed,
					]}
				>
					<Text style={styles.clearButtonText}>Limpar</Text>
				</Pressable>

				<Pressable
					onPress={handleApply}
					style={({ pressed }) => [
						styles.applyButton,
						pressed && styles.pressed,
					]}
				>
					<Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
					<Text style={styles.applyButtonText}>Aplicar filtros</Text>
				</Pressable>
			</View>
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
		paddingBottom: 118,
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
	},

	heroIconBox: {
		width: 50,
		height: 50,
		borderRadius: 18,
		backgroundColor: "rgba(22,101,52,0.10)",
		alignItems: "center",
		justifyContent: "center",
	},

	heroTextBox: {
		flex: 1,
	},

	heroTitle: {
		color: "#0F172A",
		fontSize: 17,
		fontWeight: "900",
		letterSpacing: -0.3,
	},

	heroDescription: {
		marginTop: 3,
		color: "rgba(15,23,42,0.56)",
		fontSize: 12,
		fontWeight: "700",
		lineHeight: 17,
	},

	section: {
		marginTop: 18,
	},

	sectionTitle: {
		color: "#0F172A",
		fontSize: 15,
		fontWeight: "900",
		letterSpacing: -0.2,
	},

	sectionDescription: {
		marginTop: 3,
		color: "rgba(15,23,42,0.50)",
		fontSize: 11,
		fontWeight: "700",
		lineHeight: 16,
	},

	sectionContent: {
		marginTop: 10,
		gap: 9,
	},

	optionCard: {
		backgroundColor: "rgba(255,255,255,0.92)",
		borderRadius: 20,
		padding: 12,
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.08)",
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		shadowColor: "#000",
		shadowOpacity: 0.035,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 4 },
		elevation: 1,
	},

	optionCardCompact: {
		paddingVertical: 10,
	},

	optionCardSelected: {
		backgroundColor: "rgba(22,101,52,0.07)",
		borderColor: "rgba(22,101,52,0.24)",
	},

	optionIconBox: {
		width: 36,
		height: 36,
		borderRadius: 14,
		backgroundColor: "rgba(15,23,42,0.045)",
		alignItems: "center",
		justifyContent: "center",
	},

	optionIconBoxSelected: {
		backgroundColor: "rgba(22,101,52,0.10)",
	},

	optionTextBox: {
		flex: 1,
		minWidth: 0,
	},

	optionTitle: {
		color: "#0F172A",
		fontSize: 13,
		fontWeight: "900",
	},

	optionDescription: {
		marginTop: 2,
		color: "rgba(15,23,42,0.48)",
		fontSize: 10.5,
		fontWeight: "700",
		lineHeight: 15,
	},

	emptyMiniCard: {
		backgroundColor: "rgba(255,255,255,0.75)",
		borderRadius: 18,
		padding: 14,
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.07)",
	},

	emptyMiniTitle: {
		color: "#0F172A",
		fontSize: 12,
		fontWeight: "900",
	},

	emptyMiniDescription: {
		marginTop: 3,
		color: "rgba(15,23,42,0.50)",
		fontSize: 10.5,
		fontWeight: "700",
		lineHeight: 15,
	},

	toggleRow: {
		backgroundColor: "rgba(255,255,255,0.82)",
		borderRadius: 20,
		padding: 12,
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.08)",
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
	},

	toggleIcon: {
		width: 32,
		height: 32,
		borderRadius: 13,
		backgroundColor: "rgba(15,23,42,0.06)",
		alignItems: "center",
		justifyContent: "center",
	},

	toggleIconActive: {
		backgroundColor: Colors.primary[800],
	},

	toggleTextBox: {
		flex: 1,
	},

	toggleTitle: {
		color: "#0F172A",
		fontSize: 12.5,
		fontWeight: "900",
	},

	toggleDescription: {
		marginTop: 2,
		color: "rgba(15,23,42,0.48)",
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
		flexDirection: "row",
		gap: 10,
	},

	clearButton: {
		width: 104,
		height: 52,
		borderRadius: 19,
		backgroundColor: "rgba(255,255,255,0.88)",
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.08)",
		alignItems: "center",
		justifyContent: "center",
	},

	clearButtonText: {
		color: "rgba(15,23,42,0.66)",
		fontSize: 13,
		fontWeight: "900",
	},

	applyButton: {
		flex: 1,
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

	applyButtonText: {
		color: "#FFFFFF",
		fontSize: 14,
		fontWeight: "900",
	},

	pressed: {
		opacity: 0.78,
		transform: [{ scale: 0.99 }],
	},
});

export default MachineFiltersScreen;