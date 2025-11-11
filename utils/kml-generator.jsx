import { Alert } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { newMapArr } from "../screens/plot-helper";

export const exportPolygonsAsKML = async (data, mapPlotData, selectedParcelas) => {
  try {
    const filteredParcelas =
      (selectedParcelas?.length ?? 0) > 0
        ? selectedParcelas.map(p => p.parcela)
        : (data?.parcelas ?? []).map(p => p.parcela);

    const farmName = data?.farmName ?? "";
    const dataFromMap = newMapArr(mapPlotData ?? []);
    const filteredFarmArr = dataFromMap
      .filter(d =>
        (d?.farmName ?? "")
          .replace("Fazenda", "Projeto")
          .replace("Cacique", "Cacíque") ===
        farmName.replace("Fazenda", "Projeto").replace("Cacique", "Cacíque")
      )
      .filter(parc => filteredParcelas.includes(parc.talhao));

    if (!filteredFarmArr.length) {
      Alert.alert("Atenção", "Não há polígonos para exportar.");
      return;
    }

    const escapeXml = (unsafe = "") =>
      unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");

    const kmlBody = filteredFarmArr
      .map(coordArr => {
        const coords = coordArr?.coords ?? [];
        if (!coords.length) return "";

        const coordinatesString = [
          ...coords.map(p => `${p.longitude},${p.latitude}`),
          `${coords[0].longitude},${coords[0].latitude}`, // fecha o polígono
        ].join(" ");

        const centerLat = coordArr?.talhaoCenterGeo?.lat ?? 0;
        const centerLng = coordArr?.talhaoCenterGeo?.lng ?? 0;
        const nome = escapeXml(coordArr?.talhao ?? "Sem nome");

        return `
          <Placemark>
            <name>${nome}</name>
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
            <name>${nome}</name>
            <Point>
              <coordinates>${centerLng},${centerLat}</coordinates>
            </Point>
          </Placemark>
        `;
      })
      .join("\n");

    const kmlString = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Style id="style1">
      <LineStyle>
        <color>80000000</color>
        <width>2</width>
      </LineStyle>
      <PolyStyle>
        <color>80ffffff</color>
      </PolyStyle>
      <IconStyle>
        <scale>0</scale>
      </IconStyle>
    </Style>
    ${kmlBody}
  </Document>
</kml>`;

    const sanitizedFarmName = (data?.farmName ?? "")
      .replace(/^Fazenda\s+/i, "")
      .replace(/[^a-zA-Z0-9-_]/g, "_");

    const fileName = `${sanitizedFarmName}_${data?.code ?? "map"}.kml`;
    const filePath = `${FileSystem.documentDirectory}${fileName}`;

    // ✅ Removido 'encoding: FileSystem.EncodingType.UTF8' (já é o padrão)
    await FileSystem.writeAsStringAsync(filePath, kmlString /*, { encoding: 'utf8' } */);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(filePath, {
        mimeType: "application/vnd.google-earth.kml+xml",
        dialogTitle: "Compartilhar arquivo KML",
      });
    } else {
      Alert.alert("Exportado!", `Arquivo salvo em: ${filePath}`);
    }
  } catch (error) {
    console.error("Error exporting KML:", error);
    Alert.alert("Erro", "Não foi possível exportar o KML.");
  }
};
