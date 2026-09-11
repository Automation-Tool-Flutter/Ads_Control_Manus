# Mobile UI refresh

The interface uses Facebook-inspired neutral surfaces, blue actions and rounded cards while retaining the Meta Ads AI name and logo. It is not an official Meta interface or a pixel-perfect copy.

## Implemented

| Area | Change |
| --- | --- |
| Shared appearance | System fonts, neutral light/dark themes, 20px cards, 12px controls, larger touch actions. |
| Navigation | Bottom navigation retained. Menu content scrolls together; shortcuts use a grid and the full tool list uses readable rows. |
| Workspace headers | Compact titles on phones, scrollable summary metrics, no promotional descriptions above the tools. |
| Account and business cards | Copy buttons sit outside navigation links. IDs remain selectable. |
| Collections | Search with clear/reset actions on Accounts, Campaigns, Page and Business assets. Page search covers loaded Pages only. |
| Filters | Account and campaign status filters open a bottom sheet on touch layouts. They update immediately. |
| Reporting dates | Shared date filter uses a bottom sheet on phones. Apply commits the draft; Cancel leaves the active reporting period unchanged. Dashboard supports its existing 7/14/30-day presets. |
| Campaigns | Separate title, delivery toggle and selection areas. Select visible preserves selections outside the current filter; bulk actions still use the total selection. |
| Meta AI | Existing branded chat components preserved; dashboard uses the shared reporting-period picker. |

## Manual acceptance checks

No application, build, browser preview or tests were run for this update, as requested.

| Check | Expected result |
| --- | --- |
| 320 / 375 / 390 / 430px portrait | No page-wide horizontal scrolling; names wrap; primary buttons stay readable. |
| Landscape touch device | Bottom navigation and touch layouts remain available. |
| Light and dark theme | Readable cards, actions, status labels and system browser chrome. |
| Menu + keyboard | Search and results remain reachable by scrolling. Close restores the page without a second top menu. |
| Account/business ID copy | Copy does not navigate into the account/business. |
| Collection search | Clear restores the loaded list; zero matches show a recovery action. |
| Campaign filters | Both card and desktop table use the same visible results. Select visible affects only those rows; total selected remains clear. |
| Reporting date draft | Cancel and backdrop dismiss leave the active report unchanged. Invalid custom dates cannot be applied. |
| Reporting date confirmation | Apply changes the period once and closes the sheet. |
| Dialog keyboard | Focus remains in the dialog, Escape dismisses where allowed, focus returns to its trigger. |
| Safe areas and chat | Composer and bottom actions remain reachable above the phone keyboard and home indicator. |
| Existing business actions | Confirmations, campaign mutations, AI requests and stored conversations retain their existing behavior. |
| Navigation feedback | A delayed centered loading indicator appears only when navigation takes time. A route loading state takes over without a duplicate indicator. Cached routes should not flash a loader. |
| Overlay motion | Menu, dialogs and Meta AI enter in 200ms and exit in 140ms; focus/scroll isolation stays until close completes. |
| Rapid reopen | Reopening during exit cancels the pending close; the overlay stays usable. |
| Menu to Meta AI | Menu closes before AI opens so the native dialog does not steal chat focus. |
| Reduce motion | No sheet/route animation or delayed close; progress feedback remains static. |
| Initial collection load | Accounts, Campaigns, Page and Business assets show a centered loading indicator instead of an empty first frame. |
| Compact cards | Mobile cards use 16px corners, tighter padding and 44px actions. Account/business copy controls sit beside the header, outside the navigation link. |
| Account metrics | Three columns from 360px; below 360px the spend cap moves to its own row. Long amounts wrap without losing digits. |

## Mobile continuity pass

