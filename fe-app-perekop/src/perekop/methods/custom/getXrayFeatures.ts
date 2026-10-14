import { PerekopShellMethods } from '../shell';

export async function getXrayFeatures(): Promise<string[]> {
  const response = await PerekopShellMethods.getXrayFeatures();
  return response.success && Array.isArray(response.data) ? response.data : [];
}
