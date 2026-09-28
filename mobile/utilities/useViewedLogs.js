import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createUseViewedLogs } from '../../shared/viewedLogs';

export default createUseViewedLogs(React, AsyncStorage);
