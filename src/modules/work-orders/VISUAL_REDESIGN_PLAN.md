# Work Orders Visual Redesign Plan

## Goal
Turn the OS list into a premium enterprise experience with stronger trust, hierarchy, and product identity.

## Current issues
- Screen feels too flat and generic
- Weak visual hierarchy between tabs, filters and data
- Table lacks contextual metadata and operational confidence signals
- No KPI summary band or operational dashboard feel
- Limited product differentiation versus generic admin templates

## Target direction
Corporate/Jira-inspired interface with:
- stronger page header
- KPI cards for operational overview
- richer status and SLA visualization
- quick actions with clearer affordances
- better empty/loading states
- denser but more premium table rows
- stronger contrast between navigation, toolbar and content zones

## New sections to add
1. Command header
   - title, subtitle, department context, active filters count
   - primary CTA (Nova OS)
   - secondary actions (Exportar, Guia, Atualizar)

2. KPI strip
   - Total OS
   - Em andamento
   - Atrasadas
   - Taxa dentro do SLA
   - cards with microtrend or delta labels later

3. Smart filter toolbar
   - search
   - status
   - priority
   - assignee
   - unit
   - compact chips for active filters

4. Enterprise table
   - stronger header background
   - row hover with subtle elevation
   - title + metadata block
   - clearer assignee state
   - SLA badge or progress state
   - due date / updated at with semantic coloring

5. Optional right-side insights panel (future)
   - selected OS quick summary
   - SLA health
   - current workload split

## Visual principles
- trust first
- fewer but more meaningful colors
- stronger spacing rhythm
- enterprise typography hierarchy
- clear interaction states
- premium empty/loading/skeleton states

## Implementation phases
- Phase 1: header + KPI strip + upgraded toolbar
- Phase 2: richer table rows + SLA badges + metadata density
- Phase 3: bulk action bar and side insights panel
- Phase 4: board/kanban view toggle
