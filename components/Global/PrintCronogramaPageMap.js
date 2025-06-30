import * as Print from "expo-print";
import { shareAsync } from "expo-sharing";
import * as FileSystem from 'expo-file-system';

import { Asset } from 'expo-asset';
import { getMapSvgBase64 } from "./PrintCronogramaPagePlotMap.jsx";
import plotMap from './plot-map.json';   // caminho relativo ao arquivo


export const createApplicationPdfMap = async (data, farm) => {


    console.log('Abrindo PDF com MAPA \n')
    console.log('data', data, '\n')
    console.log('farm', farm)

    // const imageAsset = Asset.fromModule(require('../../assets/mapa_fazenda.png')); // caminho relativo ao arquivo atual
    //     await imageAsset.downloadAsync(); // garante que o asset está disponível localmente

    //     const base64Image = await FileSystem.readAsStringAsync(
    //     imageAsset.localUri,
    //     { encoding: FileSystem.EncodingType.Base64 }
    // );
    const dataFromJson = plotMap.data;               // já é objeto JS


    
    // const base64Image       = await getMapBase64(talhoesParaPintar, jsonPath);


    const formatNumber = number => number?.toLocaleString("pt-br", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });


    const formatDoseNumber = number => number?.toLocaleString("pt-br", {
        minimumFractionDigits: 3,
        maximumFractionDigits: 3
    });

    data.forEach(element => {
        console.log('element', element)
        console.log('\n')
    });


    const getDap = (date) => {
        const today = new Date();
        const planted = new Date(date);

        const differenceInTime = today - planted;
        const differenceInDays = Math.floor(differenceInTime / (1000 * 60 * 60 * 24));
        return differenceInDays
    }

    const formatDate = (dateString) => {
        if (!dateString) {
            return '-'
        }
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    }



    const totalAplicar = data.filter((op) => !op.operation.toLowerCase().includes('colheita')).reduce((acc, curr) => acc += curr.saldoAreaAplicar, 0)
    const apCotainer = data.filter((op) => !op.operation.toLowerCase().includes('colheita')).map((app) => {

        const talhoesParaPintar = app.parcelas.map((parcela) => parcela.parcela)
        console.time('map-base64');
        const base64Image = getMapSvgBase64(talhoesParaPintar, dataFromJson);
        console.timeEnd('map-base64');

        const appsCards = app.parcelas.map((parcela) => {

            const areaAplicada = `<span><b>Aplicado:</b> ${formatNumber(parcela.areaAplicada)} há</span>`
            return `
                <div class="parcela-detail-container bordered ${parcela.areaSolicitada == parcela.areaAplicada && 'finish-parcela'}">
                    <div class="detail-variedade-area">
                        <b>${parcela.parcela}</b><span>${formatNumber(parcela.areaSolicitada)} há</span>
                    </div>
                    <div class="detail-variedade-dap">
                        <span>${parcela.variedade || '?'}</span><span>${getDap(parcela.date)} dias</span>
                    </div>
                    <div class="detail-variedade-status">
                        ${parcela.areaAplicada > 0 ? areaAplicada : ''}
                    </div>
                </div>
            `
        }).join('');

        const prodsCards = app.prods.filter((prodType) => prodType.type !== 'Operação').map((prod, i) => {

            return `
                <div class="grid-produtos detail-prod-container ${i === 0 && 'first-prod-here'} ${i % 2 !== 0 && 'even-row-prod'}">
                    <span>${formatDoseNumber(prod.doseSolicitada)}</span>
                    <span>${prod.product}</span>
                    <span>${formatNumber(prod.quantidadeSolicitada)}</span>
                </div>
            `
        }).join('');

        const totalRealizado = app?.areaSolicitada - app?.saldoAreaAplicar
        const imgTag = `<img src="data:image/svg+xml;base64,${base64Image}" style="width:90%;max-height:100vh"/>`;
        return `
        <div class="ap-container bordered">
            <div class="resumo-container bordered">
                <div class="resumo-container-app-number">
                    <span><b>${app?.code.replace('AP', "AP ")}</b></span>
                    <span><b>${app?.operation}</b></span>
                </div>
                <div class="resumo-container-app-date">
                    <span><b>Início:</b> ${formatDate(app?.dateAp)}</span>
                    <span><b>Limite:</b> ${formatDate(app?.endDateAp)}</span>
                </div>
                <div class="resumo-container-app-area">
                    <span><b>Área:</b> ${formatNumber(app?.areaSolicitada)} há</span>
                    <span><b>Relizado:</b> ${formatNumber(totalRealizado)} há</span>
                    <span><b>Saldo:</b> ${formatNumber(app?.saldoAreaAplicar)} há</span>
                </div>
            </div>
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
                    <div class="prods-container-containing-map">
                        <div class="header-produto4 grid-produtos" style="border-bottom: 1px solid black;">
                            <p>Dose</p>
                            <b>Produto</b>
                            <b>Solicitado</b>
                        </div>
                        ${prodsCards}
                        <div style="width:95%; height:100%; margin-top:10px;">
                            ${imgTag}
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `
    }).join('');

    const htmlContent = `
    <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Document</title>
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
                    gap: 20px
                }

                .main-container header {
                    font-size: 30px;
                    font-weight: bold;
                }

                body {
                    padding: 10px 20px;
                    /* border: 1px solid black; */
                }

                .bordered {
                    border: 0.5px solid black;
                }

                .resumo-container {
                    width: 100%;
                    display: flex;
                    flex-direction: row;
                    justify-content: space-between;
                    padding: 2px 0px;
                    background-color: rgba(107,107,107,0.2);
                    border: 0.5px solid black;
                }

                .resumo-container-app-area {
                    align-self: center;
                    gap: 30px;
                    display: flex;
                    /* margin-left: auto; */
                    padding-right: 10px;
                }
                
                .resumo-container-app-date {
                    align-self: center;
                    gap: 30px;
                    display: flex;
                    /* margin-left: auto; */
                    padding-right: 30px;
                }

                .resumo-container-app-number {
                    display: flex;
                    align-self: center;
                    margin-left: 20px;
                    gap: 30px;
                }
                
                .ap-container {
                    display: flex;
                    justify-content: space-between;
                    flex-direction: column;
                    width: 100%;
                    margin: 5px 0 0;
                    page-break-after: always;   /* 👈 quebra DEPOIS – deixa o 1º na 1ª página */
                    break-after: page;          /* fallback moderno */
                    box-decoration-break: clone;
                }

                /* Não cria página em branco depois do último AP */
                .ap-container:last-of-type {
                    page-break-after: auto;
                    break-after: auto;
                }

                .left-side-container{
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between; 
                    gap: 10px;
                    width: 100%;
                }
                .parcelas-container {
                    display: grid;
                    width: 95%;
                    max-width: 95%;
                    min-width: 95%;
                    grid-template-columns: repeat(5, 1fr);
                    gap: 2px;
                    row-gap: 0px;
                    padding: 2px ;
                    padding-right: 20px;
                }

                .obs-container{
                    height: 90px;
                    border: 1px dotted black;
                    border-radius: 4px;
                    width: 92%;
                    margin: 0px 0px 10px 5px;
                }

                .obs-container {
                    padding: 2px 5px 
                }

                .produtos-conatiner {
                    width: 60%;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    padding: 0px 10px;
                    align-items: center;
                }

                .details-container {
                    display: flex;
                    width: 100%;
                    height: 100%;
                }

                /* Lado esquerdo (texto) — 40 % */
                .left-side-container {
                    flex: 0 0 40%;   /* não cresce, não encolhe */
                    max-width: 40%;
                }

                /* Lado direito (imagem ou produtos) — 60 % */
                .produtos-conatiner {          /* confira o nome da classe! */
                    flex: 0 0 60%;   /* idem */
                    max-width: 60%;
                    padding: 0 10px;
                }

                .parcela-detail-container {
                    display: flex;
                    flex-direction: column;
                    justify-content: space-around;

                    /* ➡️ LARGURA — reduza de 40 % para 30 % (ou o valor que preferir) */
                    width: 60%;
                    flex: 0 0 60%;   /* evita que cresça/encolha no flexbox */

                    /* ➡️ PADDING — menos “folga” interna */
                    padding: 2px 4px;

                    /* ➡️ ALTURA — menor */
                    max-height: 20px;
                    min-height: 20px;

                    /* ➡️ MARGEM — cartão mais juntinho dos outros */
                    margin: 3px;

                    border: 0.5px dotted black; /* se quiser manter a borda */
                    border-radius: 4px;
                    font-size: 0.65em;          /* fonte menor (opcional) */
                }

                /* Se precisar encolher ainda mais o texto dentro das sub-linhas: */
                .detail-variedade-area,
                .detail-variedade-dap,
                .detail-variedade-status {
                   font-size: 0.7em;           /* ajuste fino; menor que 1 = diminui */
                }

                .finish-parcela{
                    background-color: #DEDFE4;
                }

                .detail-variedade-area {
                    display: flex;
                    justify-content: space-between;
                    gap: 10px;
                    flex-direction: row;
                    width: 100%;
                    border-bottom: 0.5px solid black;
                }

                .detail-variedade-dap {
                    font-size: 0.7em;
                    display: flex;
                    justify-content: space-between;
                    flex-direction: row;
                    gap: 10px;
                    width: 100%;
                }

                .detail-variedade-status{
                    font-size: 0.7em;
                    display: flex;
                    justify-content: flex-end;
                    flex-direction: row;
                    gap: 10px;
                    width: 100%;
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

                .header-produtos span {
                    margin-bottom: 0px;
                    font-size: 1.2em;
                }

                .grid-produtos {
                    display: grid;
                    grid-template-columns: 25% 50% 25%;
                    width: 60%;
                    text-align: center;
                }

                .detail-prod-container {
                    margin-bottom: 1px;
                }

                .even-row-prod{
                    background-color: rgba(107,107,107,0.1)
                }

                .header-container {
                    margin-bottom: 0px
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
                    font-size: 1.2em
                }

                .first-prod-here {
                    margin-top: 10px
                }

                .prods-container-containing-map {
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    height: 100%;
                    flex-grow: 1;
                    padding: 5px;
                }

                .produtos-conatiner {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    justify-content: space-between;
                }
                .map-image-container {
                    flex-grow: 1;
                    display: flex;
                    align-items: stretch;
                    justify-content: center;
                    margin-top: 10px;
                }

                .map-image-container img {
                    width: 95%;
                    height: 100%;
                    object-fit: contain;
                    border: 1px solid #000;
                }

                .header-produto4 {
                    border-bottom: 1px solid #0000
                }
            </style>
        </head>

        <body>
            <div class="main-container">
                <div>

                    <div class="header-container">
                        <div class="header-title">
                            ${farm.replace('Fazenda ', '')}
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
    `

    try {
        // Create a timestamp and formatted filename
        const formattedDate = new Date().toLocaleDateString('en-GB').replace(/\//g, '-'); // Optional: DD-MM-YYYY format
        const filename = `${farm.replace('Fazenda ', '')} openApss - ${formattedDate}_app.pdf`;
        const newUri = `${FileSystem.documentDirectory}${filename}`;

        // Create a PDF from HTML content
        const { uri } = await Print.printToFileAsync({
            html: htmlContent,
            base64: false,
        });

        // Check if the PDF was created
        const fileInfo = await FileSystem.getInfoAsync(uri);
        if (!fileInfo.exists) {
            throw new Error("PDF file was not created successfully");
        }

        // Move the PDF to the desired location with the correct filename
        await FileSystem.moveAsync({
            from: uri,
            to: newUri,
        });

        // Optionally share the PDF
        await shareAsync(newUri, { dialogTitle: "Enviar PDF" });

        console.log("PDF created at:", newUri);
    } catch (error) {
        console.error("Error creating PDF:", error);
    };
}



