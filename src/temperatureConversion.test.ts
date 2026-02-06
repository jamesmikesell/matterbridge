/**
 * Unit tests for temperatureConversion helpers.
 */

import {
  DEFAULT_TEMPERATURE_CONVERSION_TARGET,
  DEFAULT_TEMPERATURE_DEVICE_CONVERSION_MODE,
  DEVICE_TEMPERATURE_CONVERSION_OPTIONS,
  SYSTEM_TEMPERATURE_CONVERSION_OPTIONS,
  convertTemperatureValue,
  isTemperatureAttribute,
  normalizeTemperatureUnit,
  resolveTemperatureTargetUnit,
  temperatureFromUnits,
  temperatureToUnits,
  toTemperatureUnitSymbol,
} from './temperatureConversion.js';

describe('temperatureConversion', () => {
  test('exports defaults and option lists', () => {
    expect(DEFAULT_TEMPERATURE_CONVERSION_TARGET).toBe('none');
    expect(DEFAULT_TEMPERATURE_DEVICE_CONVERSION_MODE).toBe('follow_system');
    expect(SYSTEM_TEMPERATURE_CONVERSION_OPTIONS.map((o) => o.value)).toEqual(['none', 'celsius', 'fahrenheit']);
    expect(DEVICE_TEMPERATURE_CONVERSION_OPTIONS.map((o) => o.value)).toEqual(['follow_system', 'none', 'force_celsius', 'force_fahrenheit']);
    expect(temperatureFromUnits.length).toBeGreaterThan(0);
    expect(temperatureToUnits.length).toBeGreaterThan(0);
  });

  test('normalizeTemperatureUnit handles canonical and formatted values', () => {
    expect(normalizeTemperatureUnit(undefined)).toBeUndefined();
    expect(normalizeTemperatureUnit(null)).toBeUndefined();
    expect(normalizeTemperatureUnit('')).toBeUndefined();
    expect(normalizeTemperatureUnit('celsius')).toBe('C');
    expect(normalizeTemperatureUnit('C')).toBe('C');
    expect(normalizeTemperatureUnit('°c')).toBe('C');
    expect(normalizeTemperatureUnit('fahrenheit')).toBe('F');
    expect(normalizeTemperatureUnit('°F')).toBe('F');
    expect(normalizeTemperatureUnit('degree fahrenheit')).toBe('DEGREE_FAHRENHEIT');
    expect(normalizeTemperatureUnit('degree-celsius')).toBe('DEGREE_CELSIUS');
    expect(normalizeTemperatureUnit('kelvin')).toBe('KELVIN');
  });

  test('convertTemperatureValue keeps value when conversion is not applicable', () => {
    expect(convertTemperatureValue(10, 'C', undefined)).toEqual({ value: 10, converted: false, unit: 'C' });
    expect(convertTemperatureValue(10, undefined, 'F')).toEqual({ value: 10, converted: false, unit: undefined });
    expect(convertTemperatureValue(10, 'C', 'C')).toEqual({ value: 10, converted: false, unit: 'C' });
    expect(convertTemperatureValue(10, 'K', 'F')).toEqual({ value: 10, converted: false, unit: undefined });
    expect(convertTemperatureValue(10, 'C', 'K')).toEqual({ value: 10, converted: false, unit: 'C' });
  });

  test('convertTemperatureValue converts C <-> F', () => {
    const cToF = convertTemperatureValue(0, 'C', 'F');
    expect(cToF.converted).toBe(true);
    expect(cToF.unit).toBe('F');
    expect(cToF.value).toBe(32);

    const fToC = convertTemperatureValue(212, 'F', 'C');
    expect(fToC.converted).toBe(true);
    expect(fToC.unit).toBe('C');
    expect(fToC.value).toBe(100);

    const aliases = convertTemperatureValue(10, 'degree celsius', 'degrees fahrenheit');
    expect(aliases.converted).toBe(true);
    expect(Math.round(aliases.value * 10) / 10).toBe(50);
  });

  test('resolveTemperatureTargetUnit applies precedence and no-conversion behavior', () => {
    expect(resolveTemperatureTargetUnit('none', 'follow_system')).toBeUndefined();
    expect(resolveTemperatureTargetUnit('celsius', 'follow_system')).toBe('C');
    expect(resolveTemperatureTargetUnit('fahrenheit', 'follow_system')).toBe('F');
    expect(resolveTemperatureTargetUnit('fahrenheit', 'none')).toBeUndefined();
    expect(resolveTemperatureTargetUnit('none', 'force_celsius')).toBe('C');
    expect(resolveTemperatureTargetUnit('none', 'force_fahrenheit')).toBe('F');
  });

  test('toTemperatureUnitSymbol maps known units and rejects unknown', () => {
    expect(toTemperatureUnitSymbol('C')).toBe('°C');
    expect(toTemperatureUnitSymbol('fahrenheit')).toBe('°F');
    expect(toTemperatureUnitSymbol('K')).toBe('');
    expect(toTemperatureUnitSymbol(undefined)).toBe('');
  });

  test('isTemperatureAttribute recognizes supported clusters and attributes', () => {
    expect(isTemperatureAttribute('TemperatureMeasurement', 'measuredValue')).toBe(true);
    expect(isTemperatureAttribute('temperaturemeasurement', 'measuredValue')).toBe(true);
    expect(isTemperatureAttribute('temperatureMeasurement', 'other')).toBe(false);

    expect(isTemperatureAttribute('Thermostat', 'localTemperature')).toBe(true);
    expect(isTemperatureAttribute('Thermostat', 'occupiedHeatingSetpoint')).toBe(true);
    expect(isTemperatureAttribute('Thermostat', 'occupiedCoolingSetpoint')).toBe(true);
    expect(isTemperatureAttribute('Thermostat', 'unoccupiedHeatingSetpoint')).toBe(true);
    expect(isTemperatureAttribute('Thermostat', 'unoccupiedCoolingSetpoint')).toBe(true);
    expect(isTemperatureAttribute('Thermostat', 'outdoorTemperature')).toBe(true);
    expect(isTemperatureAttribute('Thermostat', 'absMinHeatSetpointLimit')).toBe(true);
    expect(isTemperatureAttribute('Thermostat', 'absMaxHeatSetpointLimit')).toBe(true);
    expect(isTemperatureAttribute('Thermostat', 'absMinCoolSetpointLimit')).toBe(true);
    expect(isTemperatureAttribute('Thermostat', 'absMaxCoolSetpointLimit')).toBe(true);
    expect(isTemperatureAttribute('Thermostat', 'minHeatSetpointLimit')).toBe(true);
    expect(isTemperatureAttribute('Thermostat', 'maxHeatSetpointLimit')).toBe(true);
    expect(isTemperatureAttribute('Thermostat', 'minCoolSetpointLimit')).toBe(true);
    expect(isTemperatureAttribute('Thermostat', 'maxCoolSetpointLimit')).toBe(true);

    expect(isTemperatureAttribute('Thermostat', 'systemMode')).toBe(false);
    expect(isTemperatureAttribute('OnOff', 'onOff')).toBe(false);
  });
});
