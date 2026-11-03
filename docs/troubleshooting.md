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
- GOMEMLIMIT уже установлен на 25 MiB

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
