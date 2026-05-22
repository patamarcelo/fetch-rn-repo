import { createSelector } from "reselect";

const EMPTY_OBJECT = {};
const EMPTY_ARRAY = [];

const EMPTY_NAVIGATION_FILTERS = {
	fazenda: [],
	projeto: [],
	cultura: [],
	variedade: [],
	status: [],
};

export const farmsSelector = (state) => state.geral.fazendas;

export const farmsSelected = (state) => state.geral.selectedFarm;

export const programasSelector = (state) => state.geral.programsAvaiable;

export const programSelector = (state) => state.geral.selectedProgram;

export const estagiosSelector = (state) => state.geral.estagiosProgram;

export const dataProgramSelector = (state) => state.geral.dataProgram;

export const selectDataPlantio = (state) => state.geral.plantioData;

export const selectFarmBoxData = (state) => state.geral.farmBoxData;

export const selectAreaTotal = (state) => state.geral.areaTotal;

export const selectMapDataPlot = (state) => state.geral.mapDataPlot;

export const selectFarmboxSearchBar = (state) => state.geral.farmboxSearchBar;

export const selectFarmboxSearchQuery = (state) => state.geral.farmBoxSearchQuery;

export const selectRawColheitaData = (state) => state.geral.colheitaData || null;

export const selectColheitaDataToggle = (state) =>
	state.geral.colheitaDataFilterSelected || EMPTY_OBJECT;

export const selectCurrentFilterSelected = (state) =>
	state.geral.currentFilterSelected || null;

export const selectExportStatus = (state) => state.auth.status;

export const selectPlotMapData = (state) => state.auth.dataPlotMap;

const normalizeString = (value) => {
	if (value === undefined || value === null) return "";
	return String(value).trim();
};

const normalizeLower = (value) => normalizeString(value).toLowerCase();

const makeSafraCicloKey = (item = {}) => {
	const nome = normalizeString(item?.nome || item?.label);
	const safra = normalizeString(item?.safra);
	const ciclo = normalizeString(item?.ciclo);

	return `${nome}|${safra}|${ciclo}`;
};

const parseSafraCicloKey = (key) => {
	const parts = String(key || "").split("|");

	return {
		nome: normalizeString(parts[0]),
		safra: normalizeString(parts[1]),
		ciclo: normalizeString(parts[2]),
	};
};

const getRowSafra = (row = {}) => {
	return normalizeString(
		row?.safra__safra ??
		row?.plantio__safra__safra ??
		row?.safra ??
		row?.safra_nome
	);
};

const getRowCiclo = (row = {}) => {
	return normalizeString(
		row?.ciclo__ciclo ??
		row?.plantio__ciclo__ciclo ??
		row?.ciclo ??
		row?.ciclo_nome
	);
};

const rowMatchesSafraCiclo = (row = {}, selectedKeys = []) => {
	if (!selectedKeys?.length) return true;

	const rowSafra = getRowSafra(row);
	const rowCiclo = getRowCiclo(row);

	return selectedKeys.some((key) => {
		const selected = parseSafraCicloKey(key);

		return selected.safra === rowSafra && selected.ciclo === rowCiclo;
	});
};

const uniqueSorted = (arr = []) => {
	return [...new Set(arr.filter(Boolean))].sort((a, b) =>
		String(a).localeCompare(String(b))
	);
};

const buildVarietyOptions = (rows = []) => {
	const map = new Map();

	rows.forEach((row) => {
		const variety = row?.variedade__nome_fantasia;
		const culture = row?.variedade__cultura__cultura;

		if (!variety) return;

		const key = `${variety}|${culture || ""}`;

		if (!map.has(key)) {
			map.set(key, {
				variety,
				culture,
			});
		}
	});

	return Array.from(map.values()).sort((a, b) =>
		String(a.variety || "").localeCompare(String(b.variety || ""))
	);
};

const getDefaultSafraCicloKey = (colheitaData) => {
	const options = Array.isArray(colheitaData?.filter_data?.safra_ciclo)
		? colheitaData.filter_data.safra_ciclo
		: EMPTY_ARRAY;

	const selectedFromApi = colheitaData?.selected_safra_ciclo;

	if (selectedFromApi?.safra && selectedFromApi?.ciclo) {
		const matched = options.find(
			(item) =>
				normalizeString(item?.safra) === normalizeString(selectedFromApi.safra) &&
				normalizeString(item?.ciclo) === normalizeString(selectedFromApi.ciclo)
		);

		if (matched) return makeSafraCicloKey(matched);

		return makeSafraCicloKey(selectedFromApi);
	}

	const colheitaOption = options.find(
		(item) => normalizeString(item?.nome || item?.label) === "Colheita"
	);

	if (colheitaOption) return makeSafraCicloKey(colheitaOption);

	const plantioOption = options.find(
		(item) => normalizeString(item?.nome || item?.label) === "Plantio"
	);

	if (plantioOption) return makeSafraCicloKey(plantioOption);

	if (options[0]) return makeSafraCicloKey(options[0]);

	return null;
};


