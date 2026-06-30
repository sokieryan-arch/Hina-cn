# Avatar Upload and Settings Pro Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move avatar editing to real file upload and move quota/upgrade UI into Settings as a polished Hina Pro card.

**Architecture:** Add a small server-side multipart avatar upload parser with a 10MB file limit and local `uploads/avatars` storage. Keep billing state in `App`, but render quota and upgrade copy only inside `SettingsModal`.

**Tech Stack:** Express, Node `fs/path`, React file input, existing API client, Node test runner.

---

## Tasks

- [x] Add API tests for avatar uploads, invalid image type rejection, oversized file rejection, and profile updates preserving avatar when omitted.
- [x] Implement avatar upload helper and `POST /api/profile/avatar`.
- [x] Serve `/uploads` static files from the production server.
- [x] Update API client for `uploadAvatar(file)` and multipart-safe request headers.
- [x] Move billing display from the main composer into Settings.
- [x] Replace Avatar URL input with upload preview and a 10MB file picker.
- [x] Add a polished Hina Pro card in Settings with usage, plan state, and Upgrade button calling checkout stub.
- [x] Run `npm.cmd run test`, `npm.cmd run lint`, and `npm.cmd run build`.
