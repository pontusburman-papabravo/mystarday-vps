#!/usr/bin/env node
/**
 * Add WidgetRoutine WidgetKit extension target to Xcode project (R4.5d).
 * Idempotent — skips when target already present.
 */
import fs from 'fs';
import path from 'path';

const pbxPath = path.join(process.cwd(), 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');
const MARKER = 'R45D01011FED79650016851 /* WidgetRoutine */';

if (!fs.existsSync(pbxPath)) {
  console.log('[widget-extension] No Xcode project — skip.');
  process.exit(0);
}

let pbx = fs.readFileSync(pbxPath, 'utf8');
if (pbx.includes(MARKER)) {
  console.log('[widget-extension] WidgetRoutine target already present.');
  process.exit(0);
}

const mainBundleMatch = pbx.match(/PRODUCT_BUNDLE_IDENTIFIER = ([^;\n]+);/);
const mainBundle = mainBundleMatch ? mainBundleMatch[1].trim() : '';
if (!mainBundle) {
  console.error('[widget-extension] Could not read main PRODUCT_BUNDLE_IDENTIFIER from pbxproj');
  process.exit(1);
}
const widgetBundle = `${mainBundle}.WidgetRoutine`;

const snippet = `
/* R4.5d WidgetRoutine extension — begin */
\t\tR45D01101FED79650016851 /* WidgetRoutineBundle.swift in Sources */ = {isa = PBXBuildFile; fileRef = R45D01111FED79650016851 /* WidgetRoutineBundle.swift */; };
\t\tR45D01121FED79650016851 /* NextRoutineWidget.swift in Sources */ = {isa = PBXBuildFile; fileRef = R45D01131FED79650016851 /* NextRoutineWidget.swift */; };
\t\tR45D01141FED79650016851 /* WidgetAPIClient.swift in Sources */ = {isa = PBXBuildFile; fileRef = R45D01151FED79650016851 /* WidgetAPIClient.swift */; };
\t\tR45D01161FED79650016851 /* WidgetModels.swift in Sources */ = {isa = PBXBuildFile; fileRef = R45D01171FED79650016851 /* WidgetModels.swift */; };
\t\tR45D01181FED79650016851 /* WidgetEntryBuilder.swift in Sources */ = {isa = PBXBuildFile; fileRef = R45D01191FED79650016851 /* WidgetEntryBuilder.swift */; };
\t\tR45D011A1FED79650016851 /* WidgetL10n.swift in Sources */ = {isa = PBXBuildFile; fileRef = R45D011B1FED79650016851 /* WidgetL10n.swift */; };
\t\tR45D011C1FED79650016851 /* WidgetPictogramMap.swift in Sources */ = {isa = PBXBuildFile; fileRef = R45D011D1FED79650016851 /* WidgetPictogramMap.swift */; };
\t\tR45D011E1FED79650016851 /* WidgetIntents.swift in Sources */ = {isa = PBXBuildFile; fileRef = R45D011F1FED79650016851 /* WidgetIntents.swift */; };
\t\tR45D01201FED79650016851 /* WidgetBackgroundModifier.swift in Sources */ = {isa = PBXBuildFile; fileRef = R45D01211FED79650016851 /* WidgetBackgroundModifier.swift */; };
\t\tR45D01221FED79650016851 /* WidgetBridgeStore.swift in Sources */ = {isa = PBXBuildFile; fileRef = R45D01231FED79650016851 /* WidgetBridgeStore.swift */; };
\t\tR45D01241FED79650016851 /* Assets.xcassets in Resources */ = {isa = PBXBuildFile; fileRef = R45D01251FED79650016851 /* Assets.xcassets */; };
\t\tR45D01081FED79650016851 /* WidgetRoutine.appex in Embed Foundation Extensions */ = {isa = PBXBuildFile; fileRef = R45D01001FED79650016851 /* WidgetRoutine.appex */; settings = {ATTRIBUTES = (RemoveHeadersOnCopy, ); }; };
\t\tR45D01001FED79650016851 /* WidgetRoutine.appex */ = {isa = PBXFileReference; explicitFileType = "wrapper.app-extension"; includeInIndex = 0; path = WidgetRoutine.appex; sourceTree = BUILT_PRODUCTS_DIR; };
\t\tR45D01111FED79650016851 /* WidgetRoutineBundle.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = WidgetRoutineBundle.swift; sourceTree = "<group>"; };
\t\tR45D01131FED79650016851 /* NextRoutineWidget.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = NextRoutineWidget.swift; sourceTree = "<group>"; };
\t\tR45D01151FED79650016851 /* WidgetAPIClient.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = WidgetAPIClient.swift; sourceTree = "<group>"; };
\t\tR45D01171FED79650016851 /* WidgetModels.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = WidgetModels.swift; sourceTree = "<group>"; };
\t\tR45D01191FED79650016851 /* WidgetEntryBuilder.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = WidgetEntryBuilder.swift; sourceTree = "<group>"; };
\t\tR45D011B1FED79650016851 /* WidgetL10n.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = WidgetL10n.swift; sourceTree = "<group>"; };
\t\tR45D011D1FED79650016851 /* WidgetPictogramMap.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = WidgetPictogramMap.swift; sourceTree = "<group>"; };
\t\tR45D011F1FED79650016851 /* WidgetIntents.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = WidgetIntents.swift; sourceTree = "<group>"; };
\t\tR45D01211FED79650016851 /* WidgetBackgroundModifier.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = WidgetBackgroundModifier.swift; sourceTree = "<group>"; };
\t\tR45D01231FED79650016851 /* WidgetBridgeStore.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; name = WidgetBridgeStore.swift; path = ../../../plugins/capacitor-widget-bridge/ios/Plugin/WidgetBridgeStore.swift; sourceTree = "<group>"; };
\t\tR45D01261FED79650016851 /* Info.plist */ = {isa = PBXFileReference; lastKnownFileType = text.plist.xml; path = Info.plist; sourceTree = "<group>"; };
\t\tR45D01271FED79650016851 /* WidgetRoutine.entitlements */ = {isa = PBXFileReference; lastKnownFileType = text.plist.entitlements; path = WidgetRoutine.entitlements; sourceTree = "<group>"; };
\t\tR45D01251FED79650016851 /* Assets.xcassets */ = {isa = PBXFileReference; lastKnownFileType = folder.assetcatalog; path = Assets.xcassets; sourceTree = "<group>"; };
\t\tR45D01071FED79650016851 /* WidgetRoutine */ = {
\t\t\tisa = PBXGroup;
\t\t\tchildren = (
\t\t\t\tR45D01111FED79650016851 /* WidgetRoutineBundle.swift */,
\t\t\t\tR45D01131FED79650016851 /* NextRoutineWidget.swift */,
\t\t\t\tR45D01151FED79650016851 /* WidgetAPIClient.swift */,
\t\t\t\tR45D01171FED79650016851 /* WidgetModels.swift */,
\t\t\t\tR45D01191FED79650016851 /* WidgetEntryBuilder.swift */,
\t\t\t\tR45D011B1FED79650016851 /* WidgetL10n.swift */,
\t\t\t\tR45D011D1FED79650016851 /* WidgetPictogramMap.swift */,
\t\t\t\tR45D011F1FED79650016851 /* WidgetIntents.swift */,
\t\t\t\tR45D01211FED79650016851 /* WidgetBackgroundModifier.swift */,
\t\t\t\tR45D01231FED79650016851 /* WidgetBridgeStore.swift */,
\t\t\t\tR45D01261FED79650016851 /* Info.plist */,
\t\t\t\tR45D01271FED79650016851 /* WidgetRoutine.entitlements */,
\t\t\t\tR45D01251FED79650016851 /* Assets.xcassets */,
\t\t\t);
\t\t\tpath = WidgetRoutine;
\t\t\tsourceTree = "<group>";
\t\t};
\t\tR45D01021FED79650016851 /* Sources */ = {
\t\t\tisa = PBXSourcesBuildPhase;
\t\t\tbuildActionMask = 2147483647;
\t\t\tfiles = (
\t\t\t\tR45D01101FED79650016851 /* WidgetRoutineBundle.swift in Sources */,
\t\t\t\tR45D01121FED79650016851 /* NextRoutineWidget.swift in Sources */,
\t\t\t\tR45D01141FED79650016851 /* WidgetAPIClient.swift in Sources */,
\t\t\t\tR45D01161FED79650016851 /* WidgetModels.swift in Sources */,
\t\t\t\tR45D01181FED79650016851 /* WidgetEntryBuilder.swift in Sources */,
\t\t\t\tR45D011A1FED79650016851 /* WidgetL10n.swift in Sources */,
\t\t\t\tR45D011C1FED79650016851 /* WidgetPictogramMap.swift in Sources */,
\t\t\t\tR45D011E1FED79650016851 /* WidgetIntents.swift in Sources */,
\t\t\t\tR45D01201FED79650016851 /* WidgetBackgroundModifier.swift in Sources */,
\t\t\t\tR45D01221FED79650016851 /* WidgetBridgeStore.swift in Sources */,
\t\t\t);
\t\t\trunOnlyForDeploymentPostprocessing = 0;
\t\t};
\t\tR45D01031FED79650016851 /* Resources */ = {
\t\t\tisa = PBXResourcesBuildPhase;
\t\t\tbuildActionMask = 2147483647;
\t\t\tfiles = (
\t\t\t\tR45D01241FED79650016851 /* Assets.xcassets in Resources */,
\t\t\t);
\t\t\trunOnlyForDeploymentPostprocessing = 0;
\t\t};
\t\tR45D01041FED79650016851 /* Frameworks */ = {
\t\t\tisa = PBXFrameworksBuildPhase;
\t\t\tbuildActionMask = 2147483647;
\t\t\tfiles = (
\t\t\t);
\t\t\trunOnlyForDeploymentPostprocessing = 0;
\t\t};
\t\tR45D01051FED79650016851 /* Embed Foundation Extensions */ = {
\t\t\tisa = PBXCopyFilesBuildPhase;
\t\t\tbuildActionMask = 2147483647;
\t\t\tdstPath = "";
\t\t\tdstSubfolderSpec = 13;
\t\t\tfiles = (
\t\t\t\tR45D01081FED79650016851 /* WidgetRoutine.appex in Embed Foundation Extensions */,
\t\t\t);
\t\t\tname = "Embed Foundation Extensions";
\t\t\trunOnlyForDeploymentPostprocessing = 0;
\t\t};
\t\tR45D01091FED79650016851 /* PBXContainerItemProxy */ = {
\t\t\tisa = PBXContainerItemProxy;
\t\t\tcontainerPortal = 504EC2FC1FED79650016851F /* Project object */;
\t\t\tproxyType = 1;
\t\t\tremoteGlobalIDString = R45D01011FED79650016851;
\t\t\tremoteInfo = WidgetRoutine;
\t\t};
\t\tR45D01061FED79650016851 /* PBXTargetDependency */ = {
\t\t\tisa = PBXTargetDependency;
\t\t\ttarget = R45D01011FED79650016851 /* WidgetRoutine */;
\t\t\ttargetProxy = R45D01091FED79650016851 /* PBXContainerItemProxy */;
\t\t};
\t\tR45D01011FED79650016851 /* WidgetRoutine */ = {
\t\t\tisa = PBXNativeTarget;
\t\t\tbuildConfigurationList = R45D02021FED79650016851 /* Build configuration list for PBXNativeTarget "WidgetRoutine" */;
\t\t\tbuildPhases = (
\t\t\t\tR45D01021FED79650016851 /* Sources */,
\t\t\t\tR45D01041FED79650016851 /* Frameworks */,
\t\t\t\tR45D01031FED79650016851 /* Resources */,
\t\t\t);
\t\t\tbuildRules = (
\t\t\t);
\t\t\tdependencies = (
\t\t\t);
\t\t\tname = WidgetRoutine;
\t\t\tproductName = WidgetRoutine;
\t\t\tproductReference = R45D01001FED79650016851 /* WidgetRoutine.appex */;
\t\t\tproductType = "com.apple.product-type.app-extension";
\t\t};
\t\tR45D02001FED79650016851 /* Debug */ = {
\t\t\tisa = XCBuildConfiguration;
\t\t\tbuildSettings = {
\t\t\t\tAPPLICATION_EXTENSION_API_ONLY = YES;
\t\t\t\tCODE_SIGN_ENTITLEMENTS = WidgetRoutine/WidgetRoutine.entitlements;
\t\t\t\tCODE_SIGN_STYLE = Automatic;
\t\t\t\tCURRENT_PROJECT_VERSION = 29;
\t\t\t\tINFOPLIST_FILE = WidgetRoutine/Info.plist;
\t\t\t\tIPHONEOS_DEPLOYMENT_TARGET = 17.0;
\t\t\t\tLD_RUNPATH_SEARCH_PATHS = "$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks";
\t\t\t\tMARKETING_VERSION = 1.3;
\t\t\t\tPRODUCT_BUNDLE_IDENTIFIER = ${widgetBundle};
\t\t\t\tPRODUCT_NAME = "$(TARGET_NAME)";
\t\t\t\tSKIP_INSTALL = YES;
\t\t\t\tSWIFT_VERSION = 5.0;
\t\t\t\tTARGETED_DEVICE_FAMILY = "1,2";
\t\t\t};
\t\t\tname = Debug;
\t\t};
\t\tR45D02011FED79650016851 /* Release */ = {
\t\t\tisa = XCBuildConfiguration;
\t\t\tbuildSettings = {
\t\t\t\tAPPLICATION_EXTENSION_API_ONLY = YES;
\t\t\t\tCODE_SIGN_ENTITLEMENTS = WidgetRoutine/WidgetRoutine.entitlements;
\t\t\t\tCODE_SIGN_STYLE = Automatic;
\t\t\t\tCURRENT_PROJECT_VERSION = 29;
\t\t\t\tINFOPLIST_FILE = WidgetRoutine/Info.plist;
\t\t\t\tIPHONEOS_DEPLOYMENT_TARGET = 17.0;
\t\t\t\tLD_RUNPATH_SEARCH_PATHS = "$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks";
\t\t\t\tMARKETING_VERSION = 1.3;
\t\t\t\tPRODUCT_BUNDLE_IDENTIFIER = ${widgetBundle};
\t\t\t\tPRODUCT_NAME = "$(TARGET_NAME)";
\t\t\t\tSKIP_INSTALL = YES;
\t\t\t\tSWIFT_VERSION = 5.0;
\t\t\t\tTARGETED_DEVICE_FAMILY = "1,2";
\t\t\t};
\t\t\tname = Release;
\t\t};
\t\tR45D02021FED79650016851 /* Build configuration list for PBXNativeTarget "WidgetRoutine" */ = {
\t\t\tisa = XCConfigurationList;
\t\t\tbuildConfigurations = (
\t\t\t\tR45D02001FED79650016851 /* Debug */,
\t\t\t\tR45D02011FED79650016851 /* Release */,
\t\t\t);
\t\t\tdefaultConfigurationIsVisible = 0;
\t\t\tdefaultConfigurationName = Release;
\t\t};
/* R4.5d WidgetRoutine extension — end */
`.replace(/\$\{widgetBundle\}/g, widgetBundle);

// PBXBuildFile + FileReference sections
pbx = pbx.replace(
  '/* End PBXBuildFile section */',
  snippet.match(/R45D01101FED79650016851[\s\S]*?R45D01081FED79650016851[\s\S]*?};/)?.[0] + '\n/* End PBXBuildFile section */'
);

