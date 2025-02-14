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
    (colheitaData, colheitaDataFilterSelected) => {
        // return colheitaData
        if (!colheitaDataFilterSelected?.farm || !colheitaDataFilterSelected?.proj || !colheitaDataFilterSelected?.variety) {
            return colheitaData
        }
        if (!colheitaData || !colheitaDataFilterSelected) return colheitaData;
        let newObj = { ...colheitaData }
        if (colheitaDataFilterSelected?.variety?.length > 0) {
            const dataFiltered = colheitaData.data.filter((data) => colheitaDataFilterSelected.variety.includes(data.variedade__nome_fantasia))
            const onlyProjs = dataFiltered.map((data) => data.talhao__fazenda__nome)

            const groupedFiltered = colheitaData.grouped_data.filter((data) => onlyProjs.includes(data.farm)).map((data) => {
                const variedades = data.variedades.filter((data) => colheitaDataFilterSelected?.variety.includes((data.variedade)))
                return ({
                    ...data,
                    ['variedades']: variedades
                }
                )
            })

            newObj['data'] = dataFiltered
            newObj['grouped_data'] = groupedFiltered
            console.log('newFIlteredDATA: ', dataFiltered )
            console.log('newFIlteredDATA: ', dataFiltered.length )
        } else {
            newObj = { ...colheitaData }
        }
        if (colheitaDataFilterSelected?.farm?.length > 0) {
            const dataFiltered = newObj.data.filter((data) => colheitaDataFilterSelected.farm.includes(data.talhao__fazenda__fazenda__nome))
            const onlyProjs = dataFiltered.map((data) => data.talhao__fazenda__nome)

            const groupedFiltered = newObj.grouped_data.filter((data) => onlyProjs.includes(data.farm))

            newObj['data'] = dataFiltered
            newObj['grouped_data'] = groupedFiltered
        }
        if (colheitaDataFilterSelected?.proj?.length > 0) {
            const dataFiltered = newObj.data.filter((data) => colheitaDataFilterSelected.proj.includes(data.talhao__fazenda__nome))
            const onlyProjs = dataFiltered.map((data) => data.talhao__fazenda__nome)
            const groupedFiltered = newObj.grouped_data.filter((data) => onlyProjs.includes(data.farm))

            newObj['data'] = dataFiltered
            newObj['grouped_data'] = groupedFiltered
        }
        return newObj
    }
);

