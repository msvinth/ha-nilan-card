import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import {
    EDITOR_TYPE,
    GENVEX_SUFFIX_MAP,
    DEFAULT_OP_ORDER,
    type OperationIconId,
} from './const';
import {
    DEFAULT_CONTROLS_ITEMS,
    type HomeAssistant,
    type NilanHmiCardConfig,
} from './types';

interface EntityRegistryEntry {
    entity_id: string;
    device_id?: string | null;
    platform?: string;
}

interface SchemaItem {
    name: string;
    selector?: Record<string, any>;
    type?: string;
    required?: boolean;
}

interface SchemaGroup {
    type: 'expandable';
    name: string;
    title: string;
    schema: SchemaItem[];
    flatten?: boolean;
}

@customElement(EDITOR_TYPE)
export class NilanHmiCardEditor extends LitElement {
    @property({ attribute: false }) public hass?: HomeAssistant;
    @state() private _config?: NilanHmiCardConfig;
    @state() private _registry?: EntityRegistryEntry[];

    public setConfig(config: NilanHmiCardConfig): void {
        this._config = { ...config, entities: { ...(config.entities ?? {}) } };
    }

    protected async firstUpdated() {
        if (!this.hass) return;
        try {
            this._registry = await this.hass.callWS<EntityRegistryEntry[]>({
                type: 'config/entity_registry/list',
            });
        } catch (err) {
            console.warn('[nilan-hmi-card] could not fetch entity registry', err);
        }
    }

