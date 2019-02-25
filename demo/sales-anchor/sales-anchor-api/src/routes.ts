import { request } from '@5qtrs/request';
import Router from 'koa-router';
import { ApiConfig } from './ApiConfig';
import { getNextInquiry, inquiries, salesAgents } from './data';

// ------------------
// Internal Functions
// ------------------

function getAgents(config: ApiConfig) {
  return async (context: any) => {
    context.body = salesAgents;
  };
}

function generateInquiry(config: ApiConfig) {
  const functionsUrl = `${config.functionsBaseUrl}/api/v1/run/${config.functionBoundary}/${config.functionName}`;
  return async (context: any) => {
    let inquiry = getNextInquiry();
    try {
      const response = await request({
        method: 'POST',
        data: inquiry,
        url: functionsUrl,
      });

      if (response.status === 200) {
        const updatedInquiry = response.data;
        if (updatedInquiry && updatedInquiry.email && updatedInquiry.message) {
          if (!isNaN(updatedInquiry.agentId)) {
            updatedInquiry.assignedTo = salesAgents[updatedInquiry.agentId];
          }
          inquiry = updatedInquiry;
        }
      }
    } catch (error) {
      // do nothing
    }
    inquiries.push(inquiry);
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

// ------------------
// Exported Functions
// ------------------

export function routes(config: ApiConfig) {
  const router = new Router();
  router.get('/agents', getAgents(config));
  router.get('/inquiries', getInquiries(config));
  router.post('/inquiries', generateInquiry(config));
  router.post('/agents/:agentid/inquires/:inquiryid', assignInquiry(config));
  return router.routes();
}
