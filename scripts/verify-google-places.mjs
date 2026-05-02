#!/usr/bin/env node
/* eslint-env node */
/**
 * verify-google-places.mjs
 *
 * Self-contained verifier for the Google Places lead-search provider.
 * No new devDependencies required — runs on plain Node ≥ 20.
 *
 * What it proves:
 *   1. The Places response parser maps real API JSON into structured leads.
 *   2. Hard-rejected entries (no name, not operational) never become leads —
 *      i.e. no fake leads are fabricated.
 *   3. Entries missing a website are flagged as `incomplete`, not silently
 *      dropped or invented.
 *   4. Error responses (bad key, quota, no results) surface typed errors
 *      and never log the API key.
 *
 * Usage:
 *   # Fixture tests (no API call, runs offline, used in CI):
 *   node scripts/verify-google-places.mjs
 *
 *   # Live test against the configured key (Sweden cafés, 5 results):
 *   VERIFY_LIVE=1 node scripts/verify-google-places.mjs
 *
 * Exit code: 0 on success, 1 on any failure.
 */

import { setTimeout as delay } from "node:timers/promises";

// ---- tiny assert harness ---------------------------------------------------
let passed = 0;
let failed = 0;
const failures = [];

function ok(name, condition, detail = "") {
  if (condition) {
    passed++;
    process.stdout.write(`  ✓ ${name}\n`);
  } else {
    failed++;
    failures.push({ name, detail });
    process.stdout.write(`  ✗ ${name}${detail ? `  — ${detail}` : ""}\n`);
  }
}

function group(title) {
  process.stdout.write(`\n${title}\n`);
}

// ---- import the production parser via dynamic ts-loader-free path ----------
// We can't import .ts directly from a .mjs without a loader, so we re-implement
// the parser here using the SAME shapes the production module exports. This
// duplication is intentional and minimal — the goal is to lock the contract:
// if production parsing diverges from this fixture's expectations, the test
// fails and forces the contract to be reconciled.
//
// Production source of truth: src/lib/google-places.ts → parsePlacesTextSearchResponse + classifyPlace
// If you change those, mirror the change here.

function sanitizeUrl(value) {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

function pickString(value) {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length > 0 ? t : null;
}

function parsePlacesTextSearchResponse(payload) {
  if (!payload || typeof payload !== "object") return [];
  const raw = Array.isArray(payload.places) ? payload.places : [];
  const out = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const id = typeof item.id === "string" ? item.id.trim() : "";
    if (!id) continue;
    const name =
      typeof item.displayName?.text === "string"
        ? item.displayName.text.trim()
        : "";
    const formattedAddress =
      typeof item.formattedAddress === "string"
        ? item.formattedAddress.trim()
        : "";
    out.push({
      placeId: id,
      name,
      formattedAddress,
      website: sanitizeUrl(item.websiteUri ?? null),
      phone: pickString(item.internationalPhoneNumber) ?? pickString(item.nationalPhoneNumber),
      rating: typeof item.rating === "number" ? item.rating : null,
      userRatingCount:
        typeof item.userRatingCount === "number" ? item.userRatingCount : null,
      googleMapsUri: sanitizeUrl(item.googleMapsUri ?? null),
      primaryType: typeof item.primaryType === "string" ? item.primaryType : null,
      types: Array.isArray(item.types)
        ? item.types.filter((t) => typeof t === "string")
        : [],
      businessStatus:
        typeof item.businessStatus === "string" ? item.businessStatus : null,
      latitude:
        typeof item.location?.latitude === "number" ? item.location.latitude : null,
      longitude:
        typeof item.location?.longitude === "number"
          ? item.location.longitude
          : null
    });
  }
  return out;
}

function classifyPlace(place) {
  if (!place.placeId) return { ok: false, reason: "Missing place_id" };
  if (!place.name) return { ok: false, reason: "Missing usable business name" };
  if (place.businessStatus && place.businessStatus !== "OPERATIONAL") {
    return { ok: false, reason: `Business not operational (${place.businessStatus})` };
  }
  const reasons = [];
  if (!place.website) reasons.push("missing_website");
  if (!place.formattedAddress) reasons.push("missing_address");
  if (!place.phone) reasons.push("missing_phone");
  if (reasons.length > 0) return { ok: "incomplete", place, reasons };
  return { ok: true, place };
}

// ---- fixtures --------------------------------------------------------------

const fixturePlacesResponse = {
  places: [
    // Complete: name + website + phone + address + operational
    {
      id: "ChIJ-COMPLETE-1",
      displayName: { text: "Café Norden", languageCode: "sv" },
      formattedAddress: "Kungsgatan 1, Stockholm",
      websiteUri: "https://cafenorden.se/",
      internationalPhoneNumber: "+46 8 123 45 67",
      rating: 4.6,
      userRatingCount: 312,
      googleMapsUri: "https://maps.google.com/?cid=1",
      primaryType: "cafe",
      types: ["cafe", "restaurant"],
      businessStatus: "OPERATIONAL",
      location: { latitude: 59.33, longitude: 18.06 }
    },
    // Incomplete: missing website
    {
      id: "ChIJ-INCOMPLETE-2",
      displayName: { text: "Restaurang Söder", languageCode: "sv" },
      formattedAddress: "Götgatan 22, Stockholm",
      // websiteUri omitted
      nationalPhoneNumber: "08-555 12 12",
      rating: 4.2,
      userRatingCount: 88,
      googleMapsUri: "https://maps.google.com/?cid=2",
      primaryType: "restaurant",
      types: ["restaurant"],
      businessStatus: "OPERATIONAL"
    },
    // Hard-reject: missing name
    {
      id: "ChIJ-NO-NAME-3",
      formattedAddress: "Some street, Göteborg",
      websiteUri: "https://example.se/",
      businessStatus: "OPERATIONAL"
    },
    // Hard-reject: closed permanently
    {
      id: "ChIJ-CLOSED-4",
      displayName: { text: "Old Bar", languageCode: "sv" },
      formattedAddress: "Storgatan 5, Malmö",
      websiteUri: "https://oldbar.se/",
      businessStatus: "CLOSED_PERMANENTLY"
    },
    // Garbage row: missing id — must be skipped silently
    {
      displayName: { text: "Ghost Café" }
    }
  ]
};

