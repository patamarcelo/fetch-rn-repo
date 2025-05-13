import MapView, {
	PROVIDER_GOOGLE,
	Callout,
	Marker,
	Polygon
} from "react-native-maps";
import { View, Text, StyleSheet, Platform } from "react-native";
import Button from "../components/ui/Button";
import IconButton from "../components/ui/IconButton";

import { useState, useEffect, createRef, useRef } from "react";
import * as Haptics from "expo-haptics";

import * as Location from "expo-location";


import { newMapArr } from "./plot-helper";

import { Linking, Alert } from 'react-native';

import BottomSheetApp from "../components/MapComp/BottomSheet";

import { useSelector } from "react-redux";
import { selectMapDataPlot } from "../store/redux/selector";

import Legend from "../components/MapComp/Legends";





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
	const [getOperationAp, setGetOperationAp] = useState(null);

	const [isPressed, setIsPressed] = useState(null);

	const mapPlotData = useSelector(selectMapDataPlot)

	const [propsToBottom, setPropsToBottom] = useState({});
	const [mapCoordsInit, setmapCoordsInit] = useState({
		latitude: "",
		latitudeDelta: null,
		longitude: '',
		longitudeDelta: null,
	});

	const refRBSheet = useRef();

	const mapRef = createRef();

	const { data } = route?.params


	console.log('data here:::', data)


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
		if (mapPlotData.length > 0 && farmName) {
			const dataFromMap = newMapArr(mapPlotData)
			const filteredFarm = dataFromMap.filter((data) => data.farmName == farmName.replace('Fazenda', 'Projeto').replace('Cacique', 'Cacíque'))
			const onlyCoords = filteredFarm.map((data) => data.coords)
			// console.log('onlyCoords: ', onlyCoords)

			const getRegionForCoordinates = (coordinates) => {
				let minLat, maxLat, minLng, maxLng;

				// Loop through the coordinates to find min and max latitudes/longitudes
				coordinates.forEach(subArray => {
					subArray.forEach(coord => {
						// console.log('coords: ', coord)
						const { latitude, longitude } = coord;

						minLat = minLat !== undefined ? Math.min(minLat, latitude) : latitude;
						maxLat = maxLat !== undefined ? Math.max(maxLat, latitude) : latitude;
						minLng = minLng !== undefined ? Math.min(minLng, longitude) : longitude;
						maxLng = maxLng !== undefined ? Math.max(maxLng, longitude) : longitude;
					})
				});

				// Calculate the deltas (adding some padding)
				const latitudeDelta = (maxLat - minLat) * 1.2; // Adding 20% padding
				const longitudeDelta = (maxLng - minLng) * 1.2;

				// Return the region object that can be used in `animateToRegion`
				return {
					latitude: (maxLat + minLat) / 2, // Center latitude
					longitude: (maxLng + minLng) / 2, // Center longitude
					latitudeDelta: latitudeDelta,
					longitudeDelta: longitudeDelta
				};
			};
			const getMapCords = getRegionForCoordinates(onlyCoords)
			setmapCoordsInit(getMapCords)

			setfilteredFarmArr(filteredFarm)
		}
	}, [farmName]);

	useEffect(() => {
		if (data) {
			const onlyOp = data.prods.find((prod) => prod.type === 'Operação')
			if (onlyOp) {
				setGetOperationAp(onlyOp?.product);
			} else {
				setGetOperationAp('Sem Operação')
			}
		}
	}, [data]);

	useEffect(() => {
		// console.log('params', data)
		setFarmName(data?.farmName)
	}, []);

	// useEffect(() => {
	// 	console.log('zoom', zoomLevel)
	// 	console.log('zoom', zoomLevel > 12)
	// }, [zoomLevel]);

	useEffect(() => {

		const getLocationPermission = async () => {
			const { status } = await Location.getForegroundPermissionsAsync();

			if (status === 'denied') {
				Alert.alert(
					"Location Permission Required",
					"Location permission is denied. Would you like to open the app settings to enable location access?",
					[
						{
							text: "Cancel",
							style: "cancel"
						},
						{
							text: "Open Settings",
							onPress: () => Linking.openSettings() // Open settings if user agrees
						}
					],
					{ cancelable: true }
				);
				return;
			}

			if (status !== 'granted') {
				let { status } = await Location.requestForegroundPermissionsAsync();
				if (status !== "granted") {
					setErrorMsg("Permission to access location was denied");
					return;
				}
			}

			let location = await Location.getCurrentPositionAsync({});
			setLocation(location);
		};
		getLocationPermission()
	}, []);

	// useEffect(() => {
	// 	(async () => {
	// 		let { status } = await Location.requestForegroundPermissionsAsync();
	// 		if (status !== "granted") {
	// 			setErrorMsg("Permission to access location was denied");
	// 			return;
	// 		}

	// 		let location = await Location.getCurrentPositionAsync({});
	// 		console.log('location', location)
	// 		setLocation(location);
	// 	})();
	// }, []);

	let text = "Waiting..";
	if (errorMsg) {
		text = errorMsg;
	} else if (location) {
		text = JSON.stringify(location);
	}

	const handleSetLocation = () => {
		// console.log(location, 'location')
		mapRef.current.animateToRegion({
			latitude: location.coords.latitude,
			longitude: location.coords.longitude,
			latitudeDelta: 0.0922,
			longitudeDelta: 0.0421
		});
		setLatitude(location.coords.latitude);
		setLongitude(location.coords.longitude);
	};

	const handlerFarms = () => {
		// console.log("logout");
		navigation.navigate("FarmsScren", { fromRoute: "maps" });
		// setModalVisible(true);
	};

	const handleCloseSheet = () => {
		setIsPressed(null)
	}

	if (filteredFarmArr.length === 0) {
		return <Text>Loading..</Text>
	}

	const handleLineColor = (dataParcela) => {
		if (!dataParcela) return 'white'
		return dataParcela?.fillColorParce
	}

	if (mapCoordsInit.latitude !== null) {

		return (
			<View style={styles.container}>
				<MapView
					// provider={PROVIDER_GOOGLE}
					onRegionChangeComplete={onRegionChangeComplete}
					provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined} // Use Google Maps for Android, default (Apple Maps) for iOS
					ref={mapRef}
					showsUserLocation={true}
					// followsUserLocation={true}
					style={styles.map}
					initialRegion={{
						latitude: mapCoordsInit.latitude,
						longitude: mapCoordsInit.longitude,
						latitudeDelta: mapCoordsInit.latitudeDelta,
						longitudeDelta: mapCoordsInit.longitudeDelta,
						// latitude: filteredFarmArr[0]?.farmCenterGeo?.lat,
						// longitude: filteredFarmArr[0]?.farmCenterGeo?.lng,
						// latitudeDelta: 0.111098,
						// longitudeDelta: 0.076567
					}}
					mapType="satellite"
				>
					{
						filteredFarmArr.length > 0 && filteredFarmArr.map((coordArr, i) => {

							const canPress = data.parcelas.find((parc) => parc.parcela.split(" ").join("") === coordArr.talhao.split(" ").join(""))
							const isPressedHere = isPressed && isPressed === canPress?.parcela ? 1 : 0.6
							console.log('can press data: ', canPress)
							return (
								<View key={i}>
									<Polygon
										fillColor={canPress ? `rgba(251,191,112,${isPressedHere})` : "rgba(245,245,245,0.6)"}
										// fillColor="#FBBF70"
										coordinates={coordArr.coords}
										strokeColor={handleLineColor(canPress)} // Set your desired border color here
										strokeWidth={2} // Set the border width (thickness)
										onPress={e => {
											console.log('Press Event',)
											if (canPress) {
												setIsPressed(coordArr.talhao)
												const parcela = data.parcelas.find((parc) => parc.parcela === coordArr.talhao)
												const objToAdd = {
													talhao: coordArr.talhao,
													prods: data.prods.filter((prod) => prod.type !== "Operação"),
													area: parcela.areaSolicitada,
													cultura: data.cultura,
													farmName: data.farmName
												}
												// console.log('data to bottom', objToAdd)
												// console.log('data to bottom', data)
												setPropsToBottom(objToAdd)
												refRBSheet.current.open()
												Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
											}
										}}
										tappable={true}
									/>
									<Marker
										key={i + 'i'}  // Force re-render by using zoom level as key
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

								</View>
							)
						})
					}
				</MapView>
				{
					!isPressed &&
					<>

						<View
							style={{
								width: 50,
								height: 50,
								backgroundColor: "transparent",
								position: "absolute",
								bottom: "10%",
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
							{/* <IconButton
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
						/> */}
						</View>
					</>
				}

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
				<View
					style={{
						width: 50,
						height: 50,
						backgroundColor: "transparent",
						position: "absolute",
						bottom: "8%",
						right: "84%",
						// zIndex: 10,
						borderRadius: 50
					}}
				>
					<Legend 
						aplicado={data?.areaAplicada || 0}
						solicitado={data?.areaSolicitada || 0}
					/>
				</View>

				<View
					style={{
						width: 240,
						height: 40,
						// backgroundColor: "transparent",
						backgroundColor: "rgba(255,255,255,0.8)",
						// backgroundColor: "rgba(0,0,255,0.6)",
						position: "absolute",
						top: "9.5%",
						right: "5%",
						zIndex: 10,
						borderRadius: 12,
						justifyContent: 'center',
						alignItems: 'center',
					}}
				>
					<Text style={{ textAlign: 'center', color: 'black', fontWeight: '500' }}>
						<View style={{ flexDirection: 'column', alignItems: 'center' }}>
							<Text style={{ fontWeight: 'bold' }}>
								{data.code.replace(/([A-Za-z]+)(\d+)/, '$1 $2')}
							</Text>
							<Text>
								{getOperationAp && " " + getOperationAp}
							</Text>
						</View>
					</Text>
				</View>
				<BottomSheetApp refRBSheet={refRBSheet} data={propsToBottom} handleCloseSheet={handleCloseSheet} />
			</View>
		);
	}
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
