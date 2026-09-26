import React from 'react';
import { Button, Space } from 'antd';
export default function FlightLandingAdjustment({ legs = [], extra = 0, onChange, disabled }) {
  const count = Math.max(0, Number(extra) || 0);
  return <Space style={{ marginBottom: 16 }}><span>Landing cycles: <strong>{legs.length + count}</strong> ({legs.length} legs + {count} additional)</span><Button aria-label="Decrease landing cycles" disabled={disabled || count === 0} onClick={() => onChange(count - 1)}>−</Button><Button aria-label="Increase landing cycles" disabled={disabled} onClick={() => onChange(count + 1)}>+</Button></Space>;
}
