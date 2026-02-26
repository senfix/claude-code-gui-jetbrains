import { spawn } from 'child_process';
import type { WebSocket } from 'ws';
import { sessionRegistry } from '../registries';
import { broadcastToSession } from './broadcastToSession';
import { subscribeToSession } from './subscribeToSession';
import { log, error, yellow, blue, green, bold, label } from '../log';

// InputMode -> CLI --permission-mode flag mapping
const INPUT_MODE_TO_CLI_FLAG: Record<string, string> = {
  plan: 'plan',
  bypass: 'bypassPermissions',
  ask_before_edit: 'default',
  auto_edit: 'acceptEdits',
};

export function startClaudeProcess(ws: WebSocket, content: string, workingDir: string, targetSessionId: string, isNewSession: boolean, inputMode: string) {
  // 동일 세션의 기존 프로세스 kill (같은 세션에 새 메시지 전송 시)
  const existingSession = sessionRegistry.get(targetSessionId);
  if (existingSession?.process) {
    log(`Killing existing process for session ${targetSessionId}`);
    existingSession.process.kill('SIGTERM');
    existingSession.process = null;
  }

  log(label('Starting Claude CLI process...'));
  log(label('Working directory:'), green(workingDir));
  log(label('Message:'), bold(yellow(content)));

  // ws를 이 세션에 구독
  subscribeToSession(ws, targetSessionId);

  let args: string[];
  if (isNewSession) {
    log(label('New session:'), green(targetSessionId));
    args = [
      '--print',
      '--output-format', 'stream-json',
      '--verbose',
      '--include-partial-messages',
      '--session-id', targetSessionId,
      '--',
      content
    ];
  } else {
    log(label('Resuming session:'), green(targetSessionId));
    args = [
      '--print',
      '--output-format', 'stream-json',
      '--verbose',
      '--include-partial-messages',
      '--resume', targetSessionId,
      '--',
      content
    ];
  }
  // Add --permission-mode flag
  const cliFlag = INPUT_MODE_TO_CLI_FLAG[inputMode];
  if (cliFlag) {
    const separatorIndex = args.indexOf('--');
    if (separatorIndex !== -1) {
      args.splice(separatorIndex, 0, '--permission-mode', cliFlag);
    } else {
      args.push('--permission-mode', cliFlag);
    }
  }
  {
    const sepIdx = args.indexOf('--');
    const flagsStr = (sepIdx !== -1 ? args.slice(0, sepIdx) : args).join(' ');
    const queryStr = sepIdx !== -1 ? args.slice(sepIdx + 1).join(' ') : '';
    log(label('Command Exec'), bold(yellow(`$ claude ${flagsStr}${queryStr ? ` -- ${queryStr}` : ''}`)));
  }

  const proc = spawn('claude', args, {
    cwd: workingDir,
    shell: false,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      // Claude CLI가 터미널이 아닌 환경에서 실행됨을 알림
      TERM: 'dumb',
      CI: 'true',
      PATH: process.env.PATH,
      // 중첩 세션 감지 방지: 현재 세션의 CLAUDECODE 변수를 제거
      CLAUDECODE: undefined,
    }
  });

  console.log('========================');
  log('Claude CLI spawned with PID:', proc.pid);
  log('stdout exists:', !!proc.stdout);
  log('stderr exists:', !!proc.stderr);

  // SessionRecord 갱신
  const sessionRecord = sessionRegistry.get(targetSessionId)!;
  sessionRecord.process = proc;
  sessionRecord.buffer = '';
  sessionRecord.workingDir = workingDir;

  // Close stdin immediately to signal no more input
  proc.stdin?.end();
  log('stdin closed');

  proc.on('spawn', () => {
    log('Process spawned successfully');
    console.log('========================');
  });

  // 모든 구독자에게 스트림 시작 알림
  broadcastToSession(targetSessionId, 'STREAM_START');

  proc.stdout?.on('data', (data: Buffer) => {
    const chunk = data.toString();
    console.log('\n');
    log(yellow('RAW stdout:'), blue(chunk.trimEnd()));

    const sr = sessionRegistry.get(targetSessionId);
    if (!sr) return; // 세션이 이미 정리됨
    sr.buffer += chunk;

    const lines = sr.buffer.split('\n');
    sr.buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const event = JSON.parse(line);
        log('JSON event type:', event.type);
        handleStreamEvent(targetSessionId, event);
      } catch {
        log('Non-JSON output (unexpected in stream-json mode):', line);
      }
    }
  });

  proc.stderr?.on('data', (data: Buffer) => {
    const stderrChunk = data.toString();
    error('Claude CLI stderr:', stderrChunk);
    // stream-json 모드에서는 stderr를 로그만 남기고 UI에는 전송하지 않음
  });

  proc.on('close', (code) => {
    log('Claude CLI process exited with code:', code);

    const sr = sessionRegistry.get(targetSessionId);
    // 남은 버퍼 처리
    if (sr?.buffer.trim()) {
      try {
        const event = JSON.parse(sr.buffer);
        handleStreamEvent(targetSessionId, event);
      } catch {
        log('Remaining buffer (non-JSON):', sr.buffer);
      }
      sr.buffer = '';
    }

    broadcastToSession(targetSessionId, 'STREAM_END');

    // 프로세스 참조만 해제 (세션 레코드는 유지 — 구독자가 아직 있을 수 있음)
    if (sr) {
      sr.process = null;
    }
  });

  proc.on('error', (err) => {
    error('Failed to start Claude CLI:', err);
    broadcastToSession(targetSessionId, 'SERVICE_ERROR', { error: err.message });
    broadcastToSession(targetSessionId, 'STREAM_END');

    const sr = sessionRegistry.get(targetSessionId);
    if (sr) {
      sr.process = null;
    }
  });
}

