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

export function getMapSvgBase64(highlightIds, rawPolygons) {
    const polygons = rawPolygons.map(t => ({
        id: t.talhao__id_talhao,
        coords: t.map_geo_points.map(p => ({
            lat: +p.latitude,
            lon: +p.longitude,
        })),
    }));

    // ---------- projeção 0‥SIZE × 0‥SIZE ----------
    const toXY = projector(polygons);

    // ---------- monta o SVG em texto ---------------
    const svgBody = polygons
        .map(p => {
            const points = p.coords
                .map(toXY)
                .map(([x, y]) => `${x},${y}`)
                .join(' ');
            const fill = highlightIds.includes(p.id)
                ? 'rgba(80,200,120,0.4)'
                : 'none';
            return `<polygon points="${points}" fill="${fill}" stroke="black" stroke-width="1"/>`;
        })
        .join('');

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" preserveAspectRatio="xMidYMid slice" style="background:#fff">${svgBody}</svg>`;

    return btoa(svg); // <- string pronta
}