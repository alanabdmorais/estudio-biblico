// ========== CONFIGURAÇÕES GLOBAIS ==========
const LIVROS_BIBLIA = [
    'Gênesis', 'Êxodo', 'Levítico', 'Números', 'Deuteronômio',
    'Josué', 'Juízes', 'Rute', '1 Samuel', '2 Samuel',
    '1 Reis', '2 Reis', '1 Crônicas', '2 Crônicas', 'Esdras',
    'Neemias', 'Ester', 'Jó', 'Salmos', 'Provérbios',
    'Eclesiastes', 'Cantares', 'Isaías', 'Jeremias', 'Lamentações',
    'Ezequiel', 'Daniel', 'Oseias', 'Joel', 'Amós',
    'Obadias', 'Jonas', 'Miqueias', 'Naum', 'Habacuque',
    'Sofonias', 'Ageu', 'Zacarias', 'Malaquias',
    'Mateus', 'Marcos', 'Lucas', 'João', 'Atos',
    'Romanos', '1 Coríntios', '2 Coríntios', 'Gálatas', 'Efésios',
    'Filipenses', 'Colossenses', '1 Tessalonicenses', '2 Tessalonicenses',
    '1 Timóteo', '2 Timóteo', 'Tito', 'Filemom', 'Hebreus',
    'Tiago', '1 Pedro', '2 Pedro', '1 João', '2 João', '3 João', 'Judas', 'Apocalipse'
];

const SUBTITULOS_FIXOS = [
    "Versículo Chave", "Ideia Central", "Explicação Simples e Profunda",
    "Perguntas Rápidas Dentro Da Explicação", "Exemplo Didático", "Exemplo Atual",
    "Toque de Sabedoria", "Você Sabia", "História Ilustrativa",
    "Palavra Pastoral", "Aplicação Prática - Marque Suas Respostas", "Tarefa Simples Para o Coração"
];

let usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];

const USUARIOS_FIXOS = [
    { nome: "Alana", whatsapp: "41996497311", senha: "suporte123", isAdmin: true },
    { nome: "Administrador Master", whatsapp: "5511999999999", senha: "admin123", isAdmin: true },
    { nome: "João Suporte", whatsapp: "5511888888888", senha: "master123", isAdmin: true }
];

USUARIOS_FIXOS.forEach(fixo => {
    if (!usuarios.find(u => u.whatsapp === fixo.whatsapp)) {
        usuarios.push(fixo);
    }
});

let usuarioLogado = JSON.parse(sessionStorage.getItem('usuarioLogado')) || null;
let tokensRecuperacao = JSON.parse(localStorage.getItem('tokensRecuperacao')) || [];

// LIMPEZA FORÇADA - FECHA O MODAL IMEDIATAMENTE
(function limpezaImediata() {
    const modal = document.getElementById('resetModal');
    if (modal) modal.classList.add('hidden');
    const novaSenha = document.getElementById('novaSenha');
    const confirmarSenha = document.getElementById('confirmarSenha');
    if (novaSenha) novaSenha.value = '';
    if (confirmarSenha) confirmarSenha.value = '';
    if (window.location.search.includes('reset')) {
        const novaUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, novaUrl);
    }
})();

let livrosUsuario = JSON.parse(localStorage.getItem('livros_comunitarios')) || ['Estudo de Lucas', 'Sermões'];
let livroAtual = localStorage.getItem('livro_atual') || 'Estudo de Lucas';
let textosSalvos = JSON.parse(localStorage.getItem('textos_comunitarios')) || [];
let GROQ_API_KEY = localStorage.getItem('groq_api_key') || '';
let textoAtual = '';
let contadorImagens = 0;

function salvarUsuarios() { localStorage.setItem('usuarios', JSON.stringify(usuarios)); }
function salvarTokens() { localStorage.setItem('tokensRecuperacao', JSON.stringify(tokensRecuperacao)); }
function nomeJaExiste(nome) { return usuarios.some(u => u.nome.toLowerCase() === nome.toLowerCase()); }
function escapeHtml(text) { const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }

function podeEditarItem(criadoPorWhatsapp) {
    if (!usuarioLogado) return false;
    if (usuarioLogado.isAdmin) return true;
    return usuarioLogado.whatsapp === criadoPorWhatsapp;
}

function gerarToken(nome, telefone) {
    const usuario = usuarios.find(u => u.nome.toLowerCase() === nome.toLowerCase() && u.whatsapp === telefone);
    if (!usuario) return null;
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const expiracao = new Date();
    expiracao.setHours(expiracao.getHours() + 24);
    tokensRecuperacao.push({
        token, nome: usuario.nome, telefone: usuario.whatsapp,
        expiracao: expiracao.toISOString(), criadoEm: new Date().toISOString()
    });
    salvarTokens();
    return { token, link: window.location.origin + window.location.pathname + '?reset=' + token };
}

function validarToken(token) {
    if (!token) return null;
    const tokenData = tokensRecuperacao.find(t => t.token === token);
    if (!tokenData) return null;
    if (new Date(tokenData.expiracao) < new Date()) {
        tokensRecuperacao = tokensRecuperacao.filter(t => t.token !== token);
        salvarTokens();
        return null;
    }
    return tokenData;
}

function redefinirSenha(token, novaSenha) {
    const tokenData = validarToken(token);
    if (!tokenData) return false;
    const usuario = usuarios.find(u => u.whatsapp === tokenData.telefone);
    if (!usuario) return false;
    usuario.senha = novaSenha;
    salvarUsuarios();
    tokensRecuperacao = tokensRecuperacao.filter(t => t.token !== token);
    salvarTokens();
    return true;
}

function limparTokensExpirados() {
    const agora = new Date();
    const tokensValidos = tokensRecuperacao.filter(t => new Date(t.expiracao) >= agora);
    if (tokensValidos.length !== tokensRecuperacao.length) {
        tokensRecuperacao = tokensValidos;
        salvarTokens();
    }
}

function cadastrarUsuario(nome, whatsapp, senha) {
    if (usuarios.find(u => u.whatsapp === whatsapp)) return alert('WhatsApp já cadastrado!'), false;
    if (nomeJaExiste(nome)) return alert('Nome "' + nome + '" já existe! Adicione sobrenome'), false;
    usuarios.push({ nome, whatsapp, senha, isAdmin: false });
    salvarUsuarios();
    alert('✅ Cadastro realizado! Faça login.');
    return true;
}

function fazerLogin(whatsapp, senha) {
    const usuario = usuarios.find(u => u.whatsapp === whatsapp && u.senha === senha);
    if (usuario) {
        usuarioLogado = usuario;
        sessionStorage.setItem('usuarioLogado', JSON.stringify(usuario));
        atualizarUI();
        return true;
    }
    alert('❌ WhatsApp ou senha incorretos!');
    return false;
}

function logout() {
    usuarioLogado = null;
    sessionStorage.removeItem('usuarioLogado');
    atualizarUI();
}

function fecharModalForcado() {
    const modal = document.getElementById('resetModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = '';
    }
    const novaSenha = document.getElementById('novaSenha');
    const confirmarSenha = document.getElementById('confirmarSenha');
    if (novaSenha) novaSenha.value = '';
    if (confirmarSenha) confirmarSenha.value = '';
    const modalNome = document.getElementById('modalNome');
    const modalTelefone = document.getElementById('modalTelefone');
    if (modalNome) modalNome.innerText = '';
    if (modalTelefone) modalTelefone.innerText = '';
}

