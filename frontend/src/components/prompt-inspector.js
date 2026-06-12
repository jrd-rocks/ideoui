import { LitElement, html } from 'lit';
import { icon } from '../utils/icons.js';

export class PromptInspector extends LitElement {
  static properties = {
    upsampledPrompt: { type: String },
    isOpen: { type: Boolean }
  };

  createRenderRoot() {
    return this;
  }

  constructor() {
    super();
    this.upsampledPrompt = '';
    this.isOpen = false;
  }

  toggleOpen() {
    this.isOpen = !this.isOpen;
  }

  render() {
    if (!this.upsampledPrompt) return html``;

    let displayContent = this.upsampledPrompt;
    try {
      const parsed = JSON.parse(this.upsampledPrompt);
      displayContent = JSON.stringify(parsed, null, 2);
    } catch (e) {
      // Keep as-is if parsing fails
    }

    return html`
      <div class="inspector-section ${this.isOpen ? 'open' : ''}">
        <div class="inspector-header" @click="${this.toggleOpen}">
          <span>Magic Prompt JSON Caption</span>
          <span class="toggle-icon">
            ${icon('chevronDown', 18)}
          </span>
        </div>
        <div class="inspector-body ${this.isOpen ? '' : 'hidden'}">
          <pre><code>${displayContent}</code></pre>
        </div>
      </div>
    `;
  }
}
customElements.define('prompt-inspector', PromptInspector);
