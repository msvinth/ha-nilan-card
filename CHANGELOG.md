# Changelog

## 0.3.2 - 2026-06-20

- Fix: `cool` icon now uses `status` entity with correct states (`state_8` "Cooling mode", `state_11` "Cooling + hot water") instead of `heatpump_operation_state` with wrong state codes.
- Fix: `hotwater` (produce) icon states corrected to `state_9`, `state_11`, `state_17` (was incorrectly `state_2`, `state_3`).
- Fix: default operation icon order changed to show `cool` before `compressor`, matching the real CTS602 HMI.
- Docs: clarify that minimal YAML section is for advanced users; recommend visual editor.

## 0.3.1 - 2026-05-30

- Compressor icon: default mapping now follows the CTS602 HMI — driven by `status` and hidden only when in standby/off (`state_0`, `state_1`, `state_4`, etc.).
- New `off_states` option on `operation_icons.mapping.<icon>` for inverse activation matching.

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
