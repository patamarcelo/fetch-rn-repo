import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
	View,
	Text,
	StyleSheet,
	Pressable,
	ScrollView,
	ActivityIndicator,
	Alert,
	StatusBar,
	Platform,
	TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";

import { Colors } from "../../constants/styles";
import { LINKMachine } from "../../utils/api";
import { maquinarioActions } from "../../store/redux/maquinario";

const cleanMachineLocation = (value) => {
	const cleaned = String(value || "")
		.replace(/\bProjeto\b\s*[:\-–—]?\s*/gi, "")
		.replace(/\bFazenda\b\s*[:\-–—]?\s*/gi, "")
		.replace(/\s{2,}/g, " ")
		.trim();

	return cleaned || "Não informada";
};

const normalizeSearch = (value) =>
	String(value || "")
		.trim()
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "");

const MachineTransferFarmScreen = ({ route, navigation }) => {
	const dispatch = useDispatch();
	const machineId = route?.params?.machineId;

	const machine = useSelector((state) =>
		(state?.maquinario?.machines || []).find(
			(item) => String(item?.id) === String(machineId)
		)
	);

	const authUser = useSelector((state) => state?.auth?.user || null);

	const [farms, setFarms] = useState([]);
	const [selectedFarmId, setSelectedFarmId] = useState(null);
	const [search, setSearch] = useState("");
	const [notes, setNotes] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState(null);

	useFocusEffect(
		useCallback(() => {
			StatusBar.setBarStyle("dark-content");

			if (Platform.OS === "android") {
				StatusBar.setBackgroundColor("#D6E3F3");
			}
		}, [])
	);

	const machineName =
		machine?.description ||
		machine?.identifier ||
		machine?.machine_type_label ||
		"Máquina";

	const currentFarmName = cleanMachineLocation(
		machine?.fazenda_name || machine?.farm_name || machine?.location_name
	);

	const filteredFarms = useMemo(() => {
		const term = normalizeSearch(search);

		return farms.filter((farm) => {
			const name = normalizeSearch(farm?.name);

			if (!term) return true;

			return name.includes(term);
		});
	}, [farms, search]);

	const selectedFarm = useMemo(() => {
		return farms.find((farm) => String(farm.id) === String(selectedFarmId));
	}, [farms, selectedFarmId]);

	const isSameFarm =
		selectedFarmId &&
		String(selectedFarmId) === String(machine?.fazenda);

	const canSave = !!selectedFarmId && !isSameFarm && !isSaving;

	const handleBack = useCallback(() => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

		if (navigation?.canGoBack?.()) {
			navigation.goBack();
			return;
		}

		navigation.navigate("MachineDetailScreen", {
			machineId,
		});
	}, [navigation, machineId]);

	const loadFarms = useCallback(async () => {
		try {
			setIsLoading(true);
			setError(null);

			const customClaims =
				authUser?.customClaims ||
				authUser?.claims ||
				authUser?.stsTokenManager?.claims ||
				null;

			const response = await fetch(
				`${LINKMachine}/maquinario/machines/farms_options/`,
				{
					method: "POST",
					body: JSON.stringify({
						user: authUser
							? {
									uid: authUser.uid || null,
									email: authUser.email || null,
									displayName: authUser.displayName || null,
									customClaims,
							  }
							: null,
					}),
					headers: {
						"Content-Type": "application/json",
						Authorization: `Token ${process.env.EXPO_PUBLIC_REACT_APP_DJANGO_TOKEN}`,
					},
				}
			);

			if (!response.ok) {
				const text = await response.text();
				throw new Error(text || "Erro ao carregar fazendas.");
			}

			const data = await response.json();

			setFarms(Array.isArray(data?.data) ? data.data : []);
		} catch (err) {
			console.log("Erro ao carregar fazendas:", err);
			setError(err?.message || "Não foi possível carregar as fazendas.");
		} finally {
			setIsLoading(false);
		}
	}, [authUser]);

	useEffect(() => {
		loadFarms();
	}, [loadFarms]);

	const handleSave = useCallback(async () => {
		if (!machine?.id) {
			Alert.alert("Máquina inválida", "Não foi possível identificar a máquina.");
			return;
		}

		if (!selectedFarmId) {
			Alert.alert("Selecione a fazenda", "Escolha a fazenda de destino.");
			return;
		}

		if (isSameFarm) {
			Alert.alert(
				"Mesma fazenda",
				"A máquina já está vinculada a essa fazenda."
			);
			return;
		}

		Alert.alert(
			"Confirmar transferência",
			`Transferir "${machineName}" de "${currentFarmName}" para "${selectedFarm?.name}"?`,
			[
				{
					text: "Cancelar",
					style: "cancel",
				},
				{
					text: "Transferir",
					style: "default",
					onPress: async () => {
						try {
							setIsSaving(true);
							Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

							const customClaims =
								authUser?.customClaims ||
								authUser?.claims ||
								authUser?.stsTokenManager?.claims ||
								null;

							const payload = {
								to_fazenda: selectedFarmId,
								source: "app",
								notes,
								user: authUser
									? {
											uid: authUser.uid || null,
											email: authUser.email || null,
											displayName: authUser.displayName || null,
											customClaims,
									  }
									: null,
							};

							const response = await fetch(
								`${LINKMachine}/maquinario/machines/${machine.id}/transfer_farm/`,
								{
									method: "POST",
									body: JSON.stringify(payload),
									headers: {
										"Content-Type": "application/json",
										Authorization: `Token ${process.env.EXPO_PUBLIC_REACT_APP_DJANGO_TOKEN}`,
									},
								}
							);

							if (!response.ok) {
								let errorMessage = "Não foi possível transferir a máquina.";

								try {
									const errorData = await response.json();
									errorMessage =
										errorData?.error ||
										errorData?.detail ||
										JSON.stringify(errorData) ||
										errorMessage;
								} catch {
									errorMessage = await response.text();
								}

								throw new Error(errorMessage);
							}

							const data = await response.json();

							if (data?.machine) {
								dispatch(maquinarioActions.replaceMachineFromApi(data.machine));
							}

							Alert.alert(
								"Máquina transferida",
								`A máquina foi transferida para ${selectedFarm?.name}.`,
								[
									{
										text: "OK",
										onPress: () => navigation.goBack(),
									},
								]
							);
						} catch (err) {
							console.log("Erro ao transferir máquina:", err);

							Alert.alert(
								"Erro ao transferir",
								err?.message || "Não foi possível transferir a máquina."
							);
						} finally {
							setIsSaving(false);
						}
					},
				},
			]
		);
	}, [
		machine,
		selectedFarmId,
		isSameFarm,
		machineName,
		currentFarmName,
		selectedFarm,
		authUser,
		notes,
		dispatch,
		navigation,
	]);

	if (!machine) {
		return (
			<SafeAreaView style={styles.root} edges={["top"]}>
				<View style={styles.notFoundCard}>
					<Ionicons name="alert-circle-outline" size={32} color="#B42318" />
					<Text style={styles.notFoundTitle}>Máquina não encontrada</Text>
					<Text style={styles.notFoundDescription}>
						Volte para a lista e tente abrir novamente.
					</Text>

					<Pressable onPress={handleBack} style={styles.notFoundButton}>
						<Text style={styles.notFoundButtonText}>Voltar</Text>
					</Pressable>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.root} edges={["top"]}>
			<ScrollView
				showsVerticalScrollIndicator={false}
				keyboardShouldPersistTaps="handled"
				contentContainerStyle={styles.scrollContent}
			>
				<View style={styles.topBar}>
					<Pressable
						onPress={handleBack}
						hitSlop={10}
						style={({ pressed }) => [
							styles.topIconButton,
							pressed && styles.pressed,
						]}
					>
						<Ionicons name="chevron-back" size={23} color="#0F172A" />
					</Pressable>

					<View style={styles.topTitleBox}>
						<Text style={styles.topTitle}>Transferir fazenda</Text>
						<Text style={styles.topSubtitle}>Alterar localização da máquina</Text>
					</View>
				</View>

				<View style={styles.machineCard}>
					<View style={styles.machineTopLine}>
						<View style={styles.machineIconBox}>
							<Ionicons name="construct-outline" size={23} color={Colors.primary[800]} />
						</View>

						<View style={styles.machineTextBox}>
							<Text style={styles.machineCode}>
								{machine?.identifier || "Sem código"}
							</Text>
							<Text style={styles.machineName} numberOfLines={2}>
								{machineName}
							</Text>
						</View>
					</View>

					<View style={styles.currentFarmBox}>
						<Text style={styles.currentFarmLabel}>Fazenda atual</Text>
						<Text style={styles.currentFarmValue} numberOfLines={1}>
							{currentFarmName}
						</Text>
					</View>
				</View>

				<View style={styles.formCard}>
					<Text style={styles.formTitle}>Escolha a nova fazenda</Text>
					<Text style={styles.formDescription}>
						A transferência altera a fazenda atual da máquina e salva um histórico para auditoria.
					</Text>

					<View style={styles.searchBox}>
						<Ionicons name="search-outline" size={18} color="rgba(15,23,42,0.45)" />
						<TextInput
							value={search}
							onChangeText={setSearch}
							placeholder="Buscar fazenda..."
							placeholderTextColor="rgba(15,23,42,0.36)"
							style={styles.searchInput}
							autoCorrect={false}
						/>
						{search ? (
							<Pressable onPress={() => setSearch("")} hitSlop={10}>
								<Ionicons name="close-circle" size={18} color="rgba(15,23,42,0.38)" />
							</Pressable>
						) : null}
					</View>

					{isLoading ? (
						<View style={styles.loadingBox}>
							<ActivityIndicator size="small" color={Colors.primary[700]} />
							<Text style={styles.loadingText}>Carregando fazendas...</Text>
						</View>
					) : error ? (
						<View style={styles.errorBox}>
							<Text style={styles.errorTitle}>Não foi possível carregar</Text>
							<Text style={styles.errorDescription}>{error}</Text>

							<Pressable onPress={loadFarms} style={styles.retryButton}>
								<Text style={styles.retryButtonText}>Tentar novamente</Text>
							</Pressable>
						</View>
					) : (
						<View style={styles.farmsList}>
							{filteredFarms.map((farm) => {
								const selected = String(farm.id) === String(selectedFarmId);
								const sameFarm = String(farm.id) === String(machine?.fazenda);

								return (
									<Pressable
										key={farm.id}
										onPress={() => {
											Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
											setSelectedFarmId(farm.id);
										}}
										style={({ pressed }) => [
											styles.farmOption,
											selected && styles.farmOptionSelected,
											sameFarm && styles.farmOptionCurrent,
											pressed && styles.pressed,
										]}
									>
										<View style={styles.farmOptionIconBox}>
											<Ionicons
												name={selected ? "checkmark-circle" : "location-outline"}
												size={19}
												color={selected ? Colors.primary[800] : "rgba(15,23,42,0.48)"}
											/>
										</View>

										<View style={styles.farmOptionTextBox}>
											<Text style={styles.farmOptionTitle} numberOfLines={1}>
												{farm.name}
											</Text>

											<Text style={styles.farmOptionSubtitle}>
												{sameFarm ? "Fazenda atual" : "Selecionar como destino"}
											</Text>
										</View>
									</Pressable>
								);
							})}

							{filteredFarms.length === 0 ? (
								<View style={styles.emptyBox}>
									<Text style={styles.emptyTitle}>Nenhuma fazenda encontrada</Text>
									<Text style={styles.emptyDescription}>
										Tente buscar por outro nome.
									</Text>
								</View>
							) : null}
						</View>
					)}

					<View style={styles.notesBlock}>
						<Text style={styles.notesLabel}>Observação</Text>
						<View style={styles.notesShell}>
							<TextInput
								value={notes}
								onChangeText={setNotes}
								placeholder="Opcional"
								placeholderTextColor="rgba(15,23,42,0.36)"
								style={styles.notesInput}
								multiline
								textAlignVertical="top"
							/>
						</View>
					</View>
				</View>
			</ScrollView>

			<View style={styles.footer}>
				<Pressable
					onPress={handleSave}
					disabled={!canSave}
					style={({ pressed }) => [
						styles.saveButton,
						!canSave && styles.saveButtonDisabled,
						pressed && canSave && styles.pressed,
					]}
				>
					{isSaving ? (
						<ActivityIndicator size="small" color="#FFFFFF" />
					) : (
						<Ionicons name="swap-horizontal-outline" size={20} color="#FFFFFF" />
					)}

					<Text style={styles.saveButtonText}>
						{isSaving ? "Transferindo..." : "Transferir máquina"}
					</Text>
				</Pressable>
			</View>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	root: {
		flex: 1,
		backgroundColor: "#D6E3F3",
	},

	scrollContent: {
		paddingHorizontal: 16,
		paddingTop: 10,
		paddingBottom: 120,
	},

	topBar: {
		minHeight: 48,
		marginBottom: 10,
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
	},

	topIconButton: {
		width: 42,
		height: 42,
		borderRadius: 16,
		backgroundColor: "rgba(255,255,255,0.86)",
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.08)",
		alignItems: "center",
		justifyContent: "center",
		shadowColor: "#000",
		shadowOpacity: 0.04,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 5 },
		elevation: 1,
	},

	topTitleBox: {
		flex: 1,
	},

	topTitle: {
		color: "#0F172A",
		fontSize: 14,
		fontWeight: "900",
		letterSpacing: -0.2,
	},

	topSubtitle: {
		marginTop: 1,
		color: "rgba(15,23,42,0.48)",
		fontSize: 11,
		fontWeight: "800",
	},

	machineCard: {
		backgroundColor: "#FFFFFF",
		borderRadius: 26,
		padding: 16,
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.08)",
		shadowColor: "#000",
		shadowOpacity: 0.07,
		shadowRadius: 16,
		shadowOffset: { width: 0, height: 9 },
		elevation: 2,
	},

	machineTopLine: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
	},

	machineIconBox: {
		width: 52,
		height: 52,
		borderRadius: 19,
		backgroundColor: "rgba(22,101,52,0.10)",
		borderWidth: 1,
		borderColor: "rgba(22,101,52,0.12)",
		alignItems: "center",
		justifyContent: "center",
	},

	machineTextBox: {
		flex: 1,
		minWidth: 0,
	},

	machineCode: {
		color: Colors.primary[800],
		fontSize: 11,
		fontWeight: "900",
		textTransform: "uppercase",
		letterSpacing: 0.45,
	},

	machineName: {
		marginTop: 3,
		color: "#0F172A",
		fontSize: 15,
		fontWeight: "900",
		lineHeight: 19,
		letterSpacing: -0.2,
	},

	currentFarmBox: {
		marginTop: 14,
		borderRadius: 18,
		padding: 13,
		backgroundColor: "rgba(22,101,52,0.07)",
		borderWidth: 1,
		borderColor: "rgba(22,101,52,0.13)",
	},

	currentFarmLabel: {
		color: "rgba(15,23,42,0.48)",
		fontSize: 10,
		fontWeight: "900",
		textTransform: "uppercase",
		letterSpacing: 0.25,
	},

	currentFarmValue: {
		marginTop: 4,
		color: Colors.primary[800],
		fontSize: 18,
		fontWeight: "900",
		letterSpacing: -0.3,
	},

	formCard: {
		marginTop: 14,
		backgroundColor: "#FFFFFF",
		borderRadius: 26,
		padding: 16,
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.08)",
		shadowColor: "#000",
		shadowOpacity: 0.05,
		shadowRadius: 14,
		shadowOffset: { width: 0, height: 8 },
		elevation: 2,
	},

	formTitle: {
		color: "#0F172A",
		fontSize: 16,
		fontWeight: "900",
		letterSpacing: -0.3,
	},

	formDescription: {
		marginTop: 4,
		color: "rgba(15,23,42,0.52)",
		fontSize: 12,
		fontWeight: "700",
		lineHeight: 17,
	},

	searchBox: {
		marginTop: 14,
		minHeight: 48,
		borderRadius: 18,
		backgroundColor: "rgba(15,23,42,0.035)",
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.08)",
		paddingHorizontal: 13,
		flexDirection: "row",
		alignItems: "center",
		gap: 9,
	},

	searchInput: {
		flex: 1,
		color: "#0F172A",
		fontSize: 13,
		fontWeight: "800",
		paddingVertical: 10,
	},

	loadingBox: {
		marginTop: 14,
		borderRadius: 18,
		padding: 16,
		backgroundColor: "rgba(15,23,42,0.035)",
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
	},

	loadingText: {
		color: "rgba(15,23,42,0.55)",
		fontSize: 12,
		fontWeight: "800",
	},

	errorBox: {
		marginTop: 14,
		borderRadius: 18,
		padding: 14,
		backgroundColor: "rgba(255,245,245,0.96)",
		borderWidth: 1,
		borderColor: "rgba(180,35,24,0.16)",
	},

	errorTitle: {
		color: "#B42318",
		fontSize: 13,
		fontWeight: "900",
	},

	errorDescription: {
		marginTop: 4,
		color: "rgba(15,23,42,0.54)",
		fontSize: 11,
		fontWeight: "700",
		lineHeight: 16,
	},

	retryButton: {
		marginTop: 10,
		alignSelf: "flex-start",
		borderRadius: 999,
		paddingHorizontal: 12,
		paddingVertical: 8,
		backgroundColor: "rgba(180,35,24,0.10)",
	},

	retryButtonText: {
		color: "#B42318",
		fontSize: 11,
		fontWeight: "900",
	},

	farmsList: {
		marginTop: 12,
		gap: 8,
	},

	farmOption: {
		borderRadius: 18,
		padding: 11,
		backgroundColor: "rgba(15,23,42,0.025)",
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.06)",
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
	},

	farmOptionSelected: {
		backgroundColor: "rgba(22,101,52,0.07)",
		borderColor: "rgba(22,101,52,0.22)",
	},

	farmOptionCurrent: {
		opacity: 0.68,
	},

	farmOptionIconBox: {
		width: 34,
		height: 34,
		borderRadius: 13,
		backgroundColor: "rgba(255,255,255,0.72)",
		alignItems: "center",
		justifyContent: "center",
	},

	farmOptionTextBox: {
		flex: 1,
		minWidth: 0,
	},

	farmOptionTitle: {
		color: "#0F172A",
		fontSize: 13,
		fontWeight: "900",
	},

	farmOptionSubtitle: {
		marginTop: 2,
		color: "rgba(15,23,42,0.48)",
		fontSize: 10.5,
		fontWeight: "700",
	},

	emptyBox: {
		borderRadius: 18,
		padding: 15,
		backgroundColor: "rgba(15,23,42,0.03)",
		alignItems: "center",
	},

	emptyTitle: {
		color: "#0F172A",
		fontSize: 13,
		fontWeight: "900",
	},

	emptyDescription: {
		marginTop: 3,
		color: "rgba(15,23,42,0.50)",
		fontSize: 11,
		fontWeight: "700",
	},

	notesBlock: {
		marginTop: 16,
	},

	notesLabel: {
		marginBottom: 7,
		color: "rgba(15,23,42,0.56)",
		fontSize: 11,
		fontWeight: "900",
		textTransform: "uppercase",
		letterSpacing: 0.3,
	},

	notesShell: {
		minHeight: 90,
		borderRadius: 18,
		backgroundColor: "rgba(15,23,42,0.035)",
		borderWidth: 1,
		borderColor: "rgba(15,23,42,0.08)",
		paddingHorizontal: 13,
		paddingTop: 10,
	},

	notesInput: {
		flex: 1,
		minHeight: 70,
		color: "#0F172A",
		fontSize: 13,
		fontWeight: "700",
		lineHeight: 18,
	},

	footer: {
		position: "absolute",
		left: 0,
		right: 0,
		bottom: 0,
		paddingHorizontal: 16,
		paddingTop: 12,
		paddingBottom: 18,
		backgroundColor: "rgba(214,227,243,0.96)",
		borderTopWidth: 1,
		borderTopColor: "rgba(15,23,42,0.06)",
	},

	saveButton: {
		height: 52,
		borderRadius: 19,
		backgroundColor: Colors.primary[800],
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
		shadowColor: "#000",
		shadowOpacity: 0.12,
		shadowRadius: 14,
		shadowOffset: { width: 0, height: 8 },
		elevation: 3,
	},

	saveButtonDisabled: {
		opacity: 0.48,
	},

	saveButtonText: {
		color: "#FFFFFF",
		fontSize: 14,
		fontWeight: "900",
	},

	notFoundCard: {
		margin: 18,
		marginTop: 80,
		backgroundColor: "#FFFFFF",
		borderRadius: 24,
		padding: 22,
		alignItems: "center",
		borderWidth: 1,
		borderColor: "rgba(180,35,24,0.16)",
	},

	notFoundTitle: {
		marginTop: 10,
		color: "#0F172A",
		fontSize: 16,
		fontWeight: "900",
	},

	notFoundDescription: {
		marginTop: 4,
		color: "rgba(15,23,42,0.52)",
		fontSize: 12,
		fontWeight: "700",
		textAlign: "center",
	},

	notFoundButton: {
		marginTop: 14,
		borderRadius: 999,
		paddingHorizontal: 16,
		paddingVertical: 10,
		backgroundColor: Colors.primary[800],
	},

	notFoundButtonText: {
		color: "#FFFFFF",
		fontSize: 12,
		fontWeight: "900",
	},

	pressed: {
		opacity: 0.78,
		transform: [{ scale: 0.99 }],
	},
});

export default MachineTransferFarmScreen;