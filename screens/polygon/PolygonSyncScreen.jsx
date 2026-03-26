import React, { useMemo, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { polygonActions } from "../../store/redux/polygon";
import { syncSinglePolygon, syncPolygonsSequentially } from "../../services/polygonSyncApi";
import { Colors } from "../../constants/styles";

export default function PolygonSyncScreen() {
    const dispatch = useDispatch();
    const user = useSelector((state) => state.auth.user);
    const items = useSelector((state) => state.polygon.items);

    const [isSendingAll, setIsSendingAll] = useState(false);
    const [sendingIds, setSendingIds] = useState([]);

    const pendingItems = useMemo(() => {
        return (items || []).filter(
            (item) =>
                item?.syncPending === true ||
                item?.status === "sync_pending" ||
                item?.status === "sync_error"
        );
    }, [items]);

    const isSending = (id) => sendingIds.includes(id);

    const handleSendOne = async (item) => {
        if (!item?.id || isSendingAll || isSending(item.id)) return;

        try {
            setSendingIds((prev) => [...prev, item.id]);

            const result = await syncSinglePolygon({
                user,
                polygon: item,
            });

            dispatch(
                polygonActions.markPolygonAsSynced({
                    id: item.id,
                    serverId: result?.serverId,
                })
            );

            Alert.alert(
                "Sucesso ✅",
                `O polígono "${item?.name || "Sem nome"}" foi enviado com sucesso.`
            );
        } catch (error) {
            dispatch(
                polygonActions.markPolygonAsSyncError({
                    id: item.id,
                    error: error?.message || "Erro ao sincronizar",
                })
            );

            Alert.alert(
                "Erro ❌",
                error?.message || "Não foi possível sincronizar este polígono."
            );
        } finally {
            setSendingIds((prev) => prev.filter((id) => id !== item.id));
        }
    };

    const handleSendAll = async () => {
        if (!pendingItems.length || isSendingAll) return;

        try {
            setIsSendingAll(true);

            const results = await syncPolygonsSequentially({
                user,
                polygons: pendingItems,
            });

            let successCount = 0;
            let errorCount = 0;

            results.forEach((result) => {
                if (result?.success) {
                    successCount++;

                    dispatch(
                        polygonActions.markPolygonAsSynced({
                            id: result.localId,
                            serverId: result.serverId,
                        })
                    );
                } else {
                    errorCount++;

                    dispatch(
                        polygonActions.markPolygonAsSyncError({
                            id: result.localId,
                            error: result.error || "Erro ao sincronizar",
                        })
                    );
                }
            });

            if (successCount > 0 && errorCount === 0) {
                Alert.alert(
                    "Sucesso ✅",
                    `${successCount} polígono(s) enviado(s) com sucesso!`
                );
            } else if (successCount > 0 && errorCount > 0) {
                Alert.alert(
                    "Atenção ⚠️",
                    `${successCount} enviado(s) com sucesso.\n${errorCount} com erro.`
                );
            } else {
                Alert.alert("Erro ❌", "Nenhum polígono foi enviado.");
            }
        } catch (error) {
            console.log("handleSendAll error:", error);
            Alert.alert(
                "Erro ❌",
                error?.message || "Falha geral ao sincronizar."
            );
        } finally {
            setIsSendingAll(false);
        }
    };

    const renderItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.cardTextContainer}>
                    <Text style={styles.title}>{item?.name || "Polígono sem nome"}</Text>
                    <Text style={styles.subtitle}>
                        {item?.farmName || "Sem fazenda"} • {item?.mode || "manual"}
                    </Text>
                </View>

                <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>
                        {item?.status === "sync_error" ? "Erro" : "Pendente"}
                    </Text>
                </View>
            </View>

            {!!item?.syncError && (
                <Text style={styles.errorText}>{item.syncError}</Text>
            )}

            <TouchableOpacity
                style={[
                    styles.button,
                    (isSending(item.id) || isSendingAll) && styles.buttonDisabled,
                ]}
                onPress={() => handleSendOne(item)}
                disabled={isSending(item.id) || isSendingAll}
                activeOpacity={0.8}
            >
                {isSending(item.id) ? (
                    <ActivityIndicator size="small" color="#fff" />
                ) : (
                    <>
                        <MaterialCommunityIcons
                            name="cloud-upload-outline"
                            size={18}
                            color="#fff"
                        />
                        <Text style={styles.buttonText}>Enviar</Text>
                    </>
                )}
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.topBar}>
                <View>
                    <Text style={styles.screenTitle}>Sincronização</Text>
                    <Text style={styles.screenSubtitle}>
                        {pendingItems.length} pendente(s) para envio
                    </Text>
                </View>

                <TouchableOpacity
                    style={[
                        styles.sendAllButton,
                        (!pendingItems.length || isSendingAll || sendingIds.length > 0) &&
                            styles.buttonDisabled,
                    ]}
                    onPress={handleSendAll}
                    disabled={!pendingItems.length || isSendingAll || sendingIds.length > 0}
                    activeOpacity={0.8}
                >
                    <MaterialCommunityIcons
                        name="cloud-upload-outline"
                        size={18}
                        color="#fff"
                    />
                    <Text style={styles.sendAllButtonText}>Enviar todos</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={pendingItems}
                keyExtractor={(item) => String(item.id)}
                renderItem={renderItem}
                contentContainerStyle={
                    pendingItems.length === 0 ? styles.emptyContainer : styles.listContent
                }
                ListEmptyComponent={
                    <View style={styles.emptyBox}>
                        <MaterialCommunityIcons
                            name="cloud-check-outline"
                            size={48}
                            color="#666"
                        />
                        <Text style={styles.emptyTitle}>Nada pendente</Text>
                        <Text style={styles.emptySubtitle}>
                            Todos os polígonos já foram sincronizados.
                        </Text>
                    </View>
                }
            />

            {isSendingAll && (
                <View style={styles.fullScreenOverlay}>
                    <View style={styles.fullScreenLoaderBox}>
                        <ActivityIndicator size="large" color="#fff" />
                        <Text style={styles.fullScreenLoaderTitle}>
                            Sincronizando polígonos...
                        </Text>
                        <Text style={styles.fullScreenLoaderSubtitle}>
                            Aguarde enquanto enviamos os itens pendentes.
                        </Text>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.secondary[700],
        padding: 16,
    },
    topBar: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 16,
        gap: 12,
    },
    screenTitle: {
        color: "#fff",
        fontSize: 22,
        fontWeight: "700",
    },
    screenSubtitle: {
        color: "#aaa",
        fontSize: 14,
        marginTop: 4,
    },
    sendAllButton: {
        backgroundColor: "#2E7D32",
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
        minWidth: 140,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 8,
    },
    sendAllButtonText: {
        color: "#fff",
        fontWeight: "700",
    },
    listContent: {
        paddingBottom: 24,
    },
    card: {
        backgroundColor: "#17171C",
        borderRadius: 16,
        padding: 14,
        marginBottom: 12,
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
    },
    cardTextContainer: {
        flex: 1,
    },
    title: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "700",
    },
    subtitle: {
        color: "#aaa",
        fontSize: 13,
        marginTop: 4,
    },
    statusBadge: {
        backgroundColor: "#3A2E12",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
    },
    statusText: {
        color: "#F5C451",
        fontSize: 12,
        fontWeight: "700",
    },
    errorText: {
        color: "#FF6B6B",
        fontSize: 13,
        marginTop: 10,
        marginBottom: 10,
    },
    button: {
        marginTop: 10,
        height: 42,
        borderRadius: 12,
        backgroundColor: "#1565C0",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 8,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    buttonText: {
        color: "#fff",
        fontWeight: "700",
    },
    emptyContainer: {
        flexGrow: 1,
        justifyContent: "center",
    },
    emptyBox: {
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 24,
    },
    emptyTitle: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "700",
        marginTop: 12,
    },
    emptySubtitle: {
        color: "#999",
        fontSize: 14,
        textAlign: "center",
        marginTop: 8,
    },
    fullScreenOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.45)",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
    },
    fullScreenLoaderBox: {
        width: "100%",
        maxWidth: 320,
        backgroundColor: "#17171C",
        borderRadius: 18,
        paddingVertical: 24,
        paddingHorizontal: 18,
        alignItems: "center",
        justifyContent: "center",
    },
    fullScreenLoaderTitle: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "700",
        marginTop: 14,
        textAlign: "center",
    },
    fullScreenLoaderSubtitle: {
        color: "#aaa",
        fontSize: 13,
        marginTop: 8,
        textAlign: "center",
        lineHeight: 18,
    },
});