
// Command mapping for schedules (matches the schedule form)
export const getDeviceCommand = (deviceType: string, action: string): string => {
  const commandMap: Record<string, Record<string, string>> = {
    pump: {
      activate: 'PUMP_WATER_ON',
      deactivate: 'PUMP_WATER_OFF'
    },
    fan: {
      activate: 'TURN_FAN_ON',
      deactivate: 'TURN_FAN_OFF'
    },
    heater: {
      activate: 'TURN_HEATER_ON',
      deactivate: 'TURN_HEATER_OFF'
    },
    light: {
      activate: 'TURN_LIGHT_ON',
      deactivate: 'TURN_LIGHT_OFF'
    }
  };
  
  return commandMap[deviceType]?.[action] || '';
};