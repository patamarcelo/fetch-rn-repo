import React, { useEffect, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    Animated,
    Image,
} from "react-native";

export default function AppSplash() {
    const fade = useRef(new Animated.Value(0)).current;
    const translate = useRef(new Animated.Value(12)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fade, {
                toValue: 1,
                duration: 280,
                useNativeDriver: true,
            }),
            Animated.timing(translate, {
                toValue: 0,
                duration: 280,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    return (
        <View style={styles.container}>
            <Animated.View
                style={[
                    styles.card,
                    {
                        opacity: fade,
                        transform: [{ translateY: translate }],
                    },
                ]}
            >
                {/* Logo Diamante */}
                <View style={styles.logoDiamond}>
                    <Image
                        source={require("../../assets/diamond.png")}
                        style={styles.logoImage}
                        resizeMode="contain"
                    />
                </View>

                <Text style={styles.title}>Diamante</Text>
                <Text style={styles.subtitle}>
                    Controle de Aplicações Agrícolas
                </Text>

                <View style={styles.divider} />

                <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color="#7DD3FC" />
                    <Text style={styles.loadingText}>
                        Sincronizando aplicações…
                    </Text>
                </View>
            </Animated.View>

            <Text style={styles.footer}>
                © {new Date().getFullYear()} Diamante Agrícola
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#0A2540", // azul Diamante
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 24,
    },

    card: {
        width: "100%",
        maxWidth: 420,
        borderRadius: 18,
        paddingVertical: 28,
        paddingHorizontal: 24,
        backgroundColor: "#0F2F55",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
        shadowColor: "#000",
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 6,
    },

    logoDiamond: {
        width: 56,
        height: 56,
        // backgroundColor: "#1E40AF",
        transform: [{ rotate: "45deg" }],
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 18,
        alignSelf: "flex-start",
    },

    logoImage: {
        width: 34,
        height: 34,
        transform: [{ rotate: "-45deg" }],
    },

    title: {
        color: "#FFFFFF",
        fontSize: 22,
        fontWeight: "800",
        letterSpacing: 0.4,
        marginBottom: 4,
    },

    subtitle: {
        color: "#BFDBFE",
        fontSize: 14,
        fontWeight: "500",
    },

    divider: {
        height: 1,
        backgroundColor: "rgba(255,255,255,0.10)",
        marginVertical: 18,
    },

    loadingRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },

    loadingText: {
        color: "#E0F2FE",
        fontSize: 13,
        fontWeight: "600",
    },

    footer: {
        position: "absolute",
        bottom: 24,
        color: "rgba(255,255,255,0.45)",
        fontSize: 12,
    },
});
