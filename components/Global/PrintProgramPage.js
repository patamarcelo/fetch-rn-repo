import * as Print from "expo-print";
import { shareAsync } from "expo-sharing";
import ProgramList from "../ProgramasScreen/ProgramList";

const PrintProgramPage = async (program, product, estagio) => {

 

  const formatNumber = number => number?.toLocaleString("pt-br", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});
  
const formatDoseNumber = number => number?.toLocaleString("pt-br", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3
});


const programList = estagio?.map((estag) => {
  const estName = estag.split('|')[0].trim()
  const estDap = estag.split('|')[1]

  const prods = product.filter((prods) => prods.operacao__estagio.trim() === estName).map((aps) => {
    // console.log('operacao estagio: ', estName)
    // console.log('operacao prods: ', aps.operacao__estagio)
    // console.log(aps.operacao__estagio.trim() === estName.trim())

    return `
    <div>${aps.defensivo__produto}</div>
    `
  }).join('');

  const prodsType = product.filter((prods) => prods.operacao__estagio.trim() === estName).map((aps) => {
    return `
    <div>${aps.defensivo__tipo}</div>
    `
  }).join('');

  const prodsDose = product.filter((prods) => prods.operacao__estagio.trim() === estName).map((aps) => {
    return `
    <div>${formatDoseNumber(aps.dose)}</div>
    `
  }).join('');
  
  return `
  <div class="programa-grid-container page-break">
    <div class="programa-detail-title">
      <div>
          <h4>${estName}</h4>
          <h6 class="dap-title">DAP: ${estDap}</h6>
      </div>
    </div>
    <div class="program-detail-list">
        ${prods}
    </div>
    <div class="program-detail-list program-detail-list-type">
        ${prodsType}
    </div>
    <div class="program-detail-list program-detail-list-dose">
        ${prodsDose}
    </div>
    <div class="program-detail-list program-detail-list-quantity">
        ${prodsDose}
    </div>
    <div></div>
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
          @page {
            margin: 10px 10px; /* top/bottom, left/right margins for each page */
          }
            body{
            font-size: 7px;
            padding: 20px 10px !important;
          }
            .page-break {
            margin-top: 1px;
            margin-bottom: 1px;
          }
          .main-container {
              display: flex;
              justify-content: center;
              flex-direction: column;
              padding: 10px 30px;
              font-family: Arial, Helvetica, sans-serif
          }
          .header-main-container {
              border: 1px solid black;
              width: 100%;
              display: flex;
              justify-content: center;
              border-radius: 6px;
              background-color: rgb(18, 117, 181);
              color: whitesmoke;
          }
          .safra-info {
              margin-left: auto;
              font-weight: bold;
              margin-top: 5px;
          }
          .program-main-container {
              display: flex;
              flex-direction: column;
              gap: 3px;
          }
          .programa-grid-container {
              display: grid;
              grid-template-columns: repeat(5, 17.5%) 12.5%;
              border: 1px solid black;
              border-radius: 6px;
              background-color: rgba(245, 245, 245, 0.1);
          }

          .program-main-container div, programa-detail-title{
              page-break-inside: avoid !important;
          }

          .program-header-container {
              margin-bottom: 3px;
              margin-top: 20px;
              display: grid;
              grid-template-columns: repeat(5, 17.5%) 12.5%;
              font-weight: bold;
              justify-items: center;
          }

          .programa-detail-title {
              display: flex;
              flex-direction: column;
              padding-top: 5px;
              padding-bottom: 5px;
              border-right: 0.5px dotted black;
              white-space: normal;
              text-align: center;
          }
    
          .programa-detail-title h4,
          .programa-detail-title h6 {
              margin: 0px;
          }

          .program-detail-list div {
              padding-left: 5px;
              padding-top: 2px;
              padding-bottom: 2px;
              border-bottom: 0.5px dotted black;
              border-right: 0.5px dotted black;
          }

          .program-detail-list div:last-child {
              border-bottom: 0px;
          }

          .program-detail-list-type {
              text-align: center;
          }

          .program-detail-list-dose {
              text-align: center;
          }


          .program-detail-list-quantity div {
              text-align: right;
              padding-right: 42%;
          }
          .dap-title{
              color: rgb(2,0,139);
          }
                  
                    </style>
                  </head>
                  <body>
              <div class="main-container">
                  <div class="header-main-container">
                      <h1>${program.nome_fantasia}</h1>
                  </div>
                  <span class="safra-info">2023/2024 - 3</span>
                  <div class="program-header-container">
                      <div>Estagio</div>
                      <div>Produto</div>
                      <div>Tipo</div>
                      <div>Dose Kg/Lt ha</div>
                      <div>Quantidade</div>
                      <div>Observação</div>
                  </div>
                  <div class="program-main-container">
                      ${programList}
                  </div>
              </div>
          </body>
      </html>
    `;

  try {
    // Create a PDF from HTML content
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${program.nome}_${timestamp}.pdf`;
    const { uri } = await Print.printToFileAsync({
      html: htmlContent,
      base64: false,
      filename: filename
    });
    
    // Optionally share the PDF
    await shareAsync(uri, { dialogTitle: "Share your PDF" });

    console.log("PDF created at:", uri);
  } catch (error) {
    console.error("Error creating PDF:", error);
  }
};

export default PrintProgramPage;
