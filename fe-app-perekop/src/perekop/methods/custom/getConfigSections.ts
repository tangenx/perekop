import { Perekop } from '../../types';

export async function getConfigSections(): Promise<Perekop.ConfigSection[]> {
  return uci.load('perekop').then(() => uci.sections('perekop'));
}
