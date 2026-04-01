import * as Print from "expo-print";
import { shareAsync } from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { iconDict } from "../../utils/assets/icon-dict.js";

export const createApplicationPdf = async (data, farm, options = {}) => {
    const { viewMode = "normal" } = options;

    const sumNumber = (v) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
    };

    const formatNumber = (number) =>
        Number(number || 0).toLocaleString("pt-br", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

    const formatDoseNumber = (number) =>
        Number(number || 0).toLocaleString("pt-br", {
            minimumFractionDigits: 3,
            maximumFractionDigits: 3,
        });

    const getDap = (date) => {
        const today = new Date();
        const planted = new Date(date);

        const differenceInTime = today - planted;
        const differenceInDays = Math.floor(
            differenceInTime / (1000 * 60 * 60 * 24)
        );

        return differenceInDays;
    };

    const formatDate = (dateString) => {
        if (!dateString) return "-";

        const [year, month, day] = dateString.split("-");
        return `${day}/${month}/${year}`;
    };

    const getFirstAp = (card) => {
        if (card?.isConsolidated) return card?.aps?.[0] || {};
        return card || {};
    };

    const getAppTitle = (card) => {
        if (card?.isConsolidated) {
            const total = card?.codes?.length || 0;
            return `${total} AP${total > 1 ? "s" : ""}`;
        }

        return String(card?.code || "").replace("AP", "AP ");
    };

    const getAppOperation = (card) => {
        if (card?.isConsolidated) return "Consolidado de Aplicações";
        return card?.operation || "-";
    };

    const getAppDateStart = (card) => {
        if (card?.isConsolidated) {
            const dates = (card?.aps || [])
                .map((ap) => ap?.dateAp)
                .filter(Boolean)
                .sort();

            return dates[0] || null;
        }

        return card?.dateAp;
    };

    const getAppDateEnd = (card) => {
        if (card?.isConsolidated) {
            const dates = (card?.aps || [])
                .map((ap) => ap?.endDateAp)
                .filter(Boolean)
                .sort();

            return dates[dates.length - 1] || null;
        }

        return card?.endDateAp;
    };

    const getMergedProducts = (card) => {
        const sourceApps = card?.isConsolidated ? card?.aps || [] : [card];
        const grouped = new Map();

        for (const ap of sourceApps) {
            for (const prod of ap?.prods || []) {
                if (prod?.type === "Operação") continue;

                const key = [
                    prod?.product || "",
                    prod?.type || "",
                    prod?.unit || "",
                    prod?.doseSolicitada || "",
                    prod?.colorChip || "",
                ].join("||");

                if (!grouped.has(key)) {
                    grouped.set(key, {
                        ...prod,
                        quantidadeSolicitada: sumNumber(prod?.quantidadeSolicitada),
                    });
                } else {
                    const current = grouped.get(key);
                    current.quantidadeSolicitada += sumNumber(
                        prod?.quantidadeSolicitada
                    );
                }
            }
        }

        return Array.from(grouped.values()).sort((a, b) =>
            String(a.type || "").localeCompare(String(b.type || ""))
        );
    };

    const withOpacity = (rgb, alpha = 0.3) => {
        const nums = String(rgb || "").match(/\d+(\.\d+)?/g);

        if (!nums || nums.length < 3) return rgb;

        const [r, g, b] = nums;
        return `rgba(${r},${g},${b},${alpha})`;
    };

    const exportData = Array.isArray(data) ? data : [];

    const totalAplicar = exportData.reduce(
        (acc, curr) => acc + sumNumber(curr?.saldoAreaAplicar),
        0
    );

    const apCotainer = exportData
        .map((app) => {
            const baseAp = getFirstAp(app);

            const culturaAtual = app?.parcelas?.[0]?.cultura ?? "unknown";
            const { base64: iconBase64, alt } =
                iconDict.find((i) => i.cultura === culturaAtual) ??
                iconDict[iconDict.length - 1];

            const iconTag = `<img src="${iconBase64}" alt="${alt}"
                style="width:16px;height:16px;margin-right:4px;vertical-align:middle" />`;

            const appsCards = (app?.parcelas || [])
                .map((parcela) => {
                    const { base64: iconBase64Inside, alt: altInside } =
                        iconDict.find((i) => i.cultura === parcela.cultura) ??
                        iconDict[iconDict.length - 1];

                    const iconTagInside = `<img src="${iconBase64Inside}" alt="${altInside}"
                        style="width:8px;height:8px;margin-left:3px;padding-bottom:2px;vertical-align:middle" />`;

                    const areaAplicada = `<span><b>Aplicado:</b> ${formatNumber(
                        parcela.areaAplicada
                    )} há</span>`;

                    return `
                        <div class="parcela-detail-container bordered ${
                            parcela.areaSolicitada == parcela.areaAplicada
                                ? "finish-parcela"
                                : ""
                        }">
                            <div class="detail-variedade-area">
                                <b class="parcela-code">${parcela.parcela}${iconTagInside}</b>
                                <span class="parcela-area">${formatNumber(
                                    parcela.areaSolicitada
                                )} há</span>
                            </div>
                            <div class="detail-variedade-dap">
                                <span class="variedade-text">${parcela.variedade || "?"}</span>
                                <span class="dap-text">${getDap(parcela.date)} dias</span>
                            </div>
                            <div class="detail-variedade-status">
                                ${parcela.areaAplicada > 0 ? areaAplicada : ""}
                            </div>
                        </div>
                    `;
                })
                .join("");

            const mergedProducts = getMergedProducts(app);

            const prodsCards = mergedProducts
                .map((prod, i) => {
                    return `
                        <div class="grid-produtos detail-prod-container ${
                            i === 0 ? "first-prod-here" : ""
                        } ${i % 2 !== 0 ? "even-row-prod" : ""}" style="background-color: ${withOpacity(
                        prod.colorChip
                    )}">
                            <span style="margin-left:0px;padding-left:2px;justify-self:start">
                                ${formatDoseNumber(prod.doseSolicitada)
                                    .toString()
                                    .trim()}
                                <small style="margin-left:3px;color:#777777">${prod?.unit}</small>
                            </span>
                            <span>${String(prod.type || "").replace(
                                "/Vegetal",
                                ""
                            )}</span>
                            <span>${prod.product}</span>
                            <span style="justify-self:end;padding-right:1px;">
                                ${formatNumber(prod.quantidadeSolicitada)}
                            </span>
                        </div>
                    `;
                })
                .join("");

            const totalRealizado =
                sumNumber(app?.areaSolicitada) - sumNumber(app?.saldoAreaAplicar);

            const consolidatedCodesBlock = app?.isConsolidated
                ? `
                    <div class="consolidated-codes-block">
                        <b>APs consolidadas:</b>
                        ${(app?.aps || [])
                            .map((ap) => `${ap.code} - ${ap.operation}`)
                            .join(" • ")}
                    </div>
                `
                : "";

            return `
                <div class="ap-container bordered">
                    <div class="resumo-container bordered">
                        <div class="resumo-container-app-number">
                            <span>${iconTag}<b>${getAppTitle(app)}</b></span>
                            <span><b>${getAppOperation(app)}</b></span>
                        </div>
                        <div class="resumo-container-app-date">
                            <span><b>Início:</b> ${formatDate(
                                getAppDateStart(app)
                            )}</span>
                            <span><b>Limite:</b> ${formatDate(
                                getAppDateEnd(app)
                            )}</span>
                        </div>
                        <div class="resumo-container-app-area">
                            <span><b>Área:</b> ${formatNumber(
                                app?.areaSolicitada
                            )} há</span>
                            <span><b>Realizado:</b> ${formatNumber(
                                totalRealizado
                            )} há</span>
                            <span><b>Saldo:</b> ${formatNumber(
                                app?.saldoAreaAplicar
                            )} há</span>
                        </div>
                    </div>

                    ${consolidatedCodesBlock}

                    <div class="bordered details-container">
                        <div class="left-side-container">
                            <div class="parcelas-container">
                                ${appsCards}
                            </div>
                            <div class="obs-container">
                                <span>Observações</span>
                            </div>
                        </div>

                        <div class="bordered-left produtos-conatiner">
                            <div class="header-produtos grid-produtos">
                                <b style="justify-self: start">Dose</b>
                                <b>Tipo</b>
                                <b>Produto</b>
                                <b style="justify-self: end;">Solicitado</b>
                            </div>
                            ${prodsCards}
                        </div>
                    </div>
                </div>
            `;
        })
        .join("");

    const htmlContent = `
    <html lang="pt-br">
        <head>
            <meta charset="UTF-8">
            <meta
                name="viewport"
                content="width=device-width, initial-scale=1.0"
            >
            <title>PDF Aplicações</title>
            <style>
                @page {
                    size: A4;
                    margin-top: 10px;
                    margin-bottom: 10px;
                }

                body {
                    font-size: 7px;
                    padding: 20px 10px !important;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                    margin-top: 20px;
                    margin-bottom: 20px;
                }

                .main-container {
                    width: 100%;
                    display: block;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    gap: 20px;
                }

                body {
                    padding: 10px 20px;
                }

                .bordered {
                    border: 0.5px solid black;
                }

                .resumo-container {
                    width: 100%;
                    display: flex;
                    flex-direction: row;
                    justify-content: space-between;
                    padding: 10px 0px;
                    background-color: rgba(107,107,107,0.2);
                    border: 0.5px solid black;
                }

                .resumo-container-app-area {
                    align-self: center;
                    gap: 30px;
                    display: flex;
                    padding-right: 10px;
                }

                .resumo-container-app-date {
                    align-self: center;
                    gap: 30px;
                    display: flex;
                    padding-right: 30px;
                }

                .resumo-container-app-number {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    margin-left: 5px;
                    gap: 30px;
                }

                .ap-container {
                    display: flex;
                    justify-content: space-between;
                    flex-direction: column;
                    width: 100%;
                    margin-bottom: 15px;
                    margin-top: 0px;
                    page-break-inside: avoid !important;
                    box-decoration-break: clone;
                }

                .left-side-container {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    width: 100%;
                }

                .parcelas-container {
                    display: grid;
                    width: 95%;
                    max-width: 95%;
                    min-width: 95%;
                    grid-template-columns: repeat(5, 1fr);
                    gap: 10px;
                    row-gap: 0px;
                    padding: 10px;
                    padding-right: 20px;
                }

                .obs-container {
                    height: 50px;
                    border: 1px dotted black;
                    border-radius: 4px;
                    width: 93%;
                    margin: 0px 0px 20px 15px;
                    padding: 2px 5px;
                }

                .produtos-conatiner {
                    width: 50%;
                    display: flex;
                    flex-direction: column;
                    padding: 0px 10px;
                    align-items: center;
                }

                .details-container {
                    display: flex;
                    flex-direction: row;
                    width: 100%;
                }

                .parcela-detail-container {
                    display: flex;
                    justify-content: space-around;
                    flex-direction: column;
                    width: 80%;
                    padding-top: 2px;
                    padding-bottom: 4px;
                    margin: 5px;
                    padding-left: 6px;
                    padding-right: 6px;
                    max-height: 30px;
                    min-height: 30px;
                    box-sizing: border-box;
                    overflow: hidden;
                }

                .finish-parcela {
                    background-color: #DEDFE4;
                }

                .detail-variedade-area {
                    display: grid;
                    grid-template-columns: minmax(0, 1fr) max-content;
                    align-items: center;
                    gap: 4px;
                    width: 100%;
                    min-width: 0;
                    border-bottom: 0.5px solid black;
                }

                .detail-variedade-dap {
                    font-size: 0.7em;
                    display: grid;
                    grid-template-columns: minmax(0, 1fr) max-content;
                    gap: 4px;
                    align-items: center;
                    width: 100%;
                    min-width: 0;
                }

                .detail-variedade-status {
                    font-size: 0.7em;
                    display: flex;
                    justify-content: flex-end;
                    flex-direction: row;
                    gap: 10px;
                    width: 100%;
                    min-width: 0;
                    overflow: hidden;
                }

                .parcela-detail-container.bordered {
                    border-radius: 4px;
                    border: 0.5px dotted black;
                }

                .bordered-left {
                    border-left: 1px solid black;
                }

                .header-produtos {
                    border-bottom: 0.5px dotted black;
                    margin-top: 20px;
                    margin-bottom: -5px !important;
                    padding-bottom: -20px !important;
                    font-weight: bold;
                }

                .grid-produtos {
                    display: grid;
                    grid-template-columns: 20% 30% 30% 20%;
                    width: 98%;
                    text-align: center;
                }

                .detail-prod-container {
                    margin-bottom: 1px;
                    justify-content: space-between;
                }

                .even-row-prod {
                    background-color: rgba(107,107,107,0.1);
                }

                .header-container {
                    margin-left: 30px;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    width: 100%;
                    height: 60px;
                }

                .header-title {
                    font-size: 30px;
                    font-weight: bold;
                    text-align: center;
                }

                .header-area {
                    font-size: 1.2em;
                }

                .first-prod-here {
                    margin-top: 5px;
                }

                .consolidated-codes-block {
                    padding: 6px 8px;
                    border-top: 0.5px solid black;
                    background-color: rgba(0,0,0,0.05);
                    font-size: 7px;
                    line-height: 1.4;
                }

                .parcela-code,
                .variedade-text {
                    max-width: 100%;
                    min-width: 0;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .parcela-area,
                .dap-text {
                    white-space: nowrap;
                    font-variant-numeric: tabular-nums;
                }

                .detail-variedade-status span {
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
            </style>
        </head>

        <body>
            <div class="main-container">
                <div>
                    <div class="header-container">
                        <div class="header-title">
                            ${farm.replace("Fazenda ", "")}
                        </div>
                        <span class="header-area">
                            <b>Área Total:</b> ${formatNumber(totalAplicar)} há
                        </span>
                    </div>
                </div>

                ${apCotainer}
            </div>
        </body>
    </html>
    `;

    try {
        const formattedDate = new Date()
            .toLocaleDateString("en-GB")
            .replace(/\//g, "-");

        const modeSuffix = viewMode === "consolidated" ? "consolidado" : "aps";
        const filename = `${
            farm.replace("Fazenda ", "")
        } openApss - ${modeSuffix} - ${formattedDate}_app.pdf`;

        const newUri = `${FileSystem.documentDirectory}${filename}`;

        const { uri } = await Print.printToFileAsync({
            html: htmlContent,
            base64: false,
        });

        const fileInfo = await FileSystem.getInfoAsync(uri);

        if (!fileInfo.exists) {
            throw new Error("PDF file was not created successfully");
        }

        await FileSystem.moveAsync({
            from: uri,
            to: newUri,
        });

        await shareAsync(newUri, { dialogTitle: "Enviar PDF" });

        console.log("PDF created at:", newUri);
    } catch (error) {
        console.error("Error creating PDF:", error);
    }
};