const getEffectiveColheitaFilters = (colheitaData, filters = EMPTY_OBJECT) => {
	const effectiveFilters = {
		safra_ciclo: Array.isArray(filters?.safra_ciclo)
			? filters.safra_ciclo
			: EMPTY_ARRAY,
		farm: Array.isArray(filters?.farm) ? filters.farm : EMPTY_ARRAY,
		proj: Array.isArray(filters?.proj) ? filters.proj : EMPTY_ARRAY,
		culture: Array.isArray(filters?.culture) ? filters.culture : EMPTY_ARRAY,
		variety: Array.isArray(filters?.variety) ? filters.variety : EMPTY_ARRAY,
	};

	if (!effectiveFilters.safra_ciclo.length) {
		const defaultKey = getDefaultSafraCicloKey(colheitaData);

		if (defaultKey) {
			effectiveFilters.safra_ciclo = [defaultKey];
		}
	}

	return effectiveFilters;
};

const applyColheitaFiltersToRows = (rows = EMPTY_ARRAY, filters = EMPTY_OBJECT) => {
	let filteredData = Array.isArray(rows) ? [...rows] : [];

	const safraCicloFilter =
		filters?.safra_ciclo?.length > 0 ? filters.safra_ciclo : null;

	const farmFilter = filters?.farm?.length > 0 ? filters.farm : null;
	const projFilter = filters?.proj?.length > 0 ? filters.proj : null;
	const cultureFilter = filters?.culture?.length > 0 ? filters.culture : null;
	const varietyFilter = filters?.variety?.length > 0 ? filters.variety : null;

	if (safraCicloFilter) {
		filteredData = filteredData.filter((row) =>
			rowMatchesSafraCiclo(row, safraCicloFilter)
		);
	}

	if (farmFilter) {
		filteredData = filteredData.filter((row) =>
			farmFilter.includes(row?.talhao__fazenda__fazenda__nome)
		);
	}

	if (projFilter) {
		filteredData = filteredData.filter((row) =>
			projFilter.includes(row?.talhao__fazenda__nome)
		);
	}

	if (cultureFilter) {
		filteredData = filteredData.filter((row) =>
			cultureFilter.includes(row?.variedade__cultura__cultura)
		);
	}

	if (varietyFilter) {
		filteredData = filteredData.filter((row) =>
			varietyFilter.includes(row?.variedade__nome_fantasia)
		);
	}

	return filteredData;
};

const roundPercent = (value) => {
	const n = Number(value || 0);

	if (!Number.isFinite(n)) return 0;

	return Math.round(n * 100) / 100;
};

const getActiveContextName = (filters = EMPTY_OBJECT) => {
	const selectedKey = filters?.safra_ciclo?.[0];

	if (!selectedKey) return "";

	const parsed = parseSafraCicloKey(selectedKey);

	return normalizeLower(parsed?.nome);
};

const getIsPlantioModeFromFilters = (filters = EMPTY_OBJECT) => {
	return getActiveContextName(filters).includes("plantio");
};

const isTruthyValue = (value) => {
	if (value === true) return true;
	if (value === 1) return true;

	const normalized = normalizeLower(value);

	return (
		normalized === "true" ||
		normalized === "1" ||
		normalized === "sim" ||
		normalized === "yes"
	);
};

const getRowPlantado = (row = {}) => {
	if (!isTruthyValue(row?.inicializado_plantio)) return 0;

	return Number(row?.area_colheita || 0);
};

const getRowPrevisto = (row = {}, isPlantioMode = false) => {
	if (isPlantioMode) {
		return Number(
			row?.area_planejamento_plantio ??
			row?.area_colheita ??
			0
		);
	}

	// No modo Colheita, o "Previsto" do card geral vira "Plantado".
	// Então também precisa respeitar inicializado_plantio.
	return getRowPlantado(row);
};

