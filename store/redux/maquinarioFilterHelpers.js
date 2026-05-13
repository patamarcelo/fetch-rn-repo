export const MACHINE_SORT_OPTIONS = [
	{
		key: "next_revision",
		direction: "asc",
		label: "Próxima revisão primeiro",
		description: "Ordena pelas máquinas mais próximas da revisão.",
		icon: "construct-outline",
	},
	{
		key: "last_hourmeter",
		direction: "desc",
		label: "Último horímetro atualizado",
		description: "Mostra primeiro as máquinas com leitura mais recente.",
		icon: "speedometer-outline",
	},
	{
		key: "current_hourmeter",
		direction: "desc",
		label: "Maior horímetro",
		description: "Ordena pelo horímetro atual do maior para o menor.",
		icon: "trending-up-outline",
	},
	{
		key: "current_hourmeter",
		direction: "asc",
		label: "Menor horímetro",
		description: "Ordena pelo horímetro atual do menor para o maior.",
		icon: "trending-down-outline",
	},
	{
		key: "name",
		direction: "asc",
		label: "Nome / código A-Z",
		description: "Ordena por código ou descrição da máquina.",
		icon: "text-outline",
	},
	{
		key: "overdue",
		direction: "asc",
		label: "Revisão vencida primeiro",
		description: "Prioriza revisões vencidas e mais urgentes.",
		icon: "warning-outline",
	},
];

export const REVISION_WINDOW_OPTIONS = [
	{
		key: "all",
		label: "Todas",
		description: "Não filtra por janela de revisão.",
	},
	{
		key: "overdue",
		label: "Vencidas",
		description: "Somente máquinas com revisão vencida.",
	},
	{
		key: "lte_50",
		label: "Até 50h",
		description: "Máquinas com revisão faltando até 50 horas.",
	},
	{
		key: "lte_100",
		label: "Até 100h",
		description: "Máquinas com revisão faltando até 100 horas.",
	},
	{
		key: "ok",
		label: "Em dia",
		description: "Máquinas fora da janela crítica.",
	},
];

export const STALE_HOURMETER_OPTIONS = [
	{
		value: null,
		label: "Todos",
		description: "Não filtra por data da leitura.",
	},
	{
		value: 3,
		label: "+3 dias",
		description: "Sem atualização há mais de 3 dias.",
	},
	{
		value: 6,
		label: "+6 dias",
		description: "Sem atualização há mais de 6 dias.",
	},
	{
		value: 10,
		label: "+10 dias",
		description: "Sem atualização há mais de 10 dias.",
	},
	{
		value: 15,
		label: "+15 dias",
		description: "Sem atualização há mais de 15 dias.",
	},
];

export const normalizeSearch = (value) =>
	String(value || "")
		.trim()
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "");

export const getMachineSearchText = (machine) => {
	return normalizeSearch(
		[
			machine?.identifier,
			machine?.description,
			machine?.chassis,
			machine?.brand,
			machine?.model_name,
			machine?.machine_type_label,
			machine?.status_label,
			machine?.status,
			machine?.fazenda_name,
			machine?.farm_name,
			machine?.location_name,
			machine?.next_due_maintenance?.plan_name,
			machine?.current_hourmeter,
			machine?.last_revision_hourmeter,
			machine?.next_revision_hourmeter,
		]
			.filter(Boolean)
			.join(" ")
	);
};

export const getMachineFarmId = (machine) => {
	return machine?.fazenda || machine?.fazenda_id || machine?.farm_id || null;
};

export const getMachineFarmName = (machine) => {
	return (
		machine?.fazenda_name ||
		machine?.farm_name ||
		machine?.location_name ||
		"Fazenda não informada"
	);
};

export const getNextPlanId = (machine) => {
	return machine?.next_due_maintenance?.plan_id || null;
};

export const getNextPlanInterval = (machine) => {
	const value = machine?.next_due_maintenance?.interval_hours;

	const numberValue = Number(value);

	if (Number.isNaN(numberValue)) return null;

	return numberValue;
};

export const getHoursToNextRevision = (machine) => {
	const value =
		machine?.next_due_maintenance?.hours_to_next_revision ??
		machine?.hours_to_next_revision;

	const numberValue = Number(value);

	if (Number.isNaN(numberValue)) return null;

	return numberValue;
};

export const getLastHourmeterDate = (machine) => {
	const value = machine?.last_hourmeter_at;

	if (!value) return null;

	const date = new Date(value);

	if (Number.isNaN(date.getTime())) return null;

	return date;
};

export const getMachineNameSortValue = (machine) => {
	return String(machine?.identifier || machine?.description || "").toLowerCase();
};

export const isHourmeterStale = (
	machine,
	days,
	includeNeverUpdated = true
) => {
	if (!days) return true;

	const date = getLastHourmeterDate(machine);

	if (!date) return includeNeverUpdated;

	const diffMs = Date.now() - date.getTime();
	const diffDays = diffMs / (1000 * 60 * 60 * 24);

	return diffDays >= Number(days);
};

