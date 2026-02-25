/**
 * Interface for keyboard binding entries.
 */
export interface KeyboardBinding {
  readonly id: string;
  match(e: KeyboardEvent): boolean;
  execute(): Promise<void>;
}

/**
 * Registry for keyboard shortcuts.
 * Dispatches keyboard events to registered bindings.
 */
export class KeyboardRegistry {
  private bindings = new Map<string, KeyboardBinding>();

  /** Register a keyboard binding */
  register(binding: KeyboardBinding): void {
    this.bindings.set(binding.id, binding);
  }

  /** Unregister a keyboard binding by id */
  unregister(id: string): void {
    this.bindings.delete(id);
  }

  /**
   * Handle a keyboard event by checking all registered bindings.
   * Returns true if a binding matched and was executed (event consumed).
   */
  handleKeyEvent(e: KeyboardEvent): boolean {
    for (const binding of this.bindings.values()) {
      if (binding.match(e)) {
        binding.execute();
        return true;
      }
    }
    return false;
  }
}
