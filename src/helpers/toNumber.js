"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const isString_1 = require("./isString");
function toNumber(value) {
    return isString_1.isString(value) ? parseInt(value, 10) : value;
}
exports.toNumber = toNumber;
//# sourceMappingURL=toNumber.js.map