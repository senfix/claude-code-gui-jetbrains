import { SettingSection, SettingRow } from '../common';
import { useClaudeSettings } from '@/contexts/ClaudeSettingsContext';
import { type InputMode, INPUT_MODES, getAvailableModes, CLI_FLAG_TO_INPUT_MODE, INPUT_MODE_TO_CLI_FLAG } from '@/types/chatInput';
import type { PermissionsConfig } from '@/types/claude-settings';
import { ROUTE_META, Route } from '@/router/routes';

const NOT_SET_VALUE = '__NOT_SET__';

export function PermissionsSettings() {
  const { settings, scopeSettings, updateSetting, scope } = useClaudeSettings();
  const meta = ROUTE_META[Route.SETTINGS_PERMISSIONS];

  const permissions = (scopeSettings.permissions ?? {}) as PermissionsConfig;
  const mergedPermissions = (settings.permissions ?? {}) as PermissionsConfig;

  const bypassDisabled = permissions.disableBypassPermissionsMode === 'disable';
  const isBypassNotSet = permissions.disableBypassPermissionsMode === undefined && scope === 'project';

  const rawDefaultMode = permissions.defaultMode;
  const isDefaultModeNotSet = rawDefaultMode === undefined && scope === 'project';
  const defaultModeValue = isDefaultModeNotSet
    ? NOT_SET_VALUE
    : (rawDefaultMode ? (CLI_FLAG_TO_INPUT_MODE[rawDefaultMode] ?? 'ask_before_edit') : 'ask_before_edit');

  const mergedBypassDisabled = mergedPermissions.disableBypassPermissionsMode === 'disable';

  const savePermissionsKey = async (key: keyof PermissionsConfig, value: unknown) => {
    const current = (scopeSettings.permissions ?? {}) as Record<string, unknown>;
    const updated = { ...current, [key]: value };
    await updateSetting('permissions', updated as PermissionsConfig);
  };

  const deletePermissionsKey = async (key: keyof PermissionsConfig) => {
    const current = (scopeSettings.permissions ?? {}) as Record<string, unknown>;
    const updated = { ...current };
    delete updated[key];
    await updateSetting('permissions', updated as PermissionsConfig);
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-zinc-100 mb-6">{meta.label}</h2>

      <SettingSection title="Bypass Mode">
        <SettingRow
          label="Disable Bypass Mode"
          description="Prevent bypass permissions mode from being activated"
        >
          {isBypassNotSet ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500 italic">Not set (use global)</span>
              <button
                onClick={() => savePermissionsKey('disableBypassPermissionsMode', 'disable')}
                className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors bg-zinc-600 opacity-50"
              >
                <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-1" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                if (bypassDisabled) {
                  return deletePermissionsKey('disableBypassPermissionsMode');
                } else {
                  return savePermissionsKey('disableBypassPermissionsMode', 'disable');
                }
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                bypassDisabled ? 'bg-blue-500' : 'bg-zinc-600'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                bypassDisabled ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          )}
        </SettingRow>
      </SettingSection>

      <SettingSection title="Default Input Mode">
        <SettingRow
          label="Default Input Mode"
          description="Initial permission mode when opening a new session"
        >
          <select
            value={isDefaultModeNotSet ? NOT_SET_VALUE : defaultModeValue}
            onChange={(e) => {
              const value = e.target.value;
              if (value === NOT_SET_VALUE) {
                deletePermissionsKey('defaultMode');
                return;
              }
              const cliFlag = INPUT_MODE_TO_CLI_FLAG[value as InputMode];
              if (cliFlag) {
                savePermissionsKey('defaultMode', cliFlag);
              }
            }}
            className={`bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm ${
              isDefaultModeNotSet ? 'text-zinc-500 italic' : 'text-zinc-100'
            }`}
          >
            {scope === 'project' && (
              <option value={NOT_SET_VALUE} className="text-zinc-500">
                Not set (use global)
              </option>
            )}
            {getAvailableModes(mergedBypassDisabled).map((modeId) => (
              <option key={modeId} value={modeId}>
                {INPUT_MODES[modeId].label}
              </option>
            ))}
          </select>
        </SettingRow>
      </SettingSection>
    </div>
  );
}
