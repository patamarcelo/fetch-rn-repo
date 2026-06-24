import * as Print from "expo-print";
import { shareAsync } from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";

import { Platform } from "react-native";

import { getMapSvgBase64 } from "./PrintCronogramaPagePlotMap.jsx";
import { iconDict } from "../../utils/assets/icon-dict.js";

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const sumNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
};

const formatNumber = (number) =>
  Number(number || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatDoseNumber = (number) =>
  Number(number || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });

const formatDate = (value) => {
  if (!value) return "-";

  const text = String(value).trim();

  const isoMatch = text.match(
    /^(\d{4})-(\d{2})-(\d{2})/
  );

  if (isoMatch) {
    const [, year, month, day] = isoMatch;

    return `${day}/${month}/${year}`;
  }

  const brazilianMatch = text.match(
    /^(\d{2})\/(\d{2})\/(\d{4})/
  );

  if (brazilianMatch) {
    const [, day, month, year] =
      brazilianMatch;

    return `${day}/${month}/${year}`;
  }

  const malformedMatch = text.match(
    /^(\d{2})T.*\/(\d{2})\/(\d{4})$/
  );

  if (malformedMatch) {
    const [, day, month, year] =
      malformedMatch;

    return `${day}/${month}/${year}`;
  }

  const parsedDate = new Date(text);

  if (!Number.isNaN(parsedDate.getTime())) {
    return parsedDate.toLocaleDateString(
      "pt-BR",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    );
  }

  return "-";
};

const getDap = (date) => {
  if (!date) return "-";

  const planted = new Date(date);

  if (Number.isNaN(planted.getTime())) {
    return "-";
  }

  const today = new Date();

  const differenceInTime =
    today.getTime() - planted.getTime();

  return Math.max(
    0,
    Math.floor(
      differenceInTime /
      (1000 * 60 * 60 * 24)
    )
  );
};

const withOpacity = (
  rgb,
  alpha = 0.08
) => {
  const numbers = String(rgb || "").match(
    /\d+(\.\d+)?/g
  );

  if (!numbers || numbers.length < 3) {
    return "#FFFFFF";
  }

  const [red, green, blue] = numbers;

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};


const getFirstAp = (card) => {
  if (card?.isConsolidated) {
    return card?.aps?.[0] || {};
  }

  return card || {};
};

const getAppTitle = (card) => {
  if (card?.isConsolidated) {
    const quantity =
      card?.codes?.length || 0;

    return `${quantity} AP${quantity > 1 ? "s" : ""
      }`;
  }

  return String(card?.code || "")
    .replace(/^AP\s*/i, "AP ")
    .trim();
};

const getAppOperation = (card) => {
  if (card?.isConsolidated) {
    return "Consolidado de Aplicações";
  }

  return card?.operation || "-";
};

const getAppDateStart = (card) => {
  if (card?.isConsolidated) {
    const dates = (card?.aps || [])
      .map(
        (application) =>
          application?.dateApKey ||
          application?.dateAp
      )
      .filter(Boolean)
      .sort();

    return dates[0] || null;
  }

  return card?.dateApKey || card?.dateAp;
};

const getAppDateEnd = (card) => {
  if (card?.isConsolidated) {
    const dates = (card?.aps || [])
      .map(
        (application) =>
          application?.endDateApKey ||
          application?.endDateAp
      )
      .filter(Boolean)
      .sort();

    return dates[dates.length - 1] || null;
  }

  return (
    card?.endDateApKey ||
    card?.endDateAp
  );
};

const getMergedProducts = (card) => {
  const sourceApplications =
    card?.isConsolidated
      ? card?.aps || []
      : [card];

  const grouped = new Map();

  for (const application of sourceApplications) {
    for (const product of application?.prods || []) {
      if (product?.type === "Operação") {
        continue;
      }

      const key = [
        product?.product || "",
        product?.type || "",
        product?.unit || "",
        product?.doseSolicitada || "",
        product?.colorChip || "",
      ].join("||");

      if (!grouped.has(key)) {
        grouped.set(key, {
          ...product,

          quantidadeSolicitada:
            sumNumber(
              product?.quantidadeSolicitada
            ),
        });

        continue;
      }

      const current =
        grouped.get(key);

      current.quantidadeSolicitada +=
        sumNumber(
          product?.quantidadeSolicitada
        );
    }
  }

  return Array.from(
    grouped.values()
  ).sort((first, second) =>
    String(
      first?.type || ""
    ).localeCompare(
      String(second?.type || ""),
      "pt-BR"
    )
  );
};

