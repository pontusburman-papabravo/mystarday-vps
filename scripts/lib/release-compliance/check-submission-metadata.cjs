'use strict';

/**
 * GATE C helper — Submission metadata & review package.
 *
 * Most of Gate C lives in App Store Connect / Play Console, not in this
 * repo, and is therefore MANUAL_REVIEW_REQUIRED by construction. This
 * module only verifies that the repo-side evidence a human needs in order
 * to *do* that manual review actually exists (docs are present, not empty,
 * reference the current build).
 */

const { STATUS, worstStatus } = require('./constants.cjs');
const { loadReleaseComplianceConfig } = require('./load-config.cjs');
const { readFileSafe, fileExists } = require('./fs-utils.cjs');

function docPresentAndNonEmpty(repoRoot, docPath, label) {
  if (!docPath) return { id: label, status: STATUS.NOT_APPLICABLE, evidence: { reason: 'not_configured' } };
  const content = readFileSafe(repoRoot, docPath);
  const status = content && content.trim().length > 0 ? STATUS.PASS : STATUS.FAIL;
  return { id: label, status, evidence: { docPath, present: Boolean(content) } };
}

function checkReviewNotesReferenceCurrentBuild(repoRoot, config) {
  const notesDoc = config.submissionMetadataEvidence?.apple?.reviewNotesDoc || 'docs/app-store-review-notes.md';
  const notes = readFileSafe(repoRoot, notesDoc);
  const pbxproj = readFileSafe(repoRoot, config.versionSources?.iosProjectFile || 'ios/App/App.xcodeproj/project.pbxproj');
  if (!notes) return { id: 'review_notes_reference_current_build', status: STATUS.FAIL, evidence: { reason: 'review_notes_doc_missing', notesDoc } };
  if (!pbxproj) {
    return { id: 'review_notes_reference_current_build', status: STATUS.MANUAL_REVIEW_REQUIRED, evidence: { reason: 'ios_project_not_present_in_checkout' } };
  }
  const buildMatch = pbxproj.match(/CURRENT_PROJECT_VERSION\s*=\s*(\d+);/);
  const currentBuild = buildMatch ? buildMatch[1] : null;
  const mentionsCurrentBuild = currentBuild ? new RegExp(`\\bBuild\\s*${currentBuild}\\b`, 'i').test(notes) : false;
  return {
    id: 'review_notes_reference_current_build',
    status: mentionsCurrentBuild ? STATUS.PASS : STATUS.MANUAL_REVIEW_REQUIRED,
    evidence: {
      currentBuild,
      mentionsCurrentBuild,
      note: 'Review notes are a running log; confirm the top-most entry matches the build actually being submitted before pasting into App Store Connect.',
    },
  };
}

function runSubmissionMetadataChecks(repoRoot) {
  const config = loadReleaseComplianceConfig(repoRoot);
  const apple = config.submissionMetadataEvidence?.apple || {};
  const google = config.submissionMetadataEvidence?.google || {};

  const checks = [
    docPresentAndNonEmpty(repoRoot, apple.reviewNotesDoc, 'apple_review_notes_present'),
    ...(apple.descriptionDocs || []).map((d, i) => docPresentAndNonEmpty(repoRoot, d, `apple_description_doc_${i}_present`)),
    docPresentAndNonEmpty(repoRoot, apple.reviewAccountDoc, 'apple_review_account_doc_present'),
    docPresentAndNonEmpty(repoRoot, apple.testflightChecklistDoc, 'apple_testflight_checklist_present'),
    docPresentAndNonEmpty(repoRoot, apple.screenshotsProcessDoc, 'apple_screenshots_process_doc_present'),
    docPresentAndNonEmpty(repoRoot, google.storeListingDoc, 'google_store_listing_doc_present'),
    docPresentAndNonEmpty(repoRoot, google.dataSafetyDoc, 'google_data_safety_doc_present'),
    checkReviewNotesReferenceCurrentBuild(repoRoot, config),
    {
      id: 'app_store_connect_console_state',
      status: STATUS.MANUAL_REVIEW_REQUIRED,
      evidence: {
        items: [
          'Selected build for this version',
          'Selected IAP/subscription products for this version',
          'App Privacy answers',
          'Age rating / content rating questionnaire',
          'Screenshots actually uploaded match the shipped build',
          'Promotional text / What\'s New / description per-localization',
        ],
      },
    },
    {
      id: 'play_console_state',
      status: STATUS.MANUAL_REVIEW_REQUIRED,
      evidence: {
        items: [
          'Data Safety form matches actual code behaviour',
          'Content rating questionnaire',
          'Production vs testing track selection',
          'Store listing screenshots/graphics match shipped build',
          'Subscription base plan/offer state',
          'App access instructions for reviewers (login-required apps)',
        ],
      },
    },
  ];

  const status = worstStatus(checks.map((c) => c.status));
  return {
    id: 'C_submission_metadata_review_package',
    title: 'C — Submission metadata & review package (Gate C)',
    status,
    summary:
      status === STATUS.FAIL
        ? 'Required review-package documentation is missing.'
        : 'Repo-side review documentation is present. The store-console-only parts of Gate C always require a manual App Store Connect / Play Console pass — see evidence.',
    evidence: { checks },
  };
}

module.exports = { runSubmissionMetadataChecks };