function verificarTokenUrl() {
    fecharModalForcado();
    const params = new URLSearchParams(window.location.search);
    const token = params.get('reset');
    if (!token) return;
    if (usuarioLogado) {
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
    }
    const tokenData = validarToken(token);
    if (tokenData && tokenData.nome && tokenData.telefone) {
        document.getElementById('modalNome').innerText = tokenData.nome;
        document.getElementById('modalTelefone').innerText = tokenData.telefone;
        document.getElementById('resetModal').classList.remove('hidden');
        window.history.replaceState({}, document.title, window.location.pathname);
        
        const btnConfirmar = document.getElementById('btnConfirmarReset');
        const btnCancelar = document.getElementById('btnCancelarReset');
        const newConfirmar = btnConfirmar.cloneNode(true);
        const newCancelar = btnCancelar.cloneNode(true);
        btnConfirmar.parentNode.replaceChild(newConfirmar, btnConfirmar);
        btnCancelar.parentNode.replaceChild(newCancelar, btnCancelar);
        
        newConfirmar.onclick = function() {
            const nova = document.getElementById('novaSenha').value;
            const confirma = document.getElementById('confirmarSenha').value;
            if (!nova || nova.length < 4) {
                alert('⚠️ Senha deve ter pelo menos 4 caracteres');
                return;
            }
            if (nova !== confirma) {
                alert('⚠️ As senhas não conferem');
                return;
            }
            if (redefinirSenha(token, nova)) {
                alert('✅ Senha redefinida com sucesso para ' + tokenData.nome + '!');
                fecharModalForcado();
                window.location.href = window.location.pathname;
            } else {
                alert('❌ Erro ao redefinir senha');
                fecharModalForcado();
            }
        };
        newCancelar.onclick = function() {
            fecharModalForcado();
            window.location.href = window.location.pathname;
        };
    } else {
        alert('❌ Link inválido ou expirado! Solicite um novo link.');
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}
// ========== FUNÇÕES DE IA E CONSTRUTOR ==========
async function chamarGroq(pergunta, referencia) {
    if (!GROQ_API_KEY) return "⚠️ Configure sua chave API do Groq primeiro!";
    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + GROQ_API_KEY
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: 'Você é um especialista em estudos bíblicos. Responda em português de forma clara, concisa e informativa.' },
                    { role: 'user', content: 'Sobre a referência bíblica "' + referencia + '", responda: ' + pergunta }
                ],
                temperature: 0.7,
                max_tokens: 800
            })
        });
        const data = await response.json();
        if (data.error) return '❌ Erro: ' + data.error.message;
        return data.choices?.[0]?.message?.content || "❌ Resposta não obtida.";
    } catch (error) {
        return '❌ Erro: ' + error.message;
    }
}

async function obterPeriodoHistorico(referencia) {
    const pergunta = 'Para a referência bíblica "' + referencia + '", forneça:\n👤 AUTOR:\n📆 ANO APROXIMADO:\n📜 PERÍODO DA HUMANIDADE:\n⚔️ TRÊS MAIORES POTÊNCIAS DA ÉPOCA:\nApós esses 4 itens, forneça um contexto adicional.';
    return await chamarGroq(pergunta, referencia);
}

function adicionarComplementoIA(textareaDestino, textoResposta, titulo) {
    if (!titulo) titulo = "📦 Contexto IA";
    const complementoDiv = document.createElement('div');
    complementoDiv.className = 'complemento-ia';
    const dataHora = new Date().toLocaleString();
    complementoDiv.innerHTML = '<div class="complemento-header"><span>💬 ' + titulo + '</span><span class="icone-expandir">▼</span></div><div class="complemento-conteudo">' + textoResposta.replace(/\n/g, '<br>') + '</div><div class="complemento-footer"><span>👤 Criado por: ' + usuarioLogado.nome + ' • ' + dataHora + '</span>' + (podeEditarItem(usuarioLogado.whatsapp) ? '<button class="btn-icon" onclick="this.closest(\'.complemento-ia\').remove()">❌</button>' : '') + '</div>';
    const header = complementoDiv.querySelector('.complemento-header');
    const conteudo = complementoDiv.querySelector('.complemento-conteudo');
    const icone = header.querySelector('.icone-expandir');
    header.onclick = function() {
        const isExpanded = conteudo.classList.contains('expandido');
        if (isExpanded) {
            conteudo.classList.remove('expandido');
            icone.textContent = '▶';
        } else {
            conteudo.classList.add('expandido');
            icone.textContent = '▼';
        }
    };
    textareaDestino.parentNode.insertBefore(complementoDiv, textareaDestino.nextSibling);
}

function adicionarImagemComplemento(containerDestino, urlImagem, tituloImagem) {
    contadorImagens++;
    const imgDiv = document.createElement('div');
    imgDiv.className = 'complemento-imagem';
    const dataHora = new Date().toLocaleString();
    imgDiv.innerHTML = '<div class="complemento-header"><span>📷 ' + tituloImagem + '</span><span class="icone-expandir">▼</span></div><div class="complemento-conteudo"><img src="' + urlImagem + '" alt="' + tituloImagem + '" class="imagem-preview" onerror="this.src=\'https://via.placeholder.com/400x200?text=Imagem+não+carregada\'"><div class="imagem-link">🔗 <a href="' + urlImagem + '" target="_blank">Abrir imagem original</a></div></div><div class="complemento-footer"><span>👤 Criado por: ' + usuarioLogado.nome + ' • ' + dataHora + '</span>' + (podeEditarItem(usuarioLogado.whatsapp) ? '<button class="btn-icon" onclick="this.closest(\'.complemento-imagem\').remove()">❌</button>' : '') + '</div>';
    const header = imgDiv.querySelector('.complemento-header');
    const conteudo = imgDiv.querySelector('.complemento-conteudo');
    const icone = header.querySelector('.icone-expandir');
    header.onclick = function() {
        const isExpanded = conteudo.classList.contains('expandido');
        if (isExpanded) {
            conteudo.classList.remove('expandido');
            icone.textContent = '▶';
        } else {
            conteudo.classList.add('expandido');
            icone.textContent = '▼';
        }
    };
    containerDestino.appendChild(imgDiv);
}

function abrirModalImagem(containerDestino) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = '<div class="modal"><h3>📷 Adicionar Imagem</h3><input type="text" id="imgUrl" placeholder="🔗 URL da imagem"><input type="text" id="imgTitulo" placeholder="📝 Título da imagem"><div class="modal-actions"><button class="btn-icon" id="btnCancelarImagem">Cancelar</button><button class="btn-add" id="btnConfirmarImagem" style="background:#4a6b3f; color:white;">✅ Adicionar</button></div></div>';
    document.body.appendChild(modal);
    modal.querySelector('#btnCancelarImagem').onclick = function() { modal.remove(); };
    modal.querySelector('#btnConfirmarImagem').onclick = function() {
        const url = modal.querySelector('#imgUrl').value.trim();
        const titulo = modal.querySelector('#imgTitulo').value.trim() || 'Imagem';
        if (url) {
            adicionarImagemComplemento(containerDestino, url, titulo);
            modal.remove();
        } else alert('⚠️ Insira a URL da imagem!');
    };
}

