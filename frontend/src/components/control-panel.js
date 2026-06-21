import { LitElement, html } from 'lit';
import './job-queue.js';

export class ControlPanel extends LitElement {
  static properties = {
    templates: { type: Array },
    hasCachedUpsample: { type: Boolean },
    
    prompt: { type: String },
    magicPrompt: { type: Boolean },
    bypassUpsample: { type: Boolean },
    selectedTemplate: { type: String },
    advancedMode: { type: Boolean },
    endpoints: { type: Array },
    selectedEndpoint: { type: String },
    providerSchemas: { type: Object },
    providerParams: { type: Object },
    selectedUpsampler: { type: String },
    isEditing: { type: Boolean },

    jobQueue: { type: Array },
    selectedJobId: { type: String },
    activeLeftTab: { type: String },
    isJsonMode: { type: Boolean }
  };

  createRenderRoot() {
    return this;
  }

  constructor() {
    super();
    this.templates = [];
    this.hasCachedUpsample = false;
    
    this.prompt = '';
    this.magicPrompt = true;
    this.bypassUpsample = false;
    this.selectedTemplate = '';
    this.advancedMode = false;
    this.endpoints = [];
    this.selectedEndpoint = '';
    this.providerSchemas = {};
    this.providerParams = {};
    this.selectedUpsampler = '';
    this.isEditing = false;

    this.jobQueue = [];
    this.selectedJobId = '';
    this.activeLeftTab = 'generator';
    this.isJsonMode = false;
  }

