import * as Print from "expo-print";
import { shareAsync } from "expo-sharing";
import * as FileSystem from 'expo-file-system';

import { Asset } from 'expo-asset';
import { getMapSvgBase64 } from "./PrintCronogramaPagePlotMap.jsx";
// import plotMap from './plot-map.json';   // caminho relativo ao arquivo

import { iconDict } from "../../utils/assets/icon-dict.js";
import { Platform } from "react-native";

console.log('typeof [].at →', typeof [].at);
export const createApplicationPdfMap = async (data, farm, plotMap) => {

    console.log('data: ', data)
    console.log('farm: ', farm)
    console.log('farm: ', plotMap)
    const dataFromJson = plotMap.data;               // já é objeto JS




    const formatNumber = number => number?.toLocaleString("pt-br", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });


    const formatDoseNumber = number => number?.toLocaleString("pt-br", {
        minimumFractionDigits: 3,
        maximumFractionDigits: 3
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




    const totalAplicar = data.filter((op) => !op.operation.toLowerCase().includes('Colheita de Grãos')).reduce((acc, curr) => acc += curr.saldoAreaAplicar, 0)
    const apCotainer = data.filter((op) => !op.operation.toLowerCase().includes('Colheita de Grãos')).map((app) => {

        const talhoesParaPintar = app.parcelas.map((parcela) => parcela.parcela)
        const cultura = app.parcelas?.[0]?.cultura ?? 'unknown';
        
        console.log('[PDF] - gerando os mapas com a funcao getMapSvgBase64: ')
        const base64Image = getMapSvgBase64(talhoesParaPintar, dataFromJson, cultura);
        console.log('[PDF] - Finalizado os mapas com a funcao... ')

        const culturaAtual = app.parcelas?.[0]?.cultura ?? undefined;
        // procura no iconDict; se não achar, usa o “?” (último item)
        console.log('[PDF] - pegando os icones com a funcao: iconBase64 ')
        const { base64: iconBase64, alt } =
        iconDict.find(i => i.cultura === culturaAtual) ?? iconDict[iconDict.length - 1];
        
        console.log('[PDF] - Finalizando os icones com a funcao: iconBase64 ')
        console.log('iconBase: ', iconBase64)

        // tag pronta para colar
        const iconTag = `<img src="${iconBase64}" alt="${alt}"
                        style="width:16px;height:16px;margin-right:4px;vertical-align:middle" />`;
    
        const appsCards = app.parcelas.map((parcela) => {

            console.log('[PDF] - pegando os icones com a funcao: iconBase64 ')
            const { base64: iconBase64, alt } = iconDict.find(i => i.cultura === parcela.cultura) ?? iconDict[iconDict.length - 1];
            
            console.log('[PDF] - Finalizando os icones com a funcao: iconBase64 ')
            console.log('iconBase: ', iconBase64)

            const iconTagInside = `<img src="${iconBase64}" alt="${alt}"
                        style="width:8px;height:8px;margin-left: 3px;padding-bottom: 2px;vertical-align:middle" />`;

            const areaAplicada = `<span><b>Aplicado:</b> ${formatNumber(parcela.areaAplicada)} há</span>`
            return `
                <div class="${Platform.OS === 'ios' ? 'parcela-detail-container' : 'parcela-detail-container-android' } bordered ${parcela.areaSolicitada == parcela.areaAplicada && 'finish-parcela'}">
                    <div class="detail-variedade-area ${Platform.OS === 'android' && 'detail-variedade-area-android'}">
                        <b>${parcela.parcela}${iconTagInside}</b><span>${formatNumber(parcela.areaSolicitada)} há</span>
                    </div>
                    <div class="detail-variedade-dap ${Platform.OS !== 'ios' ? 'font-mini' : ''}">
                        <p>${parcela.variedade || '?'}</p><p>${getDap(parcela.date)} dias</p>
                    </div>
                    <div class="detail-variedade-status ${Platform.OS === 'android' && 'detail-variedade-status-android'}">
                        ${parcela.areaAplicada > 0 ? areaAplicada : ''}
                    </div>
                </div>
            `
        }).join('');

        function withOpacity(rgb, alpha = 0.3) {
            // aceita "rgb(69,133,255)" ou "rgba(69,133,255,1)"
            const nums = rgb.match(/\d+(\.\d+)?/g);     // → ["69","133","255"]
            if (!nums || nums.length < 3) return rgb;   // formato inesperado
            const [r, g, b] = nums;
            return `rgba(${r},${g},${b},${alpha})`;
        }

        const prodsCards = app.prods.filter((prodType) => prodType.type !== 'Operação').sort((a,b) => a.type.localeCompare(b.type)).map((prod, i) => {

            return `
                <div class="grid-produtos detail-prod-container ${i === 0 && 'first-prod-here'} ${i % 2 !== 0 && 'even-row-prod'}" style="background-color: ${withOpacity(prod.colorChip)}">
                    <span style="margin-left: 0px; padding-left: 2px;justify-self: start">${formatDoseNumber(prod.doseSolicitada).toString().trim()} <small style="margin-left: 3px; color: #777777">${prod?.unit}</small></span>
                    <span>${prod.type.replace('/Vegetal', '')}</span>
                    <span>${prod.product}</span>
                    <span style="justify-self: end; padding-right: 1px;">${formatNumber(prod.quantidadeSolicitada)}</span>
                </div>
            `
        }).join('');

        const totalRealizado = app?.areaSolicitada - app?.saldoAreaAplicar
        const imgTag = `<img src="data:image/svg+xml;base64,${base64Image}" style="width:90%;max-height:100vh"/>`;
        return `
        <div class="resume-header-container">
            <div>
                <span><b>${farm.replace('Fazenda ', 'Projeto ')}</b></span>
            </div>
            <div>
                <span><b>${app?.code.replace('AP', "AP ")}</b></span>
            </div>
        </div>
        <div class="ap-container bordered">
            <div class="resumo-container bordered">
                <div class="resumo-container-app-number">
                    <span>${iconTag}<b>${app?.code.replace('AP', "AP ")}</b></span>
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
                    <div class="${Platform.OS === 'ios' ? 'parcelas-container' : 'parcelas-container-android'}">
                        ${appsCards}
                    </div>
                    <div class="prods-container-containing-map-new-order">
                        <div class="header-produto4 grid-produtos" style="border-bottom: 1px solid black;">
                            <b style="justify-self: start">Dose</b>
                            <b>Tipo</b>
                            <b>Produto</b>
                            <b style="justify-self: end;">Solicitado</b>
                        </div>
                        ${prodsCards}
                    </div>
                </div>
                <div class="bordered-left produtos-conatiner">
                    <div class="prods-container-containing-map">
                        <div style="width:95%; height:100%; margin-top:10px;">
                        ${imgTag}
                        </div>
                        <div class="obs-container">
                            <span>Observações</span>
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

                .resume-header-container {
                    display: flex;
                    flex-direction: row;
                    gap: 20px;
                    align-items: flex-end;
                    justify-content: flex-end;
                    width: 100%;
                }
 
                .resumo-container {
                    width: 100%;
                    display: grid;
                    grid-template-columns: ${Platform.OS === 'ios' ? '40% 30% 30%' : '40% 27% 33%'};
                    gap: 10px; /* opcional: espaço entre colunas */
                    padding: 2px 0px;
                    background-color: rgba(107, 107, 107, 0.2);
                    border: 0.5px solid black;
                }


                .resumo-container-app-area {
                    align-items: center;
                    gap: 20px;
                    display: flex;
                    padding-right: ${Platform.OS === 'ios' ? '4px' : '20px'};
                }
                
                .resumo-container-app-date {
                    align-items: center;
                    gap: 10px;
                    display: flex;
                    /* margin-left: auto; */
                    padding-left: 0px;
                }

                .resumo-container-app-number {
                    display: flex;
                    align-items: center;    
                    margin-left: 5px;
                    gap: 30px;
                }

                .resumo-container-app-number {
                    text-align: left;
                }

                .resumo-container-app-date {
                    text-align: center; /* opcional */
                }

                .resumo-container-app-area {
                    text-align: right;
                }
                
                .ap-container {
                    display: flex;
                    justify-content: space-between;
                    flex-direction: column;
                    width: 100%;
                    margin: 0px;
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
                
                .parcelas-container-android {
                    display: grid;
                    width: 85%;
                    max-width: 95%;
                    min-width: 95%;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 2px;
                    row-gap: 0px;
                    padding: 2px ;
                    padding-right: 20px;
                }

                .obs-container{
                    height: 90px;
                    border: 1px dotted black;
                    border-radius: 2px;
                    width: 94%;
                    margin: 10px 15px 0px 5px;
                }

                .obs-container {
                    padding: 0px 5px 
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
                    width: 80%;
                    flex: 0 0 80%;   /* evita que cresça/encolha no flexbox */

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
                

                .parcela-detail-container-android {
                    display: flex;
                    flex-direction: column;
                    justify-content: space-around;

                    /* ➡️ LARGURA — reduza de 40 % para 30 % (ou o valor que preferir) */
                    width: 80%;
                    flex: 0 0 80%;   /* evita que cresça/encolha no flexbox */

                    /* ➡️ PADDING — menos “folga” interna */
                    padding: 2px 4px;

                    /* ➡️ ALTURA — menor */
                    max-height: 40px;
                    min-height: 40px;

                    /* ➡️ MARGEM — cartão mais juntinho dos outros */
                    margin: 3px;

                    border: 0.5px dotted black; /* se quiser manter a borda */
                    border-radius: 4px;
                    font-size: 0.50em;          /* fonte menor (opcional) */
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
                    grid-template-columns: 20%  30% 30% 20%;
                    width: 96%;
                    text-align: center;
                }

                .detail-prod-container {
                    margin-bottom: 1px;
                    justify-content: space-between;
                }

                .even-row-prod{
                    background-color: rgba(107,107,107,0.1)
                }

                .header-container {
                    margin-bottom: 0px
                    margin-left: 30px;
                    display: flex;
                    justify-content: flex-center;
                    align-items: center;
                    flex-direction: column;
                    width: 100%;
                }

                .header-title {
                    font-size: 30px;
                    font-weight: bold;
                    text-align: center;
                }
                .header-area {
                    font-size: 1.2em;
                    margin-bottom: -20px;
                }

                .first-prod-here {
                    margin-top: 1px
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
                
                .prods-container-containing-map-new-order {
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
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
                .detail-variedade-area-android,
                .detail-variedade-dap-android,
                .detail-variedade-status-android {
                    font-size: 4px !important;          
                }    
                .detail-variedade-dap.font-mini p {
                    font-size: 1px !important;
                }
            </style>
        </head>

        <body>
            <div class="main-container">
                    <div class="header-container">
                        <div class="header-title">
                            ${farm.replace('Fazenda ', '')}
                        </div>
                        <div>
                            <b>Área Total:</b> ${formatNumber(totalAplicar)} há
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



