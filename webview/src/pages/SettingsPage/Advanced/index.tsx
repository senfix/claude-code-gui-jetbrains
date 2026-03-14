import { SettingSection, SettingRow } from '../common';
import { useSettings } from '@/contexts/SettingsContext';
import { SettingKey, LogLevel } from '@/types/settings';
import { ToggleSwitch } from '@/components/ToggleSwitch';
import { ROUTE_META, Route } from '@/router/routes';

const NOT_SET_VALUE = '__NOT_SET__';

export function AdvancedSettings() {
  const { scopeSettings, updateSetting, scope, resetToGlobal } = useSettings();
  const meta = ROUTE_META[Route.SETTINGS_ADVANCED];

  const rawDebugMode = scopeSettings[SettingKey.DEBUG_MODE] as boolean | undefined;
  const isDebugNotSet = rawDebugMode === undefined && scope === 'project';

  const rawLogLevel = scopeSettings[SettingKey.LOG_LEVEL] as LogLevel | undefined;
  const isLogLevelNotSet = rawLogLevel === undefined && scope === 'project';
  const logLevelValue = isLogLevelNotSet ? NOT_SET_VALUE : (rawLogLevel ?? LogLevel.INFO);

  return (
    <div>
      <h2 className="text-xl font-semibold text-zinc-100 mb-6">{meta.label}</h2>

      <SettingSection title="Debugging">
        <SettingRow
          label="Debug Mode"
          description="Enable debug logging and diagnostics"
        >
          {isDebugNotSet ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500 italic">Not set (use global)</span>
              <ToggleSwitch
                checked={false}
                onChange={(checked) => updateSetting(SettingKey.DEBUG_MODE, checked)}
                disabled={false}
              />
            </div>
          ) : (
            <ToggleSwitch
              checked={rawDebugMode ?? false}
              onChange={(checked) => updateSetting(SettingKey.DEBUG_MODE, checked)}
            />
          )}
        </SettingRow>

        <SettingRow
          label="Log Level"
          description="Minimum log level to display"
        >
          <select
            value={logLevelValue}
            onChange={(e) => {
              const value = e.target.value;
              if (value === NOT_SET_VALUE) {
                resetToGlobal(SettingKey.LOG_LEVEL);
                return;
              }
              updateSetting(SettingKey.LOG_LEVEL, value as LogLevel);
            }}
            className={`bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm ${
              isLogLevelNotSet ? 'text-zinc-500 italic' : 'text-zinc-100'
            }`}
          >
            {scope === 'project' && (
              <option value={NOT_SET_VALUE} className="text-zinc-500">
                Not set (use global)
              </option>
            )}
            <option value={LogLevel.DEBUG}>Debug</option>
            <option value={LogLevel.INFO}>Info</option>
            <option value={LogLevel.WARN}>Warning</option>
            <option value={LogLevel.ERROR}>Error</option>
          </select>
        </SettingRow>
      </SettingSection>
    </div>
  );
}
