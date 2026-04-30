// screens/navigation/NavigationHomeScreen.jsx

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	ScrollView,
	Platform,
	ActivityIndicator,
	RefreshControl,
	Animated,
	Easing,
} from "react-native";

import { setStatusBarStyle, setStatusBarBackgroundColor } from "expo-status-bar";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useDispatch, useSelector } from "react-redux";

import Ionicons from "@expo/vector-icons/Ionicons";
import { Colors } from "../../constants/styles";

import { geralActions } from "../../store/redux/geral";

import {
	selectNavigationMapData,
	selectNavigationMapStatus,
	selectNavigationMapError,
	selectNavigationMapCurrentSafra,
	selectNavigationMapCurrentCiclo,
	selectNavigationMapFilterSelected,
	selectNavigationMapFilters,
} from "../../store/redux/selector";

import { fetchNavigationMapData } from "../../store/redux/geral";

const STATUS_LABELS = {
	sem_planejamento: "Sem planejamento",
	planejado: "Planejado",
	em_plantio: "Em plantio",
	plantado: "Plantado",
	colhido: "Colhido",
};

const DEFAULT_STATUS_OPTIONS = [
	{ key: "sem_planejamento", label: "Sem planejamento" },
	{ key: "planejado", label: "Planejado" },
	{ key: "em_plantio", label: "Em plantio" },
	{ key: "plantado", label: "Plantado" },
	{ key: "colhido", label: "Colhido" },
];

const formatHa = (value) => {
	if (value === null || value === undefined || Number.isNaN(Number(value))) {
		return "—";
	}

	return `${Number(value).toLocaleString("pt-BR", {
		minimumFractionDigits: 0,
		maximumFractionDigits: 2,
	})} ha`;
};

const normalizeProjectName = (name) => {
	if (!name) return "Projeto";
	return String(name).replace("Projeto ", "");
};

const normalizeSafra = (value) => {
	if (value === null || value === undefined || value === "") return null;
	return String(value).trim();
};

const normalizeCiclo = (value) => {
	if (value === null || value === undefined || value === "") return null;

	const parsed = Number(String(value).trim());

	if (Number.isNaN(parsed)) return String(value).trim();

	return String(parsed);
};

const normalizeText = (value) => {
	if (value === null || value === undefined || value === "") return null;
	return String(value).trim();
};

const filterNavigationDataByContext = (data = [], safra, ciclo, filters = {}) => {
	const safeData = Array.isArray(data) ? data : [];

	const normalizedSafra = normalizeSafra(safra);
	const normalizedCiclo = normalizeCiclo(ciclo);

	return safeData.filter((item) => {
		if (normalizedSafra && normalizeSafra(item?.safra) !== normalizedSafra) {
			return false;
		}

		if (normalizedCiclo && normalizeCiclo(item?.ciclo) !== normalizedCiclo) {
			return false;
		}

		if (filters?.cultura?.length > 0) {
			const itemCulture = normalizeText(item?.cultura);

			const matchesCulture = filters.cultura.some(
				(culture) => normalizeText(culture) === itemCulture
			);

			if (!matchesCulture) return false;
		}

		if (filters?.variedade?.length > 0) {
			const itemVariedade = normalizeText(item?.variedade || item?.variedade_nome);

			const matchesVariety = filters.variedade.some(
				(variety) => normalizeText(variety) === itemVariedade
			);

			if (!matchesVariety) return false;
		}

		if (filters?.status?.length > 0) {
			if (!filters.status.includes(item?.status)) return false;
		}

		return true;
	});
};

const groupNavigationDataByFarm = (data = []) => {
	const safeData = Array.isArray(data) ? data : [];
	const grouped = {};

	safeData.forEach((item) => {
		const farmName = item?.fazenda_grupo || "Sem fazenda";
		const projectName = item?.projeto || "Sem projeto";

		if (!grouped[farmName]) {
			grouped[farmName] = {
				fazenda_nome: farmName,
				fazenda_id: farmName,
				total_area: 0,
				total_parcelas: 0,
				projetosMap: {},
			};
		}

		if (!grouped[farmName].projetosMap[projectName]) {
			grouped[farmName].projetosMap[projectName] = {
				projeto_nome: projectName,
				projeto_id: item?.projeto_id || projectName,
				id_farmbox: item?.projeto_id_farmbox || null,
				map_centro_id: item?.map?.projeto_center || item?.map?.center || null,
				map_zoom: item?.map?.projeto_zoom || null,
				area_produtiva: 0,
				total_parcelas: 0,
				parcelas: [],
			};
		}

		const area = Number(item?.area || 0);

		grouped[farmName].total_area += area;
		grouped[farmName].total_parcelas += 1;

		grouped[farmName].projetosMap[projectName].area_produtiva += area;
		grouped[farmName].projetosMap[projectName].total_parcelas += 1;
		grouped[farmName].projetosMap[projectName].parcelas.push(item);
	});

	return Object.values(grouped)
		.map((farm) => ({
			...farm,
			projetos: Object.values(farm.projetosMap).sort((a, b) =>
				String(a.projeto_nome).localeCompare(String(b.projeto_nome))
			),
		}))
		.sort((a, b) => String(a.fazenda_nome).localeCompare(String(b.fazenda_nome)));
};

const NavigationHomeSkeleton = () => {
	return (
		<View style={styles.skeletonContainer}>
			{[1, 2, 3, 4, 5].map((item) => (
				<View key={item} style={styles.skeletonCard}>
					<View style={styles.skeletonMainRow}>
						<View style={styles.skeletonIcon} />

						<View style={styles.skeletonContent}>
							<View style={styles.skeletonTitle} />
							<View style={styles.skeletonMeta} />

							<View style={styles.skeletonChipRow}>
								<View style={styles.skeletonChip} />
								<View style={styles.skeletonChipSmall} />
								<View style={styles.skeletonChipSmall} />
							</View>
						</View>
					</View>

					<View style={styles.skeletonFooter}>
						<View style={styles.skeletonFooterText} />
						<View style={styles.skeletonButton} />
					</View>
				</View>
			))}
		</View>
	);
};

