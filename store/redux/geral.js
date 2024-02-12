import { createSlice } from "@reduxjs/toolkit";

const initialState = {
	fazendas: [],
	selectedFarm: "",
	programsAvaiable: [],
	selectedProgram: null,
	estagiosProgram: [],
	dataProgram: []
};

const geralSlice = createSlice({
	name: "geral",
	initialState,
	reducers: {
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
		}
	}
});

export const geralActions = geralSlice.actions;

export default geralSlice.reducer;