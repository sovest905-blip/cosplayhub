# GPU-сервер с LLM: Ansible + vLLM

Плейбук превращает чистый Ubuntu 22.04/24.04 с GPU NVIDIA в сервер с
OpenAI-совместимым API (vLLM), закрытым TLS, ключом и rate-limit'ом.

```
Интернет ──443/TLS──> nginx ──(сеть compose)──> vLLM ──> GPU
                       │  только /v1/*, 429 при флуде     (порт наружу не публикуется)
                       └─ ключ проверяет vLLM (Bearer)
dcgm-exporter: 127.0.0.1:9400 (метрики GPU, наружу не торчат)
```

## Что делает

| Роль | Действия |
|---|---|
| `base` | UFW (deny-all, открыты только SSH и 443), fail2ban, SSH без паролей и root-логина |
| `nvidia` | драйвер `nvidia-driver-570-server`, перезагрузка при первой установке, проверка `nvidia-smi` |
| `docker` | Docker CE из официального репо, NVIDIA Container Toolkit, ротация логов, тест GPU внутри контейнера |
| `llm_stack` | compose: vLLM + nginx + dcgm-exporter, `restart: unless-stopped`, healthcheck, smoke-тесты |

Автозапуск: Docker включён в systemd, контейнеры с `restart: unless-stopped` —
после ребута всё поднимается само. Проверка работоспособности: healthcheck
контейнера + в конце плейбука тесты (401 без ключа, 404 на `/metrics`, реальный запрос к модели).

## Быстрый старт

Требуется на управляющей машине: `ansible-core >= 2.16`, SSH-доступ к серверу
(пользователь с `sudo`, вход по ключу).

```bash
cd infra/gpu-llm
ansible-galaxy collection install -r requirements.yml

cp inventory.example.ini inventory.ini          # впишите IP/пользователя
cp group_vars/gpu_llm/vault.yml.example group_vars/gpu_llm/vault.yml
openssl rand -hex 32                             # → vault_llm_api_key в vault.yml
ansible-vault encrypt group_vars/gpu_llm/vault.yml

# Настройте group_vars/gpu_llm/vars.yml (модель, admin_cidrs, api_allowed_cidrs, домен/сертификат)
ansible-playbook site.yml --ask-vault-pass --check --diff   # сухой прогон (часть задач в check-режиме не пройдёт — это норма)
ansible-playbook site.yml --ask-vault-pass
```

Первый запуск долгий: драйвер + ребут + скачивание образа и весов модели (10–30 мин).
Повторный запуск идемпотентен. Отдельные части: `--tags nvidia`, `--tags stack`.

## Пример запроса

```bash
curl -k https://<IP>/v1/chat/completions \
  -H "Authorization: Bearer $API_KEY" -H "Content-Type: application/json" \
  -d '{"model":"qwen2.5-7b-instruct","messages":[{"role":"user","content":"Привет!"}],"max_tokens":64}'
```
`-k` только для самоподписанного сертификата. Совместим с OpenAI SDK:
`OpenAI(base_url="https://<IP>/v1", api_key=API_KEY)`. Есть `scripts/example_request.sh`.

## Проверка вручную

```bash
nvidia-smi                                          # драйвер видит GPU
docker run --rm --gpus all nvidia/cuda:12.4.1-base-ubuntu22.04 nvidia-smi
cd /opt/llm-stack && docker compose ps              # vllm = healthy
docker compose logs -f vllm                         # прогресс загрузки модели
curl -s localhost:9400/metrics | grep DCGM_FI_DEV_GPU_UTIL
```
Без GPU: `ansible-playbook site.yml --syntax-check` и `ansible-lint site.yml`
(оба проходят; реальный запуск требует сервера с GPU).

## Безопасность

Уже сделано: порт vLLM не публикуется; наружу только `/v1/*`; Bearer-ключ; TLS 1.2+;
rate-limit; UFW; fail2ban; SSH без паролей; секреты в ansible-vault и в `llm.env` (0600);
фиксированные версии образов; nginx в контейнере с `read_only`, `cap_drop: ALL`.

Нужно сделать вам:
1. **Не открывайте API всему интернету**, если не нужно: `api_allowed_cidrs` или VPN/WireGuard/Tailscale.
2. Используйте настоящий сертификат (`tls_cert_file`/`tls_key_file`, Let's Encrypt) — самоподписанный подвержен MITM.
3. **Docker обходит UFW** для опубликованных портов: публикуется только 443 (намеренно). Не добавляйте другие `ports:` без `127.0.0.1:`.
4. Одним общим ключом не обойтись при нескольких клиентах: для per-user ключей, квот и аудита поставьте перед vLLM шлюз (LiteLLM / Kong / Envoy).
5. Перед `ssh_harden: true` убедитесь, что вход по ключу работает; держите вторую открытую SSH-сессию.
6. Модель с Hugging Face скачивается как код+веса: берите проверенные источники, для gated-моделей задайте `vault_hf_token`.
7. Обновления: образы закреплены — обновляйте осознанно. Ядро/драйвер: после `apt upgrade` ядра нужен ребут и повторный прогон `--tags nvidia`.

## Мониторинг

`dcgm-exporter` отдаёт метрики GPU (загрузка, память, температура, ECC) на `127.0.0.1:9400`.
Подключайте Prometheus через SSH-туннель/агент (Grafana-дашборд NVIDIA DCGM, ID 12239).
Метрики vLLM (`/metrics`, очередь запросов, токены/с) снаружи закрыты nginx'ом — читайте
из docker-сети или добавьте отдельный scrape. Алерты: GPU temp > 85 °C, память > 95 %, контейнер unhealthy.

## Подбор модели

Память GPU ≈ параметры × байты на вес (7B в fp16 ≈ 15 ГБ) + KV-кэш. Не влезает — квантизация
(`llm_extra_args: ["--quantization","awq"]` с AWQ-моделью) или `llm_tensor_parallel_size: N` на N GPU.
Лицензию модели проверьте для вашего использования.

## Ограничения

Плейбук проверен на синтаксис и `ansible-lint` (профиль production) и отрисовку шаблонов;
на реальном GPU-сервере в этой среде не запускался — первый прогон делайте на тестовой машине.
Версии образов (`vllm_image`, `dcgm_exporter_image`) проверьте на актуальность и существование тега.
