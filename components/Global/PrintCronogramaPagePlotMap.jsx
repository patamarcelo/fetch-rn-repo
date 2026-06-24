import base64 from "react-native-base64";

const TARGET_LONG_SIDE = 1200;
const MIN_SHORT_SIDE = 280;
const MAP_PADDING = 42;

const EARTH_RADIUS_METERS = 6378137;

const normalizeId = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const escapeXml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const clamp = (
  value,
  minimum,
  maximum
) =>
  Math.min(
    Math.max(value, minimum),
    maximum
  );

const toFiniteNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
};

const getColor = (culture) => {
  const normalizedCulture = String(
    culture || ""
  )
    .trim()
    .toLowerCase();

  const colors = {
    arroz: "#FFD700",
    soja: "rgba(46,125,50,0.65)",
    feijão: "rgba(101,67,33,0.65)",
    feijao: "rgba(101,67,33,0.65)",
  };

  return (
    colors[normalizedCulture] ||
    "rgba(158,158,158,0.6)"
  );
};

const isLightColor = (fill) => {
  if (!fill) {
    return false;
  }

  if (
    fill[0] === "#" &&
    (
      fill.length === 7 ||
      fill.length === 4
    )
  ) {
    const normalizedHex =
      fill.length === 4
        ? `#${fill[1]}${fill[1]}${fill[2]}${fill[2]}${fill[3]}${fill[3]}`
        : fill;

    const red = parseInt(
      normalizedHex.slice(1, 3),
      16
    );

    const green = parseInt(
      normalizedHex.slice(3, 5),
      16
    );

    const blue = parseInt(
      normalizedHex.slice(5, 7),
      16
    );

    const luminance =
      0.299 * red +
      0.587 * green +
      0.114 * blue;

    return luminance > 180;
  }

  const numbers = String(fill).match(
    /\d+(\.\d+)?/g
  );

  if (
    !numbers ||
    numbers.length < 3
  ) {
    return false;
  }

  const [red, green, blue] =
    numbers.map(Number);

  const luminance =
    0.299 * red +
    0.587 * green +
    0.114 * blue;

  return luminance > 180;
};

const getPolygonAverageCenter = (
  coords
) => {
  if (!coords?.length) {
    return null;
  }

  const totals = coords.reduce(
    (accumulator, coordinate) => ({
      lat:
        accumulator.lat +
        coordinate.lat,

      lon:
        accumulator.lon +
        coordinate.lon,
    }),
    {
      lat: 0,
      lon: 0,
    }
  );

  return {
    lat:
      totals.lat /
      coords.length,

    lon:
      totals.lon /
      coords.length,
  };
};

const normalizePolygons = (
  rawPolygons
) =>
  (Array.isArray(rawPolygons)
    ? rawPolygons
    : []
  )
    .map((talhao) => {
      const coords = (
        Array.isArray(
          talhao?.map_geo_points
        )
          ? talhao.map_geo_points
          : []
      )
        .map((point) => {
          const lat =
            toFiniteNumber(
              point?.latitude
            );

          const lon =
            toFiniteNumber(
              point?.longitude
            );

          if (
            lat === null ||
            lon === null
          ) {
            return null;
          }

          return {
            lat,
            lon,
          };
        })
        .filter(Boolean);

      const centerLat =
        toFiniteNumber(
          talhao?.map_centro_id?.lat
        );

      const centerLon =
        toFiniteNumber(
          talhao?.map_centro_id?.lng
        );

      const apiCenter =
        centerLat !== null &&
        centerLon !== null
          ? {
              lat: centerLat,
              lon: centerLon,
            }
          : null;

      return {
        id:
          talhao?.talhao__id_talhao,

        center:
          apiCenter ||
          getPolygonAverageCenter(
            coords
          ),

        coords,
      };
    })
    .filter(
      (polygon) =>
        polygon.coords.length >= 3
    );

