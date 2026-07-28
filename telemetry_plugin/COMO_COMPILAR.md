# Guia de Compilação e Instalação - Plugin de Telemetria ETS2

Este guia explica como compilar o arquivo `.dll` necessário para que o Euro Truck Simulator 2 envie os dados das suas viagens para o nosso aplicativo.

## O Que é Isso?
O **Plugin de Telemetria** é um arquivo (`ets2_km_tracker.dll`) que você coloca na pasta do jogo. Ele "observa" suas entregas e salva os dados (km, carga, dinheiro) em um arquivo que o App Desktop lê.

## Pré-requisitos
1. **Visual Studio 2022** (Community é gratuito) - Instale a carga de trabalho "Desenvolvimento para Desktop com C++".
2. **SCS SDK** - Arquivos oficiais da desenvolvedora do jogo.

## Passo 1: Obter o SCS SDK
1. Baixe o SDK oficial: [https://github.com/scssoftware/scs_sdk_plugin](https://github.com/scssoftware/scs_sdk_plugin)
2. Extraia o arquivo ZIP.
3. Copie o conteúdo da pasta `include` do SDK para uma pasta chamada `include` dentro de `telemetry_plugin/`.
   - Você deve ficar com: `telemetry_plugin/include/scssdk_telemetry.h`, etc.

## Passo 2: Compilar a DLL
1. Abra o **Visual Studio**.
2. Clique em "Criar um novo projeto".
3. Pesquise por "DLL" e escolha **Biblioteca de Vínculo Dinâmico (DLL)** (C++ / Windows).
4. Nomeie o projeto como `ets2_km_tracker`.
5. Copie o código do arquivo `main.cpp` (que está nesta pasta) e substitua todo o código do `dllmain.cpp` ou arquivo principal criado pelo Visual Studio.
6. **Configuração Importante**:
   - Mude a configuração (topo da tela) de `Debug` para **Release**.
   - Mude a arquitetura de `x86` para **x64**.
7. **Adicionar os Includes**:
   - Clique com o botão direito no projeto -> Propriedades.
   - Vá em `C/C++` -> `Geral` -> `Diretórios de Inclusão Adicionais`.
   - Adicione o caminho da pasta `include` que você criou no Passo 1.
8. Vá em menu **Compilar** -> **Solução de Compilação**.

Se der certo, o arquivo `ets2_km_tracker.dll` aparecerá na pasta `x64/Release` do seu projeto.

## Passo 3: Instalar no ETS2
1. Vá até a pasta de instalação do jogo.
   - Exemplo Steam: `C:\Program Files (x64)\Steam\steamapps\common\Euro Truck Simulator 2`
2. Entre na pasta `bin/win_x64`.
3. Crie uma pasta chamada `plugins` (se não existir).
4. Copie o arquivo `ets2_km_tracker.dll` que você compilou e cole dentro de `bin/win_x64/plugins`.

## Passo 4: Testar
1. Abra o jogo.
2. Ao iniciar, deve aparecer uma mensagem do jogo avisando que um "SDK Avançado" foi detectado. Aceite.
3. Faça uma entrega.
4. Verifique se o arquivo `tracker_data.json` foi criado na sua pasta de **Documentos** -> `ETS2_Tracker`.

---
**Precisa de ajuda?** Entre em contato com o suporte da DC's Transportes.
