export type TemperatureConversionTarget = 'none' | 'celsius' | 'fahrenheit';

export type TemperatureDeviceConversionMode = 'follow_system' | 'none' | 'force_celsius' | 'force_fahrenheit';

export interface TemperatureUnitConverter {
  units: string[];
  toCelsius: (value: number) => number;
}

export interface TemperatureOutputConverter {
  units: string[];
  fromCelsius: (value: number) => number;
}

export const DEFAULT_TEMPERATURE_CONVERSION_TARGET: TemperatureConversionTarget = 'none';

export const DEFAULT_TEMPERATURE_DEVICE_CONVERSION_MODE: TemperatureDeviceConversionMode = 'follow_system';

export const SYSTEM_TEMPERATURE_CONVERSION_OPTIONS: Array<{ value: TemperatureConversionTarget; label: string }> = [
  { value: 'none', label: 'No conversion' },
  { value: 'celsius', label: 'Celsius' },
  { value: 'fahrenheit', label: 'Fahrenheit' },
];

export const DEVICE_TEMPERATURE_CONVERSION_OPTIONS: Array<{ value: TemperatureDeviceConversionMode; label: string }> = [
  { value: 'follow_system', label: 'Follow Matterbridge system settings' },
  { value: 'none', label: 'No conversion' },
  { value: 'force_celsius', label: 'Force Celsius' },
  { value: 'force_fahrenheit', label: 'Force Fahrenheit' },
];

export const temperatureFromUnits: TemperatureUnitConverter[] = [
  { units: ['C', 'CELSIUS', 'DEGREE_CELSIUS', 'DEGREES_CELSIUS', '°C'], toCelsius: (value) => value },
  { units: ['F', 'FAHRENHEIT', 'DEGREE_FAHRENHEIT', 'DEGREES_FAHRENHEIT', '°F'], toCelsius: (value) => ((value - 32) * 5) / 9 },
];

export const temperatureToUnits: TemperatureOutputConverter[] = [
  { units: ['C', 'CELSIUS', 'DEGREE_CELSIUS', 'DEGREES_CELSIUS', '°C'], fromCelsius: (value) => value },
  { units: ['F', 'FAHRENHEIT', 'DEGREE_FAHRENHEIT', 'DEGREES_FAHRENHEIT', '°F'], fromCelsius: (value) => value * (9 / 5) + 32 },
];

const NORMALIZED_UNIT_MAP: Record<string, string> = {
  CELSIUS: 'C',
  C: 'C',
  FAHRENHEIT: 'F',
  F: 'F',
};

/**
 * Normalizes free-form temperature unit text to a stable canonical form.
 *
 * Examples:
 * - `°c` -> `C`
 * - `degree fahrenheit` -> `DEGREE_FAHRENHEIT`
 * - `fahrenheit` -> `F`
 *
 * @param {string | null | undefined} unit Raw unit string (possibly undefined/null).
 * @returns {string | undefined} Canonical/normalized unit string, or `undefined` when input is empty.
 */
export function normalizeTemperatureUnit(unit?: string | null): string | undefined {
  if (!unit) return undefined;
  const normalized = unit.toUpperCase().replaceAll('°', '').replaceAll('-', '_').replaceAll(' ', '_').trim();
  return NORMALIZED_UNIT_MAP[normalized] ?? normalized;
}

/**
 * Finds a source-unit converter that can translate the provided unit to Celsius.
 *
 * @param {string | null | undefined} unit Source unit label.
 * @returns {TemperatureUnitConverter | undefined} Matching converter, or `undefined` when unsupported.
 */
function findFromConverter(unit?: string | null): TemperatureUnitConverter | undefined {
  const normalized = normalizeTemperatureUnit(unit);
  if (!normalized) return undefined;
  return temperatureFromUnits.find((converter) => converter.units.includes(normalized));
}

/**
 * Finds an output-unit converter that can translate Celsius to the provided unit.
 *
 * @param {string | null | undefined} unit Target unit label.
 * @returns {TemperatureOutputConverter | undefined} Matching converter, or `undefined` when unsupported.
 */
function findToConverter(unit?: string | null): TemperatureOutputConverter | undefined {
  const normalized = normalizeTemperatureUnit(unit);
  if (!normalized) return undefined;
  return temperatureToUnits.find((converter) => converter.units.includes(normalized));
}

