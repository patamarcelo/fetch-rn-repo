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




// export const selectColheitaData = (state) => state.geral.colheitaData

// Create a selector that automatically applies filters
export const selectColheitaData = createSelector(
    [state => state.geral.colheitaData, state => state.geral.colheitaDataFilterSelected],
    (colheitaData, filters) => {
        if (!colheitaData || !filters) return colheitaData;

        let filteredData = [...colheitaData.data];
        let filteredGrouped = [...colheitaData.grouped_data];

        // Filtrar por variedade
        if (filters.variety?.length > 0) {
            filteredData = filteredData.filter(data =>
                filters.variety.includes(data.variedade__nome_fantasia)
            );

            filteredGrouped = filteredGrouped
                .filter(group =>
                    filteredData.some(d => d.talhao__fazenda__nome === group.farm)
                )
                .map(group => ({
                    ...group,
                    variedades: group.variedades.filter(v =>
                        filters.variety.includes(v.variedade)
                    ),
                }));
        }

        // Filtrar por cultura
        if (filters.culture?.length > 0) {
            filteredData = filteredData.filter(data =>
                filters.culture.includes(data.variedade__cultura__cultura)
            );

            filteredGrouped = filteredGrouped
                .filter(group =>
                    filteredData.some(d => d.talhao__fazenda__nome === group.farm)
                )
                .map(group => ({
                    ...group,
                    culturas: group.culturas.filter(c =>
                        filters.culture.includes(c.cultura)
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