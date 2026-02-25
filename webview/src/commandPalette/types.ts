import {
  PanelItemType,
  IconType,
} from '@/types/commandPalette';
import { SessionState } from '@/types';

/**
 * Services injected by CommandPaletteRegistry into commands.
 * Commands access current React state via getServices().
 */
export interface CommandPaletteServices {
  chatStream: {
    messages: any[];
    isStreaming: boolean;
    isStopped: boolean;
    input: string;
    setInput: (input: string) => void;
    sendMessage: (content: string) => void;
    stop: () => void;
    continue: () => void;
    clearMessages: () => void;
    resetStreamState: () => void;
  };
  session: {
    currentSessionId: string | null;
    sessionState: SessionState;
    setCurrentSessionId: (id: string | null) => void;
    setSessionState: (state: SessionState) => void;
  };
  adapter: {
    openNewTab: () => Promise<void>;
    openSettings: () => Promise<void>;
  };
}

/**
 * Base interface for all command palette items.
 * NOTE: No `section` field - section membership is determined by registerSection().
 */
export interface CommandPaletteCommand {
  readonly id: string;
  readonly label: string;
  readonly type: PanelItemType;
  readonly icon?: IconType;
  readonly secondaryLabel?: string;
  readonly disabled: boolean;
  readonly order?: number;

  execute(): Promise<void>;
  bindKeyboard?(e: KeyboardEvent): boolean;
}

/**
 * Abstract base class for slash commands (/clear, /init, /review, etc.)
 * NOTE: No `section` field.
 */
export abstract class SlashCommand implements CommandPaletteCommand {
  readonly type = PanelItemType.Command;
  readonly icon = IconType.Command;
  readonly disabled = false;
  readonly order?: number;

  abstract readonly id: string;
  abstract readonly label: string;
  abstract readonly description: string;

  /** Service accessor - injected by CommandPaletteRegistry */
  protected getServices!: () => CommandPaletteServices;

  /** @internal Called by CommandPaletteRegistry to inject service accessor */
  _bind(getServices: () => CommandPaletteServices): void {
    this.getServices = getServices;
  }

  abstract execute(): Promise<void>;
}

/**
 * A static panel item that may or may not be active.
 * Used for non-slash-command items in sections like Context, Model, Customize, Settings, Support.
 * NOTE: No `section` constructor parameter - section is determined by registerSection().
 */
export class StaticItem implements CommandPaletteCommand {
  readonly type = PanelItemType.Action;
  readonly disabled: boolean;
  readonly order?: number;

  private action?: () => Promise<void>;
  private serviceAction?: (services: CommandPaletteServices) => Promise<void>;
  private getServices?: () => CommandPaletteServices;

  constructor(
    readonly id: string,
    readonly label: string,
    options?: {
      icon?: IconType;
      secondaryLabel?: string;
      disabled?: boolean;
      order?: number;
      action?: () => Promise<void>;
      serviceAction?: (services: CommandPaletteServices) => Promise<void>;
    },
  ) {
    this.icon = options?.icon;
    this.secondaryLabel = options?.secondaryLabel;
    this.disabled = options?.disabled ?? true;
    this.order = options?.order;
    this.action = options?.action;
    this.serviceAction = options?.serviceAction;
  }

  readonly icon?: IconType;
  readonly secondaryLabel?: string;

  /** @internal Called by CommandPaletteRegistry to inject service accessor */
  _bind(getServices: () => CommandPaletteServices): void {
    this.getServices = getServices;
  }

  async execute(): Promise<void> {
    if (this.serviceAction && this.getServices) {
      await this.serviceAction(this.getServices());
    } else if (this.action) {
      await this.action();
    }
  }
}