/**
 * Converts a temperature numeric value between units using the centralized
 * `from -> Celsius -> to` strategy.
 *
 * Conversion is only performed when:
 * - both units are recognized, and
 * - source and target units differ.
 *
 * Otherwise the original value is returned unchanged.
 *
 * @param {number} value Numeric temperature value in `fromUnit`.
 * @param {string | null | undefined} fromUnit Source unit.
 * @param {string | null | undefined} toUnit Target unit.
 * @returns {{ value: number; converted: boolean; unit?: 'C' | 'F' }} Conversion result with output value, conversion flag, and normalized unit when known (`C`/`F`).
 */
export function convertTemperatureValue(value: number, fromUnit?: string | null, toUnit?: string | null): { value: number; converted: boolean; unit?: 'C' | 'F' } {
  const normalizedFrom = normalizeTemperatureUnit(fromUnit);
  const normalizedTo = normalizeTemperatureUnit(toUnit);

  if (!normalizedTo || !normalizedFrom || normalizedFrom === normalizedTo) {
    return { value, converted: false, unit: normalizedFrom === 'C' || normalizedFrom === 'F' ? normalizedFrom : undefined };
  }

  const fromConverter = findFromConverter(normalizedFrom);
  const toConverter = findToConverter(normalizedTo);
  if (!fromConverter || !toConverter) {
    return { value, converted: false, unit: normalizedFrom === 'C' || normalizedFrom === 'F' ? normalizedFrom : undefined };
  }

  const celsiusValue = fromConverter.toCelsius(value);
  const converted = toConverter.fromCelsius(celsiusValue);
  return { value: converted, converted: true, unit: normalizedTo === 'C' || normalizedTo === 'F' ? normalizedTo : undefined };
}

/**
 * Resolves the effective output unit from system-level and device-level settings.
 *
 * Device-level settings have priority over system-level settings.
 *
 * @param {TemperatureConversionTarget} systemConversion Current system conversion setting.
 * @param {TemperatureDeviceConversionMode} deviceConversion Current per-device conversion setting.
 * @returns {'C' | 'F' | undefined} `C`, `F`, or `undefined` when no conversion is required.
 */
export function resolveTemperatureTargetUnit(systemConversion: TemperatureConversionTarget, deviceConversion: TemperatureDeviceConversionMode): 'C' | 'F' | undefined {
  if (deviceConversion === 'none') return undefined;
  if (deviceConversion === 'force_celsius') return 'C';
  if (deviceConversion === 'force_fahrenheit') return 'F';
  if (systemConversion === 'celsius') return 'C';
  if (systemConversion === 'fahrenheit') return 'F';
  return undefined;
}

/**
 * Converts a unit label to a display-ready symbol.
 *
 * @param {string | undefined} unit Unit string to convert.
 * @returns {'°C' | '°F' | ''} `°C`, `°F`, or empty string when unknown.
 */
export function toTemperatureUnitSymbol(unit?: string): '°C' | '°F' | '' {
  const normalized = normalizeTemperatureUnit(unit);
  if (normalized === 'C') return '°C';
  if (normalized === 'F') return '°F';
  return '';
}

/**
 * Returns whether a Matter cluster/attribute pair is treated as temperature.
 *
 * This helper centralizes the attribute set used by conversion/display pipelines.
 *
 * @param {string} clusterName Cluster name (case-insensitive).
 * @param {string} attributeName Attribute name.
 * @returns {boolean} `true` when the attribute is a recognized temperature value.
 */
export function isTemperatureAttribute(clusterName: string, attributeName: string): boolean {
  const cluster = clusterName.toLowerCase();
  if (cluster === 'temperaturemeasurement') return attributeName === 'measuredValue';
  if (cluster !== 'thermostat') return false;
  return [
    'localTemperature',
    'outdoorTemperature',
    'occupiedHeatingSetpoint',
    'occupiedCoolingSetpoint',
    'unoccupiedHeatingSetpoint',
    'unoccupiedCoolingSetpoint',
    'absMinHeatSetpointLimit',
    'absMaxHeatSetpointLimit',
    'absMinCoolSetpointLimit',
    'absMaxCoolSetpointLimit',
    'minHeatSetpointLimit',
    'maxHeatSetpointLimit',
    'minCoolSetpointLimit',
    'maxCoolSetpointLimit',
  ].includes(attributeName);
}
