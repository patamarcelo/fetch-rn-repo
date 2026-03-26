import { configureStore } from "@reduxjs/toolkit";
import { combineReducers } from "redux";
import GeralReducer from "./geral";
import authReducer from "./authSlice";
import polygonReducer from "./polygon";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { persistStore, persistReducer } from "redux-persist";
import thunk from "redux-thunk";

const persistConfig = {
	key: "root",
	storage: AsyncStorage
};

const reducer = combineReducers({
	geral: GeralReducer,
	auth: authReducer,
	polygon: polygonReducer,
});

const persistedReducer = persistReducer(persistConfig, reducer);

export const store = configureStore({
	reducer: persistedReducer,
	middleware: (getDefaultMiddleware) =>
		getDefaultMiddleware({
			thunk,
			serializableCheck: false,
			immutableCheck: false,
		})
});

export const persistor = persistStore(store);