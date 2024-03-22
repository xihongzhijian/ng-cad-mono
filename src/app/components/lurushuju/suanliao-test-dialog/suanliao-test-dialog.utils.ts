import {Formulas} from "@app/utils/calc";
import {CalcService} from "@services/calc.service";
import {matchHoutaiData} from "@views/suanliao/suanliao.utils";
import {算料公式} from "../xinghao-data";

export const filterSlgsList = async (slgsList: 算料公式[], vars: Formulas, calc: CalcService) => {
  const slgsList2: 算料公式[] = [];
  for (const slgs of slgsList) {
    const result = await matchHoutaiData(slgs, vars, calc);
    if (result.isMatched) {
      slgsList2.push(slgs);
    }
  }
  return slgsList2;
};
