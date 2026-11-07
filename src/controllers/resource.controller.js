const asyncHandler = require('../utils/asyncHandler');
const svc = require('../services/crud.service');
const { parseBody } = require('../middleware/validate');

/** Builds the 5 CRUD handlers for a resource definition (see src/resources.js). */
module.exports = (res) => ({
  list: asyncHandler(async (req, rs) => {
    const docs = await svc.list(res, req.user._id, { updatedSince: req.query.updatedSince });
    rs.json({ success: true, count: docs.length, data: docs });
  }),
  get: asyncHandler(async (req, rs) => {
    rs.json({ success: true, data: await svc.getOne(res, req.user._id, req.params.id) });
  }),
  create: asyncHandler(async (req, rs) => {
    const body = parseBody(res.schema.create, req.body);
    const { doc, created } = await svc.create(res, req.user._id, body);
    rs.status(created ? 201 : 200).json({ success: true, duplicate: !created, data: doc });
  }),
  update: asyncHandler(async (req, rs) => {
    const body = parseBody(res.schema.update, req.body);
    rs.json({ success: true, data: await svc.update(res, req.user._id, req.params.id, body) });
  }),
  remove: asyncHandler(async (req, rs) => {
    await svc.remove(res, req.user._id, req.params.id);
    rs.json({ success: true, message: 'Deleted' });
  }),
});
