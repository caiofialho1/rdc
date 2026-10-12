# Modelo de negócio (Painel de Controle)

Base: `docs/DATABASE_AUDIT.md`. Cada regra abaixo é marcada como **confirmada** (direto do schema/RPC) ou **hipótese** (inferência razoável, a validar com o responsável do contrato antes de virar KPI).

## Entidades

- **RDC** (Relatório Diário de Campo): um registro por responsável/data/ativo, com status de fluxo (`Rascunho → Enviado → Validado | Em revisão → Substituído` / `Cancelado`). Revisões formam uma cadeia (`revisao_de`/`substituido_por`); só a versão vigente conta nas views operacionais.
- **Atividade**: execução de uma disciplina (PAC=pintura anticorrosiva, REC=recuperação estrutural, TEL/COB=telhado/cobertura, ANDAIME=andaime) dentro de um RDC, com efetivo por função e duração.
- **Impacto**: intervalo de parada/bloqueio registrado no RDC (não é uma atividade produtiva).
- **Memória de cálculo (MC)**: planilha de medição por contrato/ativo/disciplina, com previsto e executado por item e por etapa (ex.: LAV, JAT_1, JAT_2, PRM C5, A05, F22, FAB, MONT).

## Esforço (confirmado)

- **HH trabalhado** = Σ(efetivo_total × duração em minutos)/60, por atividade. Mede esforço informado, não produção nem produtividade.
- **HH de impacto** = duração do impacto × maior efetivo entre as atividades do RDC (a equipe que ficou parada). Quando se filtra por disciplina, o HH de impacto é **rateado** pela participação daquela disciplina no HH trabalhado do RDC — não há HH de impacto "nativo" por disciplina.
- **Espera PTS** = `pts_abertura − pts_solicitacao`, só quando ambos os horários existem. Ausência de PTS, PTS sem horário declarado e PTS com espera calculada são **três estados distintos** — nunca tratar ausência como zero.

## Status não é desempenho (confirmado)

`Validado` é uma decisão operacional (alguém revisou e aprovou), não um indicador de qualidade do trabalho. `Em revisão` e `Cancelado` exigem motivo (`obs_validacao`). Não há cor "boa/má" implícita no status — o painel deve mostrar a contagem por status como pendência de fluxo, não como nota de desempenho.

## Produção física (confirmado)

- PAC: produção = `previsto × %exec` (m²), lançada na data de cada etapa.
- REC/TEL: produção = `exec_qtd` direto (kg), mesma lógica de data por etapa.
- Cada etapa pertence a um **ciclo de medição de 21 a 20** (ex.: ciclo de setembro vai de 21/08 a 20/09). A view resolve qual versão da planilha vale para cada data — não é para o painel recalcular isso, só exibir o `ciclo` que a view já devolve.

## Reconciliação produção × RDC (confirmado — é o propósito central do painel, não decoração)

Três situações, por TAG+OM+disciplina+data:
- **Produção com RDC**: há produção registrada na MC e RDC(s) de campo cobrindo aquela combinação.
- **Produção sem RDC**: produção registrada, nenhum RDC correspondente — sinal de RDC não emitido ou mal classificado.
- **RDC sem produção**: RDC emitido, nenhuma produção batida na MC daquele dia/tag — pode ser atraso de medição, atividade não produtiva (ex.: só impacto) ou erro de TAG/OM.

Essas três situações **são o indicador**, não um detalhe a esconder atrás de um total. Qualquer tela que agregue produção deve deixar a situação visível ou filtrável.

## Financeiro (confirmado)

- `valor = produção × preço`, com preço vindo de `mc_precos` (contrato + disciplina + etapa).
- `etapas_sem_preco`: etapas com produção registrada mas sem preço cadastrado. Isso **não é zero** — é uma lacuna de cadastro que esconde valor real. Deve aparecer como alerta, nunca ser omitido do total sem indicação.

## Rateio entre responsáveis (confirmado)

Quando mais de um responsável tem RDC no mesmo TAG+OM+disciplina+data, a produção (física e financeira) é dividida pela participação de cada um: por HH → se não houver HH, por horas → se não houver nenhum dos dois, partes iguais. O campo `participacao` (fração) deve ser mostrado explicitamente onde a produção rateada aparecer — rateio escondido vira número que não bate com nenhuma fonte.

## O que não existe (não inventar)

- Nenhuma meta, orçamento ou baseline de produtividade está no schema. Enquanto isso não mudar, nenhum KPI deste painel compara "realizado" contra "meta" — só mostra o realizado e, quando fizer sentido, o previsto da própria MC (que é "quanto essa planilha previu", não uma meta gerencial).
- Nenhuma regra de dia útil/corrido ou prazo contratual está no schema — qualquer cálculo de prazo é hipótese e deve ser sinalizado como pendência, não calculado silenciosamente.
