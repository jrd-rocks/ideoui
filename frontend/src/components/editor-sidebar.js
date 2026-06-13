import { LitElement, html } from 'lit';
import { icon } from '../utils/icons.js';
import './ai-chat.js';

export class EditorSidebar extends LitElement {
  static properties = {
    upsampledPrompt: { type: String },
    chatMessages: { type: Array },
    isRefining: { type: Boolean },
    selectedElementIndex: { type: Number },
    pinnedBoxIndex: { type: Number },
    chatProviders: { type: Array },
    selectedChatProvider: { type: String }
  };

  createRenderRoot() {
    return this;
  }

  constructor() {
    super();
    this.upsampledPrompt = '';
    this.chatMessages = [];
    this.isRefining = false;
    this.selectedElementIndex = null;
    this.pinnedBoxIndex = null;
    this._subtab = 'Form';
    this._cachedStyleDescription = null;
    this._draftPrompt = '';
    this._draftData = null;
    this._draftDirty = false;
    this._promptDispatchTimer = null;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearTimeout(this._promptDispatchTimer);
  }

  updated(changedProps) {
    if (changedProps.has('selectedElementIndex') && this.selectedElementIndex !== null) {
      setTimeout(() => {
        const card = this.querySelector(`.element-card[data-index="${this.selectedElementIndex}"]`);
        if (card) {
          card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 50);
    }
    if (changedProps.has('upsampledPrompt')) {
      if (this._draftDirty && this.upsampledPrompt !== this._draftPrompt) {
        return;
      }
      this._draftDirty = false;
      this._draftPrompt = '';
      this._draftData = null;
      const data = this.parsedPrompt;
      if (data?.style_description) {
        this._cachedStyleDescription = data.style_description;
      }
    }
  }

  parsePrompt(promptText) {
    try {
      const data = JSON.parse(promptText || '{}');
      if (data.aspect_ratio !== undefined) {
        delete data.aspect_ratio;
      }
      if (!data.high_level_description) data.high_level_description = "";
      if (!data.compositional_deconstruction) data.compositional_deconstruction = { background: "", elements: [] };
      if (!data.compositional_deconstruction.background) data.compositional_deconstruction.background = "";
      if (!data.compositional_deconstruction.elements) data.compositional_deconstruction.elements = [];
      return data;
    } catch (e) {
      return {
        high_level_description: "",
        compositional_deconstruction: { background: "", elements: [] }
      };
    }
  }

  get parsedPrompt() {
    if (this._draftDirty) {
      if (!this._draftData) {
        this._draftData = this.parsePrompt(this._draftPrompt);
      }
      return this._draftData;
    }
    return this.parsePrompt(this.upsampledPrompt);
  }

  get activePromptText() {
    return this._draftDirty ? this._draftPrompt : (this.upsampledPrompt || '');
  }

  reorderPromptKeys(data) {
    const result = {};
    if (data.high_level_description !== undefined && data.high_level_description !== "") {
      result.high_level_description = data.high_level_description;
    }
    if (data.style_description) {
      const style = {};
      const aesthetics = data.style_description.aesthetics;
      const lighting = data.style_description.lighting;
      const photo = data.style_description.photo;
      const medium = data.style_description.medium;
      const art_style = data.style_description.art_style;
      const color_palette = data.style_description.color_palette;
      
      if (aesthetics !== undefined) style.aesthetics = aesthetics;
      if (lighting !== undefined) style.lighting = lighting;
      
      if (photo !== undefined) {
        style.photo = photo;
        if (medium !== undefined) style.medium = medium;
      } else {
        if (medium !== undefined) style.medium = medium;
        if (art_style !== undefined) style.art_style = art_style;
      }
      
      if (color_palette !== undefined && Array.isArray(color_palette)) {
        style.color_palette = color_palette;
      }
      result.style_description = style;
    }
    if (data.compositional_deconstruction) {
      const comp = {};
      if (data.compositional_deconstruction.background !== undefined) {
        comp.background = data.compositional_deconstruction.background;
      }
      if (Array.isArray(data.compositional_deconstruction.elements)) {
        comp.elements = data.compositional_deconstruction.elements.map(el => {
          const orderedEl = {};
          orderedEl.type = el.type || "obj";
          if (el.bbox !== undefined) orderedEl.bbox = el.bbox;
          if (el.type === "text") {
            orderedEl.text = el.text || "";
          }
          orderedEl.desc = el.desc || "";
          if (el.color_palette !== undefined && Array.isArray(el.color_palette)) {
            orderedEl.color_palette = el.color_palette;
          }
          return orderedEl;
        });
      }
      result.compositional_deconstruction = comp;
    }
    return result;
  }

  dispatchPromptUpdate(promptText, immediate = false) {
    clearTimeout(this._promptDispatchTimer);
    const emit = () => {
      this.dispatchEvent(new CustomEvent('update-prompt', { detail: promptText }));
    };
    if (immediate) {
      emit();
    } else {
      this._promptDispatchTimer = setTimeout(emit, 450);
    }
  }

  updatePrompt(newData, options = {}) {
    const ordered = this.reorderPromptKeys(newData);
    const str = JSON.stringify(ordered, null, 2);
    this._draftData = ordered;
    this._draftPrompt = str;
    this._draftDirty = true;
    if (options.render !== false) {
      this.requestUpdate();
    }
    this.dispatchPromptUpdate(str, options.immediate === true);
  }

  onHighLevelDescInput(e) {
    const data = this.parsedPrompt;
    data.high_level_description = e.target.value;
    this.updatePrompt(data, { render: false });
  }

  toggleStyleDescription(e) {
    const data = this.parsedPrompt;
    if (e.target.checked) {
      data.style_description = this._cachedStyleDescription || {
        aesthetics: "vibrant, highly detailed",
        lighting: "warm sunset lighting",
        medium: "photograph",
        photo: "35mm lens, f/1.8, sharp focus"
      };
    } else {
      if (data.style_description) {
        this._cachedStyleDescription = data.style_description;
      }
      delete data.style_description;
    }
    this.updatePrompt(data);
  }

  onStyleAestheticsInput(e) {
    const data = this.parsedPrompt;
    if (data.style_description) {
      data.style_description.aesthetics = e.target.value;
      this.updatePrompt(data, { render: false });
    }
  }

  onStyleLightingInput(e) {
    const data = this.parsedPrompt;
    if (data.style_description) {
      data.style_description.lighting = e.target.value;
      this.updatePrompt(data, { render: false });
    }
  }

  onStyleMediumInput(e) {
    const data = this.parsedPrompt;
    if (data.style_description) {
      data.style_description.medium = e.target.value;
      this.updatePrompt(data, { render: false });
    }
  }

  setStyleMedium(med) {
    const data = this.parsedPrompt;
    if (data.style_description) {
      data.style_description.medium = med;
      if (med === 'photograph') {
        if (data.style_description.photo === undefined) {
          data.style_description.photo = "35mm, sharp focus";
        }
        delete data.style_description.art_style;
      } else {
        if (data.style_description.art_style === undefined) {
          data.style_description.art_style = "clean vector illustration";
        }
        delete data.style_description.photo;
      }
      this.updatePrompt(data);
    }
  }

  setStyleCategory(cat) {
    const data = this.parsedPrompt;
    if (data.style_description) {
      if (cat === 'photo') {
        data.style_description.photo = data.style_description.photo || "35mm, sharp focus";
        delete data.style_description.art_style;
      } else {
        data.style_description.art_style = data.style_description.art_style || "clean vector illustration";
        delete data.style_description.photo;
      }
      this.updatePrompt(data);
    }
  }

  onStylePhotoInput(e) {
    const data = this.parsedPrompt;
    if (data.style_description) {
      data.style_description.photo = e.target.value;
      this.updatePrompt(data, { render: false });
    }
  }

  onStyleArtStyleInput(e) {
    const data = this.parsedPrompt;
    if (data.style_description) {
      data.style_description.art_style = e.target.value;
      this.updatePrompt(data, { render: false });
    }
  }

  addColor(isElement, elementIndex) {
    const data = this.parsedPrompt;
    const defaultColor = "#FFFFFF";
    
    if (!isElement) {
      if (!data.style_description) return;
      if (!data.style_description.color_palette) {
        data.style_description.color_palette = [];
      }
      if (data.style_description.color_palette.length < 16) {
        data.style_description.color_palette.push(defaultColor);
      }
    } else {
      const el = data.compositional_deconstruction.elements[elementIndex];
      if (!el) return;
      if (!el.color_palette) {
        el.color_palette = [];
      }
      if (el.color_palette.length < 5) {
        el.color_palette.push(defaultColor);
      }
    }
    this.updatePrompt(data);
  }

  removeColor(idx, isElement, elementIndex) {
    const data = this.parsedPrompt;
    
    if (!isElement) {
      if (data.style_description && data.style_description.color_palette) {
        data.style_description.color_palette.splice(idx, 1);
        if (data.style_description.color_palette.length === 0) {
          delete data.style_description.color_palette;
        }
      }
    } else {
      const el = data.compositional_deconstruction.elements[elementIndex];
      if (el && el.color_palette) {
        el.color_palette.splice(idx, 1);
        if (el.color_palette.length === 0) {
          delete el.color_palette;
        }
      }
    }
    this.updatePrompt(data);
  }

  onColorPickerChange(e, idx, isElement, elementIndex) {
    const newColor = e.target.value.toUpperCase();
    const data = this.parsedPrompt;
    
    if (!isElement) {
      if (data.style_description && data.style_description.color_palette) {
        data.style_description.color_palette[idx] = newColor;
      }
    } else {
      const el = data.compositional_deconstruction.elements[elementIndex];
      if (el && el.color_palette) {
        el.color_palette[idx] = newColor;
      }
    }
    this.updatePrompt(data);
  }

  onColorHexTextChange(e, idx, isElement, elementIndex) {
    let newColor = e.target.value.trim().toUpperCase();
    if (newColor && !newColor.startsWith("#")) {
      newColor = "#" + newColor;
    }
    
    const isValidHex = /^#[0-9A-F]{6}$/.test(newColor);
    const data = this.parsedPrompt;
    
    if (isValidHex) {
      if (!isElement) {
        if (data.style_description && data.style_description.color_palette) {
          data.style_description.color_palette[idx] = newColor;
        }
      } else {
        const el = data.compositional_deconstruction.elements[elementIndex];
        if (el && el.color_palette) {
          el.color_palette[idx] = newColor;
        }
      }
      this.updatePrompt(data);
    } else {
      e.target.value = !isElement 
        ? data.style_description.color_palette[idx] 
        : data.compositional_deconstruction.elements[elementIndex].color_palette[idx];
    }
  }

  renderColorPalette(colors, isElement, elementIndex, maxColors) {
    colors = colors || [];
    return html`
      <div class="color-palette-container">
        <div class="color-pills-list">
          ${colors.map((color, idx) => html`
            <div class="color-pill">
               <div class="color-swatch-wrapper">
                 <div class="color-swatch" style="background-color: ${color};"></div>
                 <input type="color" .value="${color.toLowerCase()}" @input="${(e) => this.onColorPickerChange(e, idx, isElement, elementIndex)}">
               </div>
               <input type="text" class="color-hex-input" .value="${color}" @change="${(e) => this.onColorHexTextChange(e, idx, isElement, elementIndex)}" placeholder="#RRGGBB" maxlength="7">
               <button class="color-remove-btn" @click="${() => this.removeColor(idx, isElement, elementIndex)}" title="Remove color">&times;</button>
            </div>
          `)}
          ${colors.length < maxColors ? html`
            <button class="color-add-btn" @click="${() => this.addColor(isElement, elementIndex)}">
              ${icon('plus', 12)}
              Add Color
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  onBackgroundInput(e) {
    const data = this.parsedPrompt;
    data.compositional_deconstruction.background = e.target.value;
    this.updatePrompt(data, { render: false });
  }

  onRawJsonInput(e) {
    this._draftPrompt = e.target.value;
    this._draftData = null;
    this._draftDirty = true;
  }

  syncFromJson() {
    try {
      const parsed = JSON.parse(this.activePromptText);
      this.updatePrompt(parsed);
      alert("GUI synced successfully from raw JSON!");
    } catch (e) {
      alert("Invalid JSON format! Please fix syntax errors first.");
    }
  }

  onElementTypeChange(idx, e) {
    const data = this.parsedPrompt;
    const element = data.compositional_deconstruction.elements[idx];
    element.type = e.target.value;
    if (element.type === 'text') {
      element.text = element.text || "TEXT";
    } else {
      delete element.text;
    }
    this.updatePrompt(data);
  }

  onElementTextInput(idx, e) {
    const data = this.parsedPrompt;
    data.compositional_deconstruction.elements[idx].text = e.target.value;
    this.updatePrompt(data, { render: false });
  }

  onElementDescInput(idx, e) {
    const data = this.parsedPrompt;
    data.compositional_deconstruction.elements[idx].desc = e.target.value;
    this.updatePrompt(data, { render: false });
  }

  deleteElement(idx) {
    if (confirm("Delete this element box?")) {
      const data = this.parsedPrompt;
      data.compositional_deconstruction.elements.splice(idx, 1);
      this.dispatchEvent(new CustomEvent('element-selected', { detail: null }));
      this.updatePrompt(data);
    }
  }

  togglePinElement(idx, e) {
    e.stopPropagation();
    const isCurrentlyPinned = this.pinnedBoxIndex === idx;
    const newPinnedIndex = isCurrentlyPinned ? null : idx;
    
    if (newPinnedIndex !== null) {
      this.selectElement(idx);
    }
    
    this.dispatchEvent(new CustomEvent('element-pinned', { detail: newPinnedIndex }));
  }

  setSubtab(tab) {
    this._subtab = tab;
    this.requestUpdate();
  }

  selectElement(idx) {
    this.dispatchEvent(new CustomEvent('element-selected', { detail: idx }));
  }

  render() {
    const data = this.parsedPrompt;
    const elements = data.compositional_deconstruction.elements || [];

    return html`
      <div class="editor-subtabs">
        <button class="subtab-btn ${this._subtab === 'Form' ? 'active' : ''}" @click="${() => this.setSubtab('Form')}">Composition</button>
        <button class="subtab-btn ${this._subtab === 'RawJson' ? 'active' : ''}" @click="${() => this.setSubtab('RawJson')}">Raw JSON</button>
        <button class="subtab-btn ${this._subtab === 'AiChat' ? 'active' : ''}" @click="${() => this.setSubtab('AiChat')}">AI Assistant</button>
      </div>

      <div class="subtab-contents">
        <!-- Subtab: Composition Form -->
        <div id="contentSubtabForm" class="subtab-content-panel ${this._subtab === 'Form' ? '' : 'hidden'}">
          
          <div class="form-group">
            <label for="editorHighLevelDesc" class="sub-label">High Level Description</label>
            <textarea id="editorHighLevelDesc" class="editor-textarea-sm" placeholder="Overall scene style, medium, composition..." .value="${data.high_level_description || ''}" @input="${this.onHighLevelDescInput}"></textarea>
          </div>

          <!-- Style Description Collapsible Section -->
          <div class="form-group" style="border-top: 1px solid var(--card-border); padding-top: 0.75rem;">
            <label class="checkbox-wrapper">
              <input type="checkbox" ?checked="${data.style_description !== undefined}" @change="${this.toggleStyleDescription}">
              <div class="checkbox-label" style="font-size: 0.8rem;">
                <span class="checkbox-custom"></span>
                <span>Include Style Description</span>
              </div>
            </label>
          </div>

          ${data.style_description !== undefined ? html`
            <div class="style-description-fields" style="background: var(--overlay-bg); border: 1px solid var(--overlay-border); padding: 0.75rem; border-radius: 8px; display: flex; flex-direction: column; gap: 0.75rem; margin-top: -0.25rem;">
              <div class="form-group">
                <label class="sub-label">Aesthetics</label>
                <input type="text" class="element-card-text" placeholder="moody, cinematic, desaturated..." .value="${data.style_description.aesthetics || ''}" @input="${this.onStyleAestheticsInput}">
              </div>
              <div class="form-group">
                <label class="sub-label">Lighting</label>
                <input type="text" class="element-card-text" placeholder="golden hour, studio lighting..." .value="${data.style_description.lighting || ''}" @input="${this.onStyleLightingInput}">
              </div>
              <div class="form-group">
                <label class="sub-label">Medium</label>
                <input type="text" class="element-card-text" placeholder="photograph, painting, illustration..." .value="${data.style_description.medium || ''}" @input="${this.onStyleMediumInput}">
                <div class="suggestion-chips">
                  ${['photograph', 'illustration', '3d_render', 'painting', 'graphic_design'].map(med => html`
                    <button class="chip-btn" @click="${() => this.setStyleMedium(med)}">${med.replace('_', ' ')}</button>
                  `)}
                </div>
              </div>
              <div class="form-group">
                <label class="sub-label">Style Category</label>
                <div class="segmented-control">
                  <button class="segment-btn ${data.style_description.photo !== undefined ? 'active' : ''}" @click="${() => this.setStyleCategory('photo')}">Photo</button>
                  <button class="segment-btn ${data.style_description.art_style !== undefined ? 'active' : ''}" @click="${() => this.setStyleCategory('art_style')}">Art Style</button>
                </div>
              </div>
              ${data.style_description.photo !== undefined ? html`
                <div class="form-group">
                  <label class="sub-label">Camera &amp; Lens Details (Photo)</label>
                  <textarea class="editor-textarea-sm" placeholder="e.g. 35mm, f/1.4, shallow depth of field, bokeh" style="height: 40px;" .value="${data.style_description.photo || ''}" @input="${this.onStylePhotoInput}"></textarea>
                </div>
              ` : html`
                <div class="form-group">
                  <label class="sub-label">Art Style Details</label>
                  <textarea class="editor-textarea-sm" placeholder="e.g. flat vector, bold outlines, sketch, matte color" style="height: 40px;" .value="${data.style_description.art_style || ''}" @input="${this.onStyleArtStyleInput}"></textarea>
                </div>
              `}
              <div class="form-group">
                <label class="sub-label">Style Color Palette (Max 16)</label>
                ${this.renderColorPalette(data.style_description.color_palette, false, null, 16)}
              </div>
            </div>
          ` : ''}

          <div class="form-group" style="border-top: 1px solid var(--card-border); padding-top: 0.75rem;">
            <label for="editorBackground" class="sub-label">Scene Background</label>
            <textarea id="editorBackground" class="editor-textarea-sm" placeholder="Background details, lighting, weather..." .value="${data.compositional_deconstruction.background || ''}" @input="${this.onBackgroundInput}"></textarea>
          </div>

          <div class="elements-list-header">
            <span class="sub-label">Elements &amp; Bounding Boxes</span>
          </div>

          <div id="editorElementsList" class="editor-elements-list">
            ${elements.map((element, idx) => {
              const isSelected = this.selectedElementIndex === idx;
              return html`
                <div class="element-card ${isSelected ? 'active' : ''}" data-index="${idx}" @click="${() => this.selectElement(idx)}">
                  <div class="element-card-header">
                    <div class="element-card-title">
                      <span class="element-card-badge">${String(idx + 1).padStart(2, "0")}</span>
                      <select class="element-card-type-select" .value="${element.type || 'obj'}" @change="${(e) => this.onElementTypeChange(idx, e)}">
                        <option value="obj">Object</option>
                        <option value="text">Text</option>
                      </select>
                    </div>
                    <div class="element-card-actions">
                      <button class="element-card-btn focus ${this.pinnedBoxIndex === idx ? 'pinned' : ''}" title="${this.pinnedBoxIndex === idx ? 'Pinned (Click to Unpin)' : 'Pin Focus on Canvas'}" @click="${(e) => this.togglePinElement(idx, e)}">
                        ${icon('search', 12)}
                      </button>
                      <button class="element-card-btn delete" title="Delete element" @click="${(e) => { e.stopPropagation(); this.deleteElement(idx); }}">
                        ${icon('trash', 12)}
                      </button>
                    </div>
                  </div>
                  <input type="text" class="element-card-text ${element.type === 'text' ? '' : 'hidden'}" placeholder="Exact characters to render..." .value="${element.text || ''}" @input="${(e) => this.onElementTextInput(idx, e)}">
                  <textarea class="element-card-desc" placeholder="Details, color, pose..." .value="${element.desc || ''}" @input="${(e) => this.onElementDescInput(idx, e)}"></textarea>
                  
                  <div class="form-group" style="margin-top: 0.35rem; border-top: 1px solid var(--card-border); padding-top: 0.5rem;">
                    <label class="sub-label" style="font-size: 0.65rem;">Element Color Palette (Max 5)</label>
                    ${this.renderColorPalette(element.color_palette, true, idx, 5)}
                  </div>
                </div>
              `;
            })}
          </div>
        </div>

        <!-- Subtab: Raw JSON -->
        <div id="contentSubtabRawJson" class="subtab-content-panel ${this._subtab === 'RawJson' ? '' : 'hidden'}">
          <textarea id="editorRawJson" class="editor-textarea-mono" placeholder="Raw JSON caption..." .value="${this.activePromptText}" @input="${this.onRawJsonInput}"></textarea>
          <div class="subtab-actions">
            <button id="syncFromJsonBtn" class="editor-btn-secondary" @click="${this.syncFromJson}">Sync to Box GUI</button>
          </div>
        </div>

        <!-- Subtab: AI Chat -->
        <div id="contentSubtabAiChat" class="subtab-content-panel ${this._subtab === 'AiChat' ? '' : 'hidden'}">
          <ai-chat
            .chatMessages="${this.chatMessages}"
            .isRefining="${this.isRefining}"
            .chatProviders="${this.chatProviders}"
            .selectedChatProvider="${this.selectedChatProvider}"
            @chat-provider-change="${(e) => this.dispatchEvent(new CustomEvent('chat-provider-change', { detail: e.detail }))}"
            @send-chat="${(e) => this.dispatchEvent(new CustomEvent('send-chat', { detail: e.detail }))}">
          </ai-chat>
        </div>
      </div>
    `;
  }
}
customElements.define('editor-sidebar', EditorSidebar);
