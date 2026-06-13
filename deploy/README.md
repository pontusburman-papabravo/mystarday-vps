# Auto-deploy via GitHub webhook

This sets up **push-to-deploy**: when a commit lands on `main`, GitHub sends a
webhook to a small listener on the server, which pulls the new code and
restarts the app. It reuses the existing repo **deploy key** (server → GitHub
pull); nothing secret leaves the server.

Files:

- `webhook-deploy.js` — dependency-free HTTP listener; verifies the GitHub
  HMAC signature, then runs `deploy.sh` on push to `main`.
- `deploy.sh` — `git pull` + conditional `npm install` / `npm run migrate` +
  `systemctl restart`. Idempotent; derives the app dir from its own location.
- `webhook-deploy.service` — systemd unit template for the listener.

Placeholders used below: `<app-dir>` (the deploy checkout, e.g. the path your
app already lives in), `<service>` (the systemd service that runs the app),
and `<deploy-user>` (the unix user that owns the checkout).

## One-time server setup

Run as `<deploy-user>` in `<app-dir>`:

```bash
cd <app-dir>
git pull origin main          # get these deploy/ files
chmod +x deploy/deploy.sh deploy/webhook-deploy.js
```

### 1. Allow the listener to restart the service without a password

`deploy.sh` runs `sudo systemctl restart <service>`. Grant the deploy user
passwordless rights for just that command:

```bash
echo '<deploy-user> ALL=(root) NOPASSWD: /usr/bin/systemctl restart <service>' \
  | sudo tee /etc/sudoers.d/<service>-deploy
sudo chmod 440 /etc/sudoers.d/<service>-deploy
```

### 2. Pick a webhook secret

```bash
openssl rand -hex 32        # copy this value — used in both places below
```

### 3. Install and start the listener

Edit `deploy/webhook-deploy.service` to fill in `<app-dir>`, `<service>`, and
`<deploy-user>`, then:

```bash
sudo cp deploy/webhook-deploy.service /etc/systemd/system/<service>-webhook.service
# add the secret via a drop-in (keeps it out of git):
sudo systemctl edit <service>-webhook
#   [Service]
#   Environment=DEPLOY_WEBHOOK_SECRET=<the-secret-from-step-2>
sudo systemctl daemon-reload
sudo systemctl enable --now <service>-webhook
sudo systemctl status <service>-webhook --no-pager
```

### 4. Make the listener reachable from GitHub

The listener defaults to port **9001**. Either:

- **Open the port** so GitHub can POST directly:
  `http://<server-ip>:9001/deploy` (the HMAC signature secures it), or
- **Reverse-proxy** a TLS path through your existing web server (recommended),
  e.g. `https://<your-domain>/__deploy` → `http://127.0.0.1:9001/deploy`.

### 5. Add the webhook in GitHub

Repo → **Settings → Webhooks → Add webhook**:

- **Payload URL:** the URL from step 4
- **Content type:** `application/json`
- **Secret:** the value from step 2
- **Events:** "Just the push event"

GitHub sends a `ping` first — the listener replies `pong` (you should see a
green check in the webhook's "Recent Deliveries").

## Verify

Push any commit to `main` (or use **Redeliver** on the ping), then on the
server:

```bash
sudo journalctl -u <service>-webhook -n 40 --no-pager
```

You should see `[webhook] deploying <sha>`, the `deploy.sh` output, then
`[webhook] deploy complete`, and the app restarted on the new code.

## Notes

- The listener ignores pushes to any branch other than `main` and rejects
  requests with a missing/invalid signature (HTTP 401).
- Concurrent deploys are coalesced (a deploy already in progress is skipped).
- To deploy manually any time: `DEPLOY_SERVICE_NAME=<service> bash deploy/deploy.sh`.
