import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View, Button, Alert } from "react-native";

import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { store, persistor } from "./store/redux/store";

import HomeStack from "./stacks/HomeStack";
import MainStack from "./stacks/MainStack";

import { useSelector, useDispatch } from 'react-redux';
import LoginStack from "./stacks/LoginStack";

import { useEffect, useState } from "react";


import { checkUserStatus } from "./store/firebase/logged-checked";




const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const Navigation = () => {
	const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);

	const dispatch = useDispatch();
    const user = useSelector((state) => state.auth.user); // Get user from Redux


	useEffect(() => {
        const initializeApp = async () => {
            await checkUserStatus(dispatch, user);
        };

        initializeApp();
    }, []);

	return (
		<NavigationContainer>
			{!isAuthenticated ? (
				<LoginStack />
			) : (
				<MainStack />
			)}
		</NavigationContainer>
	);
};

const Root = () => {
	return <Navigation />;
};

export default function App() {
	const handleRefresh = () => {
		console.log("atualizando");
	};

	return (
		<>
			<StatusBar style="auto" />

			<Provider store={store}>
				<PersistGate
					loading={<Text>Loading...</Text>}
					persistor={persistor}
				>
					<Root />
				</PersistGate>
			</Provider>
		</>
	);
}

const styles = StyleSheet.create({
	HeaderView: {
		paddingTop: 50,
		height: 100,
		width: "100%",
		justifyContent: "center",
		alignItems: "center"
		// backgroundColor: "red"
	},
	BottomView: {
		paddingTop: 50,
		flex: 1,
		backgroundColor: "blue",
		width: "100%",
		justifyContent: "flex-start",
		alignItems: "center"
	},
	container: {
		flexDirection: "column",
		width: "100%",
		flex: 1,
		backgroundColor: "#fff",
		alignItems: "center",
		justifyContent: "center"
	}
});
