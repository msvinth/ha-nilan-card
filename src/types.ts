import type { SlotId, OperationIconId, Coord } from './const';

// HA-style action config (subset of standard tap_action). The card supports
// either a string shortcut ('more-info' | 'none' | 'toggle') or an object.
export type ActionShortcut = 'more-info' | 'none' | 'toggle' | 'navigate' | 'call-service' | 'url';

export interface ActionConfig {
    action: ActionShortcut;
    navigation_path?: string;
    url_path?: string;
    service?: string;
    service_data?: Record<string, unknown>;
    target?: { entity_id?: string | string[] };
    entity?: string;
    confirmation?:
    | boolean
    | { text?: string; exemptions?: { user: string }[] };
}

export type TapActionConfig = ActionShortcut | ActionConfig;

export interface SlotConfig {
    label?: string;
    unit?: string;
    decimals?: number;
    attribute?: string;
    color?: string;
    icon?: string;
    hidden?: boolean;
    tap_action?: TapActionConfig;
    hold_action?: TapActionConfig;
    double_tap_action?: TapActionConfig;
    state_map?: Record<
        string,
        { icon?: string; label?: string; color?: string; hidden?: boolean }
    >;
    thresholds?: { value: number; color: string; icon?: string }[];
}

export interface OperationIconMapping {
    entity?: string;
    on_states?: string[];
    attribute?: string;
    icon?: string;
    color?: string;
}

export interface NilanHmiCardConfig {
    type: string;
    name?: string;
    device_id?: string;
    theme?: string;

    layout?: {
        scale?: number;
        show_house_outline?: boolean;
        show_legend?: boolean;
        designer?: boolean;
        hide_slots?: SlotId[];
        coord_overrides?: Partial<Record<SlotId, Coord>>;
    };

    entities?: {
        // temperatures
        temperature_room?: string;
        temperature_supply_air?: string;
        temperature_outside_air?: string;
        temperature_extract_air?: string;
        temperature_exhaust_air?: string;
        temperature_condenser?: string;
        temperature_evaporator?: string;
        temperature_after_condenser?: string;
        temperature_before_condenser?: string;
        temperature_hotwater_top?: string;
        temperature_hotwater_bottom?: string;
        temperature_buffer_tank?: string;
        temperature_heatpump_outdoor?: string;
        temperature_high_pressure_pipe?: string;
        central_heat_flow?: string;
        // air / status
        humidity?: string;
        co2?: string;
        efficiency?: string;
        fan_level_supply?: string;
        fan_level_extract?: string;
        days_left_filter?: string;
        heatpump_capacity?: string;
        status?: string;
        heatpump_operation_state?: string;
        sacrificial_anode?: string;
        active_alarm_count?: string;
        active_alarm_list?: string;
        // binary
        bypass?: string;
        heatpump?: string;
        heating_element?: string;
        // controls
        climate?: string;
        fan_level?: string;
        antilegionella?: string;
        cooling_priority?: string;
        cooling_start_offset?: string;
        temperature_target?: string;
        temperature_offset?: string;
        hotwater_temperature_target?: string;
        hotwater_booster_max_temperature?: string;
        summer_min_supply_air_temperature?: string;
        summer_max_supply_air_temperature?: string;
        reset_filter?: string;
        user_program?: string;
        week_program?: string;
    };

    slots?: Partial<Record<SlotId, SlotConfig>>;

    operation_icons?: {
        enabled?: boolean;
        order?: OperationIconId[];
        hidden?: OperationIconId[];
        mapping?: Partial<Record<OperationIconId, OperationIconMapping>>;
    };

    interactions?: {
        default_tap_action?: TapActionConfig;
        menu_action?: 'controls-popup' | 'more-info' | 'navigate' | ActionConfig;
        alarm_action?: 'alarm-popup' | 'more-info' | 'none' | ActionConfig;
        value_tap_action?: 'more-info' | 'none';
        long_press_enabled?: boolean;
        haptic?: boolean;
    };

    controls_popup?: {
        enabled?: boolean;
        show?: ControlsItem[];
        order?: ControlsItem[];
        title?: string;
    };

    language?: 'auto' | 'en' | 'da';
    strings?: Record<string, string>;
    debug?: boolean;
}

export type ControlsItem =
    | 'climate_mode'
    | 'target_temp'
    | 'temperature_offset'
    | 'hotwater_target'
    | 'hotwater_booster_max'
    | 'fan_level'
    | 'antilegionella'
    | 'cooling_priority'
    | 'cooling_start_offset'
    | 'summer_min'
    | 'summer_max'
    | 'reset_filter';

export const DEFAULT_CONTROLS_ITEMS: ControlsItem[] = [
    'climate_mode',
    'target_temp',
    'temperature_offset',
    'fan_level',
    'hotwater_target',
    'hotwater_booster_max',
    'antilegionella',
    'cooling_priority',
    'cooling_start_offset',
    'summer_min',
    'summer_max',
    'reset_filter',
];

// Minimal Home Assistant typings to avoid a full dependency on @types/hass.
export interface HassEntity {
    entity_id: string;
    state: string;
    attributes: Record<string, any> & {
        friendly_name?: string;
        unit_of_measurement?: string;
        device_class?: string;
        icon?: string;
    };
    last_changed?: string;
    last_updated?: string;
}

export interface HomeAssistant {
    states: Record<string, HassEntity>;
    language: string;
    themes: Record<string, unknown>;
    locale?: { language: string };
    callService: (
        domain: string,
        service: string,
        data?: Record<string, unknown>,
        target?: Record<string, unknown>,
    ) => Promise<unknown>;
    callWS: <T = unknown>(msg: Record<string, unknown>) => Promise<T>;
    formatEntityState?: (entity: HassEntity, state?: string) => string;
    formatEntityAttributeValue?: (entity: HassEntity, attribute: string) => string;
}
