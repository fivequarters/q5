let memStorage = {};

const storage = {
  get: async (key) => memStorage[key],
  put: async (data, key) => {
    memStorage[key] = data;
  },
  delete: async (key, flag) => {
    if (flag) {
      memStorage = {};
    } else if (key) {
      delete memStorage[key];
    }
  },
};

exports.memStorage = memStorage;
exports.storage = storage;
