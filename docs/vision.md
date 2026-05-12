# Visão e posicionamento

## Tese

O mercado de sales engagement tem dois extremos mal conectados:

- **CRMs de registro** (Pipedrive, Twenty, HubSpot): bons em guardar deals, fracos em executar cadência multi-canal — especialmente WhatsApp-first.
- **Sales engagement tools** (Outreach, Salesloft, Reply, Meetime): caros, US-centric, email/phone-first, WhatsApp tratado como cidadão de segunda.

No Brasil/LatAm/Índia/sudeste asiático, vendas acontecem no WhatsApp. Nenhuma das duas categorias foi desenhada pra isso. A solução padrão hoje é gambiarra: CRM + n8n + API de WhatsApp + planilha. Funciona, mas é frágil e exige engenheiro de automação de plantão.

**Kizunu é o que falta:** uma plataforma open-source de sales engagement _channel-agnostic_, com canais plugáveis via OpenAPI. WhatsApp é o primeiro canal, mas o motor não é específico de WhatsApp — Telegram, email, SMS, voz, LinkedIn, RCS são plugins.

## O que torna Kizunu diferente

1. **Canais como plugins** — Meta Cloud API, Z-API, Evolution, WPPConnect, Twilio, SendGrid — cliente escolhe (ou implementa) o provider.
2. **Cadência como código** — sequência declarativa de toques com parada automática por resposta, multi-canal.
3. **API-first** — REST + OpenAPI desde o dia 1. UI é cliente da própria API.
4. **Open core** — engine + conectores comuns sob licença permissiva; cloud paga e features enterprise comerciais.
5. **CRM opcional** — Kizunu tem CRM nativo simples, mas integra com Pipedrive/HubSpot/Salesforce via conectores.

## Comparáveis mentais

- **Novu pra outbound sales** (plugin system de notificação → plugin system de engagement)
- **n8n vertical** (workflow engine focado em cadência de vendas)
- **Twilio Engage open source** (orquestração multi-canal, mas OSS)
- **Twenty + cadência** (Twenty é CRM bonito; Kizunu adiciona o motor de execução que falta)

## Roadmap de visão (não MVP — horizonte longo)

| Fase | Foco                     | Resolve                                                      |
| ---- | ------------------------ | ------------------------------------------------------------ |
| 1    | Engagement engine        | Cadência multi-canal com parada por resposta                 |
| 2    | CRM nativo + conectores  | Pipeline, deals, contatos; conectores com Pipedrive/HubSpot  |
| 3    | Captação / top of funnel | Forms, landing pages, enrichment, scoring                    |
| 4    | Inteligência (IA)        | Classificação de resposta, geração de toque, coaching de BDR |

Cada fase abre TAM maior. Não tentar fazer tudo no v0.1.

## Posicionamento de mercado

**Categoria:** Sales engagement platform (open source, channel-agnostic).

**Competição direta:**

- **Outreach / Salesloft / Reply** — enterprise, US-centric, sem WhatsApp decente, fechados.
- **Kommo / Leadsales / Sleekflow** — BR/LatAm WhatsApp-first, fechados, sem plugin system real.
- **Twenty** — CRM OSS bonito, mas não faz cadência multi-canal.

**Vantagem defensável:**

1. Plugin system de canal — outros têm canais fixos.
2. Open source — adoção via comunidade dev (Twenty, Cal, Novu, n8n provam o modelo).
3. WhatsApp-first sem trair canais ocidentais — único produto que serve LatAm e US/EU igualmente.

## Estratégia comercial: open core

**Core open source** (provavelmente AGPLv3 ou Apache 2.0):

- Engine de cadência
- Plugin SDK + conectores comuns (WhatsApp Evolution, Email SMTP, etc)
- API REST + OpenAPI
- UI básica
- Self-host (Docker compose)

**Cloud paga (kizunu.com):**

- Hosting gerenciado
- IA embarcada (classificação de resposta, geração de toque)
- Multi-tenant
- SSO, audit log, RBAC avançado
- Conectores premium (Salesforce, HubSpot Enterprise)
- Suporte SLA

**Decisão pendente de licença:**

- **AGPLv3:** protege contra cloud copy (AWS-style). Mais forte comercialmente. Risco: alguns enterprises evitam.
- **Apache 2.0 + cloud paga:** mais adoção, menor proteção. Modelo Twenty/Supabase.
- **Sugestão inicial:** AGPLv3 pro core + cloud comercial separado. Reavaliar se atrapalhar adoção.

## Quem é o usuário-alvo

**v0.1 (early adopters):**

- Operações de outbound de PMEs brasileiras (10-50 funcionários, 1-5 BDRs)
- Time técnico já familiar com n8n / self-host / APIs
- Hoje usa Pipedrive ou planilha + WhatsApp manual + n8n quebrado

**v1.0 (mercado):**

- PMEs em qualquer país com WhatsApp/SMS dominante (BR, MX, IN, ID, NG)
- Times de RevOps em scale-ups que querem alternativa OSS ao Outreach
- Agências/consultorias que rodam outbound pra clientes (multi-tenant)

**Não-alvo (deliberadamente):**

- Enterprise Fortune 500 (não compram OSS pequeno no início)
- Comerciantes não-técnicos solo (vão pra Kommo plug-and-play)

## Como o produto evita armadilhas comuns

1. **Compliance WhatsApp:** plugin system isola risco — se Evolution banir, troca pro Meta Cloud sem refazer cadência.
2. **Não vira "faz tudo, mal":** v0.1 é cirúrgico (1 canal real, sem CRM completo). Expansão é guiada por cliente real.
3. **Não compete com CRM no v0.1:** integra com Pipedrive existente. CRM nativo só na fase 2.
4. **OSS sustentável:** open core desde o dia 1, sem dilema "tudo grátis pra sempre".

## Métricas de sucesso (não MVP, longo prazo)

- **6 meses:** 3-5 clientes piloto usando self-host, feedback validando tese de plugin system.
- **12 meses:** 100+ GitHub stars, primeiros conectores community-contributed, cloud beta com 10+ usuários pagantes.
- **24 meses:** $10k+ MRR cloud, comunidade de devs ativa, 3+ canais oficiais maduros.
