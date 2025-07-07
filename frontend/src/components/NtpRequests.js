import React, { useEffect, useState } from 'react';
import styles from '../styles/NtpRequests.module.css'; // Import CSS Module
import { fetchNtpRequests } from '../api';

function NtpRequests() {
  const [ntpData, setNtpData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadNtpData = async () => {
      try {
        const data = await fetchNtpRequests();
        setNtpData(data);
      } catch (e) {
        setError(e.message || 'Failed to fetch NTP requests');
      } finally {
        setLoading(false);
      }
    };

    loadNtpData();
  }, []);

  if (loading) {
    return <div className="loading">Loading NTP requests...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <div className={styles.container}>
      <h2>NTP Honeypot Requests</h2>
      {ntpData.length === 0 ? (
        <p>No NTP requests captured yet.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Timestamp (UTC)</th>
              <th>Source IP</th>
              <th>Raw Log</th>
            </tr>
          </thead>
          <tbody>
            {ntpData.map((request) => (
              <tr key={request._id}>
                <td>{new Date(request.timestamp).toUTCString()}</td>
                <td>{request.source_ip}</td>
                <td>{request.raw_log}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default NtpRequests;