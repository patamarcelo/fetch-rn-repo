import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

import { newMapArr } from "../screens/plot-helper";


export const exportPolygonsAsKML = async (data, mapPlotData, selectedParcelas) => {

    console.log('call here')
    console.log('data: ', data)
    console.log('mapPlotData', mapPlotData)

    let filteredParcelas;
    if(selectedParcelas.length > 0 ){
        filteredParcelas = selectedParcelas?.map((data) => data.parcela)
    } else {
        filteredParcelas = data?.parcelas.map((data) => data.parcela)
    }

    console.log('parcelas filtradas', filteredParcelas)

    const farmName = data?.farmName
    const dataFromMap = newMapArr(mapPlotData)
    const filteredFarmArr = dataFromMap.filter((data) => data.farmName == farmName.replace('Fazenda', 'Projeto').replace('Cacique', 'Cacíque')).filter((parcelas) => filteredParcelas.includes(parcelas.talhao))
    console.log('filteredFarm', filteredFarmArr)


    if (filteredFarmArr.length === 0) {
        Alert.alert("No polygons to export.");
        return;
    }

    const escapeXml = (unsafe) => unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");

    const kmlString = `<?xml version="1.0" encoding="UTF-8"?>
    <kml xmlns="http://www.opengis.net/kml/2.2">
        <Document>
            <Style id="style1">
                <LineStyle>
                    <color>80000000</color> <!-- Black fill, fully opaque -->
                    <width>2</width>
                </LineStyle>
                <PolyStyle>
                    <color>80ffffff</color> <!-- White line with 80% opacity -->
                </PolyStyle>
                <IconStyle>
                    <scale>0</scale> <!-- Set scale to 0 to hide the icon -->
                </IconStyle>
            </Style>
        ${filteredFarmArr
            .map((coordArr) => {
                if (!coordArr || !coordArr.coords || coordArr.coords.length === 0) return '';

                const coordinatesString = [
                    ...coordArr.coords.map((point) => `${point.longitude},${point.latitude}`),
                    `${coordArr.coords[0].longitude},${coordArr.coords[0].latitude}` // Close the polygon
                ].join(" ");

                const centerLat = coordArr?.talhaoCenterGeo?.lat || 0;
                const centerLng = coordArr?.talhaoCenterGeo?.lng || 0;

                return `
                <Placemark>
                    <name>${escapeXml(coordArr.talhao || 'Unnamed')}</name>
                    <styleUrl>#style1</styleUrl>
                    <Polygon>
                        <outerBoundaryIs>
                            <LinearRing>
                                <coordinates>${coordinatesString}</coordinates>
                            </LinearRing>
                        </outerBoundaryIs>
                    </Polygon>
                </Placemark>
                <Placemark>
                    <name>${escapeXml(coordArr.talhao || 'Unnamed')}</name>
                    <Point>
                        <coordinates>${centerLng},${centerLat}</coordinates>
                    </Point>
                </Placemark>`;
            })
            .join("\n")}
    </Document>
</kml>
`;

    console.log(kmlString); // Debugging
    try {
        const sanitizedFarmName = data?.farmName?.replace('Fazenda ', '').replace(/[^a-zA-Z0-9-_]/g, '_');
        const fileName = `${sanitizedFarmName}_${data?.code}.kml`;
        const filePath = `${FileSystem.documentDirectory}${fileName}`;

        await FileSystem.writeAsStringAsync(filePath, kmlString, {
            encoding: FileSystem.EncodingType.UTF8,
        });

        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(filePath, {
                mimeType: 'application/vnd.google-earth.kml+xml',
                dialogTitle: 'Share KML File',
            });
        } else {
            Alert.alert('Exported!', `File saved to: ${filePath}`);
        }
    } catch (error) {
        console.error('Error exporting KML:', error);
        Alert.alert('Error', 'Could not export KML file.');
    }
};