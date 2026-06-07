export interface ServerConfig {
  socketPath: string;
  wsPort: number;
  natsUrl: string;
  dataDir: string;
  memoryPath: string;
  artifactsDir: string;
}
