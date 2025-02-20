import * as Print from "expo-print";
import { shareAsync } from "expo-sharing";
import * as FileSystem from 'expo-file-system';

export const createApplicationPdf = async (data, farm) => {


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
        if(!dateString){
            return '-'
        }
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    }
    

    const apCotainer = data.map((app) => {

        const appsCards = app.parcelas.map((parcela) => {
            return `
                <div class="parcela-detail-container bordered ${parcela.areaSolicitada == parcela.areaAplicada && 'finish-parcela'}">
                    <div class="detail-variedade-area">
                        <b>${parcela.parcela}</b><span>${formatNumber(parcela.areaSolicitada)} há</span>
                    </div>
                    <div class="detail-variedade-dap">
                        <span>${parcela.variedade || '?'}</span><span>${getDap(parcela.date)} dias</span>
                    </div>
                    <div class="detail-variedade-status">
                        <span>Aplicado: ${formatNumber(parcela.areaAplicada)}</span>
                    </div>
                </div>
            `
        }).join('');

        const prodsCards = app.prods.filter((prodType) => prodType.type !== 'Operação').map((prod, i) => {
        
            return `
                <div class="grid-produtos detail-prod-container ${ i === 0 && 'first-prod-here'}">
                    <span>${formatDoseNumber(prod.doseSolicitada)}</span>
                    <span>${prod.product}</span>
                    <span>${formatNumber(prod.quantidadeSolicitada)}</span>
                </div>
            `    
        }).join('');

        const totalRealizado = app?.areaSolicitada - app?.saldoAreaAplicar

        return `
        <div class="ap-container bordered">
            <div class="resumo-container bordered">
                <div class="resumo-container-app-number">
                    <span><b>${app?.code.replace('AP',"AP ")}</b></span>
                    <span><b>${app?.operation}</b></span>
                </div>
                <div class="resumo-container-app-area">
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
                <div class="parcelas-container">
                    ${appsCards}
                </div>
                <div class="bordered-left produtos-conatiner">
                    <div class="header-produtos grid-produtos">
                        <span>Dose</span>
                        <span>Produto</span>
                        <span>Solicitado</span>
                    </div>
                    ${prodsCards}
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
            <link rel="stylesheet" href="./farmBoxapp.css">
            <title>Document</title>
            <style>
                @page {
                        margin: 10px 10px; /* top/bottom, left/right margins for each page */
                    }
                body {
                    font-size: 7px;
                    padding: 20px 10px !important;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                .main-container {
                    width: 100%;
                    display: flex;
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
                    border: 1px solid black;
                }

                .resumo-container {
                    width: 100%;
                    display: flex;
                    flex-direction: row;
                    justify-content: space-between;
                    padding: 10px 0px;
                }

                .resumo-container-app-area {
                    align-self: center;
                    gap: 30px;
                    display: flex;
                    /* margin-left: auto; */
                    padding-right: 30px;
                }

                .resumo-container-app-number {
                    display: flex;
                    align-self: center;
                    gap: 30px;
                    margin-left: 20px;
                }

                .ap-container {
                    display: flex;
                    justify-content: space-between;
                    flex-direction: column;
                    width: 100%;
                }

                .parcelas-container {
                    display: grid;
                    width: 55%;
                    max-width: 55%;
                    min-width: 55%;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 40px;
                    row-gap: 0px;
                    padding: 10px 30px 10px 10px;
                    padding-right: 50px;
                }

                .produtos-conatiner {
                    width: 40%;
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
                    width: 100%;
                    padding-top: 10px;
                    padding-bottom: 20px;
                    margin: 10px 5px;
                    padding-left: 10px;
                    padding-right: 10px;
                    max-height: 10px;
                    min-height: 10px;
                }

                .finish-parcela{
                    background-color: #DEDFE4;
                }

                .detail-variedade-area {
                    display: flex;
                    justify-content: space-evenly;
                    gap: 10px;
                    flex-direction: row;
                    width: 100%;
                    border-bottom: 0.5px solid black;
                }

                .detail-variedade-dap {
                    font-size: 0.5em;
                    display: flex;
                    justify-content: space-evenly;
                    flex-direction: row;
                    gap: 10px;
                    width: 100%;
                }

                .detail-variedade-status{
                    font-size: 0.5em;
                    display: flex;
                    justify-content: flex-start;
                    flex-direction: row;
                    gap: 10px;
                    width: 100%;
                }

                .parcela-detail-container.bordered {
                    border-radius: 8px;
                    border: 0.5px dotted black;
                }

                .bordered-left {
                    border-left: 1px solid black;
                }

                .header-produtos {
                    border-bottom: 1px solid black;
                    margin-top: 20px
                }

                .header-produtos span {
                    margin-bottom: 5px;
                    font-size: 1.2em;
                }

                .grid-produtos {
                    display: grid;
                    grid-template-columns: 25% 50% 25%;
                    width: 100%;
                    text-align: center;
                }

                .detail-prod-container {
                    margin-bottom: 3px;
                }

                header h6 {
                    margin-bottom: 0px
                }

                .first-prod-here {
                    margin-top: 10px
                }
            
            </style>
        </head>

        <body>
            <div class="main-container">
                <div>

                    <header>
                    <h6>
                        ${farm.replace('Fazenda ', '')}
                    </h6>
                    </header>
                </div>
                ${apCotainer}
            </div>
        </body>

        </html>
    `

    try {
        // Create a PDF from HTML content
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${farm}_${timestamp}.pdf`;
        const newUri = `${FileSystem.documentDirectory}${filename}`;

        const { uri } = await Print.printToFileAsync({
            html: htmlContent,
            base64: false,
        });

        const fileInfo = await FileSystem.getInfoAsync(uri);
        if (!fileInfo.exists) {
            throw new Error("PDF file was not created successfully");
        }


        // Ensure the target directory exists
        const directoryInfo = await FileSystem.getInfoAsync(FileSystem.documentDirectory);
        if (!directoryInfo.exists) {
            throw new Error("Target directory does not exist");
        }


        // await FileSystem.moveAsync({
        //   from: uri,
        //   to: newUri
        // });

        // Optionally share the PDF
        await shareAsync(uri, { dialogTitle: "Share your PDF" });

        console.log("PDF created at:", uri);
    } catch (error) {
        console.error("Error creating PDF:", error);
    }
}



