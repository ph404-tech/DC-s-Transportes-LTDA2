# Guia de Instalação e Execução - DC's Transportes App

Este guia explica como rodar a versão Desktop do aplicativo, necessária para usar o recurso de **Telemetria Automática**.

## 1. Instalar Node.js
Se você ainda não tem, baixe e instale o Node.js: [https://nodejs.org/](https://nodejs.org/)

## 2. Instalar Dependências
Abra um terminal (PowerShell ou CMD) na pasta do projeto e execute:
```bash
npm install
```
Isso instalará o `electron` e outras dependências listadas no `package.json`.

## 3. Rodar o Aplicativo
No terminal, execute:
```bash
npm start
```
Uma janela se abrirá com o site rodando como um aplicativo desktop.

## 4. Integração com Telemetria (Opcional, para contagem automática)
Para que a contagem automática de KM funcione, você precisa ter compilado e instalado o plugin `.dll` conforme as instruções em `telemetry_plugin/COMO_COMPILAR.md`.

Uma vez que o jogo esteja rodando com o plugin e o aplicativo esteja aberto, o aplicativo irá verificar a cada 5 segundos se uma entrega foi finalizada. Quando você terminar uma entrega no jogo, o aplicativo perguntará se deseja salvar a viagem automaticamente.
