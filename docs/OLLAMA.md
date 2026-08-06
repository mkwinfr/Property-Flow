# Local assistant with Ollama

Property Suite's assistant is read-only and permission-aware. The server gathers only the records the signed-in user can access, then sends that context to a local Ollama instance.

## Server setup

1. Install Ollama for Windows from the official installer. The installer does not require administrator rights.
2. Start Ollama and download the configured model:

```powershell
ollama pull qwen3:8b
```

3. Leave Ollama running on its local API at `http://127.0.0.1:11434`.

Property Suite uses these optional environment variables:

- `PROPERTY_SUITE_OLLAMA_URL` — defaults to `http://127.0.0.1:11434`.
- `PROPERTY_SUITE_OLLAMA_MODEL` — defaults to `qwen3:8b`.

If Ollama is unavailable, the rest of Property Suite continues to work and the assistant reports that it is unavailable. The assistant does not make changes to records or send messages.

Model files can require substantial disk space. Confirm available storage and expected response speed on the production server before downloading larger models.
