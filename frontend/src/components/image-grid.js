import { LitElement, html } from 'lit';
import { icon } from '../utils/icons.js';

export class ImageGrid extends LitElement {
  static properties = {
    images: { type: Array },
    rawPrompt: { type: String },
    seed: { type: Number },
    params: { type: Object },
    upsampledPrompt: { type: String },
    uuid: { type: String },
    parentUuid: { type: String }
  };

  createRenderRoot() {
    return this;
  }

  constructor() {
    super();
    this.images = [];
    this.rawPrompt = '';
    this.seed = 0;
    this.params = {};
    this.upsampledPrompt = '';
    this.uuid = '';
    this.parentUuid = '';
  }

  openLightbox(imgSrc, imgIdx) {
    const currentItem = {
      uuid: this.uuid,
      parentUuid: this.parentUuid,
      rawPrompt: this.rawPrompt,
      images: this.images,
      params: this.params,
      upsampledPrompt: this.upsampledPrompt
    };
    this.dispatchEvent(new CustomEvent('open-lightbox', {
      detail: {
        src: imgSrc,
        prompt: this.rawPrompt,
        seed: `${this.seed} (Image ${imgIdx + 1})`,
        item: currentItem,
        imgIdx
      }
    }));
  }

  render() {
    if (!this.images || this.images.length === 0) return html``;

    const sizeStr = this.params?.size || "1024x1024";
    const [w, h] = sizeStr.split("x").map(Number);
    const aspect = (w && h) ? `${w} / ${h}` : "1 / 1";

    return html`
      <div class="image-grid" id="imageGrid">
        ${this.images.map((imgBase64, index) => html`
          <div class="image-card" style="aspect-ratio: ${aspect};">
            <img src="${imgBase64}" alt="Generated masterpiece ${index + 1}" @click="${() => this.openLightbox(imgBase64, index)}">
            <div class="image-actions">
              <a class="download-icon-btn" href="${imgBase64}" download="ideogram_${this.seed}_${index}.png" title="Download Image">
                ${icon('download', 14)}
              </a>
            </div>
          </div>
        `)}
      </div>
    `;
  }
}
customElements.define('image-grid', ImageGrid);
