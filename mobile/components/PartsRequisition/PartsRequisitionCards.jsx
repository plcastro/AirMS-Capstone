import { COLORS } from '../../stylesheets/colors';
import React from 'react';
import { FlatList, TouchableOpacity, View } from 'react-native';
import AppText from '../common/AppText';
import { displayStatus, statusColors, statusLabel, timeSinceUpdate, updatedFirst, followUpTarget } from '../../../shared/partsRequisitionWorkflow';
export function StatusDot({
  status
}) {
  return <View style={{
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  }}><View style={{
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: statusColors[status] || '#8c8c8c'
    }} /><AppText style={{
      color: statusColors[status] || '#666',
      fontSize: 12
    }}>{statusLabel(status)}</AppText></View>;
}
export default function PartsRequisitionCards({
  requisitions = [],
  onViewDetails,
  onFollowUp,
  oversight,
  busy,
  ...props
}) {
  return <FlatList {...props} data={[...requisitions].sort(updatedFirst)} keyExtractor={item => item._id} contentContainerStyle={{
    padding: 16,
    paddingBottom: 80
  }} ListEmptyComponent={<AppText style={{
    textAlign: 'center',
    padding: 24
  }}>No requisitions found</AppText>} renderItem={({
    item
  }) => <View style={{
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    marginBottom: 12,
    padding: 16
  }}>
    <TouchableOpacity accessibilityRole="button" onPress={() => onViewDetails(item)}><AppText style={{
        fontWeight: '700',
        fontSize: 15,
        marginBottom: 8
      }}>{item.wrsNo}</AppText><StatusDot status={displayStatus(item)} /><AppText style={{
        marginTop: 10
      }}>{item.aircraft} · {item.items?.length || 0} items</AppText><AppText>{item.staff?.requisitioner}</AppText><AppText style={{
        color: '#777',
        marginTop: 6
      }}>Updated {timeSinceUpdate(item)}</AppText><AppText style={{
        color: COLORS.primaryLight,
        marginTop: 12
      }}>View details and history</AppText></TouchableOpacity>
    {oversight && followUpTarget(item) && <TouchableOpacity disabled={busy} accessibilityRole="button" onPress={() => onFollowUp(item)} style={{
      paddingVertical: 12
    }}><AppText style={{
        color: COLORS.primaryLight
      }}>Follow Up</AppText></TouchableOpacity>}
  </View>} />;
}
