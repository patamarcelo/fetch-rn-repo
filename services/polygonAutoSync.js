// services/polygonAutoSync.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import { syncPolygonsSequentially } from "./polygonSyncApi";

const AUTO_SYNC_KEY = "polygon_last_auto_sync_date";

function getTodayKey() {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, "0");
	const day = String(now.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

export async function runPolygonAutoSyncIfNeeded({
	user,
	pendingPolygons,
	onSuccessItem,
	onErrorItem,
}) {
	try {
		const todayKey = getTodayKey();
		const lastAutoSyncDate = await AsyncStorage.getItem(AUTO_SYNC_KEY);

		if (lastAutoSyncDate === todayKey) {
			return { skipped: true, reason: "already_synced_today" };
		}

		if (!pendingPolygons?.length) {
			await AsyncStorage.setItem(AUTO_SYNC_KEY, todayKey);
			return { skipped: true, reason: "no_pending_items" };
		}

		const results = await syncPolygonsSequentially({
			user,
			polygons: pendingPolygons,
		});

		results.forEach((result) => {
			if (result.success) {
				onSuccessItem?.(result);
			} else {
				onErrorItem?.(result);
			}
		});

		await AsyncStorage.setItem(AUTO_SYNC_KEY, todayKey);

		return {
			skipped: false,
			results,
		};
	} catch (error) {
		console.log("AUTO SYNC ERROR:", error);
		return {
			skipped: false,
			error,
		};
	}
}