  onPromptInput(e) {
    this.prompt = e.target.value;
    
    // Smart auto-detection of JSON
    const trimmed = this.prompt.trim();
    const looksLikeJson = (trimmed.startsWith('{') && trimmed.endsWith('}')) || 
                          (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
                          trimmed.startsWith('```json') || 
                          (trimmed.startsWith('```') && (trimmed.includes('{') || trimmed.includes('[')));
    
    if (looksLikeJson && !this.isJsonMode) {
      this.isJsonMode = true;
      this.dispatchEvent(new CustomEvent('is-json-change', { detail: true }));
    } else if (!looksLikeJson && this.isJsonMode && trimmed === '') {
      this.isJsonMode = false;
      this.dispatchEvent(new CustomEvent('is-json-change', { detail: false }));
    }

    this.dispatchEvent(new CustomEvent('prompt-change', { detail: this.prompt }));
  }

  onJsonModeToggle(e) {
    this.isJsonMode = e.target.checked;
    this.dispatchEvent(new CustomEvent('is-json-change', { detail: this.isJsonMode }));
  }

  onMagicToggle(e) {
    this.magicPrompt = e.target.checked;
    this.dispatchEvent(new CustomEvent('magic-change', { detail: this.magicPrompt }));
  }

  onBypassToggle(e) {
    this.bypassUpsample = e.target.checked;
    this.dispatchEvent(new CustomEvent('bypass-change', { detail: this.bypassUpsample }));
  }

  onTemplateChange(e) {
    this.selectedTemplate = e.target.value;
    this.dispatchEvent(new CustomEvent('template-change', { detail: this.selectedTemplate }));
  }

  onUpsamplerChange(e) {
    this.selectedUpsampler = e.target.value;
    this.dispatchEvent(new CustomEvent('upsampler-change', { detail: this.selectedUpsampler }));
  }

  onAdvancedToggle(e) {
    this.advancedMode = e.target.checked;
    this.dispatchEvent(new CustomEvent('advanced-change', { detail: this.advancedMode }));
  }

  onEndpointChange(e) {
    this.selectedEndpoint = e.target.value;
    this.dispatchEvent(new CustomEvent('endpoint-change', { detail: this.selectedEndpoint }));
  }

  onDynamicInput(inputId, definition, event) {
    let value = definition.type === 'checkbox' ? event.target.checked : event.target.value;
    if (definition.type === 'number' || definition.type === 'slider' || definition.type === 'range') {
      value = value === '' ? '' : Number(value);
    } else if (definition.type === 'select') {
      const option = (definition.options || []).find(item => String(item.value) === String(value));
      if (option && typeof option.value !== 'string') value = option.value;
    }
    this.providerParams = { ...this.providerParams, [inputId]: value };
    this.dispatchEvent(new CustomEvent('provider-params-change', { detail: this.providerParams }));
  }

  isInputVisible(definition) {
    if (!definition.visible_when) return true;
    return Object.entries(definition.visible_when).every(([key, expected]) => this.providerParams[key] === expected);
  }

  renderDynamicInput(inputId, definition) {
    if (!definition || !this.isInputVisible(definition)) return html``;
    const value = this.providerParams[inputId] ?? definition.default ?? '';
    if (definition.type === 'select') {
      return html`
        <label class="section-label" for="provider-${inputId}">${definition.label}</label>
        <select id="provider-${inputId}" .value="${String(value)}" @change="${event => this.onDynamicInput(inputId, definition, event)}">
          ${(definition.options || []).map(option => html`
            <option value="${String(option.value)}" ?selected="${String(value) === String(option.value)}">${option.label}</option>
          `)}
        </select>
      `;
    }
    if (definition.type === 'checkbox') {
      return html`
        <div class="checkbox-wrapper">
          <input id="provider-${inputId}" type="checkbox" .checked="${Boolean(value)}" @change="${event => this.onDynamicInput(inputId, definition, event)}">
          <label class="checkbox-label" for="provider-${inputId}">
            <span class="checkbox-custom"></span>
            <span class="label-title">${definition.label}</span>
          </label>
        </div>
      `;
    }
    const inputType = definition.type === 'slider' || definition.type === 'range' ? 'range' : definition.type;
    return html`
      <label class="section-label" for="provider-${inputId}">${definition.label}</label>
      <input
        id="provider-${inputId}"
        type="${inputType}"
        .value="${String(value)}"
        min="${definition.min ?? ''}"
        max="${definition.max ?? ''}"
        step="${definition.step ?? ''}"
        placeholder="${definition.placeholder ?? ''}"
        @input="${event => this.onDynamicInput(inputId, definition, event)}">
    `;
  }

  renderDynamicSettings() {
    const schema = this.providerSchemas?.[this.selectedEndpoint];
    if (!schema) return html``;
    return html`
      ${(schema.layout || []).map(row => html`
        <div class="panel-section" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0.75rem;">
          ${(row.fields || []).map(cell => {
            const definition = schema.inputs?.[cell.id];
            if (!definition || !this.isInputVisible(definition)) return html``;
            return html`
              <div style="grid-column:span ${Math.min(Number(cell.col_span) || 1, 2)};">
                ${this.renderDynamicInput(cell.id, definition)}
              </div>
            `;
          })}
        </div>
      `)}
    `;
  }

  triggerGenerate() {
    if (!this.prompt.trim()) {
      alert("Please enter a prompt idea first!");
      return;
    }
    this.dispatchEvent(new CustomEvent('generate', {
      detail: {
        prompt: this.prompt,
        magicPrompt: this.magicPrompt,
        bypassUpsample: this.bypassUpsample,
        selectedTemplate: this.selectedTemplate,
        upsampler: this.selectedUpsampler,
        advancedMode: this.advancedMode,
        endpoint: this.selectedEndpoint,
        providerParams: this.providerParams,
        isJsonMode: this.isJsonMode
      }
    }));
  }

  switchLeftTab(tabName) {
    this.dispatchEvent(new CustomEvent('left-tab-change', { detail: tabName }));
  }

  render() {
    const activeCount = (this.jobQueue || []).filter(j => j.status !== 'completed' && j.status !== 'failed').length;
    const hasActiveJobs = (this.jobQueue || []).some(j => j.status === 'upsampling' || j.status === 'generating');

    return html`
      <section class="control-panel glass-card">
        <div class="panel-tabs">
          <button class="tab-btn ${this.activeLeftTab === 'generator' ? 'active' : ''}" @click="${() => this.switchLeftTab('generator')}">Generator</button>
          <button class="tab-btn ${this.activeLeftTab === 'progress' ? 'active' : ''}" @click="${() => this.switchLeftTab('progress')}">
            Progress
            ${activeCount > 0 ? html`<span class="badge-active-count">${activeCount}</span>` : ''}
            ${hasActiveJobs ? html`<span class="glowing-dot"></span>` : ''}
          </button>
        </div>

        <!-- Tab Content: Generator -->
        <div class="control-panel-content ${this.activeLeftTab === 'generator' ? '' : 'hidden'}">
          <div class="panel-section">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
              <label for="promptInput" class="section-label" style="margin-bottom: 0;">Prompt Idea</label>
              
              <!-- JSON Mode Toggle -->
              <div class="checkbox-wrapper" style="margin-bottom: 0;">
                <input type="checkbox" id="jsonModeToggle" ?disabled="${this.isEditing}" .checked="${this.isJsonMode}" @change="${this.onJsonModeToggle}">
                <label for="jsonModeToggle" class="checkbox-label" style="font-size: 0.8rem;">
                  <span class="checkbox-custom"></span>
                  <span class="label-title">JSON Mode</span>
                </label>
              </div>
            </div>
            <textarea id="promptInput" ?disabled="${this.isEditing}" .value="${this.prompt}" @input="${this.onPromptInput}" placeholder="${this.isJsonMode ? 'Paste or enter your Ideogram 4 JSON prompt here...' : 'Describe the image you want to create in natural language... (e.g., \'a cinematic shot of a red panda wearing a tiny crown\')'}"></textarea>
            ${this.isEditing ? html`<p class="section-hint" style="color: var(--accent-purple); font-weight: 500;">Layout editor active: prompt controls are read-only here. Adjust image settings below, then use Generate Image Now in the editor.</p>` : ''}
          </div>

          <!-- Bypass Upsample Option -->
          <div id="bypassUpsampleContainer" class="panel-section bypass-upsample-section ${this.hasCachedUpsample && !this.isEditing && !this.isJsonMode ? '' : 'hidden'}">
            <div class="checkbox-wrapper">
              <input type="checkbox" id="bypassUpsampleToggle" ?disabled="${this.isEditing}" .checked="${this.bypassUpsample}" @change="${this.onBypassToggle}">
              <label for="bypassUpsampleToggle" class="checkbox-label">
                <span class="checkbox-custom"></span>
                <span class="label-title">Reuse cached generated prompt</span>
              </label>
            </div>
            <p class="section-hint">Uses the generated JSON prompt saved with this history item and skips upsampling. Editing the text prompt clears this cache.</p>
          </div>

          <!-- Advanced Mode Toggle when JSON Mode is active -->
          ${this.isJsonMode && !this.isEditing ? html`
            <div class="panel-section" style="margin-top: -0.5rem; margin-bottom: 1.25rem;">
              <div class="checkbox-wrapper">
                <input type="checkbox" id="advancedModeToggleJson" .checked="${this.advancedMode}" @change="${this.onAdvancedToggle}">
                <label for="advancedModeToggleJson" class="checkbox-label">
                  <span class="checkbox-custom"></span>
                  <span class="label-title">Advanced Editor Mode</span>
                </label>
              </div>
              <p class="section-hint">Pause to let you edit bounding boxes and layout in the director canvas before generating.</p>
            </div>
          ` : ''}

          <div class="panel-section magic-prompt-section ${this.isEditing || this.isJsonMode ? 'hidden' : ''}">
            <div class="checkbox-wrapper">
              <input type="checkbox" id="magicPromptToggle" ?disabled="${this.isEditing || this.bypassUpsample}" .checked="${this.magicPrompt}" @change="${this.onMagicToggle}">
              <label for="magicPromptToggle" class="checkbox-label">
                <span class="checkbox-custom"></span>
                  <span class="label-title">Magic Prompt</span>
              </label>
            </div>
            
            <!-- Upsampler Provider Selection -->
            <div class="template-select-wrapper ${this.magicPrompt ? '' : 'hidden'}" style="margin-top: 0.5rem; margin-bottom: 0.5rem;">
              <label for="upsamplerSelect" class="sub-label">Upsampler Provider</label>
              <select id="upsamplerSelect" ?disabled="${this.isEditing || this.bypassUpsample}" .value="${this.selectedUpsampler}" @change="${this.onUpsamplerChange}">
                ${Object.entries(this.providerSchemas || {})
                  .filter(([, schema]) => schema.type === 'upsampler')
                  .map(([id, schema]) => html`<option value="${id}" ?selected="${this.selectedUpsampler === id}">${schema.fullname || schema.displayName}</option>`)}
              </select>
            </div>
            
            ${(() => {
              const upsamplerSchema = this.providerSchemas?.[this.selectedUpsampler];
              const showTemplates = this.magicPrompt && upsamplerSchema?.engine === 'chat';
              return html`
                <div class="template-select-wrapper ${showTemplates ? '' : 'hidden'}" id="templateSelectWrapper">
                  <label for="templateSelect" class="sub-label">Template Version</label>
                  <select id="templateSelect" ?disabled="${this.isEditing || this.bypassUpsample}" .value="${this.selectedTemplate}" @change="${this.onTemplateChange}">
                    ${this.templates.map(t => html`<option value="${t.id || t}" ?selected="${this.selectedTemplate === (t.id || t)}">${t.fullname || t}</option>`)}
                  </select>
                </div>
              `;
            })()}

            <!-- Advanced Mode Toggle -->
            <div id="advancedModeContainer" class="advanced-mode-wrapper ${this.magicPrompt ? '' : 'hidden'}">
              <div class="checkbox-wrapper">
                <input type="checkbox" id="advancedModeToggle" ?disabled="${this.isEditing}" .checked="${this.advancedMode}" @change="${this.onAdvancedToggle}">
                <label for="advancedModeToggle" class="checkbox-label">
                  <span class="checkbox-custom"></span>
                  <span class="label-title">Advanced Editor Mode</span>
                </label>
              </div>
            </div>

            <p class="section-hint">Uses the configured upsampler to expand your natural prompt. Advanced mode pauses to let you edit bounding boxes and layout.</p>
          </div>

          <!-- Inference Endpoint Selector -->
          <div class="panel-section">
            <label for="endpointSelect" class="section-label">Inference Endpoint</label>
            <select id="endpointSelect" .value="${this.selectedEndpoint}" @change="${this.onEndpointChange}">
              ${Object.entries(this.providerSchemas || {})
                .filter(([, schema]) => schema.type === 'generation')
                .map(([id, schema]) => html`<option value="${id}" ?selected="${this.selectedEndpoint === id}">${schema.fullname || schema.displayName}${schema.default ? ' (default)' : ''}</option>`)}
            </select>
          </div>

          ${this.renderDynamicSettings()}

          <button id="generateBtn" class="generate-btn" ?disabled="${this.isEditing}" @click="${this.triggerGenerate}">
            <span class="btn-glow"></span>
            <span class="btn-text">${this.isEditing ? 'Use Editor Generate' : 'Generate Masterpiece'}</span>
          </button>
        </div>

        <!-- Tab Content: Progress / Queue -->
        <div class="control-panel-content ${this.activeLeftTab === 'progress' ? '' : 'hidden'}">
          <job-queue
            .jobQueue="${this.jobQueue}"
            .selectedJobId="${this.selectedJobId}"
            @select-job="${(e) => this.dispatchEvent(new CustomEvent('select-job', { detail: e.detail }))}"
            @cancel-job="${(e) => this.dispatchEvent(new CustomEvent('cancel-job', { detail: e.detail }))}"
            @clear-completed-jobs="${() => this.dispatchEvent(new CustomEvent('clear-completed-jobs'))}">
          </job-queue>
        </div>
      </section>
    `;
  }
}
customElements.define('control-panel', ControlPanel);
