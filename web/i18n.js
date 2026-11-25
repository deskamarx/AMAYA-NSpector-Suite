/* i18n.js — master-app translations shared by the shell and NSpector workspace.
   Locale storage is intentionally the same key as the AMAYA Control Center so a
   language chosen here is picked up by the full PWA when it opens. */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'imei.locale.v1';
  const CHANNEL = 'amaya-suite-locale';
  const SOURCE_ID = 'suite-' + Math.random().toString(36).slice(2);
  const INTL = { en: 'en-IN', bn: 'bn-BD', zh: 'zh-CN' };
  const MONEY = { en: 'Tk ', bn: '৳ ', zh: 'Tk ' };
  const COMPACT = {
    en: { crore: ' Cr', lakh: ' L', thousand: 'k' },
    bn: { crore: ' কোটি', lakh: ' লাখ', thousand: ' হাজার' },
    zh: { crore: ' 千万', lakh: ' 十万', thousand: ' 千' }
  };

  const en = {
    'app.name': 'AMAYA × NSpector',
    'app.tagline': 'Device integrity suite',
    'app.title': 'AMAYA × NSpector — Unified Device Intelligence',
    'meta.description': 'AMAYA × NSpector — one workspace for IMEI control and dispatch-ledger integrity. Two ledgers, one device truth.',
    'skip.content': 'Skip to content',

    'nav.workspaces': 'Workspaces',
    'nav.overview': 'Overview',
    'nav.lookup': 'Unified lookup',
    'nav.devices': 'Device ledger',
    'nav.imei': 'IMEI Control Center',
    'nav.imeiShort': 'IMEI Control',
    'nav.sources': 'Data sources',
    'nav.goOverviewAria': 'AMAYA × NSpector — go to overview',
    'rail.search': 'search',
    'rail.shortcuts': 'Keyboard shortcuts',
    'rail.shortcutsAria': '⌘K search — show keyboard shortcuts',
    'rail.versionOffline': 'v2.0.1 · offline · local engine',
    'rail.versionWeb': 'v2.0.1 · live web instance',

    'top.exposure': 'Open exposure',
    'top.exposureTitle': 'Value attached to open NSpector findings',
    'top.sync': 'Sync',
    'top.syncTitle': 'Re-ingest NSpector source data',
    'top.syncAria': 'Sync — re-ingest NSpector source data',
    'top.syncing': 'Syncing…',
    'top.language': 'Language',
    'tip.kpi.merged': 'Open unified lookup',
    'tip.kpi.matched': 'Inspect matched devices',
    'tip.kpi.findings': 'Open NSpector findings',
    'tip.kpi.conflicts': 'Open AMAYA conflicts',
    'tip.kpi.serials': 'Open NSpector serial ledger',
    'tip.kpi.assets': 'Open AMAYA asset ledger',
    'tip.src.nspector': 'Open NSpector devices',
    'tip.src.amaya': 'Open AMAYA workspace',
    'tip.src.merged': 'Search the merged ledger',
    'tip.control': 'Open the full IMEI Control Center',

    'search.globalPlaceholder': 'Search any IMEI or serial across both ledgers',
    'search.globalAria': 'Search IMEI or serial across both ledgers',
    'search.inspect': 'Inspect',
    'search.suggestions': 'Search suggestions',
    'search.matching': 'Matching devices',
    'search.found': '{n} found',
    'search.noDevices': 'No devices found',
    'search.noDevicesHint': 'Try a different IMEI or serial.',
    'search.amayaAsset': 'AMAYA asset',
    'search.nspectorDispatch': 'NSpector dispatch',

    'overview.eyebrow': 'Merged workspace',
    'overview.heroTitle': 'Two ledgers. <em>One device truth.</em>',
    'overview.ledeStatic': 'The NSpector dispatch ledger and the AMAYA IMEI Control Center now answer the same question together: where did this handset actually go?',
    'overview.lede': 'The NSpector dispatch ledger and the AMAYA IMEI Control Center now answer the same question together: <b>{both} IMEIs appear in both</b> — {union} distinct devices across {dispatches} dispatch records and {events} workbook occurrences.',
    'overview.openLookup': 'Open unified lookup',
    'overview.openImei': 'Open IMEI Control',
    'overview.matchedImeis': 'matched IMEIs',
    'ov.recon.title': 'Ledger reconciliation',
    'ov.recon.hint': 'Exact IMEI matches between the NSpector dispatch trail and the AMAYA asset ledger.',
    'ov.recon.loading': 'Loading reconciliation…',
    'ov.amaya.title': 'IMEI Control Center',
    'ov.amaya.hint': 'Movement evidence across four source workbooks.',
    'ov.amaya.loading': 'Loading snapshot…',
    'ov.ns.title': 'NSpector ledger',
    'ov.ns.hint': 'Dispatch, returns, dealer custody and exposure.',
    'ov.ns.loading': 'Loading ledger…',
    'ov.critical.title': 'Highest-priority findings',
    'ov.critical.hint': 'Open or investigating findings from the NSpector reasoning engine.',
    'ov.critical.loading': 'Loading findings…',
    'ov.sources.title': 'Evidence base',
    'ov.sources.hint': 'Every number in this app comes from a local file. Nothing is fetched at runtime.',

    'lookup.eyebrow': 'Cross-ledger lookup',
    'lookup.heroTitle': 'One serial. <em>Both evidence trails.</em>',
    'lookup.intro': 'Search by IMEI or serial. NSpector contributes custody, returns and reasoning; AMAYA contributes every workbook occurrence, lifecycle state and source citation.',
    'lookup.aria': 'IMEI or serial to inspect',
    'lookup.open': 'Open dossier',
    'lookup.try': 'Try a known overlap:',
    'lookup.emptyTitle': 'Nothing opened yet',
    'lookup.emptyHint': 'Enter a serial above, or pick one of the overlap examples. The dossier will show which ledgers hold the device and what each one says.',

    'devices.eyebrow': 'NSpector workspace',
    'devices.title': 'Device ledger & reasoning',
    'devices.pill': 'NSpector CSV ledgers',
    'tabs.aria': 'NSpector views',
    'tabs.queue': 'Work Queue',
    'tabs.inspect': 'Inspector',
    'tabs.exposure': 'Exposure',
    'tabs.chains': 'Flows',
    'tabs.dealers': 'Dealers',
    'tabs.ownership': 'Ownership',

    'queue.anyStatus': 'Any status',
    'queue.anySeverity': 'Any severity',
    'queue.anyFinding': 'Any finding',
    'option.status.open': 'Open',
    'option.status.investigating': 'Investigating',
    'option.status.resolved': 'Resolved',
    'option.status.dismissed': 'Dismissed',
    'option.severity.critical': 'Critical',
    'option.severity.high': 'High',
    'option.severity.medium': 'Medium',
    'option.severity.low': 'Low',
    'option.kind.duplicate_cross': 'Duplicate — two dealers',
    'option.kind.duplicate_multi': 'Duplicate — three or more',
    'option.kind.orphan_return': 'Returned, never dispatched',
    'option.kind.imei_lock': 'IMEI lock or mismatch',
    'option.kind.no_serial_return': 'Return with no serial',
    'option.kind.luhn_invalid': 'Fails check digit',
    'option.kind.tac_conflict': 'Prefix / model conflict',
    'queue.ownerPlaceholder': 'Filter by owner',
    'queue.ownerAria': 'Filter findings by owner',
    'queue.minPlaceholder': 'Min value',
    'queue.minAria': 'Minimum observed value',
    'queue.clear': 'Clear',
    'queue.loadMore': 'Load more · {n} shown',

    'inspect.title': 'Serial inspector',
    'inspect.hint': 'Enter a 15-digit IMEI or any serial to get its full trail, the reasoning behind any finding, and the evidence behind it.',
    'inspect.try': 'Try:',
    'inspect.duplicate': 'a duplicate',
    'inspect.lock': 'an IMEI lock',
    'inspect.threeDealers': 'three dealers',

    'exposure.whereTitle': 'Where the exposure sits',
    'exposure.whereHint': 'Value is taken from prices actually observed on your own return records — nothing here is an estimate.',
    'exposure.rootTitle': 'Root cause — diagnosed',
    'exposure.rootHint': 'What the evidence actually points to, across every finding.',
    'exposure.topTitle': 'Highest value items',
    'exposure.priceTitle': 'Price book',
    'exposure.priceHint': 'Built from your logged returns. Families with no observed price are shown as unpriced rather than assumed to be zero.',

    'chains.title': 'Repeated dealer-to-dealer flows',
    'chains.hint': 'The same serials passing through the same pair of dealers, over and over. That is not random noise — treat each of these as one structural issue, not N separate duplicates.',

    'dealers.searchPlaceholder': 'Search dealer name or alias',
    'dealers.searchAria': 'Search dealer name or alias',

    'ownership.findingTypes': 'Finding types',
    'ownership.usageTitle': 'How this is meant to be used',
    'ownership.usageHint': 'Each finding is a reporting item, not an accusation. A duplicate is almost always an unclosed return, not theft. What matters is that somebody is accountable for closing it.',
    'ownership.openDesc': 'generated, nobody has looked at it',
    'ownership.investigatingDesc': 'someone is checking it against the physical unit',
    'ownership.resolvedDesc': 'action taken, note recorded against the finding',
    'ownership.dismissedDesc': 'checked and explained, no action needed',

    'imei.eyebrow': 'AMAYA workspace',
    'imei.reviewLoading': 'Loading review summary…',
    'imei.stateHeader': 'LATEST RESOLVED STATE',
    'imei.ctaHeader': 'One device. One defensible story.',
    'imei.ctaBody': 'Turn repeated IMEI appearances into a traceable movement record — and make every unresolved conflict visible before it becomes a reporting error.',
    'imei.ctaButton': 'Open full Control Center',
    'imei.reloadTitle': 'Refresh snapshot data',
    'imei.reload': 'Reload',
    'imei.reloadAria': 'Reload — refresh snapshot data',
    'imei.openFullTitle': 'Open the full IMEI Control Center',
    'imei.openFullAria': 'Open — full IMEI Control Center',
    'imei.open': 'Open',
    'imei.assetsAria': 'AMAYA key metrics',
    'imei.statesAria': 'Latest resolved states',

    'sources.eyebrow': 'Provenance',
    'sources.title': 'Data sources & methodology',
    'sources.loading': 'Loading source inventory…',

    'sheet.title': 'Finding',
    'sheet.close': 'Close',
    'sheet.closeAria': 'Close finding sheet',
    'shortcuts.title': 'Keyboard shortcuts',
    'shortcuts.close': 'Close',
    'shortcuts.closeAria': 'Close shortcuts',
    'shortcuts.focusGlobal': 'Focus global search',
    'shortcuts.focusAnywhere': 'Focus search anywhere',
    'shortcuts.switchWorkspace': 'Switch workspace',
    'shortcuts.moveSuggestions': 'Move through suggestions',
    'shortcuts.openHighlighted': 'Open highlighted result',
    'shortcuts.showHelp': 'Show this help',
    'shortcuts.closePanel': 'Close panel or clear search',
    'shortcuts.foot': 'Built for keyboard-first investigation.'
  };
  const bn = {
    'app.name': 'AMAYA × NSpector',
    'app.tagline': 'ডিভাইস অখণ্ডতা সুইট',
    'app.title': 'AMAYA × NSpector — একক ডিভাইস বুদ্ধিমত্তা',
    'meta.description': 'AMAYA × NSpector — IMEI নিয়ন্ত্রণ ও ডিসপাচ-লেজার অখণ্ডতার জন্য একক কর্মক্ষেত্র। দুটি লেজার, এক ডিভাইস সত্য।',
    'skip.content': 'বিষয়বস্তুতে যান',

    'nav.workspaces': 'কর্মক্ষেত্র',
    'nav.overview': 'সংক্ষিপ্ত বিবরণ',
    'nav.lookup': 'একীভূত অনুসন্ধান',
    'nav.devices': 'ডিভাইস তালিকা',
    'nav.imei': 'IMEI কন্ট্রোল সেন্টার',
    'nav.imeiShort': 'IMEI কন্ট্রোল',
    'nav.sources': 'তথ্য উৎস',
    'nav.goOverviewAria': 'AMAYA × NSpector — সংক্ষিপ্ত বিবরণে যান',
    'rail.search': 'খুঁজুন',
    'rail.shortcuts': 'কীবোর্ড শর্টকাট',
    'rail.shortcutsAria': '⌘K খুঁজুন — কীবোর্ড শর্টকাট দেখান',
    'rail.versionOffline': 'v2.0.1 · অফলাইন · স্থানীয় ইঞ্জিন',
    'rail.versionWeb': 'v2.0.1 · লাইভ ওয়েব সংস্করণ',

    'top.exposure': 'খোলা ঝুঁকি',
    'top.exposureTitle': 'খোলা NSpector ফাইন্ডিংয়ের সঙ্গে যুক্ত অর্থমূল্য',
    'top.sync': 'সিঙ্ক',
    'top.syncTitle': 'NSpector উৎস তথ্য পুনরায় আমদানি করুন',
    'top.syncAria': 'সিঙ্ক — NSpector উৎস তথ্য পুনরায় আমদানি করুন',
    'top.syncing': 'সিঙ্ক হচ্ছে…',
    'top.language': 'ভাষা',
    'tip.kpi.merged': 'একীকৃত অনুসন্ধান খুলুন',
    'tip.kpi.matched': 'মিলিত ডিভাইস পরীক্ষা করুন',
    'tip.kpi.findings': 'NSpector ফলাফল খুলুন',
    'tip.kpi.conflicts': 'AMAYA দ্বন্দ্ব খুলুন',
    'tip.kpi.serials': 'NSpector সিরিয়াল তালিকা খুলুন',
    'tip.kpi.assets': 'AMAYA সম্পদ তালিকা খুলুন',
    'tip.src.nspector': 'NSpector ডিভাইস খুলুন',
    'tip.src.amaya': 'AMAYA কর্মক্ষেত্র খুলুন',
    'tip.src.merged': 'একীকৃত তালিকায় খুঁজুন',
    'tip.control': 'সম্পূর্ণ IMEI কন্ট্রোল সেন্টার খুলুন',

    'search.globalPlaceholder': 'দুই লেজারে যেকোনো IMEI বা সিরিয়াল খুঁজুন',
    'search.globalAria': 'দুই লেজারে IMEI বা সিরিয়াল খুঁজুন',
    'search.inspect': 'পরিদর্শন',
    'search.suggestions': 'অনুসন্ধান পরামর্শ',
    'search.matching': 'মিল থাকা ডিভাইস',
    'search.found': '{n}টি পাওয়া গেছে',
    'search.noDevices': 'কোনো ডিভাইস পাওয়া যায়নি',
    'search.noDevicesHint': 'অন্য IMEI বা সিরিয়াল চেষ্টা করুন।',
    'search.amayaAsset': 'AMAYA সম্পদ',
    'search.nspectorDispatch': 'NSpector ডিসপাচ',

    'overview.eyebrow': 'একীভূত কর্মক্ষেত্র',
    'overview.heroTitle': 'দুটি লেজার। <em>এক ডিভাইস সত্য।</em>',
    'overview.ledeStatic': 'NSpector ডিসপাচ লেজার এবং AMAYA IMEI কন্ট্রোল সেন্টার এখন একই প্রশ্নের উত্তর একসাথে দেয়: এই হ্যান্ডসেটটি আসলে কোথায় গেল?',
    'overview.lede': 'NSpector ডিসপাচ লেজার এবং AMAYA IMEI কন্ট্রোল সেন্টার এখন একই প্রশ্নের উত্তর একসাথে দেয়: <b>{both}টি IMEI দুই লেজারেই আছে</b> — {dispatches} ডিসপাচ রেকর্ড এবং {events} ওয়ার্কবুক উপস্থিতিতে {union}টি স্বতন্ত্র ডিভাইস।',
    'overview.openLookup': 'একীভূত অনুসন্ধান খুলুন',
    'overview.openImei': 'IMEI কন্ট্রোল খুলুন',
    'overview.matchedImeis': 'মিল থাকা IMEI',
    'ov.recon.title': 'লেজার মিলানো',
    'ov.recon.hint': 'NSpector ডিসপাচ ট্রেইল এবং AMAYA সম্পদ লেজারের মধ্যে নিখুঁত IMEI মিল।',
    'ov.recon.loading': 'মিলানো লোড হচ্ছে…',
    'ov.amaya.title': 'IMEI কন্ট্রোল সেন্টার',
    'ov.amaya.hint': 'চারটি উৎস ওয়ার্কবুকে চলার প্রমাণ।',
    'ov.amaya.loading': 'স্ন্যাপশট লোড হচ্ছে…',
    'ov.ns.title': 'NSpector লেজার',
    'ov.ns.hint': 'ডিসপাচ, রিটার্ন, ডিলার দখল এবং ঝুঁকি।',
    'ov.ns.loading': 'লেজার লোড হচ্ছে…',
    'ov.critical.title': 'সর্বোচ্চ অগ্রাধিকার ফাইন্ডিং',
    'ov.critical.hint': 'NSpector যুক্তি ইঞ্জিনের খোলা বা তদন্তাধীন ফাইন্ডিং।',
    'ov.critical.loading': 'ফাইন্ডিং লোড হচ্ছে…',
    'ov.sources.title': 'প্রমাণ ভিত্তি',
    'ov.sources.hint': 'এই অ্যাপের প্রতিটি সংখ্যা একটি স্থানীয় ফাইল থেকে আসে। রানটাইমে কিছু আনা হয় না।',

    'lookup.eyebrow': 'ক্রস-লেজার অনুসন্ধান',
    'lookup.heroTitle': 'একটি সিরিয়াল। <em>দুই প্রমাণপথ।</em>',
    'lookup.intro': 'IMEI বা সিরিয়াল দিয়ে খুঁজুন। NSpector দেয় দখল, রিটার্ন ও যুক্তি; AMAYA দেয় প্রতিটি ওয়ার্কবুক উপস্থিতি, জীবনচক্র অবস্থা ও উৎস উদ্ধৃতি।',
    'lookup.aria': 'পরিদর্শনের জন্য IMEI বা সিরিয়াল',
    'lookup.open': 'ডসিয়ার খুলুন',
    'lookup.try': 'একটি পরিচিত মিল চেষ্টা করুন:',
    'lookup.emptyTitle': 'এখনো কিছু খোলা হয়নি',
    'lookup.emptyHint': 'উপরে একটি সিরিয়াল দিন বা মিলের উদাহরণ থেকে বেছে নিন। ডসিয়ারে দেখা যাবে কোন লেজারে ডিভাইসটি আছে এবং প্রতিটি কী বলে।',

    'devices.eyebrow': 'NSpector কর্মক্ষেত্র',
    'devices.title': 'ডিভাইস লেজার ও যুক্তি',
    'devices.pill': 'NSpector CSV লেজার',
    'tabs.aria': 'NSpector দৃশ্য',
    'tabs.queue': 'কাজের তালিকা',
    'tabs.inspect': 'পরিদর্শক',
    'tabs.exposure': 'ঝুঁকি',
    'tabs.chains': 'প্রবাহ',
    'tabs.dealers': 'ডিলার',
    'tabs.ownership': 'দায়িত্ব',

    'queue.anyStatus': 'যেকোনো অবস্থা',
    'queue.anySeverity': 'যেকোনো তীব্রতা',
    'queue.anyFinding': 'যেকোনো ফাইন্ডিং',
    'option.status.open': 'খোলা',
    'option.status.investigating': 'তদন্তাধীন',
    'option.status.resolved': 'সমাধানকৃত',
    'option.status.dismissed': 'বাতিল',
    'option.severity.critical': 'গুরুতর',
    'option.severity.high': 'উচ্চ',
    'option.severity.medium': 'মধ্যম',
    'option.severity.low': 'কম',
    'option.kind.duplicate_cross': 'ডুপ্লিকেট — দুই ডিলার',
    'option.kind.duplicate_multi': 'ডুপ্লিকেট — তিন বা ততোধিক',
    'option.kind.orphan_return': 'রিটার্ন, কখনো ডিসপাচ নয়',
    'option.kind.imei_lock': 'IMEI লক বা মিল না',
    'option.kind.no_serial_return': 'সিরিয়াল ছাড়া রিটার্ন',
    'option.kind.luhn_invalid': 'চেক ডিজিট ব্যর্থ',
    'option.kind.tac_conflict': 'প্রিফিক্স / মডেল দ্বন্দ্ব',
    'queue.ownerPlaceholder': 'দায়িত্বকারী দ্বারা ছাঁকুন',
    'queue.ownerAria': 'দায়িত্বকারী দ্বারা ফাইন্ডিং ছাঁকুন',
    'queue.minPlaceholder': 'ন্যুনতম মূল্য',
    'queue.minAria': 'ন্যুনতম পর্যবেক্ষিত মূল্য',
    'queue.clear': 'মুছুন',
    'queue.loadMore': 'আরও লোড করুন · {n} দেখানো হয়েছে',

    'inspect.title': 'সিরিয়াল পরিদর্শক',
    'inspect.hint': 'সম্পূর্ণ ট্রেইল, ফাইন্ডিংয়ের যুক্তি এবং তার প্রমাণ পেতে ১৫-অঙ্কের IMEI বা যেকোনো সিরিয়াল দিন।',
    'inspect.try': 'চেষ্টা করুন:',
    'inspect.duplicate': 'একটি ডুপ্লিকেট',
    'inspect.lock': 'একটি IMEI লক',
    'inspect.threeDealers': 'তিন ডিলার',

    'exposure.whereTitle': 'ঝুঁকি কোথায় আছে',
    'exposure.whereHint': 'মূল্য আপনার নিজস্ব রিটার্ন রেকর্ডে প্রকৃত পর্যবেক্ষিত দাম থেকে নেওয়া — এখানে কোনো অনুমান নেই।',
    'exposure.rootTitle': 'মূল কারণ — নির্ণীত',
    'exposure.rootHint': 'প্রতিটি ফাইন্ডিং জুড়ে প্রমাণ আসলে কী নির্দেশ করে।',
    'exposure.topTitle': 'সর্বোচ্চ মূল্যের আইটেম',
    'exposure.priceTitle': 'মূল্য তালিকা',
    'exposure.priceHint': 'আপনার লগ করা রিটার্ন থেকে তৈরি। যে মডেলের দাম পর্যবেক্ষিত হয়নি তাদের মূল্যহীন দেখানো হয়, শূন্য ধরা হয় না।',

    'chains.title': 'পুনরাবৃত্ত ডিলার-থেকে-ডিলার প্রবাহ',
    'chains.hint': 'একই সিরিয়াল বারবার একই ডিলার জোড়ার মধ্য দিয়ে যাচ্ছে। এটি এলোমেলো নয় — প্রতিটিকে আলাদা ডুপ্লিকেট নয়, একটিমাত্র কাঠামোগত সমস্যা হিসেবে দেখুন।',

    'dealers.searchPlaceholder': 'ডিলারের নাম বা উপনাম খুঁজুন',
    'dealers.searchAria': 'ডিলারের নাম বা উপনাম খুঁজুন',

    'ownership.findingTypes': 'ফাইন্ডিংয়ের ধরন',
    'ownership.usageTitle': 'এটি কীভাবে ব্যবহার করা উচিত',
    'ownership.usageHint': 'প্রতিটি ফাইন্ডিং রিপোর্টিং আইটেম, অভিযোগ নয়। ডুপ্লিকেট প্রায় সবসময়ই অন্বচ্ছেদ রিটার্ন, চুরি নয়। গুরুত্ব হলো কেউ একটি বন্ধ করার দায়িত্ব নিচ্ছে কি না।',
    'ownership.openDesc': 'তৈরি হয়েছে, কেউ দেখেনি',
    'ownership.investigatingDesc': 'কেউ বাস্তব ইউনিটের সাথে মিলিয়ে দেখছে',
    'ownership.resolvedDesc': 'ব্যবস্থা নেওয়া হয়েছে, ফাইন্ডিংয়ে নোট রেকর্ড করা হয়েছে',
    'ownership.dismissedDesc': 'দেখা ও ব্যাখ্যা করা হয়েছে, ব্যবস্থার প্রয়োজন নেই',

    'imei.eyebrow': 'AMAYA কর্মক্ষেত্র',
    'imei.reviewLoading': 'পর্যালোচনা সারাংশ লোড হচ্ছে…',
    'imei.stateHeader': 'সর্বশেষ সমাধানকৃত অবস্থা',
    'imei.ctaHeader': 'একটি ডিভাইস। একটি যুক্তিযুক্ত গল্প।',
    'imei.ctaBody': 'বারবার আসা IMEI উপস্থিতিকে ট্রেসযোগ্য চলার রেকর্ডে রূপ দিন — এবং প্রতিটি অমীমাংসিত দ্বন্দ্ব রিপোর্টিং ত্রুটি হওয়ার আগেই দৃশ্যমান করুন।',
    'imei.ctaButton': 'সম্পূর্ণ কন্ট্রোল সেন্টার খুলুন',
    'imei.reloadTitle': 'স্ন্যাপশট তথ্য রিফ্রেশ করুন',
    'imei.reload': 'রিলোড',
    'imei.reloadAria': 'রিলোড — স্ন্যাপশট তথ্য রিফ্রেশ করুন',
    'imei.openFullTitle': 'সম্পূর্ণ IMEI কন্ট্রোল সেন্টার খুলুন',
    'imei.openFullAria': 'খুলুন — সম্পূর্ণ IMEI কন্ট্রোল সেন্টার',
    'imei.open': 'খুলুন',
    'imei.assetsAria': 'AMAYA প্রধান মেট্রিক',
    'imei.statesAria': 'সর্বশেষ সমাধানকৃত অবস্থা',

    'sources.eyebrow': 'উৎস নির্দেশ',
    'sources.title': 'তথ্য উৎস ও পদ্ধতি',
    'sources.loading': 'উৎস তালিকা লোড হচ্ছে…',

    'sheet.title': 'ফাইন্ডিং',
    'sheet.close': 'বন্ধ',
    'sheet.closeAria': 'ফাইন্ডিং শিট বন্ধ করুন',
    'shortcuts.title': 'কীবোর্ড শর্টকাট',
    'shortcuts.close': 'বন্ধ',
    'shortcuts.closeAria': 'শর্টকাট বন্ধ করুন',
    'shortcuts.focusGlobal': 'গ্লোবাল অনুসন্ধানে ফোকাস',
    'shortcuts.focusAnywhere': 'যেকোনো জায়গায় অনুসন্ধানে ফোকাস',
    'shortcuts.switchWorkspace': 'কর্মক্ষেত্র বদলান',
    'shortcuts.moveSuggestions': 'পরামর্শের মধ্যে চলুন',
    'shortcuts.openHighlighted': 'হাইলাইট করা ফলাফল খুলুন',
    'shortcuts.showHelp': 'এই সাহায্য দেখান',
    'shortcuts.closePanel': 'প্যানেল বন্ধ করুন বা অনুসন্ধান মুছুন',
    'shortcuts.foot': 'কীবোর্ড-প্রথম তদন্তের জন্য তৈরি।'
  };
  const zh = {
    'app.name': 'AMAYA × NSpector',
    'app.tagline': '设备完整性套件',
    'app.title': 'AMAYA × NSpector — 统一设备智能',
    'meta.description': 'AMAYA × NSpector — IMEI 管控与发货台账完整性的统一工作台。两套台账，一个设备事实。',
    'skip.content': '跳到正文',

    'nav.workspaces': '工作区',
    'nav.overview': '概览',
    'nav.lookup': '统一查询',
    'nav.devices': '设备台账',
    'nav.imei': 'IMEI 控制中心',
    'nav.imeiShort': 'IMEI 管控',
    'nav.sources': '数据来源',
    'nav.goOverviewAria': 'AMAYA × NSpector — 前往概览',
    'rail.search': '搜索',
    'rail.shortcuts': '键盘快捷键',
    'rail.shortcutsAria': '⌘K 搜索 — 显示键盘快捷键',
    'rail.versionOffline': 'v2.0.1 · 离线 · 本地引擎',
    'rail.versionWeb': 'v2.0.1 · 在线实例',

    'top.exposure': '未结风险敞口',
    'top.exposureTitle': '未结 NSpector 发现涉及的金额',
    'top.sync': '同步',
    'top.syncTitle': '重新导入 NSpector 源数据',
    'top.syncAria': '同步 — 重新导入 NSpector 源数据',
    'top.syncing': '同步中…',
    'top.language': '语言',
    'tip.kpi.merged': '打开统一查询',
    'tip.kpi.matched': '查看匹配设备',
    'tip.kpi.findings': '打开 NSpector 发现项',
    'tip.kpi.conflicts': '打开 AMAYA 冲突',
    'tip.kpi.serials': '打开 NSpector 序列号台账',
    'tip.kpi.assets': '打开 AMAYA 资产台账',
    'tip.src.nspector': '打开 NSpector 设备',
    'tip.src.amaya': '打开 AMAYA 工作区',
    'tip.src.merged': '搜索合并台账',
    'tip.control': '打开完整 IMEI 控制中心',

    'search.globalPlaceholder': '在两套台账中搜索任意 IMEI 或序列号',
    'search.globalAria': '在两套台账中搜索 IMEI 或序列号',
    'search.inspect': '检查',
    'search.suggestions': '搜索建议',
    'search.matching': '匹配设备',
    'search.found': '找到 {n} 条',
    'search.noDevices': '未找到设备',
    'search.noDevicesHint': '请尝试其他 IMEI 或序列号。',
    'search.amayaAsset': 'AMAYA 资产',
    'search.nspectorDispatch': 'NSpector 发货',

    'overview.eyebrow': '合并工作区',
    'overview.heroTitle': '两套台账。<em>一个设备事实。</em>',
    'overview.ledeStatic': 'NSpector 发货台账与 AMAYA IMEI 控制中心现在共同回答同一个问题：这台设备究竟去了哪里？',
    'overview.lede': 'NSpector 发货台账与 AMAYA IMEI 控制中心现在共同回答同一个问题：<b>{both} 个 IMEI 同时出现在两边</b> — 跨 {dispatches} 条发货记录和 {events} 次工作表出现，共有 {union} 台不同设备。',
    'overview.openLookup': '打开统一查询',
    'overview.openImei': '打开 IMEI 管控',
    'overview.matchedImeis': '匹配的 IMEI',
    'ov.recon.title': '台账对账',
    'ov.recon.hint': 'NSpector 发货轨迹与 AMAYA 资产台账之间的精确 IMEI 匹配。',
    'ov.recon.loading': '正在载入对账…',
    'ov.amaya.title': 'IMEI 控制中心',
    'ov.amaya.hint': '四份源工作簿中的流转证据。',
    'ov.amaya.loading': '正在载入快照…',
    'ov.ns.title': 'NSpector 台账',
    'ov.ns.hint': '发货、退货、经销商保管与风险敞口。',
    'ov.ns.loading': '正在载入台账…',
    'ov.critical.title': '最高优先级发现',
    'ov.critical.hint': '来自 NSpector 推理引擎的未结或调查中发现。',
    'ov.critical.loading': '正在载入发现…',
    'ov.sources.title': '证据基础',
    'ov.sources.hint': '本应用中的每个数字都来自本地文件，运行时不会获取任何外部数据。',

    'lookup.eyebrow': '跨台账查询',
    'lookup.heroTitle': '一个序列号。<em>两条证据链。</em>',
    'lookup.intro': '按 IMEI 或序列号搜索。NSpector 提供保管、退货与推理；AMAYA 提供每次工作表出现、生命周期状态和来源引用。',
    'lookup.aria': '要检查的 IMEI 或序列号',
    'lookup.open': '打开档案',
    'lookup.try': '尝试已知交集：',
    'lookup.emptyTitle': '尚未打开任何内容',
    'lookup.emptyHint': '在上方输入序列号，或从交集示例中选择一个。档案将显示设备位于哪些台账中，以及各自的表述。',

    'devices.eyebrow': 'NSpector 工作区',
    'devices.title': '设备台账与推理',
    'devices.pill': 'NSpector CSV 台账',
    'tabs.aria': 'NSpector 视图',
    'tabs.queue': '工作队列',
    'tabs.inspect': '检查器',
    'tabs.exposure': '风险敞口',
    'tabs.chains': '流向',
    'tabs.dealers': '经销商',
    'tabs.ownership': '责任归属',

    'queue.anyStatus': '全部状态',
    'queue.anySeverity': '全部严重程度',
    'queue.anyFinding': '全部发现',
    'option.status.open': '未结',
    'option.status.investigating': '调查中',
    'option.status.resolved': '已解决',
    'option.status.dismissed': '已驳回',
    'option.severity.critical': '严重',
    'option.severity.high': '高',
    'option.severity.medium': '中',
    'option.severity.low': '低',
    'option.kind.duplicate_cross': '重复 — 两家经销商',
    'option.kind.duplicate_multi': '重复 — 三家及以上',
    'option.kind.orphan_return': '已退货，从未发货',
    'option.kind.imei_lock': 'IMEI 锁定或不匹配',
    'option.kind.no_serial_return': '退货无序列号',
    'option.kind.luhn_invalid': '校验位不通过',
    'option.kind.tac_conflict': '前缀 / 型号冲突',
    'queue.ownerPlaceholder': '按负责人筛选',
    'queue.ownerAria': '按负责人筛选发现',
    'queue.minPlaceholder': '最低金额',
    'queue.minAria': '最低观测金额',
    'queue.clear': '清除',
    'queue.loadMore': '加载更多 · 已显示 {n} 条',

    'inspect.title': '序列号检查器',
    'inspect.hint': '输入 15 位 IMEI 或任意序列号，即可查看完整轨迹、任何发现背后的推理及其证据。',
    'inspect.try': '试试：',
    'inspect.duplicate': '一个重复项',
    'inspect.lock': '一个 IMEI 锁定',
    'inspect.threeDealers': '三家经销商',

    'exposure.whereTitle': '风险敞口分布',
    'exposure.whereHint': '金额取自您自己退货记录中实际观测到的价格，此处没有任何估算。',
    'exposure.rootTitle': '根本原因 — 已诊断',
    'exposure.rootHint': '跨所有发现，证据实际指向的问题。',
    'exposure.topTitle': '金额最高的项目',
    'exposure.priceTitle': '价格表',
    'exposure.priceHint': '基于您记录的退货。没有观测价格的型号显示为未定价，而不是假定为零。',

    'chains.title': '反复出现的经销商间流向',
    'chains.hint': '相同序列号反复经过同一对经销商。这并非随机噪声 — 每个都应作为一项结构性问题处理，而不是 N 个独立重复项。',

    'dealers.searchPlaceholder': '搜索经销商名称或别名',
    'dealers.searchAria': '搜索经销商名称或别名',

    'ownership.findingTypes': '发现类型',
    'ownership.usageTitle': '使用方式说明',
    'ownership.usageHint': '每项发现都是报告事项，而非指控。重复通常只是未关闭的退货，而不是盗窃。关键在于有人负责将其闭环。',
    'ownership.openDesc': '已生成，尚无人查看',
    'ownership.investigatingDesc': '有人正在对照实物核查',
    'ownership.resolvedDesc': '已采取措施，并在此发现下记录说明',
    'ownership.dismissedDesc': '已核查并说明，无需处理',

    'imei.eyebrow': 'AMAYA 工作区',
    'imei.reviewLoading': '正在载入复核摘要…',
    'imei.stateHeader': '最新已判定状态',
    'imei.ctaHeader': '一台设备。一段可辩护的经历。',
    'imei.ctaBody': '将反复出现的 IMEI 记录转化为可追溯的流转记录，并在每个未解决冲突演变为报表错误之前将其显现。',
    'imei.ctaButton': '打开完整控制中心',
    'imei.reloadTitle': '刷新快照数据',
    'imei.reload': '重新载入',
    'imei.reloadAria': '重新载入 — 刷新快照数据',
    'imei.openFullTitle': '打开完整 IMEI 控制中心',
    'imei.openFullAria': '打开 — 完整 IMEI 控制中心',
    'imei.open': '打开',
    'imei.assetsAria': 'AMAYA 关键指标',
    'imei.statesAria': '最新已判定状态',

    'sources.eyebrow': '来源溯源',
    'sources.title': '数据来源与方法',
    'sources.loading': '正在载入来源清单…',

    'sheet.title': '发现',
    'sheet.close': '关闭',
    'sheet.closeAria': '关闭发现面板',
    'shortcuts.title': '键盘快捷键',
    'shortcuts.close': '关闭',
    'shortcuts.closeAria': '关闭快捷键',
    'shortcuts.focusGlobal': '聚焦全局搜索',
    'shortcuts.focusAnywhere': '在任意位置聚焦搜索',
    'shortcuts.switchWorkspace': '切换工作区',
    'shortcuts.moveSuggestions': '在建议中移动',
    'shortcuts.openHighlighted': '打开高亮结果',
    'shortcuts.showHelp': '显示此帮助',
    'shortcuts.closePanel': '关闭面板或清除搜索',
    'shortcuts.foot': '为键盘优先的调查而设计。'
  };
  Object.assign(en, {
    'status.open': 'Open', 'status.investigating': 'Investigating',
    'status.resolved': 'Resolved', 'status.dismissed': 'Dismissed',
    'severity.critical': 'Critical', 'severity.high': 'High',
    'severity.medium': 'Medium', 'severity.low': 'Low',
    'confidence.high': 'High', 'confidence.medium': 'Medium', 'confidence.low': 'Low',
    'kind.duplicate_cross': 'Two dealers', 'kind.duplicate_multi': 'Three+ dealers',
    'kind.orphan_return': 'Never dispatched', 'kind.imei_lock': 'IMEI lock / mismatch',
    'kind.no_serial_return': 'Return, no serial', 'kind.luhn_invalid': 'Invalid check digit',
    'kind.tac_conflict': 'Prefix conflict',
    'state.soldDelivered': 'Sold Delivered', 'state.stockTransfer': 'Stock Transfer',
    'state.service': 'Service', 'state.return': 'Return', 'state.badBin': 'Bad Bin',
    'state.pendingHold': 'Pending Hold', 'state.unknown': 'Unknown',

    'title.overview': 'Two ledgers. One device truth.',
    'title.lookup': 'One serial. Both evidence trails.',
    'title.devices': 'Device ledger & reasoning.',
    'title.imei': 'IMEI Control Center.',
    'title.sources': 'Data sources & methodology.',

    'kpi.distinct': 'Distinct devices', 'kpi.distinctSub': 'union of both ledgers',
    'kpi.matched': 'Matched in both', 'kpi.matchedSub': '{ns} NSpector-only · {am} AMAYA-only',
    'kpi.findings': 'NSpector findings', 'kpi.findingsSub': '{total} total · {value} open exposure',
    'kpi.conflicts': 'AMAYA conflicts', 'kpi.conflictsSub': '{repeat} repeat IDs · {review} in review queue',
    'kpi.serials': 'NSpector serials', 'kpi.serialsSub': '{disp} dispatch rows · {dealers} dealers',
    'kpi.assets': 'AMAYA assets', 'kpi.assetsSub': '{events} events · {books} workbooks',
    'recon.both': 'Both ledgers', 'recon.ns': 'NSpector only', 'recon.am': 'AMAYA only',
    'recon.sample': 'Sample exact matches', 'recon.none': 'No exact matches in this snapshot.',
    'am.snapshot': 'Snapshot', 'am.built': 'Built', 'am.openCenter': 'Open IMEI Control Center →',
    'ns.dispatches': 'Dispatches', 'ns.returns': 'Returns', 'ns.dealers': 'Dealers',
    'ns.openLedger': 'Open device ledger →', 'critical.none': 'No open critical or high findings.',
    'src.ns': 'NSpector', 'src.nsBig': '{n} dispatch rows', 'src.nsSub': 'SQLite ingest of 7 CSV / TXT exports',
    'src.am': 'AMAYA Control Center', 'src.amBig': '{assets} assets · {events} events',
    'src.amSub': 'Generated from {file}', 'src.merged': 'Merged index',
    'src.mergedBig': '{n} exact matches', 'src.mergedSub': 'Full IMEI equality, no fuzzy matching',
    'ov.unavailable': 'Overview data unavailable', 'ov.waiting': 'Waiting for a successful overview load.',
    'ov.retry': 'Try again',

    'lookup.reading': 'Reading both ledgers for {serial}…', 'lookup.failed': 'Lookup failed',
    'presence.both': 'In both ledgers', 'presence.ns': 'NSpector only',
    'presence.am': 'AMAYA only', 'presence.none': 'Not found',
    'dossier.notFound': '{serial} is not in either ledger',
    'dossier.notFoundHint': 'No dispatch, return, finding, asset or movement event carries this serial. Check for a typo, or note that the unit may predate both snapshots.',
    'dossier.openInspector': 'Inspector', 'dossier.searchCenter': 'Search the Control Center',
    'dossier.eyebrow': 'Device dossier', 'dossier.checkValid': 'check digit valid',
    'dossier.checkInvalid': 'check digit invalid', 'dossier.conflict': 'AMAYA conflict',
    'dossier.repeat': 'repeat ID', 'dossier.openNs': 'Open in NSpector inspector',
    'dossier.copy': 'Copy for Control Center',
    'dossier.copyHint': 'Serial copied — Control Center opened on its evidence trail.',
    'dossier.copyFallback': 'Control Center opened on its evidence trail — copy the serial above if needed.',
    'dossier.nsTitle': 'NSpector', 'dossier.nsSub': 'Custody, returns & reasoning',
    'dossier.amTitle': 'AMAYA IMEI Control Center', 'dossier.amSub': 'Workbook occurrences & lifecycle',
    'dossier.noNs': 'Not present in the NSpector dispatch ledger or returns.',
    'dossier.noAm': 'Not present in the AMAYA asset snapshot.',

    'ns.summary': 'Ledger summary', 'ns.count': '{disp} dispatch · {ret} return',
    'ns.serialKind': 'Serial kind', 'ns.checkDigit': 'Check digit',
    'ns.valid': 'Valid', 'ns.invalid': 'Invalid', 'ns.na': 'Not applicable',
    'ns.price': 'Observed price', 'ns.blast': 'Blast radius',
    'ns.blastSub': '{n} other serials shared these dealers', 'ns.trail': 'Dispatch trail',
    'ns.stops': '{n} stops', 'ns.undated': 'undated', 'ns.unknownDealer': 'Unknown dealer',
    'ns.wing': 'wing', 'ns.reasoning': 'Reasoning', 'ns.confidence': '{c} confidence',
    'ns.diagnosis': 'Diagnosis', 'ns.doNext': 'Do this next', 'ns.returns': 'Returns',
    'ns.findings': 'Findings on this serial',

    'am.ledger': 'Asset ledger', 'am.occurrences': '{n} occurrences',
    'am.product': 'Product', 'am.notRecorded': 'Not recorded', 'am.terminal': 'Terminal state',
    'am.range': 'Date range', 'am.tabs': 'Workbook tabs', 'am.flags': 'Flags',
    'am.noConflict': 'No conflict', 'am.repeatShort': 'repeat ID',
    'am.citation': 'Evidence citation', 'am.row': 'row', 'am.movement': 'Movement evidence',
    'am.events': '{n} events', 'am.noEvents': 'No movement events recorded for this asset.',
    'am.means': 'What this means',
    'am.meanConflict': 'The source workbooks disagree about this device. Treat the AMAYA review queue entry as the authoritative follow-up.',
    'am.meanRepeat': 'This serial repeats across workbook occurrences. Compare the earliest and latest state before accepting the terminal state.',
    'am.meanMultiple': 'The device appears across multiple workbook occurrences. The timeline above is the evidence trail; the ledger state is the conclusion.',

    'control.window': 'Control Center opened in its own window',
    'control.failed': 'Could not open the Control Center',
    'control.tab': 'Control Center opened in a new tab',
    'control.popups': 'Allow pop-ups to open the Control Center',
    'control.reloaded': 'Control Center window reloaded',
    'control.refreshed': 'Snapshot metrics refreshed',
    'toast.localeChanged': 'Language updated across the suite',
    'ama.unavailable': 'Snapshot unavailable', 'ama.metrics': 'Metrics could not be loaded.',
    'ama.unique': 'Unique Assets', 'ama.uniqueSub': 'one-row deduplicated ledger',
    'ama.repeat': 'Repeated IDs', 'ama.repeatSub': 'present in 2+ source tabs',
    'ama.conflictMetric': 'Movement Conflicts', 'ama.conflictSub': 'states disagree across evidence',
    'ama.noTerminal': 'No Terminal State', 'ama.noTerminalSub': 'of the ledger cannot be resolved',
    'ama.outside': '{n} outside the review queue', 'ama.emptyTabs': '{n} empty tabs',
    'ama.flagged': '{n} flagged for review', 'ama.noStates': 'No state data in this snapshot.',
    'ama.note': 'Snapshot {v} · built {d} · source {f}',

    'sources.unavailable': 'Source inventory unavailable',
    'sources.ingest': 'NSpector ingest', 'sources.files': '{n} files',
    'sources.ingestHint': "Copied to the app's user-data folder on first run, ingested into SQLite, then analysed by the findings engine. Edits stay local.",
    'sources.noFiles': 'No source files found.',
    'sources.snapshot': 'AMAYA snapshot', 'sources.generated': 'Generated from {file} on {date}. The Control Center is served unmodified from this snapshot.',
    'sources.assets': 'assets', 'sources.events': 'events', 'sources.conflicts': 'conflicts',
    'sources.repeats': 'repeat IDs', 'sources.workbooks': 'Source workbooks',
    'sources.workbooksHint': 'The AMAYA snapshot cites four workbooks. Links open in your browser; the app itself never calls out to them.',
    'sources.openBook': 'Open source workbook →', 'sources.method': 'Methodology notes',
    'method.exactTitle': 'Exact matching only',
    'method.exactBody': 'An IMEI is "matched" when the same 15-character string exists in both ledgers. There is no fuzzy, phonetic or TAC-prefix matching in the reconciliation count.',
    'method.observedTitle': 'Values are observed',
    'method.observedBody': 'NSpector exposure uses prices logged on your own return records. AMAYA states come from the workbook snapshot\'s resolved column.',
    'method.findingsTitle': 'Findings are reporting items',
    'method.findingsBody': 'A duplicate is usually an unclosed return, not theft. The owner and status on a finding are what make it actionable.',
    'method.offlineTitle': 'Offline by design',
    'method.offlineBody': 'Fonts, snapshots and code are bundled. The desktop app serves everything from localhost on your machine.'
  });
  Object.assign(bn, {
    'status.open': 'খোলা', 'status.investigating': 'তদন্তাধীন',
    'status.resolved': 'সমাধানকৃত', 'status.dismissed': 'বাতিল',
    'severity.critical': 'গুরুতর', 'severity.high': 'উচ্চ',
    'severity.medium': 'মধ্যম', 'severity.low': 'কম',
    'confidence.high': 'উচ্চ', 'confidence.medium': 'মধ্যম', 'confidence.low': 'কম',
    'kind.duplicate_cross': 'দুই ডিলার', 'kind.duplicate_multi': '৩+ ডিলার',
    'kind.orphan_return': 'কখনো ডিসপাচ হয়নি', 'kind.imei_lock': 'IMEI লক / মিল না',
    'kind.no_serial_return': 'রিটার্ন, সিরিয়াল নেই', 'kind.luhn_invalid': 'অবৈধ চেক ডিজিট',
    'kind.tac_conflict': 'প্রিফিক্স দ্বন্দ্ব',
    'state.soldDelivered': 'বিক্রীত ও ডেলিভারড', 'state.stockTransfer': 'স্টক স্থানান্তর',
    'state.service': 'সার্ভিস', 'state.return': 'রিটার্ন', 'state.badBin': 'ব্যাড বিন',
    'state.pendingHold': 'মুলতুবি হোল্ড', 'state.unknown': 'অজানা',

    'title.overview': 'দুটি লেজার। এক ডিভাইস সত্য।',
    'title.lookup': 'একটি সিরিয়াল। দুই প্রমাণপথ।',
    'title.devices': 'ডিভাইস লেজার ও যুক্তি।',
    'title.imei': 'IMEI কন্ট্রোল সেন্টার।',
    'title.sources': 'তথ্য উৎস ও পদ্ধতি।',

    'kpi.distinct': 'স্বতন্ত্র ডিভাইস', 'kpi.distinctSub': 'দুই লেজারের সমন্বয়',
    'kpi.matched': 'দুটিতেই মিল', 'kpi.matchedSub': '{ns} শুধু NSpector · {am} শুধু AMAYA',
    'kpi.findings': 'NSpector ফাইন্ডিং', 'kpi.findingsSub': 'মোট {total} · {value} খোলা ঝুঁকি',
    'kpi.conflicts': 'AMAYA দ্বন্দ্ব', 'kpi.conflictsSub': '{repeat} পুনরাবৃত্তি আইডি · {review} পর্যালোচনায়',
    'kpi.serials': 'NSpector সিরিয়াল', 'kpi.serialsSub': '{disp} ডিসপাচ সারি · {dealers} ডিলার',
    'kpi.assets': 'AMAYA সম্পদ', 'kpi.assetsSub': '{events} ইভেন্ট · {books} ওয়ার্কবুক',
    'recon.both': 'দুই লেজারে', 'recon.ns': 'শুধু NSpector', 'recon.am': 'শুধু AMAYA',
    'recon.sample': 'নিখুঁত মিলের নমুনা', 'recon.none': 'এই স্ন্যাপশটে কোনো নিখুঁত মিল নেই।',
    'am.snapshot': 'স্ন্যাপশট', 'am.built': 'তৈরি', 'am.openCenter': 'IMEI কন্ট্রোল সেন্টার খুলুন →',
    'ns.dispatches': 'ডিসপাচ', 'ns.returns': 'রিটার্ন', 'ns.dealers': 'ডিলার',
    'ns.openLedger': 'ডিভাইস লেজার খুলুন →', 'critical.none': 'কোনো খোলা গুরুতর বা উচ্চ ফাইন্ডিং নেই।',
    'src.ns': 'NSpector', 'src.nsBig': '{n} ডিসপাচ সারি', 'src.nsSub': '৭টি CSV / TXT এক্সপোর্টের SQLite আমদানি',
    'src.am': 'AMAYA কন্ট্রোল সেন্টার', 'src.amBig': '{assets} সম্পদ · {events} ইভেন্ট',
    'src.amSub': '{file} থেকে তৈরি', 'src.merged': 'একীভূত সূচক',
    'src.mergedBig': '{n} নিখুঁত মিল', 'src.mergedSub': 'সম্পূর্ণ IMEI সমতা, কোনো আনুমানিক মিল নেই',
    'ov.unavailable': 'সংক্ষিপ্ত বিবরণের তথ্য পাওয়া যায়নি', 'ov.waiting': 'সফল লোডের অপেক্ষায়।',
    'ov.retry': 'আবার চেষ্টা করুন',

    'lookup.reading': '{serial}-এর জন্য দুই লেজার পড়া হচ্ছে…', 'lookup.failed': 'অনুসন্ধান ব্যর্থ',
    'presence.both': 'দুই লেজারে আছে', 'presence.ns': 'শুধু NSpector',
    'presence.am': 'শুধু AMAYA', 'presence.none': 'পাওয়া যায়নি',
    'dossier.notFound': '{serial} কোনো লেজারেই নেই',
    'dossier.notFoundHint': 'এই সিরিয়ালে কোনো ডিসপাচ, রিটার্ন, ফাইন্ডিং, সম্পদ বা চলার ইভেন্ট নেই। টাইপো যাচাই করুন, অথবা ইউনিটটি দুই স্ন্যাপশটের আগের হতে পারে।',
    'dossier.openInspector': 'পরিদর্শক', 'dossier.searchCenter': 'কন্ট্রোল সেন্টারে খুঁজুন',
    'dossier.eyebrow': 'ডিভাইস ডসিয়ার', 'dossier.checkValid': 'চেক ডিজিট বৈধ',
    'dossier.checkInvalid': 'চেক ডিজিট অবৈধ', 'dossier.conflict': 'AMAYA দ্বন্দ্ব',
    'dossier.repeat': 'পুনরাবৃত্তি আইডি', 'dossier.openNs': 'NSpector পরিদর্শকতে খুলুন',
    'dossier.copy': 'কন্ট্রোল সেন্টারের জন্য কপি',
    'dossier.copyHint': 'সিরিয়াল কপি হয়েছে — কন্ট্রোল সেন্টার তার প্রমাণ-পথে খোলা হয়েছে।',
    'dossier.copyFallback': 'কন্ট্রোল সেন্টার প্রমাণ-পথে খোলা হয়েছে — প্রয়োজনে উপরের সিরিয়ালটি কপি করুন।',
    'dossier.nsTitle': 'NSpector', 'dossier.nsSub': 'দখল, রিটার্ন ও যুক্তি',
    'dossier.amTitle': 'AMAYA IMEI কন্ট্রোল সেন্টার', 'dossier.amSub': 'ওয়ার্কবুক উপস্থিতি ও জীবনচক্র',
    'dossier.noNs': 'NSpector ডিসপাচ লেজার বা রিটার্নে নেই।',
    'dossier.noAm': 'AMAYA সম্পদ স্ন্যাপশটে নেই।',

    'ns.summary': 'লেজার সারাংশ', 'ns.count': '{disp} ডিসপাচ · {ret} রিটার্ন',
    'ns.serialKind': 'সিরিয়ালের ধরন', 'ns.checkDigit': 'চেক ডিজিট',
    'ns.valid': 'বৈধ', 'ns.invalid': 'অবৈধ', 'ns.na': 'প্রযোজ্য নয়',
    'ns.price': 'পর্যবেক্ষিত মূল্য', 'ns.blast': 'প্রভাবের পরিধি',
    'ns.blastSub': '{n}টি অন্য সিরিয়াল একই ডিলার ব্যবহার করেছে', 'ns.trail': 'ডিসপাচ ট্রেইল',
    'ns.stops': '{n} ধাপ', 'ns.undated': 'তারিখহীন', 'ns.unknownDealer': 'অজানা ডিলার',
    'ns.wing': 'ওয়িং', 'ns.reasoning': 'যুক্তি', 'ns.confidence': '{c} আত্মবিশ্বাস',
    'ns.diagnosis': 'নির্ণয়', 'ns.doNext': 'পরবর্তীতে করণীয়', 'ns.returns': 'রিটার্ন',
    'ns.findings': 'এই সিরিয়ালের ফাইন্ডিং',

    'am.ledger': 'সম্পদ তালিকা', 'am.occurrences': '{n} উপস্থিতি',
    'am.product': 'পণ্য', 'am.notRecorded': 'রেকর্ড নেই', 'am.terminal': 'চূড়ান্ত অবস্থা',
    'am.range': 'তারিখ সীমা', 'am.tabs': 'ওয়ার্কবুক ট্যাব', 'am.flags': 'ফ্ল্যাগ',
    'am.noConflict': 'কোনো দ্বন্দ্ব নেই', 'am.repeatShort': 'পুনরাবৃত্তি আইডি',
    'am.citation': 'প্রমাণ উদ্ধৃতি', 'am.row': 'সারি', 'am.movement': 'চলার প্রমাণ',
    'am.events': '{n} ইভেন্ট', 'am.noEvents': 'এই সম্পদের কোনো চলার ইভেন্ট রেকর্ড নেই।',
    'am.means': 'এর অর্থ কী',
    'am.meanConflict': 'উৎস ওয়ার্কবুকগুলো এই ডিভাইস নিয়ে একমত নয়। AMAYA পর্যালোচনা তালিকার এন্ট্রিকেই কর্তৃত্বপূর্ণ অনুসরণ হিসেবে দেখুন।',
    'am.meanRepeat': 'এই সিরিয়ালটি ওয়ার্কবুক উপস্থিতিতে পুনরাবৃত্ত হয়। চূড়ান্ত অবস্থা মেনে নেওয়ার আগে প্রথম ও শেষ অবস্থা তুলনা করুন।',
    'am.meanMultiple': 'ডিভাইসটি একাধিক ওয়ার্কবুক উপস্থিতিতে দেখা যায়। উপরের সময়রেখা হলো প্রমাণপথ; লেজারের অবস্থা হলো সিদ্ধান্ত।',

    'control.window': 'কন্ট্রোল সেন্টার নিজস্ব উইন্ডোতে খোলা হয়েছে',
    'control.failed': 'কন্ট্রোল সেন্টার খোলা যায়নি',
    'control.tab': 'কন্ট্রোল সেন্টার নতুন ট্যাবে খোলা হয়েছে',
    'control.popups': 'কন্ট্রোল সেন্টার খুলতে পপ-অ্যাপ অনুমোদন করুন',
    'control.reloaded': 'কন্ট্রোল সেন্টার উইন্ডো রিলোড হয়েছে',
    'control.refreshed': 'স্ন্যাপশট মেট্রিক রিফ্রেশ হয়েছে',
    'toast.localeChanged': 'সম্পূর্ণ স্যুতে ভাষা হালনাগাদ হয়েছে',
    'ama.unavailable': 'স্ন্যাপশট পাওয়া যায়নি', 'ama.metrics': 'মেট্রিক লোড করা যায়নি।',
    'ama.unique': 'স্বতন্ত্র সম্পদ', 'ama.uniqueSub': 'এক-সারির ডুপ্লিকেট-মুছে ফেলা তালিকা',
    'ama.repeat': 'পুনরাবৃত্ত আইডি', 'ama.repeatSub': '২+ উৎস ট্যাবে উপস্থিত',
    'ama.conflictMetric': 'চলার দ্বন্দ্ব', 'ama.conflictSub': 'প্রমাণ জুড়ে অবস্থার মতান্তর',
    'ama.noTerminal': 'চূড়ান্ত অবস্থা নেই', 'ama.noTerminalSub': 'লেজারের এই অংশ সমাধান করা যায়নি',
    'ama.outside': '{n}টি পর্যালোচনা তালিকার বাইরে', 'ama.emptyTabs': '{n}টি খালি ট্যাব',
    'ama.flagged': '{n}টি পর্যালোচনার জন্য চিহ্নিত', 'ama.noStates': 'এই স্ন্যাপশটে অবস্থার তথ্য নেই।',
    'ama.note': 'স্ন্যাপশট {v} · তৈরি {d} · উৎস {f}',

    'sources.unavailable': 'উৎস তালিকা পাওয়া যায়নি',
    'sources.ingest': 'NSpector আমদানি', 'sources.files': '{n}টি ফাইল',
    'sources.ingestHint': 'প্রথম চালনায় অ্যাপের user-data ফোল্ডারে কপি, SQLite-এ আমদানি, তারপর ফাইন্ডিং ইঞ্জিনে বিশ্লেষণ। সম্পাদনা স্থানীয় থাকে।',
    'sources.noFiles': 'কোনো উৎস ফাইল পাওয়া যায়নি।',
    'sources.snapshot': 'AMAYA স্ন্যাপশট', 'sources.generated': '{date} তারিখে {file} থেকে তৈরি। কন্ট্রোল সেন্টার এই স্ন্যাপশট থেকে অপরিবর্তিতভাবে চলে।',
    'sources.assets': 'সম্পদ', 'sources.events': 'ইভেন্ট', 'sources.conflicts': 'দ্বন্দ্ব',
    'sources.repeats': 'পুনরাবৃত্ত আইডি', 'sources.workbooks': 'উৎস ওয়ার্কবুক',
    'sources.workbooksHint': 'AMAYA স্ন্যাপশটে চারটি ওয়ার্কবুক উদ্ধৃত। লিংক আপনার ব্রাউজারে খুলবে; অ্যাপ নিজে কখনো সেখানে যায় না।',
    'sources.openBook': 'উৎস ওয়ার্কবুক খুলুন →', 'sources.method': 'পদ্ধতির নোট',
    'method.exactTitle': 'শুধু নিখুঁত মিল',
    'method.exactBody': 'দুই লেজারে একই ১৫-অঙ্কের স্ট্রিং থাকলে IMEI কে "মিল" বলা হয়। মিলানোতে কোনো আনুমানিক, ধ্বনিগত বা TAC-প্রিফিক্স মিল নেই।',
    'method.observedTitle': 'মান পর্যবেক্ষিত',
    'method.observedBody': 'NSpector ঝুঁকি আপনার নিজস্ব রিটার্ন রেকর্ডে লগ করা দাম ব্যবহার করে। AMAYA অবস্থা ওয়ার্কবুক স্ন্যাপশটের resolved কলাম থেকে আসে।',
    'method.findingsTitle': 'ফাইন্ডিং হলো রিপোর্টিং আইটেম',
    'method.findingsBody': 'ডুপ্লিকেট সাধারণত অন্বচ্ছেদ রিটার্ন, চুরি নয়। ফাইন্ডিংয়ের দায়িত্বকারী ও অবস্থাই এটিকে কার্যকর করে।',
    'method.offlineTitle': 'ডিজাইন অনুযায়ী অফলাইন',
    'method.offlineBody': 'ফন্ট, স্ন্যাপশট ও কোড বান্ডেল করা। ডেস্কটপ অ্যাপ সবকিছু আপনার মেশিনের localhost থেকে সরবরাহ করে।'
  });
  Object.assign(zh, {
    'status.open': '未结', 'status.investigating': '调查中',
    'status.resolved': '已解决', 'status.dismissed': '已驳回',
    'severity.critical': '严重', 'severity.high': '高',
    'severity.medium': '中', 'severity.low': '低',
    'confidence.high': '高', 'confidence.medium': '中', 'confidence.low': '低',
    'kind.duplicate_cross': '两家经销商', 'kind.duplicate_multi': '三家以上',
    'kind.orphan_return': '从未发货', 'kind.imei_lock': 'IMEI 锁定/不匹配',
    'kind.no_serial_return': '退货无序列号', 'kind.luhn_invalid': '校验位无效',
    'kind.tac_conflict': '前缀冲突',
    'state.soldDelivered': '已售已交付', 'state.stockTransfer': '库存调拨',
    'state.service': '维修中', 'state.return': '退货', 'state.badBin': '不良品仓',
    'state.pendingHold': '待处理暂扣', 'state.unknown': '未知',

    'title.overview': '两套台账。一个设备事实。',
    'title.lookup': '一个序列号。两条证据链。',
    'title.devices': '设备台账与推理。',
    'title.imei': 'IMEI 控制中心。',
    'title.sources': '数据来源与方法。',

    'kpi.distinct': '不同设备', 'kpi.distinctSub': '两套台账合并去重',
    'kpi.matched': '双方均匹配', 'kpi.matchedSub': '{ns} 仅 NSpector · {am} 仅 AMAYA',
    'kpi.findings': 'NSpector 发现', 'kpi.findingsSub': '共 {total} 条 · {value} 未结敞口',
    'kpi.conflicts': 'AMAYA 冲突', 'kpi.conflictsSub': '{repeat} 个重复 ID · {review} 条待复核',
    'kpi.serials': 'NSpector 序列号', 'kpi.serialsSub': '{disp} 条发货记录 · {dealers} 家经销商',
    'kpi.assets': 'AMAYA 资产', 'kpi.assetsSub': '{events} 个事件 · {books} 份工作簿',
    'recon.both': '两套台账均有', 'recon.ns': '仅 NSpector', 'recon.am': '仅 AMAYA',
    'recon.sample': '精确匹配示例', 'recon.none': '此快照中没有精确匹配。',
    'am.snapshot': '快照', 'am.built': '构建于', 'am.openCenter': '打开 IMEI 控制中心 →',
    'ns.dispatches': '发货', 'ns.returns': '退货', 'ns.dealers': '经销商',
    'ns.openLedger': '打开设备台账 →', 'critical.none': '没有未结的严重或高级别发现。',
    'src.ns': 'NSpector', 'src.nsBig': '{n} 条发货记录', 'src.nsSub': '导入 7 份 CSV / TXT 到 SQLite',
    'src.am': 'AMAYA 控制中心', 'src.amBig': '{assets} 台资产 · {events} 个事件',
    'src.amSub': '由 {file} 生成', 'src.merged': '合并索引',
    'src.mergedBig': '{n} 个精确匹配', 'src.mergedSub': '完整 IMEI 相等，不做模糊匹配',
    'ov.unavailable': '概览数据不可用', 'ov.waiting': '等待概览加载成功。',
    'ov.retry': '重试',

    'lookup.reading': '正在读取 {serial} 的两套台账…', 'lookup.failed': '查询失败',
    'presence.both': '两套台账中均有', 'presence.ns': '仅 NSpector',
    'presence.am': '仅 AMAYA', 'presence.none': '未找到',
    'dossier.notFound': '{serial} 不在任何台账中',
    'dossier.notFoundHint': '没有发货、退货、发现、资产或流转事件包含此序列号。请检查是否输入错误，或该设备可能早于两份快照。',
    'dossier.openInspector': '检查器', 'dossier.searchCenter': '在控制中心搜索',
    'dossier.eyebrow': '设备档案', 'dossier.checkValid': '校验位有效',
    'dossier.checkInvalid': '校验位无效', 'dossier.conflict': 'AMAYA 冲突',
    'dossier.repeat': '重复 ID', 'dossier.openNs': '在 NSpector 检查器中打开',
    'dossier.copy': '复制到控制中心',
    'dossier.copyHint': '序列号已复制 — 控制中心已直接打开其证据链。',
    'dossier.copyFallback': '控制中心已直接打开证据链 — 如需请复制上方序列号。',
    'dossier.nsTitle': 'NSpector', 'dossier.nsSub': '保管、退货与推理',
    'dossier.amTitle': 'AMAYA IMEI 控制中心', 'dossier.amSub': '工作表出现与生命周期',
    'dossier.noNs': '不在 NSpector 发货台账或退货记录中。',
    'dossier.noAm': '不在 AMAYA 资产快照中。',

    'ns.summary': '台账摘要', 'ns.count': '{disp} 发货 · {ret} 退货',
    'ns.serialKind': '序列号类型', 'ns.checkDigit': '校验位',
    'ns.valid': '有效', 'ns.invalid': '无效', 'ns.na': '不适用',
    'ns.price': '观测价格', 'ns.blast': '影响范围',
    'ns.blastSub': '{n} 个其他序列号共用这些经销商', 'ns.trail': '发货轨迹',
    'ns.stops': '{n} 站', 'ns.undated': '无日期', 'ns.unknownDealer': '未知经销商',
    'ns.wing': '仓库', 'ns.reasoning': '推理', 'ns.confidence': '{c} 置信度',
    'ns.diagnosis': '诊断', 'ns.doNext': '下一步操作', 'ns.returns': '退货',
    'ns.findings': '此序列号上的发现',

    'am.ledger': '资产台账', 'am.occurrences': '{n} 次出现',
    'am.product': '产品', 'am.notRecorded': '未记录', 'am.terminal': '最终状态',
    'am.range': '日期范围', 'am.tabs': '工作表标签', 'am.flags': '标记',
    'am.noConflict': '无冲突', 'am.repeatShort': '重复 ID',
    'am.citation': '证据引用', 'am.row': '第', 'am.movement': '流转证据',
    'am.events': '{n} 个事件', 'am.noEvents': '此资产没有记录流转事件。',
    'am.means': '这意味着什么',
    'am.meanConflict': '源工作簿对此设备存在分歧。请将 AMAYA 复核队列中的条目作为权威跟进依据。',
    'am.meanRepeat': '此序列号在工作表出现中重复。接受最终状态前，请比较最早与最新的状态。',
    'am.meanMultiple': '此设备出现在多个工作表记录中。上方时间线是证据链，台账状态是结论。',

    'control.window': '控制中心已在独立窗口打开',
    'control.failed': '无法打开控制中心',
    'control.tab': '控制中心已在新标签页打开',
    'control.popups': '请允许弹出窗口以打开控制中心',
    'control.reloaded': '控制中心窗口已重新载入',
    'control.refreshed': '快照指标已刷新',
    'toast.localeChanged': '整套系统中的语言已更新',
    'ama.unavailable': '快照不可用', 'ama.metrics': '指标无法载入。',
    'ama.unique': '不重复资产', 'ama.uniqueSub': '单行去重台账',
    'ama.repeat': '重复 ID', 'ama.repeatSub': '出现在 2 个以上源工作表',
    'ama.conflictMetric': '流转冲突', 'ama.conflictSub': '证据之间的状态不一致',
    'ama.noTerminal': '无最终状态', 'ama.noTerminalSub': '台账中该部分无法判定',
    'ama.outside': '{n} 台不在复核队列内', 'ama.emptyTabs': '{n} 个空白工作表',
    'ama.flagged': '{n} 台已标记待复核', 'ama.noStates': '此快照中没有状态数据。',
    'ama.note': '快照 {v} · 构建于 {d} · 来源 {f}',

    'sources.unavailable': '来源清单不可用',
    'sources.ingest': 'NSpector 导入', 'sources.files': '{n} 个文件',
    'sources.ingestHint': '首次运行时复制到应用的用户数据目录，导入 SQLite，再由发现引擎分析。修改仅保留在本地。',
    'sources.noFiles': '未找到源文件。',
    'sources.snapshot': 'AMAYA 快照', 'sources.generated': '于 {date} 由 {file} 生成。控制中心直接由此快照原样提供。',
    'sources.assets': '台资产', 'sources.events': '个事件', 'sources.conflicts': '个冲突',
    'sources.repeats': '个重复 ID', 'sources.workbooks': '源工作簿',
    'sources.workbooksHint': 'AMAYA 快照引用四份工作簿。链接在浏览器中打开；应用本身从不访问它们。',
    'sources.openBook': '打开源工作簿 →', 'sources.method': '方法说明',
    'method.exactTitle': '仅精确匹配',
    'method.exactBody': '当相同的 15 字符字符串同时存在于两套台账时，才算 IMEI “匹配”。对账计数中不做模糊、语音或 TAC 前缀匹配。',
    'method.observedTitle': '金额均为观测值',
    'method.observedBody': 'NSpector 风险敞口使用您自己退货记录中登记的金额。AMAYA 状态来自工作簿快照的已判定列。',
    'method.findingsTitle': '发现是报告事项',
    'method.findingsBody': '重复通常只是未关闭的退货，而不是盗窃。发现上的负责人和状态才使其可操作。',
    'method.offlineTitle': '离线设计',
    'method.offlineBody': '字体、快照与代码均已打包。桌面应用从您本机的 localhost 提供所有内容。'
  });
  Object.assign(en, {
    'common.unavailable': 'unavailable',
    'nsp.liveSync': 'live sync', 'nsp.reconnecting': 'reconnecting…',
    'nsp.syncPaused': 'live sync paused', 'nsp.liveConnected': 'Live sync connected',
    'nsp.clickReconnect': 'Click to reconnect', 'nsp.reconnectingToast': 'Reconnecting live sync…',
    'nsp.synced': 'Synced · {n} records', 'nsp.marked': 'Marked {s}',
    'nsp.updateFailed': 'Update failed', 'nsp.findingNotFound': 'Finding not found',
    'nsp.saved': 'Saved', 'nsp.saveFailed': 'Save failed — {e}',
    'nsp.syncComplete': 'Sync complete · {n} records', 'nsp.syncFailed': 'Sync failed — {e}',

    'queue.unavailable': 'Work queue', 'queue.unknownError': 'Unknown error',
    'queue.retry': 'Try again', 'queue.unpriced': 'unpriced', 'queue.score': 'score',
    'queue.unassigned': 'unassigned', 'queue.daysApart': '{n}d apart',
    'queue.open': 'Open', 'queue.investigating': 'Investigating',
    'queue.resolved': 'Resolved', 'queue.dismissed': 'Dismissed', 'queue.total': 'Total',
    'queue.openValue': 'Open value',
    'queue.noMatchTitle': 'No findings match these filters',
    'queue.noMatchBody': 'Clear a filter or widen the value range to see more of the ledger.',
    'queue.clearFilters': 'Clear filters',

    'finding.diagnosis': 'Diagnosis', 'finding.noDiagnosis': 'No diagnosis recorded for this finding.',
    'finding.severity': 'Severity', 'finding.type': 'Type', 'finding.serial': 'Serial',
    'finding.model': 'Model', 'finding.dealer': 'Dealer', 'finding.dealers': 'Dealers',
    'finding.gap': 'Gap', 'finding.daysBetween': '{n} days between dispatches',
    'finding.warehouse': 'Warehouse', 'finding.claimedBoth': 'claimed by both wings',
    'finding.checkDigit': 'Check digit', 'finding.validNotClone': 'valid — not a clone or corruption',
    'finding.invalid': 'invalid', 'finding.valueRisk': 'Value at risk',
    'finding.notPriced': 'not priced', 'finding.basis': 'Basis', 'finding.status': 'Status',
    'finding.owner': 'Owner', 'finding.evidence': 'Evidence', 'finding.doNext': 'Do this next',
    'finding.assign': 'Assign and record',
    'finding.ownerPlaceholder': 'Who is responsible for closing this?',
    'finding.notePlaceholder': 'What was found, what was done',
    'finding.chain': 'Chain of custody', 'finding.returns': 'Returns',

    'inspect.inspecting': 'Inspecting…', 'inspect.unreachable': 'Could not reach the server.',
    'inspect.notFound': 'Not found',
    'inspect.notFoundHint': '{serial} does not appear in any dispatch record or return. Check for a typo, or note that the unit may predate this ledger.',
    'inspect.checkValid': 'check digit valid', 'inspect.checkInvalid': 'check digit invalid',
    'inspect.checkNA': 'check digit not applicable',
    'inspect.price': 'Observed price for this model:', 'inspect.range': 'range',
    'inspect.loggedReturns': 'logged returns', 'inspect.dispatchTrail': 'Dispatch trail',
    'inspect.wing': 'wing', 'inspect.related': '{n} other serials moved through the same dealer(s) as this one.',
    'inspect.prefixAnalysis': 'Prefix analysis',
    'inspect.prefixHint': 'Prefix {tac} appears against {n} models. A Type Allocation Code identifies one model, so this is a mapping problem or a mis-entry.',
    'inspect.openFindings': 'Open findings on this serial',

    'exposure.openExposure': 'Open exposure', 'exposure.openSub': 'valued at observed prices',
    'exposure.critical': 'Critical', 'exposure.criticalSub': '{v} at risk',
    'exposure.duplicateFindings': 'Duplicate findings', 'exposure.duplicateSub': 'serials in 2+ dealers',
    'exposure.pricedItems': 'Items with a price', 'exposure.pricedSub': 'rest are real but unpriced',
    'exposure.findings': 'Findings', 'exposure.findingsSub': '{n} still open',
    'exposure.uniqueSerials': 'Unique serials', 'exposure.uniqueSub': 'physical units tracked',
    'exposure.bySeverity': 'Exposure by severity', 'exposure.byDiagnosis': 'Findings by diagnosis',
    'exposure.topValue': 'Highest value findings', 'exposure.priceBook': 'Observed price book',

    'chains.noRepeated': 'No repeated flows detected.', 'chains.serials': '{n} serials',
    'dealers.noFound': 'No dealers found', 'dealers.noFoundHint': 'Try a shorter name or clear the search.',
    'dealers.units': '{n} units', 'dealers.serials': '{n} serials',
    'dealers.inTwo': '{n} in 2+ dealers', 'dealers.ofStock': '{n}% of their stock',
    'ownership.unassigned': 'Unassigned', 'ownership.unassignedSub': '{v} of open value',
    'ownership.people': 'People involved', 'ownership.totalFindings': 'Total findings',
    'ownership.openOf': 'open of {total}', 'ownership.resolved': '{n} resolved'
  });
  Object.assign(bn, {
    'common.unavailable': 'পাওয়া যায়নি',
    'nsp.liveSync': 'লাইভ সিঙ্ক', 'nsp.reconnecting': 'পুনরায় সংযোগ হচ্ছে…',
    'nsp.syncPaused': 'লাইভ সিঙ্ক বিরত', 'nsp.liveConnected': 'লাইভ সিঙ্ক সংযুক্ত',
    'nsp.clickReconnect': 'পুনরায় সংযোগ করতে ক্লিক করুন', 'nsp.reconnectingToast': 'লাইভ সিঙ্ক পুনরায় সংযোগ হচ্ছে…',
    'nsp.synced': 'সিঙ্ক হয়েছে · {n} রেকর্ড', 'nsp.marked': '{s} হিসেবে চিহ্নিত',
    'nsp.updateFailed': 'আপডেট ব্যর্থ', 'nsp.findingNotFound': 'ফাইন্ডিং পাওয়া যায়নি',
    'nsp.saved': 'সংরক্ষিত', 'nsp.saveFailed': 'সংরক্ষণ ব্যর্থ — {e}',
    'nsp.syncComplete': 'সিঙ্ক সম্পন্ন · {n} রেকর্ড', 'nsp.syncFailed': 'সিঙ্ক ব্যর্থ — {e}',

    'queue.unavailable': 'কাজের তালিকা', 'queue.unknownError': 'অজানা ত্রুটি',
    'queue.retry': 'আবার চেষ্টা করুন', 'queue.unpriced': 'মূল্যহীন', 'queue.score': 'স্কোর',
    'queue.unassigned': 'অর্পিত নয়', 'queue.daysApart': '{n} দিন পর',
    'queue.open': 'খোলা', 'queue.investigating': 'তদন্তাধীন',
    'queue.resolved': 'সমাধানকৃত', 'queue.dismissed': 'বাতিল', 'queue.total': 'মোট',
    'queue.openValue': 'খোলা মূল্য',
    'queue.noMatchTitle': 'এই ছাঁকনির সাথে কোনো ফাইন্ডিং মেলেনি',
    'queue.noMatchBody': 'আরও লেজার দেখতে একটি ছাঁকনি মুছুন বা মূল্য সীমা বাড়ান।',
    'queue.clearFilters': 'ছাঁকনি মুছুন',

    'finding.diagnosis': 'নির্ণয়', 'finding.noDiagnosis': 'এই ফাইন্ডিংয়ের কোনো নির্ণয় রেকর্ড নেই।',
    'finding.severity': 'তীব্রতা', 'finding.type': 'ধরন', 'finding.serial': 'সিরিয়াল',
    'finding.model': 'মডেল', 'finding.dealer': 'ডিলার', 'finding.dealers': 'ডিলার',
    'finding.gap': 'ব্যবধান', 'finding.daysBetween': 'ডিসপাচের মধ্যে {n} দিন',
    'finding.warehouse': 'ওয়ার্কশপ', 'finding.claimedBoth': 'দুই ওয়িং দাবি করেছে',
    'finding.checkDigit': 'চেক ডিজিট', 'finding.validNotClone': 'বৈধ — ক্লোন বা ক্ষতি নয়',
    'finding.invalid': 'অবৈধ', 'finding.valueRisk': 'ঝুঁকিতে থাকা মূল্য',
    'finding.notPriced': 'মূল্য নেই', 'finding.basis': 'ভিত্তি', 'finding.status': 'অবস্থা',
    'finding.owner': 'দায়িত্বকারী', 'finding.evidence': 'প্রমাণ', 'finding.doNext': 'পরবর্তীতে করণীয়',
    'finding.assign': 'দায়িত্ব বণ্টন ও রেকর্ড',
    'finding.ownerPlaceholder': 'এটি বন্ধ করার দায়িত্ব কার?',
    'finding.notePlaceholder': 'কী পাওয়া গেছে, কী করা হয়েছে',
    'finding.chain': 'দখলের শৃঙ্খল', 'finding.returns': 'রিটার্ন',

    'inspect.inspecting': 'পরিদর্শন হচ্ছে…', 'inspect.unreachable': 'সার্ভারে পৌঁছানো যায়নি।',
    'inspect.notFound': 'পাওয়া যায়নি',
    'inspect.notFoundHint': '{serial} কোনো ডিসপাচ রেকর্ড বা রিটার্নে নেই। টাইপো যাচাই করুন, অথবা ইউনিটটি এই লেজারের আগের হতে পারে।',
    'inspect.checkValid': 'চেক ডিজিট বৈধ', 'inspect.checkInvalid': 'চেক ডিজিট অবৈধ',
    'inspect.checkNA': 'চেক ডিজিট প্রযোজ্য নয়',
    'inspect.price': 'এই মডেলের পর্যবেক্ষিত মূল্য:', 'inspect.range': 'সীমা',
    'inspect.loggedReturns': 'লগ করা রিটার্ন', 'inspect.dispatchTrail': 'ডিসপাচ ট্রেইল',
    'inspect.wing': 'ওয়িং', 'inspect.related': '{n}টি অন্য সিরিয়াল একই ডিলারের মধ্য দিয়ে গেছে।',
    'inspect.prefixAnalysis': 'প্রিফিক্স বিশ্লেষণ',
    'inspect.prefixHint': '{tac} প্রিফিক্স {n}টি মডেলের সাথে দেখা যায়। Type Allocation Code একটি মডেলকেই চিহ্নিত করে, তাই এটি ম্যাপিং সমস্যা বা ভুল এন্ট্রি।',
    'inspect.openFindings': 'এই সিরিয়ালের খোলা ফাইন্ডিং',

    'exposure.openExposure': 'খোলা ঝুঁকি', 'exposure.openSub': 'পর্যবেক্ষিত দামে মূল্যায়িত',
    'exposure.critical': 'গুরুতর', 'exposure.criticalSub': '{v} ঝুঁকিতে',
    'exposure.duplicateFindings': 'ডুপ্লিকেট ফাইন্ডিং', 'exposure.duplicateSub': '২+ ডিলারে সিরিয়াল',
    'exposure.pricedItems': 'মূল্যসহ আইটেম', 'exposure.pricedSub': 'বাকি আসল কিন্তু মূল্যহীন',
    'exposure.findings': 'ফাইন্ডিং', 'exposure.findingsSub': '{n}টি এখনো খোলা',
    'exposure.uniqueSerials': 'স্বতন্ত্র সিরিয়াল', 'exposure.uniqueSub': 'ট্র্যাক করা ভৌত ইউনিট',
    'exposure.bySeverity': 'তীব্রতা অনুযায়ী ঝুঁকি', 'exposure.byDiagnosis': 'নির্ণয় অনুযায়ী ফাইন্ডিং',
    'exposure.topValue': 'সর্বোচ্চ মূল্যের ফাইন্ডিং', 'exposure.priceBook': 'পর্যবেক্ষিত মূল্য তালিকা',

    'chains.noRepeated': 'কোনো পুনরাবৃত্ত প্রবাহ পাওয়া যায়নি।', 'chains.serials': '{n}টি সিরিয়াল',
    'dealers.noFound': 'কোনো ডিলার পাওয়া যায়নি', 'dealers.noFoundHint': 'ছোট নাম চেষ্টা করুন বা অনুসন্ধান মুছুন।',
    'dealers.units': '{n} ইউনিট', 'dealers.serials': '{n} সিরিয়াল',
    'dealers.inTwo': '{n}টি ২+ ডিলারে', 'dealers.ofStock': 'তাদের স্টকের {n}%',
    'ownership.unassigned': 'অর্পিত নয়', 'ownership.unassignedSub': 'খোলা মূল্যের {v}',
    'ownership.people': 'জড়িত ব্যক্তি', 'ownership.totalFindings': 'মোট ফাইন্ডিং',
    'ownership.openOf': 'মোট {total} এর মধ্যে খোলা', 'ownership.resolved': '{n} সমাধানকৃত'
  });
  Object.assign(zh, {
    'common.unavailable': '不可用',
    'nsp.liveSync': '实时同步', 'nsp.reconnecting': '重新连接中…',
    'nsp.syncPaused': '实时同步已暂停', 'nsp.liveConnected': '实时同步已连接',
    'nsp.clickReconnect': '点击重新连接', 'nsp.reconnectingToast': '正在重新连接实时同步…',
    'nsp.synced': '已同步 · {n} 条记录', 'nsp.marked': '已标记为{s}',
    'nsp.updateFailed': '更新失败', 'nsp.findingNotFound': '未找到发现',
    'nsp.saved': '已保存', 'nsp.saveFailed': '保存失败 — {e}',
    'nsp.syncComplete': '同步完成 · {n} 条记录', 'nsp.syncFailed': '同步失败 — {e}',

    'queue.unavailable': '工作队列', 'queue.unknownError': '未知错误',
    'queue.retry': '重试', 'queue.unpriced': '未定价', 'queue.score': '评分',
    'queue.unassigned': '未分配', 'queue.daysApart': '相隔 {n} 天',
    'queue.open': '未结', 'queue.investigating': '调查中',
    'queue.resolved': '已解决', 'queue.dismissed': '已驳回', 'queue.total': '总计',
    'queue.openValue': '未结金额',
    'queue.noMatchTitle': '没有符合这些筛选条件的发现',
    'queue.noMatchBody': '清除某个筛选条件或扩大金额范围，以查看更多台账内容。',
    'queue.clearFilters': '清除筛选',

    'finding.diagnosis': '诊断', 'finding.noDiagnosis': '此发现未记录诊断。',
    'finding.severity': '严重程度', 'finding.type': '类型', 'finding.serial': '序列号',
    'finding.model': '型号', 'finding.dealer': '经销商', 'finding.dealers': '经销商数',
    'finding.gap': '间隔', 'finding.daysBetween': '两次发货相隔 {n} 天',
    'finding.warehouse': '仓库', 'finding.claimedBoth': '两个仓库均主张持有',
    'finding.checkDigit': '校验位', 'finding.validNotClone': '有效 — 不是克隆或损坏',
    'finding.invalid': '无效', 'finding.valueRisk': '风险金额',
    'finding.notPriced': '未定价', 'finding.basis': '依据', 'finding.status': '状态',
    'finding.owner': '负责人', 'finding.evidence': '证据', 'finding.doNext': '下一步操作',
    'finding.assign': '分配并记录',
    'finding.ownerPlaceholder': '谁负责关闭此项？',
    'finding.notePlaceholder': '发现了什么，做了什么',
    'finding.chain': '保管链', 'finding.returns': '退货',

    'inspect.inspecting': '检查中…', 'inspect.unreachable': '无法连接服务器。',
    'inspect.notFound': '未找到',
    'inspect.notFoundHint': '{serial} 未出现在任何发货记录或退货中。请检查是否输入错误，或该设备可能早于本台账。',
    'inspect.checkValid': '校验位有效', 'inspect.checkInvalid': '校验位无效',
    'inspect.checkNA': '校验位不适用',
    'inspect.price': '此型号的观测价格：', 'inspect.range': '区间',
    'inspect.loggedReturns': '条已记录退货', 'inspect.dispatchTrail': '发货轨迹',
    'inspect.wing': '仓库', 'inspect.related': '另有 {n} 个序列号经过相同经销商。',
    'inspect.prefixAnalysis': '前缀分析',
    'inspect.prefixHint': '前缀 {tac} 出现在 {n} 个型号上。Type Allocation Code 仅对应一个型号，因此这是映射问题或录入错误。',
    'inspect.openFindings': '此序列号上的未结发现',

    'exposure.openExposure': '未结风险敞口', 'exposure.openSub': '按观测价格估值',
    'exposure.critical': '严重', 'exposure.criticalSub': '{v} 处于风险中',
    'exposure.duplicateFindings': '重复发现', 'exposure.duplicateSub': '序列号涉及 2 家以上经销商',
    'exposure.pricedItems': '有价格的项目', 'exposure.pricedSub': '其余真实存在但未定价',
    'exposure.findings': '发现', 'exposure.findingsSub': '{n} 条仍未结',
    'exposure.uniqueSerials': '不重复序列号', 'exposure.uniqueSub': '追踪的实物单位',
    'exposure.bySeverity': '按严重程度的敞口', 'exposure.byDiagnosis': '按诊断分类的发现',
    'exposure.topValue': '金额最高的发现', 'exposure.priceBook': '观测价格表',

    'chains.noRepeated': '未检测到重复流向。', 'chains.serials': '{n} 个序列号',
    'dealers.noFound': '未找到经销商', 'dealers.noFoundHint': '尝试更短的名称或清除搜索。',
    'dealers.units': '{n} 台', 'dealers.serials': '{n} 个序列号',
    'dealers.inTwo': '{n} 个涉及 2 家以上经销商', 'dealers.ofStock': '占其库存的 {n}%',
    'ownership.unassigned': '未分配', 'ownership.unassignedSub': '未结金额的 {v}',
    'ownership.people': '涉及人员', 'ownership.totalFindings': '发现总数',
    'ownership.openOf': '共 {total} 条中未结', 'ownership.resolved': '{n} 条已解决'
  });
  const SOURCE = {
    bn: {
      'Serial recorded against two dealers': 'একটি সিরিয়াল দুই ডিলারের সাথে রেকর্ড',
      'Return with no serial — cannot be located': 'সিরিয়াল ছাড়া রিটার্ন — সনাক্ত করা যাচ্ছে না',
      'Returned a unit we never dispatched': 'এমন ইউনিট রিটার্ন হয়েছে যা আমরা কখনো ডিসপাচ করিনি',
      'Serial fails its check digit': 'সিরিয়ালের চেক ডিজিট ব্যর্থ',
      'Same-day duplicate entry': 'একই দিনের ডুপ্লিকেট এন্ট্রি',
      'Returned unit re-sold without closing the original line': 'মূল লাইন বন্ধ না করেই রিটার্ন করা ইউনিট পুনরায় বিক্রয়',
      'Slow return or late record entry': 'ধীর রিটার্ন বা দেরিতে রেকর্ড এন্ট্রি',
      'Historical backlog or unclosed old entry': 'পুরনো ব্যাকলগ বা অন্বচ্ছেদ পুরনো এন্ট্রি',
      'A unit was returned but no serial was recorded, so there is no way to prove which handset it was or whether it re-entered stock.': 'একটি ইউনিট রিটার্ন হয়েছে কিন্তু কোনো সিরিয়াল রেকর্ড করা হয়নি, তাই কোন হ্যান্ডসেটটি ছিল বা এটি আবার স্টকে গেল কি না তা প্রমাণ করার উপায় নেই।',
      'A handset came back that does not appear anywhere in the dispatch ledger. Either it shipped before this ledger period, from the other warehouse, or the serial on the paperwork is wrong.': 'একটি হ্যান্ডসেট ফিরে এেছে যা ডিসপাচ লেজারে কোথাও নেই। হয় এটি এই লেজার সময়ের আগে পাঠানো হয়েছে, অন্য ওয়ার্কশপ থেকে এসেছে, নয়তো কাগজের সিরিয়ালটি ভুল।',
      'The unit returned locked. Either a previous owner account is still attached (FRP), an operator network lock is active, or the mainboard was replaced and written with the wrong serial.': 'ইউনিটটি লক অবস্থায় ফিরেছে। হয় পূর্ববর্তী মালিকের অ্যাকাউন্ট এখনো সংযুক্ত (FRP), অথবা অপারেটর নেটওয়ার্ক লক সক্রিয়, নয়তো মেইনবোর্ড বদলে ভুল সিরিয়াল লেখা হয়েছে।',
      'The serial on the unit differs from the one on the paperwork, so it cannot be matched to an invoice and must not re-enter stock.': 'ইউনিটের সিরিয়াল কাগজের সিরিয়াল থেকে আলাদা, তাই এটি invoice-এর সাথে মেলানো যাবে না এবং স্টকে ফেরত দেওয়া উচিত নয়।',
      'The serial is not a valid IMEI. Either it was mistyped on entry, or it is a cloned serial from an unofficial device.': 'সিরিয়ালটি বৈধ IMEI নয়। হয় এন্ট্রির সময় টাইপো হয়েছে, নয়তো এটি কোনো অননুমোদিত ডিভাইসের ক্লোন সিরিয়াল।',
      'One Type Allocation Code — which identifies a single model — is recorded against several different models. Either the catalogue mapping is wrong or serials were entered against the wrong product.': 'একটি Type Allocation Code — যা একটি মডেল চিহ্নিত করে — একাধিক ভিন্ন মডেলের সাথে রেকর্ড করা হয়েছে। হয় ক্যাটালগ ম্যাপিং ভুল, নয়তো ভুল পণ্যের নিচে সিরিয়াল এন্ট্রি করা হয়েছে।',
      'Repeated flow. Check whether this is an agreed returns pipeline.': 'পুনরাবৃত্ত প্রবাহ। এটি চুক্তিভিত্তিক রিটার্ন প্রক্রিয়া কি না তা যাচাই করুন।',
      'The unit came back locked. Either a previous owner account is still attached (FRP), an operator network lock is active, or the mainboard was replaced and written with the wrong serial.': 'ইউনিটটি লক অবস্থায় ফিরেছে। হয় পূর্ববর্তী মালিকের অ্যাকাউন্ট এখনো সংযুক্ত (FRP), অথবা অপারেটর নেটওয়ার্ক লক সক্রিয়, নয়তো মেইনবোর্ড বদলে ভুল সিরিয়াল লেখা হয়েছে।',
      'The serial on the unit does not match the paperwork, so it cannot be matched to an invoice and must not re-enter stock.': 'ইউনিটের সিরিয়াল কাগজের সাথে মেলেনি, তাই invoice-এর সাথে মিলানো যাবে না এবং স্টকে ফেরত দেওয়া উচিত নয়।',
      'The check digit is valid, so this is not a corrupted or cloned serial. The cause is process, not data corruption.': 'চেক ডিজিট বৈধ, তাই এটি ক্ষতিগ্রস্ত বা ক্লোন সিরিয়াল নয়। কারণ প্রক্রিয়াগত, তথ্য ক্ষতি নয়।',
      'Fails the standard Luhn validation every IMEI must pass.': 'প্রতিটি IMEI-কে অবশ্যই পাস করতে হয় এমন আদর্শ Luhn যাচাই ব্যর্থ।',
      '15-digit IMEI passes its check digit': '১৫-অঙ্কের IMEI চেক ডিজিট পাস করেছে',
      '15-digit IMEI FAILS its check digit': '১৫-অঙ্কের IMEI চেক ডিজিট ব্যর্থ করেছে',
      'could not validate': 'যাচাই করা যায়নি',
      'Serial validity': 'সিরিয়ালের বৈধতা', 'Timing': 'সময়', 'Implication': 'অর্থ',
      'Breadth': 'ব্যাপ্তি', 'Warehouse': 'ওয়ার্কশপ', 'Ruling out cloning': 'ক্লোনিং বাতল',
      'Serial': 'সিরিয়াল', 'Value': 'মূল্য', 'Possible causes': 'সম্ভাব্য কারণ',
      'Logged reason': 'লগ করা কারণ', 'Consequence': 'পরিণতি',
      'Check for a pattern': 'প্যাটার্ন যাচাই করুন', 'Check digit': 'চেক ডিজিট',
      'Prefix': 'প্রিফিক্স', 'Models seen': 'দেখা যাওয়া মডেল', 'Dispatch trail': 'ডিসপাচ ট্রেইল',
      'The serial field is empty on the return record.': 'রিটার্ন রেকর্ডে সিরিয়াল ফিল্ড খালি আছে।',
      'The unit cannot be sold as new until the serial is resolved.': 'সিরিয়াল সমাধান না হওয়া পর্যন্ত ইউনিটটি নতুন হিসেবে বিক্রয় করা যাবে না।',
      'Counted alongside other IMEI issues on this model — if one model dominates it is a batch problem.': 'এই মডেলের অন্যান্য IMEI সমস্যার সাথে গণনা করা হয় — যদি একটি মডেল আধিপত্য করে তবে এটি ব্যাচ সমস্যা।',
      'Outside the ledger period, wrong warehouse, or a transcription error.': 'লেজার সময়ের বাইরে, ভুল ওয়ার্কশপ, বা ট্রান্সক্রিপশন ত্রুটি।',
      'Valid, so not a clone or corruption.': 'বৈধ, তাই ক্লোন বা ক্ষতি নয়।',
      'Not a 15-digit IMEI, so not applicable.': '১৫-অঙ্কের IMEI নয়, তাই প্রযোজ্য নয়।',
      'Cannot be sold as new until resolved.': 'সমাধান না হওয়া পর্যন্ত নতুন হিসেবে বিক্রয় করা যাবে না।',
      'Ask the dealer which unit was returned — model and colour usually narrow it to one or two.': 'ডিলারকে জিজ্ঞেস করুন কোন ইউনিট রিটার্ন হয়েছে — মডেল ও রঙ সাধারণত এক বা দুটিতে সীমিত করে।',
      'Search dispatch records for that model to shortlist candidate serials.': 'সম্ভাব্য সিরিয়ালের তালিকা করতে সেই মডেলের ডিসপাচ রেকর্ড খুঁজুন।',
      'Adopt a written rule: no serial, no return accepted.': 'লিখিত নীতি গ্রহণ করুন: সিরিয়াল না থাকলে রিটার্ন গ্রহণ করবেন না।',
      'Search the previous period and the other warehouse before treating this as a loss.': 'এটি ক্ষতি হিসেবে দেখার আগে আগের সময় ও অন্য ওয়ার্কশপ খুঁজুন।',
      'Confirm the serial against the physical unit — it may simply be mistyped.': 'বাস্তব ইউনিটের সাথে সিরিয়াল নিশ্চিত করুন — হয়তো শুধু টাইপো হয়েছে।',
      'If it cannot be placed, it is dead stock that will never sell.': 'যদি স্থান নির্ধারণ করা না যায়, এটি এমন মৃত স্টক যা কখনো বিক্রয় হবে না।',
      'Photograph the unit and the box label side by side.': 'ইউনিট ও বক্স লেবেল পাশাপাশি ছবি তুলুন।',
      'Segregate permanently as bad-bin. A mismatched serial must never re-enter sellable stock.': 'স্থায়ীভাবে ব্যাড-বিনে আলাদা করুন। মিল না থাকা সিরিয়াল কখনো বিক্রয়যোগ্য স্টকে ফেরত যাবে না।',
      'Raise a warranty claim with the supplier rather than writing the unit off.': 'ইউনিটটি বাতিল করার বদলে সরবরাহকারীর কাছে ওয়ারেন্টি দাবি করুন।',
      'Compare against the box label and correct the record if mistyped.': 'বক্স লেবেলের সাথে তুলনা করুন এবং টাইপো হলে রেকর্ড সংশোধন করুন।',
      'If it matches the box, the unit is a clone — do not sell it and report the supplier.': 'বক্সের সাথে মিললে ইউনিটটি ক্লোন — বিক্রয় করবেন না এবং সরবরাহকারীকে জানান।',
      'Confirm the model held by each dealer against the physical unit.': 'প্রতি ডিলারের কাছে থাকা মডেল বাস্তব ইউনিটের সাথে নিশ্চিত করুন।',
      'Correct the SKU mapping so future dispatches land in the right family.': 'SKU ম্যাপিং সংশোধন করুন যাতে ভবিষ্যতের ডিসপাচ সঠিক মডেলে যায়।',
      'Open the two dispatch invoices and compare line by line — one is almost certainly a duplicate.': 'দুটি ডিসপাচ invoice খুলে লাইন ধরে তুলনা করুন — একটি প্রায় নিশ্চিত ডুপ্লিকেট।',
      'Cancel the newer line. Do not delete the original.': 'নতুন লাইন বাতিল করুন। মূল লাইন মুছবেন না।',
      'Check who raised the second entry; the same batch may be duplicated elsewhere.': 'দ্বিতীয় এন্ট্রি কে করেছে যাচাই করুন; একই ব্যাচ অন্যত্র ডুপ্লিকেট হতে পারে।',
      'Ask the first dealer for written confirmation of the return and its date.': 'প্রথম ডিলারের কাছ থেকে রিটার্ন ও  তারিখের লিখিত নিশ্চিতকরণ নিন।',
      'Confirm no payment was ever collected against the first dispatch.': 'প্রথম ডিসপাচের বিপরীতে কোনো অর্থ সংগৃহীত হয়নি তা নিশ্চিত করুন।',
      'Cancel the first line with a Returned status. Never edit the invoice — that is how the serial stays live.': 'প্রথম লাইন Returned অবস্থায় বাতিল করুন। invoice কখনো সম্পাদনা করবেন না — এতেই সিরিয়ালটি সক্রিয় থাকে।',
      'If the first dealer still holds the unit, recall it from the second dealer immediately.': 'প্রথম ডিলারের কাছে ইউনিট থাকলে অবিলম্বে দ্বিতীয় ডিলারের কাছ থেকে ফেরত আনুন।',
      'Establish which of the two dates is wrong before acting.': 'ব্যবস্থা নেওয়ার আগে দুটি তারিখের কোনটি ভুল তা নির্ধারণ করুন।',
      'Check the warehouse issue register for a transfer between the two dates.': 'দুই তারিখের মধ্যে স্থানান্তরের জন্য ওয়ার্কশপ ইস্যু রেজিস্টার দেখুন।',
      'Treat as a stock transfer if both dealers can produce a handover receipt.': 'দুই ডিলার হ্যান্ডওভার রিসিট দেখালে স্টক স্থানান্তর হিসেবে দেখুন।',
      'Check whether the earlier record belongs to a previous system or period.': 'আগের রেকর্ডটি পূর্ববর্তী সিস্টেম বা সময়ের কি না যাচাই করুন।',
      'If the unit genuinely moved, back-date the closure rather than editing history.': 'ইউনিট সত্যিই সরলে ইতিহাস সম্পাদনা না করে বন্ধের তারিখ পেছানো হিসেবে দিন।',
      'Highest priority: physically verify which single shop holds this unit. The other records are wrong.': 'সর্বোচ্চ অগ্রাধিকার: কোন দোকানে এই ইউনিট আছে শারীরিকভাবে যাচাই করুন। অন্য রেকর্ডগুলো ভুল।',
      'Reconcile the two warehouse issue registers for this serial.': 'এই সিরিয়ালের জন্য দুই ওয়ার্কশপ ইস্যু রেজিস্টার মিলান।',
      'Dial *#06# on the unit and compare with the box and the invoice — all three must match.': 'ইউনিটে *#06# ডায়াল করুন এবং বক্স ও invoice-এর সাথে তুলনা করুন — তিনটির মিল আবশ্যক।',
      'If it asks for a previous account, only the original owner can release it. Do not attempt a repair.': 'পূর্ববর্তী অ্যাকাউন্ট চাইলে শুধু মূল মালিকই মুক্ত করতে পারেন। মেরামতের চেষ্টা করবেন না।',
      'Group by model: if one model dominates, raise a batch claim with the supplier.': 'মডেল অনুযায়ী গ্রুপ করুন: একটি মডেল আধিপত্য করলে সরবরাহকারীর কাছে ব্যাচ দাবি করুন।',
      'Segregate permanently as bad-bin.': 'স্থায়ীভাবে ব্যাড-বিনে আলাদা করুন।',
      'Raise a warranty claim rather than writing the unit off.': 'ইউনিট বাতিল না করে ওয়ারেন্টি দাবি করুন।',
      'Raise a warranty claim with the supplier against this serial.': 'এই সিরিয়ালের জন্য সরবরাহকারীর কাছে ওয়ারেন্টি দাবি করুন।',
      'Check whether other units from the same batch show the same fault.': 'একই ব্যাচের অন্য ইউনিটে একই ত্রুটি আছে কি না দেখুন।'
    },
    zh: {
      'Serial recorded against two dealers': '一个序列号记录在两家经销商名下',
      'Return with no serial — cannot be located': '退货无序列号 — 无法定位',
      'Returned a unit we never dispatched': '退回了一台我们从未发货的设备',
      'Serial fails its check digit': '序列号校验位不通过',
      'Same-day duplicate entry': '同日重复录入',
      'Returned unit re-sold without closing the original line': '退货设备未关闭原记录即再次销售',
      'Slow return or late record entry': '退货缓慢或记录录入滞后',
      'Historical backlog or unclosed old entry': '历史积压或未关闭的旧记录',
      'A unit was returned but no serial was recorded, so there is no way to prove which handset it was or whether it re-entered stock.': '设备已退回但未记录序列号，因此无法证明是哪台设备，也无法确认它是否重新进入库存。',
      'A handset came back that does not appear anywhere in the dispatch ledger. Either it shipped before this ledger period, from the other warehouse, or the serial on the paperwork is wrong.': '退回的设备在发货台账中完全没有记录。它可能在本台账期之前发货、来自另一仓库，或单据上的序列号有误。',
      'The unit returned locked. Either a previous owner account is still attached (FRP), an operator network lock is active, or the mainboard was replaced and written with the wrong serial.': '设备锁定退回。可能是原机主账户仍未解绑（FRP）、运营商网络锁仍生效，或主板被更换后写入了错误序列号。',
      'The serial on the unit differs from the one on the paperwork, so it cannot be matched to an invoice and must not re-enter stock.': '机身序列号与单据不一致，因此无法与发票匹配，不得重新进入库存。',
      'The serial is not a valid IMEI. Either it was mistyped on entry, or it is a cloned serial from an unofficial device.': '该序列号不是有效 IMEI。可能录入时打错，也可能来自非正规设备的克隆序列号。',
      'One Type Allocation Code — which identifies a single model — is recorded against several different models. Either the catalogue mapping is wrong or serials were entered against the wrong product.': '一个 Type Allocation Code（仅对应一个型号）被记录在多个不同型号上。可能是目录映射错误，或序列号被录入到错误产品下。',
      'Repeated flow. Check whether this is an agreed returns pipeline.': '反复出现的流向。请核查这是否为约定的退货流程。',
      'The serial on the unit does not match the paperwork, so it cannot be matched to an invoice and must not re-enter stock.': '机身序列号与单据不一致，因此无法与发票匹配，不得重新进入库存。',
      'The check digit is valid, so this is not a corrupted or cloned serial. The cause is process, not data corruption.': '校验位有效，因此不是损坏或克隆序列号。原因在于流程，而非数据损坏。',
      'Fails the standard Luhn validation every IMEI must pass.': '未通过每个 IMEI 都必须满足的标准 Luhn 校验。',
      '15-digit IMEI passes its check digit': '15 位 IMEI 校验位通过',
      '15-digit IMEI FAILS its check digit': '15 位 IMEI 校验位未通过',
      'could not validate': '无法校验',
      'Serial validity': '序列号有效性', 'Timing': '时间', 'Implication': '影响',
      'Breadth': '范围', 'Warehouse': '仓库', 'Ruling out cloning': '排除克隆',
      'Serial': '序列号', 'Value': '金额', 'Possible causes': '可能原因',
      'Logged reason': '登记原因', 'Consequence': '后果',
      'Check for a pattern': '检查是否存在规律', 'Check digit': '校验位',
      'Prefix': '前缀', 'Models seen': '出现的型号', 'Dispatch trail': '发货轨迹',
      'The serial field is empty on the return record.': '退货记录中的序列号字段为空。',
      'The unit cannot be sold as new until the serial is resolved.': '序列号问题解决前，该设备不得作为新机销售。',
      'Counted alongside other IMEI issues on this model — if one model dominates it is a batch problem.': '已与该型号的其他 IMEI 问题合并统计 — 若某一型号占多数，则属于批次问题。',
      'Outside the ledger period, wrong warehouse, or a transcription error.': '超出台账期间、仓库错误或抄录错误。',
      'Valid, so not a clone or corruption.': '有效，因此不是克隆或损坏。',
      'Not a 15-digit IMEI, so not applicable.': '不是 15 位 IMEI，因此不适用。',
      'Cannot be sold as new until resolved.': '解决前不得作为新机销售。',
      'Ask the dealer which unit was returned — model and colour usually narrow it to one or two.': '询问经销商退回的是哪台设备 — 型号和颜色通常可缩小到一两台。',
      'Search dispatch records for that model to shortlist candidate serials.': '搜索该型号的发货记录以筛选候选序列号。',
      'Adopt a written rule: no serial, no return accepted.': '制定书面规则：无序列号，不予退货。',
      'Search the previous period and the other warehouse before treating this as a loss.': '在将其视为损失前，请检查上一期间和另一仓库。',
      'Confirm the serial against the physical unit — it may simply be mistyped.': '对照实物确认序列号 — 可能只是录入错误。',
      'If it cannot be placed, it is dead stock that will never sell.': '如果无法确定位置，它就是永远无法售出的呆滞库存。',
      'Photograph the unit and the box label side by side.': '将设备与包装标签并排拍照。',
      'Segregate permanently as bad-bin. A mismatched serial must never re-enter sellable stock.': '永久隔离至不良品仓。序列号不匹配的设备绝不得重新进入可销售库存。',
      'Raise a warranty claim with the supplier rather than writing the unit off.': '向供应商提出保修索赔，而不是直接报废该设备。',
      'Compare against the box label and correct the record if mistyped.': '与包装标签核对，如录入错误请更正记录。',
      'If it matches the box, the unit is a clone — do not sell it and report the supplier.': '若与包装一致，则该设备为克隆机 — 不得销售并上报供应商。',
      'Confirm the model held by each dealer against the physical unit.': '对照实物确认各经销商持有的型号。',
      'Correct the SKU mapping so future dispatches land in the right family.': '更正 SKU 映射，使后续发货归入正确型号。',
      'Open the two dispatch invoices and compare line by line — one is almost certainly a duplicate.': '打开两张发货发票逐行比对 — 其中一张几乎可以确定是重复的。',
      'Cancel the newer line. Do not delete the original.': '取消较新的那一行。不要删除原始记录。',
      'Check who raised the second entry; the same batch may be duplicated elsewhere.': '核查是谁录入了第二条；同一批次可能在别处也被重复。',
      'Ask the first dealer for written confirmation of the return and its date.': '向第一家经销商索取退货及其日期的书面确认。',
      'Confirm no payment was ever collected against the first dispatch.': '确认第一笔发货从未收取过款项。',
      'Cancel the first line with a Returned status. Never edit the invoice — that is how the serial stays live.': '以“已退货”状态取消第一行。切勿修改发票 — 那正是序列号保持有效的原因。',
      'If the first dealer still holds the unit, recall it from the second dealer immediately.': '若第一家经销商仍持有该设备，请立即从第二家经销商处召回。',
      'Establish which of the two dates is wrong before acting.': '处理前先确定两个日期中哪一个是错误的。',
      'Check the warehouse issue register for a transfer between the two dates.': '查看仓库出库登记，确认两个日期之间是否有调拨。',
      'Treat as a stock transfer if both dealers can produce a handover receipt.': '若两家经销商都能提供交接凭证，则按库存调拨处理。',
      'Check whether the earlier record belongs to a previous system or period.': '检查较早的记录是否属于旧系统或旧期间。',
      'If the unit genuinely moved, back-date the closure rather than editing history.': '若设备确实发生了流转，请回填关闭日期，而不是修改历史。',
      'Highest priority: physically verify which single shop holds this unit. The other records are wrong.': '最高优先级：实物核实究竟哪家门店持有此设备。其他记录均为错误。',
      'Reconcile the two warehouse issue registers for this serial.': '对此序列号核对两本仓库出库登记。',
      'Dial *#06# on the unit and compare with the box and the invoice — all three must match.': '在设备上拨打 *#06#，并与包装和发票比对 — 三者必须一致。',
      'If it asks for a previous account, only the original owner can release it. Do not attempt a repair.': '若要求输入原账户，只有原机主才能解除。请勿尝试维修。',
      'Group by model: if one model dominates, raise a batch claim with the supplier.': '按型号分组：若某一型号占多数，请向供应商提出批次索赔。',
      'Segregate permanently as bad-bin.': '永久隔离至不良品仓。',
      'Raise a warranty claim rather than writing the unit off.': '提出保修索赔，而不是报废设备。',
      'Raise a warranty claim with the supplier against this serial.': '就此序列号向供应商提出保修索赔。',
      'Check whether other units from the same batch show the same fault.': '检查同批次其他设备是否出现相同故障。'
    }
  };
  const PATTERNS = {
    bn: [
      [/^Serial recorded across (\d+) dealers$/, m => 'একটি সিরিয়াল ' + number(+m[1]) + ' ডিলার জুড়ে রেকর্ড'],
      [/^IMEI locked: (.+)$/, m => 'IMEI লক: ' + m[1]],
      [/^IMEI does not match invoice: (.+)$/, m => 'IMEI invoice-এর সাথে মেলে না: ' + m[1]],
      [/^Serial prefix (\S+) recorded against (\d+) models$/, m => 'সিরিয়াল প্রিফিক্স ' + m[1] + ' ' + number(+m[2]) + 'টি মডেলে রেকর্ড'],
      [/^(\d+) day\(s\) between dispatches — consistent with a genuine return followed by a re-sale\.$/, m => 'ডিসপাচের মধ্যে ' + number(+m[1]) + ' দিন — সত্যিকারের রিটার্নের পর বিক্রয়ের সাথে মিলে।'],
      [/^(\d+) days apart — long enough for a return, but also long enough for a late entry or a stock transfer\.$/, m => number(+m[1]) + ' দিনের ব্যবধান — রিটার্নের জন্য যথেষ্ট, তবে দেরি এন্ট্রি বা স্টক স্থানান্তরের জন্যও যথেষ্ট।'],
      [/^(\d+) days apart — far too long to be a live return\.$/, m => number(+m[1]) + ' দিনের ব্যবধান — সক্রিয় রিটার্ন হওয়ার পক্ষে অনেক বেশি।'],
      [/^Held by (\d+) dealers at once: (.+)\.$/, m => 'একসাথে ' + number(+m[1]) + ' ডিলারের কাছে ছিল: ' + m[2] + '।'],
      [/^Claimed by both (.+) warehouses — both issue registers hold it\.$/, m => m[1] + ' দুই ওয়ার্কশপ দাবি করেছে — উভয় ইস্যু রেজিস্টারে আছে।'],
      [/^Systematic flow between these two dealers\. Treat as one issue, not (\d+) separate ones\.$/, m => 'এই দুই ডিলারের মধ্যে ক্রমাগত প্রবাহ। ' + number(+m[1]) + 'টি আলাদা সমস্যা নয়, একটি হিসেবে দেখুন।'],
      [/^Tk ([\d,]+) of stock cannot be traced\.$/, m => money(+m[1].replace(/,/g, '')) + ' স্টক ট্রেস করা যায়নি।'],
      [/^(.+) — not found in any dispatch record\.$/, m => m[1] + ' — কোনো ডিসপাচ রেকর্ডে পাওয়া যায়নি।'],
      [/^Only (\d+) dispatch record — the serial is not duplicated\.$/, m => 'মাত্র ' + number(+m[1]) + 'টি ডিসপাচ রেকর্ড — সিরিয়ালটি ডুপ্লিকেট নয়।'],
      [/^The unit came back with "(.+)"\. It is not a duplicate serial, so this is a product fault rather than a custody problem\.$/, m => 'ইউনিটটি "' + m[1] + '" কারণে ফিরেছে। এটি ডুপ্লিকেট সিরিয়াল নয়, তাই দখলের সমস্যার বদলে পণ্যের ত্রুটি।'],
      [/^(\d+) days between dispatches$/, m => 'ডিসপাচের মধ্যে ' + number(+m[1]) + ' দিন'],
      [/^(\S+) — check digit not applicable to this serial format$/, m => m[1] + ' — এই সিরিয়াল ফরম্যাটে চেক ডিজিট প্রযোজ্য নয়'],
      [/^(\d+) stops$/, m => number(+m[1]) + ' ধাপ'],
      [/^(\d+) dispatch · (\d+) return$/, m => number(+m[1]) + ' ডিসপাচ · ' + number(+m[2]) + ' রিটার্ন']
    ],
    zh: [
      [/^Serial recorded across (\d+) dealers$/, m => '一个序列号记录在 ' + number(+m[1]) + ' 家经销商名下'],
      [/^IMEI locked: (.+)$/, m => 'IMEI 锁定：' + m[1]],
      [/^IMEI does not match invoice: (.+)$/, m => 'IMEI 与发票不匹配：' + m[1]],
      [/^Serial prefix (\S+) recorded against (\d+) models$/, m => '序列号前缀 ' + m[1] + ' 记录在 ' + number(+m[2]) + ' 个型号上'],
      [/^(\d+) day\(s\) between dispatches — consistent with a genuine return followed by a re-sale\.$/, m => '两次发货相隔 ' + number(+m[1]) + ' 天 — 与真实退货后再次销售相符。'],
      [/^(\d+) days apart — long enough for a return, but also long enough for a late entry or a stock transfer\.$/, m => '相隔 ' + number(+m[1]) + ' 天 — 足够完成退货，也足够发生滞后录入或库存调拨。'],
      [/^(\d+) days apart — far too long to be a live return\.$/, m => '相隔 ' + number(+m[1]) + ' 天 — 作为实时退货时间过长。'],
      [/^Held by (\d+) dealers at once: (.+)\.$/, m => '曾同时由 ' + number(+m[1]) + ' 家经销商持有：' + m[2] + '。'],
      [/^Claimed by both (.+) warehouses — both issue registers hold it\.$/, m => m[1] + ' 两个仓库均主张持有 — 两本出库登记都有记录。'],
      [/^Systematic flow between these two dealers\. Treat as one issue, not (\d+) separate ones\.$/, m => '这两家经销商之间存在系统性流向。应作为一项问题处理，而非 ' + number(+m[1]) + ' 项独立问题。'],
      [/^Tk ([\d,]+) of stock cannot be traced\.$/, m => money(+m[1].replace(/,/g, '')) + ' 的库存无法追溯。'],
      [/^(.+) — not found in any dispatch record\.$/, m => m[1] + ' — 未在任何发货记录中找到。'],
      [/^Only (\d+) dispatch record — the serial is not duplicated\.$/, m => '仅有 ' + number(+m[1]) + ' 条发货记录 — 序列号未重复。'],
      [/^The unit came back with "(.+)"\. It is not a duplicate serial, so this is a product fault rather than a custody problem\.$/, m => '设备因“' + m[1] + '”退回。它不是重复序列号，因此属于产品故障而非保管问题。'],
      [/^(\d+) days between dispatches$/, m => '两次发货相隔 ' + number(+m[1]) + ' 天'],
      [/^(\S+) — check digit not applicable to this serial format$/, m => m[1] + ' — 此序列号格式不适用校验位'],
      [/^(\d+) stops$/, m => number(+m[1]) + ' 站'],
      [/^(\d+) dispatch · (\d+) return$/, m => number(+m[1]) + ' 发货 · ' + number(+m[2]) + ' 退货']
    ]
  };

  function detect() {
    let found = '';
    try {
      const q = new URLSearchParams(location.search).get('lang');
      if (q) found = q;
      if (!found) found = localStorage.getItem(STORAGE_KEY) || '';
    } catch (e) {}
    found = String(found).toLowerCase();
    if (found.indexOf('bn') === 0) return 'bn';
    if (found.indexOf('zh') === 0) return 'zh';
    if (found.indexOf('en') === 0) return 'en';
    return 'en';
  }

  let locale = detect();

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  }

  function t(key, vars, fallback) {
    let s = (DICT[locale] && DICT[locale][key]);
    if (s == null) s = en[key];
    if (s == null) s = fallback == null ? key : fallback;
    if (vars) {
      Object.keys(vars).forEach(k => { s = s.split('{' + k + '}').join(String(vars[k])); });
    }
    return s;
  }

  function tHtml(key, vars) {
    let s = t(key);
    if (vars) {
      Object.keys(vars).forEach(k => { s = s.split('{' + k + '}').join(esc(vars[k])); });
    }
    return s;
  }

  function number(n) {
    if (!Number.isFinite(Number(n))) return String(n == null ? '' : n);
    try { return new Intl.NumberFormat(INTL[locale]).format(Number(n)); }
    catch (e) { return String(n); }
  }

  function money(n) {
    const v = Math.round(Number(n) || 0);
    return MONEY[locale] + number(v);
  }

  function compact(n) {
    let v = Number(n) || 0;
    const u = COMPACT[locale];
    const f = (x, d) => {
      try { return new Intl.NumberFormat(INTL[locale], { maximumFractionDigits:d }).format(x); }
      catch (e) { return x.toFixed(d); }
    };
    if (v >= 10000000) return MONEY[locale] + f(v / 10000000, 2) + u.crore;
    if (v >= 100000)   return MONEY[locale] + f(v / 100000, 2) + u.lakh;
    if (v >= 1000)     return MONEY[locale] + f(v / 1000, 0) + u.thousand;
    return money(v);
  }

  function date(value) {
    if (!value) return '—';
    const s = String(value);
    if (!/^\d{4}-\d{2}-\d{2}/.test(s)) return s;
    try {
      return new Intl.DateTimeFormat(INTL[locale], {
        day:'2-digit', month:'short', year:'numeric', timeZone:'UTC'
      }).format(new Date(s.slice(0, 10) + 'T00:00:00Z'));
    } catch (e) { return s.slice(0, 10); }
  }

  function tx(value) {
    const s = String(value == null ? '' : value);
    if (locale === 'en') return s;
    const exact = SOURCE[locale] && SOURCE[locale][s];
    if (exact != null) return exact;
    const list = PATTERNS[locale] || [];
    for (let i = 0; i < list.length; i++) {
      const m = s.match(list[i][0]);
      if (m) return list[i][1](m);
    }
    return s;
  }

  function camel(key) {
    return String(key || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ')
      .trim().replace(/(^|\s)([a-z0-9])/g, (_, a, b) => a + b.toUpperCase());
  }
  const status  = v => t('status.' + v, {}, v);
  const severity = v => t('severity.' + v, {}, v);
  const confidence = v => t('confidence.' + v, {}, v);
  const kind = v => t('kind.' + v, {}, v);
  const optionKind = v => t('option.kind.' + v, {}, v);
  const state = v => t('state.' + camel(v), {}, v);

  function apply(root) {
    root = root || document;
    document.documentElement.lang = locale;
    document.documentElement.dir = 'ltr';
    const set = (attr, fn) => {
      Array.from(root.querySelectorAll('[' + attr + ']')).forEach(el => {
        const key = el.getAttribute(attr);
        if (key) fn(el, key);
      });
    };
    set('data-i18n', (el, k) => { el.textContent = t(k); });
    set('data-i18n-html', (el, k) => { el.innerHTML = tHtml(k); });
    set('data-i18n-aria', (el, k) => { el.setAttribute('aria-label', t(k)); });
    set('data-i18n-title', (el, k) => { el.title = t(k); });
    set('data-i18n-tip', (el, k) => { el.setAttribute('data-tip', t(k)); });
    set('data-i18n-content', (el, k) => { el.setAttribute('content', t(k)); });
    set('data-i18n-placeholder', (el, k) => { el.placeholder = t(k); });
    const sel = document.getElementById('locale-select');
    if (sel) {
      sel.value = locale;
      if (!sel._i18nBound) {
        sel._i18nBound = true;
        sel.addEventListener('change', () => setLocale(sel.value));
      }
    }
  }

  function normalize(value) {
    const s = String(value == null ? '' : value).toLowerCase();
    if (s.indexOf('bn') === 0) return 'bn';
    if (s.indexOf('zh') === 0) return 'zh';
    if (s.indexOf('en') === 0) return 'en';
    return '';
  }

  let channel = null;
  try {
    if (typeof BroadcastChannel === 'function') channel = new BroadcastChannel(CHANNEL);
  } catch (e) {}

  // One language choice drives the shell, NSpector, and the full Control Center.
  // Proper nouns and record identifiers are never touched: only UI strings change.
  function broadcastLocale(next) {
    const payload = { type: 'suite:locale', source: SOURCE_ID, locale: next };
    try { if (channel) channel.postMessage(payload); } catch (e) {}
    try {
      if (global.amayaShellLocale && global.amayaShellLocale.set) global.amayaShellLocale.set(next);
    } catch (e) {}
  }

  function receiveLocale(value) {
    const next = normalize(value);
    if (!next || next === locale) return;
    setLocale(next, { broadcast: false });
  }

  try {
    if (channel) channel.onmessage = e => {
      const data = e && e.data;
      if (data && data.source !== SOURCE_ID) receiveLocale(data.locale);
    };
  } catch (e) {}
  try {
    window.addEventListener('message', e => {
      if (!e || e.origin !== location.origin) return;
      const data = e.data;
      if (data && data.type === 'suite:locale' && data.source !== SOURCE_ID) receiveLocale(data.locale);
    });
  } catch (e) {}
  try {
    window.addEventListener('storage', e => {
      if (e && e.key === STORAGE_KEY) receiveLocale(e.newValue);
    });
  } catch (e) {}
  try {
    if (global.amayaShellLocale && global.amayaShellLocale.onChange) {
      global.amayaShellLocale.onChange(receiveLocale);
    }
  } catch (e) {}

  function setLocale(next, opts) {
    next = normalize(next);
    if (!DICT[next]) return;
    opts = opts || {};
    locale = next;
    try { localStorage.setItem(STORAGE_KEY, next); } catch (e) {}
    apply(document);
    try {
      window.dispatchEvent(new CustomEvent('suite:localechange', { detail: { locale: next } }));
    } catch (e) {
      window.dispatchEvent(new Event('suite:localechange'));
    }
    if (opts.broadcast !== false) broadcastLocale(next);
  }

  const DICT = { en, bn, zh };
  const api = {
    get locale() { return locale; },
    locales: [{ code:'en', label:'English' }, { code:'bn', label:'বাংলা' }, { code:'zh', label:'简体中文' }],
    t, tHtml, tx, number, money, compact, date, apply, setLocale,
    status, severity, confidence, kind, optionKind, state, esc
  };

  global.SuiteI18n = api;
  apply(document);
})(window);











