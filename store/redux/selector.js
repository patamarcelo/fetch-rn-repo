import { createSelector } from 'reselect';

export const farmsSelector = (state) => state.geral.fazendas;

export const farmsSelected = (state) => state.geral.selectedFarm;

export const programasSelector = (state) => state.geral.programsAvaiable;

export const programSelector = (state) => state.geral.selectedProgram;

export const estagiosSelector = (state) => state.geral.estagiosProgram;

export const dataProgramSelector = (state) => state.geral.dataProgram;

export const selectDataPlantio = (state) => state.geral.plantioData

export const selectFarmBoxData = (state) => state.geral.farmBoxData

export const selectAreaTotal = (state) => state.geral.areaTotal

export const selectMapDataPlot = (state) => state.geral.mapDataPlot

export const selectFarmboxSearchBar = (state) => state.geral.farmboxSearchBar

export const selectFarmboxSearchQuery = (state) => state.geral.farmBoxSearchQuery

export const selectColheitaDataFilter = (state) => state.geral.colheitaData.filter_data

export const selectColheitaDataToggle = (state) => state.geral.colheitaDataFilterSelected

export const selectCurrentFilterSelected = (state) => state.geral.currentFilterSelected


export const selectExportStatus = (state) => state.auth.status;
export const selectPlotMapData  = (state) => state.auth.dataPlotMap;




// export const selectColheitaData = (state) => state.geral.colheitaData

// Create a selector that automatically applies filters
export const selectColheitaData = createSelector(
    [state => state.geral.colheitaData, state => state.geral.colheitaDataFilterSelected],
    (colheitaData, filters) => {
        if (!colheitaData || !filters) return colheitaData;

        let filteredData = [...colheitaData.data];
        let filteredGrouped = [...colheitaData.grouped_data];

        // Filtrar por variedade
        const localFilters = { ...filters };

        if (localFilters.variety?.length > 0) {
            filteredData = filteredData.filter(data =>
                localFilters.variety.includes(data.variedade__nome_fantasia)
            );

            // Inferir culturas, se não estiverem definidas
            if (!localFilters.culture?.length) {
                const inferredCultures = [
                    ...new Set(filteredData.map(data => data.variedade__cultura__cultura)),
                ];
                localFilters.culture = inferredCultures;
            }

            filteredGrouped = filteredGrouped
                .filter(group =>
                    filteredData.some(d => d.talhao__fazenda__nome === group.farm)
                )
                .map(group => ({
                    ...group,
                    variedades: group.variedades.filter(v =>
                        localFilters.variety.includes(v.variedade)
                    ),
                }));
        }

        // Filtro de cultura (inclui agora os inferidos)
        if (localFilters.culture?.length > 0) {
            filteredData = filteredData.filter(data =>
                localFilters.culture.includes(data.variedade__cultura__cultura)
            );

            filteredGrouped = filteredGrouped
                .filter(group =>
                    filteredData.some(d => d.talhao__fazenda__nome === group.farm)
                )
                .map(group => ({
                    ...group,
                    culturas: group.culturas.filter(c =>
                        localFilters.culture.includes(c.cultura)
                    ),
                }));
        }

        // Filtrar por fazenda
        if (filters.farm?.length > 0) {
            filteredData = filteredData.filter(data =>
                filters.farm.includes(data.talhao__fazenda__fazenda__nome)
            );

            filteredGrouped = filteredGrouped.filter(group =>
                filteredData.some(d => d.talhao__fazenda__nome === group.farm)
            );
        }

        // Filtrar por projeto
        if (filters.proj?.length > 0) {
            filteredData = filteredData.filter(data =>
                filters.proj.includes(data.talhao__fazenda__nome)
            );

            filteredGrouped = filteredGrouped.filter(group =>
                filters.proj.includes(group.farm)
            );
        }

        return {
            ...colheitaData,
            data: filteredData,
            grouped_data: filteredGrouped,
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


export const selectNavigationMapSelectedParcels = (state) =>
	state.geral.navigationMapSelectedParcels;

export const selectNavigationMapByKey = (state) => state.geral.navigationMapByKey;

export const selectNavigationMapFiltersIndex = (state) =>
	state.geral.navigationMapFiltersIndex || [];

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

export const selectFilteredNavigationMapData = createSelector(
	[
		selectNavigationMapData,
		selectNavigationMapSelectedFarm,
		selectNavigationMapSelectedProject,
		selectNavigationMapFilterSelected,
	],
	(data, selectedFarm, selectedProject, filters) => {
		if (!data) return [];

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
	[selectNavigationMapData, selectNavigationMapSelectedParcels],
	(data, selectedParcels) => {
		if (!data || !selectedParcels?.length) return [];

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


export const selectNavigationMapFilterSelected = (state) =>
	state.geral.navigationMapFilterSelected || {
		fazenda: [],
		projeto: [],
		cultura: [],
		variedade: [],
		status: [],
	};