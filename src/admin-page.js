export const adminPage = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Administration Rasso.69</title>
<style>
:root{color-scheme:dark;--bg:#08080b;--panel:#111116;--line:#292932;--text:#f7f5f2;--muted:#a4a4b2;--orange:#ff4d00;--green:#2ecc71;--red:#ff3b4f}
*{box-sizing:border-box}body{margin:0;font-family:Arial,Helvetica,sans-serif;background:var(--bg);color:var(--text)}
header{position:sticky;top:0;z-index:3;display:flex;justify-content:space-between;align-items:center;padding:18px 4vw;background:rgba(8,8,11,.94);border-bottom:1px solid var(--line);backdrop-filter:blur(12px)}
.brand{font-weight:900;font-size:25px}.brand span{color:var(--orange)}button,input,select{font:inherit}button{cursor:pointer}
.wrap{width:min(1450px,92vw);margin:28px auto}.login{max-width:560px;margin:12vh auto;padding:32px;background:var(--panel);border:1px solid var(--line);border-radius:18px}
.login h1{margin-top:0;font-size:38px}.field{display:flex;gap:10px}.field input{flex:1;background:#09090c;color:white;border:1px solid #383842;border-radius:10px;padding:14px}
.primary{border:0;background:var(--orange);color:#fff;font-weight:800;border-radius:10px;padding:14px 18px}.ghost{background:transparent;border:1px solid var(--line);color:var(--text);border-radius:9px;padding:10px 13px}
.toolbar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:22px}.toolbar select{background:var(--panel);color:white;border:1px solid var(--line);border-radius:9px;padding:11px 14px}.count{color:var(--muted);margin-left:auto}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:18px}.card{background:var(--panel);border:1px solid var(--line);border-radius:16px;overflow:hidden}.media{aspect-ratio:4/3;background:#050507;display:grid;place-items:center;overflow:hidden}.media img,.media video{width:100%;height:100%;object-fit:cover}.body{padding:16px}.meta{font-size:13px;color:var(--muted);display:flex;justify-content:space-between;gap:10px}.author{font-weight:800;margin:10px 0 5px}.caption{min-height:42px;color:#d4d4dc;line-height:1.4}.badge{display:inline-block;margin-top:10px;padding:5px 9px;border-radius:999px;font-size:12px;font-weight:800;background:#27272f}.featured{color:#ffbf00}.actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:15px}.actions button{border-radius:9px;padding:10px;border:1px solid var(--line);font-weight:800}.approve{background:rgba(46,204,113,.14);color:#6ee7a0}.reject{background:rgba(255,59,79,.12);color:#ff7584}.feature{background:rgba(255,77,0,.12);color:#ff884f}.delete{background:transparent;color:#aaa}.empty{padding:60px 20px;text-align:center;color:var(--muted);border:1px dashed var(--line);border-radius:16px}.notice{margin:12px 0;color:#ffcf63}.hidden{display:none!important}@media(max-width:650px){header{padding:15px 18px}.wrap{width:94vw}.count{width:100%;margin-left:0}.login{margin:7vh 3vw}.field{flex-direction:column}}
</style>
</head>
<body>
<header><div class="brand">RASSO.<span>69</span> ADMIN</div><button id="logout" class="ghost hidden">Déconnexion</button></header>
<main class="wrap">
<section id="login" class="login">
<h1>Connexion</h1><p style="color:var(--muted)">Entre le mot de passe défini dans la variable Railway <b>ADMIN_TOKEN</b>.</p>
<div class="field"><input id="token" type="password" placeholder="ADMIN_TOKEN" autocomplete="current-password"><button id="connect" class="primary">Se connecter</button></div><div id="loginError" class="notice"></div>
</section>
<section id="dashboard" class="hidden">
<div class="toolbar"><select id="status"><option value="pending">En attente</option><option value="approved">Acceptés</option><option value="rejected">Refusés</option><option value="">Tous</option></select><button id="refresh" class="ghost">Actualiser</button><span id="count" class="count"></span></div>
<div id="message" class="notice"></div><div id="grid" class="grid"></div>
</section>
</main>
<script src="/admin.js?v=2" defer></script></body></html>`;
