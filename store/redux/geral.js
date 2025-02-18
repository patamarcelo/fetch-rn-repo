import { createSlice } from "@reduxjs/toolkit";
import { logout } from "./authSlice";

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
	colheitaData: null,
	colheitaDataFilterSelected: null,
	currentFilterSelected: null
};

const geralSlice = createSlice({
	name: "geral",
	initialState,
	reducers: {
		resetData: () => initialState,
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
		setColheitaData: (state, action) => {
			state.colheitaData = action.payload
		},
		clearColheitaFilter: (state, action) => {
			state.colheitaDataFilterSelected = null
		},
		setColheitaFilter: (state, action) => {
			const { key, value } = action.payload; // key = "farm" | "proj" | "variety", value = item to toggle

			// Initialize colheitaDataFilterSelected if null
			if (!state.colheitaDataFilterSelected) {
				state.colheitaDataFilterSelected = { farm: [], proj: [], variety: [] };
			}

			// Initialize specific key if it does not exist
			if (!state.colheitaDataFilterSelected[key]) {
				state.colheitaDataFilterSelected[key] = [];
			}

			// Toggle value inside the array
			const index = state.colheitaDataFilterSelected[key].indexOf(value);
			if (index === -1) {
				// If value doesn't exist, add it
				state.colheitaDataFilterSelected[key].push(value);
			} else {
				// If value exists, remove it
				state.colheitaDataFilterSelected[key].splice(index, 1);
			}
		},
		setCurrentFilterSelected: (state, action) => {
			state.currentFilterSelected = action.payload
		},
	},
	extraReducers: (builder) => {
		builder.addCase(logout.fulfilled, () => initialState);
	}
});

export const geralActions = geralSlice.actions;

export default geralSlice.reducer;