export const applyMachineAdvancedFilters = ({
	machines,
	search,
	selectedStatus,
	filters,
}) => {
	const searchValue = normalizeSearch(search);
	let filtered = Array.isArray(machines) ? [...machines] : [];

	if (searchValue) {
		filtered = filtered.filter((machine) =>
			getMachineSearchText(machine).includes(searchValue)
		);
	}

	if (selectedStatus) {
		filtered = filtered.filter((machine) => machine.status === selectedStatus);
	}

	if (filters?.machineType?.length > 0) {
		filtered = filtered.filter((machine) =>
			filters.machineType.includes(machine.machine_type)
		);
	}

	if (filters?.farmIds?.length > 0) {
		filtered = filtered.filter((machine) => {
			const farmId = getMachineFarmId(machine);

			return filters.farmIds.some(
				(item) => String(item) === String(farmId)
			);
		});
	}

	if (filters?.nextPlanIds?.length > 0) {
		filtered = filtered.filter((machine) => {
			const planId = getNextPlanId(machine);

			return filters.nextPlanIds.some(
				(item) => String(item) === String(planId)
			);
		});
	}

	if (filters?.nextPlanIntervals?.length > 0) {
		filtered = filtered.filter((machine) => {
			const interval = getNextPlanInterval(machine);

			return filters.nextPlanIntervals.some(
				(item) => String(item) === String(interval)
			);
		});
	}

	if (filters?.revisionWindow && filters.revisionWindow !== "all") {
		filtered = filtered.filter((machine) => {
			const remaining = getHoursToNextRevision(machine);

			if (remaining === null) return false;

			if (filters.revisionWindow === "overdue") {
				return remaining <= 0 || machine?.next_due_maintenance?.is_due;
			}

			if (filters.revisionWindow === "lte_50") {
				return remaining > 0 && remaining <= 50;
			}

			if (filters.revisionWindow === "lte_100") {
				return remaining > 0 && remaining <= 100;
			}

			if (filters.revisionWindow === "ok") {
				return remaining > 100;
			}

			return true;
		});
	}

	if (filters?.staleHourmeterDays) {
		filtered = filtered.filter((machine) =>
			isHourmeterStale(
				machine,
				filters.staleHourmeterDays,
				filters.includeNeverUpdated
			)
		);
	}

	return filtered;
};

export const sortMachinesByFilters = (machines, filters) => {
	const sorted = Array.isArray(machines) ? [...machines] : [];

	const sortBy = filters?.sortBy || "next_revision";
	const sortDirection = filters?.sortDirection || "asc";
	const direction = sortDirection === "desc" ? -1 : 1;

	sorted.sort((a, b) => {
		if (sortBy === "last_hourmeter") {
			const aDate = getLastHourmeterDate(a)?.getTime() || 0;
			const bDate = getLastHourmeterDate(b)?.getTime() || 0;

			return (aDate - bDate) * direction;
		}

		if (sortBy === "current_hourmeter") {
			const aValue = Number(a?.current_hourmeter || 0);
			const bValue = Number(b?.current_hourmeter || 0);

			return (aValue - bValue) * direction;
		}

		if (sortBy === "name") {
			return getMachineNameSortValue(a).localeCompare(
				getMachineNameSortValue(b)
			);
		}

		if (sortBy === "overdue") {
			const aRemaining = getHoursToNextRevision(a);
			const bRemaining = getHoursToNextRevision(b);

			const aValue =
				aRemaining === null ? Number.POSITIVE_INFINITY : aRemaining;
			const bValue =
				bRemaining === null ? Number.POSITIVE_INFINITY : bRemaining;

			return aValue - bValue;
		}

		const aRemaining = getHoursToNextRevision(a);
		const bRemaining = getHoursToNextRevision(b);

		const aValue = aRemaining === null ? Number.POSITIVE_INFINITY : aRemaining;
		const bValue = bRemaining === null ? Number.POSITIVE_INFINITY : bRemaining;

		if (aValue !== bValue) return aValue - bValue;

		return getMachineNameSortValue(a).localeCompare(getMachineNameSortValue(b));
	});

	return sorted;
};

export const getAdvancedFiltersCount = (filters) => {
	let count = 0;

	if (filters?.farmIds?.length > 0) count += 1;
	if (filters?.machineType?.length > 0) count += 1;
	if (filters?.nextPlanIds?.length > 0) count += 1;
	if (filters?.nextPlanIntervals?.length > 0) count += 1;
	if (filters?.revisionWindow && filters.revisionWindow !== "all") count += 1;
	if (filters?.staleHourmeterDays) count += 1;

	if (
		filters?.sortBy &&
		!(
			filters.sortBy === "next_revision" &&
			(filters.sortDirection || "asc") === "asc"
		)
	) {
		count += 1;
	}

	return count;
};

export const getMachineFarmOptions = (machines) => {
	const map = new Map();

	(Array.isArray(machines) ? machines : []).forEach((machine) => {
		const id = getMachineFarmId(machine);
		const name = getMachineFarmName(machine);

		if (!id) return;

		map.set(String(id), {
			id,
			name,
		});
	});

	return Array.from(map.values()).sort((a, b) =>
		String(a.name).localeCompare(String(b.name))
	);
};

export const getMachineNextPlanOptions = (machines) => {
	const map = new Map();

	(Array.isArray(machines) ? machines : []).forEach((machine) => {
		const plan = machine?.next_due_maintenance;

		if (!plan?.plan_id) return;

		map.set(String(plan.plan_id), {
			id: plan.plan_id,
			name: plan.plan_name || "Plano de revisão",
			intervalHours: plan.interval_hours,
		});
	});

	return Array.from(map.values()).sort((a, b) => {
		const intervalA = Number(a.intervalHours || 0);
		const intervalB = Number(b.intervalHours || 0);

		if (intervalA !== intervalB) return intervalA - intervalB;

		return String(a.name).localeCompare(String(b.name));
	});
};