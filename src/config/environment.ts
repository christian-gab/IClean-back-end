export function getEnvironmentFilePath(nodeEnv: string): string {
  return `.env.${nodeEnv}`
}