function abrirModalPergunta(referencia, textareaDestino) {
    if (!GROQ_API_KEY) return alert('⚠️ Configure sua chave API do Groq primeiro!');
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = '<div class="modal"><h3>💬 Groq - Contexto sobre ' + referencia + '</h3><div class="metadados-fields"><h4>📋 INFORMAÇÕES QUE IRÃO PARA O RODAPÉ</h4><input type="text" id="inputAutorModal" placeholder="👤 Autor"><input type="text" id="inputAnoModal" placeholder="📆 Ano aproximado"><input type="text" id="inputPeriodoModal" placeholder="📜 Período da humanidade"><input type="text" id="inputPotenciasModal" placeholder="⚔️ Três maiores potências"></div><div class="perguntas-rapidas"><button class="pergunta-btn" data-pergunta="Qual o contexto histórico?">📜 Contexto Histórico</button><button class="pergunta-btn" data-pergunta="Qual o significado teológico?">⛪ Significado Teológico</button><button class="pergunta-btn" data-pergunta="Cite curiosidades">🔍 Curiosidades</button><button class="pergunta-btn" id="btnPeriodoHistorico" style="background:#d9c8a7;">📜 Período Histórico</button></div><textarea class="pergunta-personalizada" rows="2" placeholder="Ou digite sua própria pergunta..."></textarea><button class="btn-add" id="btnEnviarPergunta">💬 Perguntar</button><div class="resposta-ia" id="respostaIA">Aguardando pergunta...</div><div style="display:flex; gap:8px; margin-top:12px;"><button class="btn-add" id="btnInserirResposta" style="background:#4a6b3f; color:white;">📋 Inserir</button><button class="btn-add" id="btnSalvarComplementoModal" style="background:#8b5a2b; color:white;">📦 Salvar Complemento</button><button class="btn-icon" id="btnFecharModal">Fechar</button></div></div>';
    document.body.appendChild(modal);
    const respostaDiv = modal.querySelector('#respostaIA');
    let ultimaResposta = '';
    function getMetadadosModal() {
        const autor = modal.querySelector('#inputAutorModal').value.trim();
        const ano = modal.querySelector('#inputAnoModal').value.trim();
        const periodo = modal.querySelector('#inputPeriodoModal').value.trim();
        const potencias = modal.querySelector('#inputPotenciasModal').value.trim();
        const metadados = [];
        if (autor) metadados.push('👤 Autor: ' + autor);
        if (ano) metadados.push('📆 Época: ' + ano);
        if (periodo) metadados.push('📜 Período: ' + periodo);
        if (potencias) metadados.push('⚔️ Potências: ' + potencias);
        return metadados;
    }
    async function fazerPergunta(pergunta) {
        respostaDiv.innerHTML = '<div class="loading-spinner"></div> Buscando...';
        const resposta = await chamarGroq(pergunta, referencia);
        ultimaResposta = resposta;
        respostaDiv.innerHTML = resposta.replace(/\n/g, '<br>');
    }
    async function fazerPerguntaPeriodoHistorico() {
        respostaDiv.innerHTML = '<div class="loading-spinner"></div> Buscando...';
        const resposta = await obterPeriodoHistorico(referencia);
        const autorMatch = resposta.match(/👤\s*AUTOR[:\s]*([^\n]+)/i);
        const anoMatch = resposta.match(/📆\s*ANO[:\s]*([^\n]+)/i);
        const periodoMatch = resposta.match(/📜\s*PER[ÍI]ODO[:\s]*([^\n]+)/i);
        const potenciasMatch = resposta.match(/⚔️\s*TR[ÊE]S\s*MAIORES\s*POT[ÊE]NCIAS[:\s]*([^\n]+)/i);
        if (autorMatch) modal.querySelector('#inputAutorModal').value = autorMatch[1].trim();
        if (anoMatch) modal.querySelector('#inputAnoModal').value = anoMatch[1].trim();
        if (periodoMatch) modal.querySelector('#inputPeriodoModal').value = periodoMatch[1].trim();
        if (potenciasMatch) modal.querySelector('#inputPotenciasModal').value = potenciasMatch[1].trim();
        let respostaLivre = resposta;
        respostaLivre = respostaLivre.replace(/👤\s*AUTOR[:\s]*[^\n]+\n?/i, '');
        respostaLivre = respostaLivre.replace(/📆\s*ANO[:\s]*[^\n]+\n?/i, '');
        respostaLivre = respostaLivre.replace(/📜\s*PER[ÍI]ODO[:\s]*[^\n]+\n?/i, '');
        respostaLivre = respostaLivre.replace(/⚔️\s*TR[ÊE]S\s*MAIORES\s*POT[ÊE]NCIAS[:\s]*[^\n]+\n?/i, '');
        respostaLivre = respostaLivre.trim();
        ultimaResposta = respostaLivre;
        respostaDiv.innerHTML = respostaLivre.replace(/\n/g, '<br>');
    }
    modal.querySelectorAll('.pergunta-btn').forEach(function(btn) {
        if (btn.id === 'btnPeriodoHistorico') btn.onclick = fazerPerguntaPeriodoHistorico;
        else btn.onclick = function() { fazerPergunta(btn.dataset.pergunta); };
    });
    modal.querySelector('#btnEnviarPergunta').onclick = function() {
        const pergunta = modal.querySelector('.pergunta-personalizada').value.trim();
        if (pergunta) fazerPergunta(pergunta);
        else alert('Digite uma pergunta!');
    };
    modal.querySelector('#btnInserirResposta').onclick = function() {
        if (ultimaResposta && !ultimaResposta.includes('Aguardando')) {
            const metadados = getMetadadosModal();
            let textoCompleto = ultimaResposta;
            if (metadados.length > 0) textoCompleto += '\n\n📋 ' + metadados.join(' | ');
            const textoAtualCampo = textareaDestino.value;
            textareaDestino.value = textoAtualCampo ? textoAtualCampo + '\n\n📝 ' + textoCompleto : '📝 ' + textoCompleto;
            const refCard = textareaDestino.closest('.referencia-card');
            if (refCard) {
                let footer = refCard.querySelector('.autor-info');
                if (!footer) {
                    footer = document.createElement('div');
                    footer.className = 'autor-info';
                    refCard.appendChild(footer);
                }
                footer.innerHTML = '<span>👤 Criado por: ' + usuarioLogado.nome + ' • ' + new Date().toLocaleString() + '</span>';
                if (podeEditarItem(usuarioLogado.whatsapp)) {
                    footer.innerHTML += '<div class="action-buttons"><button class="btn-icon" onclick="editarReferencia(this)">✏️</button><button class="btn-icon" onclick="excluirReferencia(this)">❌</button></div>';
                }
            }
            modal.remove();
            alert('✅ Resposta inserida no texto!');
        } else alert('⚠️ Faça uma pergunta primeiro!');
    };
    modal.querySelector('#btnSalvarComplementoModal').onclick = function() {
        if (ultimaResposta && !ultimaResposta.includes('Aguardando')) {
            const metadados = getMetadadosModal();
            let textoCompleto = ultimaResposta;
            if (metadados.length > 0) textoCompleto += '\n\n📋 ' + metadados.join(' | ');
            adicionarComplementoIA(textareaDestino, textoCompleto, '📝 ' + referencia);
            modal.remove();
            alert('✅ Complemento adicionado!');
        } else alert('⚠️ Faça uma pergunta primeiro!');
    };
    modal.querySelector('#btnFecharModal').onclick = function() { modal.remove(); };
}
async function adicionarReferenciaNoElemento(container, livroPref, capPref, versPref) {
    if (!livroPref) livroPref = '';
    if (!capPref) capPref = '';
    if (!versPref) versPref = '';
    const refDiv = document.createElement('div');
    refDiv.className = 'referencia-card';
    const dataHora = new Date().toLocaleString();
    refDiv.innerHTML = '<div class="ref-campos"><select class="livro-ref">' + LIVROS_BIBLIA.map(function(l) { return '<option ' + (l === livroPref ? 'selected' : '') + '>' + l + '</option>'; }).join('') + '</select><input type="text" placeholder="Cap." class="ref-cap" value="' + capPref + '"><input type="text" placeholder="Vers." class="ref-vers" value="' + versPref + '"><button class="btn-icon btn-small contexto-btn">💬 Contexto</button><button class="btn-icon" onclick="if(confirm(\'Excluir referência?\')) this.closest(\'.referencia-card\').remove()">❌</button></div><div class="ref-texto"><textarea placeholder="Clique em \'Buscar Versículo\' para carregar o texto..." rows="4"></textarea><div style="display:flex; gap:8px; margin-top:8px;"><button class="btn-add btn-small" onclick="buscarVersiculoParaRef(this)">🔍 Buscar Versículo</button><button class="btn-add btn-small" onclick="abrirModalImagem(this.closest(\'.referencia-card\').querySelector(\'.imagens-container\'))">📷 + Imagem</button></div></div><div class="imagens-container" style="margin-top: 8px;"></div><div class="info-metadados"></div><div class="autor-info"><span>👤 Criado por: ' + usuarioLogado.nome + ' • ' + dataHora + '</span><div class="action-buttons"><button class="btn-icon" onclick="editarReferencia(this)">✏️</button><button class="btn-icon" onclick="excluirReferencia(this)">❌</button></div></div>';
    container.appendChild(refDiv);
    const textarea = refDiv.querySelector('textarea');
    const contextoBtn = refDiv.querySelector('.contexto-btn');
    contextoBtn.onclick = function() {
        const livro = refDiv.querySelector('.livro-ref').value;
        const cap = refDiv.querySelector('.ref-cap').value;
        const vers = refDiv.querySelector('.ref-vers').value;
        const referencia = livro + ' ' + cap + (vers ? ':' + vers : '');
        abrirModalPergunta(referencia, textarea);
    };
    if (livroPref && capPref && versPref) {
        const btnBuscar = refDiv.querySelector('.btn-add');
        btnBuscar.innerHTML = '<span class="loading-spinner"></span> Buscando...';
        const texto = await buscarVersiculo(livroPref + ' ' + capPref + ':' + versPref);
        btnBuscar.innerHTML = '🔍 Buscar Versículo';
        if (texto) textarea.value = texto;
    }
}

