// services/polygonSyncApi.js
import { EXPO_PUBLIC_REACT_APP_DJANGO_TOKEN } from "@env";
import { LINK } from "../utils/api";

async function safeParseJSON(response) {
	try {
		return await response.json();
	} catch (error) {
		return null;
	}
}

function toNumberOrNull(value) {
	if (value === null || value === undefined || value === "") return null;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

function sanitizePoints(points) {
	if (!Array.isArray(points)) return [];

	return points
		.map((point) => ({
			latitude: Number(point?.latitude),
			longitude: Number(point?.longitude),
		}))
		.filter(
			(point) =>
				Number.isFinite(point.latitude) &&
				Number.isFinite(point.longitude)
		);
}

export function buildPolygonPayload({ user, polygon }) {
	const sanitizedPoints = sanitizePoints(polygon?.points);

	return {
		submitted_email: (user?.email || "").trim().toLowerCase(),
		user_name:
			(user?.username ||
				user?.name ||
				user?.first_name ||
				user?.displayName ||
				user?.email ||
				"Usuário")
				.toString()
				.trim(),
		name: (polygon?.name || "Polígono sem nome").toString().trim(),
		farm_name: (polygon?.farmName || "").toString().trim(),
		mode: (polygon?.mode || "manual").toString().trim(),
		points: sanitizedPoints,
		is_closed: !!polygon?.isClosed,
		area_m2: toNumberOrNull(polygon?.areaM2),
		perimeter_m: toNumberOrNull(polygon?.perimeterM),
		observation: (polygon?.observation || "").toString().trim(),
	};
}

function joinUrl(base, path) {
	const cleanBase = (base || "").replace(/\/+$/, "");
	const cleanPath = (path || "").replace(/^\/+/, "");
	return `${cleanBase}/${cleanPath}`;
}



export async function createPolygonRemote({ user, polygon }) {
	const payload = buildPolygonPayload({ user, polygon });

	if (!payload.user_name) {
		throw new Error("Usuário inválido para sincronização.");
	}

	if (!payload.name) {
		throw new Error("Nome do polígono é obrigatório.");
	}

	if (!Array.isArray(payload.points) || payload.points.length < 3) {
		throw new Error("O polígono precisa ter ao menos 3 pontos válidos.");
	}

	try {
		const url = joinUrl(LINK, "polygons/");

		console.log("POLYGON FINAL URL:", url);
		console.log("createPolygonRemote response.url:", response?.url);


		const response = await fetch(`${LINK}/polygons/`, {
			method: "POST",
			body: JSON.stringify(payload),
			headers: {
				"Content-Type": "application/json",
				Authorization: `Token ${EXPO_PUBLIC_REACT_APP_DJANGO_TOKEN}`,
			},
		});
		

		const data = await safeParseJSON(response);

		console.log("createPolygonRemote status:", response.status);
		console.log("createPolygonRemote data:", data);

		if (!response.ok) {
			const serializerError =
				data?.detail ||
				data?.name?.[0] ||
				data?.user_name?.[0] ||
				data?.points?.[0] ||
				data?.non_field_errors?.[0] ||
				data?.message ||
				`Erro ao sincronizar polígono. Status ${response.status}`;

			throw new Error(serializerError);
		}

		return data;
	} catch (error) {
		console.error("createPolygonRemote error:", error);
		throw error;
	}
}

export async function syncSinglePolygon({ user, polygon }) {
	const data = await createPolygonRemote({ user, polygon });

	return {
		success: true,
		serverPolygon: data,
		serverId: data?.id || null,
		raw: data,
	};
}

export async function syncPolygonsSequentially({ user, polygons = [] }) {
	const results = [];

	for (const polygon of polygons) {
		try {
			const data = await createPolygonRemote({ user, polygon });

			results.push({
				localId: polygon?.id,
				success: true,
				serverId: data?.id || null,
				data,
			});
		} catch (error) {
			results.push({
				localId: polygon?.id,
				success: false,
				error: error?.message || "Erro ao sincronizar",
			});
		}
	}

	return results;
}