import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

function escapeXml(value) {
	return String(value ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

function sanitizePoints(points = []) {
	return points
		.filter(
			(point) =>
				point &&
				typeof point.latitude !== "undefined" &&
				typeof point.longitude !== "undefined"
		)
		.map((point) => ({
			latitude: Number(point.latitude),
			longitude: Number(point.longitude),
		}))
		.filter(
			(point) =>
				!Number.isNaN(point.latitude) &&
				!Number.isNaN(point.longitude)
		);
}

function ensureClosedRing(points = []) {
	const safePoints = sanitizePoints(points);

	if (safePoints.length < 3) return safePoints;

	const first = safePoints[0];
	const last = safePoints[safePoints.length - 1];

	const isClosed =
		first.latitude === last.latitude &&
		first.longitude === last.longitude;

	if (isClosed) return safePoints;

	return [...safePoints, first];
}

function buildCoordinatesString(points = []) {
	return ensureClosedRing(points)
		.map((point) => `${point.longitude},${point.latitude},0`)
		.join(" ");
}

function buildPlacemark(polygon, index) {
	const name = escapeXml(polygon?.name || `Polígono ${index + 1}`);
	const farmName = escapeXml(polygon?.farmName || "-");
	const mode = escapeXml(polygon?.mode || "-");
	const createdAt = escapeXml(polygon?.createdAt || polygon?.updatedAt || "-");
	const coordinates = buildCoordinatesString(polygon?.points || []);

	return `
    <Placemark>
      <name>${name}</name>
      <description><![CDATA[
        <b>Fazenda:</b> ${farmName}<br/>
        <b>Modo:</b> ${mode}<br/>
        <b>Criado em:</b> ${createdAt}
      ]]></description>
      <Style>
        <LineStyle>
          <color>ff0000ff</color>
          <width>3</width>
        </LineStyle>
        <PolyStyle>
          <color>6600ff00</color>
        </PolyStyle>
      </Style>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>${coordinates}</coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>`;
}

export function buildKmlFromPolygons(polygons = [], documentName = "Poligonos") {
	const safePolygons = (polygons || []).filter(
		(item) => sanitizePoints(item?.points || []).length >= 3
	);

	const placemarks = safePolygons
		.map((polygon, index) => buildPlacemark(polygon, index))
		.join("\n");

	return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escapeXml(documentName)}</name>
    ${placemarks}
  </Document>
</kml>`;
}

export async function exportPolygonsToKml(polygons = [], fileName = "poligonos.kml") {
	const kmlContent = buildKmlFromPolygons(polygons, fileName.replace(".kml", ""));

	const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

	await FileSystem.writeAsStringAsync(fileUri, kmlContent, {
		encoding: "utf8",
	});

	const isAvailable = await Sharing.isAvailableAsync();

	if (!isAvailable) {
		return {
			success: false,
			fileUri,
			message: "Compartilhamento não disponível neste dispositivo.",
		};
	}

	await Sharing.shareAsync(fileUri, {
		mimeType: "application/vnd.google-earth.kml+xml",
		dialogTitle: "Exportar KML",
		UTI: "public.xml",
	});

	return {
		success: true,
		fileUri,
	};
}