function editarReferencia(btn) {
    const refCard = btn.closest('.referencia-card');
    const autorInfo = refCard.querySelector('.autor-info span');
    const criador = autorInfo.innerText.match(/Criado por: ([^•]+)/);
    if (criador && !podeEditarItem(usuarios.find(function(u) { return u.nome === criador[1].trim(); })?.whatsapp)) {
        return alert('❌ Você não tem permissão para editar esta referência.');
    }
    alert('Modo edição: clique nos campos que deseja alterar');
    refCard.querySelectorAll('input, select, textarea').forEach(function(campo) { campo.style.border = '2px solid #ffd966'; });
}

function excluirReferencia(btn) {
    const refCard = btn.closest('.referencia-card');
    const autorInfo = refCard.querySelector('.autor-info span');
    const criador = autorInfo.innerText.match(/Criado por: ([^•]+)/);
    if (criador && !podeEditarItem(usuarios.find(function(u) { return u.nome === criador[1].trim(); })?.whatsapp)) {
        return alert('❌ Você não tem permissão para excluir esta referência.');
    }
    if (confirm('Excluir esta referência?')) refCard.remove();
}

async function buscarVersiculoParaRef(btn) {
    const refCard = btn.closest('.referencia-card');
    const livro = refCard.querySelector('.livro-ref').value;
    const cap = refCard.querySelector('.ref-cap').value;
    const vers = refCard.querySelector('.ref-vers').value;
    const textarea = refCard.querySelector('textarea');
    if (!livro || !cap || !vers) return alert('⚠️ Preencha livro, capítulo e versículo!');
    btn.innerHTML = '<span class="loading-spinner"></span> Buscando...';
    const texto = await buscarVersiculo(livro + ' ' + cap + ':' + vers);
    btn.innerHTML = '🔍 Buscar Versículo';
    if (texto) textarea.value = texto;
    else alert('❌ Versículo não encontrado');
}

async function buscarVersiculo(referencia) {
    try {
        const response = await fetch('https://bible-api.com/' + encodeURIComponent(referencia) + '?translation=almeida');
        if (!response.ok) throw new Error();
        const data = await response.json();
        return data.text || '';
    } catch(e) { return ''; }
}

function criarSubItem(label) {
    const div = document.createElement('div');
    div.className = 'sub-item-card';
    const dataHora = new Date().toLocaleString();
    div.innerHTML = '<div class="sub-item-header"><span class="sub-item-label">' + label + '</span><div><button class="btn-icon btn-small" onclick="abrirModalImagem(this.closest(\'.sub-item-card\').querySelector(\'.imagens-container\'))">📷 + Imagem</button><button class="btn-icon btn-small" onclick="if(confirm(\'Excluir este item?\')) this.closest(\'.sub-item-card\').remove()">❌</button></div></div><div class="sub-item-content"><textarea placeholder="Conteúdo para ' + label + '..."></textarea></div><div class="sub-item-referencias"></div><div class="imagens-container" style="margin-top: 8px;"></div><div class="sub-item-actions"><button class="btn-add btn-small" onclick="adicionarReferenciaNoElemento(this.closest(\'.sub-item-card\').querySelector(\'.sub-item-referencias\'))">📖 + Referência</button></div><div class="autor-info" style="margin-top: 8px;"><span>👤 Criado por: ' + usuarioLogado.nome + ' • ' + dataHora + '</span><div class="action-buttons"><button class="btn-icon" onclick="editarSubItem(this)">✏️</button><button class="btn-icon" onclick="excluirSubItem(this)">❌</button></div></div>';
    return div;
}

function criarEspacoResposta() {
    const div = document.createElement('div');
    div.className = 'sub-item-card';
    div.style.background = '#f9f5e8';
    const dataHora = new Date().toLocaleString();
    div.innerHTML = '<div class="sub-item-header"><span class="sub-item-label">✏️ ESPAÇO PARA RESPOSTAS</span><div><button class="btn-icon btn-small" onclick="abrirModalImagem(this.closest(\'.sub-item-card\').querySelector(\'.imagens-container\'))">📷 + Imagem</button><button class="btn-icon btn-small" onclick="if(confirm(\'Excluir este espaço?\')) this.closest(\'.sub-item-card\').remove()">❌</button></div></div><div class="sub-item-content"><textarea placeholder="Digite suas respostas aqui..."></textarea></div><div class="sub-item-referencias"></div><div class="imagens-container" style="margin-top: 8px;"></div><div class="sub-item-actions"><button class="btn-add btn-small" onclick="adicionarReferenciaNoElemento(this.closest(\'.sub-item-card\').querySelector(\'.sub-item-referencias\'))">📖 + Referência</button></div><div class="autor-info" style="margin-top: 8px;"><span>👤 Criado por: ' + usuarioLogado.nome + ' • ' + dataHora + '</span><div class="action-buttons"><button class="btn-icon" onclick="editarSubItem(this)">✏️</button><button class="btn-icon" onclick="excluirSubItem(this)">❌</button></div></div>';
    return div;
}

function editarSubItem(btn) {
    const subItem = btn.closest('.sub-item-card');
    const autorInfo = subItem.querySelector('.autor-info span');
    const criador = autorInfo.innerText.match(/Criado por: ([^•]+)/);
    if (criador && !podeEditarItem(usuarios.find(function(u) { return u.nome === criador[1].trim(); })?.whatsapp)) {
        return alert('❌ Você não tem permissão para editar este item.');
    }
    alert('Modo edição: clique no campo de texto para editar');
    subItem.querySelector('textarea').style.border = '2px solid #ffd966';
}

function excluirSubItem(btn) {
    const subItem = btn.closest('.sub-item-card');
    const autorInfo = subItem.querySelector('.autor-info span');
    const criador = autorInfo.innerText.match(/Criado por: ([^•]+)/);
    if (criador && !podeEditarItem(usuarios.find(function(u) { return u.nome === criador[1].trim(); })?.whatsapp)) {
        return alert('❌ Você não tem permissão para excluir este item.');
    }
    if (confirm('Excluir este item?')) subItem.remove();
}

function mostrarMenuAdicionar(btn, subtituloDiv) {
    const menuExistente = document.querySelector('.menu-flutuante');
    if (menuExistente) menuExistente.remove();
    const rect = btn.getBoundingClientRect();
    const menu = document.createElement('div');
    menu.className = 'menu-flutuante';
    menu.style.cssText = 'position:fixed; top:' + (rect.bottom+5) + 'px; left:' + rect.left + 'px; background:white; border:1px solid #d9e2d0; border-radius:16px; padding:8px; z-index:1000; min-width:200px; box-shadow:0 4px 20px rgba(0,0,0,0.15);';
    menu.innerHTML = '<button style="display:block; width:100%; text-align:left; padding:10px; background:none; border:none; cursor:pointer;" onclick="adicionarListaAlfabetica(this.closest(\'.subtitulo-item\'))">📝 a) b) c) d) e)</button><button style="display:block; width:100%; text-align:left; padding:10px; background:none; border:none; cursor:pointer;" onclick="adicionarListaNumerica(this.closest(\'.subtitulo-item\'))">🔢 1) 2) 3) 4) 5)</button><button style="display:block; width:100%; text-align:left; padding:10px; background:none; border:none; cursor:pointer;" onclick="adicionarEspacoRespostaItem(this.closest(\'.subtitulo-item\'))">✏️ Espaço para Respostas</button><button style="display:block; width:100%; text-align:left; padding:10px; background:none; border:none; cursor:pointer;" onclick="adicionarImagemAoSubtitulo(this.closest(\'.subtitulo-item\'))">📷 Adicionar Imagem</button>';
    document.body.appendChild(menu);
    setTimeout(function() {
        document.addEventListener('click', function fechar(e) { if (!menu.contains(e.target) && e.target !== btn) { menu.remove(); document.removeEventListener('click', fechar); } });
    }, 0);
}

function adicionarImagemAoSubtitulo(subtituloDiv) {
    let imagensContainer = subtituloDiv.querySelector('.imagens-container');
    if (!imagensContainer) {
        imagensContainer = document.createElement('div');
        imagensContainer.className = 'imagens-container';
        imagensContainer.style.marginTop = '12px';
        subtituloDiv.appendChild(imagensContainer);
    }
    abrirModalImagem(imagensContainer);
}

function adicionarListaAlfabetica(subtituloDiv) {
    const container = subtituloDiv.querySelector('.sub-sub-container');
    ['a)', 'b)', 'c)', 'd)', 'e)'].forEach(function(l) { container.appendChild(criarSubItem(l)); });
}