const getRowRealizado = (row = {}, isPlantioMode = false) => {
	if (isPlantioMode) {
		// No modo Plantio, "Plantado" só conta talhão iniciado.
		return getRowPlantado(row);
	}

	// No modo Colheita, "Colhido" continua sendo area_parcial.
	return Number(row?.area_parcial || 0);
};


const getRowPesoLiquido = (row = {}) => {
	if (Array.isArray(row?.cargas)) {
		return row.cargas.reduce((acc, carga) => {
			return acc + Number(carga?.total_peso_liquido || 0);
		}, 0);
	}

	return 0;
};

const groupColheitaRows = (rows = EMPTY_ARRAY, isPlantioMode = false) => {
	const map = new Map();

	rows.forEach((row) => {
		const farm = row?.talhao__fazenda__nome || "Sem projeto";

		if (!map.has(farm)) {
			map.set(farm, {
				farm,
				colheita: 0,
				parcial: 0,
				previsto: 0,
				realizado: 0,
				plantado: 0,
				peso_liquido: 0,
				variedades: [],
				culturas: [],
				_variedadeMap: new Map(),
				_culturaMap: new Map(),
			});
		}

		const group = map.get(farm);

		const previsto = getRowPrevisto(row, isPlantioMode);
		const realizado = getRowRealizado(row, isPlantioMode);
		const pesoLiquido = getRowPesoLiquido(row);

		const variedade = row?.variedade__nome_fantasia || "Sem variedade";
		const cultura = row?.variedade__cultura__cultura || "Sem cultura";

		group.colheita += previsto;
		group.parcial += realizado;
		group.previsto += previsto;
		group.realizado += realizado;
		group.plantado += realizado;
		group.peso_liquido += pesoLiquido;

		if (!group._variedadeMap.has(variedade)) {
			group._variedadeMap.set(variedade, {
				variedade,
				cultura,
				colheita: 0,
				parcial: 0,
				previsto: 0,
				realizado: 0,
				plantado: 0,
				percent: 0,
			});
		}

		const varietyItem = group._variedadeMap.get(variedade);

		varietyItem.colheita += previsto;
		varietyItem.parcial += realizado;
		varietyItem.previsto += previsto;
		varietyItem.realizado += realizado;
		varietyItem.plantado += realizado;
		varietyItem.percent =
			varietyItem.previsto > 0
				? roundPercent((varietyItem.realizado / varietyItem.previsto) * 100)
				: 0;

		if (!group._culturaMap.has(cultura)) {
			group._culturaMap.set(cultura, {
				cultura,
				colheita: 0,
				parcial: 0,
				previsto: 0,
				realizado: 0,
				plantado: 0,
				percent: 0,
			});
		}

		const cultureItem = group._culturaMap.get(cultura);

		cultureItem.colheita += previsto;
		cultureItem.parcial += realizado;
		cultureItem.previsto += previsto;
		cultureItem.realizado += realizado;
		cultureItem.plantado += realizado;
		cultureItem.percent =
			cultureItem.previsto > 0
				? roundPercent((cultureItem.realizado / cultureItem.previsto) * 100)
				: 0;
	});

	return Array.from(map.values())
		.map((group) => {
			const variedades = Array.from(group._variedadeMap.values()).sort((a, b) =>
				String(a.variedade || "").localeCompare(String(b.variedade || ""))
			);

			const culturas = Array.from(group._culturaMap.values()).sort((a, b) =>
				String(a.cultura || "").localeCompare(String(b.cultura || ""))
			);

			const { _variedadeMap, _culturaMap, ...cleanGroup } = group;

			return {
				...cleanGroup,
				variedades,
				culturas,
			};
		})
		.sort((a, b) => String(a.farm || "").localeCompare(String(b.farm || "")));
};