const NavigationHomeScreen = ({ navigation }) => {
	const dispatch = useDispatch();

	const navigationMapDataRaw = useSelector(selectNavigationMapData);
	const navigationMapStatus = useSelector(selectNavigationMapStatus);
	const navigationMapError = useSelector(selectNavigationMapError);
	const navigationMapFilters = useSelector(selectNavigationMapFilters);
	const filtersIndexRaw = useSelector(
		(state) => state.geral.navigationMapFiltersIndex || []
	);
	const currentSafra = useSelector(selectNavigationMapCurrentSafra);
	const currentCiclo = useSelector(selectNavigationMapCurrentCiclo);
	const navigationMapFilterSelected = useSelector(selectNavigationMapFilterSelected);

	const navigationMapData = Array.isArray(navigationMapDataRaw)
		? navigationMapDataRaw
		: [];

	const filtersIndex = Array.isArray(filtersIndexRaw) ? filtersIndexRaw : [];

	const selectedStatus = Array.isArray(navigationMapFilterSelected?.status)
		? navigationMapFilterSelected.status
		: [];

	const selectedCultures = Array.isArray(navigationMapFilterSelected?.cultura)
		? navigationMapFilterSelected.cultura
		: [];

	const selectedVarieties = Array.isArray(navigationMapFilterSelected?.variedade)
		? navigationMapFilterSelected.variedade
		: [];

	const [expandedFarmId, setExpandedFarmId] = useState(null);
	const [filtersVisible, setFiltersVisible] = useState(false);
	const [filtersMounted, setFiltersMounted] = useState(false);

	const filtersAnimation = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		if (filtersVisible) {
			setFiltersMounted(true);

			Animated.timing(filtersAnimation, {
				toValue: 1,
				duration: 260,
				easing: Easing.out(Easing.cubic),
				useNativeDriver: false,
			}).start();

			return;
		}

		Animated.timing(filtersAnimation, {
			toValue: 0,
			duration: 220,
			easing: Easing.in(Easing.cubic),
			useNativeDriver: false,
		}).start(({ finished }) => {
			if (finished) {
				setFiltersMounted(false);
			}
		});
	}, [filtersVisible, filtersAnimation]);

	const filterCardAnimatedStyle = {
		opacity: filtersAnimation,
		maxHeight: filtersAnimation.interpolate({
			inputRange: [0, 1],
			outputRange: [0, 520],
		}),
		marginTop: filtersAnimation.interpolate({
			inputRange: [0, 1],
			outputRange: [0, 10],
		}),
		transform: [
			{
				translateY: filtersAnimation.interpolate({
					inputRange: [0, 1],
					outputRange: [-8, 0],
				}),
			},
			{
				scale: filtersAnimation.interpolate({
					inputRange: [0, 1],
					outputRange: [0.98, 1],
				}),
			},
		],
	};

	const sourceRowsForOptions = useMemo(() => {
		if (filtersIndex.length > 0) return filtersIndex;
		return navigationMapData;
	}, [filtersIndex, navigationMapData]);

	const safraOptions = useMemo(() => {
		return [
			...new Set(
				sourceRowsForOptions
					.map((item) => String(item?.safra || "").trim())
					.filter(Boolean)
			),
		].sort((a, b) => String(a).localeCompare(String(b)));
	}, [sourceRowsForOptions]);

	const getCicloOptionsBySafra = useCallback(
		(safraValue) => {
			return [
				...new Set(
					sourceRowsForOptions
						.filter((item) => {
							if (!safraValue) return true;
							return normalizeSafra(item?.safra) === normalizeSafra(safraValue);
						})
						.map((item) => String(item?.ciclo || "").trim())
						.filter(Boolean)
						.map((item) => normalizeCiclo(item))
						.filter(Boolean)
				),
			].sort((a, b) => Number(a) - Number(b));
		},
		[sourceRowsForOptions]
	);

	const cicloOptions = useMemo(() => {
		return getCicloOptionsBySafra(currentSafra);
	}, [getCicloOptionsBySafra, currentSafra]);

	const filterIndexRows = useMemo(() => {
		return sourceRowsForOptions.filter((item) => {
			if (currentSafra && normalizeSafra(item?.safra) !== normalizeSafra(currentSafra)) {
				return false;
			}

			if (currentCiclo && normalizeCiclo(item?.ciclo) !== normalizeCiclo(currentCiclo)) {
				return false;
			}

			return true;
		});
	}, [sourceRowsForOptions, currentSafra, currentCiclo]);

	const statusOptions = useMemo(() => {
		if (navigationMapFilters?.statuses?.length > 0) {
			return navigationMapFilters.statuses;
		}

		return DEFAULT_STATUS_OPTIONS;
	}, [navigationMapFilters]);

	const cultureOptions = useMemo(() => {
		return [
			...new Set(
				filterIndexRows
					.map((item) => String(item?.cultura || "").trim())
					.filter(Boolean)
			),
		].sort((a, b) => String(a).localeCompare(String(b)));
	}, [filterIndexRows]);

	const varietyOptions = useMemo(() => {
		return [
			...new Set(
				filterIndexRows
					.filter((item) => {
						if (selectedCultures.length === 0) return true;

						const itemCulture = normalizeText(item?.cultura);

						return selectedCultures.some(
							(culture) => normalizeText(culture) === itemCulture
						);
					})
					.map((item) => String(item?.variedade || item?.variedade_nome || "").trim())
					.filter(Boolean)
			),
		].sort((a, b) => String(a).localeCompare(String(b)));
	}, [filterIndexRows, selectedCultures]);

	const handleSetHomeFilters = useCallback(
		(nextFilters) => {
			dispatch(
				geralActions.setNavigationMapFiltersSelected({
					cultura: nextFilters?.cultura || [],
					variedade: nextFilters?.variedade || [],
					status: nextFilters?.status || [],
				})
			);
		},
		[dispatch]
	);

	const handleSelectSafra = useCallback(
		(safraValue) => {
			const nextCicloOptions = getCicloOptionsBySafra(safraValue);
			const normalizedCurrentCiclo = normalizeCiclo(currentCiclo);

			const nextCiclo = nextCicloOptions.includes(normalizedCurrentCiclo)
				? normalizedCurrentCiclo
				: nextCicloOptions[0] || null;

			dispatch(
				geralActions.setNavigationMapCurrentFilter({
					safra: safraValue,
					ciclo: nextCiclo,
				})
			);
		},
		[dispatch, currentCiclo, getCicloOptionsBySafra]
	);

	const handleSelectCiclo = useCallback(
		(cicloValue) => {
			dispatch(
				geralActions.setNavigationMapCurrentFilter({
					safra: currentSafra,
					ciclo: normalizeCiclo(cicloValue),
				})
			);
		},
		[dispatch, currentSafra]
	);

	const handleToggleStatus = useCallback(
		(statusKey) => {
			const nextStatus = selectedStatus.includes(statusKey)
				? selectedStatus.filter((item) => item !== statusKey)
				: [...selectedStatus, statusKey];

			handleSetHomeFilters({
				status: nextStatus,
				cultura: selectedCultures,
				variedade: selectedVarieties,
			});
		},
		[handleSetHomeFilters, selectedStatus, selectedCultures, selectedVarieties]
	);

	const handleToggleCulture = useCallback(
		(culture) => {
			const nextCultures = selectedCultures.includes(culture)
				? selectedCultures.filter((item) => item !== culture)
				: [...selectedCultures, culture];

			const nextVarieties = selectedVarieties.filter((variety) => {
				if (nextCultures.length === 0) return true;

				return sourceRowsForOptions.some((item) => {
					const itemCulture = normalizeText(item?.cultura);
					const itemVariety = normalizeText(item?.variedade || item?.variedade_nome);

					return (
						nextCultures.some((selectedCulture) => normalizeText(selectedCulture) === itemCulture) &&
						normalizeText(variety) === itemVariety
					);
				});
			});

			handleSetHomeFilters({
				status: selectedStatus,
				cultura: nextCultures,
				variedade: nextVarieties,
			});
		},
		[
			handleSetHomeFilters,
			selectedStatus,
			selectedCultures,
			selectedVarieties,
			sourceRowsForOptions,
		]
	);

	const handleToggleVariety = useCallback(
		(variety) => {
			const nextVarieties = selectedVarieties.includes(variety)
				? selectedVarieties.filter((item) => item !== variety)
				: [...selectedVarieties, variety];

			handleSetHomeFilters({
				status: selectedStatus,
				cultura: selectedCultures,
				variedade: nextVarieties,
			});
		},
		[handleSetHomeFilters, selectedStatus, selectedCultures, selectedVarieties]
	);

	const handleClearHomeFilters = useCallback(() => {
		dispatch(geralActions.clearNavigationMapFilters());
	}, [dispatch]);

	const handleClearAllFilterContext = useCallback(() => {
		dispatch(geralActions.clearNavigationMapFilters());

		const nextSafra = safraOptions[0] || null;
		const nextCiclo = getCicloOptionsBySafra(nextSafra)[0] || null;

		dispatch(
			geralActions.setNavigationMapCurrentFilter({
				safra: nextSafra,
				ciclo: nextCiclo,
			})
		);
	}, [dispatch, safraOptions, getCicloOptionsBySafra]);

	const hasActiveHomeFilters =
		selectedStatus.length > 0 ||
		selectedCultures.length > 0 ||
		selectedVarieties.length > 0;

	const filteredNavigationMapData = useMemo(() => {
		return filterNavigationDataByContext(
			navigationMapData,
			currentSafra,
			currentCiclo,
			navigationMapFilterSelected
		);
	}, [
		navigationMapData,
		currentSafra,
		currentCiclo,
		navigationMapFilterSelected,
	]);

	const farmsData = useMemo(() => {
		return groupNavigationDataByFarm(filteredNavigationMapData);
	}, [filteredNavigationMapData]);

	const summary = useMemo(() => {
		const totalFarms = farmsData.length;
		const totalProjects = farmsData.reduce(
			(total, farm) => total + farm.projetos.length,
			0
		);

		const totalParcels = filteredNavigationMapData.length;

		const totalArea = filteredNavigationMapData.reduce((total, item) => {
			return total + Number(item?.area || 0);
		}, 0);

		return {
			totalFarms,
			totalProjects,
			totalParcels,
			totalArea,
		};
	}, [farmsData, filteredNavigationMapData]);

	const appliedFiltersLabel = useMemo(() => {
		const filters = [];

		if (selectedStatus.length > 0) {
			filters.push(
				selectedStatus
					.map((statusKey) => STATUS_LABELS[statusKey] || statusKey)
					.join(", ")
			);
		}

		if (selectedCultures.length > 0) {
			filters.push(selectedCultures.join(", "));
		}

		if (selectedVarieties.length > 0) {
			filters.push(selectedVarieties.join(", "));
		}

		if (filters.length === 0) return null;

		return filters.join(" · ");
	}, [selectedStatus, selectedCultures, selectedVarieties]);

	const activeFiltersCount =
		selectedStatus.length + selectedCultures.length + selectedVarieties.length;

	const handleRefreshNavigationData = useCallback(async () => {
		try {
			await dispatch(fetchNavigationMapData({})).unwrap();
		} catch (error) {
			console.log("Erro ao atualizar dados de navegação:", error);
		}
	}, [dispatch]);

	useFocusEffect(
		useCallback(() => {
			dispatch(geralActions.hydrateNavigationMapState());

			dispatch(fetchNavigationMapData({}))
				.unwrap()
				.catch((error) => {
					console.log("Erro ao carregar dados de navegação na Home:", error);
				});

			setStatusBarStyle("dark");
			setStatusBarBackgroundColor("#D6E3F3", true);

			return () => {
				setStatusBarStyle("light");
				setStatusBarBackgroundColor(Colors.primary[901], true);
			};
		}, [dispatch])
	);

	const handleToggleDetails = (farmId) => {
		setExpandedFarmId((current) => (current === farmId ? null : farmId));
	};

	const handleOpenFarmMap = (farm) => {
		dispatch(geralActions.setNavigationMapSelectedFarm(farm.fazenda_nome));
		dispatch(geralActions.setNavigationMapSelectedProject(null));
		dispatch(geralActions.clearNavigationMapSelectedParcels());

		const parentNavigation = navigation.getParent();
		const rootNavigation =
			parentNavigation?.getParent?.() || parentNavigation || navigation;

		rootNavigation.navigate("NavigationMapScreen", {
			farmName: farm.fazenda_nome,
			selectedFarm: farm.fazenda_nome,
			selectedProject: null,
			safra: currentSafra,
			ciclo: currentCiclo,
		});
	};

	const handleOpenProjectMap = (farm, project) => {
		dispatch(geralActions.setNavigationMapSelectedFarm(farm.fazenda_nome));
		dispatch(geralActions.setNavigationMapSelectedProject(project.projeto_nome));
		dispatch(geralActions.clearNavigationMapSelectedParcels());

		const parentNavigation = navigation.getParent();
		const rootNavigation =
			parentNavigation?.getParent?.() || parentNavigation || navigation;

		rootNavigation.navigate("NavigationMapScreen", {
			farmName: farm.fazenda_nome,
			projectName: project.projeto_nome,
			selectedFarm: farm.fazenda_nome,
			selectedProject: project.projeto_nome,
			safra: currentSafra,
			ciclo: currentCiclo,
		});
	};

	const hasData = farmsData.length > 0;
	const hasRawData = navigationMapData.length > 0;
	const isFirstLoading = navigationMapStatus === "pending" && !hasRawData;
	const isRefreshing = navigationMapStatus === "pending" && hasRawData;
	const hasError = navigationMapStatus === "failed" || !!navigationMapError;

	return (
		<SafeAreaView style={styles.safeArea} edges={["top"]}>
			<View style={styles.container}>
				<View style={styles.header}>
					<View style={styles.headerTextBox}>
						<Text style={styles.title}>Navegação</Text>

						<Text style={styles.subtitle}>
							Selecione uma fazenda para abrir o mapa operacional.
						</Text>
					</View>

					<View style={styles.headerActionsRow}>
						<View style={styles.summaryPill}>
							<Ionicons name="map-outline" size={16} color={Colors.primary[700]} />

							<Text style={styles.summaryPillText}>
								{summary.totalFarms} fazendas · {summary.totalProjects} projetos
							</Text>
						</View>

						<TouchableOpacity
							activeOpacity={0.84}
							onPress={() => setFiltersVisible((current) => !current)}
							style={[
								styles.homeFilterButton,
								filtersVisible && styles.homeFilterButtonActive,
								hasActiveHomeFilters && styles.homeFilterButtonWithFilters,
							]}
						>
							<Ionicons
								name={filtersVisible ? "options" : "options-outline"}
								size={17}
								color={filtersVisible ? "#07130C" : Colors.primary[700]}
							/>

							<Text
								style={[
									styles.homeFilterButtonText,
									filtersVisible && styles.homeFilterButtonTextActive,
								]}
							>
								Filtros
							</Text>

							{activeFiltersCount > 0 && (
								<View style={styles.homeFilterCountBadge}>
									<Text style={styles.homeFilterCountBadgeText}>
										{activeFiltersCount}
									</Text>
								</View>
							)}
						</TouchableOpacity>
					</View>

					<View style={styles.filterInfoPill}>
						<Text style={styles.filterInfoText}>
							Safra {currentSafra || "—"} · Ciclo {currentCiclo || "—"} ·{" "}
							{summary.totalParcels} parcelas · {formatHa(summary.totalArea)}
						</Text>
					</View>

					{!!appliedFiltersLabel && (
						<View style={styles.appliedFiltersPill}>
							<Ionicons
								name="filter-outline"
								size={12}
								color={Colors.primary[700]}
							/>

							<Text style={styles.appliedFiltersText} numberOfLines={1}>
								{appliedFiltersLabel}
							</Text>
						</View>
					)}

					{filtersMounted && (
						<Animated.View style={[styles.homeFiltersCardAnimated, filterCardAnimatedStyle]}>
							<View style={styles.homeFiltersCard}>
								<View style={styles.homeFiltersHeader}>
									<View>
										<Text style={styles.homeFiltersTitle}>Filtros operacionais</Text>
										<Text style={styles.homeFiltersSubtitle}>
											Safra, ciclo, status, cultura e variedade
										</Text>
									</View>

									<View style={styles.homeFiltersHeaderActions}>
										{hasActiveHomeFilters && (
											<TouchableOpacity
												activeOpacity={0.82}
												onPress={handleClearHomeFilters}
												style={styles.homeFiltersClearButton}
											>
												<Text style={styles.homeFiltersClear}>Limpar</Text>
											</TouchableOpacity>
										)}

										<TouchableOpacity
											activeOpacity={0.82}
											onPress={() => setFiltersVisible(false)}
											style={styles.homeFiltersCloseButton}
										>
											<Ionicons name="close" size={15} color="#0F172A" />
										</TouchableOpacity>
									</View>
								</View>

								<View style={styles.homeFilterSection}>
									<Text style={styles.homeFilterLabel}>Safra</Text>

									<ScrollView
										horizontal
										showsHorizontalScrollIndicator={false}
										contentContainerStyle={styles.homeChipsRow}
									>
										{safraOptions.map((option) => {
											const isSelected = normalizeSafra(currentSafra) === normalizeSafra(option);

											return (
												<TouchableOpacity
													key={`home-safra-${option}`}
													activeOpacity={0.82}
													onPress={() => handleSelectSafra(option)}
													style={[
														styles.homeFilterChip,
														isSelected && styles.homeFilterChipSelected,
													]}
												>
													<Text
														style={[
															styles.homeFilterChipText,
															isSelected && styles.homeFilterChipTextSelected,
														]}
													>
														{option}
													</Text>
												</TouchableOpacity>
											);
										})}

										{safraOptions.length === 0 && (
											<View style={styles.homeFilterChipDisabled}>
												<Text style={styles.homeFilterChipDisabledText}>
													Sem safra disponível
												</Text>
											</View>
										)}
									</ScrollView>
								</View>

								<View style={styles.homeFilterSection}>
									<Text style={styles.homeFilterLabel}>Ciclo</Text>

									<ScrollView
										horizontal
										showsHorizontalScrollIndicator={false}
										contentContainerStyle={styles.homeChipsRow}
									>
										{cicloOptions.map((option) => {
											const normalizedOption = normalizeCiclo(option);
											const isSelected = normalizeCiclo(currentCiclo) === normalizedOption;

											return (
												<TouchableOpacity
													key={`home-ciclo-${normalizedOption}`}
													activeOpacity={0.82}
													onPress={() => handleSelectCiclo(normalizedOption)}
													style={[
														styles.homeFilterChip,
														isSelected && styles.homeFilterChipSelected,
													]}
												>
													<Text
														style={[
															styles.homeFilterChipText,
															isSelected && styles.homeFilterChipTextSelected,
														]}
													>
														Ciclo {normalizedOption}
													</Text>
												</TouchableOpacity>
											);
										})}

										{cicloOptions.length === 0 && (
											<View style={styles.homeFilterChipDisabled}>
												<Text style={styles.homeFilterChipDisabledText}>
													Sem ciclo disponível
												</Text>
											</View>
										)}
									</ScrollView>
								</View>

								<View style={styles.homeFilterSection}>
									<Text style={styles.homeFilterLabel}>Status</Text>

									<ScrollView
										horizontal
										showsHorizontalScrollIndicator={false}
										contentContainerStyle={styles.homeChipsRow}
									>
										{statusOptions.map((option) => {
											const isSelected = selectedStatus.includes(option.key);

											return (
												<TouchableOpacity
													key={option.key}
													activeOpacity={0.82}
													onPress={() => handleToggleStatus(option.key)}
													style={[
														styles.homeFilterChip,
														isSelected && styles.homeFilterChipSelected,
													]}
												>
													<Text
														style={[
															styles.homeFilterChipText,
															isSelected && styles.homeFilterChipTextSelected,
														]}
													>
														{option.label}
													</Text>
												</TouchableOpacity>
											);
										})}
									</ScrollView>
								</View>

								{cultureOptions.length > 0 && (
									<View style={styles.homeFilterSection}>
										<Text style={styles.homeFilterLabel}>Cultura</Text>

										<ScrollView
											horizontal
											showsHorizontalScrollIndicator={false}
											contentContainerStyle={styles.homeChipsRow}
										>
											{cultureOptions.map((culture) => {
												const isSelected = selectedCultures.includes(culture);

												return (
													<TouchableOpacity
														key={`home-culture-${culture}`}
														activeOpacity={0.82}
														onPress={() => handleToggleCulture(culture)}
														style={[
															styles.homeFilterChip,
															isSelected && styles.homeFilterChipSelected,
														]}
													>
														<Text
															style={[
																styles.homeFilterChipText,
																isSelected && styles.homeFilterChipTextSelected,
															]}
														>
															{culture}
														</Text>
													</TouchableOpacity>
												);
											})}
										</ScrollView>
									</View>
								)}

								{varietyOptions.length > 0 && (
									<View style={styles.homeFilterSectionLast}>
										<Text style={styles.homeFilterLabel}>Variedade</Text>

										<ScrollView
											horizontal
											showsHorizontalScrollIndicator={false}
											contentContainerStyle={styles.homeChipsRow}
										>
											{varietyOptions.map((variety) => {
												const isSelected = selectedVarieties.includes(variety);

												return (
													<TouchableOpacity
														key={`home-variety-${variety}`}
														activeOpacity={0.82}
														onPress={() => handleToggleVariety(variety)}
														style={[
															styles.homeFilterChip,
															isSelected && styles.homeFilterChipSelected,
														]}
													>
														<Text
															style={[
																styles.homeFilterChipText,
																isSelected && styles.homeFilterChipTextSelected,
															]}
														>
															{variety}
														</Text>
													</TouchableOpacity>
												);
											})}
										</ScrollView>
									</View>
								)}

								{(hasActiveHomeFilters || currentSafra || currentCiclo) && (
									<View style={styles.homeFiltersFooter}>
										<Text style={styles.homeFiltersFooterText} numberOfLines={1}>
											Safra {currentSafra || "—"} · Ciclo {currentCiclo || "—"} ·{" "}
											{summary.totalParcels} parcelas · {formatHa(summary.totalArea)}
										</Text>

										<TouchableOpacity
											activeOpacity={0.82}
											onPress={handleClearAllFilterContext}
											style={styles.homeFiltersResetContextButton}
										>
											<Text style={styles.homeFiltersResetContextText}>
												Resetar
											</Text>
										</TouchableOpacity>
									</View>
								)}
							</View>
						</Animated.View>
					)}

					{isRefreshing && (
						<View style={styles.refreshPill}>
							<View style={styles.refreshSpinnerBox}>
								<ActivityIndicator size="small" color={Colors.primary[700]} />
							</View>

							<View>
								<Text style={styles.refreshPillText}>Atualizando dados</Text>
								<Text style={styles.refreshPillSubText}>Sincronizando parcelas e projetos...</Text>
							</View>
						</View>
					)}
				</View>

				{isFirstLoading ? (
					<NavigationHomeSkeleton />
				) : hasError && !hasRawData ? (
					<View style={styles.emptyBox}>
						<Ionicons name="warning-outline" size={30} color="#B45309" />
						<Text style={styles.emptyTitle}>Não foi possível carregar</Text>
						<Text style={styles.emptyText}>
							{navigationMapError || "Erro ao carregar dados de navegação."}
						</Text>
					</View>
				) : !hasData ? (
					<ScrollView
						style={styles.scroll}
						contentContainerStyle={styles.emptyScrollContent}
						showsVerticalScrollIndicator={false}
						refreshControl={
							<RefreshControl
								refreshing={isRefreshing}
								onRefresh={handleRefreshNavigationData}
								tintColor={Colors.primary[700]}
								colors={[Colors.primary[700]]}
								progressBackgroundColor="#FFFFFF"
							/>
						}
					>
						<View style={styles.emptyBoxInline}>
							<Ionicons name="map-outline" size={30} color={Colors.primary[700]} />
							<Text style={styles.emptyTitle}>Nenhum dado encontrado</Text>
							<Text style={styles.emptyText}>
								Não há parcelas disponíveis para os filtros atuais.
							</Text>

							{(hasActiveHomeFilters || currentSafra || currentCiclo) && (
								<TouchableOpacity
									activeOpacity={0.84}
									onPress={handleClearAllFilterContext}
									style={styles.emptyClearButton}
								>
									<Text style={styles.emptyClearButtonText}>Resetar filtros</Text>
								</TouchableOpacity>
							)}
						</View>
					</ScrollView>
				) : (
					<ScrollView
						style={styles.scroll}
						contentContainerStyle={styles.scrollContent}
						showsVerticalScrollIndicator={false}
						refreshControl={
							<RefreshControl
								refreshing={isRefreshing}
								onRefresh={handleRefreshNavigationData}
								tintColor={Colors.primary[700]}
								colors={[Colors.primary[700]]}
								progressBackgroundColor="#FFFFFF"
							/>
						}
					>
						{farmsData.map((farm) => {
							const isExpanded = expandedFarmId === farm.fazenda_id;

							const visibleProjects = farm.projetos.slice(0, 3);
							const hiddenProjectsCount = Math.max(farm.projetos.length - 3, 0);

							return (
								<View key={farm.fazenda_id} style={styles.farmCard}>
									<TouchableOpacity
										activeOpacity={0.88}
										onPress={() => handleOpenFarmMap(farm)}
										style={styles.farmMainButton}
									>
										<View style={styles.farmIconBox}>
											<Ionicons
												name="navigate-outline"
												size={21}
												color="#FFFFFF"
											/>
										</View>

										<View style={styles.farmContent}>
											<Text style={styles.farmName} numberOfLines={1}>
												{farm.fazenda_nome}
											</Text>

											<Text style={styles.farmMeta} numberOfLines={1}>
												{farm.projetos.length}{" "}
												{farm.projetos.length === 1 ? "projeto" : "projetos"} ·{" "}
												{farm.total_parcelas} parcelas · {formatHa(farm.total_area)}
											</Text>

											<View style={styles.projectPreviewRow}>
												{visibleProjects.map((project) => (
													<View
														key={project.projeto_id}
														style={styles.projectMiniChip}
													>
														<Text
															style={styles.projectMiniChipText}
															numberOfLines={1}
														>
															{normalizeProjectName(project.projeto_nome)}
														</Text>
													</View>
												))}

												{hiddenProjectsCount > 0 && (
													<View style={styles.projectMoreChip}>
														<Text style={styles.projectMoreChipText}>
															+{hiddenProjectsCount}
														</Text>
													</View>
												)}
											</View>
										</View>

										<Ionicons
											name="chevron-forward"
											size={22}
											color="rgba(15,23,42,0.38)"
										/>
									</TouchableOpacity>

									<View style={styles.cardFooter}>
										<TouchableOpacity
											activeOpacity={0.82}
											onPress={() => handleToggleDetails(farm.fazenda_id)}
											style={styles.detailsButton}
										>
											<Text style={styles.detailsButtonText}>
												{isExpanded ? "Ocultar detalhes" : "Ver detalhes"}
											</Text>

											<Ionicons
												name={isExpanded ? "chevron-up" : "chevron-down"}
												size={16}
												color={Colors.primary[700]}
											/>
										</TouchableOpacity>

										<TouchableOpacity
											activeOpacity={0.88}
											onPress={() => handleOpenFarmMap(farm)}
											style={styles.openButton}
										>
											<Text style={styles.openButtonText}>Abrir mapa</Text>
										</TouchableOpacity>
									</View>

									{isExpanded && (
										<View style={styles.expandedBox}>
											<View style={styles.expandedMetricsRow}>
												<View style={styles.expandedMetric}>
													<Text style={styles.expandedMetricLabel}>Área total</Text>
													<Text style={styles.expandedMetricValue}>
														{formatHa(farm.total_area)}
													</Text>
												</View>

												<View style={styles.expandedMetric}>
													<Text style={styles.expandedMetricLabel}>Parcelas</Text>
													<Text style={styles.expandedMetricValue}>
														{farm.total_parcelas}
													</Text>
												</View>
											</View>

											<View style={styles.expandedProjects}>
												{farm.projetos.map((project) => {
													const hasMapCenter =
														!!project?.map_centro_id?.lat ||
														!!project?.map_centro_id?.latitude;

													return (
														<TouchableOpacity
															key={project.projeto_id}
															activeOpacity={0.84}
															onPress={() => handleOpenProjectMap(farm, project)}
															style={styles.expandedProjectRow}
														>
															<View
																style={[
																	styles.projectDot,
																	{
																		backgroundColor: hasMapCenter
																			? "#16A34A"
																			: "#CBD5E1",
																	},
																]}
															/>

															<Text
																style={styles.expandedProjectName}
																numberOfLines={1}
															>
																{project.projeto_nome}
															</Text>

															<Text style={styles.expandedProjectArea}>
																{formatHa(project.area_produtiva)}
															</Text>
														</TouchableOpacity>
													);
												})}
											</View>
										</View>
									)}
								</View>
							);
						})}
					</ScrollView>
				)}
			</View>
		</SafeAreaView>
	);
};

