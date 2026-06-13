import { LitElement, html } from 'lit';
import { icon } from '../utils/icons.js';
import './bbox-canvas.js';

export class LayoutEditor extends LitElement {
  static properties = {
    upsampledPrompt: { type: String },
    aspectRatio: { type: String },
    backgroundImage: { type: String },
    selectedElementIndex: { type: Number },
    pinnedBoxIndex: { type: Number },
    readOnly: { type: Boolean }
  };

  createRenderRoot() {
    return this;
  }

  constructor() {
    super();
    this.upsampledPrompt = '';
    this.backgroundImage = '';
    this.selectedElementIndex = null;
    this.pinnedBoxIndex = null;
    this.readOnly = false;
    this._boundKeyDown = (event) => this.onKeyDown(event);
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('keydown', this._boundKeyDown);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('keydown', this._boundKeyDown);
  }

  get parsedPrompt() {
    try {
      const data = JSON.parse(this.upsampledPrompt);
      if (data.aspect_ratio !== undefined) {
        delete data.aspect_ratio;
      }
      if (!data.compositional_deconstruction) data.compositional_deconstruction = { background: "", elements: [] };
      if (!data.compositional_deconstruction.elements) data.compositional_deconstruction.elements = [];
      return data;
    } catch (e) {
      return {
        compositional_deconstruction: { background: "", elements: [] }
      };
    }
  }

  updatePrompt(newData) {
    this.upsampledPrompt = JSON.stringify(newData);
    this.dispatchEvent(new CustomEvent('update-prompt', { detail: this.upsampledPrompt }));
  }

  isTypingTarget(target) {
    if (!target) return false;
    const tag = target.tagName?.toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
  }

  onKeyDown(e) {
    const key = e.key.toLowerCase();
    const typing = this.isTypingTarget(document.activeElement);

    if ((e.ctrlKey || e.metaKey) && key === 'z') {
      e.preventDefault();
      this.dispatchEvent(new CustomEvent(e.shiftKey ? 'editor-redo' : 'editor-undo'));
      return;
    }
    if ((e.ctrlKey || e.metaKey) && (key === 'y')) {
      e.preventDefault();
      this.dispatchEvent(new CustomEvent('editor-redo'));
      return;
    }
    if ((e.ctrlKey || e.metaKey) && key === 'd') {
      e.preventDefault();
      if (!this.readOnly) this.duplicateSelected();
      return;
    }

    if (typing) return;

    if (key === 'p' || key === 'l') {
      e.preventDefault();
      this.toggleSelectedPin();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      this.cyclePin();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      this.dispatchEvent(new CustomEvent('element-pinned', { detail: null }));
      this.dispatchEvent(new CustomEvent('element-selected', { detail: null }));
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && !this.readOnly) {
      e.preventDefault();
      this.deleteSelected();
    }
  }

  onElementSelected(e) {
    // Bubble the selection up so app-root can sync the sidebar
    this.dispatchEvent(new CustomEvent('element-selected', { detail: e.detail }));
  }

  onElementUpdated(e) {
    if (this.readOnly) return;
    const { index, bbox } = e.detail;
    const data = this.parsedPrompt;
    data.compositional_deconstruction.elements[index].bbox = bbox;
    this.updatePrompt(data);
  }

  addElement() {
    if (this.readOnly) return;
    const data = this.parsedPrompt;
    const newElement = {
      type: "obj",
      bbox: [350, 350, 650, 650],
      desc: "a new element box"
    };
    data.compositional_deconstruction.elements.push(newElement);
    this.updatePrompt(data);
    const newIdx = data.compositional_deconstruction.elements.length - 1;
    this.dispatchEvent(new CustomEvent('element-selected', { detail: newIdx }));
  }

  deleteSelected() {
    if (this.readOnly || this.selectedElementIndex === null) return;
    const data = this.parsedPrompt;
    const elements = data.compositional_deconstruction.elements || [];
    if (!elements[this.selectedElementIndex]) return;
    elements.splice(this.selectedElementIndex, 1);
    this.dispatchEvent(new CustomEvent('element-selected', { detail: null }));
    this.dispatchEvent(new CustomEvent('element-pinned', { detail: null }));
    this.updatePrompt(data);
  }

