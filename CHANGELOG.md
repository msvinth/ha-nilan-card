# Changelog

## 0.3.0 - 2026-05-30

- Card picker: render HMI background image as preview thumbnail in Home Assistant's "Add card" dialog.

## 0.2.0 - 2026-05-30

- Operation icons: `cool` now driven by `heatpump_operation_state`; `hotwater` (produce) driven by `status`.
- Produce icon split: bolt-free `produce.png` (water pipe connected) plus `produce_bolt.png` shown when the heating element is on.
- Hot-water tank: lightning-bolt overlay now uses `mdi:lightning-bolt` (~2x larger, centered between tank temps).
- Temperature slots: replaced evaporator/outdoor with **before condenser** / **after condenser** (`temperature_before_condenser`, `temperature_after_condenser`).
- Removed `extract` slot and the room target temperature reference (`→22°`).
- Default coord nudges: `element_bolt`, `extract`, `central_heat`.

## 0.1.0 - unreleased

- Initial release.
- Replicates the Nilan CTS602 HMI front screen as a Lovelace card.
- Embedded background and operation icons (no extra assets to install).
- Visual editor with Genvex Connect device auto-fill.
- Tap-to-more-info, alarm popup, controls popup (target temps, fan level, antilegionella, cooling priority, ...).
- Optional CO2 slot and central-heating flow temperature slot.
- English + Danish strings.