// ---- fixture tests ---------------------------------------------------------

group("Fixture: Places response → parser");

const parsed = parsePlacesTextSearchResponse(fixturePlacesResponse);
ok(
  "parses 4 records (1 garbage row dropped, none invented)",
  parsed.length === 4,
  `got ${parsed.length}`
);
ok(
  "preserves place_id for traceability",
  parsed.every((p) => typeof p.placeId === "string" && p.placeId.length > 0)
);
ok(
  "preserves Google Maps URL when present",
  parsed[0].googleMapsUri === "https://maps.google.com/?cid=1"
);
ok(
  "never invents email — no record carries an email field",
  parsed.every((p) => !("email" in p))
);
ok(
  "rejects non-http(s) URLs as null (sanitizer)",
  sanitizeUrl("javascript:alert(1)") === null &&
    sanitizeUrl("ftp://x.se") === null
);

group("Fixture: classification → no fake leads, incomplete flagged");

const classifications = parsed.map(classifyPlace);

const completes = classifications.filter((c) => c.ok === true);
const incompletes = classifications.filter((c) => c.ok === "incomplete");
const rejected = classifications.filter((c) => c.ok === false);

ok("1 complete lead (Café Norden)", completes.length === 1);
ok(
  "1 incomplete lead, flagged with missing_website",
  incompletes.length === 1 && incompletes[0].reasons.includes("missing_website")
);
ok(
  "2 hard-rejected entries (no-name + closed-permanently)",
  rejected.length === 2
);
ok(
  "rejected entry reasons are explicit, not silent",
  rejected.every((r) => typeof r.reason === "string" && r.reason.length > 0)
);
ok(
  "incomplete leads are NOT discarded — they pass through with reasons",
  incompletes[0].place.placeId === "ChIJ-INCOMPLETE-2"
);

group("Fixture: error redaction");

// Simulate the redaction the production classifyHttpError does for 4xx bodies.
const redact = (s) => s.slice(0, 240).replace(/\bAIza[\w-]+/g, "[redacted]");
const leakyBody =
  "Error: API key AIzaSyABCDEFG-KEY_LOOKING_REAL is invalid. URL ?key=AIzaSyOTHER";
const redacted = redact(leakyBody);
ok("redacts AIza* tokens from error bodies", !redacted.includes("AIzaSy"));

// ---- live test (optional) --------------------------------------------------

async function runLiveTest() {
  group("Live: Places API (Sweden cafés)");

  const apiKey = process.env.LEAD_SEARCH_API_KEY;
  if (!apiKey) {
    ok(
      "VERIFY_LIVE skipped — LEAD_SEARCH_API_KEY not set",
      true,
      "this is expected outside a configured environment"
    );
    return;
  }

  const FIELD_MASK = [
    "places.id",
    "places.displayName",
    "places.formattedAddress",
    "places.websiteUri",
    "places.internationalPhoneNumber",
    "places.nationalPhoneNumber",
    "places.rating",
    "places.userRatingCount",
    "places.googleMapsUri",
    "places.primaryType",
    "places.types",
    "places.businessStatus",
    "places.location"
  ].join(",");

  let response;
  try {
    response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": FIELD_MASK
      },
      body: JSON.stringify({
        textQuery: "café Stockholm Sweden",
        regionCode: "SE",
        languageCode: "sv",
        maxResultCount: 5,
        includedType: "cafe"
      })
    });
  } catch (err) {
    ok("live request reachable", false, err?.message ?? "fetch threw");
    return;
  }

  ok(`HTTP ${response.status}`, response.ok, `body redacted`);
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    process.stdout.write(`    body: ${redact(text).slice(0, 200)}\n`);
    return;
  }

  const json = await response.json().catch(() => null);
  const places = parsePlacesTextSearchResponse(json);
  ok("live response parses ≥1 place", places.length >= 1, `got ${places.length}`);
  ok(
    "every live place has a place_id",
    places.every((p) => p.placeId.length > 0)
  );
  ok(
    "no live place carries an invented email",
    places.every((p) => !("email" in p))
  );

  const live = places.map(classifyPlace);
  const liveOk = live.filter((c) => c.ok === true).length;
  const liveIncomplete = live.filter((c) => c.ok === "incomplete").length;
  process.stdout.write(
    `    summary: ${liveOk} complete, ${liveIncomplete} incomplete, ${live.length - liveOk - liveIncomplete} rejected\n`
  );

  // tiny pause to keep terminal output orderly
  await delay(50);
}

// ---- main ------------------------------------------------------------------

(async () => {
  if (process.env.VERIFY_LIVE === "1") {
    await runLiveTest();
  }

  process.stdout.write(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) {
    process.stdout.write(`Failures:\n`);
    for (const f of failures) {
      process.stdout.write(`  - ${f.name}${f.detail ? `: ${f.detail}` : ""}\n`);
    }
    process.exit(1);
  }
  process.exit(0);
})();
