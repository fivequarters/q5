import { request } from '@5qtrs/request';
import { useEffect, useState } from 'react';

// ------------------
// Exported Functions
// ------------------

export function getInquiries(saasBaseUrl: string) {
  const [inquiries, setInquiries] = useState([]);

  async function pollForInquiries() {
    const { data } = await request(`${saasBaseUrl}/inquiries`);
    if (data.length > inquiries.length) {
      setInquiries(data);
    }
  }

  useEffect(() => {
    document.addEventListener('keyup', async event => {
      if (event.code === 'ShiftRight' && event.metaKey) {
        await request({ method: 'POST', url: `${saasBaseUrl}/inquiries` });
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
