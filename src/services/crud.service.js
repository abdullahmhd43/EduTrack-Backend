const mongoose = require('mongoose');
const Course = require('../models/Course');
const ApiError = require('../utils/ApiError');

const sameValue = (a, b) => {
  if (a instanceof Date || b instanceof Date) return new Date(a).getTime() === new Date(b).getTime();
  return (a ?? null) === (b ?? null);
};

/** Does this payload change anything compared to the stored document? (used for idempotent PUT) */
const isNoOp = (doc, data, fields) => fields.every((f) => sameValue(doc[f], data[f]));

function assertObjectId(id) {
  if (!mongoose.isValidObjectId(id)) throw ApiError.badRequest('Invalid id');
}

async function assertCourseExists(userId, courseClientId) {
  const exists = await Course.exists({ userId, clientId: courseClientId });
  if (!exists) throw ApiError.badRequest('Validation failed', { errors: [{ field: 'courseClientId', message: 'Course does not exist' }] });
}

async function checkRefs(res, userId, data) {
  if (res.requiresCourse || (res.optionalCourse && data.courseClientId)) {
    await assertCourseExists(userId, data.courseClientId);
  }
}

const pick = (obj, fields) => Object.fromEntries(fields.filter((f) => obj[f] !== undefined).map((f) => [f, obj[f]]));

async function list(res, userId, { updatedSince } = {}) {
  const filter = { userId };
  if (updatedSince && !Number.isNaN(Date.parse(updatedSince))) filter.updatedAt = { $gt: new Date(updatedSince) };
  return res.Model.find(filter).sort({ updatedAt: -1 });
}

async function getOne(res, userId, id) {
  assertObjectId(id);
  const doc = await res.Model.findOne({ _id: id, userId });
  if (!doc) throw ApiError.notFound(`${res.path} record not found`);
  return doc;
}

/** Idempotent create: same (userId, clientId) returns the existing record instead of a duplicate. */
async function create(res, userId, body) {
  const existing = await res.Model.findOne({ userId, clientId: body.clientId });
  if (existing) return { doc: existing, created: false };
  await checkRefs(res, userId, body);
  try {
    const doc = await res.Model.create({ userId, clientId: body.clientId, ...pick(body, res.fields) });
    return { doc, created: true };
  } catch (e) {
    if (e.code === 11000) { // lost a race with a retried request
      const doc = await res.Model.findOne({ userId, clientId: body.clientId });
      if (doc) return { doc, created: false };
    }
    throw e;
  }
}

/**
 * Update with optimistic concurrency.
 *  - If the client sends baseUpdatedAt and the server copy is newer -> 409 + serverVersion (never silently overwritten)
 *  - force:true means "the user chose to keep my version" after seeing the conflict.
 *  - A payload identical to the stored data is a no-op (makes retried PUTs idempotent).
 */
async function update(res, userId, id, body) {
  const doc = await getOne(res, userId, id);
  const { baseUpdatedAt, force, ...data } = body;
  if (isNoOp(doc, data, res.fields)) return doc;
  if (!force && baseUpdatedAt && doc.updatedAt.getTime() > new Date(baseUpdatedAt).getTime()) {
    throw ApiError.conflict('Record was modified on the server after your last sync', { serverVersion: doc.toJSON() });
  }
  await checkRefs(res, userId, data);
  Object.assign(doc, pick(data, res.fields));
  await doc.save();
  return doc;
}

async function remove(res, userId, id) {
  const doc = await getOne(res, userId, id);
  if (res.cascade) {
    await Promise.all(res.cascade.map((M) => M.deleteMany({ userId, courseClientId: doc.clientId })));
  }
  await doc.deleteOne();
}

module.exports = { list, getOne, create, update, remove, isNoOp };
