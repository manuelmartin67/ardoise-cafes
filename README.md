# L'Ardoise des cafés ☕

Qui paie les cafés ce midi ? Appli web installable (Android, iPhone, PC), sans compte pour les collègues.

- **Appli** : https://manuelmartin67.github.io/ardoise-cafes/ (GitHub Pages)
- **Données** : une Google Sheet « Ardoise des cafés (données) » dans le Drive du propriétaire,
  lue et écrite par le script `google/Code.gs` (Google Apps Script, publié en Application Web).

## Mise en place du serveur Google (une seule fois)

1. script.google.com → **Nouveau projet** → nommer « Ardoise des cafés ».
2. Remplacer tout le contenu de `Code.gs` par celui de [`google/Code.gs`](google/Code.gs). (Pas besoin de fichier `Index`.)
3. Enregistrer, choisir la fonction `installer` → **Exécuter** → autoriser (Paramètres avancés → Accéder à…).
4. **Déployer → Nouveau déploiement → Application Web** : Exécuter en tant que **Moi**, Accès **Tout le monde**.
5. Copier l'URL qui finit par `/exec` et la mettre dans [`config.js`](config.js).

Si le script était déjà déployé avec l'ancienne version (page Google), il suffit de coller le nouveau `Code.gs`,
puis **Déployer → Gérer les déploiements → crayon → Nouvelle version** : l'URL `/exec` reste la même.

## Installer sur le téléphone

- **Android (Chrome)** : ouvrir le lien → menu ⋮ → **Installer l'application** (ou « Ajouter à l'écran d'accueil »).
- **iPhone (Safari)** : ouvrir le lien → bouton Partager → **Sur l'écran d'accueil**.
- **PC (Chrome/Edge)** : icône d'installation dans la barre d'adresse.

## Règle de calcul

Solde = cafés offerts − cafés bus. Parmi les présents, le solde le plus bas paie ; en cas d'égalité,
celui qui a payé il y a le plus longtemps.
