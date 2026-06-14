import { LitElement, html } from 'lit';

export class BboxCanvas extends LitElement {
  static properties = {
    aspectRatio: { type: String },
    elements: { type: Array },
    selectedElementIndex: { type: Number },
    pinnedBoxIndex: { type: Number },
    backgroundImage: { type: String },
    readOnly: { type: Boolean },
    _canvasWidth: { type: Number, state: true },
    _canvasHeight: { type: Number, state: true },
    _hoveredBoxIndex: { type: Number, state: true },
    _hoveredCorner: { type: String, state: true }
  };

  createRenderRoot() {
    return this;
  }

  constructor() {
    super();
    this.aspectRatio = '1:1';
    this.elements = [];
    this.selectedElementIndex = null;
    this.pinnedBoxIndex = null;
    this.backgroundImage = '';
    this.readOnly = false;
    this._canvasWidth = 0;
    this._canvasHeight = 0;
    this._hoveredBoxIndex = null;
    this._hoveredCorner = null;
  }

  connectedCallback() {
    super.connectedCallback();
    this._resizeObserver = new ResizeObserver(() => {
      this._updateCanvasDimensions();
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
    }
  }

  firstUpdated() {
    const outer = this.querySelector('.bbox-canvas-outer');
    if (outer && this._resizeObserver) {
      this._resizeObserver.observe(outer);
    }
    this._updateCanvasDimensions();
  }

  updated(changedProperties) {
    if (changedProperties.has('aspectRatio')) {
      this._updateCanvasDimensions();
    }
  }

  _updateCanvasDimensions() {
    const outer = this.querySelector('.bbox-canvas-outer');
    if (!outer) return;

    const computedStyle = window.getComputedStyle(outer);
    const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
    const paddingRight = parseFloat(computedStyle.paddingRight) || 0;
    const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
    const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0;

    const availableWidth = outer.clientWidth - paddingLeft - paddingRight;
    const availableHeight = outer.clientHeight - paddingTop - paddingBottom;

    if (availableWidth <= 0 || availableHeight <= 0) return;

    const aspectParts = (this.aspectRatio || '1:1').split(":");
    let w = 1;
    let h = 1;
    if (aspectParts.length === 2) {
      w = Number(aspectParts[0]) || 1;
      h = Number(aspectParts[1]) || 1;
    }
    const targetAspect = w / h;
    const containerAspect = availableWidth / availableHeight;

    let canvasWidth, canvasHeight;
    if (containerAspect > targetAspect) {
      // height is limiting
      canvasHeight = availableHeight;
      canvasWidth = availableHeight * targetAspect;
    } else {
      // width is limiting
      canvasWidth = availableWidth;
      canvasHeight = availableWidth / targetAspect;
    }

    this._canvasWidth = Math.round(canvasWidth);
    this._canvasHeight = Math.round(canvasHeight);
    this.requestUpdate();
  }


  selectElement(index) {
    this.selectedElementIndex = index;
    this.dispatchEvent(new CustomEvent('element-selected', { detail: index }));
  }

  onMouseMoveBbox(e) {
    const box = e.currentTarget;
    const tooltip = box.querySelector('.bbox-tooltip');
    if (!tooltip) return;

    const width = 260;
    const height = tooltip.offsetHeight || 140;
    const gap = 15;

    // Calculate viewport-relative coordinates
    let clientX = e.clientX + gap;
    let clientY = e.clientY + gap;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Constrain horizontally
    if (clientX + width > viewportWidth - 10) {
      clientX = e.clientX - width - gap;
    }
    if (clientX < 10) {
      clientX = 10;
    }

    // Constrain vertically
    if (clientY + height > viewportHeight - 10) {
      clientY = e.clientY - height - gap;
    }
    if (clientY < 10) {
      clientY = 10;
    }

    // Temporarily position tooltip at (0, 0) relative to its containing block
    const originalLeft = tooltip.style.left;
    const originalTop = tooltip.style.top;
    tooltip.style.left = '0px';
    tooltip.style.top = '0px';

    // Measure the containing block's viewport-relative origin
    const rect = tooltip.getBoundingClientRect();
    const offsetLeft = rect.left;
    const offsetTop = rect.top;

    // Position tooltip precisely relative to its containing block origin
    tooltip.style.left = `${clientX - offsetLeft}px`;
    tooltip.style.top = `${clientY - offsetTop}px`;
  }

  onCanvasMouseMove(e) {
    const canvasEl = this.querySelector('#bboxCanvas');
    if (!canvasEl) return;

    const boxEls = canvasEl.querySelectorAll('.bbox-element');
    const pinnedIdx = (this.pinnedBoxIndex !== undefined && this.pinnedBoxIndex !== null) ? this.pinnedBoxIndex : -1;
    
    const mouseX = e.clientX;
    const mouseY = e.clientY;

    if (pinnedIdx !== -1) {
      const boxEl = canvasEl.querySelector(`.bbox-element[data-index="${pinnedIdx}"]`);
      if (boxEl) {
        const isUnboxed = boxEl.classList.contains('unboxed');
        const rect = boxEl.getBoundingClientRect();
        const distBR = Math.hypot(mouseX - rect.right, mouseY - rect.bottom);
        this._hoveredBoxIndex = pinnedIdx;
        this._hoveredCorner = (distBR < 30 && !isUnboxed) ? 'bottom-right' : 'top-left';
      } else {
        this._hoveredBoxIndex = null;
        this._hoveredCorner = null;
      }
      return;
    }

    // Prioritize selected element if mouse is inside it and close to its resize handle (within 30px)
    if (this.selectedElementIndex !== null) {
      const selectedBoxEl = canvasEl.querySelector(`.bbox-element[data-index="${this.selectedElementIndex}"]`);
      if (selectedBoxEl) {
        const isUnboxed = selectedBoxEl.classList.contains('unboxed');
        const rect = selectedBoxEl.getBoundingClientRect();
        const isInside = mouseX >= rect.left && mouseX <= rect.right &&
                         mouseY >= rect.top && mouseY <= rect.bottom;

        if (isInside) {
          const distBR = Math.hypot(mouseX - rect.right, mouseY - rect.bottom);
          if (distBR < 30 && !isUnboxed) {
            this._hoveredBoxIndex = this.selectedElementIndex;
            this._hoveredCorner = 'bottom-right';
            return;
          }
        }
      }
    }

    let minDistance = Infinity;
    let closestIndex = null;
    let closestCorner = null;

    boxEls.forEach((boxEl) => {
      const idx = parseInt(boxEl.getAttribute('data-index'), 10);
      const rect = boxEl.getBoundingClientRect();
      
      // Mouse must be inside the box boundary to consider it
      const isInside = mouseX >= rect.left && mouseX <= rect.right &&
                       mouseY >= rect.top && mouseY <= rect.bottom;

      if (!isInside) return;

      const isUnboxed = boxEl.classList.contains('unboxed');
      const distBR = Math.hypot(mouseX - rect.right, mouseY - rect.bottom);
      const distTL = Math.hypot(mouseX - rect.left, mouseY - rect.top);

      let dist;
      let corner;
      if (distBR < 30 && !isUnboxed) {
        dist = distBR;
        corner = 'bottom-right';
      } else {
        dist = distTL;
        corner = 'top-left';
      }

      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = idx;
        closestCorner = corner;
      }
    });

    if (closestIndex !== null) {
      this._hoveredBoxIndex = closestIndex;
      this._hoveredCorner = closestCorner;
    } else {
      this._hoveredBoxIndex = null;
      this._hoveredCorner = null;
    }
  }

