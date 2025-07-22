// const [initialDateForm, setInitialDate] = useState(null);
// const [finalDateForm, setFinalDateForm] = useState(null);

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


export default formatDataProgram = (data, filterFinalDate) => {
    let finalArray = []
    data.forEach((farmData) => {
        const area = farmData.dados.area_colheita;
        const variedade = farmData.dados.variedade;
        const cultura = farmData.dados.cultura
        const parcela = farmData.parcela;
        const dataPlantio = farmData.dados.data_plantio;
        const projetoIdFarmbox = farmData.dados.projeto_id_farmbox
        const plantioIdFarmbox = farmData.plantio_id_farmbox
        const dap = farmData.dados.dap
        const endFinalDate = filterFinalDate ? filterFinalDate : endFinalDateHere 
        farmData.dados.cronograma.filter((data) => data.aplicado === false && data["data prevista"] <= endFinalDate).forEach((cron) => {
            const estagio = cron.estagio;
            const aplicado = cron.aplicado;
            const dataPrevAp = cron["data prevista"]
            const produtos = cron.produtos
            const dapAp = cron.dap
            const newObj = {
                parcela, 
                area,
                projetoIdFarmbox,
                plantioIdFarmbox,
                dataPlantio,
                dap,
                variedade,
                cultura,
                dapAp,
                estagio,
                aplicado,
                dataPrevAp,
                produtos
            }
            finalArray.push(newObj)
        })
    })
    // console.log("formatArr: ", finalArray)
    const orgData = finalArray.reduce((acc, curr) => {
        if(acc.filter((data) => data.estagio === curr.estagio).length === 0){
            const objToAdd = {
                estagio: curr.estagio,
                aplicacao: curr.estagio.split('|')[0],
                programa: curr.estagio.split('|')[1],
                app: [curr],
                dap: curr.dapAp
            }
            acc.push(objToAdd)
        } else {
            const findIndexOf = (e) => e.estagio === curr.estagio
            const getIndex = acc.findIndex(findIndexOf)
            acc[getIndex].app.push(curr)
        }
        return acc
    },[])
    const sortedDataFinal = orgData.sort((a,b) => a.dap - b.dap).sort((a,b) => a.programa.localeCompare(b.programa))
    return sortedDataFinal
}