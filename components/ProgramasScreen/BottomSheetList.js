import { useMemo } from "react";
import { StyleSheet, View, Text, Pressable, Image } from "react-native";
import { useDispatch, useSelector } from "react-redux";

import {
	programasSelector,
	programSelector,
	selectAreaTotal,
} from "../../store/redux/selector";

import { geralActions } from "../../store/redux/geral";
import { Colors } from "../../constants/styles";


const CULTURE_PRESETS = {
	Arroz: {
		label: "Arroz",
		color: "#F59E0B",
		bg: "rgba(245, 158, 11, 0.14)",
		border: "rgba(245, 158, 11, 0.45)",
		icon: require("../../utils/assets/icons/rice.png"),
	},
	Soja: {
		label: "Soja",
		color: "#22C55E",
		bg: "rgba(34, 197, 94, 0.14)",
		border: "rgba(34, 197, 94, 0.45)",
		icon: require("../../utils/assets/icons/soy.png"),
	},
	Feijão: {
		label: "Feijão",
		color: "#A16207",
		bg: "rgba(161, 98, 7, 0.16)",
		border: "rgba(161, 98, 7, 0.45)",
		icon: require("../../utils/assets/icons/beans2.png"),
	},
	default: {
		label: "Cultura",
		color: "#94A3B8",
		bg: "rgba(148, 163, 184, 0.14)",
		border: "rgba(148, 163, 184, 0.35)",
		icon: require("../../utils/assets/icons/question.png"),
	},
};

function normalizeText(value) {
	return String(value || "")
		.trim()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase();
}

function getCulturePreset(cultura) {
	const normalized = normalizeText(cultura);

	if (normalized.includes("arroz")) return CULTURE_PRESETS.Arroz;
	if (normalized.includes("soja")) return CULTURE_PRESETS.Soja;
	if (normalized.includes("feijao")) return CULTURE_PRESETS.Feijão;

	return {
		...CULTURE_PRESETS.default,
		label: cultura || "Sem cultura",
	};
}

function cleanProgramName(value) {
	return String(value || "")
		.replace("Programa", "")
		.replace("Aplicação", "")
		.trim();
}

function formatArea(value) {
	const numberValue = Number(value || 0);

	if (!numberValue) return null;

	return numberValue.toLocaleString("pt-BR", {
		minimumFractionDigits: 0,
		maximumFractionDigits: 2,
	});
}

