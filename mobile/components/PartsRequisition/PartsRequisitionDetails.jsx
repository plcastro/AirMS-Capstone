import { COLORS } from '../../stylesheets/colors';
import React, { useState } from 'react';
import { Alert, ScrollView, StatusBar, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Modal from '../common/AppModal';
import IosModalSafeAreaProvider from '../common/IosModalSafeAreaProvider';
import AppText from '../common/AppText';
import { buildTimeline, canAct, displayStatus, followUpTarget, isOpen, itemDisplayStatus, normalizeItemStatus, statusColors, statusLabel } from '../../../shared/partsRequisitionWorkflow';

function StatusChip({ status, style }) {
  const color = statusColors[status] || COLORS.grayDark;
  return <View style={[{
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: `${color}1A`,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4
  }, style]}>
    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color, marginRight: 6 }} />
    <AppText style={{ color, fontSize: 11, fontWeight: '700' }}>{statusLabel(status)}</AppText>
  </View>;
}

const TIMELINE_COLORS = [
  [/cancel/i, COLORS.dangerBorder],
  [/confirm|receipt/i, COLORS.successBorder],
  [/deliver/i, COLORS.successBorder],
  [/stock/i, COLORS.infoBorder],
  [/request/i, COLORS.primaryLight],
];
const timelineColorFor = (label) => (TIMELINE_COLORS.find(([match]) => match.test(label)) || [null, COLORS.grayDark])[1];

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
  const actionButtonStyle = {
    minWidth: 110,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#d9d9d9',
    borderRadius: 8,
    marginVertical: 5,
    alignItems: 'center',
    justifyContent: 'center'
  };
  const button = (label, action, disabled = false, extra = {}) => {
    const color = action === 'cancel' ? '#a85d5d' : COLORS.primaryLight;
    return <TouchableOpacity key={label} disabled={busy || disabled} accessibilityRole="button" accessibilityState={{
      disabled: busy || disabled
    }} onPress={() => act(action, extra)} style={[actionButtonStyle, {
      backgroundColor: color,
      borderColor: color,
      opacity: busy || disabled ? 0.4 : 1
    }]}><AppText style={{
        color: COLORS.white,
        fontWeight: '600'
      }}>{label}</AppText></TouchableOpacity>;
  };
  return <Modal visible={visible} onRequestClose={close} animationType="fade" transparent><IosModalSafeAreaProvider><SafeAreaView style={{
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.35)',
      justifyContent: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8
    }}><StatusBar barStyle="dark-content" backgroundColor="rgba(0, 0, 0, 0.35)" /><View style={{
      backgroundColor: COLORS.white,
      borderRadius: 20,
      overflow: 'hidden',
      maxHeight: '96%'
    }}><View style={{
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#E8E8E8'
    }}><AppText style={{ fontSize: 12, fontWeight: '600', color: COLORS.black }}>Requisition details</AppText><TouchableOpacity onPress={close} disabled={busy} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}><MaterialCommunityIcons name="close" size={24} color={COLORS.grayDark} /></TouchableOpacity></View><ScrollView showsVerticalScrollIndicator={false} style={{
        flexShrink: 1
      }} contentContainerStyle={{
        padding: 16
      }}>
    <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 10
        }}>
      <View style={{ width: 5, height: 32, borderRadius: 3, backgroundColor: COLORS.primaryLight, marginRight: 10 }} />
      <View style={{ flex: 1 }}>
        <AppText style={{ fontSize: 18, fontWeight: '700', color: COLORS.black }}>{record.wrsNo}</AppText>
        <AppText style={{ fontSize: 12, color: COLORS.grayDark, marginTop: 2 }}>{record.aircraft} · {record.staff?.requisitioner}</AppText>
      </View>
    </View>
    <StatusChip status={status} style={{ marginBottom: 12 }} />
    {status === 'Delivered' && <View style={{
          backgroundColor: COLORS.infoBg,
          borderRadius: 8,
          padding: 10,
          marginBottom: 10
        }}><AppText style={{
          color: COLORS.infoBorder,
          fontSize: 12,
          fontWeight: '600'
        }}>Awaiting requester confirmation of receipt</AppText></View>}
    {stock && <AppText style={{ fontSize: 12, color: COLORS.grayDark, marginBottom: 10 }}>Choose stock status for each item, then Save. When all items are In Stock, Deliver saves your selections and confirms delivery.</AppText>}
    <AppText style={{
          fontSize: 12,
          fontWeight: '700',
          color: COLORS.grayDark,
          textTransform: 'uppercase',
          marginBottom: 8
        }}>Items</AppText>
    {items.map(item => {
      const itemStatus = itemDisplayStatus(record, item);
      const itemColor = statusColors[itemStatus] || COLORS.grayDark;
      return <View key={item._id || item.itemNo} style={{
            flexDirection: 'row',
            backgroundColor: COLORS.grayLight,
            borderRadius: 10,
            marginBottom: 8,
            overflow: 'hidden'
          }}>
        <View style={{ width: 4, backgroundColor: itemColor }} />
        <View style={{ flex: 1, padding: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
            <AppText style={{
              fontWeight: '700',
              color: COLORS.black,
              flex: 1,
              marginRight: 8
            }}>{item.particular || item.codeParticular?.[0]?.particular || 'Part'}</AppText>
            <StatusChip status={itemStatus} />
          </View>
          <AppText style={{ fontSize: 12, color: COLORS.grayDark }}>{item.quantity} {item.unitOfMeasure} · {item.purpose}</AppText>
          {stock && <View style={{
              flexDirection: 'row',
              gap: 8,
              marginTop: 8
            }}>{['In Stock', 'Out of Stock'].map(value => button(value, 'draft', normalizeItemStatus(item.stockStatus) === value, {
                itemId: item._id,
                stockStatus: value
              }))}</View>}
        </View>
      </View>;
    })}
    <AppText style={{
          fontSize: 12,
          fontWeight: '700',
          color: COLORS.grayDark,
          textTransform: 'uppercase',
          marginTop: 6,
          marginBottom: 10
        }}>History</AppText>
    {buildTimeline(record).map((entry, index, list) => {
      const isLast = index === list.length - 1;
      const dotColor = timelineColorFor(entry.label);
      return <View key={index} style={{
            position: 'relative',
            paddingLeft: 20,
            paddingBottom: isLast ? 0 : 14
          }}>
        {!isLast && <View style={{ position: 'absolute', left: 5, top: 14, bottom: -14, width: 2, backgroundColor: '#E5E5E5' }} />}
        <View style={{ position: 'absolute', left: 0, top: 3, width: 12, height: 12, borderRadius: 6, backgroundColor: dotColor }} />
        <AppText style={{ fontWeight: '700', color: COLORS.black }}>{entry.label}</AppText>
        <AppText style={{ fontSize: 12, color: COLORS.grayDark, marginTop: 2 }}>{new Date(entry.at).toLocaleString()}</AppText>
        {!!entry.actorName && <AppText style={{ fontSize: 12, color: COLORS.grayDark }}>{entry.actorName}</AppText>}
        {!!entry.details && <AppText style={{ fontSize: 12, color: COLORS.grayDark, marginTop: 2 }}>{entry.details}</AppText>}
      </View>;
    })}
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
    <TouchableOpacity onPress={close} disabled={busy} style={[actionButtonStyle, {
          opacity: busy ? 0.4 : 1
        }]}><AppText style={{
            color: COLORS.primaryLight,
            fontWeight: '600'
          }}>Close</AppText></TouchableOpacity>
    {stock && !allInStock && button('Save', 'stock', !stockUpdates.length, { stockUpdates })}
    {canAct(user, record, 'deliver') && isOpen(record) && allInStock && button('Deliver', 'deliver', false, stockUpdates.length ? { stockUpdates } : {})}
    {canAct(user, record, 'confirm') && status === 'Delivered' && button('Confirm receipt', 'confirm')}
    {canAct(user, record, 'cancel') && isOpen(record) && button('Cancel requisition', 'cancel')}
    {canAct(user, record, 'follow-up') && followUpTarget(record) && button('Follow Up', 'follow-up')}
  </View></View></SafeAreaView></IosModalSafeAreaProvider></Modal>;
}
