import { COLORS } from '../../stylesheets/colors';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { Alert, RefreshControl, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AppText from '../../components/common/AppText';
import AppInput from '../../components/common/AppInput';
import { AuthContext } from '../../Context/AuthContext';
import { getAuthHeaders } from '../../utilities/mobileApi';
import { API_BASE } from '../../utilities/API_BASE';
import PartsRequisitionCards from '../../components/PartsRequisition/PartsRequisitionCards';
import PartsRequisitionEntry from '../../components/PartsRequisition/PartsRequisitionEntry';
import PartsRequisitionDetails from '../../components/PartsRequisition/PartsRequisitionDetails';
import { canCreate, displayStatus, isOversight, isRequisitionOwner, roleOf } from '../../../shared/partsRequisitionWorkflow';

const confirm = (title, message) => new Promise(resolve => Alert.alert(title, message, [{
  text: 'Cancel',
  style: 'cancel',
  onPress: () => resolve(false)
}, {
  text: 'Confirm',
  onPress: () => resolve(true)
}], {
  cancelable: true,
  onDismiss: () => resolve(false)
}));

export default function PartsRequisition({
  route
}) {
  const {
    user
  } = useContext(AuthContext);
  const [records, setRecords] = useState([]),
    [loading, setLoading] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const [tab, setTab] = useState('active'),
    [sortOrder, setSortOrder] = useState('oldest'),
    [search, setSearch] = useState(''),
    [selectedId, setSelectedId] = useState(null),
    [entry, setEntry] = useState(false);
  const [aircraft, setAircraft] = useState(''),
    [aircraftOptions, setAircraftOptions] = useState([]);

  const request = useCallback(async (path, body) => {
    const response = await fetch(`${API_BASE}/api/${path}`, {
      method: body ? 'POST' : 'GET',
      headers: await getAuthHeaders(),
      ...(body ? {
        body: JSON.stringify({
          ...body,
          confirmAction: true
        })
      } : {})
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Request failed');
    return data;
  }, []);

  const load = useCallback(async () => {
    try {
      setRecords(await request('parts-requisition/get-all-requisition'));
      setError('');
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [request]);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    load();
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, [load]));

  useEffect(() => {
    request('parts-monitoring/aircraft-list').then(data => setAircraftOptions((data.data || []).map(value => ({
      id: value,
      name: value
    })))).catch(() => {});
  }, [request]);

  useEffect(() => {
    const id = route?.params?.targetRequestId || route?.params?.requisitionId;
    if (id) {
      setSelectedId(id);
      setEntry(false);
    }
  }, [route?.params]);

  useEffect(() => {
    if (typeof EventSource === 'undefined') return undefined;
    const stream = new EventSource(`${API_BASE}/api/events/stream`);
    const changed = event => {
      try {
        const payload = JSON.parse(event.data || '{}');
        if (String(payload.url || '').startsWith('/api/parts-requisition')) load();
      } catch {/* Polling remains the fallback. */}
    };
    stream.addEventListener('data-changed', changed);
    stream.addEventListener('requisition:updated', load);
    return () => {
      stream.removeEventListener('data-changed', changed);
      stream.removeEventListener('requisition:updated', load);
      stream.close();
    };
  }, [load]);

  const action = async (record, action, extra = {}) => {
    if (action !== 'stock' && !(await confirm({
      deliver: 'Confirm delivery',
      confirm: 'Confirm receipt',
      cancel: 'Cancel requisition',
      'follow-up': 'Send follow-up reminder'
    }[action], action === 'confirm' ? 'Confirm you received all requested parts. This closes the requisition.' : `Continue for ${record.wrsNo}?`))) return;
    setBusy(true);
    try {
      const updated = await request(`parts-requisition/update-requisition/${record._id}`, {
        action,
        ...extra
      });
      setRecords(records => records.map(record => record._id === updated._id ? updated : record));
      return true;
    } catch (error) {
      Alert.alert('Could not update', error.message);
      await load();
      return false;
    } finally {
      setBusy(false);
    }
  };

  const create = async ({
    aircraft,
    items
  }) => {
    if (!aircraft || !items.length || items.some(item => !item.particular?.trim() || !Number(item.quantity) || Number(item.quantity) <= 0)) {
      Alert.alert('Check requisition', 'Choose an aircraft and add part names with positive quantities.');
      return;
    }
    if (!(await confirm('Submit requisition', 'Send these parts to warehouse for a stock check?'))) return;
    setBusy(true);
    try {
      const record = await request('parts-requisition/create-requisition', {
        aircraft,
        items: items.map(item => ({
          particular: item.particular,
          quantity: Number(item.quantity),
          unitOfMeasure: item.unit || item.unitOfMeasure || 'PC',
          purpose: item.purpose
        }))
      });
      setRecords(records => [record, ...records]);
      setEntry(false);
    } catch (error) {
      Alert.alert('Could not submit', error.message);
    } finally {
      setBusy(false);
    }
  };

  const oversight = isOversight(user);
  const canSee = record => {
    const own = isRequisitionOwner(user, record);
    return oversight || roleOf(user) === 'warehouse personnel' || own;
  };
  const filtered = records.filter(record => {
    const closed = ['Closed', 'Cancelled'].includes(displayStatus(record));
    return (tab === 'history' ? closed : !closed) && canSee(record) && `${record.wrsNo} ${record.aircraft} ${record.staff?.requisitioner} ${displayStatus(record)}`.toLowerCase().includes(search.toLowerCase());
  });
  const activeCount = records.filter(record => !['Closed', 'Cancelled'].includes(displayStatus(record)) && canSee(record)).length;

  if (!['admin staff', 'officer-in-charge', 'warehouse personnel', 'maintenance manager', 'mechanic'].includes(roleOf(user))) return <AppText>Parts requisition access denied</AppText>;

  return <View style={{
    flex: 1,
    backgroundColor: '#F3F3F3'
  }}>
    <View style={{
      paddingHorizontal: 16,
      paddingTop: 20,
      paddingBottom: 8
    }}>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
      }}>
        <View style={{
          flex: 1,
          height: 52,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: '#DCDCDC',
          backgroundColor: '#fff',
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 14
        }}>
          <MaterialCommunityIcons name="magnify" size={26} color="#444" />
          <AppInput placeholder="Search by WRS#" placeholderTextColor="#555" value={search} onChangeText={setSearch} style={{
            flex: 1,
            paddingHorizontal: 12,
            paddingVertical: 0,
            fontSize: 16,
            color: '#222'
          }} />
        </View>
        {canCreate(user) && <TouchableOpacity disabled={busy} activeOpacity={0.85} onPress={() => { setSelectedId(null); setEntry(true); }} style={{
          width: 116,
          height: 52,
          backgroundColor: COLORS.primaryLight,
          borderRadius: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: busy ? 0.7 : 1
        }}>
          <MaterialCommunityIcons name="plus" size={26} color="#fff" />
          <AppText style={{
            color: '#fff',
            fontSize: 16,
            fontWeight: '700'
          }}>Request</AppText>
        </TouchableOpacity>}
      </View>
      <View style={{
        flexDirection: 'row',
        marginTop: 16,
        gap: 12
      }}>
        <TouchableOpacity activeOpacity={0.85} onPress={() => setSortOrder(order => order === 'oldest' ? 'newest' : 'oldest')} style={{
          flex: 1,
          height: 52,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: '#DCDCDC',
          backgroundColor: '#fff',
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 14
        }}>
          <MaterialCommunityIcons name="tune-variant" size={22} color={COLORS.primaryLight} />
          <AppText numberOfLines={1} style={{
            flex: 1,
            marginLeft: 10,
            color: '#111',
            fontSize: 15,
            fontWeight: '700'
          }}>Date: {sortOrder === 'oldest' ? 'Oldest First' : 'Newest First'}</AppText>
          <MaterialCommunityIcons name="chevron-down" size={24} color="#555" />
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.85} onPress={() => setTab(value => value === 'active' ? 'history' : 'active')} style={{
          flex: 1,
          height: 52,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: '#DCDCDC',
          backgroundColor: '#fff',
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 14
        }}>
          <MaterialCommunityIcons name="tune-variant" size={22} color={COLORS.primaryLight} />
          <AppText numberOfLines={1} style={{
            flex: 1,
            marginLeft: 10,
            color: '#111',
            fontSize: 15,
            fontWeight: '700'
          }}>{tab === 'history' ? 'History' : `Pending (${activeCount})`}</AppText>
          <MaterialCommunityIcons name="chevron-down" size={24} color="#555" />
        </TouchableOpacity>
      </View>
      {!!error && <TouchableOpacity onPress={load}><AppText style={{
        color: '#a85d5d',
        marginTop: 10
      }}>{error} - Tap to retry</AppText></TouchableOpacity>}
    </View>
    <PartsRequisitionCards requisitions={filtered} sortOrder={sortOrder} onViewDetails={record => { setEntry(false); setSelectedId(record._id); }} oversight={oversight} onFollowUp={record => action(record, 'follow-up')} busy={busy} refreshControl={<RefreshControl refreshing={loading} onRefresh={() => {
      setLoading(true);
      load();
    }} />} />
    <PartsRequisitionDetails record={records.find(record => record._id === selectedId)} visible={!!selectedId && !entry} onClose={() => setSelectedId(null)} user={user} onAction={action} busy={busy} />
    <PartsRequisitionEntry visible={entry && !selectedId} onClose={() => !busy && setEntry(false)} onSubmit={create} selectedAircraft={aircraft} onChangeAircraft={setAircraft} aircraftOptions={aircraftOptions} title="New parts requisition" />
  </View>;
}