export const selectColheitaDataFilter = createSelector(
	[selectRawColheitaData, selectColheitaDataToggle],
	(colheitaData, filters) => {
		const rawFilterData = colheitaData?.filter_data || EMPTY_OBJECT;
		const rawRows = Array.isArray(colheitaData?.data)
			? colheitaData.data
			: EMPTY_ARRAY;

		const safraCicloOptions = Array.isArray(rawFilterData?.safra_ciclo)
			? rawFilterData.safra_ciclo
			: EMPTY_ARRAY;

		const effectiveFilters = getEffectiveColheitaFilters(colheitaData, filters);

		const rowsBySafraCiclo = applyColheitaFiltersToRows(rawRows, {
			safra_ciclo: effectiveFilters.safra_ciclo,
		});

		const rowsBySafraCicloFarm = applyColheitaFiltersToRows(rawRows, {
			safra_ciclo: effectiveFilters.safra_ciclo,
			farm: effectiveFilters.farm,
		});

		const rowsBySafraCicloProject = applyColheitaFiltersToRows(rawRows, {
			safra_ciclo: effectiveFilters.safra_ciclo,
			farm: effectiveFilters.farm,
			proj: effectiveFilters.proj,
		});

		const rowsBySafraCicloProjectCulture = applyColheitaFiltersToRows(rawRows, {
			safra_ciclo: effectiveFilters.safra_ciclo,
			farm: effectiveFilters.farm,
			proj: effectiveFilters.proj,
			culture: effectiveFilters.culture,
		});

		return {
			...rawFilterData,
			safra_ciclo: safraCicloOptions,
			farm: uniqueSorted(
				rowsBySafraCiclo.map((row) => row?.talhao__fazenda__fazenda__nome)
			),
			proj: uniqueSorted(
				rowsBySafraCicloFarm.map((row) => row?.talhao__fazenda__nome)
			),
			culture: uniqueSorted(
				rowsBySafraCicloProject.map(
					(row) => row?.variedade__cultura__cultura
				)
			),
			variety: buildVarietyOptions(rowsBySafraCicloProjectCulture),
		};
	}
);

export const selectColheitaActiveSafraCiclo = createSelector(
	[selectRawColheitaData, selectColheitaDataToggle],
	(colheitaData, filters) => {
		const options = Array.isArray(colheitaData?.filter_data?.safra_ciclo)
			? colheitaData.filter_data.safra_ciclo
			: EMPTY_ARRAY;

		const selectedKey =
			filters?.safra_ciclo?.[0] || getDefaultSafraCicloKey(colheitaData);

		if (selectedKey) {
			const selected = options.find((item) => makeSafraCicloKey(item) === selectedKey);

			if (selected) return selected;

			const parsed = parseSafraCicloKey(selectedKey);

			if (parsed.safra && parsed.ciclo) {
				return parsed;
			}
		}

		return null;
	}
);

export const selectColheitaData = createSelector(
	[selectRawColheitaData, selectColheitaDataToggle],
	(colheitaData, filters) => {
		if (!colheitaData) return colheitaData;

		const rawRows = Array.isArray(colheitaData?.data)
			? colheitaData.data
			: EMPTY_ARRAY;

		const effectiveFilters = getEffectiveColheitaFilters(colheitaData, filters);
		const isPlantioMode = getIsPlantioModeFromFilters(effectiveFilters);

		const filteredData = applyColheitaFiltersToRows(rawRows, effectiveFilters);

		return {
			...colheitaData,
			data: filteredData,
			grouped_data: groupColheitaRows(filteredData, isPlantioMode),
			_isPlantioMode: isPlantioMode,
		};
	}
);


export const selectColheitaTotals = createSelector(
	[selectColheitaData],
	(colheitaData) => {
		const rows = Array.isArray(colheitaData?.data)
			? colheitaData.data
			: EMPTY_ARRAY;

		const isPlantioMode = colheitaData?._isPlantioMode === true;

		const previsto = rows.reduce(
			(acc, row) => acc + getRowPrevisto(row, isPlantioMode),
			0
		);

		const realizado = rows.reduce(
			(acc, row) => acc + getRowRealizado(row, isPlantioMode),
			0
		);

		const pesoLiquido = rows.reduce((acc, row) => {
			return acc + getRowPesoLiquido(row);
		}, 0);

		const scsTotal = pesoLiquido > 0 ? pesoLiquido / 60 : 0;
		const mediaGeral = realizado > 0 ? scsTotal / realizado : 0;
		const saldo = previsto - realizado;

		const percent =
			previsto > 0 ? Math.round((realizado / previsto) * 10000) / 100 : 0;

		return {
			previsto,
			realizado,
			plantado: realizado,
			colhido: realizado,
			saldo,
			percent,
			pesoLiquido,
			scsTotal,
			mediaGeral,
		};
	}
);


export const selectNavigationMapData = (state) => state.geral.navigationMapData;

export const selectNavigationMapFilters = (state) => state.geral.navigationMapFilters;

export const selectNavigationMapTotals = (state) => state.geral.navigationMapTotals;

export const selectNavigationMapStatus = (state) => state.geral.navigationMapStatus;