// Insert file refs and groups before End PBXFileReference - use full block from snippet
const fileRefBlock = snippet.match(/\t\tR45D01001FED79650016851[\s\S]*?R45D01251FED79650016851[\s\S]*?};/)?.[0];
pbx = pbx.replace('/* End PBXFileReference section */', `${fileRefBlock}\n/* End PBXFileReference section */`);

// Groups - add WidgetRoutine group before End PBXGroup
const groupBlock = snippet.match(/\t\tR45D01071FED79650016851 \/\* WidgetRoutine \*\/ = \{[\s\S]*?};\n/)?.[0];
pbx = pbx.replace('/* End PBXGroup section */', `${groupBlock}/* End PBXGroup section */`);

pbx = pbx.replace(
  '504EC3061FED79650016851F /* App */,',
  '504EC3061FED79650016851F /* App */,\n\t\t\t\tR45D01071FED79650016851 /* WidgetRoutine */,'
);

pbx = pbx.replace(
  '504EC3041FED79650016851F /* App.app */,',
  '504EC3041FED79650016851F /* App.app */,\n\t\t\t\tR45D01001FED79650016851 /* WidgetRoutine.appex */,'
);

// Native target
const nativeBlock = snippet.match(/\t\tR45D01011FED79650016851 \/\* WidgetRoutine \*\/ = \{[\s\S]*?};\n/)?.[0];
pbx = pbx.replace('/* End PBXNativeTarget section */', `${nativeBlock}/* End PBXNativeTarget section */`);

