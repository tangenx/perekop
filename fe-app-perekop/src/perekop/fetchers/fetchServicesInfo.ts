import { PerekopShellMethods } from '../methods';
import { store } from '../services';

export async function fetchServicesInfo() {
  const [perekop, singbox] = await Promise.all([
    PerekopShellMethods.getStatus(),
    PerekopShellMethods.getSingBoxStatus(),
  ]);

  if (!perekop.success || !singbox.success) {
    store.set({
      servicesInfoWidget: {
        loading: false,
        failed: true,
        data: { singbox: 0, perekop: 0 },
      },
    });
  }

  if (perekop.success && singbox.success) {
    store.set({
      servicesInfoWidget: {
        loading: false,
        failed: false,
        data: { singbox: singbox.data.running, perekop: perekop.data.enabled },
      },
    });
  }
}
