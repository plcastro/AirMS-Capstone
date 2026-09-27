import { COLORS } from '../../stylesheets/colors';
import React from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Modal from '../common/AppModal';
import AppText from '../common/AppText';
import { StatusDot } from './PartsRequisitionCards';
import { buildTimeline, readyToDeliver, canAct, displayStatus, followUpTarget, isOpen, normalizeItemStatus } from '../../../shared/partsRequisitionWorkflow';
export default function PartsRequisitionDetails({
  record,
  visible,
  onClose,
  user,
  onAction,
  busy
}) {
  if (!record) return null;
  const status = displayStatus(record),
    stock = canAct(user, record, 'stock') && isOpen(record);
  const button = (label, action, disabled = false, extra = {}) => <TouchableOpacity key={label} disabled={busy || disabled} accessibilityRole="button" accessibilityState={{
    disabled: busy || disabled
  }} onPress={() => onAction(record, action, extra)} style={{
    padding: 12,
    borderWidth: 1,
    borderColor: '#d9d9d9',
    borderRadius: 8,
    marginVertical: 5,
    opacity: busy || disabled ? 0.4 : 1
  }}><AppText style={{
      color: action === 'cancel' ? '#a85d5d' : COLORS.primaryLight
    }}>{label}</AppText></TouchableOpacity>;
  return <Modal visible={visible} onRequestClose={onClose} animationType="slide"><SafeAreaView style={{
      flex: 1,
      backgroundColor: '#fff'
    }}><ScrollView contentContainerStyle={{
        padding: 20
      }}>
    <TouchableOpacity onPress={onClose} style={{
          paddingVertical: 12
        }}><AppText style={{
            color: COLORS.primaryLight
          }}>Close</AppText></TouchableOpacity>
    <AppText style={{
          fontSize: 20,
          fontWeight: '700',
          marginBottom: 12
        }}>{record.wrsNo}</AppText><StatusDot status={status} /><AppText style={{
          marginVertical: 12
        }}>{record.aircraft} · {record.staff?.requisitioner}</AppText>
    {status === 'Delivered' && <AppText style={{
          color: '#ad8b00',
          marginBottom: 12
        }}>Awaiting requester confirmation of receipt</AppText>}
    {(record.items || []).map(item => <View key={item._id || item.itemNo} style={{
          backgroundColor: '#f7f7f7',
          padding: 14,
          borderRadius: 10,
          marginBottom: 12
        }}><AppText style={{
            fontWeight: '700',
            marginBottom: 6
          }}>{item.particular || item.codeParticular?.[0]?.particular || 'Part'}</AppText><AppText>{item.quantity} {item.unitOfMeasure} · {item.purpose}</AppText><StatusDot status={normalizeItemStatus(item.stockStatus)} />{stock && <View style={{
            flexDirection: 'row',
            gap: 8
          }}>{['In Stock', 'Out of Stock'].map(value => button(value, 'stock', normalizeItemStatus(item.stockStatus) === value, {
              itemId: item._id,
              stockStatus: value
            }))}</View>}</View>)}
    {canAct(user, record, 'deliver') && isOpen(record) && button('Deliver', 'deliver', !readyToDeliver(record))}
    {canAct(user, record, 'confirm') && status === 'Delivered' && button('Confirm receipt', 'confirm')}
    {canAct(user, record, 'cancel') && isOpen(record) && button('Cancel requisition', 'cancel')}
    {canAct(user, record, 'follow-up') && followUpTarget(record) && button('Follow Up', 'follow-up')}
    <AppText style={{
          fontSize: 18,
          fontWeight: '700',
          marginVertical: 16
        }}>History</AppText>
    {buildTimeline(record).map((entry, index) => <View key={index} style={{
          borderLeftWidth: 2,
          borderLeftColor: '#d9d9d9',
          paddingLeft: 14,
          paddingBottom: 20
        }}><AppText style={{
            fontWeight: '700'
          }}>{entry.label}</AppText><AppText>{new Date(entry.at).toLocaleString()}</AppText><AppText>{entry.actorName}</AppText>{!!entry.details && <AppText>{entry.details}</AppText>}</View>)}
  </ScrollView></SafeAreaView></Modal>;
}
