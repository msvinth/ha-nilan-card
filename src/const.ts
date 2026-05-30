export const CARD_TYPE = 'nilan-hmi-card';
export const EDITOR_TYPE = 'nilan-hmi-card-editor';
export const CARD_VERSION = '0.1.0';

// Canonical Genvex Connect entity-suffix map. Used by the editor's
// "auto-fill from device" feature and by sensible default behaviour.
export const GENVEX_SUFFIX_MAP: Record<string, string> = {
    // sensors / temperatures
    temperature_supply_air: 'temperature_supply_air',
    temperature_extract_air: 'temperature_extract_air',
    temperature_outside_air: 'temperature_outside_air',
    temperature_exhaust_air: 'temperature_exhaust_air',
    temperature_room: 'temperature_room',
    temperature_condenser: 'temperature_condenser',
    temperature_evaporator: 'temperature_evaporator',
    temperature_after_condenser: 'temperature_after_condenser',
    temperature_before_condenser: 'temperature_before_condenser',
    temperature_hotwater_top: 'temperature_hotwater_top',
    temperature_hotwater_bottom: 'temperature_hotwater_bottom',
    temperature_buffer_tank: 'temperature_buffer_tank',
    temperature_heatpump_outdoor: 'temperature_heatpump_outdoor',
    temperature_high_pressure_pipe: 'temperature_high_pressure_pipe',
    // sensors / status
    humidity: 'humidity',
    co2: 'co2',
    efficiency: 'efficiency',
    fan_level_supply: 'fan_level_supply',
    fan_level_extract: 'fan_level_extract',
    days_left_filter: 'days_left_until_filter_change',
    heatpump_capacity: 'heatpump_actual_capacity',
    status: 'status',
    heatpump_operation_state: 'heatpump_operation_state',
    sacrificial_anode: 'sacrificial_anode',
    active_alarm_count: 'active_alarm_count',
    active_alarm_list: 'active_alarm_list',
    // binary
    bypass: 'bypass',
    heatpump: 'heatpump',
    heating_element: 'heatpump_heating_element',
    // controls
    climate: 'ventilation',
    fan_level: 'fan_level',
    antilegionella: 'antilegionella',
    cooling_priority: 'cooling_priority',
    cooling_start_offset: 'cooling_start_offset',
    temperature_target: 'temperature_target',
    temperature_offset: 'temperature',
    hotwater_temperature_target: 'hotwater_temperature_target',
    hotwater_booster_max_temperature: 'hotwater_booster_max_temperature',
    summer_min_supply_air_temperature: 'summer_min_supply_air_temperature',
    summer_max_supply_air_temperature: 'summer_max_supply_air_temperature',
    reset_filter: 'reset_filter',
};

// Per-slot absolute positioning, all values in % of the card box.
// x/y identify the centre of the slot.
export type SlotId =
    | 'room'
    | 'supply'
    | 'outside'
    | 'exhaust'
    | 'extract'
    | 'humidity'
    | 'co2'
    | 'hotwater'
    | 'hotwater_bottom'
    | 'evaporator'
    | 'heatpump_outdoor'
    | 'central_heat'
    | 'fan_level'
    | 'op_icons'
    | 'alarm'
    | 'menu'
    | 'element_bolt'
    | 'filter_days';

export interface Coord {
    x: number;
    y: number;
    w?: number;
    h?: number;
}

// Coordinates expressed as % of the card box (centre of each slot).
// Aligned to img/main.jpg (portrait, the Nilan HMI house schematic):
//  - menu burger top-left, alarm triangle top-right
//  - 4 airflow arrows around the fan box (outside TL, exhaust TR, room BL, supply BR)
//  - fan level overlay on the white fan box
//  - humidity + CO2 at the red droplets in the middle of the house
//  - hot-water value on the red box, central-heat value next to the radiator
//  - operation icons stack vertically under the menu icon (per the DK manual)
export const SLOT_COORDS: Record<SlotId, Coord> = {
    menu: { x: 11, y: 6.4, w: 10, h: 7 },
    alarm: { x: 91, y: 6, w: 10, h: 7 },
    op_icons: { x: 80.8, y: 13.7, w: 30, h: 6 },
    outside: { x: 20.2, y: 27, w: 14, h: 5 },
    exhaust: { x: 78.4, y: 26.6, w: 14, h: 5 },
    fan_level: { x: 56, y: 36.7, w: 10, h: 6 },
    room: { x: 30.6, y: 50.4, w: 16, h: 7 },
    supply: { x: 71.2, y: 49.7, w: 14, h: 5 },
    extract: { x: 23.8, y: 60.4, w: 14, h: 5 },
    humidity: { x: 50.3, y: 67.4, w: 12, h: 5 },
    co2: { x: 72.2, y: 67.3, w: 14, h: 5 },
    hotwater: { x: 20.8, y: 75.5, w: 14, h: 6 },
    hotwater_bottom: { x: 20.8, y: 86.6, w: 14, h: 5 },
    evaporator: { x: 52.2, y: 84.1, w: 14, h: 5 },
    heatpump_outdoor: { x: 52.5, y: 88.8, w: 14, h: 5 },
    element_bolt: { x: 20.1, y: 79.1, w: 6, h: 5 },
    central_heat: { x: 23.4, y: 67.3, w: 14, h: 6 },
    filter_days: { x: 50, y: 95, w: 30, h: 4 },
};

export type OperationIconId =
    | 'compressor'
    | 'heat'
    | 'cool'
    | 'hotwater'
    | 'defrost'
    | 'stop'
    | 'user'
    | 'week'
    | 'element';

export const DEFAULT_OP_ORDER: OperationIconId[] = [
    'compressor',
    'heat',
    'cool',
    'hotwater',
    'defrost',
    'stop',
    'user',
    'week',
    'element',
];
