# PRUMO

Plataforma demonstrativa para gestão de agenda e frequência em uma clínica de fisioterapia. Pacientes e atendimentos incluídos no seed são fictícios e existem exclusivamente para apresentação do protótipo.

## Tecnologias

- Node.js 22.13+ (usa `node:sqlite`; Node 24 recomendado)
- Next.js 15, React 19 e TypeScript
- SQLite local, acessado pelo módulo SQLite integrado ao Node

## Requisitos e execução

Instale Node.js e npm. Na pasta do projeto:

```powershell
npm install
npm run dev
```

Abra http://localhost:3000. Para validar antes da apresentação:

```powershell
npm test
npm run lint
npm run build
npm start
```

O primeiro acesso é demonstrativo: clique em **Entrar como Débora**. Não existe senha nem autenticação real. O banco `data/prumo.db` é criado automaticamente na primeira execução; a aplicação preserva o SQLite já criado pelo protótipo anterior. Para recomeçar com o seed, pare o servidor e remova esse arquivo.

## Funcionalidades

- Dashboard com indicadores calculados dos agendamentos, agenda do dia, próximos horários e frequência semanal.
- Agenda diária com navegação por datas, cadastro/edição e alteração de status.
- Criação de um paciente diretamente no formulário de novo agendamento; ao salvar, o novo paciente é selecionado automaticamente.
- Cadastro e edição de paciente, contato e situação ativa/inativa.
- Frequência com filtros de paciente, período e status.
- Relatórios simples com filtros de período, totais e tabela de atendimentos.
- API JSON em `/api/patients`, `/api/appointments`, `/api/frequency` e `/api/dashboard`.
- Layout adaptável para desktop e dispositivos menores.

## Persistência e limites

O esquema relacional `patients` e `appointments` e a camada de operações ficam em `src/lib/`. O protótipo Python inicial foi preservado como referência em `server.py`, `database.py` e `python-reference/static/`; a aplicação atual é a versão Next.js. A API e o SQLite rodam localmente sem serviço externo. O acesso é apenas demonstrativo, não há autenticação real. Não inclui prontuário, recursos financeiros, integração WhatsApp ou dados clínicos.
