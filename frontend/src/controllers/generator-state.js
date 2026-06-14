export function getDefaultProviderId(ctx) {
  const defaultEntry = Object.entries(ctx.providerSchemas || {}).find(([, schema]) => schema.type === 'generation' && schema.default);
  const firstGeneration = Object.entries(ctx.providerSchemas || {}).find(([, schema]) => schema.type === 'generation');
  return defaultEntry?.[0] || firstGeneration?.[0] || ctx.selectedEndpoint || '';
}

export function getDefaultUpsamplerId(ctx) {
  const defaultEntry = Object.entries(ctx.providerSchemas || {}).find(([, schema]) => schema.type === 'upsampler' && schema.default);
  const firstUpsampler = Object.entries(ctx.providerSchemas || {}).find(([, schema]) => schema.type === 'upsampler');
  return defaultEntry?.[0] || firstUpsampler?.[0] || ctx.selectedUpsampler || '';
}

export function withProviderDefaults(ctx, providerId, params = {}) {
  const schema = ctx.providerSchemas?.[providerId];
  if (!schema) return { ...params };
  const defaults = {};
  for (const [key, definition] of Object.entries(schema.inputs || {})) {
    defaults[key] = definition.default ?? '';
  }
  return { ...defaults, ...(params || {}) };
}

export function resetGeneratorForm(ctx) {
  const settings = ctx.lastGeneratorSettings || {};
  const provider = settings.provider || getDefaultProviderId(ctx);
  ctx.prompt = '';
  ctx.magicPrompt = settings.magicPrompt ?? true;
  ctx.bypassUpsample = false;
  ctx.cachedUpsampledPrompt = '';
  ctx.advancedMode = settings.advancedMode ?? false;
  ctx.isJsonMode = false;
  ctx.parentUuid = '';
  ctx.selectedTemplate = settings.selectedTemplate || ctx.templates?.[0] || 'v1';
  ctx.selectedUpsampler = settings.selectedUpsampler || getDefaultUpsamplerId(ctx);
  ctx.selectedEndpoint = provider;
  ctx.providerParams = withProviderDefaults(ctx, provider, settings.providerParams || {});
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

export function applyHistoryItemToForm(ctx, item) {
  const provider = item?.params?.provider || item?.params?.endpoint || ctx.selectedEndpoint || getDefaultProviderId(ctx);
  ctx.selectedEndpoint = provider;
  ctx.providerParams = withProviderDefaults(ctx, provider, providerParamsFromHistory(item));
  ctx.selectedTemplate = item?.params?.upsampleTemplate || item?.params?.upsamplerParams?.template || ctx.selectedTemplate || 'v1';
  ctx.selectedUpsampler = item?.params?.upsampler || ctx.selectedUpsampler || getDefaultUpsamplerId(ctx);
  ctx.parentUuid = item?.uuid || '';
  ctx.advancedMode = false;

  const historyWasJson = Boolean(item?.params?.isJsonMode);
  const sourcePrompt = item?.params?.sourceRawPrompt || (historyWasJson ? item?.upsampledPrompt : item?.rawPrompt) || '';
  ctx.prompt = sourcePrompt;
  ctx.cachedUpsampledPrompt = historyWasJson ? '' : (item?.upsampledPrompt || '');
  ctx.isJsonMode = Boolean(historyWasJson || looksLikeJsonPrompt(sourcePrompt));
  ctx.magicPrompt = !ctx.isJsonMode;
  ctx.bypassUpsample = false;
}

export function getSessionFormState(ctx) {
  return {
    prompt: ctx.prompt,
    magicPrompt: ctx.magicPrompt,
    advancedMode: ctx.advancedMode,
    isJsonMode: ctx.isJsonMode,
    selectedTemplate: ctx.selectedTemplate,
    selectedUpsampler: ctx.selectedUpsampler,
    provider: ctx.selectedEndpoint,
    providerParams: ctx.providerParams
  };
}

export function captureLastGeneratorSettings(ctx) {
  ctx.lastGeneratorSettings = {
    magicPrompt: ctx.magicPrompt,
    advancedMode: ctx.advancedMode,
    selectedTemplate: ctx.selectedTemplate,
    selectedUpsampler: ctx.selectedUpsampler,
    provider: ctx.selectedEndpoint,
    providerParams: { ...(ctx.providerParams || {}) }
  };
}
