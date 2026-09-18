type Env = Record<string, string | undefined>;

export const REQUIRED_PUBLIC_ENV: string[];
export function findPublicEnvSecrets(env: Env): string[];
export function assertNoSecretsInPublicEnv(env: Env): void;
export function isDeployBuild(env: Env): boolean;
export function missingRequiredPublicEnv(env: Env): string[];
/** Throws for a deployable build without the settings; returns a warning for a shell build. */
export function assertPublicEnvForTarget(env: Env): string | null;
