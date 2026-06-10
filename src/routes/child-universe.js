'use strict';

const express = require('express');
const { requireChild, requireParent } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { z } = require('zod');
const universeEngine = require('../lib/universe-engine');
const universeDb = require('../../db/child-universe');
const { getStarBalance } = require('./rewards');

const AvatarPatchSchema = z.object({
  hair: z.enum(['short', 'curly', 'long', 'spiky']).optional(),
  outfit: z.enum(['tee', 'hoodie', 'cape', 'dress']).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  hat: z.enum(['none', 'cap', 'crown', 'star']).optional(),
});

const HousePatchSchema = z.object({
  theme: z.enum(['castle', 'treehouse', 'space']).optional(),
});

const PetSchema = z.object({
  species: z.enum(['dog', 'cat', 'rabbit', 'dragon']).optional(),
  name: z.string().min(1).max(32).optional(),
  accessory: z.enum(['none', 'bow', 'crown', 'scarf']).optional(),
});

const BuyCollectibleSchema = z.object({
  slug: z.string().min(1).max(64),
});

// ─── Child router ─────────────────────────────────────────

const childRouter = express.Router();
childRouter.use(requireChild);

childRouter.get('/universe', async (req, res, next) => {
  try {
    const state = await universeEngine.getUniverseState(req.user.id);
    if (!state) return res.status(404).json({ error: 'Barn hittades inte' });
    res.json(state);
  } catch (err) {
    next(err);
  }
});

childRouter.patch('/avatar', validate(AvatarPatchSchema), async (req, res, next) => {
  try {
    const config = await universeDb.updateAvatarConfig(req.user.id, req.body);
    res.json({ avatar_config: config });
  } catch (err) {
    next(err);
  }
});

childRouter.patch('/house', validate(HousePatchSchema), async (req, res, next) => {
  try {
    const child = await universeDb.getChildRow(req.user.id);
    const stats = await universeDb.getChildStats(req.user.id);
    const unlocked = universeEngine.computeUnlockedThemes(stats.lifetime_stars);
    if (req.body.theme && !unlocked.includes(req.body.theme)) {
      return res.status(403).json({ error: 'Temat är inte upplåst ännu' });
    }
    const config = await universeDb.updateHouseConfig(req.user.id, req.body);
    res.json({ house_config: config });
  } catch (err) {
    next(err);
  }
});

childRouter.post('/pet', validate(PetSchema), async (req, res, next) => {
  try {
    const stats = await universeDb.getChildStats(req.user.id);
    const rooms = universeEngine.computeUnlockedRooms(stats.lifetime_stars);
    if (!rooms.includes('pet')) {
      return res.status(403).json({ error: 'Husdjursrummet är inte upplåst ännu' });
    }
    const pet = await universeDb.upsertPet(req.user.id, req.body);
    res.json({ pet });
  } catch (err) {
    next(err);
  }
});

childRouter.post('/collectibles/buy', validate(BuyCollectibleSchema), async (req, res, next) => {
  try {
    const catalog = await universeDb.getAllCollectibles();
    const item = catalog.find((c) => c.slug === req.body.slug);
    if (!item || !item.star_cost) {
      return res.status(400).json({ error: 'Ogiltigt samlarföremål' });
    }
    const owned = await universeDb.getChildCollectibles(req.user.id);
    if (owned.some((c) => c.slug === item.slug)) {
      return res.status(409).json({ error: 'Du har redan detta föremål' });
    }
    const balance = await getStarBalance(req.user.id);
    if (balance < item.star_cost) {
      return res.status(402).json({ error: 'Inte tillräckligt med stjärnor', need: item.star_cost, have: balance });
    }
    await universeDb.unlockCollectible(req.user.id, item.slug);
    const collectibles = await universeDb.getChildCollectibles(req.user.id);
    res.json({ collectibles });
  } catch (err) {
    next(err);
  }
});

// ─── Parent router ────────────────────────────────────────

const parentRouter = express.Router();
parentRouter.use(requireParent);

parentRouter.get('/museum', async (req, res, next) => {
  try {
    const familyId = req.user.familyId || req.user.family_id;
    if (!familyId) return res.status(400).json({ error: 'Ingen familj' });
    const museum = await universeDb.getFamilyMuseumStats(familyId);
    res.json(museum);
  } catch (err) {
    next(err);
  }
});

parentRouter.get('/museum/:childId/year-story', async (req, res, next) => {
  try {
    const year = parseInt(req.query.year, 10) || new Date().getFullYear();
    const story = await universeDb.getYearStory(req.params.childId, year);
    res.json(story);
  } catch (err) {
    next(err);
  }
});

module.exports = { childRouter, parentRouter };
