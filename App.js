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
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://8514e208ff9e055878bfce3d1ba6407d@o4509618825003008.ingest.us.sentry.io/4509618826379264',

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Configure Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});




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

export default Sentry.wrap(function App() {
	const handleRefresh = () => {
		console.log("atualizando");
	};

	return (
		<>
			<StatusBar style="light" />

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
});

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