import { configureStore } from "@reduxjs/toolkit";
import { combineReducers } from "redux";
import GeralReducer from "./geral";
import authReducer from "./authSlice";
import polygonReducer from "./polygon";

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

		// importante se algum mapa antigo ainda usa isso
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

const reducer = combineReducers({
	geral: persistReducer(geralPersistConfig, GeralReducer),
	auth: persistReducer(authPersistConfig, authReducer),
	polygon: persistReducer(polygonPersistConfig, polygonReducer),
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