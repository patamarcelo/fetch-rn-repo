import MapView, { Callout, Marker, Polygon } from "react-native-maps";
import { View, Text, StyleSheet } from "react-native";
import Button from "../components/ui/Button";
import IconButton from "../components/ui/IconButton";

import { useState, useEffect, createRef } from "react";

import * as Location from "expo-location";

const coordArr = [
	{
		latitude: -10.88233,
		longitude: -49.9350669
	},
	{
		latitude: -10.882247,
		longitude: -49.93516899999999
	},
	{
		latitude: -10.8821619,
		longitude: -49.935194
	},
	{
		latitude: -10.882033,
		longitude: -49.9352019
	},
	{
		latitude: -10.8818769,
		longitude: -49.93514199999999
	},
	{
		latitude: -10.881799,
		longitude: -49.93665799999999
	},
	{
		latitude: -10.884914,
		longitude: -49.936794
	},
	{
		latitude: -10.885208,
		longitude: -49.92834999999999
	},
	{
		latitude: -10.8849009,
		longitude: -49.928396
	},
	{
		latitude: -10.884024,
		longitude: -49.9290469
	},
	{
		latitude: -10.8826389,
		longitude: -49.92860599999999
	},
	{
		latitude: -10.882231,
		longitude: -49.92826900000001
	},
	{
		latitude: -10.8819009,
		longitude: -49.93467099999998
	},
	{
		latitude: -10.882064,
		longitude: -49.93459690000001
	},
	{
		latitude: -10.882171,
		longitude: -49.9345909
	},
	{
		latitude: -10.882236,
		longitude: -49.934627
	},
	{
		latitude: -10.8823709,
		longitude: -49.934968
	}
];

// API GET GEOPOINTS PLANTED
// http://127.0.0.1:8000/diamante/plantio/get_plantio_detail_map/

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

	const handlerFarms = () => {
		console.log("logout");
		navigation.navigate("FarmsScren", { fromRoute: "maps" });
		// setModalVisible(true);
	};

	return (
		<View style={styles.container}>
			<MapView
				ref={mapRef}
				showsUserLocation={true}
				// followsUserLocation={true}
				style={styles.map}
				initialRegion={{
					latitude: -10.882247,
					longitude: -49.93516899999999,
					latitudeDelta: 0.0922,
					longitudeDelta: 0.0421
				}}
				mapType="satellite"
			>
				<Polygon
					fillColor="#FBBF70"
					coordinates={coordArr}
					onPress={(e) => console.log(e)}
					tappable={true}
				/>
				{/* <Marker
					hideCallout={true}
					// showCallout={true}
					tracksViewChanges={false}
					coordinate={{
						latitude: -10.883546571189807,
						longitude: -49.93271570290045
					}}
				> */}
				{/* <Text>SF</Text>
					<Text>SF</Text> */}
				{/* </Marker> */}
			</MapView>
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
					onPress={handlerFarms}
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
