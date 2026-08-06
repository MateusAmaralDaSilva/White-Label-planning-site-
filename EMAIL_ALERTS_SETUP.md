# Configuração de alertas por e-mail para containers Docker unhealthy

Este guia documenta como configurar o monitor de saúde do Docker para enviar alertas por e-mail para o Gmail (`silvaamaralmateus@gmail.com`).

> Eu não tenho acesso à sua senha de app do Gmail, então este arquivo usa um placeholder. Substitua pelo valor real da sua senha de app antes de usar.

## O que o monitor faz

O script [monitor-notify-unhealthy.sh](C:/Users/silva/Desktop/Projetos/White-Label-planning-site-.worktrees/oracle-always-free-vm-setup-guide/monitor-notify-unhealthy.sh) verifica se algum container Docker ficou com health `unhealthy` e envia um e-mail com o resumo.

## Pré-requisitos no host

Instale os utilitários necessários, se ainda não existirem:

```bash
sudo apt update
sudo apt install -y mailutils python3 curl
```

No Ubuntu, o `mailutils` costuma fornecer `sendmail`. Se preferir usar SMTP direto, o script também usa Python 3 embutido e não precisa de outros pacotes.

## 1. Copiar os arquivos para o host

Na VM, execute:

```bash
sudo cp /caminho/do/repositorio/monitor-notify-unhealthy.sh /usr/local/bin/monitor-notify-unhealthy.sh
sudo chmod +x /usr/local/bin/monitor-notify-unhealthy.sh
sudo cp /caminho/do/repositorio/monitor-notify.service /etc/systemd/system/monitor-notify.service
sudo cp /caminho/do/repositorio/monitor-notify.timer /etc/systemd/system/monitor-notify.timer
sudo systemctl daemon-reload
```

## 2. Configurar o e-mail do Gmail

Crie uma senha de app do Gmail no seu Google Account e então crie o arquivo de ambiente do systemd:

```bash
sudo mkdir -p /etc/default
sudo tee /etc/default/monitor-notify >/dev/null <<'EOF'
NOTIFY_TO=silvaamaralmateus@gmail.com
NOTIFY_FROM=silvaamaralmateus@gmail.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=silvaamaralmateus@gmail.com
SMTP_PASS=SUA_SENHA_DE_APP_DO_GMAIL
SMTP_SECURE=true
EOF
```

### Nota importante

- Use uma senha de app do Gmail, não a senha normal da conta.
- Se a sua conta usa autenticação em duas etapas, a senha de app é o caminho correto.
- O arquivo `/etc/default/monitor-notify` não deve ser commitado no repositório; ele é específico da VM.

## 3. Habilitar o timer

```bash
sudo systemctl enable --now monitor-notify.timer
```

O timer roda a cada minuto.

## 4. Testar manualmente

```bash
sudo systemctl start monitor-notify.service
```

Ou, para testar sem depender do systemd:

```bash
sudo /usr/local/bin/monitor-notify-unhealthy.sh
```

## 5. Verificar logs

```bash
sudo journalctl -u monitor-notify.service -f
```

## 6. Troubleshooting

### E-mail não chegou

Verifique:

```bash
sudo journalctl -u monitor-notify.service --no-pager
```

Possíveis causas:

- senha de app incorreta
- Gmail bloqueando o login SMTP por conta da política do seu Google Account
- firewall/porta de saída bloqueando SMTP
- `SMTP_SECURE=true` não funciona para o provedor; nesse caso, teste `SMTP_SECURE=false`

### O script não encontra containers unhealthy

Isso é normal se tudo estiver saudável. O script só manda e-mail quando algum container estiver unhealthy.

## 7. Segurança recomendada

- Não deixe a senha em texto puro no repositório.
- Se quiser um nível extra de segurança, use um segredo do sistema (por exemplo, via `systemd` drop-in ou um gerenciador de segredos do host).
- Se você precisar de alertas por outros canais (Slack, Telegram, WhatsApp), posso adaptar o script para isso depois.
