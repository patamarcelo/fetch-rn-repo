import MapView, {
	PROVIDER_GOOGLE,
	Callout,
	Marker,
	Polygon
} from "react-native-maps";
import { View, Text, StyleSheet, Platform } from "react-native";
import Button from "../components/ui/Button";
import IconButton from "../components/ui/IconButton";

import { useState, useEffect, createRef } from "react";
import * as Haptics from "expo-haptics";

import * as Location from "expo-location";


import { newMapArr } from "./plot-helper";


// API GET GEOPOINTS PLANTED
// http://127.0.0.1:8000/diamante/plantio/get_plantio_detail_map/

// http://127.0.0.1:8000/diamante/plantio/get_produtividade_plantio/

const MapScreen = ({ navigation, route }) => {
	const [location, setLocation] = useState(null);
	const [errorMsg, setErrorMsg] = useState(null);
	const [latitude, setLatitude] = useState(null);
	const [longitude, setLongitude] = useState(null);
	const [farmName, setFarmName] = useState(null);
	const [filteredFarmArr, setfilteredFarmArr] = useState([]);

	const mapRef = createRef();

	const { data } = route?.params


	const [zoomLevel, setZoomLevel] = useState(0);
	const [mapRegion, setMapRegion] = useState(null);


	// Function to calculate zoom level from map's region
	const calculateZoomLevel = (region) => {
		const zoom = Math.log(360 / region.longitudeDelta) / Math.LN2;

		// Adjust zoom logic for Apple Maps
		if (Platform.OS === 'ios' && !region.provider) {
			return zoom - 2;  // Adjust zoom value to suit Apple Maps
		}

		return zoom;
	};

	const onRegionChangeComplete = (region) => {
		const newZoomLevel = calculateZoomLevel(region);
		setZoomLevel(newZoomLevel);
		setMapRegion(region);
	};

	useEffect(() => {
		if (newMapArr.length > 0 && farmName) {
			const filteredFarm = newMapArr.filter((data) => data.farmName == farmName.replace('Fazenda', 'Projeto').replace('Cacique', 'Cacíque'))
			console.log('filteredFarm', farmName)
			console.log('filteredFarm Arr: ', filteredFarm)
			setfilteredFarmArr(filteredFarm)
		}
	}, [farmName]);

	useEffect(() => {
		console.log('params', zoomLevel)
		setFarmName(data?.farmName)
	}, []);
	useEffect(() => {
		console.log('zoom', zoomLevel)
		console.log('zoom', zoomLevel > 12)
	}, [zoomLevel]);

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
		console.log("farmCenterGeo: ", filteredFarmArr[0]?.farmCenterGeo?.latitude,)
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

	if (filteredFarmArr.length === 0) {
		return <Text>Loading..</Text>
	}

	return (
		<View style={styles.container}>
			<MapView
				onRegionChangeComplete={onRegionChangeComplete}
				// provider={PROVIDER_GOOGLE}
				ref={mapRef}
				showsUserLocation={true}
				// followsUserLocation={true}
				style={styles.map}
				initialRegion={{
					latitude: filteredFarmArr[0]?.farmCenterGeo?.lat,
					longitude: filteredFarmArr[0]?.farmCenterGeo?.lng,
					latitudeDelta: 0.2222,
					longitudeDelta: 0.0821
				}}
				mapType="satellite"
			>
				{
					filteredFarmArr.length > 0 && filteredFarmArr.map((coordArr, i) => {
						return (
							<View key={i}>
								<Polygon
									fillColor="rgba(245,245,245,0.6)"
									// fillColor="#FBBF70"
									coordinates={coordArr.coords}
									onPress={e => {
										console.log(coordArr)
										Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
									}}
									tappable={true}
								/>
								{zoomLevel < 15 && (
									<Marker
										key={zoomLevel}  // Force re-render by using zoom level as key
										hideCallout={true}
										showCallout={true}
										tracksViewChanges={false}
										coordinate={{
											latitude: coordArr.talhaoCenterGeo.lat,
											longitude: coordArr.talhaoCenterGeo.lng
										}}
									>

										<Text>{coordArr.talhao}</Text>
									</Marker>
								)}

							</View>
						)
					})
				}
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
