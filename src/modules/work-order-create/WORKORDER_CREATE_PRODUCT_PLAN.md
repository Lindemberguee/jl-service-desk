# Work Order Create Product Refactor

## Goal
Rebuild the `/os/nova` experience into a premium service request creation flow without risking the current production page.

## Strategy
- keep the current logic and business rules intact
- move the new experience into `src/modules/work-order-create`
- refine layout, hierarchy and guided experience
- only switch the route/page after validation

## Product direction
- strong enterprise header
- two-column layout
- live summary sidebar
- better section hierarchy
- faster reading and completion
- premium validation and empty states
- cleaner attachments/tags experience

## Planned pieces
- `screens/WorkOrderCreateProductPage.tsx`
- `components/WorkOrderCreateHeader.tsx`
- `components/WorkOrderCreateSidebar.tsx`
- `components/WorkOrderCreateSection.tsx`
- `components/WorkOrderCreateSummaryCard.tsx`

## UX goals
- less form fatigue
- clearer essential vs optional fields
- stronger operational confidence
- more modern enterprise look
