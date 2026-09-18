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
const nyhetDb = require('../../../db/dagens-nyhet');
const {
  parseCampaignBrief,
  requirePublishableCreative,
  getPublicMetaAdsConfig,
  isMetaAdsConfigured,
  publishApprovedCampaign,
  setCampaignStatusOnMeta,
  fetchCampaignInsights,
  oreToSek,
  rowToBriefInput,
  defaultBoostCopy,
  INSIGHTS_MIN_INTERVAL_MS,
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
    err.code === 'META_ADS_IMAGE_REQUIRED' ||
    err.code === 'META_ADS_BAD_STORY' ||
    err.code === 'META_ADS_POST_NOT_BOOSTABLE'
  ) {
    return res.status(400).json({ error: err.message, code: err.code });
  }
  return null;
}

router.get('/status', (req, res) => {
  res.json(getPublicMetaAdsConfig());
});

router.get('/boostable-posts', async (req, res) => {
  try {
    const posts = await nyhetDb.listBoostableFacebookPosts(20);
    res.json({
      posts: posts.map((row) => ({
        id: row.id,
        title: row.title,
        facebook_post_id: row.facebook_post_id,
        published_at: row.published_at,
        status: row.status,
      })),
    });
  } catch (err) {
    console.error('[META-ADS] boostable-posts error:', err);
    res.status(500).json({ error: 'Kunde inte hämta sidinlägg', detail: err.message });
  }
});

router.post('/boost', async (req, res) => {
  try {
    const body = req.body || {};
    let nyhet = null;
    let sourcePostId = String(body.source_post_id || '').trim();
    if (body.dagens_nyhet_id) {
      nyhet = await nyhetDb.getNyhetById(body.dagens_nyhet_id);
      if (!nyhet || !nyhet.facebook_post_id) {
        const error = new Error('Inlägget är inte publicerat på Facebook och kan inte boostas');
        error.code = 'META_ADS_POST_NOT_BOOSTABLE';
        throw error;
      }
      sourcePostId = nyhet.facebook_post_id;
    }
    const copy = defaultBoostCopy(nyhet || { title: body.headline, body: body.primary_text });
    const brief = parseCampaignBrief({
      kind: 'boost',
      name: body.name || copy.name,
      source_post_id: sourcePostId,
      daily_budget_sek: body.daily_budget_sek,
      countries: body.countries || ['SE'],
      age_min: body.age_min,
      age_max: body.age_max,
      headline: body.headline || copy.headline,
      primary_text: body.primary_text || copy.primary_text,
      hypothesis: body.hypothesis || copy.hypothesis,
      primary_metric: body.primary_metric || copy.primary_metric,
      notes: body.notes,
      created_source: body.created_source === 'cursor' ? 'cursor' : 'admin',
    });
    const row = await campaigns.insertCampaign(brief, {
      actorId: actorId(req),
      actorSource: brief.created_source,
    });
    const submitted = await campaigns.submitForApproval(row.id, actorId(req));
    res.status(201).json({ campaign: publicCampaign(submitted || row) });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Slug används redan — vänta en stund och försök igen' });
    }
    if (validationError(err, res)) return;
    console.error('[META-ADS] boost error:', err);
    res.status(500).json({ error: 'Kunde inte köa boost', detail: err.message });
  }
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
    parseCampaignBrief(rowToBriefInput(existing));
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
    parseCampaignBrief(rowToBriefInput(existing));
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
    const cachedAt = existing.last_insights_at ? new Date(existing.last_insights_at).getTime() : 0;
    const freshEnough = existing.last_insights && (Date.now() - cachedAt) < INSIGHTS_MIN_INTERVAL_MS;
    if (freshEnough && req.query.refresh !== '1') {
      return res.json({
        campaign: publicCampaign(existing),
        insights: existing.last_insights,
        cached: true,
      });
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
