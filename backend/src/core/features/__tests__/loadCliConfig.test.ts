import { describe, it, expect } from 'vitest';
import { parseCliConfigResponse } from '../loadCliConfig';

describe('loadCliConfig', () => {
  describe('parseCliConfigResponse', () => {
    it('should return control_response as-is', () => {
      const controlResponse = {
        type: 'control_response',
        response: {
          subtype: 'success',
          request_id: 'init_1',
          response: {
            commands: [
              { name: 'compact', description: 'Compact conversation history', argumentHint: '' },
              { name: 'debug', description: 'Enable debug logging', argumentHint: '[issue]' },
            ],
            agents: [],
            output_style: 'default',
            available_output_styles: ['default'],
            models: [],
            account: { email: 'test@test.com', subscriptionType: 'Pro' },
            pid: 12345,
          },
        },
      };
      const stdout = JSON.stringify(controlResponse) + '\n';
      const result = parseCliConfigResponse(stdout);
      expect(result).toEqual(controlResponse);
    });

    it('should find control_response among other events', () => {
      const lines = [
        '{"type":"system","subtype":"hook_started","hook_id":"abc"}',
        '{"type":"control_response","response":{"subtype":"success","request_id":"config_init","response":{"commands":[{"name":"debug","description":"Enable debug logging","argumentHint":"[issue]"}],"agents":[],"output_style":"default","available_output_styles":[],"models":[],"account":{"email":"a@b.com","subscriptionType":"Free"},"pid":1}}}',
      ];
      const stdout = lines.join('\n') + '\n';
      const result = parseCliConfigResponse(stdout);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('control_response');
      expect(result!.response.response.commands).toHaveLength(1);
      expect(result!.response.response.commands[0].name).toBe('debug');
    });

    it('should return null when no control_response is found', () => {
      const stdout = '{"type":"system","subtype":"hook_started","hook_id":"abc"}\n';
      const result = parseCliConfigResponse(stdout);
      expect(result).toBeNull();
    });

    it('should handle empty stdout', () => {
      const result = parseCliConfigResponse('');
      expect(result).toBeNull();
    });

    it('should skip malformed JSON lines gracefully', () => {
      const controlResponse = {
        type: 'control_response',
        response: {
          subtype: 'success',
          request_id: 'init_1',
          response: {
            commands: [{ name: 'foo', description: '', argumentHint: '' }],
            agents: [],
            output_style: 'default',
            available_output_styles: [],
            models: [],
            account: { email: '', subscriptionType: '' },
            pid: 0,
          },
        },
      };
      const lines = [
        'not valid json',
        JSON.stringify(controlResponse),
      ];
      const stdout = lines.join('\n') + '\n';
      const result = parseCliConfigResponse(stdout);
      expect(result).toEqual(controlResponse);
    });
  });
});
