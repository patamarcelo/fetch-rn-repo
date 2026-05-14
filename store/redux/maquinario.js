import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { LINKMachine } from "../../utils/api";

const DEFAULT_MACHINE_FILTERS = {
	fazendaId: null,
	farmIds: [],
	status: [],
	machineType: [],
	managerId: null,
	search: "",

	sortBy: "next_revision",
	sortDirection: "asc",

	nextPlanIds: [],
	nextPlanIntervals: [],

	revisionWindow: "all",

	staleHourmeterDays: null,
	includeNeverUpdated: true,
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
				fazenda_id: params.fazendaId ?? filters.fazendaId ?? null,
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
	pendingHourmeterReadings: [],
};

const maquinarioSlice = createSlice({
	name: "maquinario",
	initialState,
	reducers: {
		setMachineSearch: (state, action) => {
			state.filters.search = String(action.payload || "").trimStart();
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

		addPendingHourmeterReading: (state, action) => {
			const payload = action.payload;

			if (!payload?.localId) return;

			const exists = state.pendingHourmeterReadings.some(
				(item) => item.localId === payload.localId
			);

			if (exists) return;

			state.pendingHourmeterReadings.push(payload);
		},

		removePendingHourmeterReading: (state, action) => {
			const localId = action.payload;

			state.pendingHourmeterReadings = state.pendingHourmeterReadings.filter(
				(item) => item.localId !== localId
			);
		},

		markPendingHourmeterReadingError: (state, action) => {
			const { localId, error } = action.payload || {};

			const item = state.pendingHourmeterReadings.find(
				(reading) => reading.localId === localId
			);

			if (!item) return;

			item.status = "failed";
			item.error = error || "Erro ao sincronizar leitura.";
			item.lastAttemptAt = new Date().toISOString();
		},

		replaceMachineFromApi: (state, action) => {
			const machine = action.payload;

			if (!machine?.id) return;

			const index = state.machines.findIndex(
				(item) => String(item.id) === String(machine.id)
			);

			if (index === -1) {
				state.machines.push(machine);
				return;
			}

			state.machines[index] = machine;
		},


		setMachineFilters: (state, action) => {
			state.filters = {
				...state.filters,
				...(action.payload || {}),
			};
		},

		setMachineSort: (state, action) => {
			const { sortBy, sortDirection } = action.payload || {};

			state.filters.sortBy = sortBy || "next_revision";
			state.filters.sortDirection = sortDirection || "asc";
		},

		toggleMachineFarmFilter: (state, action) => {
			const value = action.payload;

			if (!value) return;

			if (!Array.isArray(state.filters.farmIds)) {
				state.filters.farmIds = [];
			}

			const normalizedValue = String(value);
			const index = state.filters.farmIds.findIndex(
				(item) => String(item) === normalizedValue
			);

			if (index === -1) {
				state.filters.farmIds.push(value);
			} else {
				state.filters.farmIds.splice(index, 1);
			}
		},

		toggleMachineNextPlanFilter: (state, action) => {
			const value = action.payload;

			if (!value) return;

			if (!Array.isArray(state.filters.nextPlanIds)) {
				state.filters.nextPlanIds = [];
			}

			const normalizedValue = String(value);
			const index = state.filters.nextPlanIds.findIndex(
				(item) => String(item) === normalizedValue
			);

			if (index === -1) {
				state.filters.nextPlanIds.push(value);
			} else {
				state.filters.nextPlanIds.splice(index, 1);
			}
		},

		toggleMachineNextPlanIntervalFilter: (state, action) => {
			const value = action.payload;

			if (!value) return;

			if (!Array.isArray(state.filters.nextPlanIntervals)) {
				state.filters.nextPlanIntervals = [];
			}

			const normalizedValue = String(value);
			const index = state.filters.nextPlanIntervals.findIndex(
				(item) => String(item) === normalizedValue
			);

			if (index === -1) {
				state.filters.nextPlanIntervals.push(value);
			} else {
				state.filters.nextPlanIntervals.splice(index, 1);
			}
		},

		setMachineRevisionWindowFilter: (state, action) => {
			state.filters.revisionWindow = action.payload || "all";
		},

		setMachineStaleHourmeterFilter: (state, action) => {
			state.filters.staleHourmeterDays = action.payload ?? null;
		},

		setMachineIncludeNeverUpdated: (state, action) => {
			state.filters.includeNeverUpdated = action.payload !== false;
		},

		clearMachineAdvancedFilters: (state) => {
			state.filters = {
				...state.filters,
				farmIds: [],
				machineType: [],
				nextPlanIds: [],
				nextPlanIntervals: [],
				revisionWindow: "all",
				staleHourmeterDays: null,
				includeNeverUpdated: true,
				sortBy: "next_revision",
				sortDirection: "asc",
			};
		},
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

export const syncPendingHourmeterReadings = createAsyncThunk(
	"maquinario/syncPendingHourmeterReadings",
	async (_, thunkAPI) => {
		const state = thunkAPI.getState();

		const pendingReadings = state?.maquinario?.pendingHourmeterReadings || [];
		const authUser = state?.auth?.user || null;

		const customClaims =
			authUser?.customClaims ||
			authUser?.claims ||
			authUser?.stsTokenManager?.claims ||
			null;

		const readingsToSync = pendingReadings.filter(
			(item) => item?.status === "pending" || item?.status === "failed"
		);

		const results = {
			total: readingsToSync.length,
			success: 0,
			failed: 0,
			items: [],
		};

		for (const reading of readingsToSync) {
			try {
				if (!reading?.localId || !reading?.machineId) {
					throw new Error("Leitura pendente inválida.");
				}

				const payload = {
					value: reading.value,
					measured_at: reading.measuredAt || new Date().toISOString(),
					source: reading.source || "app_offline",
					notes: reading.notes || "",
					user: authUser
						? {
							uid: authUser.uid || null,
							email: authUser.email || null,
							displayName: authUser.displayName || null,
							customClaims,
						}
						: null,
				};

				const response = await fetch(
					`${LINKMachine}/maquinario/machines/${reading.machineId}/update_hourmeter/`,
					{
						method: "POST",
						body: JSON.stringify(payload),
						headers: {
							"Content-Type": "application/json",
							Authorization: `Token ${process.env.EXPO_PUBLIC_REACT_APP_DJANGO_TOKEN}`,
						},
					}
				);

				let data = null;

				try {
					data = await response.json();
				} catch {
					data = null;
				}

				if (!response.ok) {
					const errorMessage =
						data?.error ||
						data?.detail ||
						"Não foi possível sincronizar a leitura.";

					const error = new Error(errorMessage);
					error.status = response.status;
					throw error;
				}

				thunkAPI.dispatch(
					maquinarioActions.removePendingHourmeterReading(reading.localId)
				);

				if (data?.machine) {
					thunkAPI.dispatch(
						maquinarioActions.replaceMachineFromApi(data.machine)
					);
				}

				results.success += 1;

				results.items.push({
					localId: reading.localId,
					machineId: reading.machineId,
					ok: true,
				});
			} catch (error) {
				const errorMessage =
					error?.message || "Erro ao sincronizar leitura.";

				thunkAPI.dispatch(
					maquinarioActions.markPendingHourmeterReadingError({
						localId: reading.localId,
						error: errorMessage,
					})
				);

				results.failed += 1;

				results.items.push({
					localId: reading.localId,
					machineId: reading.machineId,
					ok: false,
					error: errorMessage,
				});
			}
		}

		return results;
	}
);


export default maquinarioSlice.reducer;