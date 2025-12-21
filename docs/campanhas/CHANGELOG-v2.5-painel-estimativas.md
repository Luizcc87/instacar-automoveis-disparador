# Changelog - Versão 2.5: Painel de Estimativas e Configuração Avançada de Horários

**Data:** Dezembro 2025

## Resumo

Esta versão adiciona um sistema completo de estimativas em tempo real e configuração flexível de horários, permitindo maior controle sobre quando e como as campanhas são processadas.

## Novas Funcionalidades

### 1. Painel de Estimativas em Tempo Real

O formulário de campanhas agora exibe um painel visual que calcula automaticamente:

- **Total de Clientes**: Quantidade de clientes que serão processados
- **Total de Lotes**: Quantos lotes serão necessários
- **Lotes por Dia**: Quantos lotes podem ser processados por dia
- **Dias Necessários**: Quantos dias úteis serão necessários para completar
- **Tempo Necessário por Dia**: Horas necessárias de processamento
- **Horário Disponível**: Horas disponíveis considerando horário configurado e intervalo de almoço
- **Lotes Antes/Depois do Almoço**: Separação quando intervalo de almoço está configurado

**Validação Visual:**
- ✅ Verde: Parâmetros compatíveis com horário configurado
- ⚠️ Amarelo: Margem pequena de tempo (menos de 1 hora)
- ❌ Vermelho: Não cabe no horário configurado

**Sugestões Automáticas:**
- Sugere ajustar horário fim se não cabe no horário
- Sugere diminuir tamanho do lote se necessário
- Sugere diminuir limite diário se necessário
- Informa quando há tempo disponível além do necessário

### 2. Intervalo de Almoço Configurável

- **Checkbox "Pausar durante horário de almoço"**: Habilita/desabilita a pausa automática
- **Horário Início Almoço**: Horário em que o intervalo começa (padrão: 12:00)
- **Horário Fim Almoço**: Horário em que o intervalo termina (padrão: 13:00)

**Comportamento:**
- O sistema pausa automaticamente durante o intervalo configurado
- Separa lotes para serem processados antes e depois do almoço
- Calcula automaticamente quantos lotes cabem em cada período
- Retoma automaticamente após o horário de fim do almoço

### 3. Configuração Granular por Dia da Semana

Permite configurar horários específicos para cada dia da semana:

**Duas Opções:**
1. **Usar configuração padrão**: Usa `horario_inicio`, `horario_fim` e `processar_finais_semana` (compatível com sistema anterior)
2. **Configurar cada dia individualmente**: Mostra tabela com 7 dias

**Para cada dia:**
- Checkbox "Habilitado": Ativa/desativa processamento no dia
- Campo "Horário Início": Horário de início para o dia específico
- Campo "Horário Fim": Horário de fim para o dia específico

**Botão "Aplicar horário padrão a todos"**: Facilita configuração inicial aplicando o horário padrão a todos os dias habilitados.

**Exemplos de Uso:**
- **Sábado só pela manhã**: Habilitar sábado com horário 09:00-12:00
- **Domingo desabilitado**: Desmarcar checkbox de domingo
- **Sábado e domingo o dia todo**: Habilitar ambos com horário 09:00-18:00
- **Dias úteis com horários diferentes**: Configurar segunda a sexta com horários específicos

### 4. Campo Quantidade de Clientes (Opcional)

- Campo numérico opcional para informar quantidade fixa de clientes
- Se preenchido, será usado para cálculos de estimativas
- Se vazio, usa quantidade de clientes selecionados ou todos elegíveis do banco
- Atualiza estimativas automaticamente quando alterado

## Melhorias Técnicas

### Banco de Dados

**Nova Migração SQL:** `docs/supabase/migracao-intervalo-almoco-dias-semana.sql`

**Novos Campos na Tabela `instacar_campanhas`:**
- `pausar_almoco` (BOOLEAN, DEFAULT FALSE): Se deve pausar durante almoço
- `horario_almoco_inicio` (TIME, DEFAULT '12:00:00'): Horário início almoço
- `horario_almoco_fim` (TIME, DEFAULT '13:00:00'): Horário fim almoço
- `configuracao_dias_semana` (JSONB): Configuração granular por dia da semana

**Estrutura JSONB `configuracao_dias_semana`:**
```json
{
  "segunda": { "habilitado": true, "horario_inicio": "09:00", "horario_fim": "18:00" },
  "terca": { "habilitado": true, "horario_inicio": "09:00", "horario_fim": "18:00" },
  "sabado": { "habilitado": true, "horario_inicio": "09:00", "horario_fim": "12:00" },
  "domingo": { "habilitado": false }
}
```

### Workflow N8N

**Nó "Calcular Lote e Verificar Horário" Atualizado:**

- Função `obterHorarioDiaAtual()`: Obtém configuração específica do dia atual
- Verificação de intervalo de almoço: Pausa automaticamente durante almoço
- Cálculo adaptativo de lotes: Considera almoço e horários específicos do dia
- Compatibilidade retroativa: Se `configuracao_dias_semana` for NULL, usa configuração antiga

**Nó "Pausar e Agendar Próxima Execução" Atualizado:**

- Agendamento inteligente: Se pausado durante almoço, agenda para depois do almoço
- Considera configuração por dia da semana ao agendar próxima execução

### Interface Web

**Novas Funções JavaScript:**

- `calcularEstimativasCompleta()`: Calcula todas as estimativas considerando almoço e dias da semana
- `gerarSugestoesAutomaticas()`: Gera sugestões de ajustes quando necessário
- `salvarConfiguracaoDiasSemana()`: Salva configuração JSONB no banco
- `carregarConfiguracaoDiasSemana()`: Carrega configuração do banco
- `aplicarHorarioPadrao()`: Aplica horário padrão a todos os dias habilitados
- `toggleCamposAlmoco()`: Alterna visibilidade dos campos de almoço
- `toggleConfiguracaoDiasSemana()`: Alterna entre modo padrão e individual

**Event Listeners:**

- Todos os novos campos têm listeners para atualizar estimativas em tempo real
- Contador de clientes selecionados atualiza estimativas automaticamente

## Compatibilidade

- **Retroativa**: Campanhas existentes continuam funcionando normalmente
- **Configuração Antiga**: Se `configuracao_dias_semana` for NULL, usa `horario_inicio`, `horario_fim` e `processar_finais_semana`
- **Migração Opcional**: Campos novos têm valores padrão, migração não quebra funcionalidades existentes

## Instalação

1. Execute a migração SQL: `docs/supabase/migracao-intervalo-almoco-dias-semana.sql`
2. Importe o workflow atualizado: `fluxos-n8n/Disparador_Web_Campanhas_Instacar.json`
3. Teste a interface: Abra o formulário de campanhas e verifique os novos campos

## Documentação Relacionada

- [Guia de Criação de Campanhas](guia-criacao-campanhas.md) - Atualizado com novas funcionalidades
- [CLAUDE.md](../../CLAUDE.md) - Documentação técnica completa do projeto

