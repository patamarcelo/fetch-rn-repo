import { createSelector } from "reselect";

export const selectMachines = (state) => state.maquinario.machines || [];

export const selectMachinesStatus = (state) => state.maquinario.status;

export const selectMachinesError = (state) => state.maquinario.error;

export const selectMachinesFilters = (state) => state.maquinario.filters;

export const selectMachinesSearch = (state) =>
	state.maquinario.filters?.search || "";

export const selectMachinesTotals = (state) => state.maquinario.totals;

const getMaintenanceSortValue = (machine) => {
	const value =
		machine?.next_due_maintenance?.hours_to_next_revision ??
		machine?.hours_to_next_revision;

	if (value === null || value === undefined || value === "") {
		return Number.POSITIVE_INFINITY;
	}

	const numberValue = Number(value);

	if (Number.isNaN(numberValue)) {
		return Number.POSITIVE_INFINITY;
	}

	return numberValue;
};

const getStatusSortValue = (status) => {
	if (status === "maintenance") return 1;
	if (status === "revision") return 2;
	if (status === "operation") return 3;
	return 4;
};

const getMachineNameSortValue = (machine) => {
	return String(machine?.identifier || machine?.description || "").toLowerCase();
};


export const selectFilteredMachines = createSelector(
	[selectMachines, selectMachinesFilters],
	(machines, filters) => {
		let filtered = Array.isArray(machines) ? [...machines] : [];

		const search = String(filters?.search || "")
			.trim()
			.toLowerCase();

		if (search) {
			filtered = filtered.filter((machine) => {
				const searchableText = [
					machine?.identifier,
					machine?.description,
					machine?.chassis,
					machine?.brand,
					machine?.model_name,
					machine?.machine_type_label,
					machine?.status_label,
				]
					.filter(Boolean)
					.join(" ")
					.toLowerCase();

				return searchableText.includes(search);
			});
		}

		if (filters?.status?.length > 0) {
			filtered = filtered.filter((machine) =>
				filters.status.includes(machine.status)
			);
		}

		if (filters?.machineType?.length > 0) {
			filtered = filtered.filter((machine) =>
				filters.machineType.includes(machine.machine_type)
			);
		}

		filtered.sort((a, b) => {
			const aMaintenance = getMaintenanceSortValue(a);
			const bMaintenance = getMaintenanceSortValue(b);

			if (aMaintenance !== bMaintenance) {
				return aMaintenance - bMaintenance;
			}

			const aStatus = getStatusSortValue(a.status);
			const bStatus = getStatusSortValue(b.status);

			if (aStatus !== bStatus) {
				return aStatus - bStatus;
			}

			return getMachineNameSortValue(a).localeCompare(getMachineNameSortValue(b));
		});

		return filtered;
	}
);

export const selectMachinesSummary = createSelector(
	[selectFilteredMachines],
	(machines) => {
		const total = machines.length;

		const operation = machines.filter(
			(machine) => machine.status === "operation"
		).length;

		const revision = machines.filter(
			(machine) => machine.status === "revision"
		).length;

		const maintenance = machines.filter(
			(machine) => machine.status === "maintenance"
		).length;

		return {
			total,
			operation,
			revision,
			maintenance,
		};
	}
);