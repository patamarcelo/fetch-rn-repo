import base64 from 'react-native-base64';

const SIZE = 640; // px

/** faz min–max ➜ [0..SIZE] × [0..SIZE] */
console.log('[FLATMAP-CHECK] typeof [].at →', typeof [].flatMap);
if (typeof base64?.encode === 'function') {
    // ✅ está presente — pode usar
    const encoded = base64.encode('anything');
    console.log('SVG em base-64:', encoded.slice(0, 5) + '…');
} else {
    console.log('[Base64] encode não encontrado — caindo para alternativa');
    // fallback: usar outro pacote, polyfill ou abortar
}
const projector = (polys) => {
    const lats = polys.flatMap(p => p.coords.map(c => c.lat));
    const lons = polys.flatMap(p => p.coords.map(c => c.lon));
    const [minLat, maxLat] = [Math.min(...lats), Math.max(...lats)];
    const [minLon, maxLon] = [Math.min(...lons), Math.max(...lons)];

    return ({ lat, lon }) => [
        ((lon - minLon) / (maxLon - minLon)) * SIZE,
        ((maxLat - lat) / (maxLat - minLat)) * SIZE   // y invertido
    ];
};

const dbg = (tag, v) => console.log(`[DBG] ${tag}:`, typeof v, v?.constructor?.name);
export function getMapSvgBase64(highlightIds = [], rawPolygons = [], culture = '') {
    dbg('flatMap', [].flatMap);
    dbg('highlightIds', highlightIds);
    dbg('rawPolygons', rawPolygons);
    dbg('culture', culture);
    const polygons = rawPolygons.map(t => ({
        id: t.talhao__id_talhao,
        center: {               // lat/lon of the label
            lat: +t.map_centro_id.lat,
            lon: +t.map_centro_id.lng,
        },
        coords: t.map_geo_points.map(p => ({
            lat: +p.latitude,
            lon: +p.longitude,
        })),
    }));

    /* color helper --------------------------------------------------------- */
    const getColor = (c) => ({
        arroz: "#FFD700",
        soja: "rgba(46,125,50,0.65)",     // verde um pouco mais fechado
        feijão: "rgba(101,67,33,0.65)",
        feijao: "rgba(101,67,33,0.65)",
    }[String(c || "").toLowerCase()] || "rgba(158,158,158,0.6)");

    /* projection ----------------------------------------------------------- */
    const toXY = projector(polygons); // keeps your existing projector

    /* build SVG ------------------------------------------------------------ */
    const isLightColor = (fill) => {
        // Aceita "#RRGGBB", "rgb(r,g,b)" ou "rgba(r,g,b,a)"
        if (!fill) return false;

        // Hex
        if (fill[0] === "#" && (fill.length === 7 || fill.length === 4)) {
            const hex = fill.length === 4
                ? `#${fill[1]}${fill[1]}${fill[2]}${fill[2]}${fill[3]}${fill[3]}`
                : fill;
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
            return luminance > 180;
        }

        // rgb/rgba
        const nums = String(fill).match(/\d+(\.\d+)?/g);
        if (!nums || nums.length < 3) return false;
        const [r, g, b] = nums.map(Number);
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
        return luminance > 180;
    };

    const svgBody = polygons.map((p) => {
        const points = p.coords
            .map(toXY)
            .map(([x, y]) => `${x},${y}`)
            .join(" ");

        const isHighlight = highlightIds?.includes(p.id);

        // Cor do talhão somente quando destacado
        const fillColor = isHighlight ? getColor(culture) : "none";
        const lightBg = isHighlight ? isLightColor(fillColor) : false;

        // Label: auto-contraste
        const textFill = lightBg ? "#111" : "#FFF";
        const strokeFill = lightBg ? "#FFF" : "#000";

        // Ajuste de tamanho/halo
        const fontSize = isHighlight ? 11 : 9;
        const strokeWidth = isHighlight ? 1.3 : 1.0;

        /* label only for highlighted polygons */
        let label = "";
        if (isHighlight) {
            const [cx, cy] = toXY(p.center); // project the pre-computed centre

            label = `
      <text
        x="${cx}"
        y="${cy}"
        text-anchor="middle"
        dominant-baseline="middle"
        font-size="${fontSize}"
        font-weight="700"
        fill="${textFill}"
        stroke="${strokeFill}"
        stroke-width="${strokeWidth}"
        paint-order="stroke fill"
      >${p.id}</text>
    `;
        }


        return `
    <polygon
      points="${points}"
      fill="${fillColor}"
      stroke="#000"
      stroke-width="0.35"
    />
    ${label}
  `;
    }).join("");

    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg"
         width="${SIZE}" height="${SIZE}"
         viewBox="0 0 ${SIZE} ${SIZE}"
         preserveAspectRatio="xMidYMid slice"
         style="background:#fff">
      ${svgBody}
    </svg>`;

    const encodedString = base64.encode(svg);
    return encodedString;
}