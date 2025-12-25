# Estrutura do Fluxo - Sistema de Notificações

## Visão Geral

Este documento descreve a estrutura do fluxo de notificações no workflow `Disparador_Web_Campanhas_Instacar.json`, incluindo os nós editados recentemente e suas funções.

## Fluxo de Notificações

### 1. Notificação de Início

```
Trigger Manual/Webhook
    ↓
Preparar Notificação Início (dados iniciais)
    ↓
Combinar Notificação Início
    ↓
Enviar Notificação Início
    ↓
Verificar Se Tem Dados Reais
    ↓
IF Notificação com Dados Reais
    ├─ TRUE (tem_dados_reais=true) → Preparar Lote Atual
    └─ FALSE (tem_dados_reais=false) → Buscar Clientes Selecionados
```

**Após calcular lotes:**
```
Calcular Lote e Verificar Horário
    ↓
Preparar Notificação Início com Dados Reais (dados completos)
    ↓
Combinar Notificação Início
    ↓
Enviar Notificação Início
    ↓
Verificar Se Tem Dados Reais
    ↓
IF Notificação com Dados Reais
    ├─ TRUE → Preparar Lote Atual
    └─ FALSE → Buscar Clientes Selecionados
```

### 2. Notificação de Lote Concluído

```
Split in Batches - Lote (output done)
    ↓
IF Notificar Lote Concluído
    ├─ TRUE → Preparar Notificação Lote Concluído
    │   ↓
    │   Combinar Notificação Conclusão
    │   ↓
    │   Enviar Notificação Conclusão
    │   ↓
    │   Verificar Tipo Notificação Conclusão
    │   ↓
    │   IF É Notificação Lote Concluído
    │   └─ Ambos outputs → IF Tem Pendentes
    └─ FALSE → IF Tem Pendentes
```

### 3. Notificação de Conclusão Final

```
IF Tem Pendentes (FALSE - não há mais pendentes)
    ↓
Preparar Notificação Conclusão
    ↓
Combinar Notificação Conclusão
    ↓
Enviar Notificação Conclusão
    ↓
Verificar Tipo Notificação Conclusão
    ↓
IF É Notificação Lote Concluído
    └─ Ambos outputs → IF Tem Pendentes (já não há pendentes, encerra)
```

## Nós Editados Recentemente

### Validação de Instância WhatsApp

#### Validar Instância WhatsApp Retornada
- **Tipo:** Code
- **Função:** Valida que a instância WhatsApp retornada do Supabase corresponde ao ID configurado na campanha
- **Importância:** CRÍTICO
- **Por quê:** Previne uso de instância incorreta quando múltiplas instâncias são retornadas. Se a instância esperada não for encontrada, lança erro detalhado com IDs retornados para facilitar debug.
- **Localização:** Entre "Buscar Instância WhatsApp" e "Combinar Dados Cliente Campanha API"

#### Combinar Dados Cliente Campanha API
- **Tipo:** Code
- **Função:** Combina dados do cliente, campanha e instância WhatsApp validada
- **Importância:** IMPORTANTE
- **Por quê:** Garante que a instância usada corresponde ao ID da campanha (validação dupla). Preserva telefone do cliente e execucao_id para uso nos nós seguintes. Se telefone não estiver presente, tenta restaurar do nó 'Restaurar Dados Cliente'.

### Sistema de Notificações

#### Verificar Se Tem Dados Reais
- **Tipo:** Code
- **Função:** Verifica se a notificação de início foi enviada com dados reais (após calcular lotes) ou apenas dados iniciais
- **Importância:** IMPORTANTE
- **Por quê:** Usa try/catch para evitar erro se o nó 'Preparar Notificação Início com Dados Reais' não foi executado. Retorna flag `tem_dados_reais` usado pelo IF seguinte para rotear o fluxo corretamente.

