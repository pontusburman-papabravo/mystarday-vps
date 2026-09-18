/**
 * src/routes/admin/meta-ads.js
 * Owns: Admin Meta Ads drafts, approval, pause, and insights.
 * Does NOT own: page feed posting (src/lib/facebook.js).
 *
 * All routes require admin auth — applied by the parent admin router before mount.
 * Approve is the only path that spends money on Meta.
 */

const express = require('express');
const { ZodError } = require('zod');
const campaigns = require('../../../db/meta-ad-campaigns');
const {
  parseCampaignBrief,
  requirePublishableCreative,
  getPublicMetaAdsConfig,
  isMetaAdsConfigured,
  publishApprovedCampaign,
  setCampaignStatusOnMeta,
  fetchCampaignInsights,
  oreToSek,
} = require('../../lib/meta-ads');

const router = express.Router();

function actorId(req) {
  return req.user?.id || null;
}

function graphClient(req) {
  return req.app.get('metaAdsGraphClient') || undefined;
}

function publicCampaign(row) {
  if (!row) return null;
  return {
    ...row,
    daily_budget_sek: oreToSek(row.daily_budget_ore),
    lifetime_budget_sek: row.lifetime_budget_ore == null ? null : oreToSek(row.lifetime_budget_ore),
  };
}

function validationError(err, res) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Ogiltig kampanj',
      details: err.issues.map((issue) => issue.message),
    });
  }
  if (err.code === 'META_ADS_COPY_BLOCKED') {
    return res.status(400).json({
      error: err.message,
      violations: err.violations,
    });
  }
  if (
    err.code === 'META_ADS_BUDGET_CAP' ||
    err.code === 'META_ADS_BAD_DESTINATION' ||
    err.code === 'META_ADS_IMAGE_REQUIRED'
  ) {
    return res.status(400).json({ error: err.message, code: err.code });
  }
  return null;
}

router.get('/status', (req, res) => {
  res.json(getPublicMetaAdsConfig());
});

