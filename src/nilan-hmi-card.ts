import { LitElement, html, css, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import { classMap } from 'lit/directives/class-map.js';

import {
  CARD_TYPE,
  CARD_VERSION,
  DEFAULT_OP_ORDER,
  EDITOR_TYPE,
  GENVEX_SUFFIX_MAP,
  SLOT_COORDS,
  type Coord,
  type OperationIconId,
  type SlotId,
} from './const';
import {
  DEFAULT_CONTROLS_ITEMS,
  type HomeAssistant,
  type NilanHmiCardConfig,
  type SlotConfig,
} from './types';
import {
  ICON_ALARM,
  ICON_COMPRESSOR,
  ICON_COOL,
  ICON_DEFROST,
  ICON_HEAT,
  ICON_PRODUCE,
  ICON_PRODUCE_BOLT,
  ICON_STOP,
  ICON_USER,
  ICON_WEEK,
  MAIN_BG,
} from './generated/assets';
import {
  entity,
  entityNumber,
  entityState,
  entityUnit,
  fireMoreInfo,
  formatStateValue,
  handleAction,
  isOn,
} from './ha-helpers';
import { pickLang, t, type Lang } from './strings';

// Print version banner once.
// eslint-disable-next-line no-console
console.info(
  `%c NILAN-HMI-CARD %c v${CARD_VERSION} `,
  'color:white;background:#d3232a;font-weight:700;padding:2px 6px;border-radius:3px 0 0 3px;',
  'color:#d3232a;background:#fff;font-weight:700;padding:2px 6px;border:1px solid #d3232a;border-radius:0 3px 3px 0;',
);

// Register the card with the dashboard picker.
(window as any).customCards = (window as any).customCards ?? [];
(window as any).customCards.push({
  type: CARD_TYPE,
  name: 'Nilan HMI Card',
  description: 'Replicates the Nilan CTS602 HMI front screen.',
  preview: true,
  documentationURL: 'https://github.com/msvinth/ha-nilan-card',
});

const OP_ICON_ASSETS: Record<OperationIconId, string> = {
  compressor: ICON_COMPRESSOR,
  heat: ICON_HEAT,
  cool: ICON_COOL,
  hotwater: ICON_PRODUCE,
  defrost: ICON_DEFROST,
  stop: ICON_STOP,
  user: ICON_USER,
  week: ICON_WEEK,
  element: ICON_HEAT, // bolt rendered separately on hot-water tank
};

@customElement(CARD_TYPE)
export class NilanHmiCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @state() private _config?: NilanHmiCardConfig;
  @state() private _alarmsOpen = false;
  @state() private _controlsOpen = false;
  @state() private _designerPoints: Array<{ x: number; y: number; n: number }> = [];
  @state() private _designerOverrides: Partial<Record<SlotId, { x: number; y: number }>> = {};
  @state() private _designerForced: Record<string, boolean> = {};
  @state() private _designerPanelPos: { x: number; y: number } = { x: 4, y: 36 };
  private _panelDrag: { dx: number; dy: number } | null = null;
  private _dragOffset: { dx: number; dy: number } = { dx: 0, dy: 0 };

  public static async getConfigElement(): Promise<HTMLElement> {
    await import('./editor');
    return document.createElement(EDITOR_TYPE);
  }

  public static getStubConfig(): Partial<NilanHmiCardConfig> {
    return { entities: {} };
  }

  public setConfig(config: NilanHmiCardConfig): void {
    if (!config) throw new Error('Invalid configuration');
    this._config = { ...config, entities: { ...(config.entities ?? {}) } };
  }

  public getCardSize(): number {
    return 6;
  }

  public getGridOptions(): Record<string, unknown> {
    return { rows: 6, columns: 6, min_rows: 4, min_columns: 4 };
  }

  protected shouldUpdate(changed: PropertyValues): boolean {
    if (changed.has('_config') || changed.has('_alarmsOpen') || changed.has('_controlsOpen')) {
      return true;
    }
    if (!changed.has('hass')) return false;
    const prev = changed.get('hass') as HomeAssistant | undefined;
    const next = this.hass;
    if (!prev || !next) return true;
    for (const id of this._watchedEntities()) {
      if (prev.states[id]?.state !== next.states[id]?.state) return true;
      if (prev.states[id]?.attributes !== next.states[id]?.attributes) return true;
    }
    return false;
  }

  private _watchedEntities(): string[] {
    const out = new Set<string>();
    const ents = this._config?.entities ?? {};
    for (const v of Object.values(ents)) if (typeof v === 'string') out.add(v);
    const mapping = this._config?.operation_icons?.mapping ?? {};
    for (const v of Object.values(mapping))
      if (v?.entity && typeof v.entity === 'string') out.add(v.entity);
    return [...out];
  }

  private get _lang(): Lang {
    return pickLang(this.hass?.language, this._config?.language);
  }

  private _txt(key: string): string {
    return t(key, this._lang, this._config?.strings);
  }

  private _slotCoord(id: SlotId): Coord {
    const base = { ...SLOT_COORDS[id], ...(this._config?.layout?.coord_overrides?.[id] ?? {}) };
    const drag = this._designerOverrides[id];
    return drag ? { ...base, x: drag.x, y: drag.y } : base;
  }

  private _slotConfig(id: SlotId): SlotConfig {
    return this._config?.slots?.[id] ?? {};
  }

  private _slotHidden(id: SlotId, entityId?: string): boolean {
    const hide = this._config?.layout?.hide_slots;
    if (hide?.includes(id)) return true;
    const cfg = this._slotConfig(id);
    if (cfg.hidden) return true;
    // In designer mode keep slots visible so they can be positioned even without an entity.
    if (this._config?.layout?.designer) return false;
    if (entityId && !this.hass?.states[entityId]) return true;
    if (entityId == null) return true;
    return false;
  }

  protected render(): TemplateResult {
    if (!this._config) return html``;
    if (!this.hass) {
      return html`<ha-card class="root"><div class="msg">${this._txt('common.unavailable')}</div></ha-card>`;
    }

    const ents = this._config.entities ?? {};
    const hasAny = Object.values(ents).some(Boolean);
    if (!hasAny) {
      return html`
        <ha-card class="root">
          <div class="stage preview" style=${styleMap({ aspectRatio: '2/3' })}>
            <img class="bg" src=${MAIN_BG} alt="Nilan HMI preview" />
          </div>
          <div class="msg unconfigured">${this._txt('card.unconfigured')}</div>
        </ha-card>
      `;
    }

    return html`
      <ha-card class="root" .header=${this._config.name || undefined}>
        <div
          class="stage ${classMap({ debug: !!this._config.debug, designer: !!this._config.layout?.designer })}"
          style=${styleMap({ aspectRatio: '2/3' })}
        >
          <img class="bg" src=${MAIN_BG} alt="" aria-hidden="true" />
          ${this._renderMenu()} ${this._renderAlarm()} ${this._renderOpIcons()}
          ${this._renderTempSlot('outside', ents.temperature_outside_air, 'slot.outside')}
          ${this._renderTempSlot('exhaust', ents.temperature_exhaust_air, 'slot.exhaust')}
          ${this._renderRoom()}
          ${this._renderTempSlot('supply', ents.temperature_supply_air, 'slot.supply')}
          ${this._renderTempSlot('evaporator', ents.temperature_before_condenser, 'slot.evaporator')}
          ${this._renderTempSlot('heatpump_outdoor', ents.temperature_after_condenser, 'slot.heatpump_outdoor')}
          ${this._renderFanLevel()}
          ${this._renderHumidity()}
          ${this._renderCo2()}
          ${this._renderHotwater()}
          ${this._renderHotwaterBottom()}
          ${this._renderCentralHeat()}
          ${this._renderElementBolt()}
          ${this._renderFilterDays()}
          ${this._config.layout?.designer ? this._renderDesignerOverlay() : nothing}
        </div>
        ${this._alarmsOpen ? this._renderAlarmsPopup() : nothing}
        ${this._controlsOpen ? this._renderControlsPopup() : nothing}
      </ha-card>
    `;
  }

  // ---- Slot renderers -----------------------------------------------------

  private _renderTempSlot(id: SlotId, entityId: string | undefined, labelKey: string) {
    if (this._slotHidden(id, entityId)) return nothing;
    const cfg = this._slotConfig(id);
    const ent = entity(this.hass, entityId);
    const unit = cfg.unit ?? entityUnit(this.hass, entityId) ?? '°C';
    const value = formatStateValue(this.hass, ent, cfg.decimals ?? 1, cfg.attribute);
    const color = this._colorFor(cfg, entityNumber(this.hass, entityId));
    const showLabel = !!cfg.label || this._config?.layout?.show_legend;
    return this._slotBox(id, html`
      <div class="value temp" style=${styleMap(color ? { color } : {})}>
        <span class="num">${value}</span><span class="unit">${unit}</span>
      </div>
      ${showLabel ? html`<div class="lbl">${cfg.label ?? this._txt(labelKey)}</div>` : nothing}
    `, entityId, cfg);
  }

  private _renderRoom() {
    const id: SlotId = 'room';
    const ents = this._config!.entities ?? {};
    const entityId = ents.temperature_room;
    if (this._slotHidden(id, entityId)) return nothing;
    const cfg = this._slotConfig(id);
    const ent = entity(this.hass, entityId);
    const unit = cfg.unit ?? entityUnit(this.hass, entityId) ?? '°C';
    const value = formatStateValue(this.hass, ent, cfg.decimals ?? 1, cfg.attribute);
    const color = this._colorFor(cfg, entityNumber(this.hass, entityId));
    const showLabel = !!cfg.label || this._config?.layout?.show_legend;
    return this._slotBox(id, html`
      <div class="value temp" style=${styleMap(color ? { color } : {})}>
        <span class="num">${value}</span><span class="unit">${unit}</span>
      </div>
      ${showLabel
        ? html`<div class="lbl">${cfg.label ?? this._txt('slot.room')}</div>`
        : nothing}
    `, entityId, cfg);
  }

  private _renderHumidity() {
    const id: SlotId = 'humidity';
    const ents = this._config!.entities ?? {};
    const entityId = ents.humidity;
    if (this._slotHidden(id, entityId)) return nothing;
    const cfg = this._slotConfig(id);
    const ent = entity(this.hass, entityId);
    const unit = cfg.unit ?? entityUnit(this.hass, entityId) ?? '%';
    const value = formatStateValue(this.hass, ent, cfg.decimals ?? 0, cfg.attribute);
    return this._slotBox(id, html`
      <div class="value humidity">
        <span class="num">${value}</span><span class="unit">${unit}</span>
      </div>
    `, entityId, cfg);
  }

  private _renderCo2() {
    const id: SlotId = 'co2';
    const ents = this._config!.entities ?? {};
    const entityId = ents.co2;
    if (this._slotHidden(id, entityId)) return nothing;
    const cfg = this._slotConfig(id);
    const ent = entity(this.hass, entityId);
    const unit = cfg.unit ?? entityUnit(this.hass, entityId) ?? 'ppm';
    const value = formatStateValue(this.hass, ent, cfg.decimals ?? 0, cfg.attribute);
    return this._slotBox(id, html`
      <div class="value co2">
        <span class="num">${value}</span><span class="unit">${unit}</span>
      </div>
    `, entityId, cfg);
  }

  private _renderHotwater() {
    const id: SlotId = 'hotwater';
    const ents = this._config!.entities ?? {};
    const entityId = ents.temperature_hotwater_top;
    if (this._slotHidden(id, entityId)) return nothing;
    const cfg = this._slotConfig(id);
    const ent = entity(this.hass, entityId);
    const unit = cfg.unit ?? '°C';
    const value = formatStateValue(this.hass, ent, cfg.decimals ?? 0, cfg.attribute);
    return this._slotBox(id, html`
      <div class="value hotwater">
        <span class="num">${value}</span><span class="unit">${unit}</span>
      </div>
    `, entityId, cfg);
  }

  private _renderHotwaterBottom() {
    const id: SlotId = 'hotwater_bottom';
    const ents = this._config!.entities ?? {};
    const entityId = ents.temperature_hotwater_bottom;
    if (this._slotHidden(id, entityId)) return nothing;
    const cfg = this._slotConfig(id);
    const ent = entity(this.hass, entityId);
    const unit = cfg.unit ?? '°C';
    const value = formatStateValue(this.hass, ent, cfg.decimals ?? 0, cfg.attribute);
    return this._slotBox(id, html`
      <div class="value hotwater">
        <span class="num">${value}</span><span class="unit">${unit}</span>
      </div>
    `, entityId, cfg);
  }

  private _renderCentralHeat() {
    const id: SlotId = 'central_heat';
    const ents = this._config!.entities ?? {};
    const entityId = ents.central_heat_flow;
    if (this._slotHidden(id, entityId)) return nothing;
    const cfg = this._slotConfig(id);
    const ent = entity(this.hass, entityId);
    const unit = cfg.unit ?? '°C';
    const value = formatStateValue(this.hass, ent, cfg.decimals ?? 0, cfg.attribute);
    return this._slotBox(id, html`
      <div class="value central">
        <span class="num">${value}</span><span class="unit">${unit}</span>
      </div>
    `, entityId, cfg);
  }

  private _renderElementBolt() {
    const id: SlotId = 'element_bolt';
    const ents = this._config!.entities ?? {};
    const entityId = ents.heating_element;
    if (this._slotHidden(id, entityId)) return nothing;
    if (!isOn(this.hass, entityId) && !this._isForced('element_bolt')) return nothing;
    const cfg = this._slotConfig(id);
    return this._slotBox(id, html`<ha-icon class="bolt" icon="mdi:lightning-bolt" title="el-supplement"></ha-icon>`, entityId, cfg);
  }

  private _renderFanLevel() {
    const id: SlotId = 'fan_level';
    const ents = this._config!.entities ?? {};
    const entityId = ents.fan_level_supply ?? ents.fan_level;
    if (this._slotHidden(id, entityId)) return nothing;
    const cfg = this._slotConfig(id);
    const ent = entity(this.hass, entityId);
    const value = ent?.state ?? '–';
    return this._slotBox(id, html`<div class="fan-level">${value}</div>`, entityId, cfg);
  }

  private _renderFilterDays() {
    const id: SlotId = 'filter_days';
    const ents = this._config!.entities ?? {};
    const entityId = ents.days_left_filter;
    if (this._slotHidden(id, entityId)) return nothing;
    const cfg = this._slotConfig(id);
    const days = entityNumber(this.hass, entityId);
    if (days == null) return nothing;
    const warn = days < 14;
    return this._slotBox(id, html`
      <div class="filter ${warn ? 'warn' : ''}">
        ${this._txt('slot.filter_days')}: ${days}d
      </div>
    `, entityId, cfg);
  }

  private _isForced(key: string): boolean {
    return !!this._config?.layout?.designer && !!this._designerForced[key];
  }

  private _toggleForced(key: string) {
    this._designerForced = { ...this._designerForced, [key]: !this._designerForced[key] };
  }

  private _onPanelDragStart(ev: PointerEvent) {
    if ((ev.target as HTMLElement).tagName === 'INPUT' || (ev.target as HTMLElement).tagName === 'LABEL') return;
    ev.preventDefault();
    ev.stopPropagation();
    const panel = ev.currentTarget as HTMLElement;
    const rect = panel.getBoundingClientRect();
    this._panelDrag = { dx: ev.clientX - rect.left, dy: ev.clientY - rect.top };
    const move = (e: PointerEvent) => {
      if (!this._panelDrag) return;
      const stage = panel.parentElement!;
      const sb = stage.getBoundingClientRect();
      this._designerPanelPos = {
        x: Math.max(0, Math.min(sb.width - 20, e.clientX - sb.left - this._panelDrag.dx)),
        y: Math.max(0, Math.min(sb.height - 20, e.clientY - sb.top - this._panelDrag.dy)),
      };
    };
    const up = () => {
      this._panelDrag = null;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  private _renderDesignerOverlay() {
    const count = Object.keys(this._designerOverrides).length;
    const forcedCount = Object.values(this._designerForced).filter(Boolean).length;
    const toggles: Array<{ key: string; label: string }> = [
      { key: 'op:compressor', label: 'compressor' },
      { key: 'op:heat', label: 'heat' },
      { key: 'op:cool', label: 'cool' },
      { key: 'op:hotwater', label: 'hotwater' },
      { key: 'op:defrost', label: 'defrost' },
      { key: 'op:stop', label: 'stop' },
      { key: 'op:user', label: 'user' },
      { key: 'op:week', label: 'week' },
      { key: 'op:element', label: 'element' },
      { key: 'element_bolt', label: 'tank bolt' },
    ];
    const panelStyle = `left:${this._designerPanelPos.x}px; top:${this._designerPanelPos.y}px; right:auto;`;
    return html`
      <div class="designer-bar" @pointerdown=${(e: Event) => e.stopPropagation()}>
        <span class="designer-hint">drag any slot · ${count} moved · ${forcedCount} forced</span>
        <button class="designer-btn" @click=${this._onDesignerExport}>Export coords</button>
        <button class="designer-btn" @click=${this._onDesignerReset}>Reset</button>
      </div>
      <div class="designer-preview" style=${panelStyle}
        @pointerdown=${(ev: PointerEvent) => this._onPanelDragStart(ev)}>
        <div class="designer-preview-title">☰ Force ON (preview)</div>
        ${toggles.map((t) => html`
          <label class="designer-toggle">
            <input type="checkbox" .checked=${!!this._designerForced[t.key]}
              @change=${() => this._toggleForced(t.key)} />
            <span>${t.label}</span>
          </label>
        `)}
      </div>
      ${this._designerPoints.map(
      () => html`<div class="designer-toast">copied to clipboard</div>`,
    )}
    `;
  }

  private _renderMenu() {
    const id: SlotId = 'menu';
    const coord = this._slotCoord(id);
    if (this._config?.layout?.hide_slots?.includes(id)) return nothing;
    const designer = !!this._config?.layout?.designer;
    return html`
      <button
        class="menu-btn ${designer ? 'draggable' : ''}"
        style=${this._coordStyle(coord)}
        @pointerdown=${designer ? (ev: PointerEvent) => this._onDragStart(ev, id) : undefined}
        @click=${designer ? undefined : this._onMenu}
        title=${designer ? `${this._slotLabel(id)} (drag to position)` : this._txt('controls.title')}
      >
        ${designer ? html`<span class="designer-tag">${id}</span>` : nothing}
      </button>
    `;
  }

  private _renderAlarm() {
    const id: SlotId = 'alarm';
    const coord = this._slotCoord(id);
    const ents = this._config!.entities ?? {};
    if (this._config?.layout?.hide_slots?.includes(id)) return nothing;
    const count = entityNumber(this.hass, ents.active_alarm_count) ?? 0;
    const designer = !!this._config?.layout?.designer;
    // In designer mode show the icon even without an active alarm so it can be placed.
    if (count <= 0 && !designer) return nothing;
    return html`
      <button
        class="alarm-btn active ${designer ? 'draggable' : ''}"
        style=${this._coordStyle(coord)}
        @pointerdown=${designer ? (ev: PointerEvent) => this._onDragStart(ev, id) : undefined}
        @click=${designer ? undefined : this._onAlarm}
        title=${designer ? `${this._slotLabel(id)} (drag to position)` : `${this._txt('alarm.title')} (${count})`}
      >
        <img src=${ICON_ALARM} alt="alarm" />
        ${count > 0 ? html`<span class="badge">${count}</span>` : nothing}
        ${designer ? html`<span class="designer-tag">${id}</span>` : nothing}
      </button>
    `;
  }

  private _renderOpIcons() {
    const cfg = this._config?.operation_icons;
    if (cfg?.enabled === false) return nothing;
    const order = (cfg?.order ?? DEFAULT_OP_ORDER).filter(
      (i) => !(cfg?.hidden ?? []).includes(i),
    );
    const coord = this._slotCoord('op_icons');
    const designer = !!this._config?.layout?.designer;
    const items = order.map((iconId) => this._opIconItem(iconId)).filter(Boolean);
    // In designer mode render a placeholder so the strip is visible and draggable.
    if (items.length === 0 && !designer) return nothing;
    const body = items.length > 0 ? items : html`<span class="op-placeholder">ops</span>`;
    return html`
      <div
        class="op-icons ${designer ? 'draggable' : ''}"
        style=${this._coordStyle(coord)}
        title=${this._slotLabel('op_icons')}
        @pointerdown=${designer ? (ev: PointerEvent) => this._onDragStart(ev, 'op_icons') : undefined}
      >
        ${body}
        ${designer ? html`<span class="designer-tag">op_icons</span>` : nothing}
      </div>
    `;
  }

  private _opIconItem(iconId: OperationIconId): unknown {
    const mapping = this._config?.operation_icons?.mapping?.[iconId];
    const ents = this._config!.entities ?? {};
    let entityId: string | undefined;
    let onStates: string[] | undefined;

    switch (iconId) {
      case 'compressor':
        entityId = mapping?.entity ?? ents.heatpump;
        onStates = mapping?.on_states;
        break;
      case 'cool':
        entityId = mapping?.entity ?? ents.heatpump_operation_state;
        onStates = mapping?.on_states ?? ['cooling', 'cool', 'state_4'];
        break;
      case 'element':
        entityId = mapping?.entity ?? ents.heating_element;
        onStates = mapping?.on_states;
        break;
      case 'heat':
        entityId = mapping?.entity ?? ents.climate;
        onStates = mapping?.on_states ?? ['heat', 'heating', 'auto'];
        break;
      case 'hotwater':
        entityId = mapping?.entity ?? ents.status;
        onStates = mapping?.on_states ?? ['hot_water', 'state_2', 'state_3'];
        break;
      case 'defrost':
        entityId = mapping?.entity ?? ents.heatpump_operation_state;
        onStates = mapping?.on_states ?? ['defrost', 'state_5'];
        break;
      case 'stop':
        entityId = mapping?.entity ?? ents.status;
        onStates = mapping?.on_states ?? ['stopped', 'off', 'state_0'];
        break;
      case 'user':
        entityId = mapping?.entity ?? ents.user_program;
        onStates = mapping?.on_states ?? ['on', 'active'];
        break;
      case 'week':
        entityId = mapping?.entity ?? ents.week_program;
        onStates = mapping?.on_states ?? ['on', 'active'];
        break;
    }

    let active = false;
    if (iconId === 'heat') {
      // Use hvac_action attribute when available.
      const climate = entity(this.hass, entityId);
      const action = climate?.attributes?.hvac_action ?? climate?.state;
      active = onStates?.includes(String(action)) ?? false;
    } else {
      active = isOn(this.hass, entityId, onStates);
    }
    if (this._isForced(`op:${iconId}`)) active = true;

    if (!active) return null;
    let src = OP_ICON_ASSETS[iconId];
    const elOn = isOn(this.hass, this._config?.entities?.heating_element) || this._isForced('element_bolt');
    if (iconId === 'hotwater' && elOn) {
      src = ICON_PRODUCE_BOLT;
    }
    return html`<img class="op-icon" src=${src} alt=${iconId} title=${iconId} />`;
  }

  // ---- Generic slot helpers -----------------------------------------------

  private _slotBox(
    id: SlotId,
    content: unknown,
    entityId: string | undefined,
    cfg: SlotConfig,
  ) {
    const coord = this._slotCoord(id);
    const interactive = !!entityId;
    const designer = !!this._config?.layout?.designer;
    return html`
      <div
        class="slot slot-${id} ${interactive ? 'interactive' : ''} ${designer ? 'draggable' : ''}"
        style=${this._coordStyle(coord)}
        title=${this._slotTooltip(id, entityId, cfg)}
        @pointerdown=${designer ? (ev: PointerEvent) => this._onDragStart(ev, id) : undefined}
        @click=${interactive && !designer
        ? (ev: Event) => this._onSlotClick(ev, entityId!, cfg)
        : undefined}
      >
        ${content}
        ${designer ? html`<span class="designer-tag">${id}</span>` : nothing}
      </div>
    `;
  }

  private _slotTooltip(id: SlotId, entityId: string | undefined, cfg: SlotConfig): string {
    const label = cfg.label ?? this._txt(`slot.${id}`);
    const friendly = this._slotLabel(id);
    const displayLabel = label && !label.startsWith('slot.') ? label : friendly;
    if (!entityId) return `${displayLabel} (not configured)`;
    const ent = this.hass?.states[entityId];
    const friendlyEnt = ent?.attributes?.friendly_name;
    const state = ent ? `${ent.state}${ent.attributes?.unit_of_measurement ? ' ' + ent.attributes.unit_of_measurement : ''}` : 'unavailable';
    const parts = [`${displayLabel}: ${state}`, entityId];
    if (friendlyEnt && friendlyEnt !== entityId) parts.push(friendlyEnt);
    return parts.join('\n');
  }

  private _slotLabel(id: SlotId): string {
    const key = `slot.${id}`;
    const txt = this._txt(key);
    if (txt && txt !== key) return txt;
    // Fallback: humanise the slot id
    return id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  private _coordStyle(coord: Coord): string {
    const w = coord.w ?? 18;
    const h = coord.h ?? 8;
    return `left:${coord.x}%;top:${coord.y}%;width:${w}%;height:${h}%;transform:translate(-50%,-50%);`;
  }

  private _colorFor(cfg: SlotConfig, value?: number): string | undefined {
    if (cfg.color) return cfg.color;
    if (cfg.thresholds && value != null) {
      const sorted = [...cfg.thresholds].sort((a, b) => a.value - b.value);
      let pick: string | undefined;
      for (const t of sorted) if (value >= t.value) pick = t.color;
      return pick;
    }
    return undefined;
  }

  // ---- Interactions -------------------------------------------------------

  private _onDragStart = (ev: PointerEvent, id: SlotId) => {
    ev.preventDefault();
    ev.stopPropagation();
    const el = ev.currentTarget as HTMLElement;
    const stage = el.parentElement!;
    const stageRect = stage.getBoundingClientRect();
    const coord = this._slotCoord(id);
    const cx = stageRect.left + (coord.x / 100) * stageRect.width;
    const cy = stageRect.top + (coord.y / 100) * stageRect.height;
    this._dragOffset = { dx: ev.clientX - cx, dy: ev.clientY - cy }; try {
      el.setPointerCapture(ev.pointerId);
    } catch {
      // ignore
    }
    let pendingX = coord.x;
    let pendingY = coord.y;
    let rafId = 0;
    const apply = () => {
      rafId = 0;
      el.style.left = pendingX + '%';
      el.style.top = pendingY + '%';
    };
    const onMove = (e: PointerEvent) => {
      pendingX = Math.round(
        (((e.clientX - this._dragOffset.dx - stageRect.left) / stageRect.width) * 100) * 10,
      ) / 10;
      pendingY = Math.round(
        (((e.clientY - this._dragOffset.dy - stageRect.top) / stageRect.height) * 100) * 10,
      ) / 10;
      if (!rafId) rafId = requestAnimationFrame(apply);
    };
    const onUp = () => {
      if (rafId) cancelAnimationFrame(rafId);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      this._designerOverrides = {
        ...this._designerOverrides,
        [id]: { x: pendingX, y: pendingY },
      };
    };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
  };

  private _onDesignerExport = () => {
    const merged: Record<string, Coord> = {};
    for (const id of Object.keys(SLOT_COORDS) as SlotId[]) {
      merged[id] = this._slotCoord(id);
    }
    const lines = ['export const SLOT_COORDS: Record<SlotId, Coord> = {'];
    for (const [id, c] of Object.entries(merged)) {
      const w = c.w != null ? `, w: ${c.w}` : '';
      const h = c.h != null ? `, h: ${c.h}` : '';
      lines.push(`    ${id}: { x: ${c.x}, y: ${c.y}${w}${h} },`);
    }
    lines.push('};');
    const text = lines.join('\n');
    // eslint-disable-next-line no-console
    console.log('[nilan-hmi designer] SLOT_COORDS:\n' + text);
    if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => undefined);
    // brief on-screen confirmation via re-render
    this._designerPoints = [{ x: 50, y: 50, n: this._designerPoints.length + 1 }];
    setTimeout(() => (this._designerPoints = []), 1200);
  };

  private _onDesignerReset = () => {
    this._designerOverrides = {};
  };

  private _onSlotClick(_ev: Event, entityId: string, cfg: SlotConfig) {
    const action =
      cfg.tap_action ??
      this._config?.interactions?.default_tap_action ??
      ('more-info' as const);
    if (action === 'none' || (typeof action === 'object' && action.action === 'none')) return;
    handleAction(this, this.hass!, action, entityId);
  }

  private _onMenu = () => {
    const action = this._config?.interactions?.menu_action ?? 'controls-popup';
    if (action === 'controls-popup') {
      this._controlsOpen = true;
      return;
    }
    if (action === 'more-info') {
      const climateId = this._config?.entities?.climate;
      if (climateId) fireMoreInfo(this, climateId);
      return;
    }
    handleAction(this, this.hass!, action as any);
  };

  private _onAlarm = () => {
    const action = this._config?.interactions?.alarm_action ?? 'alarm-popup';
    if (action === 'alarm-popup') {
      this._alarmsOpen = true;
      return;
    }
    if (action === 'more-info') {
      const id = this._config?.entities?.active_alarm_list ?? this._config?.entities?.active_alarm_count;
      if (id) fireMoreInfo(this, id);
      return;
    }
    handleAction(this, this.hass!, action as any);
  };

  // ---- Popups -------------------------------------------------------------

  private _renderAlarmsPopup() {
    const ents = this._config!.entities ?? {};
    const list = entityState(this.hass, ents.active_alarm_list) ?? '';
    const count = entityNumber(this.hass, ents.active_alarm_count) ?? 0;
    const items = list && list.toLowerCase() !== 'no alarm'
      ? list.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean)
      : [];
    return html`
      <div class="popup-backdrop" @click=${() => (this._alarmsOpen = false)}>
        <div class="popup" @click=${(e: Event) => e.stopPropagation()}>
          <div class="popup-head">
            <span>${this._txt('alarm.title')} (${count})</span>
            <button class="popup-close" @click=${() => (this._alarmsOpen = false)}>
              ${this._txt('common.close')}
            </button>
          </div>
          <div class="popup-body">
            ${items.length === 0
        ? html`<div class="empty">${this._txt('alarm.none')}</div>`
        : html`<ul>${items.map((it) => html`<li>${it}</li>`)}</ul>`}
          </div>
        </div>
      </div>
    `;
  }

  private _renderControlsPopup() {
    const cfg = this._config?.controls_popup ?? {};
    const items = cfg.show ?? DEFAULT_CONTROLS_ITEMS;
    const ents = this._config!.entities ?? {};
    return html`
      <div class="popup-backdrop" @click=${() => (this._controlsOpen = false)}>
        <div class="popup" @click=${(e: Event) => e.stopPropagation()}>
          <div class="popup-head">
            <span>${cfg.title ?? this._txt('controls.title')}</span>
            <button class="popup-close" @click=${() => (this._controlsOpen = false)}>
              ${this._txt('common.close')}
            </button>
          </div>
          <div class="popup-body">
            ${items.map((id) => this._renderControlItem(id, ents))}
          </div>
        </div>
      </div>
    `;
  }

  private _renderControlItem(item: string, ents: NonNullable<NilanHmiCardConfig['entities']>) {
    const label = this._txt(`controls.${item}`);
    const row = (id: string | undefined, body: TemplateResult) =>
      html`<div class="ctrl-row">
        <div class="ctrl-lbl">${label}</div>
        ${id ? body : html`<div class="ctrl-na">${this._txt('controls.unavailable')}</div>`}
      </div>`;
    switch (item) {
      case 'target_temp':
        return row(ents.temperature_target, this._numberInput(ents.temperature_target!));
      case 'temperature_offset':
        return row(ents.temperature_offset, this._numberInput(ents.temperature_offset!));
      case 'hotwater_target':
        return row(ents.hotwater_temperature_target, this._numberInput(ents.hotwater_temperature_target!));
      case 'hotwater_booster_max':
        return row(ents.hotwater_booster_max_temperature, this._numberInput(ents.hotwater_booster_max_temperature!));
      case 'summer_min':
        return row(ents.summer_min_supply_air_temperature, this._numberInput(ents.summer_min_supply_air_temperature!));
      case 'summer_max':
        return row(ents.summer_max_supply_air_temperature, this._numberInput(ents.summer_max_supply_air_temperature!));
      case 'fan_level':
        return row(ents.fan_level, this._selectInput(ents.fan_level!));
      case 'antilegionella':
        return row(ents.antilegionella, this._selectInput(ents.antilegionella!));
      case 'cooling_priority':
        return row(ents.cooling_priority, this._selectInput(ents.cooling_priority!));
      case 'cooling_start_offset':
        return row(ents.cooling_start_offset, this._selectInput(ents.cooling_start_offset!));
      case 'climate_mode':
        return row(ents.climate, this._climateModeInput(ents.climate!));
      case 'reset_filter':
        return row(ents.reset_filter, html`
          <button class="ctrl-btn" @click=${() => this._pressButton(ents.reset_filter!)}>
            ${this._txt('controls.reset_filter')}
          </button>
        `);
      default:
        return nothing;
    }
  }

  private _numberInput(entityId: string) {
    const ent = entity(this.hass, entityId);
    const value = entityNumber(this.hass, entityId);
    const min = Number(ent?.attributes?.min ?? 0);
    const max = Number(ent?.attributes?.max ?? 100);
    const step = Number(ent?.attributes?.step ?? 1);
    const unit = ent?.attributes?.unit_of_measurement ?? '';
    return html`
      <div class="ctrl-num">
        <button @click=${() => this._setNumber(entityId, (value ?? 0) - step, min, max)}>−</button>
        <span>${value ?? '–'}${unit}</span>
        <button @click=${() => this._setNumber(entityId, (value ?? 0) + step, min, max)}>+</button>
      </div>
    `;
  }

  private _setNumber(entityId: string, value: number, min: number, max: number) {
    const v = Math.max(min, Math.min(max, value));
    this.hass?.callService('number', 'set_value', { entity_id: entityId, value: v });
  }

  private _selectInput(entityId: string) {
    const ent = entity(this.hass, entityId);
    const options: string[] = ent?.attributes?.options ?? [];
    const cur = ent?.state ?? '';
    return html`
      <select
        class="ctrl-select"
        @change=${(e: Event) =>
        this.hass?.callService('select', 'select_option', {
          entity_id: entityId,
          option: (e.target as HTMLSelectElement).value,
        })}
      >
        ${options.map(
          (opt) => html`<option value=${opt} ?selected=${opt === cur}>${opt}</option>`,
        )}
      </select>
    `;
  }

  private _climateModeInput(entityId: string) {
    const ent = entity(this.hass, entityId);
    const modes: string[] = ent?.attributes?.hvac_modes ?? [];
    const cur = ent?.state ?? '';
    return html`
      <select
        class="ctrl-select"
        @change=${(e: Event) =>
        this.hass?.callService('climate', 'set_hvac_mode', {
          entity_id: entityId,
          hvac_mode: (e.target as HTMLSelectElement).value,
        })}
      >
        ${modes.map(
          (m) => html`<option value=${m} ?selected=${m === cur}>${m}</option>`,
        )}
      </select>
    `;
  }

  private _pressButton(entityId: string) {
    this.hass?.callService('button', 'press', { entity_id: entityId });
  }

  // ---- Styles -------------------------------------------------------------

  static styles = css`
    :host {
      display: block;
    }
    .root {
      overflow: hidden;
      position: relative;
    }
    .msg {
      padding: 24px;
      text-align: center;
      color: var(--secondary-text-color);
    }
    .stage {
      position: relative;
      width: 100%;
      container-type: inline-size;
      font-family: var(--primary-font-family, 'Roboto', system-ui, sans-serif);
      color: var(--primary-text-color);
    }
    .bg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: contain;
      pointer-events: none;
      user-select: none;
    }
    .slot {
      position: absolute;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      line-height: 1.1;
      gap: 0;
    }
    .slot.interactive {
      cursor: pointer;
      border-radius: 6px;
      transition: background 120ms ease;
    }
    .slot.interactive:hover {
      background: rgba(0, 0, 0, 0.04);
    }
    .value {
      display: flex;
      align-items: baseline;
      justify-content: center;
      gap: 1px;
    }
    .num {
      font-size: clamp(13px, 3cqw, 26px);
      font-weight: 700;
      color: #1f1f1f;
      letter-spacing: -0.02em;
    }
    .unit {
      font-size: clamp(8px, 1.6cqw, 14px);
      font-weight: 500;
      opacity: 0.75;
      margin-left: 2px;
    }
    .lbl {
      font-size: clamp(7px, 1.2cqw, 11px);
      opacity: 0.55;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 1px;
    }
    .lbl.tiny {
      font-size: clamp(6px, 1cqw, 10px);
      text-transform: none;
      letter-spacing: 0;
      opacity: 0.7;
      margin-top: 0;
    }
    .value.hotwater,
    .value.central {
      color: #fff;
      font-weight: 800;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
    }
    .value.hotwater .num,
    .value.central .num {
      color: inherit;
      font-size: clamp(14px, 3.2cqw, 26px);
    }
    .value.hotwater .unit,
    .value.central .unit {
      color: inherit;
      opacity: 0.85;
    }
    .value.central {
      color: var(--primary-text-color);
      text-shadow: none;
    }
    .value.humidity .num,
    .value.co2 .num {
      color: #d3232a;
      font-weight: 800;
    }
    .filter {
      font-size: clamp(8px, 1.4cqw, 12px);
      color: var(--secondary-text-color);
    }
    .filter.warn {
      color: #d3232a;
      font-weight: 700;
    }
    .fan-level {
      font-size: clamp(11px, 2.2cqw, 18px);
      font-weight: 800;
      color: #1f1f1f;
      background: rgba(255, 255, 255, 0.92);
      border-radius: 999px;
      padding: 1px 8px;
      min-width: 18px;
      text-align: center;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
    }
    .menu-btn,
    .alarm-btn {
      position: absolute;
      background: transparent;
      border: none;
      padding: 0;
      cursor: pointer;
      transform: translate(-50%, -50%);
    }
    .menu-bars {
      display: inline-flex;
      flex-direction: column;
      gap: clamp(1px, 0.4cqw, 4px);
    }
    .menu-bars span {
      width: clamp(14px, 3cqw, 26px);
      height: clamp(2px, 0.5cqw, 4px);
      background: #d3232a;
      border-radius: 1px;
    }
    .menu-bars span:nth-child(2) {
      width: clamp(10px, 2.2cqw, 20px);
    }
    .menu-bars span:nth-child(3) {
      width: clamp(7px, 1.6cqw, 14px);
    }
    .alarm-btn img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      filter: grayscale(1) opacity(0.35);
    }
    .alarm-btn.active img {
      filter: none;
    }
    .alarm-btn .badge {
      position: absolute;
      top: -4px;
      right: -4px;
      background: #d3232a;
      color: #fff;
      font-size: 10px;
      font-weight: 700;
      border-radius: 999px;
      padding: 0 5px;
      min-width: 16px;
      text-align: center;
    }
    .op-icons {
      position: absolute;
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: flex-end;
      flex-wrap: nowrap;
      gap: clamp(2px, 0.6cqw, 6px);
      transform: translate(-50%, -50%);
    }
    .op-icon {
      height: 100%;
      width: auto;
      object-fit: contain;
    }
    .bolt {
      color: #fff;
      --mdc-icon-size: clamp(28px, 6cqw, 52px);
      filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5));
    }
    .debug .slot {
      outline: 1px dashed rgba(211, 35, 42, 0.5);
    }
    .debug .menu-btn,
    .debug .alarm-btn,
    .debug .op-icons {
      outline: 1px dashed rgba(0, 0, 255, 0.4);
    }
    .designer {
      cursor: default;
    }
    .slot.draggable {
      cursor: move;
      outline: 1px dashed rgba(211, 35, 42, 0.6);
      background: rgba(211, 35, 42, 0.08);
      touch-action: none;
    }
    .slot.draggable:hover {
      background: rgba(211, 35, 42, 0.18);
    }
    .menu-btn.draggable,
    .alarm-btn.draggable,
    .op-icons.draggable {
      cursor: move;
      outline: 1px dashed rgba(211, 35, 42, 0.6);
      background: rgba(211, 35, 42, 0.08);
      touch-action: none;
    }
    .op-placeholder {
      font-size: 10px;
      color: #d3232a;
      font-weight: 700;
    }
    .designer-tag {
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.78);
      color: #fff;
      font-size: 9px;
      font-weight: 600;
      letter-spacing: 0.3px;
      padding: 1px 5px;
      border-radius: 3px;
      white-space: nowrap;
      pointer-events: none;
      z-index: 3;
      margin-bottom: 2px;
    }
    .designer-bar {
      position: absolute;
      left: 50%;
      top: 4px;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 6px;
      background: rgba(0, 0, 0, 0.75);
      color: #fff;
      padding: 4px 8px;
      font-size: 11px;
      border-radius: 6px;
      z-index: 6;
    }
    .designer-hint {
      pointer-events: none;
    }
    .designer-btn {
      background: #d3232a;
      color: #fff;
      border: none;
      border-radius: 4px;
      padding: 3px 8px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
    }
    .designer-btn:hover {
      background: #b71d23;
    }
    .designer-preview {
      position: absolute;
      z-index: 6;
      background: rgba(0, 0, 0, 0.78);
      color: #fff;
      padding: 6px 8px;
      border-radius: 6px;
      font-size: 11px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      max-width: 140px;
      cursor: move;
      user-select: none;
    }
    .designer-preview-title {
      font-weight: 700;
      opacity: 0.85;
      margin-bottom: 2px;
    }
    .designer-toggle {
      display: flex;
      align-items: center;
      gap: 4px;
      cursor: pointer;
    }
    .designer-toggle input {
      margin: 0;
      cursor: pointer;
    }
    .designer-toast {
      position: absolute;
      left: 50%;
      top: 36px;
      transform: translateX(-50%);
      background: rgba(0, 128, 0, 0.85);
      color: #fff;
      padding: 4px 10px;
      font-size: 11px;
      border-radius: 4px;
      z-index: 6;
      pointer-events: none;
    }
    .designer-marker {
      position: absolute;
      width: 14px;
      height: 14px;
      transform: translate(-50%, -50%);
      background: #d3232a;
      color: #fff;
      border-radius: 50%;
      display: grid;
      place-items: center;
      font-size: 9px;
      font-weight: 700;
      pointer-events: none;
      box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.8);
      z-index: 4;
    }

    /* Popups */
    .popup-backdrop {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.45);
      display: grid;
      place-items: center;
      z-index: 10;
    }
    .popup {
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color);
      border-radius: 8px;
      min-width: 260px;
      max-width: 90%;
      max-height: 85%;
      overflow: auto;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    }
    .popup-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      border-bottom: 1px solid var(--divider-color, #e0e0e0);
      font-weight: 600;
    }
    .popup-close {
      background: transparent;
      border: 1px solid var(--divider-color, #ccc);
      border-radius: 4px;
      padding: 4px 10px;
      cursor: pointer;
      color: inherit;
    }
    .popup-body {
      padding: 12px 14px;
    }
    .popup-body ul {
      margin: 0;
      padding-left: 18px;
    }
    .empty {
      color: var(--secondary-text-color);
      text-align: center;
      padding: 12px;
    }
    .ctrl-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 6px 0;
      border-bottom: 1px solid var(--divider-color, #eee);
    }
    .ctrl-row:last-child {
      border-bottom: none;
    }
    .ctrl-lbl {
      font-weight: 500;
    }
    .ctrl-na {
      color: var(--secondary-text-color);
      font-style: italic;
    }
    .ctrl-num {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .ctrl-num button,
    .ctrl-btn {
      background: var(--primary-color, #d3232a);
      color: #fff;
      border: none;
      border-radius: 4px;
      width: 28px;
      height: 28px;
      font-weight: 700;
      cursor: pointer;
    }
    .ctrl-btn {
      width: auto;
      padding: 4px 12px;
      height: 32px;
    }
    .ctrl-select {
      padding: 4px 8px;
      border-radius: 4px;
      border: 1px solid var(--divider-color, #ccc);
      background: var(--card-background-color, #fff);
      color: inherit;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'nilan-hmi-card': NilanHmiCard;
  }
}

// Suppress unused-import warning for the helper used only as a type seed.
export type _Suffix = typeof GENVEX_SUFFIX_MAP;
