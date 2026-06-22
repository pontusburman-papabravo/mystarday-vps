'use strict';

const express = require('express');
const { z } = require('zod');
const { requireChild, requireParent, requireAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const familyHallDb = require('../../db/family-hall');

const CreateProjectSchema = z.object({
  title: z.string().min(1).max(128),
  emoji: z.string().max(16).optional(),
  targetValue: z.number().int().min(1).max(100000).optional(),
});

async function resolveFamilyId(user) {
  if (!user) return null;
  if (user.type === 'child') {
    return user.familyId || user.family_id || null;
  }
  return user.familyId || user.family_id || null;
}

async function requireFamilyContext(req, res, next) {
  try {
    const familyId = await resolveFamilyId(req.user);
    if (!familyId) return res.status(400).json({ error: 'Ingen familj kopplad' });
    req.familyId = familyId;
    next();
  } catch (err) {
    next(err);
  }
}

async function getHallHandler(req, res, next) {
  try {
    const opts = { includePersons: req.user && req.user.type === 'child' };
    if (opts.includePersons) opts.childId = req.user.id;
    const hall = await familyHallDb.getFamilyHall(req.familyId, opts);
    res.json(hall);
  } catch (err) {
    next(err);
  }
}

// ─── Child: GET /api/me/family ────────────────────────────

const childRouter = express.Router();
childRouter.use(requireChild, requireFamilyContext);
childRouter.get('/family', getHallHandler);

// ─── Parent: GET /api/family/hall, POST /api/family/projects ─

const parentRouter = express.Router();
parentRouter.get('/hall', requireParent, requireFamilyContext, getHallHandler);
parentRouter.post('/projects', requireParent, requireFamilyContext, validate(CreateProjectSchema), async (req, res, next) => {
  try {
    const project = await familyHallDb.createProject(req.familyId, {
      title: req.body.title,
      emoji: req.body.emoji,
      targetValue: req.body.targetValue,
    });
    res.status(201).json({
      id: project.id,
      title: project.title,
      emoji: project.emoji,
      targetValue: project.target_value,
      currentValue: project.current_value,
      status: project.status,
    });
  } catch (err) {
    next(err);
  }
});

// ─── Shared read: GET /api/family/memory (child or parent) ─

const memoryRouter = express.Router();
memoryRouter.get('/memory', requireAuth, requireFamilyContext, getHallHandler);

module.exports = { childRouter, parentRouter, memoryRouter };
