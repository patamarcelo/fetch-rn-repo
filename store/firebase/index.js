import { initializeApp } from "firebase/app";
import {
	getFirestore,
	collection,
	addDoc,
	query,
	where,
	getDocs,
	doc,
	updateDoc,
	collRef,
	limit,
	orderBy
} from "firebase/firestore";

import {
	getAuth,
	signInWithEmailAndPassword,
	signOut,
	onAuthStateChanged,
	sendPasswordResetEmail
} from "firebase/auth";

import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
	EXPO_PUBLIC_REACT_APP_FIREBASE_API_KEY,
	EXPO_PUBLIC_REACT_APP_FIREBASE_AUTH_DOMAIN,
	EXPO_PUBLIC_REACT_APP_FIREBASE_PROJECT_ID,
	EXPO_PUBLIC_REACT_APP_FIREBASE_STORAGE_BUCKET,
	EXPO_PUBLIC_REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
	EXPO_PUBLIC_REACT_APP_FIREBASE_APP_ID
} from "@env";

const firebaseConfig = {
	apiKey: EXPO_PUBLIC_REACT_APP_FIREBASE_API_KEY,
	authDomain: EXPO_PUBLIC_REACT_APP_FIREBASE_AUTH_DOMAIN,
	projectId: EXPO_PUBLIC_REACT_APP_FIREBASE_PROJECT_ID,
	storageBucket: EXPO_PUBLIC_REACT_APP_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: EXPO_PUBLIC_REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
	appId: EXPO_PUBLIC_REACT_APP_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
console.log('firebaseConfig: ', firebaseConfig)
const db = getFirestore(app);
console.log('app: ', app)

// export { db };

export const auth = initializeAuth(app, {
	persistence: getReactNativePersistence(AsyncStorage)
});