const BottomSheetList = ({ onClose }) => {
	const dispatch = useDispatch();

	const { setSelectedProgram } = geralActions;

	const programasAvai = useSelector(programasSelector);
	const programSelected = useSelector(programSelector);
	const areaTotalPrograms = useSelector(selectAreaTotal);

	const groupedPrograms = useMemo(() => {
		const list = Array.isArray(programasAvai) ? programasAvai : [];
		const areaList = Array.isArray(areaTotalPrograms) ? areaTotalPrograms : [];

		const enriched = list.map((program) => {
			const areaInfo = areaList.find(
				(item) => item.programa__nome === program.nome
			);

			return {
				...program,
				_cultura: program.cultura__cultura || "Sem cultura",
				_safra: program.safra__safra || "-",
				_ciclo: program.ciclo__ciclo || "-",
				_areaTotal: areaInfo?.total || 0,
			};
		});

		enriched.sort((a, b) => {
			const culturaCompare = String(a._cultura).localeCompare(
				String(b._cultura),
				"pt-BR",
				{ sensitivity: "base" }
			);

			if (culturaCompare !== 0) return culturaCompare;

			const safraCompare = String(b._safra).localeCompare(
				String(a._safra),
				"pt-BR",
				{ numeric: true, sensitivity: "base" }
			);

			if (safraCompare !== 0) return safraCompare;

			const cicloCompare = Number(b._ciclo || 0) - Number(a._ciclo || 0);

			if (cicloCompare !== 0) return cicloCompare;

			return String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR", {
				numeric: true,
				sensitivity: "base",
			});
		});

		const groups = [];

		enriched.forEach((program) => {
			const cultureKey = program._cultura;
			const seasonKey = `${program._safra} • Ciclo ${program._ciclo}`;

			let cultureGroup = groups.find((group) => group.cultura === cultureKey);

			if (!cultureGroup) {
				cultureGroup = {
					cultura: cultureKey,
					sections: [],
				};

				groups.push(cultureGroup);
			}

			let seasonGroup = cultureGroup.sections.find(
				(section) => section.title === seasonKey
			);

			if (!seasonGroup) {
				seasonGroup = {
					title: seasonKey,
					data: [],
				};

				cultureGroup.sections.push(seasonGroup);
			}

			seasonGroup.data.push(program);
		});

		return groups;
	}, [programasAvai, areaTotalPrograms]);

	const handleSelect = (program) => {
		dispatch(setSelectedProgram(program));
		onClose();
	};

	if (!groupedPrograms.length) {
		return (
			<View style={styles.emptyContainer}>
				<Text style={styles.emptyTitle}>Nenhum programa ativo</Text>
				<Text style={styles.emptySubtitle}>
					Não encontrei programas disponíveis para seleção.
				</Text>
			</View>
		);
	}

	return (
		<View style={styles.listContent}>
			<View style={styles.header}>
				<Text style={styles.headerEyebrow}>Programas ativos</Text>
				<Text style={styles.headerTitle}>Selecione o programa</Text>
				<Text style={styles.headerSubtitle}>
					Organizado por cultura, safra e ciclo
				</Text>
			</View>

			{groupedPrograms.map((cultureGroup) => {
				const preset = getCulturePreset(cultureGroup.cultura);

				return (
					<View key={cultureGroup.cultura} style={styles.cultureBlock}>
						<View style={styles.cultureHeader}>
							<View
								style={[
									styles.cultureIcon,
									{
										backgroundColor: preset.bg,
										borderColor: preset.border,
									},
								]}
							>
								<Image
									source={preset.icon}
									style={styles.cultureImage}
								/>
							</View>

							<View style={styles.cultureHeaderTextBox}>
								<Text style={styles.cultureTitle}>{cultureGroup.cultura}</Text>
								<Text style={styles.cultureSubtitle}>
									{cultureGroup.sections.reduce(
										(total, section) => total + section.data.length,
										0
									)}{" "}
									programa(s)
								</Text>
							</View>
						</View>

						{cultureGroup.sections.map((section) => (
							<View key={`${cultureGroup.cultura}-${section.title}`}>
								<View style={styles.seasonHeader}>
									<Text style={styles.seasonTitle}>{section.title}</Text>
								</View>

								{section.data.map((program) => {
									const isSelected =
										programSelected?.id === program.id ||
										programSelected?.nome === program.nome;

									const areaFormatted = formatArea(program._areaTotal);

									return (
										<Pressable
											key={program.id || program.nome}
											onPress={() => handleSelect(program)}
											style={({ pressed }) => [
												styles.programCard,
												isSelected && styles.programCardSelected,
												pressed && styles.pressed,
											]}
										>
											<View
												style={[
													styles.programAccent,
													{ backgroundColor: preset.color },
												]}
											/>

											<View
												style={[
													styles.programIconBox,
													isSelected && styles.programIconBoxSelected,
												]}
											>
												<Image
													source={preset.icon}
													style={styles.programIconImage}
												/>
											</View>

											<View style={styles.programContent}>
												<View style={styles.programTopLine}>
													<Text
														style={[
															styles.programName,
															isSelected && styles.programNameSelected,
														]}
														numberOfLines={2}
													>
														{cleanProgramName(
															program.nome_fantasia || program.nome
														)}
													</Text>

													{program.versao ? (
														<View style={styles.versionBadge}>
															<Text style={styles.versionBadgeText}>
																V{program.versao}
															</Text>
														</View>
													) : null}
												</View>

												<Text style={styles.programSubtitle} numberOfLines={2}>
													{program.nome}
												</Text>

												<View style={styles.metaRow}>
													<View style={styles.metaPill}>
														<Text style={styles.metaPillText}>
															{program._safra}
														</Text>
													</View>

													<View style={styles.metaPill}>
														<Text style={styles.metaPillText}>
															Ciclo {program._ciclo}
														</Text>
													</View>

													{areaFormatted ? (
														<View style={styles.areaPill}>
															<Text style={styles.areaPillText}>
																{areaFormatted} ha
															</Text>
														</View>
													) : null}
												</View>
											</View>

											<View style={styles.chevronBox}>
												<Text style={styles.chevron}>›</Text>
											</View>
										</Pressable>
									);
								})}
							</View>
						))}
					</View>
				);
			})}
		</View>
	);
};

