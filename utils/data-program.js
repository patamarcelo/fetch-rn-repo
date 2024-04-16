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
const endFinalDate = finalDate.toISOString().split("T")[0]


export default formatDataProgram = (data) => {
    let finalArray = []
    data.forEach((farmData) => {
        const area = farmData.dados.area_colheita;
        const variedade = farmData.dados.variedade;
        const parcela = farmData.parcela;
        const dataPlantio = farmData.dados.data_plantio;
        const dap = farmData.dados.dap
        farmData.dados.cronograma.filter((data) => data.aplicado === false && data["data prevista"] <= endFinalDate).forEach((cron) => {
            const estagio = cron.estagio;
            const aplicado = cron.aplicado;
            const dataPrevAp = cron["data prevista"]
            const newObj = {
                parcela, 
                area,
                dataPlantio,
                dap,
                variedade,
                dap,
                estagio,
                aplicado,
                dataPrevAp
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
                app: [curr]
            }
            acc.push(objToAdd)
        } else {
            const findIndexOf = (e) => e.estagio === curr.estagio
            const getIndex = acc.findIndex(findIndexOf)
            acc[getIndex].app.push(curr)
        }
        return acc
    },[])
    console.log('after reduce: ', orgData)
    return orgData
}