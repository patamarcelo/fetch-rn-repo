import * as Print from "expo-print";
import { shareAsync } from "expo-sharing";

const createAndPrintPDF = async (data) => {

  const formatNumber = number => number?.toLocaleString("pt-br", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});
  
const formatDoseNumber = number => number?.toLocaleString("pt-br", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3
});

  const prodsList = data?.map((item, index) => {
    const totalArea = item.app.reduce((totalArea, item) => totalArea += item.area, 0)
    const prods = item.app[0].produtos.filter((op) => op.tipo !== 'operacao').map((prod) => (
      `
      <div class="container-produtos-detail">
          <div class="container-produtos-row">
              <div class="container-produtos-row-detail">
                  <div>${formatDoseNumber(prod.dose.replace('.', ','))}&nbsp-</div>
                  <div>&nbsp${prod.produto}</div>
              </div>
              <div class="container-produtos-row-total">
                  <div>${formatNumber(totalArea * prod.dose)}</div>
              </div>
          </div>
      </div>
      `
    )).join('');
    const parcelasDiv = item.app.map((parcela) =>(
      `
      <tr>
        <td>${parcela.parcela}</td>
        <td>${parcela.dataPlantio.split('-').reverse().join('/')}</td>
        <td>${parcela.dap}</td>
        <td>${parcela.cultura}</td>
        <td>${parcela.variedade}</td>
        <td>${parcela.dataPrevAp.split('-').reverse().join('/')}</td>
        <td>${parcela.dapAp}</td>
        <td>${formatNumber(parcela.area)}</td>
      </tr>
      `
    )).join('');
    

    return `
    <div class="main-container page-break">
    <div class="main-container-produtos">
        <b>${item.programa}</b>
        <span>${item.aplicacao}</span>
        <span>Area total: ${formatNumber(totalArea)}</span>
        ${prods}
    </div>
    <div class="main-container-parcelas">
        <table>
            <thead>
                <tr>
                    <th>Parcela</th>
                    <th>Plantio</th>
                    <th>Dap</th>
                    <th>Cultura</th>
                    <th>Variedade</th>
                    <th>Prev.</th>
                    <th>DapAp</th>
                    <th>Area</th>
                </tr>
            </thead>
            <tbody>
                ${parcelasDiv}
            </tbody>
        </table>

    </div>
</div>
    `
  }).join('');
  
  const htmlContent = `
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=0.7">
          <title>PDF Document</title>
          <style>
          body{
            font-size: 7px;
            padding: 20px;
          }
          .page-break {
            margin-top: 10px;
            margin-bottom: 10px;
          }
          .main-container{
            border: 1px solid black ;
            border-radius: 8px;
            display: grid;
            grid-template-columns: 30% auto;
            padding: 20px;
            margin-bottom: 25px;
            page-break-inside: avoid; /* Prevent breaking inside a card */

        }
        
        .main-container-produtos{
            display: flex;
            justify-content: center;
            flex-direction: column;
            align-items: center;
            gap: 2px;
        }
        .container-produtos-detail{
            width: 100%;
            justify-content: center;
            background-color: 
        }
        .container-produtos-row{
          display: flex;
          width: 80%;
          justify-content: space-between;
        }
        
        .container-produtos-row-detail{
          display: flex;
          flex-direction: row;
          displays: flex;
          justify-content: flex-start;
          background-color: #f0f;
        }

        .container-produtos-row-total{
          displays: flex;
          justify-content: flex-end;
        }
        
        .main-container-parcelas{
            width: 100%;
        }
        
        table{
            width: 100%;
            table-layout: fixed;
            font-size: 7px;
        }
        td, th {
            width: 12%;
            text-align: center
        }
        
        table>thead>tr>th{
            border-bottom: 1px dotted black;
        }
        
        tbody tr td{
            /* background-color: red; */
            padding-top: 4px;
            
        }
          </style>
        </head>
        <body>
        ${prodsList}
        </body>
      </html>
    `;

  try {
    // Create a PDF from HTML content
    const { uri } = await Print.printToFileAsync({
      html: htmlContent,
      base64: false
    });

    // Optionally share the PDF
    await shareAsync(uri, { dialogTitle: "Share your PDF" });

    console.log("PDF created at:", uri);
  } catch (error) {
    console.error("Error creating PDF:", error);
  }
};

export default createAndPrintPDF;
