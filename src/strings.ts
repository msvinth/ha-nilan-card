// Lightweight EN/DA string table. Keys are kebab/underscore identifiers.
// User can override individual entries via the `strings` config key.

export type Lang = 'en' | 'da';

const STRINGS: Record<Lang, Record<string, string>> = {
    en: {
        'card.unconfigured': 'Nilan HMI card is not configured. Open the visual editor to assign entities.',
        'card.editor_open_hint': 'Use the visual editor to map your Genvex entities.',
        'slot.room': 'Room',
        'slot.supply': 'Supply',
        'slot.outside': 'Outside',
        'slot.extract': 'Extract',
        'slot.exhaust': 'Exhaust',
        'slot.humidity': 'Humidity',
        'slot.co2': 'CO₂',
        'slot.hotwater': 'Hot water',
        'slot.hotwater_bottom': 'Hot water bottom',
        'slot.evaporator': 'Evaporator',
        'slot.heatpump_outdoor': 'Outdoor',
        'slot.central_heat': 'Central heat',
        'slot.fan_level': 'Fan',
        'slot.filter_days': 'Filter',
        'slot.menu': 'Menu',
        'slot.alarm': 'Alarm',
        'slot.op_icons': 'Operation icons',
        'slot.element_bolt': 'Heating element',
        'alarm.title': 'Active alarms',
        'alarm.none': 'No active alarms',
        'controls.title': 'Settings',
        'controls.climate_mode': 'Mode',
        'controls.target_temp': 'Room target',
        'controls.temperature_offset': 'Offset',
        'controls.hotwater_target': 'Hot water target',
        'controls.hotwater_booster_max': 'Booster max',
        'controls.fan_level': 'Fan level',
        'controls.antilegionella': 'Anti-legionella',
        'controls.cooling_priority': 'Cooling priority',
        'controls.cooling_start_offset': 'Cooling start offset',
        'controls.summer_min': 'Summer min supply',
        'controls.summer_max': 'Summer max supply',
        'controls.reset_filter': 'Reset filter',
        'controls.unavailable': 'Not configured',
        'common.close': 'Close',
        'common.unavailable': 'Unavailable',
    },
    da: {
        'card.unconfigured': 'Nilan HMI-kortet er ikke konfigureret. Åbn den visuelle editor for at tilknytte enheder.',
        'card.editor_open_hint': 'Brug den visuelle editor til at tilknytte dine Genvex-enheder.',
        'slot.room': 'Rum',
        'slot.supply': 'Tilluft',
        'slot.outside': 'Udeluft',
        'slot.extract': 'Udsugning',
        'slot.exhaust': 'Afkast',
        'slot.humidity': 'Fugt',
        'slot.co2': 'CO₂',
        'slot.hotwater': 'Varmt vand',
        'slot.hotwater_bottom': 'Varmt vand bund',
        'slot.evaporator': 'Fordamper',
        'slot.heatpump_outdoor': 'Udedel',
        'slot.central_heat': 'Centralvarme',
        'slot.fan_level': 'Ventilation',
        'slot.filter_days': 'Filter',
        'slot.menu': 'Menu',
        'slot.alarm': 'Alarm',
        'slot.op_icons': 'Driftsikoner',
        'slot.element_bolt': 'Varmelegeme',
        'alarm.title': 'Aktive alarmer',
        'alarm.none': 'Ingen aktive alarmer',
        'controls.title': 'Indstillinger',
        'controls.climate_mode': 'Tilstand',
        'controls.target_temp': 'Rumtemperatur',
        'controls.temperature_offset': 'Offset',
        'controls.hotwater_target': 'Varmt vand temperatur',
        'controls.hotwater_booster_max': 'Booster maks',
        'controls.fan_level': 'Ventilationstrin',
        'controls.antilegionella': 'Antilegionella',
        'controls.cooling_priority': 'Køleprioritet',
        'controls.cooling_start_offset': 'Køle-start offset',
        'controls.summer_min': 'Sommer min tilluft',
        'controls.summer_max': 'Sommer maks tilluft',
        'controls.reset_filter': 'Nulstil filter',
        'controls.unavailable': 'Ikke konfigureret',
        'common.close': 'Luk',
        'common.unavailable': 'Ikke tilgængelig',
    },
};

export function pickLang(language: string | undefined, override?: 'auto' | 'en' | 'da'): Lang {
    if (override && override !== 'auto') return override;
    if (language?.toLowerCase().startsWith('da')) return 'da';
    return 'en';
}

export function t(
    key: string,
    lang: Lang,
    overrides?: Record<string, string>,
): string {
    if (overrides && overrides[key] != null) return overrides[key];
    return STRINGS[lang][key] ?? STRINGS.en[key] ?? key;
}
