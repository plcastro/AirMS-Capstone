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
    label: 'Parts Requested',
    backgroundColor: '#F4F4F4',
    color: '#555'
  };
  if (status === 'Awaiting Stock' || status === 'Ready for Delivery') return {
    label: 'Availability Checked',
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
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 96
  }} ListEmptyComponent={<AppText style={{
    textAlign: 'center',
    padding: 24
  }}>No requisitions found</AppText>} renderItem={({
    item
  }) => {
    const status = displayStatus(item);
    const badge = badgeForStatus(status);
    return <View style={{
      marginBottom: 14
    }}>
      <TouchableOpacity accessibilityRole="button" activeOpacity={0.82} onPress={() => onViewDetails(item)} style={{
        minHeight: 112,
        backgroundColor: '#fff',
        borderRadius: 10,
        paddingVertical: 18,
        paddingLeft: 28,
        paddingRight: 18,
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 1
        },
        shadowOpacity: 0.06,
        shadowRadius: 3,
        elevation: 1,
        overflow: 'hidden'
      }}>
        <View style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 5,
          backgroundColor: COLORS.primaryLight
        }} />
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 10
        }}>
          <View style={{
            flex: 1
          }}>
            <AppText style={{
              fontWeight: '700',
              fontSize: 18,
              color: '#111'
            }}>Warehouse Slip</AppText>
            <AppText style={{
              fontSize: 14,
              color: '#777',
              marginTop: 1
            }}>{formatDate(item.dateRequested || item.createdAt || item.updatedAt)}</AppText>
          </View>
          <View style={{
            backgroundColor: badge.backgroundColor,
            borderRadius: 14,
            paddingHorizontal: 12,
            paddingVertical: 4,
            marginTop: 6,
            maxWidth: 172
          }}>
            <AppText numberOfLines={1} style={{
              color: badge.color,
              fontSize: 12,
              fontWeight: '700'
            }}>{badge.label}</AppText>
          </View>
        </View>
        <View style={{
          marginTop: 16
        }}>
          <AppText style={{
            color: '#666',
            fontSize: 15
          }}>Slip No: {item.wrsNo || '-'}</AppText>
          <AppText numberOfLines={2} style={{
            color: '#666',
            fontSize: 15,
            marginTop: 2
          }}>Items: {formatItems(item.items)}</AppText>
          <AppText numberOfLines={1} style={{
            color: '#666',
            fontSize: 15,
            marginTop: 2
          }}>Purpose: {item.purpose || item.items?.find(part => part.purpose)?.purpose || '-'}</AppText>
        </View>
      </TouchableOpacity>
      {oversight && followUpTarget(item) && <TouchableOpacity disabled={busy} accessibilityRole="button" onPress={() => onFollowUp(item)} style={{
        alignSelf: 'flex-end',
        paddingVertical: 8,
        paddingHorizontal: 4
      }}><AppText style={{
          color: COLORS.primaryLight
        }}>Follow Up</AppText></TouchableOpacity>}
    </View>;
  }} />;
}