#### IF Notificação com Dados Reais
- **Tipo:** IF
- **Função:** Roteia o fluxo após notificação de início
- **Importância:** CRÍTICO
- **Por quê:** 
  - **TRUE (tem_dados_reais=true):** vai direto para 'Preparar Lote Atual' (já calculou lotes)
  - **FALSE (tem_dados_reais=false):** vai para 'Buscar Clientes Selecionados' (precisa buscar e calcular lotes primeiro)
- **Evita erro:** de acesso a nó não executado

#### Preparar Lote Atual
- **Tipo:** Code
- **Função:** Prepara array de clientes do lote atual para processamento pelo 'Split in Batches - Lote'
- **Importância:** IMPORTANTE
- **Por quê:** Busca `clientesLoteAtual` do nó 'Calcular Lote e Verificar Horário'. Valida e loga cada cliente antes de retornar. Retorna array formatado para o Split in Batches processar um por vez.

#### Split in Batches - Lote
- **Tipo:** Split in Batches
- **Função:** Processa clientes do lote um por vez
- **Importância:** CRÍTICO
- **Configuração:** `batchSize: 1` (processamento sequencial)
- **Outputs:**
  - **Output 0 (done):** quando termina o lote, vai para 'IF Notificar Lote Concluído'
  - **Output 1 (main):** para cada cliente, vai para 'Preservar Dados Cliente' para processamento individual
- **Por quê:** `batchSize=1` garante processamento sequencial confiável

#### IF Notificar Lote Concluído
- **Tipo:** IF
- **Função:** Verifica se deve enviar notificação de lote concluído
- **Importância:** IMPORTANTE
- **Por quê:** 
  - **TRUE:** vai para 'Preparar Notificação Lote Concluído'
  - **FALSE:** pula notificação e vai direto para 'IF Tem Pendentes'
- **Executado quando:** 'Split in Batches - Lote' termina (output done)

#### Preparar Notificação Lote Concluído
- **Tipo:** Code
- **Função:** Prepara mensagem de notificação quando um lote é concluído
- **Importância:** IMPORTANTE
- **Por quê:** Busca estatísticas atualizadas da execução e monta mensagem com detalhes do lote, estatísticas acumuladas e progresso. Adiciona flag `tipo_notificacao='lote_concluido'` para identificação. Retorna um item para cada telefone admin configurado.

#### Verificar Tipo Notificação Conclusão
- **Tipo:** Code
- **Função:** Identifica se a notificação enviada é de 'lote_concluido' ou 'conclusao_final'
- **Importância:** IMPORTANTE
- **Por quê:** Verifica campo `tipo_notificacao` nos dados atuais ou busca do nó 'Preparar Notificação Lote Concluído'. Usado pelo IF seguinte para rotear corretamente e evitar loops.

#### IF É Notificação Lote Concluído
- **Tipo:** IF
- **Função:** Roteia após notificação de conclusão
- **Importância:** CRÍTICO
- **Por quê:** Ambos os outputs (TRUE e FALSE) levam para 'IF Tem Pendentes' para verificar se há mais clientes para processar. Previne loop ao garantir que após qualquer notificação de conclusão, o fluxo verifica pendentes antes de continuar.

#### Atualizar Lote Atual
- **Tipo:** Code
- **Função:** Incrementa `lote_atual` na execução antes de processar próximo lote
- **Importância:** CRÍTICO
- **Por quê:** Busca `execucaoId` de múltiplas fontes (Verificar Pendentes Execução, Atualizar Execução Contadores, Combinar Campanha Execução) usando try/catch para robustez. Prepara dados para atualização via HTTP Request no nó seguinte.

## Problemas Conhecidos e Soluções

### Problema: Clientes não estão sendo processados

**Sintoma:** Notificações de início e conclusão são enviadas, mas estatísticas mostram 0 enviados, 0 processados.

