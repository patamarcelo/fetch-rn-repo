import { configureStore } from "@reduxjs/toolkit";
import { combineReducers } from "redux";
import GeralReducer from "./geral";
import authReducer from "./authSlice";
import polygonReducer from "./polygon";
import maquinarioReducer from "./maquinario";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { persistStore, persistReducer } from "redux-persist";

const geralPersistConfig = {
	key: "geral",
	storage: AsyncStorage,
	blacklist: [
		"navigationMapData",
		"navigationMapFilters",
		"navigationMapTotals",
		"navigationMapCurrentSafra",
		"navigationMapCurrentCiclo",
		"navigationMapSelectedParcels",
		"navigationMapByKey",
		"navigationMapStatus",
		"navigationMapError",
		"navigationMapLastFetch",
		"navigationMapFiltersIndex",
		"mapDataPlot",
	],
};

const authPersistConfig = {
	key: "auth",
	storage: AsyncStorage,
};

const polygonPersistConfig = {
	key: "polygon",
	storage: AsyncStorage,
};

const maquinarioPersistConfig = {
	key: "maquinario",
	storage: AsyncStorage,
	blacklist: [
		"status",
		"error",
	],
};

const reducer = combineReducers({
	geral: persistReducer(geralPersistConfig, GeralReducer),
	auth: persistReducer(authPersistConfig, authReducer),
	polygon: persistReducer(polygonPersistConfig, polygonReducer),
	maquinario: persistReducer(maquinarioPersistConfig, maquinarioReducer),
});

export const store = configureStore({
	reducer,
	middleware: (getDefaultMiddleware) =>
		getDefaultMiddleware({
			serializableCheck: false,
			immutableCheck: false,
		}),
});

export const persistor = persistStore(store);