import { createSlice } from "@reduxjs/toolkit";
import { logout } from "./authSlice";

const DEFAULT_POLYGON_SETTINGS = {
	autoMinDistance: 10,
	autoMinSeconds: 2,
	followMe: true,
};

const buildDraft = (
	payload = {},
	settings = DEFAULT_POLYGON_SETTINGS
) => ({
	id: payload.id || `polygon_${Date.now()}`,
	name: payload.name || "",
	farmId: payload.farmId || null,
	farmName: payload.farmName || "",
	mode: payload.mode || null,
	points: Array.isArray(payload.points) ? payload.points : [],
	isRecording: payload.isRecording ?? false,
	isPaused: payload.isPaused ?? false,
	isClosed: payload.isClosed ?? false,
	startedAt: payload.startedAt || null,
	finishedAt: payload.finishedAt || null,
	currentAccuracy: payload.currentAccuracy ?? null,
	followMe: payload.followMe ?? settings.followMe,
	observation: payload.observation || "",
	autoMinDistance: payload.autoMinDistance ?? settings.autoMinDistance,
	autoMinSeconds: payload.autoMinSeconds ?? settings.autoMinSeconds,
});

const initialState = {
	settings: {
		...DEFAULT_POLYGON_SETTINGS,
	},
	draft: buildDraft({}, DEFAULT_POLYGON_SETTINGS),
	items: [],
	selectedPolygonId: null,
	syncQueue: [],
	syncStatus: "idle",
	syncError: null,
};

const ensureSettings = (state) => {
	if (!state.settings) {
		state.settings = { ...DEFAULT_POLYGON_SETTINGS };
	} else {
		state.settings = {
			autoMinDistance:
				state.settings.autoMinDistance ?? DEFAULT_POLYGON_SETTINGS.autoMinDistance,
			autoMinSeconds:
				state.settings.autoMinSeconds ?? DEFAULT_POLYGON_SETTINGS.autoMinSeconds,
			followMe:
				state.settings.followMe ?? DEFAULT_POLYGON_SETTINGS.followMe,
		};
	}
};

const ensureDraft = (state) => {
	ensureSettings(state);

	if (!state.draft) {
		state.draft = buildDraft({}, state.settings);
		return;
	}

	state.draft = {
		...buildDraft({}, state.settings),
		...state.draft,
		followMe: state.draft.followMe ?? state.settings.followMe,
		autoMinDistance:
			state.draft.autoMinDistance ?? state.settings.autoMinDistance,
		autoMinSeconds:
			state.draft.autoMinSeconds ?? state.settings.autoMinSeconds,
		points: Array.isArray(state.draft.points) ? state.draft.points : [],
	};
};

