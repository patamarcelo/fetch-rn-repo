import { Alert } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { EXPO_PUBLIC_REACT_APP_DJANGO_TOKEN } from "@env";
import { logout, setUser } from '../redux/authSlice';
import { NODEUSERLINK } from '../../utils/api';

import * as Network from 'expo-network';

import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

const waitForFirebaseUser = () => {
    return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            unsubscribe();
            resolve(firebaseUser);
        });
    });
};

export const checkUserStatus = async (dispatch, userFromRedux) => {
    try {
        await SplashScreen.preventAutoHideAsync();

        const networkState = await Network.getNetworkStateAsync();

        if (!networkState?.isConnected) {
            console.log('Sem internet. Mantendo usuário persistido se existir.');
            return;
        }

        const firebaseUser = await waitForFirebaseUser();

        if (!firebaseUser && userFromRedux) {
            console.log('Usuário existe no Redux, mas o Firebase Auth não retornou usuário:', {
                email: userFromRedux?.email,
                uid: userFromRedux?.uid,
            });

            return;
        }

        if (!firebaseUser) {
            console.log('Nenhum usuário logado no Firebase Auth.');
            dispatch(logout());
            return;
        }

        const idTokenResult = await firebaseUser.getIdTokenResult(true);

        console.log('Firebase user encontrado. Claims atualizados:', {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            customClaims: idTokenResult.claims,
        });

        dispatch(setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            emailVerified: firebaseUser.emailVerified,
            customClaims: idTokenResult.claims,
            token: idTokenResult.token,
        }));

        const response = await fetch(`${NODEUSERLINK}/check-user/`, {
            method: "POST",
            headers: {
                Authorization: `Token ${EXPO_PUBLIC_REACT_APP_DJANGO_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                customClaims: idTokenResult.claims,
            }),
        });

        console.log('response check-user:', response.status);

        if (response.status !== 200) {
            dispatch(logout());
        }
    } catch (error) {
        console.error('Error checking user status:', error);
        Alert.alert('Error', 'Unable to check user status.');
    } finally {
        await SplashScreen.hideAsync();
    }
};