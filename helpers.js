const { randomFillSync, createHash } = require('crypto');
const { MAGIC_STRING } = require('./constants');

const getWebSocketAccept = (key) => createHash('sha1').update(key + MAGIC_STRING).digest('base64');

const unmask = (payloadData, maskKey) =>
  payloadData.map((byte, i) => {
    const j = i % 4;
    return byte ^ maskKey[j];
  });

const generateMaskKey = () => randomFillSync(Buffer.alloc(4), 0, 4);

const mask = (payload, maskKey) => unmask(payload, maskKey);

module.exports = {
  getWebSocketAccept,
  unmask,
  mask,
  generateMaskKey,
};
