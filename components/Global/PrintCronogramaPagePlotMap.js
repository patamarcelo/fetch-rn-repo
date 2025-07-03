import { Alert } from 'react-native';
import { encode as btoa } from 'base-64';
import * as FileSystem from 'expo-file-system';   // (continua se precisar em outro lugar)

const SIZE = 640; // px

/** faz min–max ➜ [0..SIZE] × [0..SIZE] */
const projector = (polys) => {
    const lats = polys.flatMap(p => p.coords.map(c => c.lat));
    const lons = polys.flatMap(p => p.coords.map(c => c.lon));
    const [minLat, maxLat] = [Math.min(...lats), Math.max(...lats)];
    const [minLon, maxLon] = [Math.min(...lons), Math.max(...lons)];

    return ({ lat, lon }) => [
        ((lon - minLon) / (maxLon - minLon || 1)) * SIZE,
        ((maxLat - lat) / (maxLat - minLat || 1)) * SIZE  // y invertido
    ];
};

export function getMapSvgString(highlightIds, rawPolygons, culture) {
    try {
        console.time('[PDF] svg-build');
        console.log('[PDF] polígonos:', rawPolygons.length);

        const polygons = rawPolygons.map(t => ({
            id: t.talhao__id_talhao,
            center: { lat: +t.map_centro_id.lat, lon: +t.map_centro_id.lng },
            coords: t.map_geo_points.map(p => ({
                lat: +p.latitude,
                lon: +p.longitude,
            })),
        }));

        const getColor = (c) => ({
            arroz: '#FFD700',
            soja: '#4CAF50',
            feijão: '#8B4513',
            feijao: '#8B4513',
        }[c?.toLowerCase?.()] || '#9E9E9E');

        const toXY = projector(polygons);

        const svgBody = polygons.map(p => {
            const points = p.coords.map(toXY).map(([x, y]) => `${x},${y}`).join(' ');
            const isHighlight = highlightIds.includes(p.id);
            const fill = isHighlight ? getColor(culture) : 'none';

            let label = '';
            if (isHighlight) {
                const [cx, cy] = toXY(p.center);
                label = `<text x="${cx}" y="${cy}" text-anchor="middle"
                     font-size="12" font-weight="bold"
                     fill="white" stroke="black" stroke-width="0.4">${p.id}</text>`;
            }
            return `<polygon points="${points}" fill="${fill}" stroke="black" stroke-width="1"/>${label}`;
        }).join('');

        let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}"
                 viewBox="0 0 ${SIZE} ${SIZE}" preserveAspectRatio="xMidYMid meet"
                 style="background:#fff">${svgBody}</svg>`;

        svg = svg.replace(/\s{2,}/g, ' ').trim();

        console.timeEnd('[PDF] svg-build');
        console.log('[PDF] svg chars:', svg.length);

        return svg;               // <- string SVG pura
    } catch (err) {
        const msg = err?.message || String(err);
        console.error('[PDF] erro em getMapSvgString:', err);

        // avisa visualmente (funciona no Release)
        Alert.alert('Erro ao construir mapa', msg);

        // devolve SVG mínimo para não quebrar o fluxo
        return `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="50">
              <text x="0" y="20" fill="red">Erro ao gerar mapa</text>
            </svg>`;
    }
}



/** Converte a string SVG para data-URI */
export function svgToDataUri(svg) {
    // encodeURIComponent → evita caracteres UTF-8 “quebrarem” o base64
    const encoded = encodeURIComponent(svg).replace(/%([0-9A-F]{2})/g, (_m, p1) =>
        String.fromCharCode('0x' + p1)
    );
    const base64 = btoa(encoded);
    return `data:image/svg+xml;base64,${base64}`;
}