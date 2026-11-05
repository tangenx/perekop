---
layout: default
title: Диагностика
---

# Диагностика

## Сайты детектят прокси

1. Включите **Block IPv6** (по умолчанию включено)
2. Включите **Block WebRTC** (по умолчанию включено)
3. Отключите QUIC: `disable_quic=1`
4. Отключите WebRTC в браузере (Firefox: `media.peerconnection.enabled = false`)
5. Отключите DoH/DoT в браузере
6. Проверьте IP-репутацию выходного узла

## Высокое потребление памяти

- Отключите **Enable Traffic Statistics** → снижает потребление ~вдвое (~40 МБ вместо ~80)
- Уменьшите количество proxy-ссылок
- Уберите лишние community-списки и домены
- GOMEMLIMIT уже установлен на 10 MiB (значение выше вызывает OOM на роутерах с 256 МБ ОЗУ: при 25 MiB куча Xray раздувается до ~120 МБ)
- Watchdog: каждые `xray_watchdog_interval` минут (по умолчанию 30) cron проверяет heap Xray (`xray api statssys`, fallback — VmRSS) и рестартит только сервис xray, если память достигла порога (по умолчанию 50% ОЗУ, clamp 40–80 МБ). Отключается через `xray_watchdog=0` в настройках.

## ERR_CONNECTION_CLOSED

Обычно вызвано QUIC-блокировкой. Теперь QUIC отбрасывается на уровне nft (до tproxy),
браузер корректно откатывается на TCP. Если проблема остаётся:
- Проверьте, что `disable_quic=1`
- Очистите кэш браузера
- Попробуйте другой браузер

## Проверка конфигурации

В LuCI → Services → Perekop → Diagnostics есть кнопки проверки:
- DNS availability
- FakeIP
- nft rules
- Xray status
