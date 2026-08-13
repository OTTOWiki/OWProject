/**
 * bun test 入口：包装 run-node.mjs（assert.js 桥接 node:test）。
 * bun 要求测试文件名含 .test/.spec，且 node:test 只能在 bun test runner 内调用，
 * 故 npm test 的入口 run-node.mjs 不能被 bun 直跑。
 * Usage: bun test   （或 npm run test:bun）
 */
import './run-node.mjs';
