# Launcher and Cloudflare follow-up

The reference launcher supervises the frontend, backend, webhook receiver, and Cloudflare tunnel from `Launcher V2/config.json`. The frontend also contains production host assumptions for `tech.propertysuite.net` and `api.propertysuite.net`.

Do not reuse the old configuration blindly. Before reconnecting the tunnel:

- Identify whether the existing tunnel routes one hostname or separate frontend/API hostnames.
- Preserve tunnel identity credentials outside source control.
- Decide whether the rebuilt API will serve the compiled frontend from one origin. This is the recommended production shape and removes CORS and dual-service routing complexity.
- Add forwarded-header and secure-cookie tests behind Cloudflare.
- Replace unauthenticated Git webhook behavior or keep it isolated from the public tunnel.
- Update Launcher V2 only after production start/stop and health-check commands are stable.

The hostname and tunnel can usually be preserved, but compatibility depends on the current ingress rules and credentials, not merely on reusing visible labels in the launcher.
