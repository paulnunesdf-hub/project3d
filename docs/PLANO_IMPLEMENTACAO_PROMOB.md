# Plano de implementação Promob para Project3D

## Regras funcionais
- Cotas dinâmicas de afastamento, anterior, posterior, inferior e superior ao selecionar módulos.
- Associação e desassociação ao plano de inserção, sem apagar nem reconstruir o módulo.
- Agrupamento e desagrupamento de módulos.
- Editor de tamponamentos com componentes reais que entram no orçamento, lista de peças e plano de corte.
- Gestão de agregados por módulo.
- Regras de dimensão do armário e seleção de corrediças pela biblioteca de ferragens já existente, sem duplicar cadastros.
- Materiais PBR visíveis para MDF e madeira, vidro com transmissão física e alumínio escovado.
- Render progressivo integrado com prévia e exportação em alta resolução.

## Critérios de aceitação
1. Nenhum recurso atual é removido.
2. Cotas são calculadas a partir da geometria real do ambiente, nunca valores fictícios.
3. Componentes adicionados ao tamponamento têm dimensões, material e identificação próprios.
4. A ferragem é selecionada apenas se existir na biblioteca; caso contrário, mostrar aviso.
5. Validar build TypeScript/Vite e o fluxo integrado antes de declarar pronto.

## Estado
Este documento registra o escopo aprovado. A implementação e os testes de cada recurso ainda precisam ser realizados; não considerar este documento como prova de implementação.