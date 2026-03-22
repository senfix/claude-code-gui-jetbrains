import { execFileSync, type ChildProcess } from 'child_process';
import { Claude } from '../claude';

export interface SlashCommandInfo {
  name: string;
  description: string;
  argumentHint: string;
}

export interface ControlResponse<T> {
  type: 'control_response';
  response: {
    subtype: 'success';
    request_id: string;
    response: T;
  };
}

export interface CliInitResponse {
  commands: SlashCommandInfo[];
  agents: AgentInfo[];
  output_style: string;
  available_output_styles: string[];
  models: ModelInfo[];
  account: AccountInfo;
  pid: number;
}

export interface AgentInfo {
  name: string;
  description: string;
  model?: string;
}

export interface ModelInfo {
  value: string;
  displayName: string;
  description: string;
  supportsEffort?: boolean;
  supportedEffortLevels?: string[];
  supportsAdaptiveThinking?: boolean;
  supportsFastMode?: boolean;
  supportsAutoMode?: boolean;
}

export interface AccountInfo {
  email: string;
  subscriptionType: string;
}

export type CliConfigControlResponse = ControlResponse<CliInitResponse>;

/**
 * Parse CLI stdout to find the control_response event and return it as-is.
 * Returns null if no control_response is found.
 */
export function parseCliConfigResponse(stdout: string): CliConfigControlResponse | null {
  const lines = stdout.split('\n');

  let cliConfigResponse: CliConfigControlResponse | null = null;

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    let event: Record<string, unknown>;
    try {
      event = JSON.parse(trimmed);
    } catch {
      return;
    }

    if (event.type === 'control_response') {
      cliConfigResponse = event as unknown as CliConfigControlResponse;
    }
  })

  return cliConfigResponse;
}

// Singleton: cache result + dedup concurrent requests
let cachedConfig: CliConfigControlResponse | null = null;
let pendingPromise: Promise<CliConfigControlResponse | null> | null = null;

/**
 * Spawn a config-only CLI process to load CLI config.
 * Sends an `initialize` control_request to get control_response.
 * Results are cached — subsequent calls return the cached result immediately.
 */
export async function loadCliConfig(workingDir: string): Promise<CliConfigControlResponse | null> {
  if (cachedConfig) {
    console.error('[loadCliConfig] returning cached config');
    return cachedConfig;
  }
  if (pendingPromise) {
    console.error('[loadCliConfig] dedup — waiting for pending request');
    return pendingPromise;
  }
  pendingPromise = loadCliConfigInternal(workingDir);
  try {
    const config = await pendingPromise;
    if (config) cachedConfig = config;
    return config;
  } finally {
    pendingPromise = null;
  }
}

function killProcess(proc: ChildProcess): void {
  if (!proc.pid) return;
  if (process.platform === 'win32') {
    try {
      execFileSync('taskkill', ['/F', '/T', '/PID', String(proc.pid)]);
    } catch {
      proc.kill();
    }
  } else {
    proc.kill('SIGTERM');
  }
}

function loadCliConfigInternal(workingDir: string): Promise<CliConfigControlResponse | null> {
  return new Promise((resolve) => {
    let resolved = false;
    const safeResolve = (value: CliConfigControlResponse | null): void => {
      if (resolved) return;
      resolved = true;
      resolve(value);
    };
    const args = [
      '-p',
      '--output-format', 'stream-json',
      '--input-format', 'stream-json',
      '--verbose',
      '--permission-mode', 'default',
    ];

    const proc = Claude.spawn(args, {
      cwd: workingDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        TERM: 'dumb',
        CI: 'true',
        CLAUDECODE: undefined,
      },
    });

    let stdout = '';

    proc.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString();

      const config = parseCliConfigResponse(stdout);
      if (!config) return;

      console.error('[loadCliConfig] resolved from stdout');
      killProcess(proc);
      safeResolve(config);
    });

    // Send initialize control_request to trigger system/init + control_response
    proc.on('spawn', () => {
      const initReq = JSON.stringify({
        type: 'control_request',
        request_id: 'config_init',
        request: { subtype: 'initialize' },
      }) + '\n';
      proc.stdin?.write(initReq);
    });

    proc.stderr?.on('data', (data: Buffer) => {
      console.error('[loadCliConfig] stderr:', data.toString().substring(0, 300));
    });

    proc.on('error', (err) => {
      console.error('[loadCliConfig] spawn error:', err);
      safeResolve(null);
    });

    proc.on('close', (code) => {
      console.error('[loadCliConfig] process closed with code:', code, 'stdout length:', stdout.length);
      const config = parseCliConfigResponse(stdout);
      console.error('[loadCliConfig] close fallback:', config ? 'found' : 'null');
      safeResolve(config);
    });

    // Safety timeout — kill process but let close event handle resolve
    setTimeout(() => {
      console.error('[loadCliConfig] timeout — killing process');
      killProcess(proc);
    }, 15000);
  });
}
