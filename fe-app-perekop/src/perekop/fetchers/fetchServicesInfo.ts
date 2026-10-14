import { PerekopShellMethods } from '../methods';
import { store } from '../services';

export async function fetchServicesInfo() {
  const [perekop, xray] = await Promise.all([
    PerekopShellMethods.getStatus(),
    PerekopShellMethods.getXrayStatus(),
  ]);

  if (!perekop.success || !xray.success) {
    store.set({
      servicesInfoWidget: {
        loading: false,
        failed: true,
        data: { xray: 0, perekop: 0 },
      },
    });
  }

  if (perekop.success && xray.success) {
    store.set({
      servicesInfoWidget: {
        loading: false,
        failed: false,
        data: { xray: xray.data.running, perekop: perekop.data.enabled },
      },
    });
  }
}
