---
layout: default
title: Установка
---

# Установка

## Системные требования

- OpenWrt 24.10 или выше
- Минимум 25 МБ свободного места
- Устройства с флеш-памятью 16 МБ не поддерживаются

## Установка

```sh
sh -c "$(wget -O - https://raw.githubusercontent.com/tangenx/perekop/main/install.sh)" -- --xray-latest
```

Флаг `--xray-latest` устанавливает свежий бинарник Xray (нужен для Hysteria2, Xray >= 26.1.13).

## После установки

1. Очистите кэш LuCI в браузере
2. Проверьте конфигурацию в LuCI → Services → Perekop
3. Убедитесь, что Dnsmasq настроен корректно

## Обновление

```sh
sh -c "$(wget -O - https://raw.githubusercontent.com/tangenx/perekop/main/install.sh)" -- --xray-latest
```
