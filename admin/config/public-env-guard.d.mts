export function findPublicEnvSecrets(env: Record<string, string | undefined>): string[];
export function assertNoSecretsInPublicEnv(env: Record<string, string | undefined>): void;
