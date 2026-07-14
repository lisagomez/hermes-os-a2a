/**
 * Maquina de estados de pointer events del canvas (down/move/up/double-click:
 * select, drag, resize, rotate, draw, freedraw, eraser, connector, pan,
 * select-box, quick-create) — extraida VERBATIM de DrawEditor3.tsx
 * (refactor fase 3, B6b). Es la pieza mas fragil del editor: NO cambiar
 * semantica aqui sin smoke completo de todas las tools.
 */
'use client'
import React, { useCallback } from 'react'
import { panCamera, screenToWorld, zoomCamera } from '../../canvas/camera'
import { pickElement, pickElementForContext, hitTestHandles, hitTestResizeEdge, selectionCornerPoints, OPPOSITE_SELECTION_CORNER, setCoarsePointer, type HandleKind, type SelectionCorner } from '../../canvas/hit/hit-test'
import { getConnectorRoute, type Point as ConnectorPoint } from '../../canvas/renderer/connectors'
import { findTextTaskCheckboxHit, toggleTaskItemInDoc } from '../../canvas/renderer/text'
import { snapConnectorSegment, snapMovingSelection, type SnapGuide } from '../../canvas/snap-guides'
import { bboxFromElement, bboxUnion, isShape, type BBox, type CanvasElement, type Camera, type ConnectorElement, type ElementId, type TextElement } from '../../elements/types'
import { createText, createSticky, createConnector } from '../../elements/factories'
import { shapeTextBox } from '../../elements/shape-text-box'
import { useCanvasStore, type ToolName } from '../../stores/canvas-store'
import { getPalette } from '../../theme/tokens'
import type { Op } from '../../ops/contract'
import {
  appendFreehandPoints,
  applyStrokeDefaults,
  boundTextForContainer,
  clamp,
  cloneConnectorWaypoints,
  coalescedPointerSamples,
  connectorWaypointsFromRoute,
  createBoundTextForShape,
  createFreedrawFromWorldPoints,
  createFromDrag,
  createHighlighterFromWorldPoints,
  createResizeDrag,
  createSelectionEdgeResizeDrag,
  createSelectionResizeDrag,
  createStandaloneTextElement,
  cursorForConnectorRouteAxis,
  cursorForHandle,
  elementPatchSnapshot,
  expandDragSelectionIds,
  expandMoveHistoryIds,
  findSelectedConnectorRouteHit,
  findSelectedEdgeHit,
  findSelectedHandleHit,
  hitConnectorRoute,
  hitGroupySelectionCorner,
  hitGroupySelectionEdge,
  hitMagnet,
  isDrawingTool,
  makeBoundConnector,
  moveBoundText,
  moveConnectorSegment,
  movementHistoryOps,
  movementSnapshot,
  nearestBinding,
  normalizeBox,
  normalizeRotation,
  pickTextBoxPatch,
  pointerPressure,
  resizeBoundText,
  resizeFromHandle,
  resizeHistoryPatch,
  sameConnectorWaypoints,
  sameMovementSnapshot,
  scaleElementPatch,
  scaleHistoryPatch,
  selectableIdForHit,
  snapRotation,
  standaloneTextNaturalHeight,
  normalizeGroupSelectionIds,
} from '../canvas-editor-helpers'
import { isBindable, anchorPoint, openCanvasUrl } from '../canvas-ui-constants'
import { useUIStore } from '../../stores/ui-store'
import type { Viewport, StyleDefaults, DragMode, QuickCreateAnchor, QuickCreatePreview, BindingHit, FreehandPoint, MovementSnapshot } from '../DrawEditor3'

const FREEHAND_MIN_DISTANCE_SCREEN_PX = 1.25
// Móvil: distancia (px de pantalla) por debajo de la cual un gesto touch es un
// "tap" (selecciona); por encima se convierte en pan.
const TOUCH_TAP_SLOP = 8

export interface CanvasPointerMachineDeps {
  activeTool: ToolName
  addElement: (el: CanvasElement) => void
  camera: Camera
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  clearSelection: () => void
  commitAndApply: (label: string, forward: Op[], reverse: Op[]) => void
  dragRef: React.MutableRefObject<DragMode>
  elements: CanvasElement[]
  eraseAtPoint: (point: { x: number; y: number }, erased: Map<ElementId, CanvasElement>) => void
  fileInputRef: React.RefObject<HTMLInputElement | null>
  freehandPointsFromEvent: (event: React.PointerEvent<HTMLCanvasElement>) => FreehandPoint[]
  markDirty: () => void
  markViewDirty: () => void
  navigateHref: (href: string) => void
  palette: ReturnType<typeof getPalette>
  pendingImagePointRef: React.MutableRefObject<{ x: number; y: number } | null>
  recordHistory: (label: string, forward: Op[], reverse: Op[]) => void
  screenPointFromEvent: (event: React.PointerEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>) => { x: number; y: number }
  selected: CanvasElement[]
  selectedIds: Set<ElementId>
  setActiveTool: (tool: ToolName) => void
  setCamera: (camera: Camera) => void
  setEditing: (id: ElementId | null) => void
  setHoverCursor: React.Dispatch<React.SetStateAction<string | null>>
  setHovered: (id: ElementId | null) => void
  setRenderTick: React.Dispatch<React.SetStateAction<number>>
  setSelection: (ids: ElementId[]) => void
  setSelectionToolbarDismissed: React.Dispatch<React.SetStateAction<boolean>>
  setSnapGuides: React.Dispatch<React.SetStateAction<SnapGuide[]>>
  settings: ReturnType<typeof useCanvasStore.getState>['settings']
  styleDefaults: StyleDefaults
  updateElement: (id: ElementId, patch: Partial<CanvasElement>) => void
  viewport: Viewport
  viewportRef: React.RefObject<Viewport>
  worldPointFromEvent: (event: React.PointerEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>) => { x: number; y: number }
}