**Possíveis Causas:**
1. "Preparar Lote Atual" não está retornando dados corretamente
2. "Split in Batches - Lote" não está processando os clientes
3. Fluxo está pulando o processamento após notificação

**Solução Implementada:**
- Adicionado `batchSize: 1` no "Split in Batches - Lote" para garantir processamento sequencial
- Adicionado validação e logs no "Preparar Lote Atual" para debug
- Verificado que "IF Notificação com Dados Reais" (TRUE) leva corretamente para "Preparar Lote Atual"

**Próximos Passos para Debug:**
1. Verificar logs do "Preparar Lote Atual" para confirmar que está retornando clientes
2. Verificar se "Split in Batches - Lote" está recebendo dados
3. Verificar se o output 1 (main) do "Split in Batches" está conectado corretamente

## Notas de Implementação

### Padrão de Validação de Instância WhatsApp

Para garantir que a instância correta seja usada:

1. **Validar WhatsApp API ID:** Valida formato e existência do ID na campanha
2. **Buscar Instância WhatsApp:** Busca no Supabase com filtro por ID e ativo=true
3. **Validar Instância WhatsApp Retornada:** Valida que a instância retornada corresponde ao ID esperado
4. **Combinar Dados Cliente Campanha API:** Validação final antes de usar a instância

### Padrão de Notificações

Para evitar loops e garantir roteamento correto:

1. **Notificações de Início:** Duas versões (inicial e com dados reais)
2. **Notificações de Lote:** Flag `tipo_notificacao='lote_concluido'` para identificação
3. **Notificações de Conclusão:** Sempre verificam pendentes após envio
4. **Roteamento:** Sempre verifica pendentes antes de continuar processamento

## Importância da Documentação

### Por que esta documentação é crítica?

Esta documentação serve como **fonte única da verdade** sobre o fluxo de notificações no N8N. Manter ela atualizada e fidedigna ao workflow real é essencial para:

1. **Estabilidade do Sistema:** Evita que mudanças não documentadas quebrem o fluxo
2. **Onboarding de Novos Desenvolvedores:** Facilita compreensão rápida do sistema
3. **Debugging Eficiente:** Reduz tempo de investigação de problemas
4. **Manutenção Preventiva:** Identifica pontos críticos que precisam de atenção
5. **Auditoria e Compliance:** Rastreabilidade de mudanças e decisões técnicas

### Riscos de Documentação Desatualizada

- ❌ **Mudanças não documentadas** podem causar bugs difíceis de rastrear
- ❌ **Novos desenvolvedores** podem fazer alterações que quebram o fluxo
- ❌ **Troubleshooting** se torna mais lento e propenso a erros
- ❌ **Refatorações** podem quebrar dependências críticas não documentadas
- ❌ **Deploy em produção** pode falhar silenciosamente

## Como Usar Esta Documentação

### Para Desenvolvedores

#### Antes de Editar o Workflow

1. **Leia esta documentação completamente** para entender o fluxo atual
2. **Identifique os nós que serão afetados** pela sua mudança
3. **Verifique as dependências** listadas na seção "Nós Editados Recentemente"
4. **Consulte "Problemas Conhecidos"** para evitar reintroduzir bugs corrigidos

#### Durante a Edição

1. **Mantenha as notas dos nós atualizadas** - Se editar um nó, atualize sua descrição aqui
2. **Siga os padrões documentados** - Use os padrões de validação e notificações como referência
3. **Adicione logs de debug** - Especialmente em nós críticos (marcados como CRÍTICO)
4. **Teste cada caminho do fluxo** - Valide TRUE e FALSE de cada IF

#### Após a Edição

1. **Atualize esta documentação** imediatamente após fazer mudanças
2. **Adicione novos nós** à seção "Nós Editados Recentemente" se aplicável
3. **Documente problemas encontrados** na seção "Problemas Conhecidos"
4. **Valide o fluxo completo** antes de considerar a tarefa concluída

### Para Troubleshooting

