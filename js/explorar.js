// ── LIGHTBOX ──
const lightboxOverlay   = document.getElementById("lightboxOverlay");
const lightboxImg       = document.getElementById("lightboxImg");
const btnFecharLightbox = document.getElementById("btnFecharLightbox");

function abrirLightbox(src, alt) {
  lightboxImg.src = src;
  lightboxImg.alt = alt || "";
  lightboxOverlay.classList.add("aberto");
}
function fecharLightbox() {
  lightboxOverlay.classList.remove("aberto");
  lightboxImg.src = "";
}
btnFecharLightbox.addEventListener("click", fecharLightbox);
lightboxOverlay.addEventListener("click", (e) => {
  if (e.target === lightboxOverlay) fecharLightbox();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") fecharLightbox();
});

// ── LOGOUT ──
document.getElementById("btnLogout").addEventListener("click", async (e) => {
  e.preventDefault();
  await fetch("http://localhost:3000/api/logout", {
    method: "POST", credentials: "include"
  }).catch(() => {});
  window.location.href = "login.html";
});

// ── UTILS ──
function formatarData(dataStr) {
  const data = new Date(dataStr);
  return data.toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric"
  });
}

// ── FEED ──
async function carregarPosts() {
  const feed = document.getElementById("feedPosts");

  try {
    const resp = await fetch("http://localhost:3000/api/posts", {
      credentials: "include"
    });

    if (!resp.ok) throw new Error();

    const posts = await resp.json();
    feed.innerHTML = "";

    if (posts.length === 0) {
      feed.innerHTML = `<p class="feed-vazio">Nenhuma publicação ainda. Seja o primeiro a compartilhar! 🌿</p>`;
      return;
    }

    posts.forEach(post => {
      const card = document.createElement("div");
      card.className = "post-card";

      const avatarSrc = post.autor_foto || "../assets/img/perfil-avatar.jpg";

      card.innerHTML = `
        <div class="post-header">
          <img class="post-autor-avatar" src="${avatarSrc}" alt="${post.autor_nome}" />
          <div class="post-autor-info">
            <strong>${post.autor_nome}</strong>
            <span>@${post.autor_usuario} · ${formatarData(post.created_at)}</span>
          </div>
        </div>
        ${post.imagem ? `<div class="post-imagem"><img src="${post.imagem}" alt="imagem do post" /></div>` : ""}
        ${post.legenda ? `<p class="post-legenda">${post.legenda}</p>` : ""}
      `;

      if (post.imagem) {
        card.querySelector(".post-imagem img").addEventListener("click", () => {
          abrirLightbox(post.imagem, post.legenda || "");
        });
      }

      feed.appendChild(card);
    });

  } catch (err) {
    feed.innerHTML = `<p class="feed-vazio">Erro ao carregar publicações. Tente novamente.</p>`;
  }
}

carregarPosts();