export function useCanvasPointerMachine({
  palette,
  selected,
  activeTool,
  addElement,
  camera,
  canvasRef,
  clearSelection,
  commitAndApply,
  dragRef,
  elements,
  eraseAtPoint,
  fileInputRef,
  freehandPointsFromEvent,
  markDirty,
  markViewDirty,
  navigateHref,
  pendingImagePointRef,
  recordHistory,
  screenPointFromEvent,
  selectedIds,
  setActiveTool,
  setCamera,
  setEditing,
  setHoverCursor,
  setHovered,
  setRenderTick,
  setSelection,
  setSelectionToolbarDismissed,
  setSnapGuides,
  settings,
  styleDefaults,
  updateElement,
  viewport,
  viewportRef,
  worldPointFromEvent,
}: CanvasPointerMachineDeps) {
  // ---- Pinch-to-zoom tactil (iPhone/iPad). Aditivo: con UN pointer activo
  // nada de esto interviene; con DOS pointers touch se entra a modo pinch,
  // se aborta el drag en curso y move/up de esos pointers no llegan a la
  // maquina de un solo pointer.
  const touchPointersRef = React.useRef<Map<number, { x: number; y: number }>>(new Map())
  const pinchRef = React.useRef<{ startDist: number; startZoom: number; lastMid: { x: number; y: number } } | null>(null)

  const pinchDistance = () => {
    const pts = Array.from(touchPointersRef.current.values())
    return Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y)
  }
  const pinchMidpoint = () => {
    const pts = Array.from(touchPointersRef.current.values())
    return { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 }
  }

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    // Touch → blancos de hit agrandados (~44px) para handles/edges; mouse queda preciso.
    setCoarsePointer(event.pointerType === 'touch')
    if (event.pointerType === 'touch') {
      touchPointersRef.current.set(event.pointerId, screenPointFromEvent(event))
      if (touchPointersRef.current.size === 2) {
        // Segundo dedo: abortar drag en curso y entrar a pinch.
        dragRef.current = { kind: 'none' }
        pinchRef.current = {
          startDist: Math.max(1, pinchDistance()),
          startZoom: useCanvasStore.getState().camera.zoom,
          lastMid: pinchMidpoint(),
        }
        setRenderTick(t => t + 1)
        return
      }
      if (touchPointersRef.current.size > 2) return
    }
    try {
      canvas.setPointerCapture(event.pointerId)
    } catch {
      // Synthetic pointer events in tests may not have an active pointer to capture.
    }
    const world = worldPointFromEvent(event)
    const screen = screenPointFromEvent(event)
    const s = useCanvasStore.getState()
    setSnapGuides([])

    if (event.button === 1 || activeTool === 'hand' || event.altKey) {
      dragRef.current = { kind: 'pan', last: screen }
      return
    }

    if (activeTool === 'arrow' || activeTool === 'connector' || activeTool === 'line') {
      const binding = nearestBinding(world, s.elements, s.camera.zoom)
      dragRef.current = { kind: 'draw', tool: activeTool, start: binding?.point ?? world, current: world, startBinding: binding }
      setRenderTick(t => t + 1)
      return
    }

    if (activeTool === 'text') {
      const text = createStandaloneTextElement({
        text: '',
        point: world,
        anchor: 'top-left',
        viewport: viewportRef.current,
        camera: useCanvasStore.getState().camera,
        style: styleDefaults,
      })
      addElement(text)
      recordHistory('Insert text', [{ kind: 'add', element: text }], [{ kind: 'delete', ids: [text.id] }])
      setSelection([text.id])
      setEditing(text.id)
      setActiveTool('select')
      markDirty()
      return
    }

    if (activeTool === 'sticky') {
      const sticky = createSticky({ x: world.x, y: world.y, text: '', color: 'yellow' })
      addElement(sticky)
      recordHistory('Insert sticky', [{ kind: 'add', element: sticky }], [{ kind: 'delete', ids: [sticky.id] }])
      setSelection([sticky.id])
      setEditing(sticky.id)
      setActiveTool('select')
      markDirty()
      return
    }

    if (activeTool === 'image') {
      pendingImagePointRef.current = world
      fileInputRef.current?.click()
      setActiveTool('select')
      return
    }

    if (activeTool === 'freedraw' || activeTool === 'highlighter') {
      event.preventDefault()
      const points = freehandPointsFromEvent(event)
      dragRef.current = { kind: activeTool, points: points.length ? points : [{ ...world, pressure: pointerPressure(event.nativeEvent) }] }
      setRenderTick(t => t + 1)
      return
    }

    if (activeTool === 'eraser') {
      event.preventDefault()
      const erased = new Map<ElementId, CanvasElement>()
      eraseAtPoint(world, erased)
      dragRef.current = { kind: 'eraser', current: world, erased }
      setRenderTick(t => t + 1)
      return
    }

    if (isDrawingTool(activeTool)) {
      dragRef.current = { kind: 'draw', tool: activeTool, start: world, current: world }
      setRenderTick(t => t + 1)
      return
    }

    const additiveSelection = activeTool === 'select' && (event.metaKey || event.ctrlKey || event.shiftKey)

    if (activeTool === 'select' && !additiveSelection) {
      // Resize proporcional de multi-seleccion / grupo desde una esquina (Miro-style)
      const selectionCorner = hitGroupySelectionCorner(s.elements, s.selectedIds, world, s.camera.zoom)
      if (selectionCorner) {
        const resizeDrag = createSelectionResizeDrag(s.elements, s.selectedIds, selectionCorner)
        if (resizeDrag) {
          dragRef.current = resizeDrag
          setHoverCursor(cursorForHandle(selectionCorner))
          return
        }
      }

      // Resize de un solo lado (accordion) de multi-seleccion / grupo desde un borde.
      const selectionEdge = hitGroupySelectionEdge(s.elements, s.selectedIds, world, s.camera.zoom)
      if (selectionEdge) {
        const edgeDrag = createSelectionEdgeResizeDrag(s.elements, s.selectedIds, selectionEdge)
        if (edgeDrag) {
          dragRef.current = edgeDrag
          setHoverCursor(cursorForHandle(selectionEdge))
          return
        }
      }

      const connectorRouteHit = findSelectedConnectorRouteHit(s.elements, s.selectedIds, world, s.camera.zoom)
      if (connectorRouteHit) {
        setSelection([connectorRouteHit.connector.id])
        dragRef.current = {
          kind: 'connector-route',
          connectorId: connectorRouteHit.connector.id,
          segmentIndex: connectorRouteHit.segmentIndex,
          axis: connectorRouteHit.axis,
          originalRoute: connectorRouteHit.route.map(point => ({ ...point })),
          originalWaypoints: cloneConnectorWaypoints(connectorRouteHit.connector),
        }
        setHoverCursor(cursorForConnectorRouteAxis(connectorRouteHit.axis))
        return
      }

      const handleHit = findSelectedHandleHit(s.elements, s.selectedIds, world, s.camera.zoom)
      if (handleHit) {
        setSelection([handleHit.element.id])
        dragRef.current = createResizeDrag(handleHit.element, handleHit.handle, world, s.elements)
        setHoverCursor(handleHit.handle === 'rotation' ? 'grabbing' : cursorForHandle(handleHit.handle))
        return
      }
    }

    // MÓVIL: con select tool y un dedo, el gesto por defecto es PAN; un tap corto
    // selecciona (estilo Figma/Miro). Los handles/corners/edges de la selección
    // actual ya se resolvieron arriba (con blancos agrandados para el dedo). Si el
    // toque NO cae sobre un elemento YA seleccionado, entramos a pan-or-tap.
    if (event.pointerType === 'touch' && activeTool === 'select' && !additiveSelection) {
      const touchHit = pickElement(s.elements, world, s.camera.zoom)
      const touchHitId = touchHit ? (s.selectedIds.has(touchHit.id) ? touchHit.id : selectableIdForHit(touchHit, s.elements)) : null
      const onSelected = touchHitId != null && s.selectedIds.has(touchHitId)
      if (!onSelected) {
        dragRef.current = { kind: 'touch-pan-or-tap', startScreen: screen, last: screen, world, moved: false }
        return
      }
      // onSelected → continúa al manejo normal de 'drag' (mover el elemento seleccionado).
    }

    const hit = pickElement(s.elements, world, s.camera.zoom)
    // Drill-in: si el hijo crudo ya esta seleccionado (via doble click), el click
    // opera sobre el hijo; si no, resuelve al grupo top-level.
    const hitSelectionId = hit ? (s.selectedIds.has(hit.id) ? hit.id : selectableIdForHit(hit, s.elements)) : null
    const hitSelection = hitSelectionId ? s.elements.find(el => el.id === hitSelectionId) ?? hit : null

    // Cmd/Ctrl+click sobre un elemento con href navega en vez de alternar
    // seleccion aditiva — es una accion de navegacion, no de multi-select.
    // Shift+click sigue siendo puro multi-select (no navega) aunque el
    // elemento tenga href. Click normal (sin modificador) nunca navega: no
    // debe romper seleccion/arrastre existente.
    if (activeTool === 'select' && (event.metaKey || event.ctrlKey) && !event.shiftKey && hit?.href) {
      navigateHref(hit.href)
      dragRef.current = { kind: 'none' }
      return
    }

    const magnet = !additiveSelection ? hitMagnet(world, selected, s.camera.zoom) : null
    if (magnet) {
      dragRef.current = { kind: 'connector', start: magnet.point, current: world, startBinding: magnet }
      setRenderTick(t => t + 1)
      return
    }

    const edgeHit = activeTool === 'select' && !additiveSelection
      ? findSelectedEdgeHit(s.elements, s.selectedIds, world, s.camera.zoom)
      : null
    if (edgeHit) {
      setSelection([edgeHit.element.id])
      dragRef.current = createResizeDrag(edgeHit.element, edgeHit.handle, world, s.elements)
      setHoverCursor(cursorForHandle(edgeHit.handle))
      return
    }

    if (
      activeTool === 'select' &&
      !additiveSelection &&
      hitSelection &&
      (hitSelection.type === 'text' || hitSelection.type === 'sticky')
    ) {
      const ctx = canvas.getContext('2d')
      const taskHit = ctx ? findTextTaskCheckboxHit(ctx, hitSelection, world, s.elements) : null
      if (taskHit) {
        const nextDoc = toggleTaskItemInDoc(hitSelection.doc, taskHit.taskIndex)
        if (nextDoc) {
          commitAndApply(
            'Toggle checklist item',
            [({ kind: 'update', id: hitSelection.id, patch: { doc: nextDoc } } as Op)],
            [({ kind: 'update', id: hitSelection.id, patch: { doc: hitSelection.doc } } as Op)],
          )
          setSelection([hitSelection.id])
          dragRef.current = { kind: 'none' }
          setRenderTick(t => t + 1)
          return
        }
      }
    }

    if (hitSelection && additiveSelection) {
      const next = new Set(useCanvasStore.getState().selectedIds)
      if (next.has(hitSelection.id)) next.delete(hitSelection.id)
      else next.add(hitSelection.id)
      setSelection(Array.from(next))
      dragRef.current = { kind: 'none' }
      setRenderTick(t => t + 1)
      return
    }

    if (hitSelection?.locked) {
      setSelection([hitSelection.id])
      dragRef.current = { kind: 'none' }
      setRenderTick(t => t + 1)
      return
    }

    const connectorInMultiSelection =
      hitSelection?.type === 'connector' && selectedIds.size > 1 && selectedIds.has(hitSelection.id)
    if (hitSelection?.type === 'connector' && activeTool === 'select' && !additiveSelection && !connectorInMultiSelection) {
      setSelection([hitSelection.id])
      const connectorRouteHit = hitConnectorRoute(hitSelection, s.elements, world, s.camera.zoom)
      if (connectorRouteHit) {
        dragRef.current = {
          kind: 'connector-route',
          connectorId: hitSelection.id,
          segmentIndex: connectorRouteHit.segmentIndex,
          axis: connectorRouteHit.axis,
          originalRoute: connectorRouteHit.route.map(point => ({ ...point })),
          originalWaypoints: cloneConnectorWaypoints(hitSelection),
        }
        setHoverCursor(cursorForConnectorRouteAxis(connectorRouteHit.axis))
      } else {
        dragRef.current = { kind: 'none' }
      }
      setRenderTick(t => t + 1)
      return
    }

    if (hitSelection && hitSelection.type !== 'group' && selectedIds.size === 1 && selectedIds.has(hitSelection.id)) {
      const handle = hitTestHandles(hitSelection, world, s.camera.zoom)
      if (handle) {
        dragRef.current = createResizeDrag(hitSelection, handle, world, s.elements)
        setHoverCursor(handle === 'rotation' ? 'grabbing' : cursorForHandle(handle))
        return
      }
    }

    if (hitSelection) {
      const startedOnSelected = selectedIds.has(hitSelection.id)
      if (!startedOnSelected) setSelection([hitSelection.id])
      const latest = useCanvasStore.getState()
      const nextSelection = latest.selectedIds.has(hitSelection.id)
        ? Array.from(latest.selectedIds)
        : [hitSelection.id]
      const moveIds = expandDragSelectionIds(latest.elements, nextSelection)
      const originals = new Map<ElementId, MovementSnapshot>()
      for (const id of expandMoveHistoryIds(latest.elements, moveIds)) {
        const el = latest.elements.find(item => item.id === id)
        if (el) originals.set(id, movementSnapshot(el))
      }
      dragRef.current = { kind: 'drag', start: world, moveIds, originals, startedOnSelected }
      return
    }

    if (additiveSelection) {
      dragRef.current = { kind: 'none' }
      setRenderTick(t => t + 1)
      return
    }

    clearSelection()
    dragRef.current = { kind: 'select-box', start: world, current: world }
    setRenderTick(t => t + 1)
  }, [activeTool, addElement, clearSelection, commitAndApply, eraseAtPoint, freehandPointsFromEvent, markDirty, navigateHref, screenPointFromEvent, selected, selectedIds, setActiveTool, setEditing, setSelection, styleDefaults, worldPointFromEvent])

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.pointerType === 'touch' && touchPointersRef.current.has(event.pointerId)) {
      touchPointersRef.current.set(event.pointerId, screenPointFromEvent(event))
      const pinch = pinchRef.current
      if (pinch && touchPointersRef.current.size >= 2) {
        const dist = Math.max(1, pinchDistance())
        const mid = pinchMidpoint()
        const targetZoom = pinch.startZoom * (dist / pinch.startDist)
        const cam = useCanvasStore.getState().camera
        const vp = viewportRef.current
        const zoomed = zoomCamera(cam, targetZoom / cam.zoom, mid, vp)
        const panned = panCamera(zoomed, pinch.lastMid.x - mid.x, pinch.lastMid.y - mid.y)
        pinch.lastMid = mid
        setCamera(panned)
        markViewDirty()
        return
      }
      if (pinch) return
    }
    const world = worldPointFromEvent(event)
    const screen = screenPointFromEvent(event)
    const drag = dragRef.current

    if (drag.kind === 'touch-pan-or-tap') {
      const moved = drag.moved || Math.hypot(screen.x - drag.startScreen.x, screen.y - drag.startScreen.y) >= TOUCH_TAP_SLOP
      if (!moved) return
      setHoverCursor(null)
      setCamera(panCamera(useCanvasStore.getState().camera, screen.x - drag.last.x, screen.y - drag.last.y))
      markViewDirty()
      dragRef.current = { ...drag, last: screen, moved: true }
      return
    }

    if (drag.kind === 'pan') {
      setHoverCursor(null)
      setCamera(panCamera(useCanvasStore.getState().camera, screen.x - drag.last.x, screen.y - drag.last.y))
      markViewDirty()
      dragRef.current = { ...drag, last: screen }
      return
    }

    if (drag.kind === 'drag') {
      setHoverCursor(null)
      const currentState = useCanvasStore.getState()
      let dx = world.x - drag.start.x
      let dy = world.y - drag.start.y
      if (currentState.settings.snapToObjects) {
        const snap = snapMovingSelection({
          elements: currentState.elements,
          movingIds: new Set(drag.moveIds),
          originals: drag.originals,
          dx,
          dy,
          zoom: currentState.camera.zoom,
          thresholdPx: currentState.settings.snapThreshold,
        })
        dx = snap.dx
        dy = snap.dy
        setSnapGuides(snap.guides)
      } else {
        setSnapGuides([])
      }
      for (const id of drag.moveIds) {
        const origin = drag.originals.get(id)
        if (!origin) continue
        updateElement(id, { x: origin.x + dx, y: origin.y + dy } as Partial<CanvasElement>)
        moveBoundText(id, origin.x + dx, origin.y + dy)
      }
      markDirty()
      return
    }

    if (drag.kind === 'resize') {
      setHoverCursor(drag.handle === 'rotation' ? 'grabbing' : cursorForHandle(drag.handle))
      const resized = resizeFromHandle(drag.original, drag.handle, drag.start, world)
      updateElement(drag.original.id, resized as Partial<CanvasElement>)
      resizeBoundText(drag.original.id, resized, drag.original, drag.boundTextOriginal ?? null, drag.handle)
      markDirty()
      return
    }

    if (drag.kind === 'resize-selection') {
      setHoverCursor(cursorForHandle(drag.corner))
      // Escala proporcional: proyeccion del cursor sobre la diagonal anchor->esquina.
      const dx = drag.start.x - drag.anchor.x
      const dy = drag.start.y - drag.anchor.y
      const len2 = dx * dx + dy * dy
      if (len2 < 1e-9) return
      const scale = Math.max(0.05, ((world.x - drag.anchor.x) * dx + (world.y - drag.anchor.y) * dy) / len2)
      for (const [id, original] of drag.originals) {
        updateElement(id, scaleElementPatch(original, drag.anchor, scale))
      }
      markDirty()
      return
    }

    if (drag.kind === 'resize-selection-edge') {
      setHoverCursor(drag.axis === 'x' ? 'ew-resize' : 'ns-resize')
      const cur = drag.axis === 'x' ? world.x : world.y
      const anchorA = drag.axis === 'x' ? drag.anchor.x : drag.anchor.y
      const startA = drag.axis === 'x' ? drag.start.x : drag.start.y
      const denom = startA - anchorA
      if (Math.abs(denom) < 1e-6) return
      const scale = Math.max(0.05, (cur - anchorA) / denom)
      for (const [id, original] of drag.originals) {
        updateElement(id, scaleElementPatch(original, drag.anchor, scale, drag.axis))
      }
      markDirty()
      return
    }

    if (drag.kind === 'connector-route') {
      setHoverCursor(cursorForConnectorRouteAxis(drag.axis))
      const currentState = useCanvasStore.getState()
      let value = drag.axis === 'x' ? world.x : world.y
      if (currentState.settings.snapToObjects) {
        const snap = snapConnectorSegment({
          elements: currentState.elements,
          connectorId: drag.connectorId,
          route: drag.originalRoute,
          segmentIndex: drag.segmentIndex,
          axis: drag.axis,
          value,
          zoom: currentState.camera.zoom,
          thresholdPx: currentState.settings.snapThreshold,
        })
        value = snap.value
        setSnapGuides(snap.guides)
      } else {
        setSnapGuides([])
      }
      const route = moveConnectorSegment(drag.originalRoute, drag.segmentIndex, drag.axis, value)
      updateElement(drag.connectorId, { waypoints: connectorWaypointsFromRoute(route) } as Partial<CanvasElement>)
      markDirty()
      return
    }

    if (drag.kind === 'draw') {
      setHoverCursor(null)
      dragRef.current = { ...drag, current: world }
      setRenderTick(t => t + 1)
      return
    }

    if (drag.kind === 'freedraw' || drag.kind === 'highlighter') {
      event.preventDefault()
      setHoverCursor(null)
      const minDistance = FREEHAND_MIN_DISTANCE_SCREEN_PX / useCanvasStore.getState().camera.zoom
      const nextPoints = appendFreehandPoints(drag.points, freehandPointsFromEvent(event), minDistance)
      if (nextPoints !== drag.points) {
        dragRef.current = {
          kind: drag.kind,
          points: nextPoints,
        }
        setRenderTick(t => t + 1)
      }
      return
    }

    if (drag.kind === 'eraser') {
      event.preventDefault()
      setHoverCursor(null)
      eraseAtPoint(world, drag.erased)
      dragRef.current = { ...drag, current: world }
      setRenderTick(t => t + 1)
      return
    }

    if (drag.kind === 'connector') {
      setHoverCursor(null)
      dragRef.current = { ...drag, current: world }
      setRenderTick(t => t + 1)
      return
    }

    if (drag.kind === 'select-box') {
      setHoverCursor(null)
      dragRef.current = { ...drag, current: world }
      setRenderTick(t => t + 1)
      return
    }

    const currentState = useCanvasStore.getState()
    if (currentState.activeTool === 'select') {
      const selectionCorner = hitGroupySelectionCorner(currentState.elements, currentState.selectedIds, world, currentState.camera.zoom)
      if (selectionCorner) {
        setHoverCursor(cursorForHandle(selectionCorner))
        setHovered(null)
        return
      }

      const selectionEdge = hitGroupySelectionEdge(currentState.elements, currentState.selectedIds, world, currentState.camera.zoom)
      if (selectionEdge) {
        setHoverCursor(cursorForHandle(selectionEdge))
        setHovered(null)
        return
      }

      const connectorRouteHit = findSelectedConnectorRouteHit(currentState.elements, currentState.selectedIds, world, currentState.camera.zoom)
      if (connectorRouteHit) {
        setHoverCursor(cursorForConnectorRouteAxis(connectorRouteHit.axis))
        setHovered(connectorRouteHit.connector.id)
        return
      }

      const handleHit = findSelectedHandleHit(currentState.elements, currentState.selectedIds, world, currentState.camera.zoom)
      if (handleHit) {
        setHoverCursor(cursorForHandle(handleHit.handle))
        setHovered(null)
        return
      }

      const edgeHit = findSelectedEdgeHit(currentState.elements, currentState.selectedIds, world, currentState.camera.zoom)
      if (edgeHit) {
        setHoverCursor(cursorForHandle(edgeHit.handle))
        setHovered(null)
        return
      }
    }
    setHoverCursor(null)
    setHovered(pickElement(currentState.elements, world, currentState.camera.zoom)?.id ?? null)
  }, [eraseAtPoint, freehandPointsFromEvent, markDirty, markViewDirty, screenPointFromEvent, setCamera, setHovered, updateElement, worldPointFromEvent])

  const handlePointerUp = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.pointerType === 'touch') {
      touchPointersRef.current.delete(event.pointerId)
      if (pinchRef.current) {
        if (touchPointersRef.current.size < 2) pinchRef.current = null
        return
      }
    }
    const canvas = canvasRef.current
    if (canvas?.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId)
    const world = worldPointFromEvent(event)
    const drag = dragRef.current
    const s = useCanvasStore.getState()

    if (drag.kind === 'touch-pan-or-tap') {
      // Tap (sin movimiento) = seleccionar bajo el dedo; si se movió, fue pan.
      if (!drag.moved) {
        const hit = pickElement(s.elements, drag.world, s.camera.zoom)
        const hitId = hit ? (s.selectedIds.has(hit.id) ? hit.id : selectableIdForHit(hit, s.elements)) : null
        if (hitId) {
          setSelection([hitId])
          setSelectionToolbarDismissed(false)
        } else {
          clearSelection()
        }
      }
    } else if (drag.kind === 'connector-route') {
      const current = s.elements.find(el => el.id === drag.connectorId)
      if (current?.type === 'connector') {
        const nextWaypoints = cloneConnectorWaypoints(current)
        if (!sameConnectorWaypoints(nextWaypoints, drag.originalWaypoints)) {
          recordHistory(
            'Adjust connector route',
            [({ kind: 'update', id: current.id, patch: { waypoints: nextWaypoints } } as Op)],
            [({ kind: 'update', id: current.id, patch: { waypoints: drag.originalWaypoints } } as Op)],
          )
        }
      }
    } else if (drag.kind === 'draw') {
      const endBinding = drag.startBinding
        ? nearestBinding(world, s.elements, s.camera.zoom, new Set([drag.startBinding.elementId]))
        : null
      const created = drag.startBinding && endBinding && (drag.tool === 'arrow' || drag.tool === 'connector')
        ? [makeBoundConnector(drag.startBinding, endBinding, styleDefaults)]
        : createFromDrag(drag, styleDefaults, palette, s.elements)
      if (created.length > 0) {
        const createdWithLabels: CanvasElement[] = [...created]
        let editingTextId: ElementId | null = null
        if (isShape(created[0])) {
          const label = createBoundTextForShape(created[0], styleDefaults, palette)
          createdWithLabels.push(label)
          editingTextId = label.id
        }
        for (const el of createdWithLabels) addElement(el)
        recordHistory(
          `Create ${created[0].type}`,
          createdWithLabels.map(element => ({ kind: 'add', element }) as Op),
          [{ kind: 'delete', ids: createdWithLabels.map(el => el.id) }],
        )
        setSelection([created[0].id])
        if (editingTextId) setEditing(editingTextId)
        setActiveTool('select')
        markDirty()
      }
    } else if (drag.kind === 'freedraw' || drag.kind === 'highlighter') {
      event.preventDefault()
      const minDistance = FREEHAND_MIN_DISTANCE_SCREEN_PX / Math.max(s.camera.zoom || 1, 0.01)
      const points = appendFreehandPoints(drag.points, freehandPointsFromEvent(event), minDistance)
      const stroke = drag.kind === 'highlighter'
        ? createHighlighterFromWorldPoints(points, styleDefaults)
        : createFreedrawFromWorldPoints(points, styleDefaults)
      if (stroke) {
        addElement(stroke)
        recordHistory(`Create ${drag.kind}`, [{ kind: 'add', element: stroke }], [{ kind: 'delete', ids: [stroke.id] }])
        setSelection([stroke.id])
        markDirty()
      }
    } else if (drag.kind === 'eraser') {
      const deleted = Array.from(drag.erased.values())
      if (deleted.length > 0) {
        recordHistory(
          'Erase elements',
          [{ kind: 'delete', ids: deleted.map(el => el.id) }],
          deleted.map(element => ({ kind: 'add', element }) as Op),
        )
        markDirty()
      }
    } else if (drag.kind === 'connector') {
      const endBinding = nearestBinding(world, s.elements, s.camera.zoom, new Set([drag.startBinding.elementId]))
      if (endBinding) {
        const connector = createConnector({
          fromElementId: drag.startBinding.elementId,
          toElementId: endBinding.elementId,
          routing: 'orthogonal',
          strokeColor: styleDefaults.strokeColor,
        })
        applyStrokeDefaults(connector, styleDefaults)
        connector.startBinding = { elementId: drag.startBinding.elementId, anchor: drag.startBinding.anchor, gap: 8 }
        connector.endBinding = { elementId: endBinding.elementId, anchor: endBinding.anchor, gap: 8 }
        addElement(connector)
        recordHistory('Create connector', [{ kind: 'add', element: connector }], [{ kind: 'delete', ids: [connector.id] }])
        setSelection([connector.id])
        markDirty()
      }
    } else if (drag.kind === 'drag') {
      const historyOps = movementHistoryOps(s.elements, drag.originals)
      const moved = historyOps.forward.length > 0
      if (moved) {
        setSelectionToolbarDismissed(false)
      } else if (drag.startedOnSelected) {
        setSelectionToolbarDismissed(value => !value)
      }
      if (moved) {
        recordHistory('Move selection', historyOps.forward, historyOps.reverse)
      }
      // Comment inspector — open ONLY on pure click (no drag) on a single comment.
      // Drag must NOT open it. Click on the same comment again toggles it.
      const ids = drag.moveIds
      if (ids.length === 1) {
        const target = s.elements.find(el => el.id === ids[0])
        if (target?.type === 'comment') {
          const ui = useUIStore.getState()
          if (!moved) {
            ui.setCommentInspectorId(ui.commentInspectorId === target.id ? null : target.id)
          } else if (ui.commentInspectorId === target.id) {
            ui.setCommentInspectorId(null)
          }
        } else {
          // Clicked/dragged a different element type — close any open comment inspector.
          useUIStore.getState().setCommentInspectorId(null)
        }
      } else {
        useUIStore.getState().setCommentInspectorId(null)
      }
    } else if (drag.kind === 'resize') {
      const current = useCanvasStore.getState().elements.find(el => el.id === drag.original.id)
      if (current) {
        const currentBoundText = drag.boundTextOriginal
          ? boundTextForContainer(useCanvasStore.getState().elements, drag.original.id)
          : null
        const forward: Op[] = [
          ({ kind: 'update', id: current.id, patch: resizeHistoryPatch(current) } as Op),
        ]
        const reverse: Op[] = [
          ({ kind: 'update', id: drag.original.id, patch: resizeHistoryPatch(drag.original) } as Op),
        ]
        if (drag.boundTextOriginal && currentBoundText) {
          forward.push({ kind: 'update', id: currentBoundText.id, patch: resizeHistoryPatch(currentBoundText) } as Op)
          reverse.push({ kind: 'update', id: drag.boundTextOriginal.id, patch: resizeHistoryPatch(drag.boundTextOriginal) } as Op)
        }
        recordHistory(
          'Resize element',
          forward,
          reverse,
        )
      }
    } else if (drag.kind === 'resize-selection') {
      const currentElements = useCanvasStore.getState().elements
      const forward: Op[] = []
      const reverse: Op[] = []
      for (const [id, original] of drag.originals) {
        const current = currentElements.find(el => el.id === id)
        if (!current) continue
        if (current.x === original.x && current.y === original.y && current.width === original.width && current.height === original.height) continue
        forward.push({ kind: 'update', id, patch: scaleHistoryPatch(current) } as Op)
        reverse.push({ kind: 'update', id, patch: scaleHistoryPatch(original) } as Op)
      }
      recordHistory('Resize selection', forward, reverse)
      if (forward.length > 0) markDirty()
    } else if (drag.kind === 'resize-selection-edge') {
      const currentElements = useCanvasStore.getState().elements
      const forward: Op[] = []
      const reverse: Op[] = []
      for (const [id, original] of drag.originals) {
        const current = currentElements.find(el => el.id === id)
        if (!current) continue
        if (current.x === original.x && current.y === original.y && current.width === original.width && current.height === original.height) continue
        forward.push({ kind: 'update', id, patch: scaleHistoryPatch(current) } as Op)
        reverse.push({ kind: 'update', id, patch: scaleHistoryPatch(original) } as Op)
      }
      recordHistory('Resize selection', forward, reverse)
      if (forward.length > 0) markDirty()
    } else if (drag.kind === 'select-box') {
      const box = normalizeBox(drag.start, drag.current)
      // Los elementos 'group' no son candidatos directos del marquee: sus hijos
      // dentro del box ya resuelven al grupo via normalizeGroupSelectionIds.
      // (Evita seleccionar groups huerfanos/desfasados por su bbox vacio.)
      const ids = normalizeGroupSelectionIds(s.elements, s.elements.filter(el => {
        if (el.type === 'group') return false
        const b = bboxFromElement(el)
        return b.minX >= box.minX && b.maxX <= box.maxX && b.minY >= box.minY && b.maxY <= box.maxY
      }).map(el => el.id))
      setSelection(ids)
    }
    dragRef.current = { kind: 'none' }
    setSnapGuides([])
    setHoverCursor(null)
    setRenderTick(t => t + 1)
  }, [addElement, clearSelection, freehandPointsFromEvent, markDirty, palette, recordHistory, setActiveTool, setSelection, styleDefaults, worldPointFromEvent])

  const handleDoubleClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const world = worldPointFromEvent(event)
    const hit = pickElement(useCanvasStore.getState().elements, world, useCanvasStore.getState().camera.zoom)
    if (!hit) return
    // Drill-in estilo Miro: si el grupo esta seleccionado, doble click sobre un
    // hijo selecciona el hijo individual (click simple selecciona el grupo).
    if (hit.groupId && useCanvasStore.getState().selectedIds.has(hit.groupId)) {
      setSelection([hit.id])
      setRenderTick(t => t + 1)
      return
    }
    if (hit.locked) {
      setSelection([hit.id])
      return
    }
    if (hit.type === 'text' || hit.type === 'sticky') {
      setSelection([hit.id])
      setEditing(hit.id)
      return
    }
    if (hit.type === 'connector') {
      setSelection([hit.id])
      const label = window.prompt('Connector label', hit.label ?? '')
      if (label != null) {
        commitAndApply(
          'Update connector label',
          [({ kind: 'update', id: hit.id, patch: { label } } as Op)],
          [({ kind: 'update', id: hit.id, patch: { label: hit.label } } as Op)],
        )
      }
      return
    }
    if (hit.type === 'embed') {
      setSelection([hit.id])
      openCanvasUrl(hit.url)
      return
    }
    if (hit.type === 'comment') {
      setSelection([hit.id])
      useUIStore.getState().setCommentInspectorId(hit.id)
      return
    }
    if (isShape(hit)) {
      const existing = useCanvasStore.getState().elements.find(el => el.type === 'text' && (el as TextElement).containerId === hit.id) as TextElement | undefined
      if (existing) {
        setSelection([hit.id])
        setEditing(existing.id)
        return
      }
      const text = createBoundTextForShape(hit, styleDefaults, palette)
      addElement(text)
      recordHistory('Add shape label', [{ kind: 'add', element: text }], [{ kind: 'delete', ids: [text.id] }])
      setSelection([hit.id])
      setEditing(text.id)
      markDirty()
    }
  }, [addElement, commitAndApply, markDirty, palette, recordHistory, setEditing, setSelection, styleDefaults.fontFamily, styleDefaults.fontSize, worldPointFromEvent])

  return { handlePointerDown, handlePointerMove, handlePointerUp, handleDoubleClick }
}
