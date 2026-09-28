import { COLORS } from '../../stylesheets/colors';
import React, { useState } from 'react';
import { Alert, ScrollView, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Modal from '../common/AppModal';
import AppText from '../common/AppText';
import { StatusDot } from './PartsRequisitionCards';
import { buildTimeline, canAct, displayStatus, followUpTarget, isOpen, normalizeItemStatus } from '../../../shared/partsRequisitionWorkflow';
export default function PartsRequisitionDetails(props) {
  return <RequisitionDetails key={`${props.record?._id}:${props.record?.updatedAt}:${props.visible}`} {...props} />;
}
function RequisitionDetails({
  record,
  visible,
  onClose,
  user,
  onAction,
  busy
}) {
  const [stockDraft, setStockDraft] = useState({});
  if (!record) return null;
  const status = displayStatus(record),
    stock = canAct(user, record, 'stock') && isOpen(record);
  const stockUpdates = Object.entries(stockDraft).map(([itemId, stockStatus]) => ({ itemId, stockStatus }));
  const items = (record.items || []).map(item => ({ ...item, stockStatus: stockDraft[item._id] || normalizeItemStatus(item.stockStatus) }));
  const allInStock = Boolean(items.length) && items.every(item => item.stockStatus === 'In Stock');
  const close = () => {
    if (busy) return;
    if (!stockUpdates.length) return onClose();
    Alert.alert('Discard unsaved stock changes?', 'Choose Save or Deliver to keep your stock updates.', [{ text: 'Keep editing', style: 'cancel' }, { text: 'Discard', style: 'destructive', onPress: onClose }]);
  };
  const act = async (action, extra) => {
    if (action === 'draft') {
      setStockDraft(previous => {
        const next = { ...previous };
        const original = record.items.find(item => String(item._id) === String(extra.itemId));
        if (normalizeItemStatus(original.stockStatus) === extra.stockStatus) delete next[extra.itemId];
        else next[extra.itemId] = extra.stockStatus;
        return next;
      });
    } else if (await onAction(record, action, extra)) {
      if (action === 'stock') onClose();
    }
  };
  const button = (label, action, disabled = false, extra = {}) => <TouchableOpacity key={label} disabled={busy || disabled} accessibilityRole="button" accessibilityState={{
    disabled: busy || disabled
  }} onPress={() => act(action, extra)} style={{
    padding: 12,
    borderWidth: 1,
    borderColor: '#d9d9d9',
    borderRadius: 8,
    marginVertical: 5,
    opacity: busy || disabled ? 0.4 : 1
  }}><AppText style={{
      color: action === 'cancel' ? '#a85d5d' : COLORS.primaryLight
    }}>{label}</AppText></TouchableOpacity>;
  return <Modal visible={visible} onRequestClose={close} animationType="slide"><SafeAreaView style={{
      flex: 1,
      backgroundColor: '#fff'
    }}><ScrollView style={{
        flex: 1
      }} contentContainerStyle={{
        padding: 20
      }}>
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
    {stock && <AppText>Choose stock status for each item, then Save. When all items are In Stock, Deliver saves your selections and confirms delivery.</AppText>}
    {items.map(item => <View key={item._id || item.itemNo} style={{
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
          }}>{['In Stock', 'Out of Stock'].map(value => button(value, 'draft', normalizeItemStatus(item.stockStatus) === value, {
              itemId: item._id,
              stockStatus: value
            }))}</View>}</View>)}
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
  </ScrollView><View style={{
        flexDirection: 'row',
        justifyContent: 'flex-end',
        flexWrap: 'wrap',
        gap: 8,
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#E8E8E8',
        backgroundColor: '#fff'
      }}>
    <TouchableOpacity onPress={close} disabled={busy} style={{
          padding: 12,
          borderWidth: 1,
          borderColor: '#d9d9d9',
          borderRadius: 8,
          opacity: busy ? 0.4 : 1
        }}><AppText style={{
            color: COLORS.primaryLight
          }}>Close</AppText></TouchableOpacity>
    {stock && !allInStock && button('Save', 'stock', !stockUpdates.length, { stockUpdates })}
    {canAct(user, record, 'deliver') && isOpen(record) && allInStock && button('Deliver', 'deliver', false, stockUpdates.length ? { stockUpdates } : {})}
    {canAct(user, record, 'confirm') && status === 'Delivered' && button('Confirm receipt', 'confirm')}
    {canAct(user, record, 'cancel') && isOpen(record) && button('Cancel requisition', 'cancel')}
    {canAct(user, record, 'follow-up') && followUpTarget(record) && button('Follow Up', 'follow-up')}
  </View></SafeAreaView></Modal>;
}