1. **Comece pela seção "Problemas Conhecidos"** - Pode ser um problema já documentado
2. **Use os diagramas de fluxo** para rastrear onde o problema pode estar ocorrendo
3. **Consulte "Notas de Implementação"** para entender os padrões esperados
4. **Verifique os logs** dos nós críticos mencionados na documentação

### Para Code Review

1. **Compare as mudanças** com a documentação atual
2. **Verifique se padrões documentados** foram seguidos
3. **Confirme que notas dos nós** foram atualizadas se necessário
4. **Valide que não há regressões** em problemas conhecidos já corrigidos

## Recomendações de Manutenção

### Checklist de Validação Periódica

Execute este checklist **mensalmente** ou após mudanças significativas:

- [ ] **Sincronização com Workflow Real:**
  - [ ] Todos os nós mencionados existem no workflow JSON
  - [ ] Nomes dos nós correspondem exatamente (case-sensitive)
  - [ ] Conexões descritas correspondem às conexões reais
  - [ ] IDs dos nós estão corretos (se mencionados)

- [ ] **Completude da Documentação:**
  - [ ] Todos os nós críticos (marcados como CRÍTICO) estão documentados
  - [ ] Novos nós adicionados recentemente foram incluídos
  - [ ] Problemas conhecidos estão atualizados
  - [ ] Soluções implementadas estão documentadas

- [ ] **Precisão Técnica:**
  - [ ] Configurações mencionadas (ex: `batchSize: 1`) correspondem ao código
  - [ ] Lógica de roteamento descrita está correta
  - [ ] Flags e campos mencionados existem no código
  - [ ] Mensagens de erro documentadas são as atuais

### Processo de Atualização da Documentação

#### Quando Atualizar

1. **Após qualquer edição no workflow** que afete nós documentados
2. **Ao adicionar novos nós** relacionados a notificações
3. **Ao corrigir bugs** documentados em "Problemas Conhecidos"
4. **Ao identificar novos problemas** ou padrões
5. **Após mudanças em configurações** críticas

#### Como Atualizar

1. **Edite o arquivo markdown** diretamente
2. **Mantenha o formato consistente** com o restante do documento
3. **Adicione data de atualização** em comentários se necessário
4. **Valide a sintaxe markdown** antes de commitar
5. **Commit junto com as mudanças** no workflow JSON

#### O que Atualizar

- ✅ **Adicionar novos nós** à seção apropriada
- ✅ **Atualizar descrições** de nós modificados
- ✅ **Corrigir diagramas de fluxo** se conexões mudaram
- ✅ **Documentar novos problemas** encontrados
- ✅ **Atualizar soluções** implementadas
- ✅ **Adicionar novos padrões** identificados

### Boas Práticas para Edições

#### 1. Sempre Documente Antes de Editar

```markdown
# Exemplo de processo recomendado:

1. Leia a documentação atual
2. Identifique o nó que será editado
3. Entenda as dependências (nós anteriores e posteriores)
4. Planeje a mudança considerando o impacto
5. Faça a edição no workflow
6. Atualize a documentação imediatamente
7. Teste o fluxo completo
8. Valide que a documentação está correta
```

#### 2. Use as Notas dos Nós no N8N

As notas (`notes`) nos nós do workflow JSON devem **espelhar** a documentação:

- **Copie a descrição** da documentação para a nota do nó
- **Mantenha consistência** entre documentação e notas
- **Use tags de importância** (CRÍTICO, IMPORTANTE) em ambos

**Exemplo:**
```json
{
  "name": "Validar Instância WhatsApp Retornada",
  "notes": "CRÍTICO: Valida que a instância WhatsApp retornada do Supabase corresponde ao ID configurado na campanha. Previne uso de instância incorreta quando múltiplas instâncias são retornadas."
}
```

#### 3. Padrão de Nomenclatura

Mantenha consistência na nomenclatura:

