// jsdom does not provide TextEncoder/TextDecoder; pull them from Node core so
// browser-targeted code (e.g. the ZATCA TLV encoder) runs under test.
const { TextEncoder, TextDecoder } = require('util');

if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}
