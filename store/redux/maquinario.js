import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { LINKMachine } from "../../utils/api";

const DEFAULT_MACHINE_FILTERS = {
	fazendaId: 4,
	status: [],
	machineType: [],
	managerId: null,
	search: "",
};

const normalizeMachinesResponse = (response) => {
	const data = response?.data || response?.results || response?.machines || response;

	if (!Array.isArray(data)) {
		throw new Error("Resposta inválida: lista de máquinas não encontrada.");
	}

	return {
		machines: data,
		filters: response?.filters || null,
		totals: response?.totals || null,
	};
};

export const fetchMachines = createAsyncThunk(
	"maquinario/fetchMachines",
	async (params = {}, thunkAPI) => {
		try {
			const state = thunkAPI.getState();

			const authUser = state?.auth?.user || null;
			const customClaims =
				authUser?.customClaims ||
				authUser?.claims ||
				authUser?.stsTokenManager?.claims ||
				null;

			const filters = state?.maquinario?.filters || DEFAULT_MACHINE_FILTERS;

			const payload = {
				fazenda_id: params.fazendaId || filters.fazendaId || 4,
				status: params.status || filters.status || [],
				machine_type: params.machineType || filters.machineType || [],
				manager_id: params.managerId || filters.managerId || null,
				search: params.search ?? filters.search ?? "",

				user: authUser
					? {
						uid: authUser.uid || null,
						email: authUser.email || null,
						displayName: authUser.displayName || null,
						customClaims,
					}
					: null,
			};

			console.log("THUNK fetchMachines chamado com:", payload);

			const response = await fetch(`${LINKMachine}/maquinario/machines/list_app/`, {
				method: "POST",
				body: JSON.stringify(payload),
				headers: {
					"Content-Type": "application/json",
					Authorization: `Token ${process.env.EXPO_PUBLIC_REACT_APP_DJANGO_TOKEN}`,
				},
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(errorText || "Erro ao buscar máquinas");
			}

			const data = await response.json();
			const normalized = normalizeMachinesResponse(data);

			return {
				...normalized,
				requestPayload: payload,
				fetchedAt: new Date().toISOString(),
			};
		} catch (error) {
			console.log("Erro no thunk fetchMachines:", error);
			return thunkAPI.rejectWithValue(error.message);
		}
	}
);

const initialState = {
	machines: [],
	filters: { ...DEFAULT_MACHINE_FILTERS },
	totals: null,
	status: "idle",
	error: null,
	lastFetch: null,
};

const maquinarioSlice = createSlice({
	name: "maquinario",
	initialState,
	reducers: {
		setMachineSearch: (state, action) => {
			state.filters.search = action.payload || "";
		},

		setMachineFarmFilter: (state, action) => {
			state.filters.fazendaId = action.payload || null;
		},

		setMachineManagerFilter: (state, action) => {
			state.filters.managerId = action.payload || null;
		},

		setMachineStatusFilter: (state, action) => {
			const value = action.payload;

			if (!value) {
				state.filters.status = [];
				return;
			}

			state.filters.status = [value];
		},

		toggleMachineStatusFilter: (state, action) => {
			const value = action.payload;

			if (!value) return;

			const index = state.filters.status.indexOf(value);

			if (index === -1) {
				state.filters.status.push(value);
			} else {
				state.filters.status.splice(index, 1);
			}
		},

		toggleMachineTypeFilter: (state, action) => {
			const value = action.payload;

			if (!value) return;

			const index = state.filters.machineType.indexOf(value);

			if (index === -1) {
				state.filters.machineType.push(value);
			} else {
				state.filters.machineType.splice(index, 1);
			}
		},

		clearMachineFilters: (state) => {
			state.filters = {
				...DEFAULT_MACHINE_FILTERS,
				search: "",
			};
		},

		resetMachinesState: () => initialState,
	},

	extraReducers: (builder) => {
		builder
			.addCase(fetchMachines.pending, (state) => {
				state.status = "pending";
				state.error = null;
			})

			.addCase(fetchMachines.fulfilled, (state, action) => {
				state.status = "succeeded";
				state.error = null;
				state.machines = action.payload.machines;
				state.totals = action.payload.totals;
				state.lastFetch = action.payload.fetchedAt;
			})

			.addCase(fetchMachines.rejected, (state, action) => {
				state.status = "failed";
				state.error = action.payload || "Erro ao buscar máquinas";

				console.log("Mantendo máquinas antigas após erro no fetch:", {
					totalAtual: state.machines?.length || 0,
					error: state.error,
				});
			});
	},
});

export const maquinarioActions = maquinarioSlice.actions;

export default maquinarioSlice.reducer;