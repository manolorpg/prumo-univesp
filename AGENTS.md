# PRUMO — regras do projeto

- Produto em português brasileiro para agenda e frequência de uma clínica de fisioterapia.
- Priorizar agenda, presença e visão centralizada dos atendimentos. Não adicionar prontuário, pagamentos, emissão fiscal ou WhatsApp.
- Todo paciente e atendimento incluído no seed é fictício e serve somente para demonstração.
- Status de agendamento: SCHEDULED, IN_PROGRESS, COMPLETED, ABSENT e CANCELLED.
- Aplicação ativa em Next.js, React e TypeScript; separar interface, Route Handlers, regras e persistência. SQLite local via `node:sqlite`; manter o esquema relacional simples.
- O protótipo Python foi preservado como referência; não é o servidor principal atual.
- Para criar paciente dentro de um agendamento, reutilizar a mesma API/camada de dados e preservar os campos do rascunho do agendamento.
- Acessibilidade: HTML semântico, labels, foco visível, status com texto além de cor e layout responsivo.
- Nunca descrever dados de demonstração como reais. Não adicionar integração/funcionalidade fora do escopo de agenda, frequência e pacientes.
