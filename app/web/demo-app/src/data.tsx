import React, { useState, useEffect } from 'react';
import { request } from '@5qtrs/request';

const baseUrl = 'http://localhost:8002';

export function getInquiries() {
  const [inquiries, setInquiries] = useState([]);

  async function pollForInquiries() {
    const { data } = await request(`${baseUrl}/inquiries`);
    if (data.length > inquiries.length) {
      setInquiries(data);
    }
  }

  useEffect(() => {
    document.addEventListener('keyup', async event => {
      console.log('KEYUP', event);
      if (event.code === 'ShiftRight' && event.metaKey) {
        console.log('TRIGGERING NEW INQUIRY');
        await request({ method: 'POST', url: `${baseUrl}/inquiries` });
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
