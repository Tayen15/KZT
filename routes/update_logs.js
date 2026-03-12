const fs = require('fs');
const file = '../../web/src/app/dashboard/owner/logs/page.tsx';
let txt = fs.readFileSync(file, 'utf8');

const replacement = \'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface LogFile { name: string; size: number; modified: string; }

export default function OwnerLogsPage() {
  const [logFiles, setLogFiles] = useState<LogFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<{name: string, content: string} | null>(null);
  const [loadingLog, setLoadingLog] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = () => {
    setLoading(true);
    fetch('/api/bot/owner/logs')
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setLogFiles(data.files || []);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const handleRefresh = () => {
    fetchLogs();
  };

  const handleViewLog = (filename: string) => {
    setLoadingLog(true);
    fetch('/api/bot/owner/logs/' + filename)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setSelectedLog({ name: filename, content: data.content });
        } else {
          alert('Failed to load log: ' + data.message);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingLog(false));
  };

  const closeLogView = () => {
    setSelectedLog(null);
  };
\;
txt = txt.replace(/[\s\S]*?return \(/, replacement + '\\n  return (');
fs.writeFileSync(file, txt);

