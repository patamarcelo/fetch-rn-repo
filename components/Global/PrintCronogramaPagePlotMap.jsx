import * as FileSystem from "expo-file-system";
import { encode as btoa } from "base-64";   // expo install base-64

const SIZE = 640; // px

/** faz min–max ➜ [0..SIZE] × [0..SIZE] */
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

export function getMapSvgBase64(highlightIds, rawPolygons, culture) {
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
    const getColor = c => ({
        arroz: '#FFD700',
        soja: '#4CAF50',
        feijão: '#8B4513',
        feijao: '#8B4513',
    }[c.toLowerCase()] || '#9E9E9E');

    /* projection ----------------------------------------------------------- */
    const toXY = projector(polygons);        // keeps your existing projector

    /* build SVG ------------------------------------------------------------ */
    const svgBody = polygons.map(p => {
        const points = p.coords
            .map(toXY)
            .map(([x, y]) => `${x},${y}`)
            .join(' ');

        const isHighlight = highlightIds.includes(p.id);
        const fill = isHighlight ? getColor(culture) : 'none';

        /* label only for highlighted polygons */
        let label = '';
        if (isHighlight) {
            const [cx, cy] = toXY(p.center);     // project the pre-computed centre
            label = `<text x="${cx}" y="${cy}" text-anchor="middle"
                     font-size="12" font-weight="bold"
                     fill="white" stroke="black" stroke-width="0.4">
                 ${p.id}
               </text>`;
        }

        return `
      <polygon points="${points}" fill="${fill}"
               stroke="black" stroke-width="1"/>
      ${label}`;
    }).join('');

    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg"
         width="${SIZE}" height="${SIZE}"
         viewBox="0 0 ${SIZE} ${SIZE}"
         preserveAspectRatio="xMidYMid slice"
         style="background:#fff">
      ${svgBody}
    </svg>`;

    return btoa(svg);    // base-64 string ready for <img>, <iframe> …
}