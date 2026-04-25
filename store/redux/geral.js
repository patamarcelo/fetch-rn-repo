import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { logout } from "./authSlice";
import { LINK } from "../../utils/api";

const DEFAULT_NAVIGATION_FILTERS = {
	fazenda: [],
	projeto: [],
	cultura: [],
	variedade: [],
	status: [],
};

const ensureNavigationMapState = (state) => {
	if (!Array.isArray(state.navigationMapData)) {
		state.navigationMapData = [];
	}

	if (!state.navigationMapFilters) {
		state.navigationMapFilters = null;
	}

	if (!state.navigationMapTotals) {
		state.navigationMapTotals = null;
	}

	if (!Array.isArray(state.navigationMapSelectedParcels)) {
		state.navigationMapSelectedParcels = [];
	}

	if (!state.navigationMapFilterSelected) {
		state.navigationMapFilterSelected = { ...DEFAULT_NAVIGATION_FILTERS };
	}

	if (!state.navigationMapByKey || typeof state.navigationMapByKey !== "object") {
		state.navigationMapByKey = {};
	}

	if (!state.navigationMapStatus) {
		state.navigationMapStatus = "idle";
	}

	if (state.navigationMapError === undefined) {
		state.navigationMapError = null;
	}

	if (state.navigationMapLastFetch === undefined) {
		state.navigationMapLastFetch = null;
	}
};

export const fetchNavigationMapData = createAsyncThunk(
	"geral/fetchNavigationMapData",
	async (params = {}, thunkAPI) => {
		try {
			const { safra = null, ciclo = null } = params;

			console.log("THUNK fetchNavigationMapData chamado com:", params);
			console.log("URL navigation map:", `${LINK}/plantio/get_navigation_map_data/`);

			const response = await fetch(`${LINK}/plantio/get_navigation_map_data/`, {
				method: "POST",
				body: JSON.stringify({
					safra,
					ciclo,
				}),
				headers: {
					"Content-Type": "application/json",
					Authorization: `Token ${process.env.EXPO_PUBLIC_REACT_APP_DJANGO_TOKEN}`,
				},
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(errorText || "Erro ao buscar dados de navegação");
			}

			const data = await response.json();

			console.log("Resposta get_navigation_map_data:", {
				keys: Object.keys(data || {}),
				total: data?.data?.length,
				safra: data?.safra,
				ciclo: data?.ciclo,
			});

			const resolvedSafra = data?.safra || safra || null;
			const resolvedCiclo = data?.ciclo || ciclo || null;

			return {
				key: `${resolvedSafra || "default"}__${resolvedCiclo || "default"}`,
				safra: resolvedSafra,
				ciclo: resolvedCiclo,
				response: data,
			};
		} catch (error) {
			console.log("Erro no thunk fetchNavigationMapData:", error);
			return thunkAPI.rejectWithValue(error.message);
		}
	}
);

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
	farmBoxSearchQuery: "",
	colheitaData: null,
	colheitaDataFilterSelected: null,
	currentFilterSelected: null,

	// Navegação / mapa full screen
	navigationMapData: [],
	navigationMapFilters: null,
	navigationMapTotals: null,
	navigationMapCurrentSafra: null,
	navigationMapCurrentCiclo: null,
	navigationMapSelectedFarm: null,
	navigationMapSelectedProject: null,
	navigationMapSelectedParcels: [],
	navigationMapFilterSelected: { ...DEFAULT_NAVIGATION_FILTERS },
	navigationMapByKey: {},
	navigationMapStatus: "idle",
	navigationMapError: null,
	navigationMapLastFetch: null,
};