const createProjection = (
  polygons
) => {
  /*
   * Evita flatMap para garantir
   * compatibilidade com runtimes antigos.
   */
  const allCoordinates =
    polygons.reduce(
      (
        accumulator,
        polygon
      ) => {
        accumulator.push(
          ...polygon.coords
        );

        return accumulator;
      },
      []
    );

  const averageLatitude =
    allCoordinates.reduce(
      (
        accumulator,
        coordinate
      ) =>
        accumulator +
        coordinate.lat,
      0
    ) /
    allCoordinates.length;

  const averageLongitude =
    allCoordinates.reduce(
      (
        accumulator,
        coordinate
      ) =>
        accumulator +
        coordinate.lon,
      0
    ) /
    allCoordinates.length;

  const referenceLatitudeRadians =
    (
      averageLatitude *
      Math.PI
    ) / 180;

  const referenceLongitudeRadians =
    (
      averageLongitude *
      Math.PI
    ) / 180;

  const longitudeCorrection =
    Math.max(
      Math.cos(
        referenceLatitudeRadians
      ),
      0.000001
    );

  /*
   * Converte latitude e longitude para
   * coordenadas locais aproximadas em metros.
   *
   * Dessa forma, 100 metros no eixo X ocupam
   * a mesma escala visual que 100 metros no Y.
   */
  const toMeters = ({
    lat,
    lon,
  }) => {
    const latitudeRadians =
      (
        lat *
        Math.PI
      ) / 180;

    const longitudeRadians =
      (
        lon *
        Math.PI
      ) / 180;

    return {
      x:
        EARTH_RADIUS_METERS *
        (
          longitudeRadians -
          referenceLongitudeRadians
        ) *
        longitudeCorrection,

      y:
        EARTH_RADIUS_METERS *
        (
          latitudeRadians -
          referenceLatitudeRadians
        ),
    };
  };

  const projectedCoordinates =
    allCoordinates.map(
      toMeters
    );

  const xValues =
    projectedCoordinates.map(
      (coordinate) =>
        coordinate.x
    );

  const yValues =
    projectedCoordinates.map(
      (coordinate) =>
        coordinate.y
    );

  const minimumX =
    Math.min(...xValues);

  const maximumX =
    Math.max(...xValues);

  const minimumY =
    Math.min(...yValues);

  const maximumY =
    Math.max(...yValues);

  const realWidth = Math.max(
    maximumX - minimumX,
    0.01
  );

  const realHeight = Math.max(
    maximumY - minimumY,
    0.01
  );

  const aspectRatio =
    realWidth / realHeight;

  /*
   * O próprio SVG passa a acompanhar
   * a proporção real do conjunto de talhões.
   */
  let svgWidth;
  let svgHeight;

  if (aspectRatio >= 1) {
    svgWidth =
      TARGET_LONG_SIDE;

    svgHeight = clamp(
      TARGET_LONG_SIDE /
        aspectRatio,
      MIN_SHORT_SIDE,
      TARGET_LONG_SIDE
    );
  } else {
    svgHeight =
      TARGET_LONG_SIDE;

    svgWidth = clamp(
      TARGET_LONG_SIDE *
        aspectRatio,
      MIN_SHORT_SIDE,
      TARGET_LONG_SIDE
    );
  }

  const availableWidth =
    Math.max(
      svgWidth -
        MAP_PADDING * 2,
      1
    );

  const availableHeight =
    Math.max(
      svgHeight -
        MAP_PADDING * 2,
      1
    );

  /*
   * Uma única escala para os dois eixos.
   *
   * Esta é a correção principal:
   * não existe mais scaleX e scaleY separados.
   */
  const uniformScale =
    Math.min(
      availableWidth /
        realWidth,

      availableHeight /
        realHeight
    );

  const renderedWidth =
    realWidth *
    uniformScale;

  const renderedHeight =
    realHeight *
    uniformScale;

  const offsetX =
    (
      svgWidth -
      renderedWidth
    ) / 2;

  const offsetY =
    (
      svgHeight -
      renderedHeight
    ) / 2;

  const toSvgCoordinates = ({
    lat,
    lon,
  }) => {
    const projected =
      toMeters({
        lat,
        lon,
      });

    const x =
      offsetX +
      (
        projected.x -
        minimumX
      ) *
        uniformScale;

    /*
     * O eixo vertical do SVG cresce
     * de cima para baixo.
     */
    const y =
      offsetY +
      (
        maximumY -
        projected.y
      ) *
        uniformScale;

    return [x, y];
  };

  return {
    svgWidth,
    svgHeight,
    toSvgCoordinates,
  };
};

const getProjectedPolygonBounds = (
  polygon,
  toSvgCoordinates
) => {
  const projected =
    polygon.coords.map(
      toSvgCoordinates
    );

  const xValues =
    projected.map(
      ([x]) => x
    );

  const yValues =
    projected.map(
      ([, y]) => y
    );

  return {
    width:
      Math.max(...xValues) -
      Math.min(...xValues),

    height:
      Math.max(...yValues) -
      Math.min(...yValues),
  };
};

const createEmptyMapSvg = () => `
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="1000"
    height="600"
    viewBox="0 0 1000 600"
    preserveAspectRatio="xMidYMid meet"
  >
    <rect
      width="1000"
      height="600"
      fill="#FFFFFF"
    />

    <text
      x="500"
      y="300"
      text-anchor="middle"
      dominant-baseline="middle"
      font-family="Arial, Helvetica, sans-serif"
      font-size="26"
      fill="#64748B"
    >
      Mapa indisponível
    </text>
  </svg>
`;