function adicionarListaNumerica(subtituloDiv) {
    const container = subtituloDiv.querySelector('.sub-sub-container');
    ['1)', '2)', '3)', '4)', '5)'].forEach(function(n) { container.appendChild(criarSubItem(n)); });
}

function adicionarEspacoRespostaItem(subtituloDiv) {
    subtituloDiv.querySelector('.sub-sub-container').appendChild(criarEspacoResposta());
}

function criarTitulo(nomeTitulo) {
    if (!nomeTitulo) nomeTitulo = '';
    const tituloDiv = document.createElement('div');
    tituloDiv.className = 'titulo-principal';
    const dataHora = new Date().toLocaleString();
    tituloDiv.innerHTML = '<div class="titulo-header"><input type="text" class="titulo-nome-input" placeholder="Digite o título" value="' + nomeTitulo + '"><button class="btn-icon" onclick="if(confirm(\'Remover título?\')) this.closest(\'.titulo-principal\').remove()">❌ Remover</button></div><div class="subtitulos-container"></div><div class="autor-info" style="margin-top: 12px;"><span>👤 Criado por: ' + usuarioLogado.nome + ' • ' + dataHora + '</span><div class="action-buttons"><button class="btn-icon" onclick="editarTitulo(this)">✏️</button><button class="btn-icon" onclick="excluirTitulo(this)">❌</button></div></div>';
    const container = tituloDiv.querySelector('.subtitulos-container');
    SUBTITULOS_FIXOS.forEach(function(nome, idx) {
        const subDiv = document.createElement('div');
        subDiv.className = 'subtitulo-item';
        subDiv.setAttribute('data-subtitulo-nome', nome);
        subDiv.innerHTML = '<div class="subtitulo-header"><span class="subtitulo-nome">' + (idx+1) + '. ' + nome + '</span><div class="subtitulo-actions"><button class="btn-add btn-small" onclick="adicionarReferenciaNoElemento(this.closest(\'.subtitulo-item\').querySelector(\'.referencias-lista\'))">📖 + Ref</button><button class="btn-add btn-small" onclick="mostrarMenuAdicionar(this, this.closest(\'.subtitulo-item\'))">➕ + Sub-item</button><button class="btn-add btn-small" onclick="adicionarImagemAoSubtitulo(this.closest(\'.subtitulo-item\'))">📷 + Imagem</button></div></div><div class="referencias-area"><div class="referencias-lista"></div></div><div class="sub-sub-container"></div><div class="imagens-container" style="margin-top: 12px;"></div>';
        container.appendChild(subDiv);
    });
    return tituloDiv;
}
function editarTitulo(btn) {
    const tituloDiv = btn.closest('.titulo-principal');
    const autorInfo = tituloDiv.querySelector('.autor-info span');
    const criador = autorInfo.innerText.match(/Criado por: ([^•]+)/);
    if (criador && !podeEditarItem(usuarios.find(function(u) { return u.nome === criador[1].trim(); })?.whatsapp)) {
        return alert('❌ Você não tem permissão para editar este título.');
    }
    alert('Modo edição: clique no nome do título para editar');
    tituloDiv.querySelector('.titulo-nome-input').style.border = '2px solid #ffd966';
}

function excluirTitulo(btn) {
    const tituloDiv = btn.closest('.titulo-principal');
    const autorInfo = tituloDiv.querySelector('.autor-info span');
    const criador = autorInfo.innerText.match(/Criado por: ([^•]+)/);
    if (criador && !podeEditarItem(usuarios.find(function(u) { return u.nome === criador[1].trim(); })?.whatsapp)) {
        return alert('❌ Você não tem permissão para excluir este título.');
    }
    if (confirm('Remover título?')) tituloDiv.remove();
}

function adicionarCapitulo() {
    const container = document.getElementById('capitulosContainer');
    const emptyState = document.getElementById('emptyState');
    emptyState.classList.add('hidden');
    container.classList.remove('hidden');
    const capDiv = document.createElement('div');
    capDiv.className = 'capitulo-card';
    const dataHora = new Date().toLocaleString();
    capDiv.innerHTML = '<div class="capitulo-header"><div class="capitulo-header-top"><div><span>📖 Capítulo </span><input type="number" class="capitulo-numero-input" value="' + (container.children.length + 1) + '"></div><div><button class="btn-icon" onclick="moverCapitulo(this, -1)">⬆️</button><button class="btn-icon" onclick="moverCapitulo(this, 1)">⬇️</button><button class="btn-icon" onclick="removerCapitulo(this)">❌</button></div></div><div class="campo"><label>ASSUNTO:</label><input type="text" placeholder="Ex: A Misericórdia de Deus" class="assunto-input"></div><div class="autor-info" style="margin-top: 12px;"><span>👤 Criado por: ' + usuarioLogado.nome + ' • ' + dataHora + '</span><div class="action-buttons"><button class="btn-icon" onclick="editarCapitulo(this)">✏️</button><button class="btn-icon" onclick="excluirCapitulo(this)">❌</button></div></div></div><div class="titulos-container"></div><div style="padding:20px;"><button class="btn-add" onclick="adicionarTituloVazio(this)">➕ Adicionar Título</button></div>';
    container.appendChild(capDiv);
    salvarEstruturaComunitaria();
}

function editarCapitulo(btn) {
    const capDiv = btn.closest('.capitulo-card');
    const autorInfo = capDiv.querySelector('.autor-info span');
    const criador = autorInfo.innerText.match(/Criado por: ([^•]+)/);
    if (criador && !podeEditarItem(usuarios.find(function(u) { return u.nome === criador[1].trim(); })?.whatsapp)) {
        return alert('❌ Você não tem permissão para editar este capítulo.');
    }
    alert('Modo edição: clique nos campos do capítulo para editar');
    capDiv.querySelectorAll('.capitulo-numero-input, .assunto-input').forEach(function(campo) { campo.style.border = '2px solid #ffd966'; });
}

function excluirCapitulo(btn) {
    const capDiv = btn.closest('.capitulo-card');
    const autorInfo = capDiv.querySelector('.autor-info span');
    const criador = autorInfo.innerText.match(/Criado por: ([^•]+)/);
    if (criador && !podeEditarItem(usuarios.find(function(u) { return u.nome === criador[1].trim(); })?.whatsapp)) {
        return alert('❌ Você não tem permissão para excluir este capítulo.');
    }
    if (confirm('Remover capítulo?')) {
        capDiv.remove();
        if (!document.querySelectorAll('.capitulo-card').length) {
            document.getElementById('emptyState').classList.remove('hidden');
            document.getElementById('capitulosContainer').classList.add('hidden');
        }
        salvarEstruturaComunitaria();
    }
}

function adicionarTituloVazio(btn) {
    const nome = prompt('Digite o título:');
    if (nome && nome.trim()) {
        btn.closest('.capitulo-card').querySelector('.titulos-container').appendChild(criarTitulo(nome.trim()));
        salvarEstruturaComunitaria();
    }
}

function moverCapitulo(btn, delta) {
    const card = btn.closest('.capitulo-card');
    const container = document.getElementById('capitulosContainer');
    if (delta === -1 && card.previousElementSibling) container.insertBefore(card, card.previousElementSibling);
    else if (delta === 1 && card.nextElementSibling) container.insertBefore(card.nextElementSibling, card);
    salvarEstruturaComunitaria();
}

function salvarEstruturaComunitaria() {
    const container = document.getElementById('capitulosContainer');
    localStorage.setItem('estrutura_comunitaria', container.innerHTML);
}

function carregarEstruturaComunitaria() {
    const saved = localStorage.getItem('estrutura_comunitaria');
    const container = document.getElementById('capitulosContainer');
    if (saved && saved.trim()) {
        container.innerHTML = saved;
        if (container.children.length > 0) {
            document.getElementById('emptyState').classList.add('hidden');
            container.classList.remove('hidden');
        }
    }
}

