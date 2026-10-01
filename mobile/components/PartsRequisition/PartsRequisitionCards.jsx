import { COLORS } from '../../stylesheets/colors';
import React from 'react';
import { FlatList, TouchableOpacity, View } from 'react-native';
import AppText from '../common/AppText';
import { displayStatus, followUpTarget, statusColors, statusLabel } from '../../../shared/partsRequisitionWorkflow';

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

const formatDate = value => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '-';
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${date.getFullYear()}`;
};

const formatItems = items => (items || []).map(item => {
  const name = item.particular || item.name || item.partName || 'Part';
  const quantity = item.quantity ? ` x ${item.quantity} ${item.unitOfMeasure || item.unit || ''}`.trimEnd() : '';
  return `${name}${quantity}`;
}).join(', ') || '-';

const dateValue = record => new Date(record.dateRequested || record.createdAt || record.updatedAt || 0).getTime() || 0;

const badgeForStatus = status => {
  if (status === 'Requested') return {
    label: statusLabel(status),
    backgroundColor: '#F4F4F4',
    color: '#555'
  };
  if (status === 'Awaiting Stock' || status === 'Ready for Delivery') return {
    label: statusLabel(status),
    backgroundColor: '#FFF8D9',
    color: '#9A7600'
  };
  return {
    label: statusLabel(status),
    backgroundColor: `${statusColors[status] || '#8c8c8c'}18`,
    color: statusColors[status] || '#666'
  };
};

export default function PartsRequisitionCards({
  requisitions = [],
  onViewDetails,
  onFollowUp,
  oversight,
  busy,
  sortOrder = 'oldest',
  ...props
}) {
  const sorted = [...requisitions].sort((a, b) => sortOrder === 'oldest' ? dateValue(a) - dateValue(b) : dateValue(b) - dateValue(a));

  return <FlatList {...props} data={sorted} keyExtractor={item => item._id} contentContainerStyle={{
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 96
  }} ListEmptyComponent={<AppText style={{
    textAlign: 'center',
    padding: 24,
    fontSize: 12,
    color: COLORS.grayDark
  }}>No requisitions found</AppText>} renderItem={({
    item
  }) => {
    const status = displayStatus(item);
    const badge = badgeForStatus(status);
    return <View style={{
      marginBottom: 12
    }}>
      <TouchableOpacity accessibilityRole="button" activeOpacity={0.82} style={{
        flexDirection: 'row',
        backgroundColor: COLORS.white,
        borderRadius: 10,
        elevation: 3,
        overflow: 'hidden'
      }} onPress={() => onViewDetails(item)}>
        <View style={{
          width: 5,
          backgroundColor: COLORS.primaryLight
        }} />
        <View style={{
          flex: 1,
          padding: 12
        }}>
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 6
          }}>
            <View style={{
              flex: 1,
              marginRight: 10
            }}>
              <AppText style={{
                fontWeight: 'bold',
                fontSize: 13,
                color: '#000'
              }}>Warehouse Slip</AppText>
              <AppText style={{
                fontSize: 11,
                color: '#777',
                marginTop: 1
              }}>{formatDate(item.dateRequested || item.createdAt || item.updatedAt)}</AppText>
            </View>
            <View style={{
              backgroundColor: badge.backgroundColor,
              borderRadius: 12,
              paddingHorizontal: 8,
              paddingVertical: 3,
              maxWidth: 150
            }}>
              <AppText numberOfLines={1} style={{
                color: badge.color,
                fontSize: 10,
                fontWeight: '600'
              }}>{badge.label}</AppText>
            </View>
          </View>
          <AppText style={{
            color: '#555',
            fontSize: 12,
            marginBottom: 2
          }}>Slip No: {item.wrsNo || '-'}</AppText>
          <AppText numberOfLines={2} style={{
            color: '#777',
            fontSize: 12,
            marginBottom: 2
          }}>Items: {formatItems(item.items)}</AppText>
          <AppText numberOfLines={1} style={{
            color: '#777',
            fontSize: 12
          }}>Purpose: {item.purpose || item.items?.find(part => part.purpose)?.purpose || '-'}</AppText>
        </View>
      </TouchableOpacity>
      {oversight && followUpTarget(item) && <TouchableOpacity disabled={busy} accessibilityRole="button" onPress={() => onFollowUp(item)} style={{
        alignSelf: 'flex-end',
        paddingVertical: 6,
        paddingHorizontal: 4
      }}><AppText style={{
          color: COLORS.primaryLight,
          fontSize: 12,
          fontWeight: '600'
        }}>Follow Up</AppText></TouchableOpacity>}
    </View>;
  }} />;
}
