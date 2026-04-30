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

	if (!Array.isArray(state.navigationMapFiltersIndex)) {
		state.navigationMapFiltersIndex = [];
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

/**
 * Zera somente os dados operacionais vindos da API.
 * Não limpa seleção/filtros de UI, para não perder contexto visual do usuário.
 *
 * Esta função deve ser chamada somente quando já existe payload novo válido.
 */
const resetNavigationMapRuntimeState = (state) => {
	state.navigationMapData = [];
	state.navigationMapFilters = null;
	state.navigationMapTotals = null;
	state.navigationMapCurrentSafra = null;
	state.navigationMapCurrentCiclo = null;
	state.navigationMapFiltersIndex = [];
	state.navigationMapByKey = {};
	state.navigationMapStatus = "idle";
	state.navigationMapError = null;
	state.navigationMapLastFetch = null;
};

/**
 * Normaliza e valida a resposta do endpoint.
 * Se a API respondeu 200 mas veio payload inválido, rejeita e mantém o Redux antigo.
 */
const normalizeNavigationMapResponse = ({ response, safra, ciclo }) => {
	const responseData = response?.data || response?.dados;

	if (!Array.isArray(responseData)) {
		throw new Error("Resposta inválida: campo data/dados não é uma lista.");
	}

	const normalizedData = responseData;

	const responseFilters = response?.filters || response?.filter_data || null;

	const responseFiltersIndex = Array.isArray(response?.filters_index)
		? response.filters_index
		: [];

	const responseTotals = response?.totals || null;

	const resolvedSafra = response?.safra || safra || null;
	const resolvedCiclo = response?.ciclo || ciclo || null;

	return {
		normalizedData,
		responseFilters,
		responseFiltersIndex,
		responseTotals,
		resolvedSafra,
		resolvedCiclo,
	};
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

			/**
			 * Se não for 2xx, NÃO sobrescreve nada.
			 * Cai no rejected e mantém a última base válida no Redux.
			 */
			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(errorText || "Erro ao buscar dados de navegação");
			}

			const data = await response.json();

			/**
			 * Validação mínima de segurança:
			 * Mesmo com HTTP 200, só aceitamos sobrescrever se data/dados for array.
			 */
			const responseData = data?.data || data?.dados;

			if (!Array.isArray(responseData)) {
				throw new Error("Resposta inválida do mapa: data/dados ausente ou inválido.");
			}

			console.log("Resposta get_navigation_map_data OK:", {
				keys: Object.keys(data || {}),
				total: responseData.length,
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
	navigationMapFiltersIndex: [],
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

		/**
		 * Apenas garante estrutura.
		 * Não limpa dados, para não apagar a última base válida em caso de offline.
		 */
		hydrateNavigationMapState: (state) => {
			ensureNavigationMapState(state);
		},

		resetNavigationMapLoadingState: (state) => {
			ensureNavigationMapState(state);
			state.navigationMapError = null;

			if (!state.navigationMapStatus) {
				state.navigationMapStatus = "idle";
			}
		},

		/**
		 * Uso manual.
		 * Aqui também só sobrescreve se o payload possuir data válido.
		 */
		setNavigationMapData: (state, action) => {
			ensureNavigationMapState(state);

			const payload = action.payload || {};

			if (!Array.isArray(payload?.data)) {
				state.navigationMapError =
					"Payload inválido: não foi possível atualizar dados do mapa.";
				return;
			}

			resetNavigationMapRuntimeState(state);

			state.navigationMapData = payload.data;
			state.navigationMapFilters = payload?.filters || null;
			state.navigationMapFiltersIndex = Array.isArray(payload?.filters_index)
				? payload.filters_index
				: [];
			state.navigationMapTotals = payload?.totals || null;
			state.navigationMapCurrentSafra = payload?.safra || null;
			state.navigationMapCurrentCiclo = payload?.ciclo || null;
			state.navigationMapStatus = "succeeded";
			state.navigationMapError = null;
			state.navigationMapLastFetch = new Date().toISOString();
		},

		setNavigationMapCurrentFilter: (state, action) => {
			ensureNavigationMapState(state);

			const { safra, ciclo } = action.payload || {};

			state.navigationMapCurrentSafra = safra || null;
			state.navigationMapCurrentCiclo = ciclo || null;
		},

		setNavigationMapSelectedFarm: (state, action) => {
			ensureNavigationMapState(state);
			state.navigationMapSelectedFarm = action.payload;
		},

		setNavigationMapSelectedProject: (state, action) => {
			ensureNavigationMapState(state);
			state.navigationMapSelectedProject = action.payload;
		},

		setNavigationMapFiltersSelected: (state, action) => {
			ensureNavigationMapState(state);

			state.navigationMapFilterSelected = {
				...state.navigationMapFilterSelected,
				fazenda: [],
				projeto: [],
				cultura: Array.isArray(action.payload?.cultura)
					? action.payload.cultura
					: [],
				variedade: Array.isArray(action.payload?.variedade)
					? action.payload.variedade
					: [],
				status: Array.isArray(action.payload?.status)
					? action.payload.status
					: [],
			};
		},

		setNavigationMapFilter: (state, action) => {
			ensureNavigationMapState(state);

			const { key, value } = action.payload || {};

			if (!key) return;

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
			state.navigationMapSelectedParcels = Array.isArray(action.payload)
				? action.payload
				: [];
		},

		toggleNavigationMapSelectedParcel: (state, action) => {
			ensureNavigationMapState(state);

			const parcelId = action.payload;

			if (!parcelId) return;

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
			state.navigationMapFiltersIndex = [];
			state.navigationMapStatus = "idle";
			state.navigationMapError = null;
			state.navigationMapLastFetch = null;
		},
	},

	extraReducers: (builder) => {
		builder
			.addCase(logout.fulfilled, () => initialState)

			/**
			 * Não zera no pending.
			 * Se estiver offline ou a API cair, mantém a última base válida em tela.
			 */
			.addCase(fetchNavigationMapData.pending, (state) => {
				ensureNavigationMapState(state);

				state.navigationMapStatus = "pending";
				state.navigationMapError = null;
			})

			/**
			 * Só entra aqui se:
			 * - fetch respondeu 2xx
			 * - response.json() funcionou
			 * - data/dados veio como array
			 *
			 * Aqui sim limpamos o antigo e salvamos o novo.
			 */
			.addCase(fetchNavigationMapData.fulfilled, (state, action) => {
				ensureNavigationMapState(state);

				const { key, safra, ciclo, response } = action.payload || {};

				let normalized;

				try {
					normalized = normalizeNavigationMapResponse({
						response,
						safra,
						ciclo,
					});
				} catch (error) {
					state.navigationMapStatus = "failed";
					state.navigationMapError =
						error?.message || "Resposta inválida ao atualizar mapa.";
					return;
				}

				const {
					normalizedData,
					responseFilters,
					responseFiltersIndex,
					responseTotals,
					resolvedSafra,
					resolvedCiclo,
				} = normalized;

				const now = new Date().toISOString();

				resetNavigationMapRuntimeState(state);

				state.navigationMapData = normalizedData;
				state.navigationMapFilters = responseFilters;
				state.navigationMapFiltersIndex = responseFiltersIndex;
				state.navigationMapTotals = responseTotals;
				state.navigationMapCurrentSafra = resolvedSafra;
				state.navigationMapCurrentCiclo = resolvedCiclo;
				state.navigationMapStatus = "succeeded";
				state.navigationMapError = null;
				state.navigationMapLastFetch = now;

				/**
				 * Mantido por compatibilidade.
				 * Se você já removeu navigationMapByKey dos componentes, ele não influencia mais.
				 * Mas se algum componente antigo ainda ler isso, ele recebe só a base nova.
				 */
				state.navigationMapByKey = {
					[key || `${resolvedSafra || "default"}__${resolvedCiclo || "default"}`]: {
						data: normalizedData,
						filters: responseFilters,
						filters_index: responseFiltersIndex,
						totals: responseTotals,
						safra: resolvedSafra,
						ciclo: resolvedCiclo,
						fetchedAt: now,
					},
				};

				console.log("Redux navigationMapData sobrescrito com segurança:", {
					total: normalizedData.length,
					safra: resolvedSafra,
					ciclo: resolvedCiclo,
					lastFetch: now,
				});
			})

			/**
			 * Não zera no rejected.
			 * Falha de internet/API mantém a última base válida.
			 */
			.addCase(fetchNavigationMapData.rejected, (state, action) => {
				ensureNavigationMapState(state);

				state.navigationMapStatus = "failed";
				state.navigationMapError =
					action.payload || "Erro ao buscar dados de navegação";

				console.log("Mantendo dados antigos do mapa após falha no fetch:", {
					totalAtual: state.navigationMapData?.length || 0,
					error: state.navigationMapError,
				});
			});
	},
});

export const geralActions = geralSlice.actions;

export default geralSlice.reducer;