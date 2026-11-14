/* Modelo canônico de peças do Project3D.
   Compatibilidade: mantém os campos legados usados pelo plano de corte e acrescenta
   metadados estáveis para modelador, orçamento, etiquetas e CNC.
   Todas as dimensões lineares são milímetros. */
(function (root) {
  'use strict';

  const VERSION = 1;
  const round = value => Math.round((Number(value) || 0) * 10) / 10;
  const clean = value => String(value == null ? '' : value).trim();

  function normalizar(input) {
    const p = input || {};
    const sourceId = clean(p.sourceId || p.id || 'manual');
    const length = round(p.length ?? p.L);
    const width = round(p.width ?? p.W);
    const thickness = round(p.thickness ?? p.esp);
    const quantity = Math.max(1, Math.floor(Number(p.quantity ?? p.qty) || 1));
    const material = clean(p.material ?? p.mat);
    const name = clean(p.name ?? p.desc ?? 'Peça');
    const edgeBanding = p.edgeBanding || p.bordas || {};
    const grain = p.grain ?? (p.veio === false ? 'none' : 'length');

    return {
      schema: 'project3d.part',
      schemaVersion: VERSION,
      id: clean(p.id) || [sourceId, name, length, width, thickness, material].map(encodeURIComponent).join(':'),
      sourceId,
      name,
      category: clean(p.category || p.parte || 'panel'),
      length,
      width,
      thickness,
      dimensionsUnit: 'mm',
      quantity,
      material,
      grain: grain === true ? 'length' : grain === false ? 'none' : grain,
      edgeBanding: {
        top: clean(edgeBanding.top ?? edgeBanding.sup),
        bottom: clean(edgeBanding.bottom ?? edgeBanding.inf),
        left: clean(edgeBanding.left ?? edgeBanding.esq),
        right: clean(edgeBanding.right ?? edgeBanding.dir)
      },
      operations: Array.isArray(p.operations) ? p.operations : [],
      source: clean(p.source || 'project3d-cabinet')
    };
  }

  function validar(input) {
    const p = normalizar(input);
    const errors = [];
    if (!(p.length > 0)) errors.push('length deve ser maior que zero');
    if (!(p.width > 0)) errors.push('width deve ser maior que zero');
    if (!(p.thickness > 0)) errors.push('thickness deve ser maior que zero');
    if (!p.material) errors.push('material é obrigatório');
    if (!Number.isInteger(p.quantity) || p.quantity < 1) errors.push('quantity deve ser inteiro positivo');
    return { valid: errors.length === 0, errors, part: p };
  }

  root.Project3DPart = Object.freeze({ VERSION, normalizar, validar });
})(typeof window !== 'undefined' ? window : globalThis);
