import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

import { newMapArr } from "../screens/plot-helper";


export const exportPolygonsAsKML = async (data, mapPlotData) => {
    
    console.log('call here')
    console.log('data: ', data)
    console.log('mapPlotData', mapPlotData)

    const filteredParcelas = data?.parcelas.map((data) => data.parcela)
    console.log('parcelas filtradas', filteredParcelas)

    const farmName = data?.farmName
    const dataFromMap = newMapArr(mapPlotData)
    const filteredFarmArr = dataFromMap.filter((data) => data.farmName == farmName.replace('Fazenda', 'Projeto').replace('Cacique', 'Cacíque')).filter((parcelas) => filteredParcelas.includes(parcelas.talhao))
    console.log('filteredFarm', filteredFarmArr)
    

    if (filteredFarmArr.length === 0) {
        Alert.alert("No polygons to export.");
        return;
    }

    // Generate KML string
    const kmlString = `
    <?xml version="1.0" encoding="UTF-8"?>
    <kml xmlns="http://www.opengis.net/kml/2.2">
    <Document>
        <Style id="style1">
            <LineStyle>
                <color>80000000</color>  <!-- Black fill, fully opaque -->
                <width>2</width>
            </LineStyle>
            <PolyStyle>
                <color>80ffffff</color>  <!-- White line with 80% opacity -->
                
            </PolyStyle>
            <IconStyle>
                <scale>0</scale>  <!-- Set scale to 0 to hide the icon -->
            </IconStyle>
        </Style>
        ${filteredFarmArr
            .map((coordArr) => {
                
                const coordinatesString = [
                    ...coordArr.coords.map((point) => `${point.longitude},${point.latitude}`),
                    `${coordArr.coords[0].longitude},${coordArr.coords[0].latitude}` // Close the polygon
                ].join(" ");

                const centerLat = coordArr?.talhaoCenterGeo?.lat
                const centerLng = coordArr?.talhaoCenterGeo?.lng


                // Polygon placemark
                const polygonPlacemark = `
                <Placemark>
                <name>${coordArr.talhao}</name> <!-- This is the polygon name -->
                <Polygon>
                    <outerBoundaryIs>
                    <LinearRing>
                        <coordinates>${coordinatesString}</coordinates>
                    </LinearRing>
                    </outerBoundaryIs>
                </Polygon>
                </Placemark>
                `;

                // Label placemark
                const labelPlacemark = `
                <Placemark>
                <name>${coordArr.talhao}</name> <!-- This is the label -->
                <Point>
                    <coordinates>${centerLng},${centerLat}</coordinates> <!-- Center coordinates for the label -->
                </Point>
                <LabelStyle>
                    <color>ff0000ff</color>  <!-- Red label (fully opaque) -->
                    <scale>1.2</scale>  <!-- Adjust the label size -->
                </LabelStyle>
                </Placemark>
                `;
                
                return polygonPlacemark + labelPlacemark; 
            })
            .join("\n")}
        </Document>
    </kml>
    `;

    // Save KML file locally
    const filePath = `${FileSystem.documentDirectory}${data?.farmName?.replace('Fazenda ', '')}_${data?.code}.kml`;
    await FileSystem.writeAsStringAsync(filePath, kmlString);

    // Share or save the file
    if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath);
    } else {
        Alert.alert("Exported!", `File saved to: ${filePath}`);
    }
};