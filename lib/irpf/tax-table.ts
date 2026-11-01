import { z } from "zod";

const monthlyValues = z.array(z.number()).length(12);

const responseSchema = z.object({
  codigoRetorno: z.string(),
  vaDedDependenteMe: monthlyValues,
  vaDeducSimpMe: monthlyValues,
  deducoesDependentes: z.number(),
  deducoesDespInstrucao: z.number(),
  gpFaixasTblProg: z
    .array(
      z.object({
        peFaixa: z.number(),
        vaAjLimiteMe: monthlyValues,
        vaAjLimiteAnual: z.number(),
      }),
    )
    .min(1),
  gpFaixasTblIsencao: z.array(
    z.object({
      coeficienteReducao: z.array(z.number()),
      limiteRendTributavel: monthlyValues,
      vaMaximoReducao: monthlyValues,
    }),
  ),
});

export type TaxBand = { rate: number; limit: number };

export type AnnualTaxParams = {
  bands: TaxBand[];
  dependentDeduction: number;
  educationLimit: number;
};

export type MonthlyTaxParams = {
  bands: TaxBand[];
  dependentDeduction: number;
  simplifiedDeduction: number;
  reductions: { incomeLimit: number; maxReduction: number; coefficient: number }[];
};

export type TaxTable = {
  year: number;
  annual: AnnualTaxParams;
  months: MonthlyTaxParams[];
};

export function parseTaxTable(year: number, json: unknown): TaxTable {
  const data = responseSchema.parse(json);

  if (data.codigoRetorno !== "00") {
    throw new Error(`Tabela de ${year} indisponível na Receita Federal`);
  }

  return {
    year,
    annual: {
      bands: data.gpFaixasTblProg.map((band) => ({
        rate: band.peFaixa,
        limit: band.vaAjLimiteAnual,
      })),
      dependentDeduction: data.deducoesDependentes,
      educationLimit: data.deducoesDespInstrucao,
    },
    months: Array.from({ length: 12 }, (_, month) => ({
      bands: data.gpFaixasTblProg.map((band) => ({
        rate: band.peFaixa,
        limit: band.vaAjLimiteMe[month],
      })),
      dependentDeduction: data.vaDedDependenteMe[month],
      simplifiedDeduction: data.vaDeducSimpMe[month],
      reductions: data.gpFaixasTblIsencao.map((reduction) => ({
        incomeLimit: reduction.limiteRendTributavel[month],
        maxReduction: reduction.vaMaximoReducao[month],
        coefficient: reduction.coeficienteReducao[month] ?? 0,
      })),
    })),
  };
}
