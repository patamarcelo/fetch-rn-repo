import { Alert } from "react-native";
import { NODELINK } from "../utils/api";

const { EXPO_PUBLIC_REACT_APP_DJANGO_TOKEN } = process.env;

const buildNodeUrl = (path) => {
	const base = String(NODELINK || "").replace(/\/+$/, "");
	const cleanPath = String(path || "").replace(/^\/+/, "");

	return `${base}/${cleanPath}`;
};

export const fetchParcelApplications = async (plantioId) => {
	if (!plantioId) {
		throw new Error("ID do plantio não informado.");
	}

	try {
		const response = await fetch(
			buildNodeUrl(`/parcel-applications/${plantioId}/`),
			{
				headers: {
					Authorization: `Token ${EXPO_PUBLIC_REACT_APP_DJANGO_TOKEN}`,
					"Content-Type": "application/json",
				},
				method: "GET",
			}
		);

		const data = await response.json();

		if (response.status !== 200) {
			throw new Error(
				data?.error ||
					data?.detail ||
					`Erro ao buscar aplicações. Status ${response.status}`
			);
		}

		return data;
	} catch (error) {
		console.log("Erro ao buscar aplicações da parcela:", error);

		Alert.alert(
			"Problema na API",
			`Não foi possível buscar as aplicações dessa parcela. ${error.message}`
		);

		throw error;
	}
};