router.get('/', async (req, res) => {
  try {
    const [rows, summary, config] = await Promise.all([
      campaigns.listCampaigns({ status: req.query.status || undefined }),
      campaigns.getSummary(),
      Promise.resolve(getPublicMetaAdsConfig()),
    ]);
    res.json({
      campaigns: rows.map(publicCampaign),
      summary,
      config,
    });
  } catch (err) {
    console.error('[META-ADS] list error:', err);
    res.status(500).json({ error: 'Kunde inte hämta Meta-annonser', detail: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const row = await campaigns.getById(req.params.id);
    if (!row) return res.status(404).json({ error: 'Kampanjen hittades inte' });
    const actions = await campaigns.listActions(row.id);
    res.json({ campaign: publicCampaign(row), actions });
  } catch (err) {
    console.error('[META-ADS] get error:', err);
    res.status(500).json({ error: 'Kunde inte hämta kampanjen', detail: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const brief = parseCampaignBrief({
      ...(req.body || {}),
      created_source: req.body?.created_source === 'cursor' ? 'cursor' : 'admin',
    });
    const row = await campaigns.insertCampaign(brief, {
      actorId: actorId(req),
      actorSource: brief.created_source,
    });
    res.status(201).json({ campaign: publicCampaign(row) });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Slug används redan — välj ett annat kampanjnamn' });
    }
    if (validationError(err, res)) return;
    console.error('[META-ADS] create error:', err);
    res.status(500).json({ error: 'Kunde inte spara utkast', detail: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const existing = await campaigns.getById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Kampanjen hittades inte' });
    if (!['draft', 'rejected'].includes(existing.status)) {
      return res.status(409).json({ error: 'Bara utkast och avvisade kampanjer kan redigeras' });
    }
    const brief = parseCampaignBrief({
      ...(req.body || {}),
      created_source: existing.created_source,
    });
    const row = await campaigns.updateDraft(existing.id, brief);
    if (!row) return res.status(409).json({ error: 'Kampanjen kunde inte uppdateras' });
    await campaigns.logAction(row.id, 'updated', actorId(req), existing.created_source);
    res.json({ campaign: publicCampaign(row) });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Slug används redan' });
    }
    if (validationError(err, res)) return;
    console.error('[META-ADS] update error:', err);
    res.status(500).json({ error: 'Kunde inte uppdatera utkast', detail: err.message });
  }
});

router.post('/:id/submit', async (req, res) => {
  try {
    const existing = await campaigns.getById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Kampanjen hittades inte' });
    requirePublishableCreative(existing);
    parseCampaignBrief({
      name: existing.name,
      slug: existing.slug,
      objective: existing.objective,
      destination_url: existing.destination_url,
      daily_budget_sek: oreToSek(existing.daily_budget_ore),
      lifetime_budget_sek: existing.lifetime_budget_ore == null ? null : oreToSek(existing.lifetime_budget_ore),
      countries: existing.countries,
      age_min: existing.age_min,
      age_max: existing.age_max,
      primary_text: existing.primary_text,
      headline: existing.headline,
      description: existing.description,
      call_to_action: existing.call_to_action,
      image_url: existing.image_url,
      hypothesis: existing.hypothesis,
      primary_metric: existing.primary_metric,
      notes: existing.notes,
    });
    const row = await campaigns.submitForApproval(existing.id, actorId(req));
    if (!row) return res.status(409).json({ error: 'Kampanjen kan inte skickas för godkännande' });
    res.json({ campaign: publicCampaign(row) });
  } catch (err) {
    if (validationError(err, res)) return;
    console.error('[META-ADS] submit error:', err);
    res.status(500).json({ error: 'Kunde inte skicka för godkännande', detail: err.message });
  }
});

router.post('/:id/reject', async (req, res) => {
  try {
    const reason = String(req.body?.reason || '').trim() || null;
    const row = await campaigns.rejectCampaign(req.params.id, actorId(req), reason);
    if (!row) return res.status(409).json({ error: 'Kampanjen kan inte avvisas i nuvarande status' });
    res.json({ campaign: publicCampaign(row) });
  } catch (err) {
    console.error('[META-ADS] reject error:', err);
    res.status(500).json({ error: 'Kunde inte avvisa kampanjen', detail: err.message });
  }
});

router.post('/:id/approve', async (req, res) => {
  try {
    if (!isMetaAdsConfigured()) {
      return res.status(409).json({
        error: 'Meta Ads är inte konfigurerat. Sätt META_ADS_ACCESS_TOKEN, META_AD_ACCOUNT_ID och FACEBOOK_PAGE_ID / META_ADS_PAGE_ID.',
        code: 'META_ADS_NOT_CONFIGURED',
      });
    }
    const existing = await campaigns.getById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Kampanjen hittades inte' });
    requirePublishableCreative(existing);
    parseCampaignBrief({
      name: existing.name,
      slug: existing.slug,
      objective: existing.objective,
      destination_url: existing.destination_url,
      daily_budget_sek: oreToSek(existing.daily_budget_ore),
      lifetime_budget_sek: existing.lifetime_budget_ore == null ? null : oreToSek(existing.lifetime_budget_ore),
      countries: existing.countries,
      age_min: existing.age_min,
      age_max: existing.age_max,
      primary_text: existing.primary_text,
      headline: existing.headline,
      description: existing.description,
      call_to_action: existing.call_to_action,
      image_url: existing.image_url,
      hypothesis: existing.hypothesis,
      primary_metric: existing.primary_metric,
      notes: existing.notes,
    });
    const claimed = await campaigns.claimForPublish(existing.id, actorId(req));
    if (!claimed) {
      return res.status(409).json({ error: 'Kampanjen väntar inte på godkännande' });
    }
    await campaigns.logAction(claimed.id, 'approved', actorId(req), 'admin');
    try {
      const metaIds = await publishApprovedCampaign(claimed, { graphClient: graphClient(req) });
      const live = await campaigns.markLive(claimed.id, metaIds);
      await campaigns.logAction(claimed.id, 'published', actorId(req), 'system', metaIds);
      res.json({ campaign: publicCampaign(live) });
    } catch (publishErr) {
      const failed = await campaigns.markFailed(claimed.id, publishErr.message, {
        meta_campaign_id: claimed.meta_campaign_id,
        meta_adset_id: claimed.meta_adset_id,
        meta_creative_id: claimed.meta_creative_id,
        meta_ad_id: claimed.meta_ad_id,
        meta_image_hash: claimed.meta_image_hash,
      });
      await campaigns.logAction(claimed.id, 'failed', actorId(req), 'system', {
        message: publishErr.message,
      });
      console.error('[META-ADS] publish error:', publishErr.message);
      res.status(502).json({
        error: 'Godkänd men Meta-publicering misslyckades: ' + publishErr.message,
        campaign: publicCampaign(failed),
      });
    }
  } catch (err) {
    if (validationError(err, res)) return;
    console.error('[META-ADS] approve error:', err);
    res.status(500).json({ error: 'Kunde inte godkänna kampanjen', detail: err.message });
  }
});

router.post('/:id/pause', async (req, res) => {
  try {
    const existing = await campaigns.getById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Kampanjen hittades inte' });
    if (existing.status !== 'live') {
      return res.status(409).json({ error: 'Bara live-kampanjer kan pausas' });
    }
    if (existing.meta_campaign_id && isMetaAdsConfigured()) {
      await setCampaignStatusOnMeta(existing.meta_campaign_id, 'PAUSED', {
        graphClient: graphClient(req),
      });
    }
    const row = await campaigns.pauseCampaign(existing.id, actorId(req));
    res.json({ campaign: publicCampaign(row) });
  } catch (err) {
    console.error('[META-ADS] pause error:', err);
    res.status(502).json({ error: 'Kunde inte pausa kampanjen', detail: err.message });
  }
});

router.post('/:id/resume', async (req, res) => {
  try {
    const existing = await campaigns.getById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Kampanjen hittades inte' });
    if (existing.status !== 'paused') {
      return res.status(409).json({ error: 'Bara pausade kampanjer kan återupptas' });
    }
    if (!existing.meta_campaign_id) {
      return res.status(409).json({ error: 'Kampanjen saknar Meta-id och kan inte återupptas' });
    }
    if (isMetaAdsConfigured()) {
      await setCampaignStatusOnMeta(existing.meta_campaign_id, 'ACTIVE', {
        graphClient: graphClient(req),
      });
    }
    const row = await campaigns.resumeCampaign(existing.id, actorId(req));
    res.json({ campaign: publicCampaign(row) });
  } catch (err) {
    console.error('[META-ADS] resume error:', err);
    res.status(502).json({ error: 'Kunde inte återuppta kampanjen', detail: err.message });
  }
});

router.get('/:id/insights', async (req, res) => {
  try {
    const existing = await campaigns.getById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Kampanjen hittades inte' });
    if (!existing.meta_campaign_id) {
      return res.status(409).json({ error: 'Inga Meta-insikter ännu — kampanjen är inte publicerad' });
    }
    if (!isMetaAdsConfigured()) {
      return res.status(409).json({ error: 'Meta Ads är inte konfigurerat' });
    }
    const insights = await fetchCampaignInsights(existing.meta_campaign_id, {
      graphClient: graphClient(req),
    });
    const saved = await campaigns.saveInsights(existing.id, insights);
    res.json({ campaign: publicCampaign(saved), insights });
  } catch (err) {
    console.error('[META-ADS] insights error:', err);
    res.status(502).json({ error: 'Kunde inte hämta insikter', detail: err.message });
  }
});

module.exports = router;