  onCanvasMouseLeave() {
    this._hoveredBoxIndex = null;
    this._hoveredCorner = null;
  }

  onCanvasMouseDown(e) {
    if (this.readOnly) {
      if (this._hoveredBoxIndex !== null) this.selectElement(this._hoveredBoxIndex);
      return;
    }
    if (this.pinnedBoxIndex !== null && this.pinnedBoxIndex !== undefined) {
      const idx = this.pinnedBoxIndex;
      this.selectElement(idx);
      const canvasEl = this.querySelector('#bboxCanvas');
      const boxEl = canvasEl?.querySelector(`.bbox-element[data-index="${idx}"]`);
      if (boxEl) {
        const isUnboxed = boxEl.classList.contains('unboxed');
        const rect = boxEl.getBoundingClientRect();
        const distBR = Math.hypot(e.clientX - rect.right, e.clientY - rect.bottom);
        if (distBR < 30 && !isUnboxed) this.startResizing(idx, e);
        else this.startMoving(idx, e);
      }
      return;
    }
    if (this._hoveredBoxIndex !== null && this._hoveredCorner !== null) {
      e.preventDefault();
      e.stopPropagation();

      const idx = this._hoveredBoxIndex;
      this.selectElement(idx);

      if (this._hoveredCorner === 'bottom-right') {
        this.startResizing(idx, e);
      } else {
        this.startMoving(idx, e);
      }
    }
  }

