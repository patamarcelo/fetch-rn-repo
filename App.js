import "react-native-gesture-handler";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { NavigationContainer } from "@react-navigation/native";


import { StatusBar } from "expo-status-bar";
import { StyleSheet } from "react-native";

import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { store, persistor } from "./store/redux/store";

import MainStack from "./stacks/MainStack";
import LoginStack from "./stacks/LoginStack";

import { useSelector, useDispatch } from "react-redux";
import { useEffect, useRef } from "react";

import { checkUserStatus } from "./store/firebase/logged-checked";
import AppSplash from "./components/Splash/AppSplash";


import { fetchNavigationMapData, geralActions } from "./store/redux/geral";

import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";

const Navigation = () => {
	const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
	const user = useSelector((state) => state.auth.user);
	const userClaims = user?.customClaims;
	const firebaseToken = user?.token;
	const navigationMapData = useSelector(
		(state) => state.geral.navigationMapData
	);




	const navigationMapStatus = useSelector(
		(state) => state.geral.navigationMapStatus
	);

	const dispatch = useDispatch();

	const didRequestNavigationDataRef = useRef(false);

	useEffect(() => {
		const initializeApp = async () => {
			await checkUserStatus(dispatch, user);
		};

		initializeApp();
	}, []);


	useEffect(() => {
		if (!isAuthenticated) return;

		dispatch(geralActions.resetNavigationMapLoadingState());
	}, [isAuthenticated, dispatch]);



	useEffect(() => {
		if (!isAuthenticated) return;
		if (!user?.uid) return;
		if (!user?.customClaims) return;
		if (!user?.token) return;
		if (didRequestNavigationDataRef.current) return;

		didRequestNavigationDataRef.current = true;

		console.log("Buscando dados iniciais de navegação ONLINE com claims:", {
			uid: user.uid,
			email: user.email,
			customClaims: user.customClaims,
		});

		dispatch(fetchNavigationMapData({}))
			.unwrap()
			.then((data) => {
				console.log("Dados de navegação carregados ONLINE:", {
					total: data?.response?.data?.length,
					safra: data?.response?.safra,
					ciclo: data?.response?.ciclo,
				});
			})
			.catch((error) => {
				console.log("Erro ao carregar dados de navegação:", error);
				didRequestNavigationDataRef.current = false;
			});
	}, [isAuthenticated, user?.uid, user?.customClaims, user?.token, dispatch]);


	useEffect(() => {
		console.log("APP NAVIGATION DEBUG:", {
			isAuthenticated,
			navigationMapStatus,
			navigationMapDataLength: navigationMapData?.length,
		});
	}, [isAuthenticated, navigationMapStatus, navigationMapData?.length]);

	return (
		<NavigationContainer>
			{!isAuthenticated ? <LoginStack /> : <MainStack />}
		</NavigationContainer>
	);
};

const Root = () => {
	return <Navigation />;
};

export default function App() {
	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<StatusBar style="light" />

			<Provider store={store}>
				<PersistGate loading={<AppSplash />} persistor={persistor}>
					<BottomSheetModalProvider>
						<Root />
					</BottomSheetModalProvider>
				</PersistGate>
			</Provider>
		</GestureHandlerRootView>
	);
}

const styles = StyleSheet.create({
	HeaderView: {
		paddingTop: 50,
		height: 100,
		width: "100%",
		justifyContent: "center",
		alignItems: "center",
	},
	BottomView: {
		paddingTop: 50,
		flex: 1,
		backgroundColor: "blue",
		width: "100%",
		justifyContent: "flex-start",
		alignItems: "center",
	},
	container: {
		flexDirection: "column",
		width: "100%",
		flex: 1,
		backgroundColor: "#fff",
		alignItems: "center",
		justifyContent: "center",
	},
});