  duplicateSelected() {
    if (this.readOnly || this.selectedElementIndex === null) return;
    const data = this.parsedPrompt;
    const elements = data.compositional_deconstruction.elements || [];
    const source = elements[this.selectedElementIndex];
    if (!source) return;
    const clone = JSON.parse(JSON.stringify(source));
    const bbox = clone.bbox || [350, 350, 650, 650];
    clone.bbox = [
      Math.min(1000, bbox[0] + 30),
      Math.min(1000, bbox[1] + 30),
      Math.min(1000, bbox[2] + 30),
      Math.min(1000, bbox[3] + 30)
    ];
    elements.splice(this.selectedElementIndex + 1, 0, clone);
    this.updatePrompt(data);
    this.dispatchEvent(new CustomEvent('element-selected', { detail: this.selectedElementIndex + 1 }));
  }

  toggleSelectedPin() {
    if (this.selectedElementIndex === null) return;
    const next = this.pinnedBoxIndex === this.selectedElementIndex ? null : this.selectedElementIndex;
    this.dispatchEvent(new CustomEvent('element-pinned', { detail: next }));
  }

  cyclePin() {
    const elements = this.parsedPrompt.compositional_deconstruction.elements || [];
    if (!elements.length) return;
    const base = this.pinnedBoxIndex ?? this.selectedElementIndex;
    if (base === null || base === undefined) return;
    const next = (base + 1) % elements.length;
    this.dispatchEvent(new CustomEvent('element-selected', { detail: next }));
    this.dispatchEvent(new CustomEvent('element-pinned', { detail: next }));
  }

  discardJob() {
    if (confirm("Discard this generation job?")) {
      this.dispatchEvent(new CustomEvent('cancel'));
    }
  }

  generateImage() {
    this.dispatchEvent(new CustomEvent('generate'));
  }

  render() {
    const data = this.parsedPrompt;
    const elements = data.compositional_deconstruction.elements || [];

    return html`
      <div id="editorPanel" class="editor-panel">
        <div class="editor-header">
          <h3>✨ Advanced Layout Director</h3>
          <p class="editor-subtitle">${this.readOnly ? 'Inspect the saved layout. Your first edit will create a new draft.' : 'Drag bounding boxes to compose your scene. Use the panel on the right to edit descriptions and chat with the AI.'}</p>
        </div>

        <!-- Canvas takes all available vertical space -->
        <div class="editor-canvas-column">
          <bbox-canvas
            .aspectRatio="${this.aspectRatio || "1:1"}"
            .elements="${elements}"
            .selectedElementIndex="${this.selectedElementIndex}"
            .pinnedBoxIndex="${this.pinnedBoxIndex}"
            .backgroundImage="${this.backgroundImage}"
            .readOnly="${this.readOnly}"
            @element-selected="${this.onElementSelected}"
            @element-updated="${this.onElementUpdated}">
          </bbox-canvas>
          <div class="canvas-actions">
            <button id="undoEditorBtn" class="editor-btn-secondary" @click="${() => this.dispatchEvent(new CustomEvent('editor-undo'))}" ?disabled="${this.readOnly}" title="Undo">
              Undo
            </button>
            <button id="redoEditorBtn" class="editor-btn-secondary" @click="${() => this.dispatchEvent(new CustomEvent('editor-redo'))}" ?disabled="${this.readOnly}" title="Redo">
              Redo
            </button>
            <button id="duplicateBoxBtn" class="editor-btn-secondary" @click="${this.duplicateSelected}" ?disabled="${this.readOnly || this.selectedElementIndex === null}" title="Duplicate selected box">
              Duplicate
            </button>
            <button id="deleteBoxBtn" class="editor-btn-secondary" @click="${this.deleteSelected}" ?disabled="${this.readOnly || this.selectedElementIndex === null}" title="Delete selected box">
              Delete
            </button>
            <button id="addBoxBtn" class="editor-btn-secondary" @click="${this.addElement}" ?disabled="${this.readOnly}">
              ${icon('plus', 14)}
              Add Element Box
            </button>
          </div>
        </div>

        <!-- Bottom Actions Bar -->
        <div class="editor-actions-bar">
          <button id="editorCancelBtn" class="editor-btn-cancel" @click="${this.discardJob}">${this.readOnly ? 'Close Inspector' : 'Discard Job'}</button>
          <div class="right-actions">
            <button id="editorGenerateBtn" class="generate-btn" @click="${this.generateImage}" ?disabled="${this.readOnly}">
              <span class="btn-glow"></span>
              <span class="btn-text">Generate Image Now</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }
}
customElements.define('layout-editor', LayoutEditor);
