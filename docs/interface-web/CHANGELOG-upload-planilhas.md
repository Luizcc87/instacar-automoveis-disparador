# Changelog - Sistema de Upload de Planilhas

## Versão 2.2 (2025-12-14)

### 🎯 Funcionalidades Implementadas

#### 1. **Sistema de Prévia e Confirmação de Upload**

**Problema:** O upload processava automaticamente sem confirmação do usuário, causando processamentos acidentais.

**Solução:**

- Implementado fluxo de prévia antes do processamento
- Adicionada função `mostrarPreviaUpload()` que exibe:
  - Nome do arquivo
  - Total de clientes e veículos detectados
  - Tabela prévia com os primeiros 10 clientes
- Botões "Cancelar" e "Confirmar e Processar" para controle do usuário
- Variável `dadosPendentesUpload` para armazenar dados temporariamente

**Arquivos modificados:**

- `interface-web/app.js`: Funções `processarUploadPlanilha()`, `mostrarPreviaUpload()`, `cancelarUpload()`, `confirmarUpload()`

---

#### 2. **Correção de Erros HTTP (404, 400, 406)**

##### 2.1. Erro 404 - Tabela `instacar_uploads_planilhas` não existia

**Problema:** `POST .../instacar_uploads_planilhas?select=* 404 (Not Found)`

**Solução:**

- Criado script SQL `docs/supabase/fix-upload-planilhas.sql`
- Adicionadas políticas RLS em `docs/supabase/policies.sql`
- Tabela criada com campos: `nome_arquivo`, `tipo`, `total_linhas`, `status`, `erros`, `created_at`, `updated_at`

##### 2.2. Erro 404 - Tabela `instacar_uazapi_instancias` renomeada

**Problema:** `HEAD .../instacar_uazapi_instancias?select=*&ativo=eq.true 404 (Not Found)`

**Solução:**

- Tabela refatorada para `instacar_whatsapp_apis`
- Criado script de migração `docs/supabase/fix-whatsapp-apis.sql`
- Criada view de compatibilidade `instacar_uazapi_instancias`
- Atualizado `interface-web/app.js` linha 234 para usar nova tabela

##### 2.3. Erro 400 - Campos inválidos no upsert

**Problema:** `POST .../instacar_clientes_envios?on_conflict=telefone 400 (Bad Request)` com 130 erros

**Solução:**

- Filtro explícito de campos válidos antes do upsert:
  ```javascript
  const camposValidos = [
    "telefone",
    "nome_cliente",
    "email",
    "veiculos",
    "primeiro_envio",
    "ultimo_envio",
    "total_envios",
    "status_whatsapp",
    "fonte_dados",
    "ultima_atualizacao_planilha",
  ];
  ```
- Remoção de campos auto-gerados (`id`, `created_at`, `updated_at`)
- Conversão de strings vazias para `null` em campos opcionais
- Validação de tipos: `veiculos` sempre array, `total_envios` sempre número

##### 2.4. Erro 406 - Cliente não encontrado

**Problema:** `GET .../instacar_clientes_envios?select=*&telefone=eq.5543999831248 406 (Not Acceptable)`

**Solução:**

- Substituído `.single()` por `.maybeSingle()` na consulta de cliente existente
- Permite que consulta retorne `null` sem gerar erro quando cliente não existe

---

#### 3. **Melhoria no Merge de Veículos Múltiplos**

**Problema:** Clientes com múltiplos veículos na planilha não tinham todos os veículos adicionados/atualizados corretamente no banco de dados.

**Solução:**

##### 3.1. Detecção Robusta de Colunas de Veículo

- Melhorado `mapearColunas()` para detectar múltiplas variações:
  - Campo veículo: `Veículo`, `Veiculo`, `Modelo`
  - Campo ano: `Ano`
  - Campo placa: `Placa`
  - Campo data venda: `Dt Venda`, `Data Venda`, `Data de Venda`, `dt_venda`, `data_venda`
  - Campo vendedor: `Vendedor`
- Fallback manual se detecção automática falhar
- Extração de ano do campo veículo completo (ex: "HONDA - BIZ 125 ES - 2011")

##### 3.2. Lógica de Merge Aprimorada

- Função `fazerMergeVeiculos()` melhorada com comparação em múltiplas camadas:
  1. **Prioridade 1:** Comparação por `placa` (mais confiável)
  2. **Prioridade 2:** Comparação por `veiculo` + `placa`
  3. **Prioridade 3:** Comparação por `veiculo` + `dtVenda`
  4. **Prioridade 4:** Comparação por `modelo` + `ano` (fallback)
- Função `normalizar()` para comparação case-insensitive e sem espaços extras
- **Atualização de veículos existentes:** Se veículo já existe, atualiza campos em vez de ignorar
- **Adição de veículos novos:** Adiciona apenas veículos que não existem

##### 3.3. Logs de Debug

