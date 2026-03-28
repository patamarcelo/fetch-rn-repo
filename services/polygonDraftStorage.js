import AsyncStorage from "@react-native-async-storage/async-storage";

export const POLYGON_DRAFT_STORAGE_KEY = "@polygon_manual_draft_backup_v1";

export async function savePolygonDraftBackup({ draft, farmQuery = "" }) {
	try {
		const payload = {
			draft: {
				id: draft?.id || null,
				name: draft?.name || "",
				farmId: draft?.farmId || null,
				farmName: draft?.farmName || "",
				mode: draft?.mode || "manual",
				points: Array.isArray(draft?.points) ? draft.points : [],
				isClosed: !!draft?.isClosed,
				observation: draft?.observation || "",
				followMe: !!draft?.followMe,
				autoMinDistance: Number(draft?.autoMinDistance ?? 10),
				autoMinSeconds: Number(draft?.autoMinSeconds ?? 3),
				startedAt: draft?.startedAt || null,
				finishedAt: draft?.finishedAt || null,
			},
			farmQuery: farmQuery || draft?.farmName || "",
			savedAt: new Date().toISOString(),
		};

		await AsyncStorage.setItem(
			POLYGON_DRAFT_STORAGE_KEY,
			JSON.stringify(payload)
		);
	} catch (error) {
		console.log("SAVE POLYGON DRAFT BACKUP ERROR:", error);
	}
}

export async function clearPolygonDraftBackup() {
	try {
		await AsyncStorage.removeItem(POLYGON_DRAFT_STORAGE_KEY);
	} catch (error) {
		console.log("CLEAR POLYGON DRAFT BACKUP ERROR:", error);
	}
}