export default NavigationHomeScreen;

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: "#D6E3F3",
	},
	container: {
		flex: 1,
		backgroundColor: "#D6E3F3",
		paddingTop: Platform.OS === "android" ? 18 : 0,
	},
	header: {
		paddingHorizontal: 18,
		paddingTop: 10,
		paddingBottom: 10,
	},
	headerTextBox: {
		marginBottom: 10,
	},
	title: {
		color: Colors.primary[900],
		fontSize: 23,
		fontWeight: "900",
		letterSpacing: -0.5,
	},
	subtitle: {
		marginTop: 3,
		color: "rgba(15,23,42,0.62)",
		fontSize: 13,
		lineHeight: 18,
		fontWeight: "600",
	},
	headerActionsRow: {
		flexDirection: "row",
		alignItems: "center",
		flexWrap: "wrap",
		gap: 8,
	},
	summaryPill: {
		alignSelf: "flex-start",
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		backgroundColor: "rgba(255,255,255,0.82)",
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.08)",
		paddingHorizontal: 11,
		paddingVertical: 7,
		borderRadius: 999,
	},
	summaryPillText: {
		color: Colors.primary[800],
		fontSize: 12,
		fontWeight: "800",
	},
	homeFilterButton: {
		alignSelf: "flex-start",
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		backgroundColor: "rgba(255,255,255,0.82)",
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.08)",
		paddingHorizontal: 11,
		paddingVertical: 7,
		borderRadius: 999,
	},
	homeFilterButtonActive: {
		backgroundColor: "#72E6A1",
		borderColor: "#72E6A1",
	},
	homeFilterButtonWithFilters: {
		borderColor: "rgba(22,101,52,0.22)",
	},
	homeFilterButtonText: {
		color: Colors.primary[800],
		fontSize: 12,
		fontWeight: "900",
	},
	homeFilterButtonTextActive: {
		color: "#07130C",
	},
	homeFilterCountBadge: {
		minWidth: 18,
		height: 18,
		borderRadius: 9,
		backgroundColor: Colors.primary[700],
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 5,
		marginLeft: 1,
	},
	homeFilterCountBadgeText: {
		color: "#FFFFFF",
		fontSize: 10,
		fontWeight: "950",
	},
	filterInfoPill: {
		alignSelf: "flex-start",
		marginTop: 8,
		backgroundColor: "rgba(15,23,42,0.06)",
		borderRadius: 999,
		paddingHorizontal: 11,
		paddingVertical: 6,
	},
	filterInfoText: {
		color: "rgba(15,23,42,0.64)",
		fontSize: 11,
		fontWeight: "800",
	},
	appliedFiltersPill: {
		alignSelf: "flex-start",
		marginTop: 6,
		maxWidth: "100%",
		flexDirection: "row",
		alignItems: "center",
		gap: 5,
		backgroundColor: "rgba(255,255,255,0.78)",
		borderRadius: 999,
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.08)",
		paddingHorizontal: 10,
		paddingVertical: 6,
	},
	appliedFiltersText: {
		flexShrink: 1,
		color: Colors.primary[800],
		fontSize: 11,
		fontWeight: "850",
	},
	homeFiltersCardAnimated: {
		overflow: "hidden",
	},
	homeFiltersCard: {
		backgroundColor: "rgba(255,255,255,0.92)",
		borderRadius: 20,
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.08)",
		padding: 12,
		shadowColor: "#000",
		shadowOpacity: 0.08,
		shadowRadius: 14,
		shadowOffset: { width: 0, height: 7 },
		elevation: 2,
	},
	homeFiltersHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 10,
		gap: 12,
	},
	homeFiltersTitle: {
		color: "#0F172A",
		fontSize: 13,
		fontWeight: "950",
	},
	homeFiltersSubtitle: {
		marginTop: 1,
		color: "rgba(15,23,42,0.48)",
		fontSize: 10.5,
		fontWeight: "750",
	},
	homeFiltersHeaderActions: {
		flexDirection: "row",
		alignItems: "center",
		gap: 7,
	},
	homeFiltersClearButton: {
		borderRadius: 999,
		backgroundColor: "rgba(22,101,52,0.10)",
		paddingHorizontal: 10,
		paddingVertical: 6,
	},
	homeFiltersClear: {
		color: Colors.primary[700],
		fontSize: 12,
		fontWeight: "950",
	},
	homeFiltersCloseButton: {
		width: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: "rgba(15,23,42,0.06)",
		alignItems: "center",
		justifyContent: "center",
	},
	homeFilterSection: {
		marginBottom: 10,
	},
	homeFilterSectionLast: {
		marginBottom: 0,
	},
	homeFilterLabel: {
		color: "rgba(15,23,42,0.52)",
		fontSize: 10,
		fontWeight: "950",
		textTransform: "uppercase",
		letterSpacing: 0.6,
		marginBottom: 7,
	},
	homeChipsRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		paddingRight: 6,
	},
	homeFilterChip: {
		borderRadius: 999,
		paddingHorizontal: 11,
		paddingVertical: 7,
		backgroundColor: "rgba(15,23,42,0.055)",
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.07)",
	},
	homeFilterChipSelected: {
		backgroundColor: Colors.primary[700],
		borderColor: Colors.primary[700],
	},
	homeFilterChipText: {
		color: "rgba(15,23,42,0.68)",
		fontSize: 11.5,
		fontWeight: "900",
	},
	homeFilterChipTextSelected: {
		color: "#FFFFFF",
	},
	homeFilterChipDisabled: {
		borderRadius: 999,
		paddingHorizontal: 11,
		paddingVertical: 7,
		backgroundColor: "rgba(15,23,42,0.035)",
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.05)",
		opacity: 0.7,
	},
	homeFilterChipDisabledText: {
		color: "rgba(15,23,42,0.42)",
		fontSize: 11.5,
		fontWeight: "900",
	},
	homeFiltersFooter: {
		marginTop: 12,
		paddingTop: 10,
		borderTopWidth: 1,
		borderTopColor: "rgba(15,23,42,0.07)",
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 8,
	},
	homeFiltersFooterText: {
		flex: 1,
		color: "rgba(15,23,42,0.58)",
		fontSize: 10.5,
		fontWeight: "800",
	},
	homeFiltersResetContextButton: {
		borderRadius: 999,
		backgroundColor: "rgba(15,23,42,0.06)",
		paddingHorizontal: 10,
		paddingVertical: 6,
	},
	homeFiltersResetContextText: {
		color: "rgba(15,23,42,0.66)",
		fontSize: 11,
		fontWeight: "900",
	},
	refreshPill: {
		alignSelf: "flex-start",
		marginTop: 8,
		flexDirection: "row",
		alignItems: "center",
		gap: 9,
		backgroundColor: "rgba(255,255,255,0.86)",
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.07)",
		borderRadius: 16,
		paddingHorizontal: 10,
		paddingVertical: 8,
		shadowColor: "#000",
		shadowOpacity: 0.06,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 5 },
		elevation: 1,
	},
	refreshPillText: {
		color: Colors.primary[800],
		fontSize: 11.5,
		fontWeight: "900",
	},
	refreshPillSubText: {
		marginTop: 1,
		color: "rgba(15,23,42,0.46)",
		fontSize: 10.5,
		fontWeight: "700",
	},
	refreshSpinnerBox: {
		width: 28,
		height: 28,
		borderRadius: 999,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "rgba(255,255,255,0.86)",
	},
	emptyBox: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 28,
	},
	emptyScrollContent: {
		flexGrow: 1,
		paddingHorizontal: 28,
		paddingBottom: Platform.OS === "ios" ? 110 : 90,
	},
	emptyBoxInline: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 50,
	},
	emptyTitle: {
		marginTop: 10,
		color: "#0F172A",
		fontSize: 16,
		fontWeight: "900",
	},
	emptyText: {
		marginTop: 4,
		color: "rgba(15,23,42,0.56)",
		fontSize: 13,
		fontWeight: "700",
		textAlign: "center",
	},
	emptyClearButton: {
		marginTop: 14,
		backgroundColor: Colors.primary[700],
		borderRadius: 999,
		paddingHorizontal: 14,
		paddingVertical: 8,
	},
	emptyClearButtonText: {
		color: "#FFFFFF",
		fontSize: 12,
		fontWeight: "900",
	},
	scroll: {
		flex: 1,
	},
	scrollContent: {
		paddingHorizontal: 14,
		paddingTop: 2,
		paddingBottom: Platform.OS === "ios" ? 110 : 90,
	},
	farmCard: {
		backgroundColor: "#FFFFFF",
		borderRadius: 20,
		marginBottom: 10,
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.07)",
		shadowColor: "#000",
		shadowOpacity: 0.08,
		shadowRadius: 14,
		shadowOffset: { width: 0, height: 8 },
		elevation: 2,
		overflow: "hidden",
	},
	farmMainButton: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 14,
		paddingTop: 14,
		paddingBottom: 10,
	},
	farmIconBox: {
		width: 42,
		height: 42,
		borderRadius: 16,
		backgroundColor: Colors.primary[700],
		alignItems: "center",
		justifyContent: "center",
		marginRight: 11,
	},
	farmContent: {
		flex: 1,
		paddingRight: 8,
	},
	farmName: {
		color: "#0F172A",
		fontSize: 16,
		fontWeight: "900",
		letterSpacing: -0.25,
	},
	farmMeta: {
		marginTop: 2,
		color: "rgba(15,23,42,0.52)",
		fontSize: 12,
		fontWeight: "700",
	},
	projectPreviewRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		marginTop: 8,
	},
	projectMiniChip: {
		maxWidth: 92,
		backgroundColor: "rgba(15,23,42,0.05)",
		borderRadius: 999,
		paddingHorizontal: 8,
		paddingVertical: 4,
	},
	projectMiniChipText: {
		color: "rgba(15,23,42,0.66)",
		fontSize: 10.5,
		fontWeight: "800",
	},
	projectMoreChip: {
		backgroundColor: "rgba(22,101,52,0.10)",
		borderRadius: 999,
		paddingHorizontal: 8,
		paddingVertical: 4,
	},
	projectMoreChipText: {
		color: Colors.primary[800],
		fontSize: 10.5,
		fontWeight: "900",
	},
	cardFooter: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		borderTopWidth: 1,
		borderTopColor: "rgba(15,23,42,0.06)",
		paddingHorizontal: 14,
		paddingVertical: 10,
		backgroundColor: "rgba(248,250,252,0.72)",
	},
	detailsButton: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		paddingVertical: 4,
	},
	detailsButtonText: {
		color: Colors.primary[700],
		fontSize: 12,
		fontWeight: "900",
	},
	openButton: {
		backgroundColor: Colors.primary[700],
		borderRadius: 999,
		paddingHorizontal: 13,
		paddingVertical: 7,
	},
	openButtonText: {
		color: "#FFFFFF",
		fontSize: 12,
		fontWeight: "900",
	},
	expandedBox: {
		paddingHorizontal: 14,
		paddingTop: 12,
		paddingBottom: 14,
		backgroundColor: "#FFFFFF",
	},
	expandedMetricsRow: {
		flexDirection: "row",
		gap: 8,
		marginBottom: 12,
	},
	expandedMetric: {
		flex: 1,
		borderRadius: 14,
		padding: 10,
		backgroundColor: "rgba(15,23,42,0.035)",
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.06)",
	},
	expandedMetricLabel: {
		color: "rgba(15,23,42,0.48)",
		fontSize: 10,
		fontWeight: "800",
		textTransform: "uppercase",
		letterSpacing: 0.5,
	},
	expandedMetricValue: {
		marginTop: 3,
		color: "#0F172A",
		fontSize: 13,
		fontWeight: "900",
	},
	expandedProjects: {
		gap: 7,
	},
	expandedProjectRow: {
		flexDirection: "row",
		alignItems: "center",
		minHeight: 30,
	},
	projectDot: {
		width: 7,
		height: 7,
		borderRadius: 4,
		marginRight: 8,
	},
	expandedProjectName: {
		flex: 1,
		color: "rgba(15,23,42,0.74)",
		fontSize: 12,
		fontWeight: "800",
	},
	expandedProjectArea: {
		color: "rgba(15,23,42,0.52)",
		fontSize: 11,
		fontWeight: "800",
		marginLeft: 8,
	},
	skeletonContainer: {
		flex: 1,
		paddingHorizontal: 14,
		paddingTop: 2,
		paddingBottom: Platform.OS === "ios" ? 110 : 90,
	},
	skeletonCard: {
		backgroundColor: "rgba(255,255,255,0.74)",
		borderRadius: 20,
		marginBottom: 10,
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.06)",
		overflow: "hidden",
	},
	skeletonMainRow: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 14,
		paddingTop: 14,
		paddingBottom: 12,
	},
	skeletonIcon: {
		width: 42,
		height: 42,
		borderRadius: 16,
		backgroundColor: "rgba(15,23,42,0.08)",
		marginRight: 11,
	},
	skeletonContent: {
		flex: 1,
	},
	skeletonTitle: {
		width: "62%",
		height: 15,
		borderRadius: 999,
		backgroundColor: "rgba(15,23,42,0.09)",
	},
	skeletonMeta: {
		width: "82%",
		height: 10,
		borderRadius: 999,
		backgroundColor: "rgba(15,23,42,0.065)",
		marginTop: 8,
	},
	skeletonChipRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		marginTop: 10,
	},
	skeletonChip: {
		width: 78,
		height: 20,
		borderRadius: 999,
		backgroundColor: "rgba(15,23,42,0.06)",
	},
	skeletonChipSmall: {
		width: 54,
		height: 20,
		borderRadius: 999,
		backgroundColor: "rgba(15,23,42,0.055)",
	},
	skeletonFooter: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		borderTopWidth: 1,
		borderTopColor: "rgba(15,23,42,0.05)",
		paddingHorizontal: 14,
		paddingVertical: 10,
		backgroundColor: "rgba(248,250,252,0.54)",
	},
	skeletonFooterText: {
		width: 94,
		height: 12,
		borderRadius: 999,
		backgroundColor: "rgba(15,23,42,0.06)",
	},
	skeletonButton: {
		width: 86,
		height: 28,
		borderRadius: 999,
		backgroundColor: "rgba(22,101,52,0.12)",
	},
});