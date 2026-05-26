import { Platform } from "react-native";

export const CUSTOM_TAB_BAR_HEIGHT = Platform.OS === "ios" ? 84 : 72;

export const CUSTOM_TAB_BAR_BOTTOM_OFFSET = Platform.OS === "ios" ? 6 : 8;

export const CUSTOM_TAB_BAR_TOTAL_HEIGHT =
	CUSTOM_TAB_BAR_HEIGHT + CUSTOM_TAB_BAR_BOTTOM_OFFSET;

export const CUSTOM_TAB_BAR_CONTENT_PADDING =
	CUSTOM_TAB_BAR_TOTAL_HEIGHT + 32;

export const CUSTOM_TAB_BAR_FAB_BOTTOM =
	CUSTOM_TAB_BAR_TOTAL_HEIGHT + 22;