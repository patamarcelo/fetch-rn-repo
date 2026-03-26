import { createSelector } from "reselect";

export const selectPolygonState = (state) => state.polygon;

export const selectPolygonDraft = (state) => state.polygon.draft;

export const selectPolygonItems = (state) => state.polygon.items;

export const selectSelectedPolygonId = (state) => state.polygon.selectedPolygonId;

export const selectPolygonSyncQueue = (state) => state.polygon.syncQueue;

export const selectPolygonSyncStatus = (state) => state.polygon.syncStatus;

export const selectPolygonSyncError = (state) => state.polygon.syncError;

export const selectDraftPoints = (state) => state.polygon.draft.points;

export const selectDraftMode = (state) => state.polygon.draft.mode;

export const selectDraftIsRecording = (state) => state.polygon.draft.isRecording;

export const selectDraftIsPaused = (state) => state.polygon.draft.isPaused;

export const selectDraftHasPoints = createSelector(
	[selectDraftPoints],
	(points) => points.length > 0
);

export const selectDraftPointsCount = createSelector(
	[selectDraftPoints],
	(points) => points.length
);

export const selectSelectedPolygon = createSelector(
	[selectPolygonItems, selectSelectedPolygonId],
	(items, selectedId) => items.find((item) => item.id === selectedId) || null
);

export const selectPendingPolygons = createSelector(
	[selectPolygonItems],
	(items) => items.filter((item) => item.syncPending)
);

export const selectSyncedPolygons = createSelector(
	[selectPolygonItems],
	(items) => items.filter((item) => item.status === "synced")
);

export const selectPolygonStats = createSelector(
	[selectPolygonItems],
	(items) => ({
		total: items.length,
		pending: items.filter((item) => item.syncPending).length,
		synced: items.filter((item) => item.status === "synced").length,
		error: items.filter((item) => item.status === "sync_error").length,
	})
);