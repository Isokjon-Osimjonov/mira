'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.ApiErrorSchema = exports.ApiResponseSchema = exports.RegionSchema = void 0
const zod_1 = require('zod')
exports.RegionSchema = zod_1.z.enum(['UZB', 'KOR'])
const ApiResponseSchema = (data) =>
  zod_1.z.object({ data, error: zod_1.z.null(), meta: zod_1.z.any().optional() })
exports.ApiResponseSchema = ApiResponseSchema
exports.ApiErrorSchema = zod_1.z.object({
  data: zod_1.z.null(),
  error: zod_1.z.object({ message: zod_1.z.string(), code: zod_1.z.string().optional() }),
})
//# sourceMappingURL=common.js.map
