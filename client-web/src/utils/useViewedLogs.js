import React from 'react';
import { createUseViewedLogs } from '../../../shared/viewedLogs';

export default createUseViewedLogs(React, {
  getItem: key => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
});
