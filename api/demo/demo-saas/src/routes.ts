import Router from 'koa-router';
import { ApiConfig } from './ApiConfig';
import { salesAgents, inquiries, getNextInquiry } from './data';
import { request } from '@5qtrs/request';

export function routes(config: ApiConfig) {
  const router = new Router();
  router.get('/agents', getAgents(config));
  router.get('/inquiries', getInquiries(config));
  router.post('/inquiries', generateInquiry(config));
  router.post('/agents/:agentid/inquires/:inquiryid', assignInquiry(config));

  return router.routes();
}

function getAgents(config: ApiConfig) {
  return async (context: any) => {
    context.body = salesAgents;
  };
}

function generateInquiry(config: ApiConfig) {
  return async (context: any) => {
    let inquiry = getNextInquiry();
    console.log(inquiry);
    try {
      const response = await request({
        method: 'POST',
        data: inquiry,
        url: `http://localhost:3001/api/v1/run/myboundary/myfunction`,
      });

      if (response.status === 200) {
        const updatedInquiry = response.data;
        if (updatedInquiry && updatedInquiry.email && updatedInquiry.message) {
          inquiry = response.data;
        }
      }
    } catch (error) {
      //console.log(error);
    }
    inquiries.push(inquiry);
    console.log(inquiries);

    context.body = inquiry;
  };
}

function getInquiries(config: ApiConfig) {
  return async (context: any) => {
    context.body = inquiries;
  };
}

function assignInquiry(config: ApiConfig) {
  return async (context: any) => {
    const agent = salesAgents[context.path.agentid];
    const inquiry = inquiries[context.path.inquiry];
    if (agent && inquiry) {
      agent.inquiries.push(inquiry);
      inquiry.assignedTo = agent;
    }
    context.body = salesAgents;
  };
}
