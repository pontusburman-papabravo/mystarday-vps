#!/usr/bin/env node
/**
 * Ensure Sign in with Apple + Associated Domains entitlements are wired in the
 * Xcode project.
 * Without com.apple.developer.applesignin → ASAuthorizationError 1000 on device.
 * Without com.apple.developer.associated-domains → Universal Links (/open/child)
 * never open the app; iOS silently falls back to Safari.
 *
 * Usage: node scripts/patch-ios-entitlements.mjs
 */
import fs from 'fs';
import path from 'path';

const entitlementsPath = path.join(process.cwd(), 'ios', 'App', 'App', 'App.entitlements');
const pbxPath = path.join(process.cwd(), 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');
const ENTITLEMENTS_SETTING = 'CODE_SIGN_ENTITLEMENTS = App/App.entitlements;';
const FILE_REF_ID = '504EC3191FED79650016851F';
const FILE_REF_LINE = `\t\t${FILE_REF_ID} /* App.entitlements */ = {isa = PBXFileReference; lastKnownFileType = text.plist.entitlements; path = App.entitlements; sourceTree = "<group>"; };`;
const ASSOCIATED_DOMAIN = 'applinks:mystarday.se'; // pragma: allowlist secret

const ENTITLEMENTS_XML = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>com.apple.developer.applesignin</key>
\t<array>
\t\t<string>Default</string>
\t</array>
\t<key>com.apple.developer.associated-domains</key>
\t<array>
\t\t<string>${ASSOCIATED_DOMAIN}</string>
\t</array>
</dict>
</plist>
`;

if (!fs.existsSync(entitlementsPath)) {
  fs.writeFileSync(entitlementsPath, ENTITLEMENTS_XML);
  console.log('Created ios/App/App/App.entitlements (Sign in with Apple + Associated Domains).');
} else {
  const existing = fs.readFileSync(entitlementsPath, 'utf8');
  if (!existing.includes('com.apple.developer.associated-domains')) {
    const patched = existing.replace(
      '</dict>',
      `\t<key>com.apple.developer.associated-domains</key>\n\t<array>\n\t\t<string>${ASSOCIATED_DOMAIN}</string>\n\t</array>\n</dict>`
    );
    fs.writeFileSync(entitlementsPath, patched);
    console.log('Patched ios/App/App/App.entitlements: added com.apple.developer.associated-domains.');
  } else if (!existing.includes(ASSOCIATED_DOMAIN)) {
    console.error(
      `App.entitlements has com.apple.developer.associated-domains but missing "${ASSOCIATED_DOMAIN}" — fix manually.`
    );
    process.exit(1);
  }
}

if (!fs.existsSync(pbxPath)) {
  console.log('Xcode project not found — skip entitlements patch.');
  process.exit(0);
}

let pbx = fs.readFileSync(pbxPath, 'utf8');
const before = pbx;

if (!pbx.includes('App.entitlements')) {
  pbx = pbx.replace('/* End PBXFileReference section */', `${FILE_REF_LINE}\n/* End PBXFileReference section */`);
  pbx = pbx.replace(
    '504EC3131FED79650016851F /* Info.plist */,',
    '504EC3131FED79650016851F /* Info.plist */,\n\t\t\t\t504EC3191FED79650016851F /* App.entitlements */,'
  );
}

if (!pbx.includes('CODE_SIGN_ENTITLEMENTS')) {
  pbx = pbx.replace(
    /(INFOPLIST_FILE = App\/Info\.plist;\n)/g,
    `$1\t\t\t\t${ENTITLEMENTS_SETTING}\n`
  );
}

if (pbx !== before) {
  fs.writeFileSync(pbxPath, pbx);
  console.log('Patched project.pbxproj: CODE_SIGN_ENTITLEMENTS → App/App.entitlements');
} else if (pbx.includes(ENTITLEMENTS_SETTING)) {
  console.log('Sign in with Apple entitlements already configured in Xcode project.');
} else {
  console.log('Could not patch project.pbxproj — add Sign in with Apple capability manually in Xcode.');
  process.exit(1);
}
