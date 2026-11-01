export const OTHER_DEDUCTION_TYPES = [
  "private_pension",
  "funpresp",
  "fapi",
  "livro_caixa",
] as const;

export type OtherDeductionType = (typeof OTHER_DEDUCTION_TYPES)[number];

export const OTHER_DEDUCTION_LABELS: Record<OtherDeductionType, string> = {
  private_pension: "Previdência Privada",
  funpresp: "Funpresp",
  fapi: "FAPI",
  livro_caixa: "Carnê-Leão: Livro Caixa",
};
