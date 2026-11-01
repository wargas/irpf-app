import { db } from "@/lib/db"
import data from "./data.json"
import { expense, monthlyEntry, otherDeduction } from "@/lib/db/schema"
import _ from "lodash"

const rubricas = new Set()

const codigosRendimentosTributaveis = ["00002", "01504", "01635", "02012", "01636"]
const codigoIRPF = ["04061"]
const codigoPrevidencia = ["04002"]
const codigoComplementar = ["04006"]

const values = data.contracheques.filter(c => c.mes_ano.startsWith("2026")).map(c => {
    const [ano, mes] = c.mes_ano.split("-");

    const entryId = crypto.randomUUID()

    const entries: typeof monthlyEntry.$inferInsert = {
        id: entryId,
        userId: "f93KusSNVlIrc2CfcphiMYIAp8YYRUlk",
        employmentId: "802130ed-d5e1-11f1-9dc6-02420a000174",
        year: parseInt(ano!),
        month: parseInt(mes),
        income: _.sumBy(_.filter(c.vantagens, v => codigosRendimentosTributaveis.includes(v.codigo)), "valor"),
        officialPension: _.sumBy(_.filter(c.descontos, v => codigoPrevidencia.includes(v.codigo)), "valor"),
        dependents: 2,
        alimony: 0,
        withheldTax: _.sumBy(_.filter(c.descontos, v => codigoIRPF.includes(v.codigo)), "valor"),
    }

    const outhers: typeof otherDeduction.$inferInsert = {
        id: crypto.randomUUID(),
        entryId: entryId,
        type: "funpresp",
        amount: _.sumBy(_.filter(c.descontos, v => codigoComplementar.includes(v.codigo)), "valor"),
    }

    const expenses:typeof expense.$inferInsert = {
        id: crypto.randomUUID(),
        userId: "f93KusSNVlIrc2CfcphiMYIAp8YYRUlk",
        description: "PLANO DE SAUDE UNIMED",
        year: parseInt(ano!),
        category: "health",
        beneficiary: "Titular",
        date: `${ano}-${mes}-01`,
        amount: _.sumBy(_.filter(c.descontos, v => codigoComplementar.includes(v.codigo)), "valor")
    }

    return { entries, expenses, outhers };

})

for await (const {entries, expenses, outhers} of values) {
    await db.insert(monthlyEntry).values(entries);
    await db.insert(otherDeduction).values(outhers);
    await db.insert(expense).values(expenses);

}

console.log(values)

// "04002:FUNAPREV",
// "04006:PREV COMPLEM PATROC",
// "04061:Desconto de Imposto de Renda",
// "04506:BRADESCO S/A",
// "04704:ANSERJUFE",
// "04734:SIND DOS FUNC INTG DO GRUPO OCUPAC AUDITORIA TES EST PE",
// "01635:GRT ADMINISTRACAO FISCAL",