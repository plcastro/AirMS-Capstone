import React from 'react';
import { View } from 'react-native';
import AppText from './AppText';

const badgeStyle = {
  alignSelf: 'flex-start', borderRadius: 999, paddingVertical: 2, paddingHorizontal: 8,
  backgroundColor: '#fff3e0', borderWidth: 1, borderColor: '#ffd8a8',
};
const badgeTextStyle = { fontSize: 10, fontWeight: '700', color: '#8a3f00', letterSpacing: 0.4 };

export default function NewLogBadge({ count }) {
  return <View accessible accessibilityLabel={count ? `${count} new or updated logs not yet viewed` : 'New or updated log not yet viewed'} style={badgeStyle}><AppText style={badgeTextStyle}>{count ? `${count} NEW` : 'NEW'}</AppText></View>;
}

// Same look as NewLogBadge: who the aircraft's in-progress flight log is waiting on.
export function IncomingLogBadge({ role, name }) {
  return <View style={[badgeStyle, { marginTop: 6, maxWidth: '100%' }]}><AppText style={badgeTextStyle}>Incoming log for {role}: {name}</AppText></View>;
}
