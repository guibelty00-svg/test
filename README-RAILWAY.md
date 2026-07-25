# Rasso.69 Media Hub — Railway

Ce dossier doit être la racine du dépôt GitHub connecté à Railway.

## Variables Railway

- `PUBLIC_BASE_URL` : domaine public Railway, sans slash final
- `ALLOWED_ORIGINS` : domaine Shopify et domaine personnalisé, séparés par une virgule
- `ADMIN_TOKEN` : mot de passe long et secret
- `MAX_UPLOAD_MB` : par exemple `100`

Ne définissez pas `PORT` manuellement : Railway le fournit automatiquement.

## Déploiement

1. Décompressez ce ZIP.
2. Envoyez directement son contenu à la racine d'un nouveau dépôt GitHub.
3. Dans Railway : New Project > Deploy from GitHub Repo.
4. Ajoutez les variables ci-dessus.
5. Dans Settings > Networking, générez un domaine public.
6. Mettez ce domaine dans `PUBLIC_BASE_URL`, puis redéployez.

Test : ouvrez `https://votre-domaine.up.railway.app/health`.
La réponse attendue est `{ "ok": true }`.