export const selectNavigationMapError = (state) => state.geral.navigationMapError;

export const selectNavigationMapCurrentSafra = (state) =>
	state.geral.navigationMapCurrentSafra;

export const selectNavigationMapCurrentCiclo = (state) =>
	state.geral.navigationMapCurrentCiclo;

export const selectNavigationMapSelectedFarm = (state) =>
	state.geral.navigationMapSelectedFarm;

export const selectNavigationMapSelectedProject = (state) =>
	state.geral.navigationMapSelectedProject;

export const selectNavigationSelectedParcels = (state) =>
	state.geral.navigationMapSelectedParcels;

export const selectNavigationMapByKey = (state) => state.geral.navigationMapByKey;

export const selectNavigationMapFiltersIndex = (state) =>
	state.geral.navigationMapFiltersIndex || EMPTY_ARRAY;

export const selectNavigationMapCurrentKey = createSelector(
	[selectNavigationMapCurrentSafra, selectNavigationMapCurrentCiclo],
	(safra, ciclo) => {
		if (!safra || !ciclo) return null;
		return `${safra}__${ciclo}`;
	}
);

export const selectNavigationMapCurrentCache = createSelector(
	[selectNavigationMapByKey, selectNavigationMapCurrentKey],
	(byKey, key) => {
		if (!key) return null;
		return byKey?.[key] || null;
	}
);

export const selectNavigationMapFilterSelected = (state) =>
	state.geral.navigationMapFilterSelected || EMPTY_NAVIGATION_FILTERS;

export const selectFilteredNavigationMapData = createSelector(
	[
		selectNavigationMapData,
		selectNavigationMapSelectedFarm,
		selectNavigationMapSelectedProject,
		selectNavigationMapFilterSelected,
	],
	(data, selectedFarm, selectedProject, filters) => {
		if (!data) return EMPTY_ARRAY;

		let filtered = [...data];

		if (selectedFarm) {
			filtered = filtered.filter((item) => item.fazenda_grupo === selectedFarm);
		}

		if (selectedProject) {
			filtered = filtered.filter((item) => item.projeto === selectedProject);
		}

		if (filters?.fazenda?.length > 0) {
			filtered = filtered.filter((item) =>
				filters.fazenda.includes(item.fazenda_grupo)
			);
		}

		if (filters?.projeto?.length > 0) {
			filtered = filtered.filter((item) =>
				filters.projeto.includes(item.projeto)
			);
		}

		if (filters?.cultura?.length > 0) {
			filtered = filtered.filter((item) =>
				filters.cultura.includes(item.cultura)
			);
		}

		if (filters?.variedade?.length > 0) {
			filtered = filtered.filter((item) =>
				filters.variedade.includes(item.variedade)
			);
		}

		if (filters?.status?.length > 0) {
			filtered = filtered.filter((item) =>
				filters.status.includes(item.status)
			);
		}

		return filtered;
	}
);

export const selectNavigationSelectedParcelsData = createSelector(
	[selectNavigationMapData, selectNavigationSelectedParcels],
	(data, selectedParcels) => {
		if (!data || !selectedParcels?.length) return EMPTY_ARRAY;

		return data.filter((item) => {
			const id = item.id_farmbox || item.id;
			return selectedParcels.includes(id);
		});
	}
);

export const selectNavigationSelectedAreaTotal = createSelector(
	[selectNavigationSelectedParcelsData],
	(selectedData) => {
		return selectedData.reduce((total, item) => {
			return total + Number(item.area || 0);
		}, 0);
	}
);

export const selectNavigationMapFiltersIndexFromCache = createSelector(
	[selectNavigationMapByKey, selectNavigationMapFiltersIndex],
	(byKey, currentIndex) => {
		const rows = [];

		if (Array.isArray(currentIndex)) {
			rows.push(...currentIndex);
		}

		Object.values(byKey || {}).forEach((cacheItem) => {
			if (Array.isArray(cacheItem?.filters_index)) {
				rows.push(...cacheItem.filters_index);
			}
		});

		const map = new Map();

		rows.forEach((item) => {
			const key = [
				item?.fazenda_grupo || "fazenda",
				item?.projeto || "projeto",
				item?.safra || "safra",
				item?.ciclo || "ciclo",
				item?.cultura || "cultura",
				item?.variedade || "variedade",
				item?.status || "status",
			].join("__");

			if (!map.has(key)) {
				map.set(key, item);
			}
		});

		return Array.from(map.values());
	}
);