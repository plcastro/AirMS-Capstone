import React from 'react';
import { View } from 'react-native';
import AppText from './AppText';

export default function NewLogBadge({ count }) {
  return <View accessible accessibilityLabel={count ? `${count} new or updated logs not yet viewed` : 'New or updated log not yet viewed'} style={{
    alignSelf: 'flex-start', borderRadius: 999, paddingVertical: 2, paddingHorizontal: 8,
    backgroundColor: '#fff3e0', borderWidth: 1, borderColor: '#ffd8a8',
  }}><AppText style={{ fontSize: 10, fontWeight: '700', color: '#8a3f00', letterSpacing: 0.4 }}>{count ? `${count} NEW` : 'NEW'}</AppText></View>;
}