const getCultureIcon = (
  culture,
  size = 16
) => {
  const selectedIcon =
    iconDict.find(
      (item) =>
        item.cultura === culture
    ) ??
    iconDict[
    iconDict.length - 1
    ];

  if (!selectedIcon?.base64) {
    return "";
  }

  return `
    <img
      src="${selectedIcon.base64}"
      alt="${escapeHtml(
    selectedIcon.alt ||
    culture ||
    "Cultura"
  )}"
      style="
        width:${size}px;
        height:${size}px;
        object-fit:contain;
        vertical-align:middle;
      "
    />
  `;
};

const buildParcelRows = (
  parcels
) =>
  (parcels || [])
    .map((parcel, index) => {
      const requestedArea =
        sumNumber(
          parcel?.areaSolicitada
        );

      const appliedArea =
        sumNumber(
          parcel?.areaAplicada
        );

      const finished =
        requestedArea > 0 &&
        Math.abs(
          requestedArea - appliedArea
        ) < 0.001;

      return `
        <div
          class="
            parcel-table-row
            ${index % 2 !== 0
          ? "parcel-table-row-even"
          : ""
        }
            ${finished
          ? "parcel-table-row-finished"
          : ""
        }
          "
        >
          <div class="parcel-table-code">
            ${escapeHtml(
          parcel?.parcela || "-"
        )}
          </div>

          <div class="parcel-table-area">
            ${formatNumber(
          requestedArea
        )}
          </div>

          <div class="parcel-table-variety">
            ${escapeHtml(
          parcel?.variedade || "-"
        )}
          </div>

          <div class="parcel-table-dap">
            ${getDap(
          parcel?.date
        )}
          </div>

          <div class="parcel-table-applied">
            ${appliedArea > 0
          ? formatNumber(
            appliedArea
          )
          : "-"
        }
          </div>
        </div>
      `;
    })
    .join("");

const buildProductRows = (
  products
) =>
  (products || [])
    .map((product) => {
      const backgroundColor =
        withOpacity(
          product?.colorChip,
          0.08
        );

      return `
        <div
          class="product-row product-grid"
          style="
            background-color:
              ${backgroundColor};
          "
        >
          <div class="product-dose">
            <strong>
              ${formatDoseNumber(
        product?.doseSolicitada
      )}
            </strong>

            <span>
              ${escapeHtml(
        product?.unit || ""
      )}
            </span>
          </div>

          <div class="product-type">
            ${escapeHtml(
        String(
          product?.type || ""
        ).replace(
          "/Vegetal",
          ""
        )
      )}
          </div>

          <div class="product-name">
            ${escapeHtml(
        product?.product || "-"
      )}
          </div>

          <div class="product-quantity">
            ${formatNumber(
        product?.quantidadeSolicitada
      )}
          </div>
        </div>
      `;
    })
    .join("");