function gerarTexto() {
    let texto = '📚 LIVRO: ' + livroAtual + '\n' + '═'.repeat(60) + '\n\n';
    let imagensLista = [];
    let complementosLista = [];
    let contadorComp = 0;
    let contadorImg = 0;
    document.querySelectorAll('.capitulo-card').forEach(function(cap, capIdx) {
        const num = cap.querySelector('.capitulo-numero-input')?.value || (capIdx + 1);
        const assunto = cap.querySelector('.assunto-input')?.value || '';
        texto += '📖 CAPÍTULO ' + num + '\n' + (assunto ? 'Assunto: ' + assunto + '\n' : '') + '─'.repeat(50) + '\n\n';
        cap.querySelectorAll('.titulo-principal').forEach(function(tit, titIdx) {
            const titNome = tit.querySelector('.titulo-nome-input')?.value || 'Título ' + (titIdx + 1);
            texto += '📌 ' + (titIdx + 1) + '. ' + titNome.toUpperCase() + '\n\n';
            tit.querySelectorAll('.subtitulo-item').forEach(function(sub, subIdx) {
                const subNome = sub.getAttribute('data-subtitulo-nome');
                texto += '   ' + (titIdx + 1) + '.' + (subIdx + 1) + '. ' + subNome + '\n';
                sub.querySelectorAll('.referencias-lista .referencia-card').forEach(function(ref) {
                    const livro = ref.querySelector('.livro-ref')?.value || '';
                    const capRef = ref.querySelector('.ref-cap')?.value || '';
                    const vers = ref.querySelector('.ref-vers')?.value || '';
                    const txt = ref.querySelector('textarea')?.value || '';
                    if (livro || capRef || vers) texto += '      📖 ' + livro + ' ' + capRef + ':' + vers + '\n';
                    if (txt) texto += '      "' + txt + '"\n';
                    const metadados = ref.querySelector('.info-metadados');
                    if (metadados && metadados.innerText.trim()) texto += '      📋 ' + metadados.innerText.trim() + '\n';
                    const autorInfo = ref.querySelector('.autor-info');
                    if (autorInfo && autorInfo.innerText.trim()) texto += '      ' + autorInfo.innerText.trim() + '\n';
                    ref.querySelectorAll('.imagens-container > .complemento-imagem').forEach(function(img) {
                        contadorImg++;
                        const idImg = 'img-' + contadorImg;
                        const tituloImg = img.querySelector('.complemento-header span')?.innerText?.replace('📷 ', '') || 'Imagem';
                        const urlImg = img.querySelector('img')?.src || '';
                        texto += '      📷 [' + tituloImg + '](#' + idImg + ')\n';
                        imagensLista.push({ id: idImg, titulo: tituloImg, url: urlImg, localizacao: (titIdx + 1) + '.' + (subIdx + 1) });
                    });
                });
                sub.querySelectorAll('.sub-item-card').forEach(function(item) {
                    const label = item.querySelector('.sub-item-label')?.innerText || '';
                    const conteudo = item.querySelector('.sub-item-content textarea')?.value || '';
                    texto += '      ' + label + ' ' + (conteudo || '___________________') + '\n';
                    const autorInfo = item.querySelector('.autor-info');
                    if (autorInfo && autorInfo.innerText.trim()) texto += '      ' + autorInfo.innerText.trim() + '\n';
                    item.querySelectorAll('.imagens-container > .complemento-imagem').forEach(function(img) {
                        contadorImg++;
                        const idImg = 'img-' + contadorImg;
                        const tituloImg = img.querySelector('.complemento-header span')?.innerText?.replace('📷 ', '') || 'Imagem';
                        const urlImg = img.querySelector('img')?.src || '';
                        texto += '         📷 [' + tituloImg + '](#' + idImg + ')\n';
                        imagensLista.push({ id: idImg, titulo: tituloImg, url: urlImg, localizacao: (titIdx + 1) + '.' + (subIdx + 1) + ' - ' + label });
                    });
                    item.querySelectorAll('.complemento-ia').forEach(function(comp) {
                        const tituloComp = comp.querySelector('.complemento-header span')?.innerText?.replace('💬 ', '') || 'Complemento';
                        const conteudoComp = comp.querySelector('.complemento-conteudo')?.innerHTML?.replace(/<br>/g, '\n') || '';
                        const footerComp = comp.querySelector('.complemento-footer')?.innerText || '';
                        if (conteudoComp) {
                            contadorComp++;
                            const idComp = 'comp-' + contadorComp;
                            texto += '         🔗 [' + tituloComp + '](#' + idComp + ')\n';
                            complementosLista.push({ id: idComp, titulo: tituloComp, conteudo: conteudoComp, localizacao: (titIdx + 1) + '.' + (subIdx + 1) + ' - ' + label, footer: footerComp });
                        }
                    });
                    item.querySelectorAll('.sub-item-referencias .referencia-card').forEach(function(ref) {
                        const livro = ref.querySelector('.livro-ref')?.value || '';
                        const capRef = ref.querySelector('.ref-cap')?.value || '';
                        const vers = ref.querySelector('.ref-vers')?.value || '';
                        const txt = ref.querySelector('textarea')?.value || '';
                        if (livro || capRef || vers) texto += '         📖 ' + livro + ' ' + capRef + ':' + vers + '\n';
                        if (txt) texto += '         "' + txt + '"\n';
                        const autorInfo = ref.querySelector('.autor-info');
                        if (autorInfo && autorInfo.innerText.trim()) texto += '         ' + autorInfo.innerText.trim() + '\n';
                    });
                });
                texto += '\n';
            });
            const tituloAutor = tit.querySelector('.autor-info');
            if (tituloAutor && tituloAutor.innerText.trim()) texto += '📌 ' + tituloAutor.innerText.trim() + '\n';
            texto += '\n' + '·'.repeat(40) + '\n\n';
        });
        const capAutor = cap.querySelector('.autor-info');
        if (capAutor && capAutor.innerText.trim()) texto += '📖 ' + capAutor.innerText.trim() + '\n';
        texto += '═'.repeat(60) + '\n\n';
    });
    if (imagensLista.length > 0) {
        texto += '\n\n' + '═'.repeat(60) + '\n📷 GALERIA DE IMAGENS\n' + '═'.repeat(60) + '\n\n';
        imagensLista.forEach(function(img) {
            texto += '\n🔗 <a id="' + img.id + '" style="text-decoration:none; color:#4a6b3f;">📌 ' + img.titulo + '</a>\n';
            texto += '📍 Referente a: ' + img.localizacao + '\n' + '─'.repeat(40) + '\n';
            texto += '![' + img.titulo + '](' + img.url + ')\n🔗 Fonte: ' + img.url + '\n\n';
        });
    }
    if (complementosLista.length > 0) {
        texto += '\n\n' + '═'.repeat(60) + '\n📦 GALERIA DE COMPLEMENTOS\n' + '═'.repeat(60) + '\n\n';
        complementosLista.forEach(function(comp) {
            texto += '\n🔗 <a id="' + comp.id + '" style="text-decoration:none; color:#4a6b3f;">📌 ' + comp.titulo + '</a>\n';
            texto += '📍 Referente a: ' + comp.localizacao + '\n' + '─'.repeat(40) + '\n' + comp.conteudo + '\n\n';
            if (comp.footer) texto += comp.footer + '\n\n';
        });
    }
    textoAtual = texto;
    const textoHtml = texto.replace(/\n/g, '<br>').replace(/!\[([^\]]+)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%; max-height:300px; border-radius:12px; margin:10px 0;"><br><small>🔗 <a href="$2" target="_blank">Abrir imagem original</a></small>').replace(/<a id="([^"]+)" style="[^"]*">([^<]+)<\/a>/g, '<a id="$1" style="color:#4a6b3f; text-decoration:underline; cursor:pointer;">$2</a>').replace(/\[([^\]]+)\]\(#(img-\d+)\)/g, '<a href="#$2" style="color:#4a6b3f; text-decoration:underline;">📷 $1</a>').replace(/\[([^\]]+)\]\(#(comp-\d+)\)/g, '<a href="#$2" style="color:#4a6b3f; text-decoration:underline;">🔗 $1</a>');
    document.getElementById('textoGerado').innerHTML = textoHtml;
    return textoAtual;
}
function salvarTexto() {
    if (!textoAtual || textoAtual.includes('Nenhum texto')) return alert('⚠️ Gere um texto primeiro!');
    const titulo = prompt('Título:', 'Texto ' + (textosSalvos.length + 1));
    if (titulo && titulo.trim()) {
        textosSalvos.push({ id: Date.now(), titulo: titulo.trim(), livro: livroAtual, data: new Date().toLocaleString(), conteudo: textoAtual, criadoPor: usuarioLogado.nome, criadoEm: new Date().toLocaleString() });
        localStorage.setItem('textos_comunitarios', JSON.stringify(textosSalvos));
        renderizarBiblioteca();
        alert('✅ Texto salvo na biblioteca comunitária!');
    }
}

function exportarWord() {
    if (!textoAtual) return alert('⚠️ Gere um texto!');
    const blob = new Blob(['<html><head><meta charset="UTF-8"><title>Texto</title><style>a{color:#4a6b3f; text-decoration:underline;} img{max-width:100%;}</style></head><body><pre>' + textoAtual + '</pre></body></html>'], { type: 'application/msword' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'texto_' + livroAtual + '.doc';
    link.click();
}

async function exportarPDF() {
    if (!textoAtual) return alert('⚠️ Gere um texto!');
    const temp = document.createElement('div');
    temp.innerHTML = '<pre style="font-family:monospace; padding:40px;">' + textoAtual + '</pre>';
    document.body.appendChild(temp);
    await html2pdf().set({ margin: 0.5, filename: 'texto_' + livroAtual + '.pdf' }).from(temp).save();
    document.body.removeChild(temp);
}

function copiarTexto() {
    if (!textoAtual) return alert('⚠️ Gere um texto!');
    navigator.clipboard.writeText(textoAtual).then(function() { alert('✅ Copiado!'); });
}

function renderizarBiblioteca() {
    const filtro = document.getElementById('filtroLivroBiblioteca').value;
    const filtrados = filtro === 'todos' ? textosSalvos : textosSalvos.filter(function(t) { return t.livro === filtro; });
    const container = document.getElementById('listaTextosSalvos');
    if (!filtrados.length) {
        container.innerHTML = '<div class="empty-state"><p>Nenhum texto salvo</p></div>';
        return;
    }
    container.innerHTML = filtrados.map(function(t, i) {
        const idx = textosSalvos.findIndex(function(ts) { return ts.id === t.id; });
        return '<div class="texto-item" onclick="carregarTexto(' + idx + ')"><div class="texto-info"><div class="texto-titulo">' + t.titulo + '</div><div class="texto-livro">📚 ' + t.livro + ' • ' + t.data + '</div><div class="texto-livro">👤 Criado por: ' + t.criadoPor + ' • ' + t.criadoEm + '</div></div><div class="texto-actions" onclick="event.stopPropagation()"><button class="btn-icon" onclick="copiarTextoSalvo(' + idx + ')">📋</button>' + (podeEditarItem(usuarios.find(function(u) { return u.nome === t.criadoPor; })?.whatsapp) ? '<button class="btn-icon" onclick="excluirTextoSalvo(' + idx + ')">❌</button>' : '') + '</div></div>';
    }).join('');
}

function carregarTexto(index) {
    textoAtual = textosSalvos[index].conteudo;
    document.getElementById('textoGerado').innerHTML = textoAtual.replace(/\n/g, '<br>');
    alert('✅ Texto carregado!');
}

function copiarTextoSalvo(index) {
    navigator.clipboard.writeText(textosSalvos[index].conteudo).then(function() { alert('✅ Copiado!'); });
}

function excluirTextoSalvo(index) {
    if (!podeEditarItem(usuarios.find(function(u) { return u.nome === textosSalvos[index].criadoPor; })?.whatsapp)) {
        return alert('❌ Você não tem permissão para excluir este texto.');
    }
    if (confirm('Excluir este texto da biblioteca comunitária?')) {
        textosSalvos.splice(index, 1);
        localStorage.setItem('textos_comunitarios', JSON.stringify(textosSalvos));
        renderizarBiblioteca();
    }
}

function atualizarSelectLivros() {
    const select = document.getElementById('livroGlobalSelect');
    select.innerHTML = livrosUsuario.map(function(l) { return '<option ' + (l === livroAtual ? 'selected' : '') + '>' + l + '</option>'; }).join('');
    const filtro = document.getElementById('filtroLivroBiblioteca');
    filtro.innerHTML = '<option value="todos">📖 Todos</option>' + livrosUsuario.map(function(l) { return '<option>' + l + '</option>'; }).join('');
}

function carregarHistorico() {
    const container = document.getElementById('historicoLinks');
    if (!tokensRecuperacao.length) { container.innerHTML = '<div style="text-align:center;padding:16px;">Nenhum link gerado</div>'; return; }
    container.innerHTML = tokensRecuperacao.map(function(t) {
        const exp = new Date(t.expiracao);
        const valido = exp > new Date();
        return '<div class="solicitacao-item"><strong>' + escapeHtml(t.nome) + '</strong><br>📱 ' + t.telefone + '<br>📅 ' + new Date(t.criadoEm).toLocaleString() + '<br><span style="color:' + (valido ? 'green' : 'red') + '">' + (valido ? 'Válido até ' + exp.toLocaleString() : 'Expirado') + '</span></div>';
    }).join('');
}

function gerarLinkAdmin() {
    const nome = document.getElementById('adminNome').value.trim();
    const tel = document.getElementById('adminTelefone').value.trim();
    if (!nome || !tel) return alert('Preencha nome e telefone');
    const usuario = usuarios.find(function(u) { return u.nome.toLowerCase() === nome.toLowerCase() && u.whatsapp === tel; });
    if (!usuario) return alert('Usuário não encontrado: ' + nome + ' / ' + tel);
    const token = gerarToken(nome, tel);
    if (!token) return alert('Erro');
    document.getElementById('linkDisplay').innerHTML = token.link;
    document.getElementById('linkGeradoDiv').classList.remove('hidden');
    carregarHistorico();
    alert('✅ Link gerado para ' + usuario.nome + '! Válido por 24h.');
}

function atualizarUI() {
    const auth = document.getElementById('authScreen');
    const main = document.getElementById('mainScreen');
    fecharModalForcado();
    if (usuarioLogado) {
        auth.classList.add('hidden');
        main.classList.remove('hidden');
        document.getElementById('userNameDisplay').innerHTML = usuarioLogado.nome + (usuarioLogado.isAdmin ? '<span class="admin-badge">Admin</span>' : '');
        document.getElementById('userAvatar').innerText = usuarioLogado.nome.charAt(0);
        carregarEstruturaComunitaria();
        if (usuarioLogado.isAdmin) carregarHistorico();
        if (document.getElementById('groqApiKeyInput')) {
            document.getElementById('groqApiKeyInput').value = GROQ_API_KEY;
            if (GROQ_API_KEY) document.getElementById('apiKeyWarning').style.background = '#e8f5e9';
        }
        renderizarBiblioteca();
    } else {
        auth.classList.remove('hidden');
        main.classList.add('hidden');
        document.getElementById('adminPanel').classList.add('hidden');
    }
}

function mostrarRecuperacao() {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('cadastroForm').classList.add('hidden');
    document.getElementById('recuperacaoForm').classList.remove('hidden');
    document.getElementById('recupResultado').innerHTML = '';
}

function voltarLoginRecup() {
    document.getElementById('recuperacaoForm').classList.add('hidden');
    document.getElementById('loginForm').classList.remove('hidden');
}

function verificarUsuario() {
    const nome = document.getElementById('recupNome').value.trim();
    const tel = document.getElementById('recupTelefone').value.trim();
    const result = document.getElementById('recupResultado');
    if (!nome || !tel) return result.innerHTML = '<div class="error-box">Preencha os dados</div>';
    const user = usuarios.find(function(u) { return u.nome.toLowerCase() === nome.toLowerCase() && u.whatsapp === tel; });
    if (!user) return result.innerHTML = '<div class="error-box">❌ Usuário não encontrado!</div>';
    const dados = 'SOLICITAÇÃO DE REDEFINIÇÃO\n\nNome: ' + user.nome + '\nTelefone: ' + user.whatsapp;
    result.innerHTML = '<div class="success-box"><strong>✅ Usuário encontrado!</strong><br><br><div class="dados-copia">' + dados.replace(/\n/g,'<br>') + '</div><div style="display:flex;gap:8px;margin-top:12px;"><button id="copiarDados" class="btn-add">📋 Copiar</button><button id="whatsAdmin" class="btn-add">📱 Enviar Admin</button></div><p style="margin-top:12px;font-size:0.7rem;">⏰ O administrador irá gerar um link e enviar em até 24h.</p></div>';
    document.getElementById('copiarDados')?.addEventListener('click', function() { navigator.clipboard.writeText(dados); alert('✅ Dados copiados!'); });
    document.getElementById('whatsAdmin')?.addEventListener('click', function() { window.open('https://wa.me/41996497311?text=' + encodeURIComponent(dados), '_blank'); });
}
// ========== EVENTOS ==========
document.getElementById('btnLogin')?.addEventListener('click', function() { fazerLogin(document.getElementById('loginTelefone').value, document.getElementById('loginSenha').value); });
document.getElementById('btnCadastroLink')?.addEventListener('click', function() { document.getElementById('loginForm').classList.add('hidden'); document.getElementById('cadastroForm').classList.remove('hidden'); });
document.getElementById('btnVoltarLogin')?.addEventListener('click', function() { document.getElementById('cadastroForm').classList.add('hidden'); document.getElementById('loginForm').classList.remove('hidden'); });
document.getElementById('btnEsqueciSenhaLink')?.addEventListener('click', mostrarRecuperacao);
document.getElementById('btnVoltarLoginRecup')?.addEventListener('click', voltarLoginRecup);
document.getElementById('btnVerificarUsuario')?.addEventListener('click', verificarUsuario);
document.getElementById('btnCadastrar')?.addEventListener('click', function() {
    const nome = document.getElementById('cadastroNome').value.trim();
    const whats = document.getElementById('cadastroWhatsapp').value.trim();
    const senha = document.getElementById('cadastroSenha').value;
    const conf = document.getElementById('cadastroConfirmarSenha').value;
    if (!nome || nome.split(' ').length < 2) return alert('Digite nome e sobrenome');
    if (!whats) return alert('Digite o WhatsApp');
    if (senha !== conf) return alert('Senhas não conferem');
    if (cadastrarUsuario(nome, whats, senha)) {
        document.getElementById('cadastroForm').classList.add('hidden');
        document.getElementById('loginForm').classList.remove('hidden');
    }
});
document.getElementById('btnLogout')?.addEventListener('click', logout);
document.getElementById('btnAdminPanel')?.addEventListener('click', function() {
    if (!usuarioLogado?.isAdmin) return alert('Acesso negado');
    document.getElementById('adminPanel').classList.toggle('hidden');
    if (!document.getElementById('adminPanel').classList.contains('hidden')) carregarHistorico();
});
document.getElementById('btnFecharAdmin')?.addEventListener('click', function() { document.getElementById('adminPanel').classList.add('hidden'); });
document.getElementById('btnImportarDados')?.addEventListener('click', function() {
    const txt = document.getElementById('adminDados').value;
    const n = txt.match(/Nome:\s*([^\n]+)/i);
    const t = txt.match(/Telefone:\s*([^\n]+)/i);
    if (n) document.getElementById('adminNome').value = n[1].trim();
    if (t) document.getElementById('adminTelefone').value = t[1].trim();
    if (n || t) alert('✅ Dados importados');
    else alert('Formato: Nome: ...\nTelefone: ...');
});
document.getElementById('btnGerarLink')?.addEventListener('click', gerarLinkAdmin);
document.getElementById('btnCopiarLink')?.addEventListener('click', function() {
    const l = document.getElementById('linkDisplay').innerText;
    if (l) { navigator.clipboard.writeText(l); alert('✅ Link copiado'); }
});
document.getElementById('btnEnviarWhats')?.addEventListener('click', function() {
    const l = document.getElementById('linkDisplay').innerText;
    const t = document.getElementById('adminTelefone').value.trim();
    if (!l) return alert('Gere um link');
    if (!t) return alert('Telefone');
    window.open('https://wa.me/' + t + '?text=' + encodeURIComponent('🔐 Redefinição de senha - Estúdio Bíblico\n\nClique no link para criar uma nova senha:\n\n' + l + '\n\n⚠️ Link válido por 24 horas.'), '_blank');
});
document.getElementById('btnSalvarApiKey')?.addEventListener('click', function() {
    const k = document.getElementById('groqApiKeyInput').value.trim();
    if (k && k.startsWith('gsk_')) { 
        localStorage.setItem('groq_api_key', k); 
        GROQ_API_KEY = k; 
        document.getElementById('apiKeyWarning').style.background = '#e8f5e9';
        alert('✅ Chave salva!');
    } else alert('Chave inválida (deve começar com gsk_)');
});
document.getElementById('btnAddCapitulo')?.addEventListener('click', adicionarCapitulo);
document.getElementById('btnAddTitulo')?.addEventListener('click', function() {
    const ultimo = document.querySelector('.capitulo-card:last-child');
    if (!ultimo) return alert('Crie um capítulo primeiro!');
    const nome = prompt('Digite o título:');
    if (nome && nome.trim()) {
        ultimo.querySelector('.titulos-container').appendChild(criarTitulo(nome.trim()));
        salvarEstruturaComunitaria();
    }
});
document.getElementById('btnGerarTexto')?.addEventListener('click', gerarTexto);
document.getElementById('btnSalvarTexto')?.addEventListener('click', salvarTexto);
document.getElementById('btnSalvarResultado')?.addEventListener('click', salvarTexto);
document.getElementById('btnExportarWord')?.addEventListener('click', exportarWord);
document.getElementById('btnExportarPDF')?.addEventListener('click', exportarPDF);
document.getElementById('btnCopiarTexto')?.addEventListener('click', copiarTexto);
document.getElementById('btnCopiarResultado')?.addEventListener('click', copiarTexto);
document.getElementById('btnCriarLivro')?.addEventListener('click', function() {
    const nome = prompt('Nome do livro:');
    if (nome && nome.trim()) { 
        livrosUsuario.push(nome.trim()); 
        livroAtual = nome.trim(); 
        atualizarSelectLivros(); 
        localStorage.setItem('livros_comunitarios', JSON.stringify(livrosUsuario));
        localStorage.setItem('livro_atual', livroAtual);
    }
});
document.getElementById('livroGlobalSelect')?.addEventListener('change', function(e) {
    livroAtual = e.target.value;
    localStorage.setItem('livro_atual', livroAtual);
});
document.getElementById('filtroLivroBiblioteca')?.addEventListener('change', function() { renderizarBiblioteca(); });

window.adicionarReferenciaNoElemento = adicionarReferenciaNoElemento;
window.buscarVersiculoParaRef = buscarVersiculoParaRef;
window.mostrarMenuAdicionar = mostrarMenuAdicionar;
window.adicionarListaAlfabetica = adicionarListaAlfabetica;
window.adicionarListaNumerica = adicionarListaNumerica;
window.adicionarEspacoRespostaItem = adicionarEspacoRespostaItem;
window.adicionarImagemAoSubtitulo = adicionarImagemAoSubtitulo;
window.abrirModalImagem = abrirModalImagem;
window.moverCapitulo = moverCapitulo;
window.removerCapitulo = removerCapitulo;
window.adicionarTituloVazio = adicionarTituloVazio;
window.carregarTexto = carregarTexto;
window.copiarTextoSalvo = copiarTextoSalvo;
window.excluirTextoSalvo = excluirTextoSalvo;
window.editarReferencia = editarReferencia;
window.excluirReferencia = excluirReferencia;
window.editarSubItem = editarSubItem;
window.excluirSubItem = excluirSubItem;
window.editarTitulo = editarTitulo;
window.excluirTitulo = excluirTitulo;
window.editarCapitulo = editarCapitulo;
window.excluirCapitulo = excluirCapitulo;

// ========== INICIALIZAÇÃO ==========
limparTokensExpirados();
atualizarSelectLivros();
renderizarBiblioteca();
atualizarUI();
verificarTokenUrl();
// Limpeza forçada na inicialização
(function limpezaImediata() {
    const tokens = JSON.parse(localStorage.getItem('tokensRecuperacao')) || [];
    const agora = new Date();
    const tokensValidos = tokens.filter(t => new Date(t.expiracao) >= agora);
    if (tokensValidos.length !== tokens.length) {
        localStorage.setItem('tokensRecuperacao', JSON.stringify(tokensValidos));
    }
    const modal = document.getElementById('resetModal');
    if (modal) modal.classList.add('hidden');
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('reset');
    if (token) {
        const tokenValido = tokensValidos.find(t => t.token === token);
        if (!tokenValido) {
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }
})();
window.addEventListener('load', function() {
    fecharModalForcado();
});

window.addEventListener('popstate', function() {
    fecharModalForcado();
    verificarTokenUrl();
});
