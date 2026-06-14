import { LitElement, html } from 'lit';

export class AiChat extends LitElement {
  static properties = {
    chatMessages: { type: Array },
    isRefining: { type: Boolean },
    chatProviders: { type: Array },
    selectedChatProvider: { type: String }
  };

  createRenderRoot() {
    return this;
  }

  constructor() {
    super();
    this.chatMessages = [];
    this.isRefining = false;
    this.chatProviders = [];
    this.selectedChatProvider = '';
  }

  updated(changedProperties) {
    if (changedProperties.has('chatMessages')) {
      this.scrollToBottom();
    }
  }

  scrollToBottom() {
    setTimeout(() => {
      const log = this.querySelector('#aiChatLog');
      if (log) {
        log.scrollTop = log.scrollHeight;
      }
    }, 50);
  }

  onSend() {
    const input = this.querySelector('#aiChatInput');
    const text = input ? input.value.trim() : '';
    if (!text || this.isRefining) return;

    if (input) input.value = '';
    this.dispatchEvent(new CustomEvent('send-chat', { detail: text }));
  }

  onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.onSend();
    }
  }

  onProviderChange(e) {
    this.dispatchEvent(new CustomEvent('chat-provider-change', { detail: e.target.value }));
  }

  renderAssistantMessage(msg) {
    const messageContent = msg.content || '';
    const trimmed = messageContent.trim();
    const canParseSummary = !msg.streaming && trimmed.startsWith('{') && trimmed.endsWith('}');

    if (canParseSummary) {
      try {
        const parsed = JSON.parse(trimmed);
        return html`
          <div class="ai-message assistant">
            <div style="font-weight: 600; font-size: 0.8rem; margin-bottom: 0.25rem; color: var(--accent-purple);">AI Layout Updated:</div>
            <div style="font-style: italic; font-size: 0.8rem; border-left: 2px solid var(--card-border); padding-left: 0.5rem; margin-bottom: 0.4rem;">
              "${parsed.high_level_description || 'Layout JSON updated'}"
            </div>
            <span style="font-size: 0.75rem; opacity: 0.7;">Background: ${parsed.compositional_deconstruction?.background || 'Updated composition'}</span>
          </div>
        `;
      } catch (_) {
        // Show raw text if a supposedly complete JSON message is still invalid.
      }
    }

    return html`<div class="ai-message ${msg.role}">
      ${messageContent || (msg.streaming ? 'Building JSON layout...' : '')}${msg.streaming ? html`<span class="stream-caret"></span>` : ''}
    </div>`;
  }

  render() {
    return html`
      <div id="contentSubtabAiChat" class="subtab-content-panel" style="padding-top: 0;">
        <div style="padding: 0.5rem; background: var(--overlay-bg); border-bottom: 1px solid var(--overlay-border); margin-bottom: 0.5rem;">
          <select
            class="editor-textarea-sm"
            style="height: 32px; padding: 0.25rem 0.5rem;"
            .value="${this.selectedChatProvider}"
            @change="${this.onProviderChange}"
            ?disabled="${this.isRefining || !this.chatProviders?.length}">
            ${(!this.chatProviders || this.chatProviders.length === 0) ? html`
              <option value="">No chat providers available</option>
            ` : this.chatProviders.map(p => html`
              <option value="${p.id}">${p.name}</option>
            `)}
          </select>
        </div>
        <div class="ai-chat-log" id="aiChatLog">
          ${!this.chatMessages || this.chatMessages.length === 0 ? html`
            <div class="ai-message system">Ask the AI Assistant to refine the layout for you. You can instruct it in natural language!</div>
          ` : this.chatMessages.map(msg => {
            if (msg.role === 'system') return html``;

            if (msg.role === 'assistant') return this.renderAssistantMessage(msg);
            return html`<div class="ai-message ${msg.role}">${msg.content || ''}</div>`;
          })}
        </div>
        <div class="ai-chat-input-wrapper">
          <textarea id="aiChatInput" placeholder="Ask AI to refine layout... (e.g. 'move the coffee to bottom-right')" ?disabled="${this.isRefining}" @keydown="${this.onKeyDown}"></textarea>
          <button id="sendAiChatBtn" class="editor-btn-primary" ?disabled="${this.isRefining}" @click="${this.onSend}">
            <span>${this.isRefining ? 'Refining...' : 'Refine with AI'}</span>
          </button>
        </div>
      </div>
    `;
  }
}
customElements.define('ai-chat', AiChat);
