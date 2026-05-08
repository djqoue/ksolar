# KSolar Web/PWA Rollout

## Decision

KSolar v1.0 should ship as a responsive Web App first, then become a stronger PWA before considering a native iOS app.

Reason:

- sales can open a link immediately
- quote logic and BOM can be updated without App Store review
- Google Maps, Google Solar, Supabase, and AI workflows fit naturally in a web stack
- managers can use the same system from desktop
- engineering can iterate every day during the pilot

## v1.0: Hosted Web App

Target:

- Vercel production deployment
- mobile browser support
- desktop support
- Google Maps and Solar API configured through environment variables

Sales usage:

- open the KSolar URL
- test address search
- draw roof
- select equipment
- review Google Solar cross-check
- generate quote and ROI

## v1.0 PWA Baseline

Implemented baseline:

- web app manifest
- standalone display mode
- app name and short name
- theme color
- app icons
- iOS web app metadata

Important:

- This baseline supports an app-like launch experience.
- Full offline mode is not part of v1.0 because maps, Google Solar, and quote data require network access.

## How Sales Can Install

### iPhone

1. Open KSolar in Safari.
2. Tap Share.
3. Tap Add to Home Screen.
4. Launch KSolar from the new icon.

### Android

1. Open KSolar in Chrome.
2. Tap browser menu.
3. Tap Add to Home screen or Install app.
4. Launch KSolar from the new icon.

## v1.1: Account And Saved Quotes

Add:

- Supabase Auth
- sales user accounts
- saved customers
- saved quotes
- quote history
- team permissions

This is the point where KSolar starts becoming a real sales operating system instead of only a calculator.

## v1.2: PWA Hardening

Add:

- better install prompt
- quote draft autosave
- offline-friendly error states
- cached static assets
- mobile-first map drawing refinements
- PDF proposal export

## When To Build Native iOS

Consider native iOS only when at least two of these become true:

- sales use KSolar daily in the field
- offline site survey is required
- camera photo capture becomes central
- push notifications are required
- field signatures are required
- AR measurement or native LiDAR becomes important
- App Store distribution is worth the maintenance cost

Until then, Web/PWA is faster, cheaper, and easier to operate.
