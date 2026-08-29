'use strict';

/**
 * CHECK G — IAP / subscription checks.
 *
 * Even with purchases OFF today ("READY BUT OFF" per docs/PAYMENTS_V1_STATUS.md
 * and docs/app-store-iap.md), the gate checks configuration readiness and
 * store-compliance risk. It does not change payment behaviour.
 */

const { STATUS, worstStatus } = require('./constants.cjs');
const { loadReleaseComplianceConfig } = require('./load-config.cjs');
const { readFileSafe, fileExists } = require('./fs-utils.cjs');

function checkKillSwitchDocumented(repoRoot, config) {
  const envVar = config.iapEvidence?.killSwitchEnvVar || 'BILLING_UI_DISABLED';
  const envExample = readFileSafe(repoRoot, '.env.example');
  const docPresent = readFileSafe(repoRoot, 'docs/app-store-iap.md');
  const inEnvExample = envExample ? envExample.includes(envVar) : false;
  const inDocs = docPresent ? docPresent.includes(envVar) : false;
  return {
    id: 'kill_switch_documented',
    status: inEnvExample && inDocs ? STATUS.PASS : STATUS.MANUAL_REVIEW_REQUIRED,
    evidence: { envVar, inEnvExample, inDocs },
  };
}

function checkNoLivePurchaseButtonsWhenDisabled(repoRoot, config) {
  const clientFile = readFileSafe(repoRoot, 'public/js/iap-manager.js') || readFileSafe(repoRoot, 'public/js/paywall.js');
  if (clientFile == null) {
    return { id: 'no_live_purchase_buttons_when_disabled', status: STATUS.MANUAL_REVIEW_REQUIRED, evidence: { reason: 'client_iap_file_not_found' } };
  }
  const respectsServerConfig = /nativePurchasesEnabled/.test(clientFile) || /canPurchase/.test(clientFile);
  return {
    id: 'no_live_purchase_buttons_when_disabled',
    status: respectsServerConfig ? STATUS.PASS : STATUS.MANUAL_REVIEW_REQUIRED,
    evidence: { respectsServerConfig },
  };
}

function checkRestorePurchasesWired(repoRoot, config) {
  const filePath = config.iapEvidence?.restorePurchasesUiFile || 'public/js/paywall.js';
  const mustMatch = config.iapEvidence?.restorePurchasesMustMatch || 'restorePurchases';
  const content = readFileSafe(repoRoot, filePath);
  const status = content && content.includes(mustMatch) ? STATUS.PASS : STATUS.MANUAL_REVIEW_REQUIRED;
  return { id: 'restore_purchases_wired', status, evidence: { filePath, mustMatch, found: Boolean(content) } };
}

function checkNoExternalPaymentLinksOnIos(repoRoot) {
  const iosCapacitorInclude = readFileSafe(repoRoot, 'capacitor.config.ts') || readFileSafe(repoRoot, 'capacitor.config.json');
  const paywallJs = readFileSafe(repoRoot, 'public/js/paywall.js');
  const hasExternalPaymentLink = paywallJs ? /stripe\.com|checkout\.stripe|buy\.stripe/i.test(paywallJs) : false;
  return {
    id: 'no_external_payment_links_on_ios',
    status: hasExternalPaymentLink ? STATUS.FAIL : STATUS.PASS,
    evidence: { hasExternalPaymentLink, checkedFile: 'public/js/paywall.js', capacitorConfigFound: Boolean(iosCapacitorInclude) },
  };
}

function checkGrandfatheringDocumented(repoRoot) {
  const doc = readFileSafe(repoRoot, 'docs/app-store-iap.md');
  const status = doc && /grandfather/i.test(doc) ? STATUS.PASS : STATUS.MANUAL_REVIEW_REQUIRED;
  return { id: 'grandfathering_documented', status, evidence: { found: Boolean(doc) } };
}

function runIapChecks(repoRoot) {
  const config = loadReleaseComplianceConfig(repoRoot);
  const checks = [
    checkKillSwitchDocumented(repoRoot, config),
    checkNoLivePurchaseButtonsWhenDisabled(repoRoot, config),
    checkRestorePurchasesWired(repoRoot, config),
    checkNoExternalPaymentLinksOnIos(repoRoot),
    checkGrandfatheringDocumented(repoRoot),
    {
      id: 'store_console_product_state',
      status: STATUS.MANUAL_REVIEW_REQUIRED,
      evidence: {
        reason:
          'Whether IAP/subscription products, pricing, and trial copy in App Store Connect / Play Console match this repo cannot be verified from repo data alone.',
      },
    },
  ];
  const status = worstStatus(checks.map((c) => c.status));
  return {
    id: 'G_iap_subscription_checks',
    title: 'G — IAP / subscription checks',
    status,
    summary:
      status === STATUS.FAIL
        ? 'A purchase-path or kill-switch check failed — see evidence.'
        : 'Kill switches, restore-purchases wiring, and absence of external iOS payment links check out from repo data. Store console product/pricing state still needs manual verification.',
    evidence: { checks },
  };
}

module.exports = { runIapChecks };
