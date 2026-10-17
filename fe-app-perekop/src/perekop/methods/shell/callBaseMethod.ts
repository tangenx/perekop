import { executeShellCommand } from '../../../helpers';
import { Perekop } from '../../types';

export async function callBaseMethod<T>(
  method: Perekop.AvailableMethods,
  args: string[] = [],
  command: string = '/usr/bin/perekop',
  timeout: number = 15000,
): Promise<Perekop.MethodResponse<T>> {
  const response = await executeShellCommand({
    command,
    args: [method as string, ...args],
    timeout,
  });

  if (response.stdout) {
    try {
      return {
        success: true,
        data: JSON.parse(response.stdout) as T,
      };
    } catch (_e) {
      return {
        success: true,
        data: response.stdout as T,
      };
    }
  }

  return {
    success: false,
    error: '',
  };
}