    protected render(): TemplateResult {
        if (!this.hass || !this._config) return html``;

        const data: Record<string, any> = {
            name: this._config.name ?? '',
            theme: this._config.theme ?? '',
            language: this._config.language ?? 'auto',
            device_id: this._config.device_id ?? '',
            ...this._config.entities,
            ...this._flattenLayout(),
            ...this._flattenInteractions(),
            ...this._flattenControlsPopup(),
            ...this._flattenOpIcons(),
            debug: this._config.debug ?? false,
        };

        return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${this._buildSchema()}
        .computeLabel=${this._computeLabel}
        .computeHelper=${this._computeHelper}
        @value-changed=${this._valueChanged}
      ></ha-form>
      ${this._config.device_id
                ? html`
            <div class="autofill-row">
              <button class="autofill-btn" @click=${this._autoFillFromDevice}>
                Auto-fill entities from selected device
              </button>
              <span class="hint">Matches Genvex Connect entity suffixes.</span>
            </div>
          `
                : nothing}
    `;
    }

    // ---- Schema -------------------------------------------------------------

    private _buildSchema(): (SchemaItem | SchemaGroup)[] {
        const entityPicker = (name: string, domains?: string[]): SchemaItem => ({
            name,
            selector: { entity: domains ? { domain: domains, multiple: false } : {} },
        });

        const general: SchemaGroup = {
            type: 'expandable',
            name: 'general',
            title: 'General',
            flatten: true,
            schema: [
                { name: 'name', selector: { text: {} } },
                { name: 'theme', selector: { theme: {} } },
                {
                    name: 'language',
                    selector: {
                        select: {
                            mode: 'dropdown',
                            options: [
                                { value: 'auto', label: 'Auto (follow HA)' },
                                { value: 'en', label: 'English' },
                                { value: 'da', label: 'Dansk' },
                            ],
                        },
                    },
                },
                {
                    name: 'device_id',
                    selector: { device: {} },
                },
            ],
        };

        const layout: SchemaGroup = {
            type: 'expandable',
            name: 'layout',
            title: 'Layout',
            flatten: true,
            schema: [
                { name: 'scale', selector: { number: { min: 0.5, max: 2, step: 0.1, mode: 'slider' } } },
                { name: 'show_legend', selector: { boolean: {} } },
                {
                    name: 'hide_slots',
                    selector: {
                        select: {
                            multiple: true,
                            options: this._slotOptions(),
                        },
                    },
                },
            ],
        };

        const temps: SchemaGroup = {
            type: 'expandable',
            name: 'temperatures',
            title: 'Temperature sensors',
            flatten: true,
            schema: [
                'temperature_room',
                'temperature_supply_air',
                'temperature_outside_air',
                'temperature_extract_air',
                'temperature_exhaust_air',
                'temperature_condenser',
                'temperature_evaporator',
                'temperature_after_condenser',
                'temperature_before_condenser',
                'temperature_hotwater_top',
                'temperature_hotwater_bottom',
                'temperature_buffer_tank',
                'temperature_heatpump_outdoor',
                'temperature_high_pressure_pipe',
                'central_heat_flow',
            ].map((n) => entityPicker(n, ['sensor'])),
        };

        const airStatus: SchemaGroup = {
            type: 'expandable',
            name: 'air_status',
            title: 'Air quality & status',
            flatten: true,
            schema: [
                entityPicker('humidity', ['sensor']),
                entityPicker('co2', ['sensor']),
                entityPicker('efficiency', ['sensor']),
                entityPicker('fan_level_supply', ['sensor']),
                entityPicker('fan_level_extract', ['sensor']),
                entityPicker('days_left_filter', ['sensor']),
                entityPicker('heatpump_capacity', ['sensor']),
                entityPicker('status', ['sensor']),
                entityPicker('heatpump_operation_state', ['sensor']),
                entityPicker('sacrificial_anode', ['sensor']),
                entityPicker('active_alarm_count', ['sensor']),
                entityPicker('active_alarm_list', ['sensor']),
            ],
        };

        const binary: SchemaGroup = {
            type: 'expandable',
            name: 'binary',
            title: 'Binary sensors',
            flatten: true,
            schema: [
                entityPicker('bypass', ['binary_sensor']),
                entityPicker('heatpump', ['binary_sensor']),
                entityPicker('heating_element', ['binary_sensor']),
            ],
        };

        const controls: SchemaGroup = {
            type: 'expandable',
            name: 'controls',
            title: 'Controls (writable)',
            flatten: true,
            schema: [
                entityPicker('climate', ['climate']),
                entityPicker('temperature_target', ['number']),
                entityPicker('temperature_offset', ['number']),
                entityPicker('hotwater_temperature_target', ['number']),
                entityPicker('hotwater_booster_max_temperature', ['number']),
                entityPicker('summer_min_supply_air_temperature', ['number']),
                entityPicker('summer_max_supply_air_temperature', ['number']),
                entityPicker('fan_level', ['select']),
                entityPicker('antilegionella', ['select']),
                entityPicker('cooling_priority', ['select']),
                entityPicker('cooling_start_offset', ['select']),
                entityPicker('reset_filter', ['button']),
                entityPicker('user_program'),
                entityPicker('week_program'),
            ],
        };

        const interactions: SchemaGroup = {
            type: 'expandable',
            name: 'interactions',
            title: 'Interactions',
            flatten: true,
            schema: [
                {
                    name: 'default_tap_action',
                    selector: {
                        select: {
                            mode: 'dropdown',
                            options: ['more-info', 'none', 'toggle'].map((v) => ({ value: v, label: v })),
                        },
                    },
                },
                {
                    name: 'menu_action',
                    selector: {
                        select: {
                            mode: 'dropdown',
                            options: ['controls-popup', 'more-info', 'navigate'].map((v) => ({
                                value: v,
                                label: v,
                            })),
                        },
                    },
                },
                {
                    name: 'alarm_action',
                    selector: {
                        select: {
                            mode: 'dropdown',
                            options: ['alarm-popup', 'more-info', 'none'].map((v) => ({ value: v, label: v })),
                        },
                    },
                },
                { name: 'long_press_enabled', selector: { boolean: {} } },
                { name: 'haptic', selector: { boolean: {} } },
            ],
        };

        const popup: SchemaGroup = {
            type: 'expandable',
            name: 'controls_popup',
            title: 'Controls popup',
            flatten: true,
            schema: [
                { name: 'controls_popup_enabled', selector: { boolean: {} } },
                { name: 'controls_popup_title', selector: { text: {} } },
                {
                    name: 'controls_popup_show',
                    selector: {
                        select: {
                            multiple: true,
                            options: DEFAULT_CONTROLS_ITEMS.map((v) => ({ value: v, label: v })),
                        },
                    },
                },
            ],
        };

        const opIcons: SchemaGroup = {
            type: 'expandable',
            name: 'operation_icons',
            title: 'Operation icons',
            flatten: true,
            schema: [
                { name: 'op_icons_enabled', selector: { boolean: {} } },
                {
                    name: 'op_icons_hidden',
                    selector: {
                        select: {
                            multiple: true,
                            options: DEFAULT_OP_ORDER.map((v) => ({ value: v, label: v })),
                        },
                    },
                },
            ],
        };

        const debug: SchemaGroup = {
            type: 'expandable',
            name: 'debug_panel',
            title: 'Debug',
            flatten: true,
            schema: [{ name: 'debug', selector: { boolean: {} } }],
        };

        return [general, layout, temps, airStatus, binary, controls, interactions, popup, opIcons, debug];
    }

    private _slotOptions() {
        return [
            'room',
            'supply',
            'outside',
            'extract',
            'exhaust',
            'humidity',
            'co2',
            'hotwater',
            'central_heat',
            'fan_level',
            'op_icons',
            'alarm',
            'menu',
            'element_bolt',
            'filter_days',
        ].map((v) => ({ value: v, label: v }));
    }

    private _computeLabel = (schema: SchemaItem): string => {
        const map: Record<string, string> = {
            device_id: 'Source device (for auto-fill)',
            scale: 'Overlay scale',
            hide_slots: 'Hide slots',
            controls_popup_enabled: 'Enable controls popup',
            controls_popup_title: 'Popup title',
            controls_popup_show: 'Controls to show',
            op_icons_enabled: 'Enable operation icons',
            op_icons_hidden: 'Hide operation icons',
        };
        return map[schema.name] ?? schema.name;
    };

    private _computeHelper = (schema: SchemaItem): string | undefined => {
        if (schema.name === 'device_id') {
            return 'Pick a Genvex Connect device, then click "Auto-fill entities".';
        }
        return undefined;
    };

    // ---- Flatten helpers (config <-> flat form data) ------------------------

    private _flattenLayout(): Record<string, any> {
        const l = this._config?.layout ?? {};
        return {
            scale: l.scale ?? 1,
            show_legend: l.show_legend ?? false,
            hide_slots: l.hide_slots ?? [],
        };
    }

    private _flattenInteractions(): Record<string, any> {
        const i = this._config?.interactions ?? {};
        return {
            default_tap_action: typeof i.default_tap_action === 'string' ? i.default_tap_action : 'more-info',
            menu_action: typeof i.menu_action === 'string' ? i.menu_action : 'controls-popup',
            alarm_action: typeof i.alarm_action === 'string' ? i.alarm_action : 'alarm-popup',
            long_press_enabled: i.long_press_enabled ?? false,
            haptic: i.haptic ?? false,
        };
    }

    private _flattenControlsPopup(): Record<string, any> {
        const p = this._config?.controls_popup ?? {};
        return {
            controls_popup_enabled: p.enabled ?? true,
            controls_popup_title: p.title ?? '',
            controls_popup_show: p.show ?? DEFAULT_CONTROLS_ITEMS,
        };
    }

    private _flattenOpIcons(): Record<string, any> {
        const o = this._config?.operation_icons ?? {};
        return {
            op_icons_enabled: o.enabled ?? true,
            op_icons_hidden: o.hidden ?? [],
        };
    }

    // ---- Change handling ----------------------------------------------------

    private _valueChanged = (ev: CustomEvent) => {
        if (!this._config) return;
        const v = ev.detail.value as Record<string, any>;
        const next: NilanHmiCardConfig = {
            ...this._config,
            type: this._config.type,
            name: v.name || undefined,
            theme: v.theme || undefined,
            language: v.language ?? 'auto',
            device_id: v.device_id || undefined,
            debug: v.debug || undefined,
            layout: this._cleanObj({
                scale: v.scale,
                show_legend: v.show_legend,
                hide_slots: v.hide_slots,
                coord_overrides: this._config.layout?.coord_overrides,
            }),
            interactions: this._cleanObj({
                default_tap_action: v.default_tap_action,
                menu_action: v.menu_action,
                alarm_action: v.alarm_action,
                long_press_enabled: v.long_press_enabled,
                haptic: v.haptic,
            }),
            controls_popup: this._cleanObj({
                enabled: v.controls_popup_enabled,
                title: v.controls_popup_title || undefined,
                show: v.controls_popup_show,
            }),
            operation_icons: this._cleanObj({
                enabled: v.op_icons_enabled,
                hidden: v.op_icons_hidden as OperationIconId[],
                order: this._config.operation_icons?.order,
                mapping: this._config.operation_icons?.mapping,
            }),
            slots: this._config.slots,
            strings: this._config.strings,
            entities: this._extractEntities(v),
        };
        this._fire(next);
    };

    private _cleanObj<T extends Record<string, any>>(o: T): T {
        const out: Record<string, any> = {};
        for (const [k, val] of Object.entries(o)) {
            if (val === undefined || val === '' || val === null) continue;
            if (Array.isArray(val) && val.length === 0) continue;
            out[k] = val;
        }
        return out as T;
    }

    private _extractEntities(v: Record<string, any>): NilanHmiCardConfig['entities'] {
        const keys = Object.keys(GENVEX_SUFFIX_MAP).concat(['co2', 'central_heat_flow', 'user_program', 'week_program']);
        const out: Record<string, string> = {};
        for (const k of keys) {
            if (typeof v[k] === 'string' && v[k]) out[k] = v[k];
        }
        return out as NilanHmiCardConfig['entities'];
    }

    private _autoFillFromDevice = () => {
        if (!this._config?.device_id || !this._registry) return;
        const entitiesForDevice = this._registry.filter((e) => e.device_id === this._config!.device_id);
        const updated: Record<string, string> = { ...(this._config.entities ?? {}) };
        for (const [key, suffix] of Object.entries(GENVEX_SUFFIX_MAP)) {
            if (updated[key]) continue;
            const match = entitiesForDevice.find((e) => e.entity_id.endsWith(`_${suffix}`));
            if (match) updated[key] = match.entity_id;
        }
        const next: NilanHmiCardConfig = { ...this._config, entities: updated };
        this._fire(next);
    };

    private _fire(next: NilanHmiCardConfig) {
        this._config = next;
        this.dispatchEvent(
            new CustomEvent('config-changed', {
                detail: { config: next },
                bubbles: true,
                composed: true,
            }),
        );
    }

    static styles = css`
    :host {
      display: block;
    }
    ha-form {
      display: block;
    }
    .autofill-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 12px;
      flex-wrap: wrap;
    }
    .autofill-btn {
      background: var(--primary-color, #d3232a);
      color: #fff;
      border: none;
      border-radius: 4px;
      padding: 8px 14px;
      cursor: pointer;
      font-weight: 600;
    }
    .hint {
      color: var(--secondary-text-color);
      font-size: 12px;
    }
  `;
}

declare global {
    interface HTMLElementTagNameMap {
        'nilan-hmi-card-editor': NilanHmiCardEditor;
    }
}
