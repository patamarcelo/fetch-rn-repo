// services/kml.ts
export async function postKmlMerge(LINK, token, body) {
    try {
        const res = await fetch(`${LINK.replace(/\/$/, '')}/plantio/kml_merge_view/`, {
            method: "POST",
            body: JSON.stringify(body),
            headers: {
                "Content-Type": "application/json",
                Authorization: `Token ${token}`,
            },
        });

        if (res.status !== 200) {
            const msg = await res.text().catch(() => "");
            throw new Error(`KML merge HTTP ${res.status} – ${msg}`);
        }

        // O endpoint retorna KML (texto). Pegamos como string.
        const kmlText = await res.text();
        return kmlText;
    } catch (err) {
        throw err;
    }
}
