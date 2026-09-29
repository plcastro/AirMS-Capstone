import { COLORS } from '../../stylesheets/colors';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { Alert, RefreshControl, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AppText from '../../components/common/AppText';
import { SearchBar } from '../../components/common/MobileModule';
import InlineDropdown from '../../components/common/InlineDropdown';
import { AuthContext } from '../../Context/AuthContext';
import { getAuthHeaders } from '../../utilities/mobileApi';
import { API_BASE } from '../../utilities/API_BASE';
import { showToast } from '../../utilities/toast';
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
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false),
    [tabDropdownOpen, setTabDropdownOpen] = useState(false);

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
      showToast(error.message || 'Could not update requisition');
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
      showToast('Choose an aircraft and add part names with positive quantities.');
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
      showToast('Requisition submitted');
    } catch (error) {
      showToast(error.message || 'Could not submit requisition');
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

  if (!['superadmin', 'officer-in-charge', 'warehouse personnel', 'maintenance manager', 'mechanic'].includes(roleOf(user))) return <AppText>Parts requisition access denied</AppText>;

  return <View style={{
    flex: 1,
    backgroundColor: COLORS.grayLight
  }}>
    <View style={{
      paddingHorizontal: 10,
      paddingTop: 10,
      paddingBottom: 4,
      zIndex: 10
    }}>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
      }}>
        <SearchBar placeholder="Search by WRS#" value={search} onChangeText={setSearch} containerStyle={{ flex: 1, marginBottom: 0 }} />
        {canCreate(user) && <TouchableOpacity disabled={busy} activeOpacity={0.85} onPress={() => { setSelectedId(null); setEntry(true); }} style={{
          height: 46,
          paddingHorizontal: 14,
          backgroundColor: COLORS.primaryLight,
          borderRadius: 10,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          opacity: busy ? 0.7 : 1
        }}>
          <MaterialCommunityIcons name="plus" size={18} color={COLORS.white} />
          <AppText style={{
            color: COLORS.white,
            fontSize: 12,
            fontWeight: '700'
          }}>Request</AppText>
        </TouchableOpacity>}
      </View>
      <View style={{
        flexDirection: 'row',
        marginTop: 10,
        gap: 8
      }}>
        <View style={{ flex: 1, zIndex: sortDropdownOpen ? 20 : 1 }}>
          <InlineDropdown
            value={sortOrder}
            placeholder="Sort"
            open={sortDropdownOpen}
            onToggle={() => setSortDropdownOpen(current => {
              setTabDropdownOpen(false);
              return !current;
            })}
            onChange={value => {
              setSortOrder(value);
              setSortDropdownOpen(false);
            }}
            options={[
              { label: 'Date: Oldest First', value: 'oldest' },
              { label: 'Date: Newest First', value: 'newest' }
            ]}
          />
        </View>
        <View style={{ flex: 1, zIndex: tabDropdownOpen ? 20 : 1 }}>
          <InlineDropdown
            value={tab}
            placeholder="Status"
            open={tabDropdownOpen}
            onToggle={() => setTabDropdownOpen(current => {
              setSortDropdownOpen(false);
              return !current;
            })}
            onChange={value => {
              setTab(value);
              setTabDropdownOpen(false);
            }}
            options={[
              { label: `Pending (${activeCount})`, value: 'active' },
              { label: 'History', value: 'history' }
            ]}
          />
        </View>
      </View>
      {!!error && <TouchableOpacity onPress={load}><AppText style={{
        color: COLORS.dangerBorder,
        fontSize: 12,
        marginTop: 8
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