- Logs detalhados do processo de merge (total antes/depois, adicionados, atualizados, ignorados)
- Logs de exemplo de extração (apenas uma vez por upload)
- Avisos limitados (máximo 3) para veículos sem campo "veiculo"

---

### 🔧 Melhorias Técnicas

#### 1. **Normalização de Telefones**

- Função `sanitizarTelefoneBrasileiro()` garante formato `55XXXXXXXXXXX`
- Validação de telefones inválidos antes do processamento

#### 2. **Agrupamento por Telefone**

- Clientes com mesmo telefone são agrupados automaticamente
- Todos os veículos de um mesmo cliente são consolidados em um único registro

#### 3. **Processamento em Lotes**

- Upload processa em lotes de 50 clientes para não travar a UI
- Barra de progresso atualizada em tempo real
- Delay de 100ms entre lotes para não sobrecarregar o servidor

#### 4. **Tratamento de Erros**

- Logs detalhados de erros com `error.message`, `error.details`, `error.hint`
- Array `errosDetalhados` armazena todos os erros para análise posterior
- Atualização do registro de upload com status e erros

---

### 📊 Estrutura de Dados

#### Campos Extraídos da Planilha

```javascript
{
  telefone: "5511999999999",        // Normalizado para 55XXXXXXXXXXX
  nome_cliente: "Nome do Cliente",
  email: "email@exemplo.com",        // Opcional
  veiculos: [
    {
      veiculo: "HONDA - BIZ 125 ES - 2011",  // Modelo completo
      ano: "2011",                            // Extraído ou do campo separado
      placa: "ATS-7127",                      // Opcional
      dtVenda: "07/11/2017",                  // Data de venda
      vendedor: "FABIO SITTA TAGLIARI",       // Opcional
      planilhaOrigem: 1                       // ID da planilha de origem
    }
  ],
  fonte_dados: "upload_manual",
  ultima_atualizacao_planilha: "2025-12-14T10:30:00.000Z"
}
```

---

### 🐛 Bugs Corrigidos

1. ✅ **Upload processava automaticamente sem confirmação**

   - Agora exibe prévia e aguarda confirmação do usuário

2. ✅ **Campos inválidos causavam erro 400**

   - Filtro explícito de campos válidos antes do upsert

3. ✅ **Cliente não encontrado causava erro 406**

   - Uso de `.maybeSingle()` em vez de `.single()`

4. ✅ **Veículos múltiplos não eram adicionados corretamente**

   - Lógica de merge aprimorada com múltiplas camadas de comparação

5. ✅ **Campo "veiculo" não era extraído em alguns casos**

   - Fallback manual para encontrar coluna de veículo

6. ✅ **Tabelas faltando no banco de dados**
   - Scripts SQL criados para criar tabelas necessárias

---

### 📝 Notas de Implementação

#### Flags de Controle de Logs

Para evitar poluição do console, foram implementadas flags:

- `window.exemploExtracaoMostrado`: Garante que exemplo de extração seja mostrado apenas uma vez
- `window.veiculoSemCampoCount`: Limita avisos de veículos sem campo "veiculo" a 3 ocorrências
- `mapeamentoGlobal`: Armazena mapeamento de colunas para evitar reprocessamento

#### Ordem de Processamento

1. Upload do arquivo (XLSX ou CSV)
2. Parse dos dados usando SheetJS (XLSX) ou parsing manual (CSV)
3. Mapeamento automático de colunas
4. Normalização de telefones
5. Agrupamento por telefone
6. **Prévia e confirmação do usuário**
7. Consulta de clientes existentes no Supabase
8. Merge de veículos para clientes existentes
9. Upsert no banco de dados
10. Atualização de registro de upload

---

### 🔄 Compatibilidade

- **Formatos suportados:** XLSX, CSV
- **Navegadores:** Chrome, Firefox, Edge (versões recentes)
- **Supabase:** Requer tabelas criadas via scripts SQL fornecidos
- **Planilhas:** Suporta múltiplas variações de nomes de colunas

---

### 📚 Arquivos Relacionados

- `interface-web/app.js` - Lógica principal do upload
- `docs/supabase/fix-upload-planilhas.sql` - Criação da tabela de uploads
- `docs/supabase/fix-whatsapp-apis.sql` - Migração da tabela de APIs WhatsApp
- `docs/supabase/policies.sql` - Políticas RLS atualizadas
- `docs/supabase/schema.sql` - Schema principal do banco de dados

---

### 🚀 Próximos Passos Sugeridos

1. **Validação de dados antes do upload:**

   - Validar formato de emails
   - Validar datas de venda
   - Validar placas de veículos

2. **Melhorias na UI:**

   - Edição de dados na prévia antes de confirmar
   - Filtros e busca na prévia
   - Exportação da prévia para CSV

3. **Performance:**

   - Processamento assíncrono com Web Workers para planilhas grandes
   - Compressão de dados antes do envio

4. **Auditoria:**
   - Histórico de alterações de veículos
   - Log de quem fez upload de cada planilha

---

**Data da última atualização:** 2025-12-14