  startMoving(index, e) {
    const boxEl = this.querySelector(`.bbox-element[data-index="${index}"]`);
    const canvasEl = this.querySelector('#bboxCanvas');
    if (!boxEl || !canvasEl) return;

    const startX = e.clientX;
    const startY = e.clientY;

    const parentRect = canvasEl.getBoundingClientRect();
    const startLeft = (boxEl.offsetLeft / parentRect.width) * 100;
    const startTop = (boxEl.offsetTop / parentRect.height) * 100;
    const boxWidth = (boxEl.offsetWidth / parentRect.width) * 100;
    const boxHeight = (boxEl.offsetHeight / parentRect.height) * 100;

    const handleMouseMove = (moveEvent) => {
      const dx = ((moveEvent.clientX - startX) / parentRect.width) * 100;
      const dy = ((moveEvent.clientY - startY) / parentRect.height) * 100;

      let newLeft = Math.max(0, Math.min(100 - boxWidth, startLeft + dx));
      let newTop = Math.max(0, Math.min(100 - boxHeight, startTop + dy));

      boxEl.style.left = `${newLeft}%`;
      boxEl.style.top = `${newTop}%`;
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      if (!this.elements[index].bbox) return;

      const lPct = parseFloat(boxEl.style.left);
      const tPct = parseFloat(boxEl.style.top);
      const wPct = parseFloat(boxEl.style.width || boxWidth);
      const hPct = parseFloat(boxEl.style.height || boxHeight);

      const y1 = Math.round(tPct * 10);
      const x1 = Math.round(lPct * 10);
      const y2 = Math.round((tPct + hPct) * 10);
      const x2 = Math.round((lPct + wPct) * 10);

      this.dispatchEvent(new CustomEvent('element-updated', {
        detail: {
          index,
          bbox: [
            Math.max(0, Math.min(1000, y1)),
            Math.max(0, Math.min(1000, x1)),
            Math.max(0, Math.min(1000, y2)),
            Math.max(0, Math.min(1000, x2))
          ]
        }
      }));
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }

  startResizing(index, e) {
    const boxEl = this.querySelector(`.bbox-element[data-index="${index}"]`);
    const canvasEl = this.querySelector('#bboxCanvas');
    if (!boxEl || !canvasEl) return;

    const startX = e.clientX;
    const startY = e.clientY;

    const parentRect = canvasEl.getBoundingClientRect();
    const startWidth = (boxEl.offsetWidth / parentRect.width) * 100;
    const startHeight = (boxEl.offsetHeight / parentRect.height) * 100;
    const boxLeft = (boxEl.offsetLeft / parentRect.width) * 100;
    const boxTop = (boxEl.offsetTop / parentRect.height) * 100;

    const handleMouseMove = (moveEvent) => {
      const dx = ((moveEvent.clientX - startX) / parentRect.width) * 100;
      const dy = ((moveEvent.clientY - startY) / parentRect.height) * 100;

      let newWidth = Math.max(2, Math.min(100 - boxLeft, startWidth + dx));
      let newHeight = Math.max(2, Math.min(100 - boxTop, startHeight + dy));

      boxEl.style.width = `${newWidth}%`;
      boxEl.style.height = `${newHeight}%`;
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      const wPct = parseFloat(boxEl.style.width);
      const hPct = parseFloat(boxEl.style.height);

      const y1 = Math.round(boxTop * 10);
      const x1 = Math.round(boxLeft * 10);
      const y2 = Math.round((boxTop + hPct) * 10);
      const x2 = Math.round((boxLeft + wPct) * 10);

      this.dispatchEvent(new CustomEvent('element-updated', {
        detail: {
          index,
          bbox: [
            Math.max(0, Math.min(1000, y1)),
            Math.max(0, Math.min(1000, x1)),
            Math.max(0, Math.min(1000, y2)),
            Math.max(0, Math.min(1000, x2))
          ]
        }
      }));
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }

  render() {
    let canvasStyle = '';
    if (this._canvasWidth && this._canvasHeight) {
      canvasStyle = `width: ${this._canvasWidth}px; height: ${this._canvasHeight}px;`;
    } else {
      const aspectParts = (this.aspectRatio || '1:1').split(":");
      if (aspectParts.length === 2) {
        const w = Number(aspectParts[0]) || 1;
        const h = Number(aspectParts[1]) || 1;
        canvasStyle = `aspect-ratio: ${w} / ${h}; max-width: 100%; max-height: 100%;`;
      }
    }

    if (this.backgroundImage) {
      canvasStyle += ` background-image: url('${this.backgroundImage}'); background-size: cover; background-position: center; background-repeat: no-repeat;`;
    }

    return html`
      <div class="bbox-canvas-outer">
        <div class="bbox-aspect-ratio-wrapper">
          <div id="bboxCanvas" class="bbox-canvas" style="${canvasStyle}"
               @mousemove="${this.onCanvasMouseMove}"
               @mouseleave="${this.onCanvasMouseLeave}"
               @mousedown="${this.onCanvasMouseDown}">
            ${(this.elements || []).map((element, idx) => {
              const isUnboxed = !element.bbox;
              let styleStr = '';
              if (isUnboxed) {
                let unboxedIndex = 0;
                for (let i = 0; i < idx; i++) {
                  if (!this.elements[i].bbox) unboxedIndex++;
                }
                const cols = Math.max(1, Math.floor(((this._canvasWidth || 500) - 30) / 44));
                const col = unboxedIndex % cols;
                const row = Math.floor(unboxedIndex / cols);
                const unboxedLeft = 15 + col * 44;
                const unboxedTop = 15 + row * 44;
                styleStr = `top: ${unboxedTop}px; left: ${unboxedLeft}px; width: 36px; height: 36px;`;
              } else {
                const bbox = element.bbox;
                const top = bbox[0] / 10;
                const left = bbox[1] / 10;
                const width = (bbox[3] - bbox[1]) / 10;
                const height = (bbox[2] - bbox[0]) / 10;
                styleStr = `top: ${top}%; left: ${left}%; width: ${width}%; height: ${height}%;`;
              }

              const isSelected = this.selectedElementIndex === idx;
              const isPinned = this.pinnedBoxIndex === idx;

              return html`
                <div class="bbox-element ${isUnboxed ? 'unboxed' : ''} ${isSelected ? 'active' : ''} ${this._hoveredBoxIndex === idx ? 'hovered' : ''} ${this._hoveredBoxIndex === idx && this._hoveredCorner === 'bottom-right' && !isUnboxed ? 'hovered-resize' : ''} ${isPinned ? 'pinned' : ''}"
                     data-index="${idx}"
                     style="${styleStr}"
                     @mouseenter="${this.onMouseMoveBbox}"
                     @mousemove="${this.onMouseMoveBbox}">
                  <span class="bbox-badge ${this._hoveredBoxIndex === idx && this._hoveredCorner === 'top-left' && !isUnboxed ? 'focus-hover' : ''}">${String(idx + 1).padStart(2, "0")}</span>
                  ${!isUnboxed ? html`
                    <span class="bbox-label">
                      ${element.type === 'text'
                        ? (element.text || '')
                        : (element.desc && element.desc.length > 20 ? element.desc.slice(0, 17) + '...' : (element.desc || 'Object'))}
                    </span>
                    <div class="bbox-resizer ${this._hoveredBoxIndex === idx && this._hoveredCorner === 'bottom-right' ? 'focus-hover' : ''}"></div>
                  ` : ''}
                  <div class="bbox-tooltip">
                    <div style="font-weight: 700; color: var(--accent-purple); text-transform: uppercase; font-size: 0.72rem; margin-bottom: 0.35rem; border-bottom: 1px solid var(--card-border); padding-bottom: 0.15rem;">Element #${idx + 1}</div>
                    <div style="margin-bottom: 0.25rem;"><span style="color: var(--text-secondary);">Prompt:</span> "${element.text || element.desc || 'Object'}"</div>
                    <div style="margin-bottom: 0.25rem;"><span style="color: var(--text-secondary);">Type:</span> ${element.type || 'obj'}</div>
                    <div><span style="color: var(--text-secondary);">BBox:</span> ${element.bbox ? `[${element.bbox.join(', ')}]` : 'None'}</div>
                  </div>
                </div>
              `;
            })}
          </div>
        </div>
      </div>
    `;
  }
}
customElements.define('bbox-canvas', BboxCanvas);
