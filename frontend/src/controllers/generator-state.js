// Pure generator-form helpers retained after the unified-store refactor.
// lastGeneratorSettings / captureLastGeneratorSettings / resetGeneratorForm are
// gone — the store's generator slice IS the persisted last-used state.

export function withProviderDefaults(ctx, providerId, params = {}) {
  const schema = ctx.providerSchemas?.[providerId];
  if (!schema) return { ...params };
  const defaults = {};
  for (const [key, definition] of Object.entries(schema.inputs || {})) {
    defaults[key] = definition.default ?? '';
  }
  return { ...defaults, ...(params || {}) };
}

export function providerParamsFromHistory(item) {
  if (item?.params?.providerParams) return item.params.providerParams;
  return {
    sampler_preset: item?.params?.preset || 'V4_QUALITY_48',
    size: item?.params?.size || '1024x1024',
    steps: item?.params?.steps || 48,
    guidance: item?.params?.guidance || '',
    image_count: item?.params?.imageCount || 4,
    seed: item?.params?.seed || 0
  };
}

export function aspectRatioFromProviderParams(params = {}) {
  if (params.aspect_ratio) return String(params.aspect_ratio);
  const size = params.size;
  if (size && String(size).includes('x')) {
    const [width, height] = String(size).split('x').map(Number);
    if (width && height) {
      const gcd = (a, b) => b ? gcd(b, a % b) : a;
      const divisor = gcd(width, height);
      return `${width / divisor}:${height / divisor}`;
    }
  }
  return '1:1';
}

export function promptWithAspectRatio(promptText, aspectRatio) {
  if (!promptText) return promptText;
  try {
    const data = JSON.parse(promptText);
    if (data.aspect_ratio !== undefined) {
      delete data.aspect_ratio;
    }
    return JSON.stringify(data);
  } catch (_) {
    return promptText;
  }
}

export function looksLikeJsonPrompt(promptText) {
  const value = (promptText || '').trim();
  return (value.startsWith('{') && value.endsWith('}')) || (value.startsWith('[') && value.endsWith(']'));
}
