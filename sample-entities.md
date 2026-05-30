# Sample Entity Reference

Here's the complete entity reference for the LS Control ventilation/heat pump unit (device `nilan`):

## Sensors – Temperatures

| Entity ID                                   | Name                           | Value    | Description                                              |
| ------------------------------------------- | ------------------------------ | -------- | -------------------------------------------------------- |
| sensor.nilan_temperature_supply_air         | Temperature Supply air         | 25.96 °C | Air temperature being supplied into the house            |
| sensor.nilan_temperature_extract_air        | Temperature Extract air        | 26.25 °C | Air temperature being extracted from the house           |
| sensor.nilan_temperature_outside_air        | Temperature Outside air        | 19.96 °C | Outdoor air temperature measured by the unit             |
| sensor.nilan_temperature_exhaust_air        | Temperature Exhaust air        | 25.32 °C | Air temperature exhausted outdoors (after heat recovery) |
| sensor.nilan_temperature_room               | Temperature Room               | 26.25 °C | Indoor room temperature                                  |
| sensor.nilan_temperature_condenser          | Temperature Condenser          | 26.13 °C | Heat pump condenser coil temperature                     |
| sensor.nilan_temperature_evaporator         | Temperature Evaporator         | 23.76 °C | Heat pump evaporator coil temperature                    |
| sensor.nilan_temperature_after_condenser    | Temperature After Condenser    | 27.3 °C  | Air temp after passing through the condenser             |
| sensor.nilan_temperature_before_condenser   | Temperature Before Condenser   | 19.8 °C  | Air temp before entering the condenser                   |
| sensor.nilan_temperature_hotwater_top       | Temperature Hotwater Top       | 55.52 °C | Hot water tank temperature at the top (hottest)          |
| sensor.nilan_temperature_hotwater_bottom    | Temperature Hotwater Bottom    | 48.04 °C | Hot water tank temperature at the bottom (coldest)       |
| sensor.nilan_temperature_buffer_tank        | Temperature Buffer Tank        | 36.3 °C  | Buffer/accumulator tank temperature                      |
| sensor.nilan_temperature_heatpump_outdoor   | Temperature Heatpump Outdoor   | 18.8 °C  | Outdoor unit temperature of the heat pump                |
| sensor.nilan_temperature_high_pressure_pipe | Temperature High Pressure Pipe | 38.8 °C  | Refrigerant high-pressure pipe temperature               |

## Sensors – Performance & Status

| Entity ID                                  | Name                          | Value    | Description                                                       |
| ------------------------------------------ | ----------------------------- | -------- | ----------------------------------------------------------------- |
| sensor.nilan_efficiency                    | Efficiency                    | 95.36 %  | Heat recovery efficiency of the ventilation unit                  |
| sensor.nilan_humidity                      | Humidity                      | 36.08 %  | Indoor relative humidity                                          |
| sensor.nilan_fan_level_supply              | Fan Level Supply              | 2        | Current supply fan speed level                                    |
| sensor.nilan_fan_level_extract             | Fan Level Extract             | 2        | Current extract fan speed level                                   |
| sensor.nilan_days_left_until_filter_change | Days Left until filter change | 28 d     | Days remaining before filter replacement is needed                |
| sensor.nilan_heatpump_actual_capacity      | Heatpump Actual Capacity      | 0.0 %    | Current heat pump compressor capacity                             |
| sensor.nilan_status                        | Status                        | state_4  | Unit operating status (enum)                                      |
| sensor.nilan_heatpump_operation_state      | Heatpump Operation State      | state_1  | Heat pump sub-state (enum)                                        |
| sensor.nilan_sacrificial_anode             | Sacrificial Anode             | on       | Sacrificial anode status in hot water tank (corrosion protection) |
| sensor.nilan_active_alarm_count            | Active Alarm Count            | 0        | Number of active alarms                                           |
| sensor.nilan_active_alarm_list             | Active Alarm List             | No Alarm | Text list of any active alarms                                    |

## Binary Sensors

| Entity ID                                    | Name                     | Value | Description                                                     |
| -------------------------------------------- | ------------------------ | ----- | --------------------------------------------------------------- |
| binary_sensor.nilan_bypass                   | Bypass                   | off   | Whether the heat-exchanger bypass valve is open (summer bypass) |
| binary_sensor.nilan_heatpump                 | Heatpump                 | on    | Whether the heat pump compressor is running                     |
| binary_sensor.nilan_heatpump_heating_element | Heatpump Heating Element | off   | Whether the auxiliary electric heating element is active        |

## Climate (HVAC Control)

| Entity ID                 | Name        | Value                                  | Description                                                                                                                                                               |
| ------------------------- | ----------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| climate.nilan_ventilation | Ventilation | heat (target: 22 °C, current: 26.2 °C) | Main ventilation/climate control. HVAC modes: auto, cool, heat. Fan modes: off, low, middle, medium, high. Current fan: middle. Current action: fan. Temp range: 10–30 °C |

## Controls – Select (dropdowns)

| Entity ID                         | Name                 | Value     | Description                                                               |
| --------------------------------- | -------------------- | --------- | ------------------------------------------------------------------------- |
| select.nilan_fan_level            | Fan level            | 2         | Manual fan speed level selection                                          |
| select.nilan_antilegionella       | Antilegionella       | off       | Periodic hot water tank heating to kill legionella bacteria               |
| select.nilan_cooling_priority     | Cooling Priority     | hot_water | What the heat pump prioritises in cooling mode (hot water vs ventilation) |
| select.nilan_cooling_start_offset | Cooling start offset | +4        | Temperature offset above setpoint before active cooling starts            |

## Controls – Number (setpoints)

| Entity ID                                      | Name                              | Value   | Description                                     |
| ---------------------------------------------- | --------------------------------- | ------- | ----------------------------------------------- |
| number.nilan_temperature_target                | Temperature target                | 22.0 °C | Desired room temperature setpoint               |
| number.nilan_temperature                       | Temperature                       | 1 °C    | Temperature offset/adjustment value             |
| number.nilan_hotwater_temperature_target       | Hotwater Temperature target       | 52.0 °C | Desired hot water temperature                   |
| number.nilan_hotwater_booster_max_temperature  | Hotwater Booster max temperature  | 40.0 °C | Max temperature for the electric booster heater |
| number.nilan_summer_min_supply_air_temperature | Summer min supply air temperature | 14.0 °C | Minimum allowed supply air temp in summer mode  |
| number.nilan_summer_max_supply_air_temperature | Summer max supply air temperature | 35.0 °C | Maximum allowed supply air temp in summer mode  |

## Controls – Button

| Entity ID                 | Name         | Value      | Description                                                   |
| ------------------------- | ------------ | ---------- | ------------------------------------------------------------- |
| button.nilan_reset_filter | Reset filter | _(action)_ | Resets the filter change countdown after replacing the filter |

---

**Total: 40 entities** – all from the LS Control HRV (Heat Recovery Ventilation) unit with integrated heat pump and hot water tank. You can copy the table above directly into another prompt for UI card design.
