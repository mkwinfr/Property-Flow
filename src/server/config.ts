import path from "node:path";

export const config = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  databaseProvider: (process.env.PROPERTY_SUITE_DATABASE_PROVIDER ?? "sqlite") as "sqlite" | "postgresql",
  databasePath:
    process.env.PROPERTY_SUITE_DATABASE_PATH ?? path.join(process.cwd(), ".data", "property-suite.db"),
  databaseUrl: process.env.PROPERTY_SUITE_DATABASE_URL ?? "",
  attachmentsPath:
    process.env.PROPERTY_SUITE_ATTACHMENTS_PATH ?? path.join(process.cwd(), ".data", "attachments"),
  sessionDays: Number(process.env.PROPERTY_SUITE_SESSION_DAYS ?? 7),
  ollamaUrl: process.env.PROPERTY_SUITE_OLLAMA_URL ?? "http://127.0.0.1:11434",
  ollamaModel: process.env.PROPERTY_SUITE_OLLAMA_MODEL ?? "qwen3:8b",
  ssoEnabled: process.env.PROPERTY_SUITE_SSO_ENABLED === "true",
  ssoIssuer: process.env.PROPERTY_SUITE_SSO_ISSUER ?? "",
  ssoClientId: process.env.PROPERTY_SUITE_SSO_CLIENT_ID ?? "",
  ssoClientSecret: process.env.PROPERTY_SUITE_SSO_CLIENT_SECRET ?? "",
  ssoRedirectUri: process.env.PROPERTY_SUITE_SSO_REDIRECT_URI ?? "",
};
