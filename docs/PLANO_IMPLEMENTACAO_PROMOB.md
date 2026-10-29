# Plano de implementação funcional do Project3D

## Objetivo
Transformar o Project3D numa ferramenta de trabalho para marcenaria, mantendo o motor leve e o fluxo familiar ao Promob. Desenvolver e validar primeiro no Windows; a migração para Linux só começa depois dos testes de uso real.

## Regras obrigatórias
- O modelo 3D deve derivar das medidas e propriedades do projeto principal. Não pode manter dimensões independentes.
- Redimensionamentos com mouse devem respeitar limites mínimos/máximos e atualizar os dados do projeto; campos numéricos continuam sendo a fonte precisa.
- Preservar o contorno de geometrias livres, incluindo L, polígonos e recortes.
- Geometria deve poder ser convertida em chapa/peça fabricável, com espessura, material, nome, sentido do veio e dimensões explícitas.
- A conversão em chapa deve validar contorno fechado, área positiva, espessura positiva e recortes válidos; não converter silenciosamente uma forma irregular em retângulo.
- O fluxo de geometria deve permitir seleção de parede/plano, posicionamento horizontal e vertical, encaixe e referência ao piso/parede/teto conforme o modo ativo.
- Menu de contexto inspirado no fluxo do Promob: editar parede/geometria, segmentar, converter em chapa, associar/desassociar, agrupar/desagrupar e editar propriedades quando aplicável.
- Paredes, piso e teto devem ter ferramentas visíveis de criação e edição, com cotas reais.
- Biblioteca de materiais deve distinguir visualmente padrões de MDF/madeira (incluindo freijó e pau-ferro), piso, pedra, revestimento, vidro e alumínio. Nome, escala e orientação do veio devem ser editáveis. Materiais procedurais são uma primeira etapa; padrões comerciais reais devem usar imagens autorizadas/importadas pelo usuário.
- Importação de projeto Promob: analisar arquivos selecionados e identificar formatos suportados; mostrar prévia e relatório de itens importáveis antes de gravar. Não afirmar compatibilidade total sem testar arquivos reais.
- Importador de modelos e objetos deve preservar unidades, escala, materiais e transformações quando o formato de origem fornecer esses dados.
- Biblioteca do usuário: salvar objeto convertido/importado com nome, categoria, miniatura, medidas, materiais e origem; permitir inserir em projetos posteriores.
- Manter compatibilidade com o HTML único offline; nenhum recurso central pode depender de serviço remoto.
- Não remover funções existentes nem alterar dados de projetos silenciosamente.

## Fases de implementação
1. **Fonte única de medidas:** ligar geometria visual às propriedades reais; travas de escala e sincronização bidirecional.
2. **Geometria e chapa:** edição por vértices/arestas, cotas numéricas, espessura e conversão preservando o contorno.
3. **Ambiente:** ferramentas explícitas para construir/editar paredes, piso e teto; associação e posicionamento.
4. **Materiais:** biblioteca identificável, escala/veio coerentes e materiais físicos.
5. **Importação e biblioteca:** descobrir formatos de projeto/modelo que podem ser lidos, pré-visualizar, converter e salvar localmente.
6. **Validação profissional:** projetos de teste reais, salvamento/reabertura, peças irregulares, cotas, materiais e plano de corte.
7. **Linux:** só após aprovação da fase 6; revisar dependências e empacotamento multiplataforma.

## Matriz mínima de testes
- Alterar largura/altura/espessura no painel principal e confirmar atualização exata do 3D.
- Arrastar alças até o limite e confirmar que a geometria não ultrapassa os limites nem perde a proporção definida.
- Criar contorno em L e poligonal, converter em chapa, reabrir o projeto e confirmar contorno/espessura/material.
- Criar parede, teto e piso; editar dimensões e verificar cotas.
- Aplicar dois padrões de madeira distintos e verificar identificação, escala e sentido dos veios.
- Importar um projeto Promob real: relatar arquivos detectados, itens lidos e itens não suportados; não aceitar importação silenciosa parcial.
- Salvar um objeto na biblioteca, fechar/reabrir e inseri-lo num segundo projeto.
- Executar build TypeScript/Vite, testes unitários e testes de ponta a ponta no HTML final.

## Estado verificado
- A branch `feature/render-mutracer-integracao` contém ajustes iniciais de materiais e cotas preliminares.
- O build TypeScript/Vite foi executado com sucesso anteriormente nessa branch.
- A geração do HTML com `python construir.py --sem-npm` também foi concluída no computador do usuário.
- Isso não comprova ainda a sincronização das medidas, conversão de geometrias em chapas, importação completa de projetos Promob nem o fluxo de fabricação. Esses itens precisam de implementação e testes específicos.

## Política de pronto
Não marcar como pronto com base apenas em compilação. Cada fase precisa de testes reproduzíveis e validação visual/funcional. A migração para Linux fica bloqueada até o aceite dos testes de uso real no Windows.
