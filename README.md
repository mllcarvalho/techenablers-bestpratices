# 📚 VSCode Extension: techenablers-bestpratices

## Descrição

Este plugin do VSCode analisa arquivos de configuração de infraestrutura e código, fornecendo diagnósticos para garantir que as melhores práticas estão sendo seguidas. Ele verifica arquivos específicos em ambientes de produção, desenvolvimento e homologação, identificando problemas e sugerindo correções.

## 🚀 Funcionamento da Extensão

### Ativação

A função `activate` é chamada quando a extensão é ativada. Ela configura a coleção de diagnósticos, define os padrões de regex para identificar arquivos de diferentes ambientes e realiza buscas nos diretórios específicos para os arquivos de configuração.

### Regras de Diagnóstico

#### 🏭 Produção

- **Variáveis de Ambiente**: Verifica se há referências a ambientes de desenvolvimento ou homologação em arquivos de produção.
- **Parametrização**: 
  - `Log retention`: Deve ser igual ou superior a 10 dias.
  - `desired`, `min`, `minimum` tasks: Deve ser igual ou superior a 3.
  - `max`, `maximum` tasks: Deve ser igual ou inferior a 70.
  - `grace period`: Deve ser inferior a 200 segundos.
  - `cooldown`: Deve estar entre 200 e 700 segundos.
- **Espaços em Branco**: Verifica se há espaçamentos indesejados em `subnet` e `vpc`.
- **Subnets**: Deve haver pelo menos 3 subnets configuradas (3 AZs).
- **Chaves Expostas**: Verifica se `tokens`, `senhas` ou `chaves` estão expostos.
- **Memória e CPU**: Memória deve ser igual ou superior a 512MB e CPU deve ser igual ou superior a 512.
- **Capacity Provider**: Verifica utiliazão de `spot` em produção.
- **Health Check**: Verifica a configuração de `check start`, `check interval` e `check threshold`.
- **JVM**: Verifica a presença da configuração de JVM no dockerfile.
- **.iupipes**: Verifica a inclusão correta de email no arquivo .iupipes.yml

#### 💻 Desenvolvimento e Homologação

- **Variáveis de Ambiente**: Verifica se há referências a ambientes de produção.
- **Parametrização**: 
  - `Log retention`: Deve ser igual ou inferior a 1 dia.
  - `desired`, `min`, `minimum` tasks: Deve ser igual ou inferior a 1.
  - `max`, `maximum` tasks: Deve ser igual ou inferior a 3.
- **Espaços em Branco**: Verifica se há espaçamentos indesejados em `subnet` e `vpc`.
- **Chaves Expostas**: Verifica se `tokens`, `senhas` ou `chaves` estão expostos.
- **Memória e CPU**: Memória deve ser igual ou inferior a 2048MB e CPU deve ser igual ou inferior a 1024.
- **Capacity Provider**: Deve utilizar `spot` em desenvolvimento e homologação.
- **Tipo de Instância**: Verifica se está utilizando instâncias `t4g` e se não está utilizando instâncias `large`.
- **RDS**: Verifica se não está utilizando réplicas de leitura e se está utilizando instâncias `t4g`.
- **DynamoDB**: Verifica se está utilizando `PAY_PER_REQUEST`.
- **API Gateway**: Verifica se `logging_level` está configurado e se `x_ray` está configurado.

### 📂 Monitoramento de Arquivos

A extensão monitora a salvamento e a mudança de arquivos no editor ativo. Ao salvar ou mudar para um arquivo específico, ela verifica se o arquivo corresponde aos padrões de regex definidos e aplica os diagnósticos apropriados.

![Multi Diagnostics](./resources/imgreadme.png)

## 🌟 Contribuindo

Para contribuir com o desenvolvimento deste plugin, siga as etapas abaixo:

1. **Fork o Repositório**: Crie um fork do repositório original.
2. **Clone o Repositório**: Clone seu fork para sua máquina local.
3. **Crie um Branch**: Crie um novo branch para suas modificações.
4. **Faça as Modificações**: Realize as alterações necessárias em seu branch.
5. **Teste as Alterações**: Teste suas modificações para garantir que funcionam conforme esperado.
6. **Commit as Alterações**: Commit suas alterações com uma mensagem de commit clara.
7. **Push para o GitHub**: Push suas alterações para o GitHub.
8. **Abra um Pull Request**: Abra um pull request para que suas alterações sejam revisadas e possivelmente mescladas no repositório original.

Por favor, certifique-se de que seu código segue as melhores práticas de codificação e está bem documentado. Se tiver dúvidas ou precisar de ajuda, não hesite em abrir uma issue no repositório.

---

Esta documentação fornece uma visão geral do funcionamento do plugin e das regras implementadas para garantir a qualidade dos arquivos de configuração de infraestrutura e código. Siga as orientações para contribuir e ajude a melhorar esta extensão.


