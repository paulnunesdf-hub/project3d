const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const context = { console };
context.window = context;
vm.createContext(context);
const source = fs.readFileSync(path.join(__dirname, '../programa/ambiente/peca-schema.js'), 'utf8');
vm.runInContext(source, context);

test('normaliza peça legada do construtor em milímetros', () => {
  const p = context.Project3DPart.normalizar({
    sourceId: 'armario-1:lateral',
    desc: 'Lateral esquerda',
    L: 720,
    W: 560,
    esp: 15,
    qty: 2,
    mat: 'MDF Branco',
    veio: true,
    bordas: { inf: 'Fita 1 mm', dir: '' }
  });
  assert.equal(p.schema, 'project3d.part');
  assert.equal(p.length, 720);
  assert.equal(p.width, 560);
  assert.equal(p.thickness, 15);
  assert.equal(p.quantity, 2);
  assert.equal(p.material, 'MDF Branco');
  assert.equal(p.edgeBanding.bottom, 'Fita 1 mm');
  assert.equal(p.dimensionsUnit, 'mm');
});

test('valida dimensões e material obrigatórios', () => {
  const result = context.Project3DPart.validar({ L: 0, W: 560, esp: 15, mat: '' });
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('length deve ser maior que zero'));
  assert.ok(result.errors.includes('material é obrigatório'));
});

test('gera identificador estável para a mesma origem e peça', () => {
  const input = { sourceId: 'armario-1:lateral', desc: 'Lateral', L: 720, W: 560, esp: 15, mat: 'MDF' };
  assert.equal(
    context.Project3DPart.normalizar(input).id,
    context.Project3DPart.normalizar(input).id
  );
});
