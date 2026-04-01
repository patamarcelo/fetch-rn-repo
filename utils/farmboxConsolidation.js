export const sumNumber = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};

export const normalizeString = (s = "") =>
    String(s || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();

export const normalizeDose = (v) => {
    const n = Number(v || 0);
    return Number.isFinite(n) ? n.toFixed(6) : "0.000000";
};

export const removeDuplicateParcelas = (parcelas = []) => {
    const map = new Map();

    for (const parcela of parcelas) {
        const key =
            parcela?.parcelaId ??
            `${parcela?.parcela || ""}-${parcela?.parcelaAppPlantationId || ""}`;

        if (!map.has(key)) {
            map.set(key, parcela);
        }
    }

    return Array.from(map.values());
};

export const getCompositionSignature = (app) => {
    const prods = Array.isArray(app?.prods) ? app.prods : [];

    return prods
        .filter((p) => (p?.type || "") !== "Operação")
        .map((p) => ({
            product: normalizeString(p?.product || ""),
            dose: normalizeDose(p?.doseSolicitada),
            unit: normalizeString(p?.unit || ""),
        }))
        .sort((a, b) => a.product.localeCompare(b.product))
        .map((p) => `${p.product}|${p.dose}|${p.unit}`)
        .join(";");
};

export const buildCardFromAp = (ap) => {
    const areaSolicitada = sumNumber(ap?.areaSolicitada);
    const areaAplicada = sumNumber(ap?.areaAplicada);
    const saldoAreaAplicar =
        ap?.saldoAreaAplicar != null
            ? sumNumber(ap?.saldoAreaAplicar)
            : Math.max(areaSolicitada - areaAplicada, 0);

    const percent =
        areaSolicitada > 0
            ? Math.min(areaAplicada / areaSolicitada, 1)
            : sumNumber(ap?.percent || 0);

    return {
        ...ap,
        cardKey: `normal-${ap?.code}`,
        isConsolidated: false,
        displayCode: ap?.code || "-",
        codes: [ap?.code].filter(Boolean),
        aps: [ap],
        parcelas: Array.isArray(ap?.parcelas) ? ap.parcelas : [],
        areaSolicitada,
        areaAplicada,
        saldoAreaAplicar,
        percent,
        signature: getCompositionSignature(ap),
    };
};

export const buildConsolidatedCards = (apps = []) => {
    const groups = new Map();

    for (const ap of apps) {
        const signature = getCompositionSignature(ap);

        const groupKey = [
            normalizeString(ap?.farmName || ""),
            normalizeString(ap?.ciclo || ""),
            signature,
        ].join("::");

        if (!groups.has(groupKey)) {
            const baseAreaSolicitada = sumNumber(ap?.areaSolicitada);
            const baseAreaAplicada = sumNumber(ap?.areaAplicada);
            const baseSaldo =
                ap?.saldoAreaAplicar != null
                    ? sumNumber(ap?.saldoAreaAplicar)
                    : Math.max(baseAreaSolicitada - baseAreaAplicada, 0);

            groups.set(groupKey, {
                ...ap,
                cardKey: `group-${groupKey}`,
                groupKey,
                isConsolidated: true,
                displayCode: "Consolidado de Aplicações",
                codes: ap?.code ? [ap.code] : [],
                aps: [ap],
                parcelas: Array.isArray(ap?.parcelas) ? [...ap.parcelas] : [],
                areaSolicitada: baseAreaSolicitada,
                areaAplicada: baseAreaAplicada,
                saldoAreaAplicar: baseSaldo,
                signature,
            });
        } else {
            const existing = groups.get(groupKey);

            existing.codes = Array.from(new Set([...existing.codes, ap?.code].filter(Boolean)));
            existing.aps.push(ap);
            existing.parcelas = [...existing.parcelas, ...(ap?.parcelas || [])];

            const areaSolicitada = sumNumber(ap?.areaSolicitada);
            const areaAplicada = sumNumber(ap?.areaAplicada);
            const saldo =
                ap?.saldoAreaAplicar != null
                    ? sumNumber(ap?.saldoAreaAplicar)
                    : Math.max(areaSolicitada - areaAplicada, 0);

            existing.areaSolicitada += areaSolicitada;
            existing.areaAplicada += areaAplicada;
            existing.saldoAreaAplicar += saldo;
        }
    }

    return Array.from(groups.values()).map((group) => {
        const percent =
            group.areaSolicitada > 0
                ? Math.min(group.areaAplicada / group.areaSolicitada, 1)
                : 0;

        return {
            ...group,
            parcelas: removeDuplicateParcelas(group.parcelas),
            totalAps: group.codes.length,
            displayCode: `${group.codes.length} AP${group.codes.length > 1 ? "s" : ""}`,
            percent,
        };
    });
};

export const buildExportCards = (apps = [], viewMode = "normal") => {
    const raw = Array.isArray(apps) ? apps : [];

    if (viewMode === "consolidated") {
        return buildConsolidatedCards(raw);
    }

    return raw.map(buildCardFromAp);
};