function handleStreamEvent(targetSessionId: string, event: Record<string, unknown>) {
  // Claude CLI --output-format stream-json 이벤트 처리
  // CLI 출력 타입: system, stream_event, assistant, result

  const eventType = event.type as string;

  switch (eventType) {
    case 'system':
      // 세션 초기화 이벤트
      broadcastToSession(targetSessionId, 'STREAM_EVENT', {
        eventType: 'system',
        subtype: event.subtype,
        sessionId: event.session_id,
        cwd: event.cwd,
        model: event.model,
      });
      break;

    case 'stream_event': {
      // Anthropic API 이벤트를 래핑한 CLI 이벤트
      // 구조: { type: "stream_event", event: { type: "content_block_delta", ... } }
      const innerEvent = event.event as Record<string, unknown>;
      if (!innerEvent) {
        log('stream_event with no inner event, skipping');
        break;
      }

      const innerType = innerEvent.type as string;
      const deltaData: Record<string, unknown> = { event: innerType };

      if (innerEvent.index !== undefined) {
        deltaData.index = innerEvent.index;
      }

      if (innerEvent.delta) {
        const delta = innerEvent.delta as Record<string, unknown>;
        const deltaType = delta.type as string;

        if (deltaType === 'text_delta') {
          deltaData.delta = { type: 'text_delta', text: delta.text };
        } else if (deltaType === 'tool_use_delta') {
          deltaData.delta = {
            type: 'tool_use_delta',
            id: delta.id,
            name: delta.name,
            input: delta.input,
          };
        } else if (deltaType === 'thinking_delta') {
          deltaData.delta = { type: 'thinking_delta', thinking: delta.thinking };
        } else {
          deltaData.delta = delta;
        }
      }

      if (innerEvent.message) {
        deltaData.message = innerEvent.message;
      }

      if (innerEvent.content_block) {
        deltaData.contentBlock = innerEvent.content_block;
      }

      broadcastToSession(targetSessionId, 'STREAM_EVENT', deltaData);
      break;
    }

    case 'assistant': {
      // 완성된 어시스턴트 메시지
      const message = event.message as Record<string, unknown> | undefined;
      broadcastToSession(targetSessionId, 'ASSISTANT_MESSAGE', {
        messageId: message?.id,
        content: message?.content || [],
      });
      break;
    }

    case 'result': {
      // 완료 결과
      const errorField = event.error as Record<string, unknown> | undefined;
      broadcastToSession(targetSessionId, 'RESULT_MESSAGE', {
        status: event.subtype || event.status || 'unknown',
        isError: event.is_error || false,
        result: event.result || null,
        sessionId: event.session_id || null,
        error: errorField
          ? {
              code: errorField.code,
              message: errorField.message,
              details: errorField.details,
            }
          : null,
      });
      break;
    }

    default:
      log('Unknown CLI event type:', eventType, event);
      break;
  }
}