const polygonSlice = createSlice({
	name: "polygon",
	initialState,
	reducers: {
		resetPolygonState: () => initialState,

		startPolygonDraft: (state, action) => {
			ensureSettings(state);
			state.draft = buildDraft(action.payload || {}, state.settings);
		},

		resetPolygonDraft: (state, action) => {
			ensureSettings(state);
			state.draft = buildDraft(action.payload || {}, state.settings);
		},

		setPolygonMode: (state, action) => {
			ensureDraft(state);

			state.draft.mode = action.payload;

			if (action.payload === "manual") {
				state.draft.followMe = false;
			} else {
				state.draft.followMe = true;
			}
		},

		setPolygonMeta: (state, action) => {
			ensureDraft(state);

			const {
				name,
				farmId,
				farmName,
				observation,
				followMe,
				autoMinDistance,
				autoMinSeconds,
			} = action.payload || {};

			if (name !== undefined) state.draft.name = name;
			if (farmId !== undefined) state.draft.farmId = farmId;
			if (farmName !== undefined) state.draft.farmName = farmName;
			if (observation !== undefined) state.draft.observation = observation;

			if (followMe !== undefined) {
				state.draft.followMe = followMe;
				state.settings.followMe = followMe;
			}

			if (autoMinDistance !== undefined) {
				state.draft.autoMinDistance = autoMinDistance;
				state.settings.autoMinDistance = autoMinDistance;
			}

			if (autoMinSeconds !== undefined) {
				state.draft.autoMinSeconds = autoMinSeconds;
				state.settings.autoMinSeconds = autoMinSeconds;
			}
		},

		setPolygonSettings: (state, action) => {
			ensureSettings(state);

			const {
				followMe,
				autoMinDistance,
				autoMinSeconds,
			} = action.payload || {};

			if (followMe !== undefined) {
				state.settings.followMe = followMe;
			}

			if (autoMinDistance !== undefined) {
				state.settings.autoMinDistance = autoMinDistance;
			}

			if (autoMinSeconds !== undefined) {
				state.settings.autoMinSeconds = autoMinSeconds;
			}

			ensureDraft(state);
			state.draft.followMe = state.settings.followMe;
			state.draft.autoMinDistance = state.settings.autoMinDistance;
			state.draft.autoMinSeconds = state.settings.autoMinSeconds;
		},

		resetPolygonSettingsToDefault: (state) => {
			state.settings = { ...DEFAULT_POLYGON_SETTINGS };
			state.draft = buildDraft({}, state.settings);
		},

		setDraftCurrentAccuracy: (state, action) => {
			ensureDraft(state);
			state.draft.currentAccuracy = action.payload;
		},

		addPointToDraft: (state, action) => {
			ensureDraft(state);
			const point = action.payload;

			if (!point?.latitude || !point?.longitude) return;

			state.draft.points.push({
				latitude: point.latitude,
				longitude: point.longitude,
				accuracy: point.accuracy ?? null,
				recordedAt: point.recordedAt || new Date().toISOString(),
			});
		},

		addPointsToDraft: (state, action) => {
			ensureDraft(state);
			const points = Array.isArray(action.payload) ? action.payload : [];

			points.forEach((point) => {
				if (!point?.latitude || !point?.longitude) return;

				state.draft.points.push({
					latitude: point.latitude,
					longitude: point.longitude,
					accuracy: point.accuracy ?? null,
					recordedAt: point.recordedAt || new Date().toISOString(),
				});
			});
		},

		removeLastDraftPoint: (state) => {
			ensureDraft(state);
			if (state.draft.points.length > 0) {
				state.draft.points.pop();
			}
		},

		clearDraftPoints: (state) => {
			ensureDraft(state);
			state.draft.points = [];
		},

		setDraftPoints: (state, action) => {
			ensureDraft(state);
			state.draft.points = Array.isArray(action.payload) ? action.payload : [];
		},

		updateDraftPointAtIndex: (state, action) => {
			ensureDraft(state);
			const { index, point } = action.payload || {};
			if (typeof index !== "number" || index < 0) return;
			if (!point?.latitude || !point?.longitude) return;
			if (!state.draft.points[index]) return;

			state.draft.points[index] = {
				...state.draft.points[index],
				latitude: point.latitude,
				longitude: point.longitude,
				accuracy: point.accuracy ?? state.draft.points[index]?.accuracy ?? null,
				recordedAt:
					point.recordedAt ||
					state.draft.points[index]?.recordedAt ||
					new Date().toISOString(),
			};
		},

		removeDraftPointAtIndex: (state, action) => {
			ensureDraft(state);
			const index = action.payload;
			if (typeof index !== "number" || index < 0) return;
			if (!state.draft.points[index]) return;

			state.draft.points.splice(index, 1);
		},

		setPolygonRecording: (state, action) => {
			ensureDraft(state);
			state.draft.isRecording = action.payload;
		},

		setPolygonPaused: (state, action) => {
			ensureDraft(state);
			state.draft.isPaused = action.payload;
		},

		startTrackingDraft: (state) => {
			ensureDraft(state);
			state.draft.isRecording = true;
			state.draft.isPaused = false;
			if (!state.draft.startedAt) {
				state.draft.startedAt = new Date().toISOString();
			}
		},

		pauseTrackingDraft: (state) => {
			ensureDraft(state);
			state.draft.isPaused = true;
			state.draft.isRecording = false;
		},

		resumeTrackingDraft: (state) => {
			ensureDraft(state);
			state.draft.isPaused = false;
			state.draft.isRecording = true;
		},

		finishPolygonDraft: (state, action) => {
			ensureDraft(state);
			const { isClosed = false } = action.payload || {};

			state.draft.isClosed = isClosed;
			state.draft.isRecording = false;
			state.draft.isPaused = false;
			state.draft.finishedAt = new Date().toISOString();
		},

		saveDraftAsPolygon: (state, action) => {
			ensureDraft(state);
			const extraData = action.payload || {};
			const polygonId = state.draft.id || `polygon_${Date.now()}`;

			const polygon = {
				id: polygonId,
				name: state.draft.name || "Polígono sem nome",
				farmId: state.draft.farmId,
				farmName: state.draft.farmName,
				mode: state.draft.mode,
				points: state.draft.points,
				isClosed: state.draft.isClosed,
				isRecording: false,
				isPaused: false,
				startedAt: state.draft.startedAt,
				finishedAt: state.draft.finishedAt || new Date().toISOString(),
				currentAccuracy: state.draft.currentAccuracy,
				observation: state.draft.observation || "",
				status: extraData.status || "saved",
				syncPending: extraData.syncPending ?? true,
				syncError: null,
				areaM2: extraData.areaM2 ?? null,
				perimeterM: extraData.perimeterM ?? null,
				areaHa: extraData.areaHa ?? null,
				createdAt: extraData.createdAt || new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			};

			const existingIndex = state.items.findIndex((item) => item.id === polygonId);

			if (existingIndex >= 0) {
				state.items[existingIndex] = polygon;
			} else {
				state.items.unshift(polygon);
			}

			if (!state.syncQueue.includes(polygonId)) {
				state.syncQueue.push(polygonId);
			}

			state.selectedPolygonId = polygonId;
		},

		updatePolygon: (state, action) => {
			const { id, data } = action.payload || {};
			if (!id || !data) return;

			const index = state.items.findIndex((item) => item.id === id);
			if (index === -1) return;

			state.items[index] = {
				...state.items[index],
				...data,
				updatedAt: new Date().toISOString(),
			};
		},

		deletePolygon: (state, action) => {
			const polygonId = action.payload;

			state.items = state.items.filter((item) => item.id !== polygonId);
			state.syncQueue = state.syncQueue.filter((id) => id !== polygonId);

			if (state.selectedPolygonId === polygonId) {
				state.selectedPolygonId = null;
			}
		},

		setSelectedPolygonId: (state, action) => {
			state.selectedPolygonId = action.payload;
		},

		enqueuePolygonSync: (state, action) => {
			const polygonId = action.payload;
			if (!polygonId) return;

			if (!state.syncQueue.includes(polygonId)) {
				state.syncQueue.push(polygonId);
			}

			const index = state.items.findIndex((item) => item.id === polygonId);
			if (index >= 0) {
				state.items[index].status = "sync_pending";
				state.items[index].syncPending = true;
				state.items[index].updatedAt = new Date().toISOString();
			}
		},

		dequeuePolygonSync: (state, action) => {
			const polygonId = action.payload;
			state.syncQueue = state.syncQueue.filter((id) => id !== polygonId);
		},

		setPolygonSyncStatus: (state, action) => {
			state.syncStatus = action.payload;
		},

		setPolygonSyncError: (state, action) => {
			state.syncError = action.payload;
			state.syncStatus = "failed";
		},

		markPolygonAsSynced: (state, action) => {
			const payload =
				typeof action.payload === "string"
					? { id: action.payload }
					: action.payload || {};

			const polygon = state.items.find((item) => item.id === payload.id);

			if (polygon) {
				polygon.syncPending = false;
				polygon.syncError = null;
				polygon.status = "synced";
				polygon.updatedAt = new Date().toISOString();

				if (payload.serverId !== undefined) {
					polygon.serverId = payload.serverId;
				}
			}

			state.syncQueue = state.syncQueue.filter((id) => id !== payload.id);
		},

		markPolygonAsSyncError: (state, action) => {
			const { id, error } = action.payload || {};
			const index = state.items.findIndex((item) => item.id === id);

			if (index >= 0) {
				state.items[index].status = "sync_error";
				state.items[index].syncPending = true;
				state.items[index].syncError = error || "Erro ao sincronizar";
				state.items[index].updatedAt = new Date().toISOString();
			}

			state.syncStatus = "failed";
			state.syncError = error || "Erro ao sincronizar";
		},
	},
	extraReducers: (builder) => {
		builder.addCase(logout.fulfilled, () => initialState);
	},
});

export const polygonActions = polygonSlice.actions;
export default polygonSlice.reducer;