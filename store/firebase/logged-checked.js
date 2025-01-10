import { Alert } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { EXPO_PUBLIC_REACT_APP_DJANGO_TOKEN } from "@env";
import { logout } from '../redux/authSlice';
import { NODEUSERLINK } from '../../utils/api';

import * as Network from 'expo-network';


export const checkUserStatus = async (dispatch, userFromRedux) => {
    try {
        await SplashScreen.preventAutoHideAsync();

        if (userFromRedux) {
            const { email, uid } = userFromRedux;
            console.log('User is persisted in Redux:', email);
            // Check if there is internet connection
            const isConnected = await Network.getNetworkStateAsync();
            if (!isConnected || isConnected.isConnected === false) {
                Alert.alert('Error', 'No internet connection.');
                return;
            }
            const response = await fetch(`${NODEUSERLINK}/check-user/`, {
                headers: {
                    Authorization: `Token ${EXPO_PUBLIC_REACT_APP_DJANGO_TOKEN}`,
                    "Content-Type": "application/json"
                },
                method: "POST",
                body: JSON.stringify({ uid: uid })
            });
            console.log('response: ', response)
            if(response.status !== 200){
                dispatch(logout())
            }
        }
    } catch (error) {
        console.error('Error checking user status:', error);
        Alert.alert('Error', 'Unable to check user status.');
    } finally {
        await SplashScreen.hideAsync();
    }
};