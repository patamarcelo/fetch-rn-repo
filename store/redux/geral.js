import { createSlice } from "@reduxjs/toolkit";

const initialState = {
	fazendas: [],
	selectedFarm: ""
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
		}
	}
});

export const geralActions = geralSlice.actions;

export default geralSlice.reducer;
