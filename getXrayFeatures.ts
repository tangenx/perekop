import { PerekopShellMethods } from '../shell';

export async function getXrayFeatures(): Promise<string[]> {
  const { data, success } = await PerekopShellMethods.getXrayFeatures();

  return success && Array.isArray(data) ? data : [];
}
