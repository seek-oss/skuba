"use strict";
exports.__esModule = true;
exports.validateRequestBody = exports.validate = void 0;
var validate = function (_a) {
    var ctx = _a.ctx, input = _a.input, filter = _a.filter;
    try {
        return filter(input);
    }
    catch (err) {
        // TODO: consider providing structured error messages for your consumers.
        return ctx["throw"](422, err instanceof Error ? err.message : String(err));
    }
};
exports.validate = validate;
var validateRequestBody = function (ctx, filter) { return (0, exports.validate)({ ctx: ctx, input: ctx.request.body, filter: filter }); };
exports.validateRequestBody = validateRequestBody;