| Change / manual check | Expected result |
| --- | --- |
| Leave a filtered list and return | Accounts, Campaigns, Business assets and Page keep search/filter choices in tab memory, scoped to the signed-in user and route. Logout clears these choices. Reload starts fresh. |
| Reporting periods | Campaign and account dashboard period choices survive route changes; unsaved edits and bulk selections are not persisted. |
| Back / bottom tabs | Restore a previously scrolled screen after its list is ready. Stop restoring immediately when the user touches, types or scrolls. No replacement of browser history. |
| Changed / paginated data | Restoration only succeeds when the target offset exists. Page rows loaded through Load more are not cached by UI memory; do not expect deep offsets to restore after those rows unmount. |
| Search a large collection | Search uses deferred filtering and memoized results; unchanged account, business and Page cards skip rerenders. |
| Drag a dialog handle | Pull the top handle down to dismiss; a short pull or cancelled gesture snaps back. Content scrolling does not initiate dismissal. Busy dialogs cannot be dragged closed. |
| Date dialog dismissal | Dragging to close discards the date draft, like Cancel; it must not apply dates. |
| Keyboard / browser bars | Viewport writes are grouped per animation frame and skipped when unchanged; pinch zoom does not resize sheets. |
| Accessibility | Handle has a Close dialog label and supports keyboard activation. Reduced motion skips snap-back animation. |

These are implementation details and acceptance checks, not on-device performance measurements. Runtime checks remain pending at the user's request.

## Chat readability and centered loading

| Check | Expected result |
| --- | --- |
| Open mobile Meta AI | Compact header, account/period summary and collapsed analysis details leave more space for messages. Expand details to find scope, Refresh, Clear chat and Full conversation. |
| Read a conversation | Neutral canvas, soft blue user bubbles and borderless assistant replies; 15px body text with generous line spacing. Caveats and supporting data remain available. |
| Keyboard open | Secondary chat controls disappear to prioritize the conversation and composer. |
| Data preparation / AI response | One centered status in the chat body; no competing empty-state suggestions while data is being prepared. Existing messages remain scrollable. |
| Full conversation | Shared message styles and centered thinking state also apply to the full chat page. |
| Workspace loading | Shared page loading is centered in the visible viewport, including keyboard/browser-bar changes. Page lists, catalogs, content, campaign builder, diagnostics and audience/plan analysis use the shared indicator. |
| Local actions | Send/save/toggle/load-more indicators stay attached to their controls. They do not create another full-screen loading overlay. |
| Reduced motion | Loading spinner stays static; text still communicates the pending operation. |

This pass was reviewed statically only; no app, build, browser or test execution.

## Organized mobile menu

| Check | Expected result |
| --- | --- |
| Open Menu | Four compact default shortcuts for account workspaces; existing saved selections (up to six) remain intact. No horizontal category filters or duplicate AI banner. |
| Browse tools | All sixteen tools remain in three expandable groups: Analyze & optimize, Create & manage, Workspace. The group containing the current page starts open. |
| Search | Search stays above the scrolling results. Enter only opens a unique match; multiple results remain available for explicit selection. Clear restores the grouped menu. |
| No account selected | Workspace tools remain available. Account tools clearly indicate that account selection is required; no unusable account shortcut grid. |
| Edit shortcuts | Pin/unpin with visible selection state. Cancel restores the original set. Save persists on this device. Saving errors retain the draft for retry or cancellation. |
| Navigation while editing | Cancel/Save replace the bottom tabs until editing ends. Outside editing, the same five bottom navigation controls remain available. |
| Narrow screens / keyboard | Compact rows retain 44px-or-larger touch targets; long labels wrap. Only the results scroll; keyboard sizing follows the existing native menu viewport handling. |

Menu tests updated in `tests/mobile-tools.test.cjs`; not executed at the user's request.

## Compact business asset cards

| Check | Expected result |
| --- | --- |
| Business list | Compact portfolio card with avatar, name and inline verification status; no duplicate Open assets / Full profile button row. Tap the heading/chevron to open the business. |
| Counts | Ad accounts, Pages, Users and Catalogs share one four-column strip. Zero values remain visible; large counts wrap instead of being truncated. |
| Long name / missing image | Full names wrap. Missing or failed images use the business initial. |
| Business ID | ID remains visible and selectable; the separate 44px copy button does not navigate. |
| Details | Created date, timezone and primary Page remain on the business detail page rather than expanding the collection card. |

Static review only. Added `tests/business-asset-card.test.cjs`; not executed.

Suggested tests to run locally: `node --test tests/mobile-interactions.test.cjs tests/mobile-product.test.cjs tests/meta-chat.test.cjs tests/overlay-presence.test.cjs tests/mobile-continuity.test.cjs`.
