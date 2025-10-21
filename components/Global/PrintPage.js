import * as Print from "expo-print";
import { shareAsync } from "expo-sharing";
import * as FileSystem from 'expo-file-system/legacy';
import { iconDict } from "../../utils/assets/icon-dict";


const createAndPrintPDF = async (data, farmName, filterEndDate) => {

  const today = new Date();
  const lastSunday = (today) => {
      var t = new Date(today);
      t.setDate(t.getDate() - t.getDay());
      return [t.toISOString().slice(0, 10), t];
  };
  // setInitialDate(lastSunday(today)[0]);
  // setInitialDate("2023-05-01");
  const finalDate = lastSunday(today)[1];
  finalDate.setDate(finalDate.getDate() + 6);
  // setFinalDateForm(finalDate.toISOString().split("T")[0]);
  const endFinalDateHere = finalDate.toISOString().split("T")[0]

  const formatNumber = number => number?.toLocaleString("pt-br", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});
  
const formatDoseNumber = number => number?.toLocaleString("pt-br", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3
});
  let areaTotalGeral = 0

  const parcelaCountGlobal = {};

  data?.forEach(item => {
    item.app.forEach(parcela => {
      parcelaCountGlobal[parcela.parcela] = (parcelaCountGlobal[parcela.parcela] || 0) + 1;
    });
  });

  const prodsList = data?.map((item, index) => {
    const totalArea = item.app.reduce((totalArea, item) => totalArea += item.area, 0)
    areaTotalGeral += totalArea
    const prods = item.app[0].produtos.filter((op) => op.tipo !== 'operacao').sort((a,b) => a.tipo.localeCompare(b.tipo)).map((prod) => (
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

    

    const parcelasDiv = item.app.sort((a,b) => a.dataPrevAp.localeCompare(b.dataPrevAp)).map((parcela) =>{
      const isDuplicate = parcelaCountGlobal[parcela.parcela] > 1;
      const rowStyle = isDuplicate
        ? 'style="color: #ffff00; font-weight: bold;text-align: left;"'
        : 'style="color: #000000; font-weight: bold;text-align: left;"';
        
      const { base64: iconBase64, alt } =
        iconDict.find(i => i.cultura === parcela.cultura) ?? iconDict[iconDict.length - 1];
        const iconTag = `<img src="${iconBase64}" alt="${alt}"
                        style="width:12px;height:12px;margin-right:2px;vertical-align:middle" />`;
      return `
      <tr>
        <td ${rowStyle}>${iconTag} ${parcela.parcela}</td>
        <td>${parcela.dataPlantio.split('-').reverse().join('/')}</td>
        <td>${parcela.dap}</td>
        <td>${parcela.cultura}</td>
        <td>${parcela.variedade}</td>
        <td>${parcela.dataPrevAp.split('-').reverse().join('/')}</td>
        <td>${parcela.dapAp}</td>
        <td style="font-weight: bold;">${formatNumber(parcela.area)}</td>
      </tr>
      `
  }).join('');
    

    return `
    <div class="main-container page-break">
      <div class="main-container-produtos">
          <b>${item.programa}</b>
          <span>${item.aplicacao}</span>
          <span style="margin-bottom: 20px">Área total: ${formatNumber(totalArea)}</span>
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
                      <th>Área</th>
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
          @page {
            size: A4;
            margin-top: 10px;
            margin-bottom: 10px;
          }
          body {
            font-size: 7px;
            padding: 20px 10px !important;
          }
          .page-break {
            margin-top: 10px;
            margin-bottom: 10px;
          }
          
          .main-container{
            border: 0.5px solid black ;
            border-radius: 8px;
            display: grid;
            grid-template-columns: 30% auto;
            padding: 20px;
            margin-bottom: 15px;
            margin-top: 15px;
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
            border-bottom: 0.3px dotted black;
        }
        
        tbody tr td{
            /* background-color: red; */
            padding-top: 2px;
            
        }
        .main-container-header{
          width: 100%;  
          display: flex;
          justify-content: center;
          text-align: center;
        }
        .container-header{
          width: 100%;  
          display: flex;
          justify-content: space-between;
          align-items: center;
          text-align: center;
          padding: 0px 15px;
          margin-top: 5px;
          font-size: 8px;
        }
          </style>
        </head>
        <body>
        <div class="main-container-header">
          <div class="container-header">
          <div style="font-weight: bold;">Até: ${filterEndDate ? filterEndDate.split('-').reverse().join('/') : endFinalDateHere.split('-').reverse().join('/')}</div>
          <div style="font-size: 15px"><b>${farmName.replace('Projeto ', '')}</b></div>
          <div style="font-weight: bold;">Área Total: ${formatNumber(areaTotalGeral)}</div>
          </div>
        </div>
        <div style="padding: 0px 10px;">
          ${prodsList}
        </div>
        </body>
      </html>
    `;

    try {
      // Create a timestamp and formatted filename
      const formattedDate = new Date().toLocaleDateString('en-GB').replace(/\//g, '-'); // Optional: DD-MM-YYYY format
      const filename = `${farmName}.pdf`;
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
};

export default createAndPrintPDF;