export const createApplicationPdfMap =
  async (
    data,
    farm,
    plotMap,
    options = {}
  ) => {
    const {
      viewMode = "normal",
    } = options;

    const applications =
      Array.isArray(data)
        ? data
        : [];

    const dataFromJson =
      Array.isArray(plotMap?.data)
        ? plotMap.data
        : Array.isArray(plotMap?.dados)
          ? plotMap.dados
          : Array.isArray(plotMap)
            ? plotMap
            : [];

    console.log(
      "[PDF MAP SOURCE]",
      {
        plotMapIsArray:
          Array.isArray(plotMap),

        plotMapDataIsArray:
          Array.isArray(
            plotMap?.data
          ),

        plotMapDadosIsArray:
          Array.isArray(
            plotMap?.dados
          ),

        total:
          dataFromJson.length,

        firstPlot:
          dataFromJson?.[0]
            ? {
              talhao:
                dataFromJson[0]
                  ?.talhao__id_talhao,

              farmId:
                dataFromJson[0]?.[
                "talhao__fazenda__id_farmbox"
                ],

              farmName:
                dataFromJson[0]?.[
                "talhao__fazenda__nome"
                ],

              safra:
                dataFromJson[0]?.[
                "safra__safra"
                ],

              ciclo:
                dataFromJson[0]?.[
                "ciclo__ciclo"
                ],
            }
            : null,
      }
    );

    const totalAplicar =
      applications.reduce(
        (
          accumulator,
          current
        ) =>
          accumulator +
          sumNumber(
            current?.saldoAreaAplicar
          ),
        0
      );

    const farmName = String(
      farm || ""
    )
      .replace(
        /^Fazenda\s+/i,
        ""
      )
      .trim();

    const applicationsHtml =
      applications
        .map((app) => {
          const baseApplication =
            getFirstAp(app);

          const parcels =
            Array.isArray(
              app?.parcelas
            )
              ? app.parcelas
              : Array.isArray(
                baseApplication
                  ?.parcelas
              )
                ? baseApplication
                  .parcelas
                : [];

          const parcelCount =
            parcels.length;

          /*
           * Estas são somente as parcelas que
           * ficarão coloridas/destacadas no mapa.
           */
          const highlightedPlots =
            parcels
              .map(
                (parcel) =>
                  parcel?.parcela
              )
              .filter(Boolean);

          const culture =
            parcels?.[0]?.cultura ??
            baseApplication?.cultura ??
            "unknown";

          /*
           * Aqui entram todos os talhões da mesma:
           *
           * fazenda + safra + ciclo da AP.
           */
          const applicationFarmId =
            Number(
              baseApplication?.farmId
            );

          const applicationSafra =
            String(
              baseApplication?.safra ?? ""
            ).trim();

          const applicationCiclo =
            Number(
              baseApplication?.ciclo
            );

          /*
           * Filtro estrito do mapa desta AP:
           *
           * fazenda + safra + ciclo.
           *
           * Somente os registros que atendem às três
           * condições são enviados para o SVG.
           */
          const mapForThisApplication =
            dataFromJson.filter((plot) => {
              const plotFarmId =
                Number(
                  plot?.[
                  "talhao__fazenda__id_farmbox"
                  ]
                );

              const plotSafra =
                String(
                  plot?.["safra__safra"] ??
                  ""
                ).trim();

              const plotCiclo =
                Number(
                  plot?.["ciclo__ciclo"]
                );

              return (
                plotFarmId ===
                applicationFarmId &&
                plotSafra ===
                applicationSafra &&
                plotCiclo ===
                applicationCiclo
              );
            });

          console.log(
            "[PDF MAP FILTER FINAL]",
            {
              application: {
                code:
                  baseApplication?.code,

                farmId:
                  applicationFarmId,

                safra:
                  applicationSafra,

                ciclo:
                  applicationCiclo,
              },

              totalReceived:
                dataFromJson.length,

              totalFiltered:
                mapForThisApplication.length,

              filteredContexts:
                mapForThisApplication.map(
                  (plot) => ({
                    talhao:
                      plot?.talhao__id_talhao,

                    farmId:
                      plot?.[
                      "talhao__fazenda__id_farmbox"
                      ],

                    safra:
                      plot?.["safra__safra"],

                    ciclo:
                      plot?.["ciclo__ciclo"],
                  })
                ),

              highlightedPlots,
            }
          );

          const base64Image =
            getMapSvgBase64(
              highlightedPlots,
              mapForThisApplication,
              culture
            );

          const appTitle =
            getAppTitle(app);

          const appOperation =
            getAppOperation(app);

          const totalRealizado =
            sumNumber(
              app?.areaSolicitada
            ) -
            sumNumber(
              app?.saldoAreaAplicar
            );

          const parcelsHtml =
            buildParcelRows(
              parcels
            );

          const mergedProducts =
            getMergedProducts(app);

          const productsHtml =
            buildProductRows(
              mergedProducts
            );

          const consolidatedCodesBlock =
            app?.isConsolidated
              ? `
                <div class="consolidated-block">
                  <strong>
                    APs consolidadas:
                  </strong>

                  <span>
                    ${(app?.aps || [])
                .map(
                  (
                    application
                  ) =>
                    `${escapeHtml(
                      application?.code ||
                      "-"
                    )} — ${escapeHtml(
                      application?.operation ||
                      "-"
                    )}`
                )
                .join(" • ")}
                  </span>
                </div>
              `
              : "";

          return `
            <section class="application-page">
              <header class="page-header">
                <div class="farm-heading">
                  <h1>
                    ${escapeHtml(
            farmName
          )}
                  </h1>

                  <span>
                    Área total:
                    ${formatNumber(
            totalAplicar
          )} ha
                  </span>
                </div>

                <div class="application-heading">
                  <strong>
                    ${escapeHtml(
            appTitle
          )}
                  </strong>

                  <span>
                    ${escapeHtml(
            appOperation
          )}
                  </span>
                </div>
              </header>

              <div class="application-summary">
                <div class="summary-main">
                  <div class="summary-title-row">
                    ${getCultureIcon(
            culture,
            15
          )}

                    <strong>
                      ${escapeHtml(
            appTitle
          )}
                    </strong>
                  </div>

                  <span>
                    ${escapeHtml(
            appOperation
          )}
                  </span>
                </div>

                <div class="summary-item">
                  <span>Início</span>

                  <strong>
                    ${formatDate(
            getAppDateStart(
              app
            )
          )}
                  </strong>
                </div>

                <div class="summary-item">
                  <span>Limite</span>

                  <strong>
                    ${formatDate(
            getAppDateEnd(
              app
            )
          )}
                  </strong>
                </div>

                <div class="summary-item">
                  <span>Área</span>

                  <strong>
                    ${formatNumber(
            app?.areaSolicitada
          )} ha
                  </strong>
                </div>

                <div class="summary-item">
                  <span>Realizado</span>

                  <strong>
                    ${formatNumber(
            totalRealizado
          )} ha
                  </strong>
                </div>

                <div class="summary-item">
                  <span>Saldo</span>

                  <strong>
                    ${formatNumber(
            app?.saldoAreaAplicar
          )} ha
                  </strong>
                </div>
              </div>

              ${consolidatedCodesBlock}

              <div class="page-content">
                <section
                  class="
                    content-panel
                    parcels-panel
                  "
                >
                  <div class="section-heading">
                    <div>
                      <strong>
                        Talhões
                      </strong>

                      <span>
                        Área, variedade,
                        DAP e aplicado
                      </span>
                    </div>

                    <span class="section-count">
                      ${parcelCount}
                    </span>
                  </div>

                  <div class="parcel-table">
                    <div class="parcel-table-header">
                      <div>Talhão</div>
                      <div>Área</div>
                      <div>Variedade</div>
                      <div>DAP</div>
                      <div>Aplic.</div>
                    </div>

                    <div class="parcel-table-body">
                      ${parcelsHtml}
                    </div>
                  </div>
                </section>

                <section
                  class="
                    content-panel
                    products-panel
                  "
                >
                  <div class="section-heading">
                    <div>
                      <strong>
                        Produtos
                      </strong>

                      <span>
                        Dose e quantidade
                        solicitada
                      </span>
                    </div>

                    <span class="section-count">
                      ${mergedProducts.length}
                    </span>
                  </div>

                  <div
                    class="
                      product-header
                      product-grid
                    "
                  >
                    <div>Dose</div>
                    <div>Tipo</div>
                    <div>Produto</div>
                    <div>Qtd.</div>
                  </div>

                  <div class="product-list">
                    ${productsHtml}
                  </div>
                </section>

                <section
                  class="
                    content-panel
                    map-panel
                  "
                >
                  <div
                    class="
                      section-heading
                      map-heading
                    "
                  >
                    <div>
                      <strong>
                        Mapa dos talhões
                      </strong>

                      <span>
                        Proporção preservada
                      </span>
                    </div>

                    <div class="map-legend">
                      <span
                        class="legend-swatch"
                      ></span>

                      <span>
                        Selecionados
                      </span>
                    </div>
                  </div>

                  <div class="map-frame">
                    <img
                      src="data:image/svg+xml;base64,${base64Image}"
                      class="plot-map-image"
                      alt="Mapa dos talhões"
                    />
                  </div>
                </section>
              </div>

              <section class="observations-section">
                <div class="observations-title">
                  <strong>
                    Observações
                  </strong>
                </div>

                <div class="observations-lines">
                  <div></div>
                  <div></div>
                </div>
              </section>
            </section>
          `;
        })
        .join("");

    const htmlContent = `
      <!DOCTYPE html>

      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8" />

          <meta
            name="viewport"
            content="
              width=device-width,
              initial-scale=1.0
            "
          />

          <title>
            Aplicações —
            ${escapeHtml(farmName)}
          </title>

          <style>
            @page {
              size: A4 landscape;
              margin: 7mm;
            }

            * {
              box-sizing: border-box;
            }

            html,
            body {
              width: 100%;
              height: 100%;

              margin: 0;
              padding: 0;
            }

            body {
              font-family:
                Arial,
                Helvetica,
                sans-serif;

              font-size: 9px;
              line-height: 1.2;

              color: #172033;
              background: #ffffff;

              -webkit-print-color-adjust:
                exact;

              print-color-adjust:
                exact;
            }

            .application-page {
              width: 100%;
              height: 195mm;
              max-height: 195mm;

              display: flex;
              flex-direction: column;

              overflow: hidden;

              border:
                1px solid #cbd5e1;

              background: #ffffff;

              page-break-after:
                always;

              break-after: page;
            }

            .application-page:last-of-type {
              page-break-after: auto;
              break-after: auto;
            }

            .page-header {
              flex: 0 0 38px;

              display: flex;
              justify-content:
                space-between;
              align-items: center;

              gap: 18px;

              padding: 4px 8px;

              border-bottom:
                1px solid #cbd5e1;
            }

            .farm-heading h1 {
              margin: 0;

              color: #111827;

              font-size: 17px;
              line-height: 1;
            }

            .farm-heading span {
              color: #64748b;
              font-size: 7px;
            }

            .application-heading {
              display: flex;
              flex-direction: column;
              align-items: flex-end;

              gap: 1px;

              text-align: right;
            }

            .application-heading strong {
              color: #111827;
              font-size: 13px;
            }

            .application-heading span {
              max-width: 430px;

              color: #475569;
              font-size: 7px;
            }

            .application-summary {
              flex: 0 0 36px;

              display: grid;

              grid-template-columns:
                minmax(180px, 1.7fr)
                repeat(
                  5,
                  minmax(88px, 1fr)
                );

              border-bottom:
                1px solid #cbd5e1;

              background: #f8fafc;
            }

            .summary-main,
            .summary-item {
              min-width: 0;

              display: flex;
              justify-content: center;

              padding: 3px 6px;

              border-right:
                1px solid #e2e8f0;
            }

            .summary-main {
              flex-direction: column;

              gap: 0;
            }

            .summary-title-row {
              display: flex;
              align-items: center;

              gap: 4px;
            }

            .summary-title-row strong {
              color: #111827;
              font-size: 10px;
            }

            .summary-main > span {
              overflow: hidden;

              color: #64748b;
              font-size: 6.5px;

              text-overflow:
                ellipsis;

              white-space: nowrap;
            }

            .summary-item {
              flex-direction: column;
              align-items: center;

              gap: 0;

              text-align: center;
            }

            .summary-item:last-child {
              border-right: 0;
            }

            .summary-item span {
              color: #64748b;

              font-size: 6px;
              font-weight: 700;

              letter-spacing: 0.25px;

              text-transform:
                uppercase;
            }

            .summary-item strong {
              color: #111827;
              font-size: 8px;

              font-variant-numeric:
                tabular-nums;

              white-space: nowrap;
            }

            .consolidated-block {
              flex: 0 0 auto;

              display: flex;
              align-items:
                flex-start;

              gap: 4px;

              padding: 3px 6px;

              border-bottom:
                1px solid #e2e8f0;

              background: #fffdf5;

              color: #475569;
              font-size: 6.5px;
            }

            .consolidated-block strong {
              color: #111827;
              white-space: nowrap;
            }

            .page-content {
              min-height: 0;
              flex: 1;

              display: grid;

              grid-template-columns:
                21% 29% 50%;
            }

            .content-panel {
              min-width: 0;
              min-height: 0;

              display: flex;
              flex-direction: column;
            }

            .parcels-panel,
            .products-panel {
              border-right:
                1px solid #cbd5e1;
            }

            .section-heading {
              flex: 0 0 28px;

              display: flex;
              justify-content:
                space-between;
              align-items: center;

              gap: 4px;

              padding: 3px 5px;

              border-bottom:
                1px solid #e2e8f0;

              background: #f8fafc;
            }

            .section-heading
              > div:first-child {
              min-width: 0;

              display: flex;
              flex-direction: column;
            }

            .section-heading strong {
              color: #111827;
              font-size: 8px;
            }

            .section-heading span {
              color: #64748b;
              font-size: 5.6px;
            }

            .section-count {
              min-width: 18px;
              height: 18px;

              display: inline-flex;
              justify-content: center;
              align-items: center;

              padding: 0 4px;

              border:
                1px solid #cbd5e1;

              border-radius: 9px;

              background: #ffffff;

              color:
                #475569 !important;

              font-size:
                6.5px !important;

              font-weight: 700;
            }

            .parcel-table {
              min-width: 0;
              min-height: 0;
              flex: 1;

              display: flex;
              flex-direction: column;

              overflow: hidden;
            }

            .parcel-table-header,
            .parcel-table-row {
              width: 100%;

              display: grid;

              grid-template-columns:
                16%
                20%
                minmax(0, 1.45fr)
                12%
                18%;

              align-items: center;
            }

            .parcel-table-header {
              flex: 0 0 18px;

              padding: 2px 3px;

              border-bottom:
                1px solid #cbd5e1;

              background: #f1f5f9;

              color: #475569;

              font-size: 4.8px;
              font-weight: 700;

              letter-spacing: 0;

              text-transform:
                uppercase;
            }

            .parcel-table-header
              > div:not(:first-child),
            .parcel-table-row
              > div:not(:first-child) {
              padding-left: 1px;
            }

            .parcel-table-header
              > div:last-child {
              text-align: right;
            }

            .parcel-table-body {
              min-height: 0;
              flex: 1;

              overflow: hidden;
            }

            .parcel-table-row {
              min-height: 15px;
              height: 15px;

              padding: 1px 3px;

              border-bottom:
                1px solid #e2e8f0;

              color: #334155;

              font-size: 5.3px;
              line-height: 1;
            }

            .parcel-table-row-even {
              background: #f8fafc;
            }

            .parcel-table-row-finished {
              background: #ecfdf5;
            }

            .parcel-table-code {
              min-width: 0;

              overflow: hidden;

              color: #111827;

              font-weight: 700;

              text-overflow:
                ellipsis;

              white-space: nowrap;
            }

            .parcel-table-area,
            .parcel-table-dap,
            .parcel-table-applied {
              font-variant-numeric:
                tabular-nums;

              white-space: nowrap;
            }

            .parcel-table-variety {
              min-width: 0;

              overflow: hidden;

              color: #475569;

              text-overflow:
                ellipsis;

              white-space: nowrap;
            }

            .parcel-table-applied {
              color: #166534;
              text-align: right;
            }

            .product-grid {
              width: 100%;

              display: grid;

              grid-template-columns:
                20%
                22%
                minmax(0, 1fr)
                17%;

              align-items: center;
            }

            .product-header {
              flex: 0 0 20px;

              padding: 3px 5px;

              border-bottom:
                1px solid #cbd5e1;

              background: #f1f5f9;

              color: #475569;

              font-size: 5.8px;
              font-weight: 700;

              letter-spacing: 0.1px;

              text-transform:
                uppercase;
            }

            .product-header
              > div:last-child {
              text-align: right;
            }

            .product-list {
              min-height: 0;
              flex: 1;

              overflow: hidden;
            }

            .product-row {
              min-height: 22px;

              padding: 3px 5px;

              border-bottom:
                1px solid #e2e8f0;

              font-size: 6.8px;
            }

            .product-dose {
              display: flex;
              align-items: baseline;

              gap: 2px;

              font-variant-numeric:
                tabular-nums;

              white-space: nowrap;
            }

            .product-dose span {
              color: #64748b;
              font-size: 5.6px;
            }

            .product-type,
            .product-name {
              min-width: 0;

              overflow: hidden;

              padding-right: 4px;

              text-overflow:
                ellipsis;

              white-space: nowrap;
            }

            .product-name {
              color: #111827;
              font-weight: 700;
            }

            .product-quantity {
              justify-self: end;

              color: #111827;
              font-weight: 700;

              font-variant-numeric:
                tabular-nums;

              white-space: nowrap;
            }

            .map-panel {
              background: #ffffff;
            }

            .map-heading {
              flex: 0 0 28px;
            }

            .map-legend {
              display: flex !important;
              flex-direction:
                row !important;
              align-items: center;

              gap: 3px;

              white-space: nowrap;
            }

            .legend-swatch {
              width: 11px;
              height: 7px;

              display: inline-block;

              border:
                1.5px solid #1e293b;

              border-radius: 2px;

              background: #8a6a4a;
            }

            .map-frame {
              min-width: 0;
              min-height: 0;
              flex: 1;

              display: flex;
              justify-content: center;
              align-items: center;

              padding: 4px 6px;

              overflow: hidden;
            }

            .plot-map-image {
  display: block;

  width: auto;
  height: auto;

  max-width: 100%;
  max-height: 100%;

  object-fit: contain;
  object-position: center;
}

            .observations-section {
              flex: 0 0 34px;

              display: grid;

              grid-template-columns:
                64px 1fr;

              align-items: stretch;

              padding: 3px 6px;

              border-top:
                1px solid #cbd5e1;

              background: #ffffff;
            }

            .observations-title {
              display: flex;
              align-items: flex-start;

              padding-top: 1px;

              color: #111827;
              font-size: 7px;
            }

            .observations-lines {
              display: flex;
              flex-direction: column;
              justify-content:
                space-around;

              padding: 1px 3px;

              border:
                1px dashed #94a3b8;

              border-radius: 3px;
            }

            .observations-lines div {
              height: 1px;

              border-bottom:
                1px solid #e2e8f0;
            }

            @media print {
              .application-page {
                border-radius: 0;
              }
            }
          </style>
        </head>

        <body
          data-view-mode="${escapeHtml(
      viewMode
    )}"
        >
          ${applicationsHtml}
        </body>
      </html>
    `;

    try {
      const formattedDate =
        new Date()
          .toLocaleDateString(
            "en-GB"
          )
          .replace(/\//g, "-");

      const filename = `
        ${farmName}
        openApss -
        ${formattedDate}_app.pdf
      `
        .replace(/\s+/g, " ")
        .trim();

      const newUri =
        `${FileSystem.documentDirectory}${filename}`;

      const { uri } =
        await Print.printToFileAsync({
          html: htmlContent,
          base64: false,
        });

      const fileInfo =
        await FileSystem.getInfoAsync(
          uri
        );

      if (!fileInfo.exists) {
        throw new Error(
          "O arquivo PDF não foi criado corretamente."
        );
      }

      const existingDestination =
        await FileSystem.getInfoAsync(
          newUri
        );

      if (
        existingDestination.exists
      ) {
        await FileSystem.deleteAsync(
          newUri,
          {
            idempotent: true,
          }
        );
      }

      await FileSystem.moveAsync({
        from: uri,
        to: newUri,
      });

      await shareAsync(newUri, {
        dialogTitle: "Enviar PDF",

        mimeType:
          "application/pdf",

        UTI:
          Platform.OS === "ios"
            ? "com.adobe.pdf"
            : undefined,
      });

      console.log(
        "PDF criado em:",
        newUri
      );

      return newUri;
    } catch (error) {
      console.error(
        "Erro ao criar PDF:",
        error
      );

      throw error;
    }
  };