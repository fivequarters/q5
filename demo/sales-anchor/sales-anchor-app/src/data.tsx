import { useEffect, useState } from 'react';
import { Api } from './api';

// ------------------
// Exported Functions
// ------------------

export function getInquiries(api: Api) {
  const [inquiries, setInquiries] = useState([]);

  async function pollForInquiries() {
    const { data } = await api.getInquiries();
    if (data.length > inquiries.length) {
      setInquiries(data);
    }
  }

  useEffect(() => {
    document.addEventListener('keyup', async (event) => {
      if (event.code === 'ShiftRight' && event.metaKey) {
        await api.generateInquiry();
      }
    });
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      return pollForInquiries();
    }, 500);
    return () => {
      clearInterval(timer);
    };
  }, [inquiries]);

  return inquiries;
}