export function getMapSvgBase64(
  highlightIds = [],
  rawPolygons = [],
  culture = ""
) {
  const polygons =
    normalizePolygons(
      rawPolygons
    );

  if (!polygons.length) {
    return base64.encode(
      createEmptyMapSvg()
    );
  }

  const normalizedHighlightIds =
    new Set(
      (
        Array.isArray(
          highlightIds
        )
          ? highlightIds
          : []
      ).map(normalizeId)
    );

  const {
    svgWidth,
    svgHeight,
    toSvgCoordinates,
  } =
    createProjection(
      polygons
    );

  const cultureColor =
    getColor(culture);

  const lightBackground =
    isLightColor(
      cultureColor
    );

  /*
   * Desenha primeiro os talhões comuns
   * e depois os destacados.
   */
  const orderedPolygons = [
    ...polygons,
  ].sort(
    (
      firstPolygon,
      secondPolygon
    ) => {
      const firstHighlighted =
        normalizedHighlightIds.has(
          normalizeId(
            firstPolygon.id
          )
        );

      const secondHighlighted =
        normalizedHighlightIds.has(
          normalizeId(
            secondPolygon.id
          )
        );

      return (
        Number(
          firstHighlighted
        ) -
        Number(
          secondHighlighted
        )
      );
    }
  );

  const svgBody =
    orderedPolygons
      .map((polygon) => {
        const isHighlight =
          normalizedHighlightIds.has(
            normalizeId(
              polygon.id
            )
          );

        const points =
          polygon.coords
            .map(
              toSvgCoordinates
            )
            .map(
              ([x, y]) =>
                `${x.toFixed(
                  2
                )},${y.toFixed(
                  2
                )}`
            )
            .join(" ");

        const fillColor =
          isHighlight
            ? cultureColor
            : "none";

        const strokeColor =
          isHighlight
            ? "#111827"
            : "#000000";

        const polygonStrokeWidth =
          isHighlight
            ? 1.1
            : 0.55;

        let label = "";

        if (
          isHighlight &&
          polygon.center
        ) {
          const [centerX, centerY] =
            toSvgCoordinates(
              polygon.center
            );

          const polygonBounds =
            getProjectedPolygonBounds(
              polygon,
              toSvgCoordinates
            );

          const smallestDimension =
            Math.min(
              polygonBounds.width,
              polygonBounds.height
            );

          /*
           * Mantém o comportamento de labels
           * apenas nos talhões destacados,
           * mas adapta o texto ao tamanho visual.
           */
          const fontSize = clamp(
            smallestDimension *
              0.16,
            10,
            22
          );

          const textFill =
            lightBackground
              ? "#111111"
              : "#FFFFFF";

          const strokeFill =
            lightBackground
              ? "#FFFFFF"
              : "#000000";

          const textStrokeWidth =
            clamp(
              fontSize *
                0.11,
              1,
              2.4
            );

          label = `
            <text
              x="${centerX.toFixed(2)}"
              y="${centerY.toFixed(2)}"
              text-anchor="middle"
              dominant-baseline="middle"
              font-family="Arial, Helvetica, sans-serif"
              font-size="${fontSize.toFixed(2)}"
              font-weight="700"
              fill="${textFill}"
              stroke="${strokeFill}"
              stroke-width="${textStrokeWidth.toFixed(2)}"
              stroke-linejoin="round"
              paint-order="stroke fill"
            >
              ${escapeXml(
                polygon.id
              )}
            </text>
          `;
        }

        return `
          <polygon
            points="${points}"
            fill="${fillColor}"
            stroke="${strokeColor}"
            stroke-width="${polygonStrokeWidth}"
            stroke-linejoin="round"
            stroke-linecap="round"
            vector-effect="non-scaling-stroke"
          />

          ${label}
        `;
      })
      .join("");

  const svg = `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="${svgWidth.toFixed(0)}"
      height="${svgHeight.toFixed(0)}"
      viewBox="0 0 ${svgWidth.toFixed(2)} ${svgHeight.toFixed(2)}"
      preserveAspectRatio="xMidYMid meet"
      style="background:#FFFFFF"
    >
      <rect
        x="0"
        y="0"
        width="${svgWidth.toFixed(2)}"
        height="${svgHeight.toFixed(2)}"
        fill="#FFFFFF"
      />

      ${svgBody}
    </svg>
  `;

  if (
    typeof base64?.encode !==
    "function"
  ) {
    throw new Error(
      "A função base64.encode não está disponível."
    );
  }

  return base64.encode(svg);
}