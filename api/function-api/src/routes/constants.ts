export const corsManagementOptions = {
  origins: '*',
  methods: 'GET,POST,PUT,DELETE,PATCH',
  exposedHeaders: 'x-fx-logs,x-fx-response-source,content-length',
  credentials: true,
};

export const corsExecutionOptions = {
  origins: '*',
  methods: 'GET,POST,PUT,DELETE,PATCH,HEAD',
  exposedHeaders: 'x-fx-logs,x-fx-response-source,content-length',
  credentials: true,
};
