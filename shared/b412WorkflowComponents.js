// Keep the common-form projection aligned when editing or closing a B412 record.
// Engine 2 and the other B412-only fields remain in the full B412 component data.
export const b412WorkflowComponents = (component = {}, standard = {}) => Object.fromEntries(
  ['broughtForwardData', 'thisFlightData', 'toDateData'].map(section => {
    const values = component[section] || {};
    return [section, {
      ...standard[section],
      airframe: values.airframe ?? '', engine: values.engine1?.tsn ?? '',
      cycleN1: values.engine1?.cycle ?? '', cycleN2: values.engine2?.cycle ?? '',
      gearBoxMain: values.mrGearbox?.tsn ?? '', gearBoxTail: values.tr90Gearbox?.tsn ?? '',
      landingCycle: values.landingCycle ?? '', usage: values.sling ?? '',
      airframeNextInsp: component.airframeNextInspectionDueAt ?? '',
      engineNextInsp: component.engineNextInspectionDueAt ?? '',
    }];
  }),
);