- **Nomes de nós:** Exatamente como aparecem no N8N (case-sensitive)
- **IDs de nós:** Use apenas se necessário para referência técnica
- **Campos JSON:** Use formato `campo_nome` ou `campoNome` conforme o código
- **Flags:** Use formato `flag_nome` ou `flagNome` conforme o código

#### 4. Documentação de Problemas

Ao documentar um problema:

1. **Descreva o sintoma** claramente
2. **Liste possíveis causas** (mesmo que não confirmadas)
3. **Documente a solução implementada**
4. **Adicione passos de debug** se o problema voltar
5. **Mantenha histórico** de problemas resolvidos

### Validação de Sincronização

#### Script de Validação (Recomendado)

Crie um script ou processo para validar que a documentação está sincronizada:

```bash
# Exemplo de validação manual:
1. Extrair nomes de nós do workflow JSON
2. Comparar com nós mencionados na documentação
3. Verificar se conexões descritas existem
4. Validar que configurações mencionadas estão corretas
```

#### Validação Manual

1. **Abra o workflow no N8N** e a documentação lado a lado
2. **Percorra cada nó documentado** e verifique:
   - Nome corresponde exatamente
   - Conexões estão corretas
   - Configurações mencionadas estão presentes
3. **Teste o fluxo** seguindo os diagramas
4. **Valide logs** dos nós críticos

## Manutenção da Estabilidade

### Pontos Críticos que NUNCA Devem Ser Alterados Sem Documentação

1. **Validação de Instância WhatsApp:**
   - ❌ Não remover nós de validação sem entender o impacto
   - ❌ Não alterar ordem dos nós de validação
   - ✅ Sempre validar que instância correta está sendo usada

2. **Roteamento de Notificações:**
   - ❌ Não alterar conexões de IFs sem atualizar documentação
   - ❌ Não remover flags de identificação (`tipo_notificacao`)
   - ✅ Sempre verificar pendentes após notificações

3. **Processamento de Lotes:**
   - ❌ Não alterar `batchSize` sem justificativa técnica
   - ❌ Não remover validações de dados antes do Split in Batches
   - ✅ Sempre validar que clientes estão sendo processados

### Testes Recomendados Após Mudanças

1. **Teste de Notificação de Início:**
   - [ ] Notificação inicial é enviada
   - [ ] Notificação com dados reais é enviada após calcular lotes
   - [ ] Roteamento funciona corretamente (TRUE e FALSE)

2. **Teste de Processamento:**
   - [ ] Clientes são processados corretamente
   - [ ] Estatísticas são atualizadas
   - [ ] Notificação de lote é enviada ao concluir

3. **Teste de Conclusão:**
   - [ ] Notificação final é enviada quando não há pendentes
   - [ ] Não há loops infinitos
   - [ ] Fluxo encerra corretamente

### Monitoramento Contínuo

1. **Logs de Execução:**
   - Monitore logs dos nós críticos regularmente
   - Identifique padrões de erro recorrentes
   - Documente novos problemas encontrados

2. **Métricas de Performance:**
   - Tempo de execução de cada lote
   - Taxa de sucesso de envios
   - Frequência de erros por tipo

3. **Feedback de Usuários:**
   - Notificações recebidas corretamente?
   - Estatísticas estão precisas?
   - Há problemas de timing ou duplicação?

## Referências

- Workflow: `fluxos-n8n/Disparador_Web_Campanhas_Instacar.json`
- Documentação de Campanhas: `docs/campanhas/`
- Guia de Troubleshooting: `docs/n8n/troubleshooting.md`
- CLAUDE.md: Guia geral do projeto com arquitetura completa

## Histórico de Atualizações

- **2025-12-24:** Documentação inicial criada com estrutura de notificações
- **2025-12-24:** Adicionadas recomendações de uso e manutenção
- **2025-12-24:** Adicionadas seções sobre importância e validação

