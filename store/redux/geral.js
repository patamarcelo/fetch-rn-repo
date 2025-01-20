import { createSlice } from "@reduxjs/toolkit";

const initialState = {
	fazendas: [],
	selectedFarm: "",
	programsAvaiable: [],
	selectedProgram: null,
	estagiosProgram: [],
	dataProgram: [],
	plantioData: [],
	farmBoxData: [],
	areaTotal: [],
	mapDataPlot: [],
	farmboxSearchBar: false,
	farmBoxSearchQuery: '',
};

const geralSlice = createSlice({
	name: "geral",
	initialState,
	reducers: {
		setFarmBoxData: (state, action) => {
			state.farmBoxData = action.payload
		},
		setDataPlantio: (state, action) => {
			state.plantioData = action.payload
		},
		setFarms: (state, action) => {
			state.fazendas = action.payload;
		},
		selectedFarm: (state, action) => {
			state.selectedFarm = action.payload;
		},
		setProgramsAvaiable: (state, action) => {
			state.programsAvaiable = action.payload;
		},
		setSelectedProgram: (state, action) => {
			state.selectedProgram = action.payload;
		},
		setEstagiosProgram: (state, action) => {
			state.estagiosProgram = action.payload;
		},
		setDataProgram: (state, action) => {
			state.dataProgram = action.payload;
		},
		setAreaTotal: (state, action) => {
			state.areaTotal = action.payload;
		},
		setMapPlot: (state, action) => {
			state.mapDataPlot = action.payload;
		},
		setFarmboxSearchBar: (state, action) => {
			state.farmboxSearchBar = action.payload
		},
		setFarmboxSearchQuery: (state, action) => {
			state.farmBoxSearchQuery = action.payload
		},
	}
});

export const geralActions = geralSlice.actions;

export default geralSlice.reducer;
