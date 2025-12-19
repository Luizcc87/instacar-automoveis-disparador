# ✅ Checklist de Segurança - Instacar Automóveis Disparador

Use este checklist antes de colocar o sistema em produção.

## 🔐 Credenciais e Tokens

- [ ] Todos os tokens estão em variáveis de ambiente (N8N)
- [ ] Nenhum token está hardcoded no código
- [ ] **CRÍTICO**: `index.html` não contém credenciais hardcoded (valores vazios no `env-config`)
- [ ] **CRÍTICO**: `inject-env.js` é executado apenas localmente ou durante build (nunca commite HTML com credenciais)
- [ ] Tokens expostos foram rotacionados (se houver)
- [ ] `.gitignore` está configurado e funcionando
- [ ] Nenhum arquivo `.env` está versionado
- [ ] Service Role Key do Supabase está protegida
- [ ] Credenciais do Google Sheets estão configuradas corretamente

## 🗄️ Banco de Dados (Supabase)

- [ ] Projeto Supabase criado e configurado
- [ ] Tabelas criadas (`schema.sql` executado)
- [ ] Índices criados (`indexes.sql` executado)
- [ ] Políticas RLS configuradas (`policies.sql` executado)
- [ ] Service Role Key está sendo usada (não anon key)
- [ ] RLS está habilitado em todas as tabelas
- [ ] Políticas de acesso estão corretas
- [ ] Backup automático está configurado (Supabase)

## 🔒 Segurança de Acesso

- [ ] Apenas service_role tem acesso de escrita
- [ ] Usuários autenticados têm apenas leitura (se aplicável)
- [ ] Acesso anônimo está bloqueado
- [ ] Logs de acesso estão sendo monitorados
- [ ] Contas de serviço têm permissões mínimas necessárias

## 📊 Dados Sensíveis

- [ ] Dados pessoais (telefones, emails) estão protegidos
- [ ] RLS impede acesso não autorizado
- [ ] Logs não expõem dados sensíveis
- [ ] Mensagens enviadas não estão em logs públicos
- [ ] Histórico está acessível apenas para usuários autorizados

## 🔄 Integrações

- [ ] Uazapi está configurada corretamente
- [ ] OpenAI API Key está válida e com limites configurados
- [ ] Google Sheets tem permissões mínimas necessárias
- [ ] Webhooks estão usando HTTPS
- [ ] Rate limits estão configurados

## 📝 Documentação

- [ ] README.md está atualizado
- [ ] Documentação de segurança está completa
- [ ] Guias de configuração estão disponíveis
- [ ] Troubleshooting está documentado
- [ ] Processo de rotação de tokens está documentado

## 🧪 Testes de Segurança

- [ ] Testado acesso não autorizado (deve falhar)
- [ ] Testado com tokens inválidos (deve falhar graciosamente)
- [ ] Testado com dados malformados (deve validar)
- [ ] Testado rate limiting (deve respeitar limites)
- [ ] Testado tratamento de erros (não expõe informações sensíveis)

## 🚨 Monitoramento

- [ ] Logs de erro estão sendo capturados
- [ ] Dead Letter Queue está funcionando
- [ ] Alertas para erros críticos estão configurados
- [ ] Métricas de segurança estão sendo monitoradas
- [ ] Acesso não autorizado está sendo logado

## ⚙️ Configuração do N8N

- [ ] Variáveis de ambiente estão configuradas
- [ ] Credenciais estão usando variáveis (não hardcoded)
- [ ] Workflow está validando inputs
- [ ] Tratamento de erros está implementado
- [ ] Retry logic está configurada
- [ ] Circuit breaker está funcionando

## 📈 Escalonamento e Limites

- [ ] Limite diário está configurado (200/dia)
- [ ] Warm-up period está ativo (50/dia primeiros 7 dias)
- [ ] Intervalos estão randomizados (130-150s)
- [ ] Horário comercial está configurado (9h-18h)
- [ ] Dias úteis estão sendo respeitados
- [ ] Controle diário está funcionando

## 🔍 Auditoria

- [ ] Histórico de envios está sendo registrado
- [ ] Erros críticos estão sendo logados
- [ ] Métricas diárias estão sendo salvas
- [ ] Logs são imutáveis (append-only)
- [ ] Possibilidade de replay de erros existe

## ✅ Validação Final

- [ ] Todos os testes passaram
- [ ] Sistema funciona em ambiente de teste
- [ ] Documentação está completa
- [ ] Equipe foi treinada (se aplicável)
- [ ] Plano de rollback está documentado

## 📋 Pós-Deploy

Após colocar em produção:

- [ ] Monitorar primeiras 24 horas intensivamente
- [ ] Verificar logs de erro
- [ ] Confirmar que envios estão funcionando
- [ ] Validar que duplicatas estão sendo prevenidas
- [ ] Confirmar que histórico está sendo registrado
- [ ] Verificar métricas diárias

## 🆘 Em Caso de Problema

1. **Parar imediatamente** o workflow se houver problema de segurança
2. **Rotacionar tokens** se comprometidos
3. **Analisar logs** para identificar causa
4. **Documentar** o incidente
5. **Corrigir** o problema antes de retomar

## 📞 Contatos de Emergência

- **Supabase**: Dashboard > Support
- **Uazapi**: Suporte via dashboard
- **OpenAI**: [support.openai.com](https://support.openai.com)
- **N8N**: Documentação e comunidade

---

**Data da verificação**: ******\_\_\_******  
**Verificado por**: ******\_\_\_******  
**Status**: ⬜ Aprovado | ⬜ Pendente | ⬜ Rejeitado

**Observações**:

---

---

---

---

**Última atualização**: 2025-01-24  
**Revisar antes de cada deploy em produção**