const geralSlice = createSlice({
	name: "geral",
	initialState,
	reducers: {
		resetData: () => initialState,

		setFarmBoxData: (state, action) => {
			state.farmBoxData = action.payload;
		},
		setDataPlantio: (state, action) => {
			state.plantioData = action.payload;
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
			state.farmboxSearchBar = action.payload;
		},
		setFarmboxSearchQuery: (state, action) => {
			state.farmBoxSearchQuery = action.payload;
		},
		setColheitaData: (state, action) => {
			state.colheitaData = action.payload;
		},
		clearColheitaFilter: (state) => {
			state.colheitaDataFilterSelected = null;
		},
		setColheitaFilter: (state, action) => {
			const { key, value } = action.payload;

			if (!state.colheitaDataFilterSelected) {
				state.colheitaDataFilterSelected = {
					farm: [],
					proj: [],
					variety: [],
					culture: [],
				};
			}

			if (!state.colheitaDataFilterSelected[key]) {
				state.colheitaDataFilterSelected[key] = [];
			}

			const index = state.colheitaDataFilterSelected[key].indexOf(value);

			if (index === -1) {
				state.colheitaDataFilterSelected[key].push(value);
			} else {
				state.colheitaDataFilterSelected[key].splice(index, 1);
			}
		},
		setCurrentFilterSelected: (state, action) => {
			state.currentFilterSelected = action.payload;
		},

		// -----------------------------
		// Navegação / Mapa
		// -----------------------------
		hydrateNavigationMapState: (state) => {
			ensureNavigationMapState(state);

			if (state.navigationMapStatus === "pending") {
				state.navigationMapStatus = state.navigationMapData.length > 0 ? "succeeded" : "idle";
			}
		},

		resetNavigationMapLoadingState: (state) => {
			ensureNavigationMapState(state);

			if (state.navigationMapStatus === "pending") {
				state.navigationMapStatus = state.navigationMapData.length > 0 ? "succeeded" : "idle";
			}

			state.navigationMapError = null;
		},

		setNavigationMapData: (state, action) => {
			ensureNavigationMapState(state);

			const payload = action.payload;

			state.navigationMapData = payload?.data || [];
			state.navigationMapFilters = payload?.filters || null;
			state.navigationMapTotals = payload?.totals || null;
			state.navigationMapCurrentSafra = payload?.safra || null;
			state.navigationMapCurrentCiclo = payload?.ciclo || null;
			state.navigationMapStatus = "succeeded";
			state.navigationMapError = null;
			state.navigationMapLastFetch = new Date().toISOString();
		},

		setNavigationMapCurrentFilter: (state, action) => {
			ensureNavigationMapState(state);

			const { safra, ciclo } = action.payload;

			state.navigationMapCurrentSafra = safra;
			state.navigationMapCurrentCiclo = ciclo;
		},

		setNavigationMapSelectedFarm: (state, action) => {
			ensureNavigationMapState(state);
			state.navigationMapSelectedFarm = action.payload;
		},

		setNavigationMapSelectedProject: (state, action) => {
			ensureNavigationMapState(state);
			state.navigationMapSelectedProject = action.payload;
		},

		setNavigationMapFilter: (state, action) => {
			ensureNavigationMapState(state);

			const { key, value } = action.payload;

			if (!state.navigationMapFilterSelected[key]) {
				state.navigationMapFilterSelected[key] = [];
			}

			const index = state.navigationMapFilterSelected[key].indexOf(value);

			if (index === -1) {
				state.navigationMapFilterSelected[key].push(value);
			} else {
				state.navigationMapFilterSelected[key].splice(index, 1);
			}
		},

		clearNavigationMapFilters: (state) => {
			ensureNavigationMapState(state);
			state.navigationMapFilterSelected = { ...DEFAULT_NAVIGATION_FILTERS };
		},

		setNavigationMapSelectedParcels: (state, action) => {
			ensureNavigationMapState(state);
			state.navigationMapSelectedParcels = action.payload || [];
		},

		toggleNavigationMapSelectedParcel: (state, action) => {
			ensureNavigationMapState(state);

			const parcelId = action.payload;
			const index = state.navigationMapSelectedParcels.indexOf(parcelId);

			if (index === -1) {
				state.navigationMapSelectedParcels.push(parcelId);
			} else {
				state.navigationMapSelectedParcels.splice(index, 1);
			}
		},

		clearNavigationMapSelectedParcels: (state) => {
			ensureNavigationMapState(state);
			state.navigationMapSelectedParcels = [];
		},

		resetNavigationMapState: (state) => {
			state.navigationMapData = [];
			state.navigationMapFilters = null;
			state.navigationMapTotals = null;
			state.navigationMapCurrentSafra = null;
			state.navigationMapCurrentCiclo = null;
			state.navigationMapSelectedFarm = null;
			state.navigationMapSelectedProject = null;
			state.navigationMapSelectedParcels = [];
			state.navigationMapFilterSelected = { ...DEFAULT_NAVIGATION_FILTERS };
			state.navigationMapByKey = {};
			state.navigationMapStatus = "idle";
			state.navigationMapError = null;
			state.navigationMapLastFetch = null;
		},
	},
	extraReducers: (builder) => {
		builder
			.addCase(logout.fulfilled, () => initialState)

			.addCase(fetchNavigationMapData.pending, (state) => {
				ensureNavigationMapState(state);

				state.navigationMapStatus = "pending";
				state.navigationMapError = null;
			})

			.addCase(fetchNavigationMapData.fulfilled, (state, action) => {
				ensureNavigationMapState(state);

				const { key, safra, ciclo, response } = action.payload;

				const responseData = response?.data || response?.dados || [];
				const responseFilters = response?.filters || response?.filter_data || null;
				const responseTotals = response?.totals || null;

				state.navigationMapStatus = "succeeded";
				state.navigationMapError = null;

				state.navigationMapData = Array.isArray(responseData) ? responseData : [];
				state.navigationMapFilters = responseFilters;
				state.navigationMapTotals = responseTotals;
				state.navigationMapCurrentSafra = safra || response?.safra || null;
				state.navigationMapCurrentCiclo = ciclo || response?.ciclo || null;
				state.navigationMapLastFetch = new Date().toISOString();

				state.navigationMapByKey[key] = {
					data: Array.isArray(responseData) ? responseData : [],
					filters: responseFilters,
					totals: responseTotals,
					safra: safra || response?.safra || null,
					ciclo: ciclo || response?.ciclo || null,
					fetchedAt: new Date().toISOString(),
				};
			})

			.addCase(fetchNavigationMapData.rejected, (state, action) => {
				ensureNavigationMapState(state);

				state.navigationMapStatus = "failed";
				state.navigationMapError =
					action.payload || "Erro ao buscar dados de navegação";
			});
	},
});

export const geralActions = geralSlice.actions;

export default geralSlice.reducer;