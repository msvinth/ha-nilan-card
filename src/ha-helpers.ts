import type { HomeAssistant, HassEntity, TapActionConfig, ActionConfig } from './types';

export function entity(hass: HomeAssistant | undefined, id?: string): HassEntity | undefined {
    if (!hass || !id) return undefined;
    return hass.states[id];
}

export function entityState(hass: HomeAssistant | undefined, id?: string): string | undefined {
    return entity(hass, id)?.state;
}

export function entityNumber(hass: HomeAssistant | undefined, id?: string): number | undefined {
    const s = entityState(hass, id);
    if (s == null || s === 'unavailable' || s === 'unknown') return undefined;
    const n = Number(s);
    return Number.isFinite(n) ? n : undefined;
}

export function entityUnit(hass: HomeAssistant | undefined, id?: string): string | undefined {
    return entity(hass, id)?.attributes?.unit_of_measurement;
}

export function isOn(hass: HomeAssistant | undefined, id?: string, onStates?: string[]): boolean {
    const s = entityState(hass, id);
    if (s == null) return false;
    const accepted = onStates ?? ['on', 'true', 'open', 'heating', 'cooling', 'active'];
    return accepted.includes(s);
}

export function formatNumber(value: number | undefined, decimals = 1): string {
    if (value == null) return '–';
    return value.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
}

export function formatStateValue(
    hass: HomeAssistant | undefined,
    ent: HassEntity | undefined,
    decimals?: number,
    attribute?: string,
): string {
    if (!ent) return '–';
    if (attribute) {
        const v = ent.attributes?.[attribute];
        if (v == null) return '–';
        if (typeof v === 'number') return formatNumber(v, decimals ?? 1);
        return String(v);
    }
    const raw = ent.state;
    if (raw == null || raw === 'unavailable' || raw === 'unknown') return '–';
    const asNum = Number(raw);
    if (Number.isFinite(asNum) && raw.trim() !== '') {
        return formatNumber(asNum, decimals ?? 1);
    }
    if (hass?.formatEntityState) {
        try {
            return hass.formatEntityState(ent);
        } catch {
            /* ignore */
        }
    }
    return raw;
}

export function fireMoreInfo(node: HTMLElement, entityId: string): void {
    const event = new CustomEvent('hass-more-info', {
        bubbles: true,
        composed: true,
        detail: { entityId },
    });
    node.dispatchEvent(event);
}

export function handleAction(
    node: HTMLElement,
    hass: HomeAssistant,
    action: TapActionConfig | undefined,
    entityId?: string,
): void {
    if (!action) return;
    const cfg: ActionConfig =
        typeof action === 'string' ? ({ action } as ActionConfig) : action;
    switch (cfg.action) {
        case 'more-info': {
            const target = cfg.entity ?? entityId;
            if (target) fireMoreInfo(node, target);
            break;
        }
        case 'none':
            break;
        case 'toggle': {
            const target = cfg.entity ?? entityId;
            if (target) {
                hass.callService('homeassistant', 'toggle', { entity_id: target });
            }
            break;
        }
        case 'navigate':
            if (cfg.navigation_path) {
                history.pushState(null, '', cfg.navigation_path);
                node.dispatchEvent(new Event('location-changed', { bubbles: true, composed: true }));
            }
            break;
        case 'url':
            if (cfg.url_path) window.open(cfg.url_path, '_blank', 'noopener');
            break;
        case 'call-service':
            if (cfg.service) {
                const [domain, service] = cfg.service.split('.');
                hass.callService(domain, service, cfg.service_data ?? {}, cfg.target ?? undefined);
            }
            break;
    }
}
