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
    let finalArray = [];

    data.forEach((farmData) => {
        const area = farmData.dados.area_colheita;
        const variedade = farmData.dados.variedade;
        const cultura = farmData.dados.cultura;
        const parcela = farmData.parcela;
        const dataPlantio = farmData.dados.data_plantio;
        const projetoIdFarmbox = farmData.dados.projeto_id_farmbox;
        const plantioIdFarmbox = farmData.plantio_id_farmbox;
        const dap = farmData.dados.dap;
        const endFinalDate = filterFinalDate ? filterFinalDate : endFinalDateHere;

        farmData.dados.cronograma
            .filter((data) => data.aplicado === false && data["data prevista"] <= endFinalDate)
            .forEach((cron) => {
                const newObj = {
                    parcela,
                    area,
                    projetoIdFarmbox,
                    plantioIdFarmbox,
                    dataPlantio,
                    dap,
                    variedade,
                    cultura,
                    dapAp: cron.dap,
                    estagio: cron.estagio,
                    aplicado: cron.aplicado,
                    dataPrevAp: cron["data prevista"],
                    produtos: cron.produtos
                };
                finalArray.push(newObj);
            });
    });

    // ✅ Etapa nova: contar parcelas
    const parcelaCount = finalArray.reduce((acc, item) => {
        acc[item.parcela] = (acc[item.parcela] || 0) + 1;
        return acc;
    }, {});

    // ✅ Marcar objetos com parcelas duplicadas
    finalArray = finalArray.map((item) => ({
        ...item,
        parcelaDuplicada: parcelaCount[item.parcela] > 1
    }));

    // ✅ Organizar por estágio e programa
    const orgData = finalArray.reduce((acc, curr) => {
        if (acc.filter((data) => data.estagio === curr.estagio).length === 0) {
            acc.push({
                estagio: curr.estagio,
                aplicacao: curr.estagio.split('|')[0],
                programa: curr.estagio.split('|')[1],
                app: [curr],
                dap: curr.dapAp
            });
        } else {
            const getIndex = acc.findIndex((e) => e.estagio === curr.estagio);
            acc[getIndex].app.push(curr);
        }
        return acc;
    }, []);

    const sortedDataFinal = orgData
        .sort((a, b) => a.dap - b.dap)
        .sort((a, b) => a.programa.localeCompare(b.programa));

    return sortedDataFinal;
};