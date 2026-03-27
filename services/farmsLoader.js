// services/farmsLoader.js
import { LINK } from "../utils/api";
import { EXPO_PUBLIC_REACT_APP_DJANGO_TOKEN } from "@env";

const DEFAULT_SAFRA_CICLO = {
	safra: "2025/2026",
	ciclo: "3",
};

export async function fetchFarmsFromPlantioApi() {
	const response = await fetch(
		`${LINK}/plantio/get_plantio_operacoes_detail_json_program/`,
		{
			method: "POST",
			headers: {
				Authorization: `Token ${EXPO_PUBLIC_REACT_APP_DJANGO_TOKEN}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(DEFAULT_SAFRA_CICLO),
		}
	);

	if (!response.ok) {
		throw new Error(`Erro ao carregar fazendas. Status ${response.status}`);
	}

	const data = await response.json();

	const formDataServer = (data?.dados_plantio || [])
		.filter((item) => item?.dados?.plantio_finalizado === true)
		.sort((a, b) => a.parcela.localeCompare(b.parcela))
		.sort((a, b) => a.fazenda.localeCompare(b.fazenda));

	const onlyFarm = formDataServer.map((item) => item?.fazenda).filter(Boolean);
	const uniqueFarms = [...new Set(onlyFarm)];

	return {
		farms: uniqueFarms,
		rawData: formDataServer,
	};
}