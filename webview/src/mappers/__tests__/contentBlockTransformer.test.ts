import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { transformContentBlocks } from '../contentBlockTransformer';
import {
  TextBlockDto,
  ToolUseBlockDto,
  ToolResultBlockDto,
  ImageBlockDto,
  ThinkingBlockDto,
} from '../../dto/message/ContentBlockDto';

describe('contentBlockTransformer', () => {
  describe('transformContentBlocks()', () => {
    it('should convert string content to single TextBlockDto', () => {
      const result = transformContentBlocks('Hello world');
      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(TextBlockDto);
      expect((result[0] as TextBlockDto).text).toBe('Hello world');
    });

    it('should return empty array for null', () => {
      expect(transformContentBlocks(null)).toEqual([]);
    });

    it('should return empty array for undefined', () => {
      expect(transformContentBlocks(undefined)).toEqual([]);
    });

    it('should return empty array for non-array non-string', () => {
      expect(transformContentBlocks(42)).toEqual([]);
    });

    it('should return empty array for empty array', () => {
      expect(transformContentBlocks([])).toEqual([]);
    });

    it('should transform text block', () => {
      const result = transformContentBlocks([
        { type: 'text', text: 'Hello' },
      ]);
      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(TextBlockDto);
      expect((result[0] as TextBlockDto).text).toBe('Hello');
    });

    it('should transform tool_use block', () => {
      const result = transformContentBlocks([
        {
          type: 'tool_use',
          id: 'tool_1',
          name: 'bash',
          input: { command: 'ls' },
        },
      ]);
      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(ToolUseBlockDto);
      const toolUse = result[0] as ToolUseBlockDto;
      expect(toolUse.name).toBe('bash');
      expect(toolUse.input).toEqual({ command: 'ls' });
    });

    it('should transform tool_result block with string content', () => {
      const result = transformContentBlocks([
        {
          type: 'tool_result',
          tool_use_id: 'tool_1',
          content: 'file.txt\ndir/',
        },
      ]);
      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(ToolResultBlockDto);
    });

    it('should transform tool_result block with array content (recursive)', () => {
      const result = transformContentBlocks([
        {
          type: 'tool_result',
          tool_use_id: 'tool_1',
          content: [{ type: 'text', text: 'nested result' }],
        },
      ]);
      expect(result).toHaveLength(1);
      const toolResult = result[0] as ToolResultBlockDto;
      expect(toolResult).toBeInstanceOf(ToolResultBlockDto);
      expect(Array.isArray(toolResult.content)).toBe(true);
      expect((toolResult.content as TextBlockDto[])[0]).toBeInstanceOf(TextBlockDto);
    });

    it('should transform image block', () => {
      const result = transformContentBlocks([
        {
          type: 'image',
          source: { type: 'base64', media_type: 'image/png', data: 'abc123' },
        },
      ]);
      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(ImageBlockDto);
    });

    it('should transform thinking block', () => {
      const result = transformContentBlocks([
        {
          type: 'thinking',
          thinking: 'Let me analyze this...',
          signature: 'sig123',
        },
      ]);
      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(ThinkingBlockDto);
      expect((result[0] as ThinkingBlockDto).thinking).toBe('Let me analyze this...');
    });

    it('should handle unknown block type as TextBlockDto with stringified content', () => {
      const result = transformContentBlocks([
        { type: 'custom_unknown', data: 'test' },
      ]);
      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(TextBlockDto);
    });

    it('should handle non-object block as TextBlockDto', () => {
      const result = transformContentBlocks([42]);
      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(TextBlockDto);
      expect((result[0] as TextBlockDto).text).toBe('42');
    });

    it('should transform multiple mixed blocks', () => {
      const result = transformContentBlocks([
        { type: 'text', text: 'Before tool' },
        { type: 'tool_use', id: 't1', name: 'bash', input: {} },
        { type: 'text', text: 'After tool' },
      ]);
      expect(result).toHaveLength(3);
      expect(result[0]).toBeInstanceOf(TextBlockDto);
      expect(result[1]).toBeInstanceOf(ToolUseBlockDto);
      expect(result[2]).toBeInstanceOf(TextBlockDto);
    });
  });
});
