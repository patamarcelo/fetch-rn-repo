import MapView from "react-native-maps";
import { View, Text, StyleSheet } from "react-native";
import Button from "../components/ui/Button";
import IconButton from "../components/ui/IconButton";

import { useState, useEffect, createRef } from "react";

import * as Location from "expo-location";

const MapScreen = ({ navigation }) => {
	const [location, setLocation] = useState(null);
	const [errorMsg, setErrorMsg] = useState(null);
	const [latitude, setLatitude] = useState(null);
	const [longitude, setLongitude] = useState(null);

	const mapRef = createRef();

	useEffect(() => {
		(async () => {
			let { status } = await Location.requestForegroundPermissionsAsync();
			if (status !== "granted") {
				setErrorMsg("Permission to access location was denied");
				return;
			}

			let location = await Location.getCurrentPositionAsync({});
			setLocation(location);
		})();
	}, []);

	let text = "Waiting..";
	if (errorMsg) {
		text = errorMsg;
	} else if (location) {
		text = JSON.stringify(location);
	}

	const handleSetLocation = () => {
		mapRef.current.animateToRegion({
			latitude: location.coords.latitude,
			longitude: location.coords.longitude,
			latitudeDelta: 0.0922,
			longitudeDelta: 0.0421
		});
		setLongitude(location.coords.latitude);
		setLongitude(location.coords.longitude);
	};

	return (
		<View style={styles.container}>
			<MapView
				ref={mapRef}
				showsUserLocation={true}
				// followsUserLocation={true}
				style={styles.map}
				initialRegion={{
					latitude: -10.7993,
					longitude: -49.634,
					latitudeDelta: 0.0922,
					longitudeDelta: 0.0421
				}}
				mapType="satellite"
			/>
			<View
				style={{
					width: 50,
					height: 50,
					backgroundColor: "transparent",
					position: "absolute",
					bottom: "20%",
					left: "80%",
					zIndex: 10,
					borderRadius: 50
				}}
			>
				<IconButton
					type={"paper"}
					icon="target-account"
					color={"grey"}
					size={28}
					onPress={handleSetLocation}
					btnStyles={{
						backgroundColor: "rgba(255,255,255,0.9)",
						borderRadius: 50,
						justifyContent: "center",
						alignItems: "center",
						height: 50,
						width: 50
					}}
				/>
				<IconButton
					type={"awesome"}
					icon="filter"
					color={"grey"}
					size={22}
					// onPress={handlerFarms}
					btnStyles={{
						backgroundColor: "rgba(255,255,255,0.9)",
						borderRadius: 50,
						justifyContent: "center",
						alignItems: "center",
						height: 50,
						width: 50
					}}
				/>
			</View>

			<View
				style={{
					width: 50,
					height: 50,
					backgroundColor: "transparent",
					position: "absolute",
					top: "8%",
					right: "84%",
					zIndex: 10,
					borderRadius: 50
				}}
			>
				<IconButton
					type={""}
					icon="arrow-back-outline"
					color={"grey"}
					size={22}
					onPress={() => navigation.navigate("HomeStackScreen")}
					btnStyles={{
						backgroundColor: "rgba(255,255,255,0.9)",
						borderRadius: 50,
						justifyContent: "center",
						alignItems: "center",
						height: 50,
						width: 50
					}}
				/>
			</View>
		</View>
	);
};
const styles = StyleSheet.create({
	container: {
		flex: 1
	},
	map: {
		flex: 1,
		width: "100%",
		height: "100%"
	}
});
export default MapScreen;