// Build phases
const phasesBlock = snippet.match(/\t\tR45D01021FED79650016851 \/\* Sources \*\/ = \{[\s\S]*?R45D01061FED79650016851 \/\* PBXTargetDependency \*\/ = \{[\s\S]*?};\n/)?.[0];
pbx = pbx.replace('/* End PBXSourcesBuildPhase section */', `${phasesBlock}/* End PBXSourcesBuildPhase section */`);

// App target embed + dependency
pbx = pbx.replace(
  '504EC3021FED79650016851F /* Resources */,',
  '504EC3021FED79650016851F /* Resources */,\n\t\t\t\tR45D01051FED79650016851 /* Embed Foundation Extensions */,'
);
pbx = pbx.replace(
  'dependencies = (\n\t\t\t);',
  'dependencies = (\n\t\t\t\tR45D01061FED79650016851 /* PBXTargetDependency */,\n\t\t\t);'
);

// Project targets
pbx = pbx.replace(
  '504EC3031FED79650016851F /* App */,',
  '504EC3031FED79650016851F /* App */,\n\t\t\t\tR45D01011FED79650016851 /* WidgetRoutine */,'
);

// Target attributes
pbx = pbx.replace(
  '504EC3031FED79650016851F = {\n\t\t\t\t\t\tCreatedOnToolsVersion = 9.2;',
  '504EC3031FED79650016851F = {\n\t\t\t\t\t\tCreatedOnToolsVersion = 9.2;'
);
if (!pbx.includes('R45D01011FED79650016851 = {')) {
  pbx = pbx.replace(
    'TargetAttributes = {',
    `TargetAttributes = {
\t\t\t\t\tR45D01011FED79650016851 = {
\t\t\t\t\t\tCreatedOnToolsVersion = 15.0;
\t\t\t\t\t\tProvisioningStyle = Automatic;
\t\t\t\t\t};`
  );
}

// XCBuildConfiguration
const xcBlock = snippet.match(/\t\tR45D02001FED79650016851 \/\* Debug \*\/ = \{[\s\S]*?defaultConfigurationName = Release;\n\t\t};\n\/\* R4.5d/)?.[0];
if (xcBlock) {
  pbx = pbx.replace('/* End XCBuildConfiguration section */', `${xcBlock.replace(/\/\* R4.5d WidgetRoutine extension — end \*\/\n/, '')}/* End XCBuildConfiguration section */`);
}

fs.writeFileSync(pbxPath, pbx);
console.log('[widget-extension] Added WidgetRoutine target. Bundle id:', widgetBundle);