const styles = StyleSheet.create({
	listContent: {
		paddingHorizontal: 16,
		paddingTop: 8,
		paddingBottom: 24,
	},

	header: {
		marginBottom: 18,
	},

	headerEyebrow: {
		color: "rgba(255,255,255,0.54)",
		fontSize: 11,
		fontWeight: "900",
		textTransform: "uppercase",
		letterSpacing: 0.8,
	},

	headerTitle: {
		marginTop: 4,
		color: "#FFFFFF",
		fontSize: 24,
		fontWeight: "900",
		letterSpacing: -0.5,
	},

	headerSubtitle: {
		marginTop: 4,
		color: "rgba(255,255,255,0.62)",
		fontSize: 13,
		fontWeight: "700",
	},

	cultureBlock: {
		marginBottom: 22,
	},

	cultureHeader: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 10,
	},

	cultureIcon: {
		width: 44,
		height: 44,
		borderRadius: 16,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 1,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.22,
		shadowRadius: 6,
		elevation: 5,
	},

	cultureImage: {
		width: 25,
		height: 25,
		resizeMode: "contain",
	},

	cultureHeaderTextBox: {
		marginLeft: 10,
		flex: 1,
	},

	cultureTitle: {
		color: "#FFFFFF",
		fontSize: 17,
		fontWeight: "900",
	},

	cultureSubtitle: {
		marginTop: 1,
		color: "rgba(255,255,255,0.54)",
		fontSize: 12,
		fontWeight: "700",
	},

	seasonHeader: {
		marginTop: 6,
		marginBottom: 8,
		paddingLeft: 2,
	},

	seasonTitle: {
		color: "rgba(255,255,255,0.58)",
		fontSize: 12,
		fontWeight: "900",
		textTransform: "uppercase",
		letterSpacing: 0.7,
	},

	programCard: {
		position: "relative",
		flexDirection: "row",
		alignItems: "center",
		width: "100%",
		minHeight: 90,
		marginBottom: 10,
		paddingVertical: 12,
		paddingLeft: 14,
		paddingRight: 10,
		borderRadius: 18,
		overflow: "hidden",
		backgroundColor: "rgba(255,255,255,0.075)",
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.10)",
	},

	programCardSelected: {
		backgroundColor: "rgba(187, 247, 208, 0.18)",
		borderColor: "rgba(134, 239, 172, 0.75)",
	},

	programAccent: {
		position: "absolute",
		left: 0,
		top: 0,
		bottom: 0,
		width: 4,
	},

	programIconBox: {
		width: 38,
		height: 38,
		borderRadius: 14,
		alignItems: "center",
		justifyContent: "center",
		marginRight: 10,
		backgroundColor: "rgba(255,255,255,0.10)",
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.12)",
	},

	programIconImage: {
		width: 23,
		height: 23,
		resizeMode: "contain",
	},

	programContent: {
		flex: 1,
	},

	programTopLine: {
		flexDirection: "row",
		alignItems: "flex-start",
		gap: 8,
	},

	programName: {
		flex: 1,
		color: "#FFFFFF",
		fontSize: 16,
		fontWeight: "900",
		letterSpacing: -0.2,
	},

	programNameSelected: {
		color: "#FFFFFF",
	},

	programSubtitle: {
		marginTop: 4,
		color: "rgba(255,255,255,0.56)",
		fontSize: 12,
		fontWeight: "700",
		lineHeight: 16,
	},

	metaRow: {
		flexDirection: "row",
		alignItems: "center",
		flexWrap: "wrap",
		gap: 6,
		marginTop: 10,
	},

	metaPill: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 999,
		backgroundColor: "rgba(255,255,255,0.09)",
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.10)",
	},

	metaPillText: {
		color: "rgba(255,255,255,0.72)",
		fontSize: 11,
		fontWeight: "900",
	},

	areaPill: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 999,
		backgroundColor: "rgba(232,238,247,0.92)",
	},

	areaPillText: {
		color: "#0F172A",
		fontSize: 11,
		fontWeight: "900",
	},

	versionBadge: {
		paddingHorizontal: 7,
		paddingVertical: 4,
		borderRadius: 999,
		backgroundColor: "rgba(255,255,255,0.12)",
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.12)",
	},

	versionBadgeText: {
		color: "rgba(255,255,255,0.76)",
		fontSize: 10,
		fontWeight: "900",
	},

	chevronBox: {
		width: 22,
		alignItems: "flex-end",
		justifyContent: "center",
	},

	chevron: {
		color: "rgba(255,255,255,0.45)",
		fontSize: 30,
		fontWeight: "300",
		marginTop: -2,
	},

	pressed: {
		opacity: 0.78,
		transform: [{ scale: 0.99 }],
	},

	emptyContainer: {
		paddingHorizontal: 18,
		paddingVertical: 28,
		alignItems: "center",
	},

	emptyTitle: {
		color: "#FFFFFF",
		fontSize: 18,
		fontWeight: "900",
	},

	emptySubtitle: {
		marginTop: 6,
		color: "rgba(255,255,255,0.56)",
		fontSize: 13,
		fontWeight: "700",
		textAlign: "center",
	},
	programIconBoxSelected: {
		backgroundColor: "rgba(187, 247, 208, 0.28)",
		borderColor: "rgba(134, 239, 172, 0.85)",
	},
});

export default BottomSheetList;